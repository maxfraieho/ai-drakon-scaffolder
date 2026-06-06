import { GitHubAPI } from '../lib/github-api.js';

export async function listFiles(path: string = '.', env: any): Promise<any> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  try {
    const items = await api.listDir(path);
    const entries = items.map(item => ({
      path: item.path,
      type: item.type,
      size: item.size,
      readable: item.name.endsWith('.ts') || item.name.endsWith('.py') || item.name.endsWith('.js') || item.name.endsWith('.json') || item.name.endsWith('.md') || item.name.endsWith('.yml') || item.name.endsWith('.yaml')
    }));
    return { root: ghRepo, path, entries };
  } catch (e: any) {
    throw new Error(`Path not found or error: ${e.message}`);
  }
}

export async function readFile(path: string, maxChars: number = 8000, env: any): Promise<any> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  try {
    const file = await api.getFile(path);
    const content = file.content;
    const truncated = content.length > maxChars;
    return {
      path,
      content: content.substring(0, maxChars),
      size: content.length,
      truncated
    };
  } catch (e: any) {
    throw new Error(`File not found or error: ${e.message}`);
  }
}

export async function writeFile(path: string, content: string, env: any): Promise<any> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  let sha: string | undefined;
  try {
    const existing = await api.getFile(path);
    sha = existing.sha;
  } catch (e) {}

  const commitMsg = sha ? `chore(files): update ${path}` : `chore(files): create ${path}`;
  const result = await api.putFile(path, content, commitMsg, sha);
  return { path, written: content.length, ok: true, sha: result.sha };
}

export async function patchFile(path: string, oldString: string, newString: string, replaceAll: boolean = false, env: any): Promise<any> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  const file = await api.getFile(path);
  const content = file.content;

  if (!content.includes(oldString)) {
    throw new Error(`old_string not found in file: ${path}`);
  }

  let newContent = '';
  let count = 0;
  if (replaceAll) {
    count = content.split(oldString).length - 1;
    newContent = content.replaceAll(oldString, newString);
  } else {
    count = 1;
    newContent = content.replace(oldString, newString);
  }

  const result = await api.putFile(path, newContent, `chore(files): patch ${path}`, file.sha);
  return { path, replacements: count, ok: true, sha: result.sha };
}

export async function deleteFile(path: string, env: any): Promise<any> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);

  const file = await api.getFile(path);
  await api.deleteFile(path, `chore(files): delete ${path}`, file.sha);
  return { path, deleted: true, ok: true };
}
