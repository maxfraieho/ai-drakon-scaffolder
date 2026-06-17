import { GitHubAPI } from './github';

export interface Article {
  slug: string;      // relative path without .md, e.g. "folder/article-name"
  title: string;     // from first # heading or filename
  folder: string;    // subfolder, e.g. "folder" or "" for root
  summary: string;   // first 600 chars of body
  path?: string;
  sha?: string;
  content?: string;
}

export async function collectArticles(gh: GitHubAPI, docsPath: string, project?: string): Promise<Article[]> {
  const root = project ? `${docsPath}/${project}` : docsPath;
  const files = await gh.listTree(root);
  const mdFiles = files.filter(f => f.path.endsWith('.md') && !f.path.includes('/_') && !f.path.endsWith('/_INDEX.md'));

  const articles: Article[] = [];
  for (const file of mdFiles) {
    const { content, sha } = await gh.getFile(file.path);
    const relPath = file.path.replace(`${root}/`, '');
    const slug = relPath.replace(/\.md$/, '');
    const folder = slug.includes('/') ? slug.split('/')[0] : '';

    // Extract title from first # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : slug;

    // Summary: first 600 chars of content after stripping frontmatter
    const body = content.replace(/^---[\s\S]*?---\n/, '').trim();
    const summary = body.slice(0, 600);

    articles.push({ slug, title, folder, summary, path: file.path, sha, content });
  }
  return articles;
}
