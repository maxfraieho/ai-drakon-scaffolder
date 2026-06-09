import { GitHubAPI } from '../lib/github-api.js';
import { executePipelineGraph } from './graph-pipelines.js';
import { getJobDO, updateJobDO, createJobDO } from '../lib/job-store.js';

export async function listProjects(env: any): Promise<any[]> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  try {
    const items = await api.listDir('projects');
    const projects: any[] = [];
    for (const item of items) {
      if (item.type === 'dir') {
        const slug = item.name;
        let config: any = {};
        try {
          const confFile = await api.getFile(`projects/${slug}/config.json`);
          config = JSON.parse(confFile.content);
        } catch (e) {}

        let agents: string[] = [];
        try {
          const agentDirs = await api.listDir(`projects/${slug}/agents`);
          agents = agentDirs.filter(d => d.type === 'dir').map(d => d.name);
        } catch (e) {}

        projects.push({
          slug,
          name: config.name || slug,
          description: config.description || '',
          repo_url: config.repo_url || '',
          branch: config.branch || 'main',
          has_repo: true,
          agents,
          github: config.github || null
        });
      }
    }
    return projects;
  } catch (e) {
    return [];
  }
}

export async function createProject(slug: string, payload: any, env: any): Promise<any> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  const config = {
    slug,
    name: payload.name || slug,
    description: payload.description || '',
    repo_url: payload.repo_url || '',
    branch: payload.branch || 'main',
    github: payload.github || null,
    created_at: new Date().toISOString()
  };

  const path = `projects/${slug}/config.json`;
  let sha: string | undefined;
  try {
    const existing = await api.getFile(path);
    sha = existing.sha;
  } catch (e) {}

  await api.putFile(path, JSON.stringify(config, null, 2), `feat(projects): create project ${slug}`, sha);
  
  // Create agents dir placeholder by writing a readme
  await api.putFile(`projects/${slug}/agents/README.md`, `# Agents for ${slug}`, `init agents dir`, undefined);

  return config;
}

export async function listAgents(slug: string, env: any): Promise<any[]> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  try {
    const items = await api.listDir(`projects/${slug}/agents`);
    const agents: any[] = [];
    for (const item of items) {
      if (item.type === 'dir') {
        let hasPipeline = false;
        try {
          await api.getFile(`projects/${slug}/agents/${item.name}/pipeline.drakon.json`);
          hasPipeline = true;
        } catch (e) {}

        let kbDocs = 0;
        try {
          const kbFiles = await api.listDir(`projects/${slug}/agents/${item.name}/kb`);
          kbDocs = kbFiles.filter(f => f.name.endsWith('.md')).length;
        } catch (e) {}

        agents.push({
          name: item.name,
          has_pipeline: hasPipeline,
          kb_docs: kbDocs
        });
      }
    }
    return agents;
  } catch (e) {
    return [];
  }
}

export async function getProjectPipeline(slug: string, agent: string, env: any): Promise<any> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  const file = await api.getFile(`projects/${slug}/agents/${agent}/pipeline.drakon.json`);
  return JSON.parse(file.content);
}

export async function saveProjectPipeline(slug: string, agent: string, ir: any, env: any): Promise<boolean> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  const path = `projects/${slug}/agents/${agent}/pipeline.drakon.json`;
  const content = JSON.stringify(ir, null, 2);

  let sha: string | undefined;
  try {
    const existing = await api.getFile(path);
    sha = existing.sha;
  } catch (e) {}

  await api.putFile(path, content, `feat(drakon): update pipeline for agent ${agent} in ${slug}`, sha);
  return true;
}

export async function getProjectPipelineStatus(slug: string, agent: string, env: any): Promise<any> {
  try {
    const ir = await getProjectPipeline(slug, agent, env);
    return { status: 'ok', nodes: Object.keys(ir.items || {}).length };
  } catch (e: any) {
    return { status: 'error', error: e.message };
  }
}

export async function executeProjectPipelineSSE(slug: string, agent: string, inputData: any, jobId: string, env: any): Promise<Response> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);
  const path = `projects/${slug}/agents/${agent}/pipeline.drakon.json`;

  let ir: any;
  try {
    const file = await api.getFile(path);
    ir = JSON.parse(file.content);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: `Pipeline not found: ${e.message}` }), { status: 404 });
  }

  const job = await getJobDO(env, jobId);
  if (!job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      await updateJobDO(env, jobId, 'running');
      
      const onStep = async (event: any) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const finalState = await executePipelineGraph(ir, {
        input: inputData.input || '',
        query: inputData.query || '',
        project_slug: slug,
        agent_name: agent,
        context: '',
        ...job.result
      }, env, onStep);
      
      await updateJobDO(env, jobId, 'done', finalState);
    } catch (e: any) {
      await updateJobDO(env, jobId, 'error', null, e.message);
      await writer.write(encoder.encode(`data: ${JSON.stringify({ event: 'error', error: e.message })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}

export async function searchProjectKB(slug: string, agent: string, q: string, env: any): Promise<any[]> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  try {
    const files = await api.listDir(`projects/${slug}/agents/${agent}/kb`);
    const results: any[] = [];
    
    for (const f of files) {
      if (f.name.endsWith('.md')) {
        const fileContent = await api.getFile(f.path);
        const text = fileContent.content;
        
        if (text.toLowerCase().includes(q.toLowerCase())) {
          // Simple chunk extract
          const idx = text.toLowerCase().indexOf(q.toLowerCase());
          const snippet = text.substring(Math.max(0, idx - 100), Math.min(text.length, idx + 200));
          results.push({
            filename: f.name,
            path: f.path,
            snippet: `...${snippet}...`
          });
        }
      }
    }
    return results;
  } catch (e) {
    return [];
  }
}

export async function uploadProjectKBDoc(slug: string, agent: string, filename: string, content: string, env: any): Promise<any> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  const path = `projects/${slug}/agents/${agent}/kb/${filename}`;
  
  let sha: string | undefined;
  try {
    const existing = await api.getFile(path);
    sha = existing.sha;
  } catch (e) {}

  await api.putFile(path, content, `docs(kb): upload ${filename} for agent ${agent} in ${slug}`, sha);
  return { saved: path, size: content.length };
}

export async function deleteProject(slug: string, env: any): Promise<boolean> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);
  
  const path = `projects/${slug}/config.json`;
  let sha: string | undefined;
  try {
    const existing = await api.getFile(path);
    sha = existing.sha;
    if (sha) {
      await api.deleteFile(path, `chore(projects): delete project ${slug}`, sha);
      return true;
    }
  } catch (e) {}
  return false;
}

