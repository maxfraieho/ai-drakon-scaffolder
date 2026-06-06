import { Type, defineTool } from '@flue/runtime';
import { GitHubAPI } from '../lib/github-api.js';

export const docsFs = defineTool({
  name: 'docs_fs',
  description: 'Read files or list directories from the project GitHub repository.',
  parameters: Type.Object({
    operation: Type.Union([Type.Literal('list'), Type.Literal('read')], { description: 'Operation to perform' }),
    path: Type.String({ description: 'Path relative to the project root' }),
    maxChars: Type.Optional(Type.Number({ description: 'Max characters to read (default 8000)' }))
  }),
  execute: async ({ operation, path, maxChars = 8000 }, toolContext: any) => {
    const token = toolContext?.env?.GITHUB_TOKEN || (typeof process !== 'undefined' ? process.env.GITHUB_TOKEN : '') || '';
    const repo = toolContext?.env?.GITHUB_REPO || (typeof process !== 'undefined' ? process.env.GITHUB_REPO : '') || 'maxfraieho/ai-drakon-scaffolder';
    const branch = toolContext?.env?.GITHUB_BRANCH || (typeof process !== 'undefined' ? process.env.GITHUB_BRANCH : '') || 'main';
    
    const gh = new GitHubAPI(token, repo, branch);
    
    try {
      if (operation === 'list') {
        const entries = await gh.listDir(path);
        const formattedEntries = entries.map(e => {
          const entry: any = {
            path: e.path,
            type: e.type,
          };
          if (e.type === 'file') {
            entry.size = e.size;
            const parts = e.name.split('.');
            const suffix = parts.length > 1 ? '.' + parts.pop() : '';
            const textExts = new Set(['.md', '.txt', '.rst', '.pdf', '.json', '.yml', '.yaml']);
            entry.readable = textExts.has(suffix.toLowerCase());
          }
          return entry;
        });
        
        return JSON.stringify({
          success: true,
          root: repo,
          path,
          entries: formattedEntries
        }, null, 2);
      } else {
        const { content, sha } = await gh.getFile(path);
        const truncated = content.length > maxChars;
        return JSON.stringify({
          success: true,
          path,
          content: content.slice(0, maxChars),
          size: content.length,
          truncated,
          sha
        }, null, 2);
      }
    } catch (e: any) {
      return JSON.stringify({
        success: false,
        error: e.message
      }, null, 2);
    }
  }
});
