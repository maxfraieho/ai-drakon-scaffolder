import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { flue } from '@flue/runtime/routing';
import { handleMcp } from './mcp-server.js';
import { analyzeCode } from '../agents/tools/analyze-code.js';
import { drakonChat } from '../agents/tools/drakon-chat.js';
import { analyzeFolder } from '../agents/tools/analyze-folder.js';
import { feedbackTool } from '../agents/tools/feedback.js';

const app = new Hono();

app.use('/*', cors());

// Expose health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'drakon-agent-flue' }));

// MCP server endpoint
app.post('/mcp', handleMcp);

// Expose backward-compatible endpoints
app.post('/analyze', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const code = body.code || '';
  const filename = body.filename || 'module.py';
  const refine = body.refine !== false;
  const result = await analyzeCode.execute({ code, filename, refine }, { env: c.env } as any);
  return c.json(JSON.parse(result));
});

app.post('/chat', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const message = body.message;
  const context = JSON.stringify(body.context || {});
  const result = await drakonChat.execute({ message, context }, { env: c.env } as any);
  return c.json(JSON.parse(result));
});

app.post('/feedback', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const diagramName = body.diagram_name;
  const feedback = body.feedback;
  const correctedIr = body.corrected_ir;
  const result = await feedbackTool.execute({ diagramName, feedback, correctedIr }, { env: c.env } as any);
  return c.json(JSON.parse(result));
});

app.post('/analyze_folder', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const folderPath = body.folder_path;
  const maxFiles = body.max_files || 20;
  const refine = body.refine !== false;
  const result = await analyzeFolder.execute({ folderPath, maxFiles, refine }, { env: c.env } as any);
  return c.json(JSON.parse(result));
});

// Mount default Flue agent/workflow routes
app.route('/', flue());

export default app;
// Export durable objects bindings for wrangler/worker integration
export { FlueRegistry, FlueDrakonAgent } from '@flue/runtime';
