import { describe, it, expect } from "vitest";
import { ribosomeEVE } from "../ribosome-eve";
import type { IrDiagram } from "../htse/ir-types";

describe("ribosomeEVE compiler", () => {
  it("compiles simple agent diagram to EVE filesystem structure", () => {
    const ir: IrDiagram = {
      name: "My Test Agent",
      access: "public",
      params: [],
      items: {
        h1: { type: "header", content: "Start", one: "a1" },
        a1: { type: "action", content: "This is a test agent that does something", one: "a2" },
        a2: { type: "action", content: ":: tool :: My Custom Tool", one: "a3" },
        a3: { type: "action", content: ":: llm :: Special custom LLM behavior", one: "e1" },
        e1: { type: "end", content: "" },
      },
    };

    const bundle = ribosomeEVE(ir, "MyTestAgent");

    expect(bundle.deployCommand).toBe("eve deploy");
    expect(bundle.requiresVercelConnect).toBe(false);

    // Verify files
    expect(bundle.files["package.json"]).toContain('"eve": "0.1.x"');
    expect(bundle.files["agent/agent.ts"]).toContain("defineAgent");
    expect(bundle.files["agent/instructions.md"]).toContain("This is a test agent that does something");
    expect(bundle.files["agent/instructions.md"]).toContain("Special custom LLM behavior");
    expect(bundle.files["agent/tools/MyCustomTool.ts"]).toContain("defineTool");
    expect(bundle.files["agent/tools/MyCustomTool.ts"]).toContain("My Custom Tool");
  });

  it("sets requiresVercelConnect to true when integration is present", () => {
    const ir: IrDiagram = {
      name: "Github Agent",
      access: "public",
      params: [],
      items: {
        h1: { type: "header", content: "Start", one: "a1" },
        a1: {
          type: "action",
          content: ":: tool :: Git Tool",
          one: "e1",
          meta: { nodeKind: "github" },
        },
        e1: { type: "end", content: "" },
      },
    };

    const bundle = ribosomeEVE(ir, "GithubAgent");
    expect(bundle.requiresVercelConnect).toBe(true);
  });

  it("throws error on invalid input", () => {
    expect(() => ribosomeEVE(null as any, "Bad")).toThrow();
  });
});
