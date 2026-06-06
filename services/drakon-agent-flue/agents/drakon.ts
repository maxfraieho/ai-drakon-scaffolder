import { createAgent, type AgentRouteHandler } from '@flue/runtime';
import { analyzeCode } from './tools/analyze-code.js';
import { drakonChat } from './tools/drakon-chat.js';
import { analyzeFolder } from './tools/analyze-folder.js';
import { feedbackTool } from './tools/feedback.js';

export const route: AgentRouteHandler = async (c, next) => {
  const method = c.req.method;
  if (method === 'POST') {
    const body: any = await c.req.json().catch(() => ({}));
    
    // Intercept and run analyze_code directly
    if (body.code) {
      const code = body.code || '';
      const filename = body.filename || 'module.py';
      const refine = body.refine !== false;
      const result = await analyzeCode.execute({ code, filename, refine }, { env: c.env } as any);
      return c.json(JSON.parse(result));
    }
    
    // Intercept and run drakon_chat directly
    if (body.message && body.context) {
      const message = body.message;
      const context = JSON.stringify(body.context || {});
      const result = await drakonChat.execute({ message, context }, { env: c.env } as any);
      return c.json(JSON.parse(result));
    }

    // Intercept and run feedbackTool directly
    if (body.diagram_name && body.feedback) {
      const diagramName = body.diagram_name;
      const feedback = body.feedback;
      const correctedIr = body.corrected_ir;
      const result = await feedbackTool.execute({ diagramName, feedback, correctedIr }, { env: c.env } as any);
      return c.json(JSON.parse(result));
    }

    // Intercept and run analyzeFolder directly
    if (body.folder_path) {
      const folderPath = body.folder_path;
      const maxFiles = body.max_files || 20;
      const refine = body.refine !== false;
      const result = await analyzeFolder.execute({ folderPath, maxFiles, refine }, { env: c.env } as any);
      return c.json(JSON.parse(result));
    }
  }
  await next();
};

export default createAgent(() => ({
  model: 'custom/gemini-2.5-flash',
  instructions: 'You are the AI-DRAKON agent. Help parse code to DRAKON IR, refine it, and chat with users about diagrams.',
  tools: [analyzeCode, drakonChat, analyzeFolder, feedbackTool],
}));
