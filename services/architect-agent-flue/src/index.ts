import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { flue } from '@flue/runtime/routing';
import { handleMcp } from './mcp-server.js';
import { authMiddleware } from './middleware/auth.js';
import { quotaMiddleware } from './middleware/quota.js';
import { runPipelineA } from '../workflows/pipeline-a.js';
import { runPipelineB } from '../workflows/pipeline-b.js';
import { suggestPatterns } from '../tools/suggest-patterns.js';
import { contributeToKB, listKB } from '../tools/kb-crud.js';
import { listPipelines, getPipeline, updatePipeline } from '../tools/graph-pipelines.js';
import { listProjects, createProject } from '../tools/project-pipelines.js';
import { createJobDO, getJobDO, updateJobDO } from '../lib/job-store.js';

const app = new Hono<{ Bindings: any }>();

app.use('/*', cors());

// Health Check
app.get('/health', (c) => c.json({ status: 'ok', service: 'architect-agent-flue' }));
app.get('/me', authMiddleware, quotaMiddleware, (c) => c.json(c.get('tenant')));

// Tools registry — available pipeline node actions
app.get('/tools', (c) => c.json({
  tools: [
    { name: 'measure_cc', description: 'Measure cyclomatic complexity of code', inputs: ['source_code', 'file_path'], outputs: ['cyclomatic_complexity'] },
    { name: 'classify', description: 'Classify code or text into categories', inputs: ['cyclomatic_complexity'], outputs: ['tree_level', 'drakon_type'] },
    { name: 'ast_translate', description: 'Translate code to AST representation', inputs: ['source_code', 'file_path'], outputs: ['drakon_ir'] },
    { name: 'yaml_gen', description: 'Generate YAML from structured input', inputs: ['file_path', 'tree_level', 'cyclomatic_complexity', 'source_code'], outputs: ['behavioral_yaml'] },
    { name: 'ir_gen', description: 'Generate DRAKON IR from description', inputs: ['validation_errors', 'behavioral_yaml', 'source_code', 'iteration_count'], outputs: ['drakon_ir', 'iteration_count'] },
    { name: 'validate', description: 'Validate output against schema/rules', inputs: ['drakon_ir'], outputs: ['validation_errors'] },
    { name: 'code_gen', description: 'Generate code from DRAKON IR', inputs: ['syntax_errors', 'drakon_ir', 'language', 'description', 'iteration_count'], outputs: ['generated_code', 'iteration_count'] },
    { name: 'check_syntax', description: 'Check code syntax', inputs: ['language', 'generated_code'], outputs: ['syntax_errors'] },
    { name: 'drakon_load_kb', description: 'Load DRAKON knowledge base context', inputs: [], outputs: ['kb_context'] },
    { name: 'drakon_format_prompt', description: 'Format prompt for DRAKON IR generation', inputs: ['source_code', 'message', 'kb_context'], outputs: ['llm_prompt'] },
    { name: 'drakon_parse_result', description: 'Parse LLM response to DRAKON IR', inputs: ['llm_reply'], outputs: ['drakon_ir', 'parse_ok'] },
    { name: 'docs_load_kb', description: 'Load documentation knowledge base context', inputs: [], outputs: ['kb_context'] },
    { name: 'docs_format_prompt', description: 'Format prompt for documentation query', inputs: ['message', 'kb_context'], outputs: ['llm_prompt'] },
    { name: 'llm_call', description: 'Generic LLM call with prompt', inputs: ['llm_prompt'], outputs: ['llm_reply'] },
    { name: 'llm_call_with_system', description: 'LLM call with system prompt and user prompt', inputs: ['ss_system', 'llm_prompt'], outputs: ['llm_reply'] },
    { name: 'ss_detect_audience', description: 'Detect audience type from message keywords', inputs: ['message'], outputs: ['ss_audience'] },
    { name: 'ss_load_kb', description: 'Load knowledge base for audience', inputs: ['ss_audience'], outputs: ['kb_context'] },
    { name: 'ss_format_prompt', description: 'Format prompt and system message for Sonate Solidaire query', inputs: ['message', 'kb_context', 'ss_audience'], outputs: ['llm_prompt', 'ss_system'] },
    { name: 'ss_format_response', description: 'Add CTA based on detected audience to response', inputs: ['llm_reply', 'ss_audience'], outputs: ['llm_reply'] },
    { name: 'ss_log_analytics', description: 'Log analytics for Sonate Solidaire query', inputs: [], outputs: [] },
  ]
}));


// MCP Server JSON-RPC endpoint
app.post('/mcp', handleMcp);

// Backward-compatible agents chat route
app.post('/agents/:agent_id/chat', async (c) => {
  const agentId = c.req.param('agent_id');
  const reqBody: any = await c.req.json().catch(() => ({}));
  const message = reqBody.message || '';
  
  if (agentId === 'sonate-solidaire') {
    try {
      const { getPipeline: getPipe, executePipelineGraph } = await import('../tools/graph-pipelines.js');
      const ir = await getPipe('sonate-solidaire-agent', c.env);
      let reply = '';
      await executePipelineGraph(ir, { message }, c.env, (ev) => {
        if (ev.state && ev.state.llm_reply) {
          reply = ev.state.llm_reply;
        }
      });
      return c.json({ reply, suggested_mutations: null });
    } catch (e: any) {
      return c.json({ reply: `Error: ${e.message}`, suggested_mutations: null });
    }
  }
  
  const DRAKON_SYSTEM = "Ти — DRAKON-агент. Отримуєш Python-код і генеруєш DRAKON IR JSON. Відповідай тільки JSON у форматі DRAKON IR або поясненням помилки.";
  const DOCS_SYSTEM = "Ти — документознавець AI-DRAKON. Відповідаєш на питання про документацію, архітектуру та використання платформи. Посилайся на [[wiki-links]] де доречно.";
  
  if (agentId === 'drakon' || agentId === 'docs') {
    const system = agentId === 'drakon' ? DRAKON_SYSTEM : DOCS_SYSTEM;
    const { architectChatWithSystem } = await import('../tools/architect-chat.js');
    const res = await architectChatWithSystem(message, system, reqBody.context?.fileTree, reqBody.context?.currentDiagram, c.env);
    return c.json(res);
  }

  // Default: general architect chat
  const { architectChat } = await import('../tools/architect-chat.js');
  const res = await architectChat(
    message,
    reqBody.context?.fileTree,
    reqBody.context?.currentDiagram,
    '', // memory
    '', // kb
    reqBody.context?.projectSlug,
    reqBody.context?.projectPath,
    c.env
  );
  return c.json(res);
});

// Chat route
app.post('/chat', async (c) => {
  const reqBody: any = await c.req.json().catch(() => ({}));
  const { message, context } = reqBody;
  const { architectChat } = await import('../tools/architect-chat.js');
  const res = await architectChat(
    message,
    context?.fileTree,
    context?.currentDiagram,
    '', // memory
    '', // kb
    context?.projectSlug,
    context?.projectPath,
    c.env
  );
  return c.json(res);
});

// Pipeline A endpoint
app.post('/pipeline/analyze', async (c) => {
  const reqBody: any = await c.req.json().catch(() => ({}));
  const { code, file_path } = reqBody;
  const res = await runPipelineA(code || '', file_path || 'module.js', c.env);
  return c.json(res);
});

// Pipeline B endpoint
app.post('/pipeline/generate', async (c) => {
  const reqBody: any = await c.req.json().catch(() => ({}));
  const { drakon_ir, description, language } = reqBody;
  const res = await runPipelineB(drakon_ir, description || '', language || 'javascript', c.env);
  return c.json(res);
});

// Job Status check
app.get('/pipeline/status/:id', async (c) => {
  const jobId = c.req.param('id');
  const job = await getJobDO(c.env, jobId);
  if (!job) return c.json({ error: 'Job not found' }, 404);
  return c.json(job);
});

// List Global Pipelines
app.get('/graph-pipelines', async (c) => {
  const pipelines = await listPipelines(c.env);
  return c.json({ pipelines });
});

// Get Global Pipeline
app.get('/graph-pipelines/:name', async (c) => {
  const name = c.req.param('name');
  try {
    const pipeline = await getPipeline(name, c.env);
    return c.json(pipeline);
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

// Update Global Pipeline
app.put('/graph-pipelines/:name', async (c) => {
  const name = c.req.param('name');
  const body: any = await c.req.json().catch(() => ({}));
  await updatePipeline(name, body, c.env);
  return c.json({ ok: true, name });
});

// Start Global Pipeline Execution (async, returns job_id)
app.post('/graph-pipelines/:name/execute', async (c) => {
  const name = c.req.param('name');
  const body: any = await c.req.json().catch(() => ({}));
  const jobId = await createJobDO(c.env);
  
  const initialState = body.initial_state || { ...body };
  delete initialState.breakpoints;
  await updateJobDO(c.env, jobId, 'pending', initialState);
  
  // Trigger async execution
  const { executePipelineGraph, getPipeline: getPipe } = await import('../tools/graph-pipelines.js');
  (async () => {
    try {
      const ir = await getPipe(name, c.env);
      await updateJobDO(c.env, jobId, 'running');
      const finalState = await executePipelineGraph(ir, initialState, c.env, () => {});
      await updateJobDO(c.env, jobId, 'done', finalState);
    } catch (err: any) {
      await updateJobDO(c.env, jobId, 'error', null, err.message);
    }
  })();
  
  return c.json({ job_id: jobId });
});

// Stream Global Pipeline Execution SSE
app.get('/graph-pipelines/:name/execute/:job_id/stream', async (c) => {
  const name = c.req.param('name');
  const jobId = c.req.param('job_id');
  const { executePipelineSSE } = await import('../tools/graph-pipelines.js');
  return await executePipelineSSE(name, jobId, c.env);
});

// KB List
app.get('/kb', async (c) => {
  const limit = Number(c.req.query('limit') || '20');
  const offset = Number(c.req.query('offset') || '0');
  const res = await listKB(c.env.KB_DB, limit, offset);
  return c.json(res);
});

// KB Contribute
app.post('/kb/contribute', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const res = await contributeToKB(c.env.KB_DB, body.code || '', body.ir_yaml || '', body.language, body.description, body.job_id, body.tags);
  return c.json(res);
});

// KB Delete
app.delete('/kb/:id', async (c) => {
  const id = c.req.param('id');
  const { deleteKBEntry } = await import('../tools/kb-crud.js');
  const ok = await deleteKBEntry(c.env.KB_DB, id);
  if (!ok) return c.json({ error: 'Not found' }, 404);
  return c.json({ deleted: id });
});

// Suggest architectural patterns from NotebookLM
app.post('/suggest-patterns', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const patterns = await suggestPatterns(body.project_docs || '', body.chat_context || '', body.requirements || '', c.env);
  return c.json(patterns);
});

// List Projects
app.get('/projects', async (c) => {
  const projects = await listProjects(c.env);
  return c.json({ projects });
});

// Create Project
app.post('/projects/:slug', async (c) => {
  const slug = c.req.param('slug');
  const body: any = await c.req.json().catch(() => ({}));
  const res = await createProject(slug, body, c.env);
  return c.json({ success: true, project: res });
});

// Delete Project
app.delete('/projects/:slug', async (c) => {
  const slug = c.req.param('slug');
  const { deleteProject } = await import('../tools/project-pipelines.js');
  const ok = await deleteProject(slug, c.env);
  return c.json({ success: ok, deleted: slug });
});

// Project Agent Routes
app.get('/projects/:slug/agents', async (c) => {
  const slug = c.req.param('slug');
  const { listAgents } = await import('../tools/project-pipelines.js');
  const agents = await listAgents(slug, c.env);
  return c.json({ slug, agents });
});

app.get('/projects/:slug/agents/:agent/pipeline', async (c) => {
  const slug = c.req.param('slug');
  const agent = c.req.param('agent');
  const { getProjectPipeline } = await import('../tools/project-pipelines.js');
  try {
    const pipeline = await getProjectPipeline(slug, agent, c.env);
    return c.json(pipeline);
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

app.put('/projects/:slug/agents/:agent/pipeline', async (c) => {
  const slug = c.req.param('slug');
  const agent = c.req.param('agent');
  const body: any = await c.req.json().catch(() => ({}));
  const { saveProjectPipeline } = await import('../tools/project-pipelines.js');
  await saveProjectPipeline(slug, agent, body.ir || body, c.env);
  return c.json({ saved: `projects/${slug}/agents/${agent}/pipeline.drakon.json`, valid: true });
});

app.get('/projects/:slug/agents/:agent/status', async (c) => {
  const slug = c.req.param('slug');
  const agent = c.req.param('agent');
  const { getProjectPipelineStatus } = await import('../tools/project-pipelines.js');
  const res = await getProjectPipelineStatus(slug, agent, c.env);
  return c.json(res);
});

app.post('/projects/:slug/agents/:agent/execute', async (c) => {
  const slug = c.req.param('slug');
  const agent = c.req.param('agent');
  const body: any = await c.req.json().catch(() => ({}));
  
  const jobId = await createJobDO(c.env);
  const initialState = {
    input: body.input || '',
    query: body.query || '',
    project_slug: slug,
    agent_name: agent,
    context: ''
  };
  await updateJobDO(c.env, jobId, 'pending', initialState);

  const { executeProjectPipelineSSE } = await import('../tools/project-pipelines.js');
  return await executeProjectPipelineSSE(slug, agent, body, jobId, c.env);
});

app.get('/projects/:slug/agents/:agent/execute', async (c) => {
  const slug = c.req.param('slug');
  const agent = c.req.param('agent');
  const input = c.req.query('input') || '';
  const query = c.req.query('query') || '';

  const jobId = await createJobDO(c.env);
  const initialState = {
    input,
    query,
    project_slug: slug,
    agent_name: agent,
    context: ''
  };
  await updateJobDO(c.env, jobId, 'pending', initialState);

  const { executeProjectPipelineSSE } = await import('../tools/project-pipelines.js');
  return await executeProjectPipelineSSE(slug, agent, { input, query }, jobId, c.env);
});

app.get('/projects/:slug/agents/:agent/kb/search', async (c) => {
  const slug = c.req.param('slug');
  const agent = c.req.param('agent');
  const q = c.req.query('q') || '';
  const { searchProjectKB } = await import('../tools/project-pipelines.js');
  const results = await searchProjectKB(slug, agent, q, c.env);
  return c.json({ results, count: results.length });
});

app.post('/projects/:slug/agents/:agent/kb/upload', async (c) => {
  const slug = c.req.param('slug');
  const agent = c.req.param('agent');
  const filename = c.req.query('filename') || '';
  const body: any = await c.req.json().catch(() => ({}));
  const { uploadProjectKBDoc } = await import('../tools/project-pipelines.js');
  const res = await uploadProjectKBDoc(slug, agent, filename, body.content || '', c.env);
  return c.json(res);
});

// GitNexus Routes
app.post('/gitnexus/analyze', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { gitNexusAnalyze } = await import('../tools/gitnexus.js');
  const jobId = await gitNexusAnalyze(body.repo || '', body.concept || '', c.env);
  return c.json({ job_id: jobId });
});

app.all('/gitnexus/repos', async (c) => {
  const { listGitNexusRepos } = await import('../tools/gitnexus.js');
  try {
    const repos = await listGitNexusRepos(c.env);
    return c.json(repos);
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

app.all('/gitnexus/impact', async (c) => {
  const repo = c.req.query('repo') || '';
  const symbol = c.req.query('symbol') || '';
  const { gitNexusImpact } = await import('../tools/gitnexus.js');
  try {
    const res = await gitNexusImpact(repo, symbol, c.env);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

// File routes
app.get('/files/list', async (c) => {
  const path = c.req.query('path') || '.';
  const { listFiles } = await import('../tools/files.js');
  try {
    const res = await listFiles(path, c.env);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

app.get('/files/read', async (c) => {
  const path = c.req.query('path') || '';
  const maxChars = Number(c.req.query('max_chars') || '8000');
  const { readFile } = await import('../tools/files.js');
  try {
    const res = await readFile(path, maxChars, c.env);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

app.post('/files/write', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { writeFile } = await import('../tools/files.js');
  try {
    const res = await writeFile(body.path || '', body.content || '', c.env);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 403);
  }
});

app.post('/files/patch', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { patchFile } = await import('../tools/files.js');
  try {
    const res = await patchFile(body.path || '', body.old_string || '', body.new_string || '', !!body.replace_all, c.env);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 422);
  }
});

app.post('/files/delete', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { deleteFile } = await import('../tools/files.js');
  try {
    const res = await deleteFile(body.path || '', c.env);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

// Mount default Flue agent/workflow routes
app.route('/', flue());

export default app;

// Durable Object Export
export { ArchitectJobStore } from '../lib/job-store.js';
// @ts-ignore
export { FlueArchitectAgent } from '@flue/runtime';
// @ts-ignore
export { FlueRegistry } from '@flue/runtime';
