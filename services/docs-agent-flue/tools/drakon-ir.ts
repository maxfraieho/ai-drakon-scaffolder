import { Type, defineTool } from '@flue/runtime';
import { GitHubAPI } from '../lib/github-api.js';

export const drakonIr = defineTool({
  name: 'drakon_ir',
  description: 'Manage DRAKON IR diagrams stored in the GitHub repository.',
  parameters: Type.Object({
    operation: Type.Union([
      Type.Literal('list'),
      Type.Literal('get')
    ], { description: 'Operation to perform' }),
    name: Type.Optional(Type.String({ description: 'Diagram name without .json suffix' }))
  }),
  execute: async ({ operation, name }, toolContext: any) => {
    const token = toolContext?.env?.GITHUB_TOKEN || (typeof process !== 'undefined' ? process.env.GITHUB_TOKEN : '') || '';
    const repo = toolContext?.env?.GITHUB_REPO || (typeof process !== 'undefined' ? process.env.GITHUB_REPO : '') || 'maxfraieho/ai-drakon-scaffolder';
    const branch = toolContext?.env?.GITHUB_BRANCH || (typeof process !== 'undefined' ? process.env.GITHUB_BRANCH : '') || 'main';
    const docsPath = toolContext?.env?.DOCS_PATH || (typeof process !== 'undefined' ? process.env.DOCS_PATH : 'docs');
    
    const gh = new GitHubAPI(token, repo, branch);
    const irDir = `${docsPath}/drakon-ir`;
    
    try {
      if (operation === 'list') {
        let entries: any[] = [];
        try {
          entries = await gh.listDir(irDir);
        } catch (e) {
          // If directory doesn't exist, return empty array (same behavior as old Python API)
          return JSON.stringify({ success: true, diagrams: [], folder: irDir }, null, 2);
        }
        
        const diagrams = entries
          .filter(e => e.type === 'file' && e.name.endsWith('.json'))
          .map(e => e.name.replace(/\.json$/, ''))
          .sort();
          
        return JSON.stringify({
          success: true,
          diagrams,
          count: diagrams.length
        }, null, 2);
      }
      
      if (operation === 'get') {
        if (!name) {
          throw new Error('name is required for get operation');
        }
        
        const cleanName = name.replace(/\.\./g, '').replace(/\//g, '').replace(/\\/g, '');
        const filePath = `${irDir}/${cleanName}.json`;
        
        const { content } = await gh.getFile(filePath);
        const diagram = JSON.parse(content);
        
        return JSON.stringify({
          success: true,
          name: cleanName,
          diagram
        }, null, 2);
      }
      
      throw new Error(`Unsupported operation: ${operation}`);
    } catch (e: any) {
      return JSON.stringify({ success: false, error: e.message }, null, 2);
    }
  }
});
