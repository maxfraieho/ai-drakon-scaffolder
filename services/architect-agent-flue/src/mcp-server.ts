import { Context } from 'hono';
import { architectChat } from '../tools/architect-chat.js';
import { runPipelineA } from '../workflows/pipeline-a.js';
import { runPipelineB } from '../workflows/pipeline-b.js';
import { suggestPatterns } from '../tools/suggest-patterns.js';
import { contributeToKB, listKB, searchPatterns } from '../tools/kb-crud.js';
import { listPipelines, getPipeline, updatePipeline, executePipelineGraph } from '../tools/graph-pipelines.js';
import { listProjects, createProject } from '../tools/project-pipelines.js';
import { createJobDO, getJobDO, updateJobDO } from '../lib/job-store.js';
import { GitHubAPI } from '../lib/github-api.js';


const MCP_TOOLS = [
  {
    name: 'architect_chat',
    description: 'Chat about architecture and DRAKON patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'User message' },
        file_tree: { type: 'object', description: 'Project file tree context' },
        current_diagram: { type: 'object', description: 'Active diagram context' },
        memory_context: { type: 'string', description: 'Memory context' },
        kb_context: { type: 'string', description: 'KB context' },
        project_slug: { type: 'string', description: 'Active project slug' },
        project_path: { type: 'string', description: 'Active project path' }
      },
      required: ['message']
    }
  },
  {
    name: 'pipeline_a',
    description: 'Run Pipeline A (Code -> DRAKON IR workflow).',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code' },
        file_path: { type: 'string', description: 'File path' }
      },
      required: ['code', 'file_path']
    }
  },
  {
    name: 'pipeline_b',
    description: 'Run Pipeline B (DRAKON IR -> Code workflow).',
    inputSchema: {
      type: 'object',
      properties: {
        drakon_ir: { type: 'object', description: 'DRAKON IR diagram' },
        description: { type: 'string', description: 'Description' },
        language: { type: 'string', description: 'Target programming language' }
      },
      required: ['drakon_ir', 'description', 'language']
    }
  },
  {
    name: 'suggest_patterns',
    description: 'Query NotebookLM AwesomeArchitecture for pattern recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        project_docs: { type: 'string', description: 'Project documentation context' },
        chat_context: { type: 'string', description: 'Chat context' },
        requirements: { type: 'string', description: 'Requirements for patterns' }
      },
      required: ['requirements']
    }
  },
  {
    name: 'kb_contribute',
    description: 'Add contribution to the knowledge base.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code block' },
        ir_yaml: { type: 'string', description: 'DRAKON IR YAML representation' },
        language: { type: 'string', description: 'Programming language' },
        description: { type: 'string', description: 'Description' },
        job_id: { type: 'string', description: 'Associated job ID' },
        tags: { type: 'string', description: 'Comma-separated tags' }
      },
      required: ['code', 'ir_yaml']
    }
  },
  {
    name: 'kb_list',
    description: 'List KB contributions.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Limit' },
        offset: { type: 'number', description: 'Offset' }
      }
    }
  },
  {
    name: 'kb_search_patterns',
    description: 'Search patterns in KB contributions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term' },
        limit: { type: 'number', description: 'Limit' }
      },
      required: ['query']
    }
  },
  {
    name: 'list_pipelines',
    description: 'List DRAKON pipelines.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_pipeline',
    description: 'Get pipeline IR by name.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Pipeline name' }
      },
      required: ['name']
    }
  },
  {
    name: 'update_pipeline',
    description: 'Save pipeline IR by name.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Pipeline name' },
        ir: { type: 'object', description: 'DRAKON IR diagram' }
      },
      required: ['name', 'ir']
    }
  },
  {
    name: 'execute_pipeline',
    description: 'Start execution of a pipeline (async, returns job_id).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Pipeline name' },
        initial_state: { type: 'object', description: 'Initial state parameters' }
      },
      required: ['name']
    }
  },
  {
    name: 'job_status',
    description: 'Check job status and results.',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'string', description: 'Job ID' }
      },
      required: ['job_id']
    }
  },
  {
    name: 'list_projects',
    description: 'List projects with agents.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'create_project',
    description: 'Create a new project.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Project slug identifier' },
        payload: { type: 'object', description: 'Project details' }
      },
      required: ['slug']
    }
  },
  {
    name: 'gh_list_files',
    description: 'List files and directories in a GitHub repository path.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub owner/org' },
        repo:  { type: 'string', description: 'Repository name' },
        path:  { type: 'string', description: 'Directory path (empty = root)', default: '' },
        branch: { type: 'string', description: 'Branch name', default: 'main' },
        token: { type: 'string', description: 'GitHub token (optional, uses env fallback)' }
      },
      required: ['owner', 'repo']
    }
  },
  {
    name: 'gh_read_file',
    description: 'Read file content from any GitHub repository.',
    inputSchema: {
      type: 'object',
      properties: {
        owner:  { type: 'string' },
        repo:   { type: 'string' },
        path:   { type: 'string', description: 'File path in repository' },
        branch: { type: 'string', default: 'main' },
        token:  { type: 'string', description: 'GitHub token (optional)' }
      },
      required: ['owner', 'repo', 'path']
    }
  },
  {
    name: 'gh_write_file',
    description: 'Create or update a file in any GitHub repository (requires token with write access).',
    inputSchema: {
      type: 'object',
      properties: {
        owner:   { type: 'string' },
        repo:    { type: 'string' },
        path:    { type: 'string', description: 'File path in repository' },
        content: { type: 'string', description: 'New file content (UTF-8)' },
        message: { type: 'string', description: 'Commit message' },
        branch:  { type: 'string', default: 'main' },
        token:   { type: 'string', description: 'GitHub token with write access' }
      },
      required: ['owner', 'repo', 'path', 'content', 'message']
    }
  },
  {
    name: 'gh_search_code',
    description: 'Search code in a GitHub repository using GitHub code search.',
    inputSchema: {
      type: 'object',
      properties: {
        owner:  { type: 'string' },
        repo:   { type: 'string' },
        query:  { type: 'string', description: 'Search query (GitHub code search syntax)' },
        token:  { type: 'string', description: 'GitHub token (required for code search API)' }
      },
      required: ['owner', 'repo', 'query']
    }
  }
];

export async function handleMcp(c: Context) {
  const reqBody: any = await c.req.json().catch(() => null);
  if (!reqBody || typeof reqBody !== 'object') {
    return c.json({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error' },
      id: null,
    }, 400);
  }

  const { jsonrpc, method, params, id } = reqBody;
  if (jsonrpc !== '2.0') {
    return c.json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request' },
      id: id || null,
    }, 400);
  }

  switch (method) {
    case 'initialize':
      return c.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'architect-agent-mcp',
            version: '1.0.0',
          },
        },
        id,
      });

    case 'tools/list':
      return c.json({
        jsonrpc: '2.0',
        result: {
          tools: MCP_TOOLS,
        },
        id,
      });

    case 'tools/call': {
      const { name, arguments: args } = params || {};
      if (!name) {
        return c.json({
          jsonrpc: '2.0',
          error: { code: -32602, message: 'Invalid params: name is required' },
          id,
        }, 400);
      }

      try {
        let result: any = null;

        if (name === 'architect_chat') {
          const { message, file_tree, current_diagram, memory_context, kb_context, project_slug, project_path } = args || {};
          result = await architectChat(message, file_tree, current_diagram, memory_context, kb_context, project_slug, project_path, c.env);
        } else if (name === 'pipeline_a') {
          const { code, file_path } = args || {};
          result = await runPipelineA(code, file_path, c.env);
        } else if (name === 'pipeline_b') {
          const { drakon_ir, description, language } = args || {};
          result = await runPipelineB(drakon_ir, description, language, c.env);
        } else if (name === 'suggest_patterns') {
          const { project_docs, chat_context, requirements } = args || {};
          result = await suggestPatterns(project_docs || '', chat_context || '', requirements || '', c.env);
        } else if (name === 'kb_contribute') {
          const { code, ir_yaml, language, description, job_id, tags } = args || {};
          result = await contributeToKB(c.env.KB_DB, code, ir_yaml, language, description, job_id, tags);
        } else if (name === 'kb_list') {
          const { limit, offset } = args || {};
          result = await listKB(c.env.KB_DB, limit, offset);
        } else if (name === 'kb_search_patterns') {
          const { query, limit } = args || {};
          result = await searchPatterns(c.env.KB_DB, query, limit);
        } else if (name === 'list_pipelines') {
          result = await listPipelines(c.env);
        } else if (name === 'get_pipeline') {
          const { name: pipelineName } = args || {};
          result = await getPipeline(pipelineName, c.env);
        } else if (name === 'update_pipeline') {
          const { name: pipelineName, ir } = args || {};
          result = await updatePipeline(pipelineName, ir, c.env);
        } else if (name === 'execute_pipeline') {
          const { name: pipelineName, initial_state } = args || {};
          const jobId = await createJobDO(c.env);
          await updateJobDO(c.env, jobId, 'pending', initial_state || {});
          
          // Run background task
          (async () => {
            try {
              const ir = await getPipeline(pipelineName, c.env);
              await updateJobDO(c.env, jobId, 'running');
              const finalState = await executePipelineGraph(ir, initial_state || {}, c.env, () => {});
              await updateJobDO(c.env, jobId, 'done', finalState);
            } catch (err: any) {
              await updateJobDO(c.env, jobId, 'error', null, err.message);
            }
          })();
          
          result = { job_id: jobId };
        } else if (name === 'job_status') {
          const { job_id } = args || {};
          result = await getJobDO(c.env, job_id);
        } else if (name === 'list_projects') {
          result = await listProjects(c.env);
        } else if (name === 'create_project') {
          const { slug, payload } = args || {};
          result = await createProject(slug, payload, c.env);
        } else if (name === 'gh_list_files') {
          const { owner, repo, path = '', branch = 'main', token } = args || {};
          const ghToken = token || c.env.GITHUB_TOKEN || '';
          const api = new GitHubAPI(ghToken, `${owner}/${repo}`, branch);
          const items = await api.listDir(path);
          result = items.map(i => ({ name: i.name, path: i.path, type: i.type, size: i.size }));
        } else if (name === 'gh_read_file') {
          const { owner, repo, path, branch = 'main', token } = args || {};
          const ghToken = token || c.env.GITHUB_TOKEN || '';
          const api = new GitHubAPI(ghToken, `${owner}/${repo}`, branch);
          const file = await api.getFile(path);
          result = { path, content: file.content, sha: file.sha };
        } else if (name === 'gh_write_file') {
          const { owner, repo, path, content, message, branch = 'main', token } = args || {};
          const ghToken = token || c.env.GITHUB_TOKEN || '';
          if (!ghToken) throw new Error('GitHub token required for write operations');
          const api = new GitHubAPI(ghToken, `${owner}/${repo}`, branch);
          // Get SHA if file exists (for update)
          let sha: string | undefined;
          try { const existing = await api.getFile(path); sha = existing.sha; } catch {}
          const commitResult = await api.putFile(path, content, message, sha);
          result = { path, sha: commitResult.sha, committed: true };
        } else if (name === 'gh_search_code') {
          const { owner, repo, query, token } = args || {};
          const ghToken = token || c.env.GITHUB_TOKEN || '';
          const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
          if (ghToken) headers.Authorization = `Bearer ${ghToken}`;
          const q = encodeURIComponent(`${query} repo:${owner}/${repo}`);
          const resp = await fetch(`https://api.github.com/search/code?q=${q}&per_page=20`, { headers });
          if (!resp.ok) throw new Error(`GitHub search API ${resp.status}: ${await resp.text()}`);
          const data: any = await resp.json();
          result = (data.items || []).map((i: any) => ({
            path: i.path,
            url: i.html_url,
            score: i.score
          }));
        } else {
          return c.json({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${name}` },
            id,
          }, 404);
        }

        return c.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
          id,
        });
      } catch (e: any) {
        return c.json({
          jsonrpc: '2.0',
          error: { code: -32603, message: `Internal error: ${e.message}` },
          id,
        }, 500);
      }
    }

    default:
      return c.json({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${method}` },
        id,
      }, 404);
  }
}
