import { Type, defineTool } from '@flue/runtime';
import { GitHubAPI } from '../lib/github-api.js';
import { parseFrontmatter, buildFrontmatter, stripFrontmatter } from '../lib/frontmatter.js';
import { parseWikilinks, restructureWikiGraph, getSlugFromPath, pathFromSlug } from '../lib/wikilinks.js';

function extractTitle(content: string, defaultTitle: string): string {
  const { frontmatter } = parseFrontmatter(content);
  if (frontmatter && frontmatter.title) {
    return String(frontmatter.title);
  }
  const match = content.match(/^#\s+(.+)$/m);
  if (match && match[1]) {
    return match[1].trim();
  }
  return defaultTitle;
}

function buildFolderTree(notes: { path: string; slug: string; title: string; size: number }[], basePath: string): any[] {
  const rootItems: any[] = [];
  const folderMap = new Map<string, any>();
  const cleanBase = basePath.replace(/^\//, '').replace(/\/$/, '');
  
  for (const note of notes) {
    const relPath = cleanBase && note.path.startsWith(cleanBase + '/') 
      ? note.path.slice(cleanBase.length + 1) 
      : note.path;
    const parts = relPath.split('/');
    
    let currentChildren = rootItems;
    let currentPath = '';
    
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      
      let folder = folderMap.get(currentPath);
      if (!folder) {
        folder = {
          type: 'folder',
          name: folderName,
          path: currentPath,
          children: []
        };
        folderMap.set(currentPath, folder);
        currentChildren.push(folder);
      }
      currentChildren = folder.children;
    }
    
    currentChildren.push({
      type: 'note',
      slug: note.slug,
      title: note.title,
      path: relPath,
      size: note.size
    });
  }
  
  function sortChildren(items: any[]) {
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      const nameA = a.type === 'folder' ? a.name : a.title;
      const nameB = b.type === 'folder' ? b.name : b.title;
      return nameA.localeCompare(nameB);
    });
    
    for (const item of items) {
      if (item.type === 'folder') {
        sortChildren(item.children);
      }
    }
  }
  
  sortChildren(rootItems);
  return rootItems;
}

export const notesCrud = defineTool({
  name: 'notes_crud',
  description: 'Manage markdown notes (CRUD + graph + Zettelkasten restructuring) using the GitHub API.',
  parameters: Type.Object({
    operation: Type.Union([
      Type.Literal('list'),
      Type.Literal('read'),
      Type.Literal('write'),
      Type.Literal('delete'),
      Type.Literal('restructure'),
      Type.Literal('graph')
    ], { description: 'Operation to perform' }),
    slug: Type.Optional(Type.String({ description: 'Slug of the note (e.g. concept/vision)' })),
    title: Type.Optional(Type.String({ description: 'Title of the note (for write)' })),
    content: Type.Optional(Type.String({ description: 'Content of the note (for write)' })),
    tags: Type.Optional(Type.Array(Type.String(), { description: 'Tags for the note (for write)' })),
    project: Type.Optional(Type.String({ description: 'Project slug (for list/graph)' })),
    flat: Type.Optional(Type.Boolean({ description: 'Flat list instead of folder tree (default true, for list)' }))
  }),
  execute: async ({ operation, slug, title, content, tags = [], project, flat = true }, toolContext: any) => {
    const token = toolContext?.env?.GITHUB_TOKEN || (typeof process !== 'undefined' ? process.env.GITHUB_TOKEN : '') || '';
    const repo = toolContext?.env?.GITHUB_REPO || (typeof process !== 'undefined' ? process.env.GITHUB_REPO : '') || 'maxfraieho/ai-drakon-scaffolder';
    const branch = toolContext?.env?.GITHUB_BRANCH || (typeof process !== 'undefined' ? process.env.GITHUB_BRANCH : '') || 'main';
    const docsPath = toolContext?.env?.DOCS_PATH || (typeof process !== 'undefined' ? process.env.DOCS_PATH : 'docs');
    
    const gh = new GitHubAPI(token, repo, branch);
    const basePath = project ? `${docsPath}/${project}` : docsPath;
    
    try {
      if (operation === 'list') {
        const mdFiles = await gh.listAllMd(basePath);
        
        // Fetch contents in parallel to extract titles
        const notes = await Promise.all(
          mdFiles.map(async file => {
            try {
              const { content: fileContent } = await gh.getFile(file.path);
              const noteTitle = extractTitle(fileContent, file.name.replace('.md', ''));
              
              const parts = file.path.split('/');
              parts.pop(); // Remove filename
              const folderPath = parts.join('/');
              const folderRel = folderPath.startsWith(basePath) 
                ? folderPath.slice(basePath.length).replace(/^\//, '') 
                : folderPath;
                
              return {
                slug: getSlugFromPath(file.path, docsPath),
                title: noteTitle,
                path: file.path.startsWith(docsPath + '/') ? file.path.slice(docsPath.length + 1) : file.path,
                folder: folderRel,
                sha: file.sha,
                size: file.size
              };
            } catch (err) {
              return {
                slug: getSlugFromPath(file.path, docsPath),
                title: file.name.replace('.md', ''),
                path: file.path,
                folder: '',
                sha: file.sha,
                size: file.size
              };
            }
          })
        );
        
        if (flat) {
          return JSON.stringify({
            success: true,
            notes: notes.map(n => ({
              slug: n.slug,
              title: n.title,
              path: n.path,
              folder: n.folder,
              sha: n.sha
            }))
          }, null, 2);
        } else {
          return JSON.stringify({
            success: true,
            tree: buildFolderTree(notes, docsPath)
          }, null, 2);
        }
      }
      
      if (operation === 'read') {
        if (!slug) throw new Error('slug is required for read operation');
        const filePath = pathFromSlug(slug, docsPath);
        const { content: fileContent, sha } = await gh.getFile(filePath);
        return JSON.stringify({
          success: true,
          slug,
          content: stripFrontmatter(fileContent),
          raw: fileContent,
          sha
        }, null, 2);
      }
      
      if (operation === 'write') {
        if (!slug) throw new Error('slug is required for write operation');
        if (!title) throw new Error('title is required for write operation');
        if (content === undefined) throw new Error('content is required for write operation');
        
        const dateStr = new Date().toISOString().split('T')[0];
        const fm = {
          title,
          tags,
          updated: dateStr
        };
        const newRawContent = buildFrontmatter(fm) + content;
        const targetPath = pathFromSlug(slug, docsPath);
        
        // 1. Fetch all existing md files under docs/ to restructure
        const mdFiles = await gh.listAllMd(docsPath);
        
        // 2. Fetch contents
        const filesWithContent = await Promise.all(
          mdFiles.map(async file => {
            try {
              const { content: fileContent } = await gh.getFile(file.path);
              return { path: file.path, content: fileContent, sha: file.sha };
            } catch (err) {
              return { path: file.path, content: '', sha: file.sha };
            }
          })
        );
        
        // 3. Find if target file already exists in our list
        const existingIndex = filesWithContent.findIndex(f => f.path === targetPath);
        if (existingIndex !== -1) {
          filesWithContent[existingIndex].content = newRawContent;
        } else {
          filesWithContent.push({ path: targetPath, content: newRawContent, sha: '' });
        }
        
        // 4. Run Zettelkasten restructuring
        const restructureResults = restructureWikiGraph(filesWithContent, docsPath);
        
        // 5. Commit all changed files back to GitHub!
        let targetSha: string | undefined = undefined;
        let mainCommitSha = '';
        
        for (const fileResult of restructureResults) {
          const original = filesWithContent.find(f => f.path === fileResult.path);
          if (fileResult.changed || fileResult.path === targetPath) {
            const commitMsg = fileResult.path === targetPath 
              ? `docs: update ${slug}` 
              : `chore(graph): self-balancing Zettelkasten restructuring for ${fileResult.path}`;
              
            const putRes = await gh.putFile(
              fileResult.path,
              fileResult.content,
              commitMsg,
              original?.sha || undefined
            );
            
            if (fileResult.path === targetPath) {
              targetSha = putRes.content.sha;
              mainCommitSha = putRes.sha;
            }
          }
        }
        
        return JSON.stringify({
          success: true,
          slug,
          path: targetPath,
          sha: targetSha,
          commitSha: mainCommitSha
        }, null, 2);
      }
      
      if (operation === 'delete') {
        if (!slug) throw new Error('slug is required for delete operation');
        const targetPath = pathFromSlug(slug, docsPath);
        
        // Find existing file to get its sha
        const mdFiles = await gh.listAllMd(docsPath);
        const file = mdFiles.find(f => f.path === targetPath);
        if (!file) {
          throw new Error(`Note not found: ${slug}`);
        }
        
        await gh.deleteFile(targetPath, `docs: delete ${slug}`, file.sha);
        return JSON.stringify({
          success: true,
          slug,
          git_ok: true
        }, null, 2);
      }
      
      if (operation === 'restructure') {
        // Fetch all files
        const mdFiles = await gh.listAllMd(docsPath);
        const filesWithContent = await Promise.all(
          mdFiles.map(async file => {
            const { content: fileContent } = await gh.getFile(file.path);
            return { path: file.path, content: fileContent, sha: file.sha };
          })
        );
        
        const restructureResults = restructureWikiGraph(filesWithContent, docsPath);
        let updatedCount = 0;
        
        for (const fileResult of restructureResults) {
          if (fileResult.changed) {
            const original = filesWithContent.find(f => f.path === fileResult.path);
            await gh.putFile(
              fileResult.path,
              fileResult.content,
              'chore(graph): self-balancing Zettelkasten restructuring',
              original?.sha || undefined
            );
            updatedCount++;
          }
        }
        
        return JSON.stringify({
          success: true,
          git_status: updatedCount > 0 ? `updated ${updatedCount} files` : 'no structural changes needed'
        }, null, 2);
      }
      
      if (operation === 'graph') {
        const mdFiles = await gh.listAllMd(basePath);
        
        // Fetch contents
        const notes = await Promise.all(
          mdFiles.map(async file => {
            const { content: fileContent } = await gh.getFile(file.path);
            const noteTitle = extractTitle(fileContent, file.name.replace('.md', ''));
            return {
              slug: getSlugFromPath(file.path, docsPath),
              title: noteTitle,
              content: fileContent
            };
          })
        );
        
        const slugSet = new Set(notes.map(n => n.slug));
        const nodes = notes.map(n => ({
          slug: n.slug,
          title: n.title,
          exists: true
        }));
        
        const edges: any[] = [];
        for (const note of notes) {
          const body = stripFrontmatter(note.content);
          const links = parseWikilinks(body);
          for (const target of links) {
            const targetSlug = target.trim().toLowerCase().replace(/\s+/g, '-');
            let matched: string | null = null;
            if (slugSet.has(target)) {
              matched = target;
            } else if (slugSet.has(targetSlug)) {
              matched = targetSlug;
            } else {
              // Partial match
              for (const s of slugSet) {
                const lastPart = s.split('/').pop();
                if (lastPart === target || lastPart === targetSlug) {
                  matched = s;
                  break;
                }
              }
            }
            
            if (matched && matched !== note.slug) {
              edges.push({
                source: note.slug,
                target: matched,
                type: 'navigational'
              });
            }
          }
        }
        
        // Deduplicate edges
        const seen = new Set<string>();
        const uniqueEdges = [];
        for (const e of edges) {
          const key = `${e.source}->${e.target}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueEdges.push(e);
          }
        }
        
        return JSON.stringify({
          success: true,
          nodes,
          edges: uniqueEdges,
          stats: {
            notes: nodes.length,
            links: uniqueEdges.length
          }
        }, null, 2);
      }
      
      throw new Error(`Unsupported operation: ${operation}`);
    } catch (e: any) {
      return JSON.stringify({
        success: false,
        error: e.message
      }, null, 2);
    }
  }
});
