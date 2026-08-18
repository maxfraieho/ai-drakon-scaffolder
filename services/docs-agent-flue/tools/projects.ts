import { Type, defineTool } from '@flue/runtime';

const KV_KEY = 'PROJECTS_CONFIG';

const FALLBACK_PROJECTS = [
  {
    slug: 'sharon-global',
    name: 'Sharon Global',
    path: 'sharon-global',
    description: 'AI-система моніторингу повітряних загроз',
    hasDrakonIr: true,
    hasDocs: true,
    github: { owner: 'maxfraieho', repo: 'sharon-global', branch: 'main' },
  },
  {
    slug: 'uav-watcher',
    name: 'UAV Watcher',
    path: 'uav-watcher',
    description: 'Telegram-бот моніторингу БПЛА',
    hasDrakonIr: true,
    hasDocs: true,
    github: { owner: 'maxfraieho', repo: 'uav-watcher', branch: 'master' },
  },
  {
    slug: 'code-proxy',
    name: 'Code Proxy',
    path: 'code-proxy',
    description: 'LM streaming proxy для агентів',
    hasDrakonIr: false,
    hasDocs: false,
    github: { owner: 'maxfraieho', repo: 'code-proxy', branch: 'main' },
  },
  {
    slug: 'ai-drakon-setup',
    name: 'AI-DRAKON Platform',
    path: 'ai-drakon-setup',
    description: 'DRAKON editor + agent pipeline UI',
    hasDrakonIr: false,
    hasDocs: true,
    github: { owner: 'maxfraieho', repo: 'ai-drakon-setup', branch: 'main' },
  },
];

async function loadProjects(kv: any): Promise<any[]> {
  if (!kv) return FALLBACK_PROJECTS;
  try {
    const val = await kv.get(KV_KEY);
    if (val) {
      const parsed = JSON.parse(val);
      return parsed.projects || FALLBACK_PROJECTS;
    }
  } catch (e) {}
  return FALLBACK_PROJECTS;
}

async function saveProjects(kv: any, projects: any[]): Promise<void> {
  if (!kv) return;
  await kv.put(KV_KEY, JSON.stringify({ projects }));
}

export const projectsTool = defineTool({
  name: 'projects',
  description: 'Manage projects registry using KV storage.',
  parameters: Type.Object({
    operation: Type.Union([
      Type.Literal('list'),
      Type.Literal('add'),
      Type.Literal('delete')
    ], { description: 'Operation to perform' }),
    slug: Type.Optional(Type.String({ description: 'Slug of the project' })),
    name: Type.Optional(Type.String({ description: 'Name of the project (for add)' })),
    path: Type.Optional(Type.String({ description: 'Local path on dev server (for add)' })),
    description: Type.Optional(Type.String({ description: 'Description (for add)' })),
    hasDrakonIr: Type.Optional(Type.Boolean({ description: 'Has DRAKON IR (for add)' })),
    hasDocs: Type.Optional(Type.Boolean({ description: 'Has Docs (for add)' })),
    github: Type.Optional(Type.Object({
      owner: Type.String(),
      repo: Type.String(),
      branch: Type.String()
    }, { description: 'GitHub repo details (for add)' }))
  }),
  execute: async ({ operation, slug, name, path, description = '', hasDrakonIr = false, hasDocs = false, github }, toolContext: any) => {
    const kv = toolContext?.env?.KNOWLEDGE_BASE;
    
    try {
      if (operation === 'list') {
        const projects = await loadProjects(kv);
        const result = projects.map(p => ({
          ...p,
          exists: true // Always mock as true in CF Workers environment
        }));
        return JSON.stringify({ success: true, projects: result }, null, 2);
      }
      
      if (operation === 'add') {
        if (!slug || !name || !path) {
          throw new Error('slug, name, and path are required for add operation');
        }
        
        const projects = await loadProjects(kv);
        if (projects.some(p => p.slug === slug)) {
          throw new Error(`Project slug already exists: ${slug}`);
        }
        
        const entry: any = {
          slug,
          name,
          path,
          description,
          hasDrakonIr,
          hasDocs
        };
        if (github) {
          entry.github = github;
        }
        
        projects.push(entry);
        await saveProjects(kv, projects);
        return JSON.stringify({ success: true, project: entry }, null, 2);
      }
      
      if (operation === 'delete') {
        if (!slug) {
          throw new Error('slug is required for delete operation');
        }
        
        const projects = await loadProjects(kv);
        const updated = projects.filter(p => p.slug !== slug);
        if (updated.length === projects.length) {
          throw new Error(`Project not found: ${slug}`);
        }
        
        await saveProjects(kv, updated);
        return JSON.stringify({ success: true, deleted: slug }, null, 2);
      }
      
      throw new Error(`Unsupported operation: ${operation}`);
    } catch (e: any) {
      return JSON.stringify({ success: false, error: e.message }, null, 2);
    }
  }
});
