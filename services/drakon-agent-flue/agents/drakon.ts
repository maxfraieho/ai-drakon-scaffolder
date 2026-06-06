import { createAgent, type AgentRouteHandler } from '@flue/runtime';
import { analyzeCode } from './tools/analyze-code.js';
import { drakonChat } from './tools/drakon-chat.js';

export const route: AgentRouteHandler = async (c, next) => {
  const method = c.req.method;
  if (method === 'POST') {
    const body: any = await c.req.json().catch(() => ({}));
    if (body.code) {
      // Intercept and run analyze_code directly to return custom JSON format
      const code = body.code || '';
      const filename = body.filename || 'module.py';
      const refine = body.refine !== false;
      const result = await analyzeCode.execute({ code, filename, refine }, {} as any);
      return c.json(JSON.parse(result));
    }
    if (body.message && body.context) {
      // Intercept and run drakon_chat directly to return custom JSON format
      const message = body.message;
      const context = JSON.stringify(body.context || {});
      const result = await drakonChat.execute({ message, context }, {} as any);
      return c.json(JSON.parse(result));
    }
  }
  await next();
};

export default createAgent(() => ({
  model: 'custom/gemini-2.5-flash',
  instructions: 'You are the AI-DRAKON agent. Help parse code to DRAKON IR, refine it, and chat with users about diagrams.',
  tools: [analyzeCode, drakonChat],
}));
