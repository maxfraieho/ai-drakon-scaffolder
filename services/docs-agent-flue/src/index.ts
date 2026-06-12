import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { flue } from '@flue/runtime/routing';
import { handleMcp } from './mcp-server.js';
import { docsChat } from '../tools/docs-chat.js';
import { notesCrud } from '../tools/notes-crud.js';
import { docsFs } from '../tools/docs-fs.js';
import { projectsTool } from '../tools/projects.js';
import { drakonIr } from '../tools/drakon-ir.js';
import { gitnexusDocs } from '../tools/gitnexus-docs.js';
import { dataviewTool } from '../tools/dataview.js';
import { GitHubAPI } from '../lib/github-api.js';

const app = new Hono<{ Bindings: any }>();

app.use('/*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'docs-agent', port: 8767 }));

// MCP server endpoint
app.post('/mcp', handleMcp);

// Settings
app.get('/settings', (c) => {
  const repo = c.env?.GITHUB_REPO || 'maxfraieho/ai-drakon-scaffolder';
  return c.json({
    repo_root: repo,
    proxy_url: 'https://agy3.exodus.pp.ua/v1',
    proxy_model: 'gemini-2.5-flash',
    proxy_protocol: 'openai',
    agent: 'docs'
  });
});

// Chat endpoint
app.post('/chat', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const message = body.message || '';
  const ctx = body.context || {};
  const currentDoc = ctx.currentDoc || ctx.current_doc || '';
  const fileTree = ctx.fileTree || ctx.file_tree || '';
  
  let memoryContext = '';
  try {
    const token = c.env?.GITHUB_TOKEN || '';
    const repo = c.env?.GITHUB_REPO || 'maxfraieho/ai-drakon-scaffolder';
    const branch = c.env?.GITHUB_BRANCH || 'main';
    const gh = new GitHubAPI(token, repo, branch);
    const mem = await gh.getFile('memory/docs/MEMORY.md').catch(() => null);
    if (mem) {
      memoryContext = mem.content;
    }
  } catch (e) {}
  
  const result = await docsChat.execute({
    message,
    currentDoc: typeof currentDoc === 'string' ? currentDoc : JSON.stringify(currentDoc),
    fileTree: typeof fileTree === 'string' ? fileTree : JSON.stringify(fileTree),
    memoryContext
  }, { env: c.env, llmConfig: body.llmConfig || null } as any);
  
  return c.json(JSON.parse(result));
});

// Document module endpoint
app.post('/document', async (c) => {
  const req: any = await c.req.json().catch(() => ({}));
  const moduleName = req.module_name || '';
  const code = req.code || '';
  const slug = req.slug || `modules/${moduleName}`;
  const project = req.project || 'uav-watcher';
  const tagList: string[] = req.tags || ['module', project];
  
  const dateStr = new Date().toISOString().split('T')[0];
  
  const message = `Задокументуй модуль \`${moduleName}\` проекту ${project}.

Напиши документ у форматі Obsidian Markdown. УВАГА: НЕ обгортай відповідь у \`\`\`markdown або \`\`\`yaml блоки. Починай відразу з --- frontmatter. З YAML frontmatter:
\`\`\`yaml
---
title: <назва модуля>
type: module
module: ${moduleName}
project: ${project}
tags: [${tagList.map(t => `"${t}"`).join(', ')}]
related: []
created: ${dateStr}
status: documented
---
\`\`\`

Секції документу (УКРАЇНСЬКОЮ):
## Призначення
## Архітектура
## Ключові функції
## Потік виконання
## Залежності

Код модуля:
\`\`\`python
${code.slice(0, 5000)}
\`\`\``;

  let memoryContext = '';
  try {
    const token = c.env?.GITHUB_TOKEN || '';
    const repo = c.env?.GITHUB_REPO || 'maxfraieho/ai-drakon-scaffolder';
    const branch = c.env?.GITHUB_BRANCH || 'main';
    const gh = new GitHubAPI(token, repo, branch);
    const mem = await gh.getFile('memory/docs/MEMORY.md').catch(() => null);
    if (mem) {
      memoryContext = mem.content;
    }
  } catch (e) {}

  const chatRes = await docsChat.execute({
    message,
    memoryContext
  }, { env: c.env, llmConfig: req.llmConfig || null } as any);
  
  const chatJson = JSON.parse(chatRes);
  const reply = chatJson.reply || '';
  if (!reply) {
    return c.json({ success: false, error: 'Empty reply from LLM' }, 502);
  }

  const writeRes = await notesCrud.execute({
    operation: 'write',
    slug,
    title: `Module: ${moduleName}`,
    content: reply,
    tags: tagList
  }, { env: c.env } as any);

  const writeJson = JSON.parse(writeRes);
  if (!writeJson.success) {
    return c.json({ success: false, error: writeJson.error }, 500);
  }

  return c.json({
    success: true,
    slug,
    path: writeJson.path,
    git_ok: true,
    git_error: null,
    preview: reply.slice(0, 500)
  });
});

// Memory endpoints
app.get('/memory/list', async (c) => {
  const token = c.env?.GITHUB_TOKEN || '';
  const repo = c.env?.GITHUB_REPO || 'maxfraieho/ai-drakon-scaffolder';
  const branch = c.env?.GITHUB_BRANCH || 'main';
  const gh = new GitHubAPI(token, repo, branch);
  try {
    const files = await gh.listDir('memory/docs').catch(() => []);
    const fileNames = files.filter(f => f.type === 'file').map(f => f.name);
    return c.json({ files: fileNames.sort() });
  } catch (e) {
    return c.json({ files: [] });
  }
});

app.get('/memory/get', async (c) => {
  const file = c.req.query('file') || '';
  if (!file) return c.json({ error: 'file query param is required' }, 400);
  
  const token = c.env?.GITHUB_TOKEN || '';
  const repo = c.env?.GITHUB_REPO || 'maxfraieho/ai-drakon-scaffolder';
  const branch = c.env?.GITHUB_BRANCH || 'main';
  const gh = new GitHubAPI(token, repo, branch);
  try {
    const { content } = await gh.getFile(`memory/docs/${file}`);
    return c.json({ file, content });
  } catch (e) {
    return c.json({ error: 'File not found' }, 404);
  }
});

app.post('/memory/save', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const file = body.file || '';
  const content = body.content || '';
  const commitMsg = body.commit_msg || `memory: update ${file}`;
  
  if (!file || !content) {
    return c.json({ error: 'file and content are required' }, 400);
  }

  const token = c.env?.GITHUB_TOKEN || '';
  const repo = c.env?.GITHUB_REPO || 'maxfraieho/ai-drakon-scaffolder';
  const branch = c.env?.GITHUB_BRANCH || 'main';
  const gh = new GitHubAPI(token, repo, branch);
  
  try {
    let sha: string | undefined = undefined;
    try {
      const existing = await gh.getFile(`memory/docs/${file}`);
      sha = existing.sha;
    } catch (e) {}
    
    const putRes = await gh.putFile(`memory/docs/${file}`, content, commitMsg, sha);
    return c.json({ success: true, path: `memory/docs/${file}`, storage: 'github', sha: putRes.content.sha });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Docs router
app.get('/docs/list', async (c) => {
  const path = c.req.query('path') || 'docs';
  const res = await docsFs.execute({ operation: 'list', path }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.get('/docs/read', async (c) => {
  const path = c.req.query('path') || '';
  const maxChars = parseInt(c.req.query('max_chars') || '8000', 10);
  const res = await docsFs.execute({ operation: 'read', path, maxChars }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

// Notes router
app.get('/notes/list', async (c) => {
  const flat = c.req.query('flat') !== 'false';
  const project = c.req.query('project');
  const res = await notesCrud.execute({ operation: 'list', flat, project }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.get('/notes/read', async (c) => {
  const slug = c.req.query('slug') || '';
  const project = c.req.query('project');
  const res = await notesCrud.execute({ operation: 'read', slug, project }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.post('/notes/write', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const res = await notesCrud.execute({
    operation: 'write',
    slug: body.slug,
    title: body.title,
    content: body.content,
    tags: body.tags,
    project: body.project
  }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.delete('/notes/delete', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const res = await notesCrud.execute({
    operation: 'delete',
    slug: body.slug,
    project: body.project
  }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.post('/notes/restructure', async (c) => {
  const res = await notesCrud.execute({ operation: 'restructure' }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.get('/notes/graph', async (c) => {
  const project = c.req.query('project');
  const res = await notesCrud.execute({ operation: 'graph', project }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

// Drakon IR router
app.get('/drakon-ir/list', async (c) => {
  const res = await drakonIr.execute({ operation: 'list' }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.get('/drakon-ir/get', async (c) => {
  const name = c.req.query('name') || '';
  const res = await drakonIr.execute({ operation: 'get', name }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

// Projects router
app.get('/projects/list', async (c) => {
  const res = await projectsTool.execute({ operation: 'list' }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.post('/projects/add', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const res = await projectsTool.execute({
    operation: 'add',
    slug: body.slug,
    name: body.name,
    path: body.path,
    description: body.description,
    hasDrakonIr: body.hasDrakonIr,
    hasDocs: body.hasDocs,
    github: body.github
  }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.delete('/projects/:slug', async (c) => {
  const slug = c.req.param('slug');
  const res = await projectsTool.execute({ operation: 'delete', slug }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

// Dataview router
app.post('/docs/dataview/query', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const res = await dataviewTool.execute({ query: body.query }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

// Gitnexus router
app.post('/gitnexus/generate-docs', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const res = await gitnexusDocs.execute({
    operation: 'generate_docs',
    repo: body.repo,
    concept: body.concept
  }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.post('/gitnexus/api-docs', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const res = await gitnexusDocs.execute({
    operation: 'api_docs',
    repo: body.repo,
    route: body.route
  }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.post('/gitnexus/what-changed', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const repo = c.req.query('repo') || body.repo;
  const symbol = c.req.query('symbol') || body.symbol;
  const res = await gitnexusDocs.execute({
    operation: 'what_changed',
    repo,
    symbol
  }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

app.get('/gitnexus/repos', async (c) => {
  const res = await gitnexusDocs.execute({ operation: 'repos' }, { env: c.env } as any);
  return c.json(JSON.parse(res));
});

// Mount Flue routes
app.route('/', flue());

export default app;

