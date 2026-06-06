import { createAgent, type AgentRouteHandler } from '@flue/runtime';
import { docsChat } from '../tools/docs-chat.js';
import { notesCrud } from '../tools/notes-crud.js';
import { docsFs } from '../tools/docs-fs.js';
import { projectsTool } from '../tools/projects.js';
import { drakonIr } from '../tools/drakon-ir.js';
import { gitnexusDocs } from '../tools/gitnexus-docs.js';
import { dataviewTool } from '../tools/dataview.js';
import { DOCS_SYSTEM_PROMPT } from '../lib/prompts.js';

export const route: AgentRouteHandler = async (c, next) => {
  const method = c.req.method;
  if (method === 'POST') {
    const body: any = await c.req.json().catch(() => ({}));
    if (body.message && (body.context || body.currentDoc || body.fileTree || body.current_doc || body.file_tree)) {
      const currentDoc = body.context?.currentDoc || body.context?.current_doc || body.currentDoc || body.current_doc || '';
      const fileTree = body.context?.fileTree || body.context?.file_tree || body.fileTree || body.file_tree || '';
      const memoryContext = body.context?.memoryContext || body.context?.memory_context || body.memoryContext || body.memory_context || '';
      const kbContext = body.context?.kbContext || body.context?.kb_context || body.kbContext || body.kb_context || '';
      
      const result = await docsChat.execute({
        message: body.message,
        currentDoc: typeof currentDoc === 'string' ? currentDoc : JSON.stringify(currentDoc),
        fileTree: typeof fileTree === 'string' ? fileTree : JSON.stringify(fileTree),
        memoryContext: typeof memoryContext === 'string' ? memoryContext : JSON.stringify(memoryContext),
        kbContext: typeof kbContext === 'string' ? kbContext : JSON.stringify(kbContext)
      }, { env: c.env } as any);
      
      return c.json(JSON.parse(result));
    }
  }
  await next();
};

export default createAgent(() => ({
  model: 'custom/gemini-2.5-flash',
  instructions: DOCS_SYSTEM_PROMPT,
  tools: [
    docsChat,
    notesCrud,
    docsFs,
    projectsTool,
    drakonIr,
    gitnexusDocs,
    dataviewTool
  ]
}));
