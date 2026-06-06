import { Type, defineTool } from '@flue/runtime';
import { GitHubAPI } from '../lib/github-api.js';
import { parseFrontmatter } from '../lib/frontmatter.js';

interface DqlResult {
  op: 'LIST' | 'TABLE' | null;
  fields: string[];
  source: string | null;
  where: string | null;
  sort: string | null;
  order: 'ASC' | 'DESC';
  limit: number | null;
}

export function parseDQL(query: string): DqlResult {
  const q = query.trim();
  const result: DqlResult = {
    op: null,
    fields: [],
    source: null,
    where: null,
    sort: null,
    order: 'ASC',
    limit: null
  };

  const upper = q.toUpperCase();
  let rest = '';
  if (upper.startsWith('LIST')) {
    result.op = 'LIST';
    rest = q.slice(4).trim();
  } else if (upper.startsWith('TABLE')) {
    result.op = 'TABLE';
    rest = q.slice(5).trim();
  } else {
    return result;
  }

  const limitMatch = rest.match(/\bLIMIT\s+(\d+)\s*$/i);
  if (limitMatch) {
    result.limit = parseInt(limitMatch[1], 10);
    rest = rest.slice(0, limitMatch.index).trim();
  }

  const sortMatch = rest.match(/\bSORT\s+(\S+)(?:\s+(ASC|DESC))?\s*$/i);
  if (sortMatch) {
    result.sort = sortMatch[1].toLowerCase();
    result.order = (sortMatch[2] || 'ASC').toUpperCase() as 'ASC' | 'DESC';
    rest = rest.slice(0, sortMatch.index).trim();
  }

  const whereMatch = rest.match(/\bWHERE\s+([\s\S]+)$/i);
  if (whereMatch) {
    result.where = whereMatch[1].trim();
    rest = rest.slice(0, whereMatch.index).trim();
  }

  const fromMatch = rest.match(/\bFROM\s+([\s\S]+)$/i);
  if (fromMatch) {
    result.source = fromMatch[1].trim().replace(/^['"]|['"]$/g, '');
    rest = rest.slice(0, fromMatch.index).trim();
  }

  if (rest) {
    result.fields = rest.split(',').map(f => f.trim()).filter(Boolean);
  }

  return result;
}

const COND_RE = /(\S+)\s*(!=|=)\s*"([^"]*)"/i;

function applyWhere(rows: any[], clause: string): any[] {
  const match = clause.trim().match(COND_RE);
  if (!match) return rows;
  const [, field, op, value] = match;
  if (op === '=') {
    return rows.filter(r => String(r[field] || '') === value);
  }
  if (op === '!=') {
    return rows.filter(r => String(r[field] || '') !== value);
  }
  return rows;
}

async function scanDocs(gh: GitHubAPI, source: string, docsPath: string): Promise<any[]> {
  let mdFiles: any[] = [];
  
  if (source.startsWith('#')) {
    const tag = source.slice(1);
    mdFiles = await gh.listAllMd(docsPath);
    
    const results: any[] = [];
    await Promise.all(
      mdFiles.map(async file => {
        try {
          const { content } = await gh.getFile(file.path);
          const { frontmatter } = parseFrontmatter(content);
          if (!frontmatter) return;
          
          let tags = frontmatter.tags || [];
          if (typeof tags === 'string') {
            tags = tags.split(',').map((t: string) => t.trim());
          }
          if (Array.isArray(tags) && tags.includes(tag)) {
            frontmatter['file.name'] = file.name.replace(/\.md$/, '');
            frontmatter['file.path'] = file.path;
            results.push(frontmatter);
          }
        } catch (e) {}
      })
    );
    return results;
  }
  
  const cleanSource = source.replace(/^\//, '');
  try {
    mdFiles = await gh.listAllMd(cleanSource);
  } catch (e) {
    try {
      const parts = cleanSource.split('/');
      const name = parts.pop() || '';
      mdFiles = [{ name, path: cleanSource, size: 0, type: 'file' }];
    } catch (err) {
      return [];
    }
  }

  const results: any[] = [];
  await Promise.all(
    mdFiles.map(async file => {
      try {
        const { content } = await gh.getFile(file.path);
        const { frontmatter } = parseFrontmatter(content);
        if (frontmatter) {
          frontmatter['file.name'] = file.name.replace(/\.md$/, '');
          frontmatter['file.path'] = file.path;
          results.push(frontmatter);
        }
      } catch (e) {}
    })
  );
  
  return results;
}

export const dataviewTool = defineTool({
  name: 'dataview',
  description: 'Execute Obsidian Dataview Query Language (DQL) query against YAML frontmatter.',
  parameters: Type.Object({
    query: Type.String({ description: 'The DQL query string (e.g. LIST FROM "docs" WHERE tags = "concept")' })
  }),
  execute: async ({ query }, toolContext: any) => {
    const token = toolContext?.env?.GITHUB_TOKEN || (typeof process !== 'undefined' ? process.env.GITHUB_TOKEN : '') || '';
    const repo = toolContext?.env?.GITHUB_REPO || (typeof process !== 'undefined' ? process.env.GITHUB_REPO : '') || 'maxfraieho/ai-drakon-scaffolder';
    const branch = toolContext?.env?.GITHUB_BRANCH || (typeof process !== 'undefined' ? process.env.GITHUB_BRANCH : '') || 'main';
    const docsPath = toolContext?.env?.DOCS_PATH || (typeof process !== 'undefined' ? process.env.DOCS_PATH : 'docs');
    
    const gh = new GitHubAPI(token, repo, branch);
    
    try {
      const parsed = parseDQL(query);
      if (!parsed.op) {
        throw new Error(`Cannot parse DQL: ${query}`);
      }
      if (!parsed.source) {
        throw new Error('FROM clause is required');
      }
      
      let rows = await scanDocs(gh, parsed.source, docsPath);
      
      if (parsed.where) {
        rows = applyWhere(rows, parsed.where);
      }
      
      if (parsed.sort) {
        const sortField = parsed.sort;
        const reverse = parsed.order === 'DESC';
        rows.sort((a, b) => {
          const valA = String(a[sortField] || '');
          const valB = String(b[sortField] || '');
          return reverse ? valB.localeCompare(valA) : valA.localeCompare(valB);
        });
      }
      
      if (parsed.limit !== null) {
        rows = rows.slice(0, parsed.limit);
      }
      
      if (parsed.op === 'TABLE' && parsed.fields.length > 0) {
        const cols = parsed.fields;
        const resultRows = rows.map(row => {
          const resRow: Record<string, any> = {};
          for (const col of cols) {
            resRow[col] = row[col] !== undefined ? row[col] : null;
          }
          return resRow;
        });
        
        return JSON.stringify({
          type: 'TABLE',
          fields: cols,
          rows: resultRows,
          count: resultRows.length
        }, null, 2);
      }
      
      const resultRows = rows.map(r => ({
        path: r['file.path'] || '',
        title: r.title || r['file.name'] || ''
      }));
      
      return JSON.stringify({
        type: 'LIST',
        rows: resultRows,
        count: resultRows.length
      }, null, 2);
    } catch (e: any) {
      return JSON.stringify({ error: e.message }, null, 2);
    }
  }
});
