import { Type, defineTool } from '@flue/runtime';
import { llmComplete } from '../lib/llm-client.js';
import { DOCS_SYSTEM_PROMPT } from '../lib/prompts.js';

export const docsChat = defineTool({
  name: 'docs_chat',
  description: 'Chat with the documentation agent and receive project doc suggestions.',
  parameters: Type.Object({
    message: Type.String({ description: 'The user message' }),
    currentDoc: Type.Optional(Type.String({ description: 'Raw content of the current document' })),
    fileTree: Type.Optional(Type.String({ description: 'JSON stringified file tree of the project' })),
    memoryContext: Type.Optional(Type.String({ description: 'Memory context' })),
    kbContext: Type.Optional(Type.String({ description: 'DRAKON rules context' })),
  }),
  execute: async ({ message, currentDoc, fileTree, memoryContext, kbContext }, toolContext: any) => {
    const llmCfg = (toolContext?.llmConfig && (!toolContext.llmConfig.protocol || toolContext.llmConfig.protocol === "openai")) ? toolContext.llmConfig : null;
    const apiKey = llmCfg?.apiKey || toolContext?.env?.CUSTOM_API_KEY || (typeof process !== 'undefined' ? process.env.CUSTOM_API_KEY : '') || 'dummy';
    
    const parts: string[] = [];
    if (memoryContext) {
      parts.push(`## My Memory\n${memoryContext}`);
    }
    if (kbContext) {
      parts.push(`## DRAKON Rules\n${kbContext}`);
    }
    if (fileTree) {
      parts.push(`## Project File Tree\n${fileTree.slice(0, 3000)}`);
    }
    if (currentDoc) {
      parts.push(`## Current Document\n${currentDoc.slice(0, 2000)}`);
    }
    parts.push(`## User Message\n${message}`);

    const userContent = parts.join('\n\n');

    try {
      const reply = await llmComplete(
        [
          { role: 'system', content: DOCS_SYSTEM_PROMPT },
          { role: 'user', content: userContent }
        ],
        llmCfg?.model || toolContext?.env?.PROXY_MODEL || 'gemini-2.5-flash',
        0.2,
        apiKey,
        llmCfg?.baseUrl || toolContext?.env?.PROXY_URL,
        toolContext?.env
      );

      let docSuggestions: any = null;
      const jsonBlockRegex = /```json\s*(\[[\s\S]*?\])\s*```/;
      const match = reply.match(jsonBlockRegex);
      if (match && match[1]) {
        try {
          docSuggestions = JSON.parse(match[1]);
        } catch (e) {}
      }

      return JSON.stringify({
        reply,
        doc_suggestions: docSuggestions,
        success: true
      }, null, 2);
    } catch (e: any) {
      return JSON.stringify({
        reply: `Помилка: ${e.message}`,
        doc_suggestions: null,
        success: false
      }, null, 2);
    }
  }
});
