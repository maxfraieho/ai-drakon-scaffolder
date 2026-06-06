import { Type, defineTool } from '@flue/runtime';

async function md5Hex(str: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 8);
}

function buildFeedbackMarkdown(diagramName: string, feedbackText: string, correctedIr?: any): string {
  const ts = new Date().toISOString();
  let lines = [
    `## Feedback: ${diagramName}`,
    ``,
    `**Date:** ${ts}`,
    `**Diagram:** \`${diagramName}\``,
    ``,
    `### What was wrong`,
    `${feedbackText}`
  ];

  if (correctedIr) {
    lines = lines.concat([
      ``,
      `### Corrected IR`,
      `\`\`\`json`,
      JSON.stringify(correctedIr, null, 2),
      `\`\`\``,
      ``,
      `**Key corrections:**`
    ]);

    const items = correctedIr.items || {};
    for (const [nodeId, nodeAny] of Object.entries(items)) {
      const node = nodeAny as any;
      if (!node) continue;
      if (node.type === 'question') {
        lines.push(`- \`${nodeId}\`: question→one=${node.one}, two=${node.two}`);
      } else if (node.type === 'action') {
        lines.push(`- \`${nodeId}\`: action content=\`${(node.content || '').substring(0, 60)}\``);
      }
    }
  }

  return lines.join('\n');
}

export const feedbackTool = defineTool({
  name: 'feedback',
  description: 'Persist diagram feedback and corrections into the knowledge base.',
  parameters: Type.Object({
    diagramName: Type.String({ description: 'The name of the diagram' }),
    feedback: Type.String({ description: 'Description of the error' }),
    correctedIr: Type.Any({ description: 'Optional corrected DRAKON IR' }),
  }),
  execute: async ({ diagramName, feedback, correctedIr }, context: any) => {
    const slug = await md5Hex(diagramName + feedback);
    const filename = `fb-${slug}.md`;
    const markdown = buildFeedbackMarkdown(diagramName, feedback, correctedIr);

    // 1. Save to KV
    if (context?.env?.KNOWLEDGE_BASE) {
      try {
        await context.env.KNOWLEDGE_BASE.put(`feedback/${filename}`, markdown);
      } catch (e: any) {
        console.error('Error writing feedback to KV:', e);
      }
    }

    // 2. Save to local filesystem if process/fs are available
    let savedLocal = false;
    let localPath = '';
    if (typeof process !== 'undefined') {
      try {
        const fs = await import('fs');
        const path = await import('path');

        const possiblePaths = [
          path.join(process.cwd(), 'services', 'drakon-agent', 'knowledge'),
          path.join(process.cwd(), '..', 'drakon-agent', 'knowledge'),
          path.join(process.cwd(), 'knowledge'),
          '/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/services/drakon-agent/knowledge'
        ];

        let kbDir = '';
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            kbDir = p;
            break;
          }
        }

        if (kbDir) {
          const fbDir = path.join(kbDir, 'feedback');
          if (!fs.existsSync(fbDir)) {
            fs.mkdirSync(fbDir, { recursive: true });
          }
          const p = path.join(fbDir, filename);
          fs.writeFileSync(p, markdown, 'utf-8');
          savedLocal = true;
          localPath = p;
        }
      } catch (e: any) {
        console.error('Error writing feedback to filesystem:', e);
      }
    }

    return JSON.stringify({
      status: 'saved',
      diagram: diagramName,
      file: filename,
      savedLocal,
      localPath: savedLocal ? localPath : undefined
    }, null, 2);
  }
});
