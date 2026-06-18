import { GitHubAPI } from './github';

export interface Article {
  slug: string;      // relative path without .md, e.g. "folder/article-name"
  title: string;     // from first # heading or filename
  folder: string;    // top-level folder, e.g. "docs" or "" for root
  summary: string;   // first 150 chars of body
  path?: string;
  sha?: string;
  content?: string;
}

const EXCLUDED_DIRS = [
  'node_modules/',
  'vendor/',
  'dist/',
  'build/',
  '.next/',
  '.nuxt/',
  '__pycache__/',
  '.git/',
];

// Scan the entire repository for all markdown files.
// No docsPath or project filter — works with any repo structure.
export async function collectArticles(gh: GitHubAPI): Promise<Article[]> {
  const files = await gh.listAllMd('');
  const mdFiles = files.filter(f =>
    !EXCLUDED_DIRS.some(ex => f.path.includes(ex)) &&
    !f.path.includes('/_') &&
    !f.path.endsWith('/_INDEX.md')
  );

  const articles: Article[] = [];
  for (const file of mdFiles) {
    const { content, sha } = await gh.getFile(file.path);
    const slug = file.path.replace(/\.md$/, '');
    const parts = slug.split('/');
    const folder = parts.length > 1 ? parts[0] : '';

    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : parts[parts.length - 1];

    const body = content.replace(/^---[\s\S]*?---\n/, '').trim();
    const summary = body.slice(0, 150);

    articles.push({ slug, title, folder, summary, path: file.path, sha, content });
  }
  return articles;
}
