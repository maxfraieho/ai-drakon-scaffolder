import type { IrDiagram } from "./htse/ir-types";
import type { CompileEVEResponse } from "../types/eve";

export function ribosomeEVE(ir: IrDiagram, projectName: string): CompileEVEResponse {
  if (!ir || typeof ir !== "object") {
    throw new Error("Invalid IR diagram");
  }

  const files: Record<string, string> = {};
  let instructions = "";
  const tools: Array<{ name: string; content: string }> = [];
  let requiresVercelConnect = false;

  const itemEntries = Object.entries(ir.items || {});

  const sanitizeName = (name: string): string => {
    // Remove special characters, keep only alphanumeric
    return name.replace(/[^a-zA-Z0-9]/g, "");
  };

  const cleanContent = (content: string, prefix: string): string => {
    return content.replace(prefix, "").trim();
  };

  let firstActionForInstructions = "";
  const llmBehaviors: string[] = [];

  itemEntries.forEach(([itemId, item]) => {
    if (item.meta?.nodeKind === "github" || item.meta?.nodeKind === "tool") {
      requiresVercelConnect = true;
    }

    const content = item.content || "";
    if (item.type === "action") {
      if (content.startsWith(":: tool ::")) {
        const fullToolName = cleanContent(content, ":: tool ::");
        const toolNameClean = sanitizeName(fullToolName);
        if (toolNameClean) {
          tools.push({
            name: toolNameClean,
            content: fullToolName,
          });
        }
      } else if (content.startsWith(":: llm ::")) {
        llmBehaviors.push(cleanContent(content, ":: llm ::"));
      } else {
        if (!firstActionForInstructions) {
          firstActionForInstructions = content;
        } else {
          instructions += `- ${content}\n`;
        }
      }
    } else if (item.type === "question") {
      instructions += `- Decision: ${content}\n`;
    }
  });

  // Prepare instructions.md
  let instructionsFileContent = `# Agent Instructions: ${projectName}\n\n`;
  if (firstActionForInstructions) {
    instructionsFileContent += `## Overview\n${firstActionForInstructions}\n\n`;
  }
  if (instructions) {
    instructionsFileContent += `## Workflow rules\n${instructions}\n`;
  }
  if (llmBehaviors.length > 0) {
    instructionsFileContent += `## LLM Behaviors\n`;
    llmBehaviors.forEach((behavior) => {
      instructionsFileContent += `- ${behavior}\n`;
    });
  }

  files["agent/instructions.md"] = instructionsFileContent;

  // Prepare tools
  let toolsExports = "";
  tools.forEach((tool) => {
    const toolFileName = `agent/tools/${tool.name}.ts`;
    const toolContent = `import { defineTool } from 'eve/tools';
import { z } from 'zod';

export default defineTool({
  name: '${tool.name}',
  description: '${tool.content.replace(/'/g, "\\'")}',
  inputSchema: z.object({ input: z.string() }),
  execute: async ({ input }) => {
    // TODO: implement
    return { result: input };
  }
});
`;
    files[toolFileName] = toolContent;
    toolsExports += `export { default as ${tool.name} } from './tools/${tool.name}';\n`;
  });

  // tools index.ts
  files["agent/tools/index.ts"] = toolsExports;

  // agent.ts
  files["agent/agent.ts"] = `import { defineAgent } from 'eve';
import * as tools from './tools';

export default defineAgent({
  model: 'anthropic/claude-sonnet-4-6',
  tools: Object.values(tools),
});
`;

  // package.json
  files["package.json"] = JSON.stringify({
    name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    version: "0.1.0",
    dependencies: {
      eve: "0.1.x",
    },
  }, null, 2) + "\n";

  return {
    files,
    deployCommand: "eve deploy",
    requiresVercelConnect,
  };
}
