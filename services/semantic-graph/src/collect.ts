import { GitHubAPI } from './github';

export interface Article {
  slug: string;
  title: string;
  folder: string;
  summary: string;
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

const MAX_FETCH = 150;

// Priority order: docs/ > README > top-level > deep-nested
function pathPriority(path: string): number {
  const lower = path.toLowerCase();
  if (lower.startsWith('docs/')) return 0;
  if (lower === 'readme.md') return 1;
  if (!path.includes('/')) return 2;
  const depth = path.split('/').length;
  return depth + 2;
}

export async function collectArticles(gh: GitHubAPI): Promise<Article[]> {
  // One API call to get all .md paths
  const allFiles = await gh.listAllMd('');
  const mdFiles = allFiles.filter(f =>
    !EXCLUDED_DIRS.some(ex => f.path.includes(ex)) &&
    !f.path.includes('/_') &&
    !f.path.endsWith('/_INDEX.md')
  );

  // Sort by priority and take only top MAX_FETCH before fetching content
  const prioritised = mdFiles
    .sort((a, b) => pathPriority(a.path) - pathPriority(b.path))
    .slice(0, MAX_FETCH);

  const articles: Article[] = [];
  for (const file of prioritised) {
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
