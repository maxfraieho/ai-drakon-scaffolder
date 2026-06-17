import type { NoteListItem, NoteContent } from "./graphTypes";
import { api } from "@/lib/api";
import { getGithubConfig } from "@/lib/settings-storage";

// In-memory cache for GitHub notes to avoid redundant requests
const githubNoteCache = new Map<string, NoteContent>();

interface ProjectGithub {
  owner: string;
  repo: string;
  branch: string;
}

interface ProjectData {
  slug: string;
  name: string;
  github?: ProjectGithub;
}

function getActiveProjectGithub(): { owner: string; repo: string; branch: string; token: string } | null {
  if (typeof window === "undefined") return null;
  try {
    // ProjectContext stores the active project under a user-scoped key:
    //   ai_drakon_active_project_<userId>_data
    // Legacy (pre-TASK-222) unscoped key: ai_drakon_active_project_data
    // Scan all matching keys so we work regardless of the logged-in userId.
    const DATA_PREFIX = "ai_drakon_active_project_";
    const DATA_SUFFIX = "_data";

    const candidates: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DATA_PREFIX) && key.endsWith(DATA_SUFFIX) && !key.includes("anon")) {
        candidates.push(key);
      }
    }
    // Prefer user-scoped keys (longer) over the legacy unscoped key.
    candidates.sort((a, b) => b.length - a.length);
    if (!candidates.includes("ai_drakon_active_project_data")) {
      candidates.push("ai_drakon_active_project_data");
    }

    for (const key of candidates) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const project = JSON.parse(raw) as ProjectData;
      if (project.github?.owner && project.github?.repo) {
        const ghCfg = getGithubConfig();
        return {
          owner: project.github.owner,
          repo: project.github.repo,
          branch: project.github.branch || "main",
          token: ghCfg?.token || "",
        };
      }
    }
  } catch (e) {
    console.error("Error reading active project github config:", e);
  }
  return null;
}

async function fetchMarkdownFilesRecursive(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<{ path: string; name: string }[]> {
  try {
    const res = await api.githubListTree(owner, repo, path, branch, token);
    if (!res.success || !res.entries) return [];
    
    let files: { path: string; name: string }[] = [];
    const dirPromises: Promise<{ path: string; name: string }[]>[] = [];
    
    for (const entry of res.entries) {
      if (entry.type === "file" && entry.name.endsWith(".md")) {
        files.push({ path: entry.path, name: entry.name });
      } else if (entry.type === "dir") {
        dirPromises.push(fetchMarkdownFilesRecursive(owner, repo, entry.path, branch, token));
      }
    }
    
    if (dirPromises.length > 0) {
      const subDirsResults = await Promise.all(dirPromises);
      for (const subDirFiles of subDirsResults) {
        files = files.concat(subDirFiles);
      }
    }
    return files;
  } catch (e) {
    console.error(`Error listing tree recursively for path ${path}:`, e);
    return [];
  }
}

function buildTreeFromFiles(files: { path: string, slug: string, title: string }[]): TreeNode[] {
  const root: TreeNode[] = [];
  
  for (const file of files) {
    const relativePath = file.path.replace(/^docs\//, "");
    const parts = relativePath.split("/");
    
    let currentLevel = root;
    let accumulatedPath = "docs";
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulatedPath = `${accumulatedPath}/${part}`;
      const isLast = i === parts.length - 1;
      
      if (isLast) {
        currentLevel.push({
          type: 'note',
          name: part.replace(/\.md$/, ""),
          path: file.path,
          slug: file.slug,
          title: file.title,
        });
      } else {
        let folderNode = currentLevel.find(n => n.type === 'folder' && n.name === part);
        if (!folderNode) {
          folderNode = {
            type: 'folder',
            name: part,
            path: accumulatedPath,
            children: [],
          };
          currentLevel.push(folderNode);
        }
        currentLevel = folderNode.children!;
      }
    }
  }
  
  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return (a.name || "").localeCompare(b.name || "");
    });
    for (const node of nodes) {
      if (node.children) sortTree(node.children);
    }
  };
  sortTree(root);
  
  return root;
}

function workerUrl(): string {
  if (typeof window !== "undefined") {
    const v = localStorage.getItem("app_worker_url");
    if (v) return v.replace(/\/+$/, "");
  }
  return "https://drakon-antigravity-worker.maxfraieho.workers.dev";
}

function jwt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jwt");
}

function authHeaders(): Record<string, string> {
  const token = jwt();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchNotesList(project?: string): Promise<NoteListItem[]> {
  const gh = getActiveProjectGithub();
  if (gh) {
    const mdFiles = await fetchMarkdownFilesRecursive(gh.owner, gh.repo, "docs", gh.branch, gh.token);
    const notePromises = mdFiles.map(async (file) => {
      try {
        const slug = file.path.replace(/^docs\//, "").replace(/\.md$/, "");
        if (githubNoteCache.has(slug)) {
          const cached = githubNoteCache.get(slug)!;
          return {
            slug,
            path: file.path,
            sha: cached.sha,
            title: cached.title,
          };
        }
        const res = await api.githubGetFile(gh.owner, gh.repo, file.path, gh.branch, gh.token);
        if (res.success) {
          const parsed = parseFrontmatter(res.content);
          const noteContentObj: NoteContent = {
            slug,
            path: file.path,
            title: parsed.title || slug.split("/").pop() || slug,
            content: parsed.body,
            tags: parsed.tags || [],
            sha: res.sha,
          };
          githubNoteCache.set(slug, noteContentObj);
          return {
            slug,
            path: file.path,
            sha: res.sha,
            title: noteContentObj.title,
          };
        }
      } catch (e) {
        console.error("Error loading note frontmatter:", file.path, e);
      }
      const slug = file.path.replace(/^docs\//, "").replace(/\.md$/, "");
      return {
        slug,
        path: file.path,
        title: slug.split("/").pop() || slug,
      };
    });
    return (await Promise.all(notePromises)).filter(Boolean) as NoteListItem[];
  }

  const projectQs = project ? `?project=${encodeURIComponent(project)}` : "";
  const res = await fetch(`${workerUrl()}/v1/notes/list${projectQs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`notes/list HTTP ${res.status}`);
  const data = (await res.json()) as { notes?: NoteListItem[] };
  return data.notes ?? [];
}

export async function fetchNote(slug: string, project?: string): Promise<NoteContent | null> {
  const gh = getActiveProjectGithub();
  if (gh) {
    if (githubNoteCache.has(slug)) {
      return githubNoteCache.get(slug)!;
    }
    const path = `docs/${slug}.md`;
    try {
      const res = await api.githubGetFile(gh.owner, gh.repo, path, gh.branch, gh.token);
      if (res.success) {
        const parsed = parseFrontmatter(res.content);
        const noteContentObj: NoteContent = {
          slug,
          path,
          title: parsed.title || slug.split("/").pop() || slug,
          content: parsed.body,
          tags: parsed.tags || [],
          sha: res.sha,
        };
        githubNoteCache.set(slug, noteContentObj);
        return noteContentObj;
      }
    } catch (e) {
      console.error("Error fetching note from GitHub:", slug, e);
    }
    return null;
  }

  const projectQs = project ? `&project=${encodeURIComponent(project)}` : "";
  const res = await fetch(`${workerUrl()}/v1/notes/get?slug=${encodeURIComponent(slug)}${projectQs}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`notes/get HTTP ${res.status}`);
  const data = (await res.json()) as Partial<NoteContent> & { content?: string; raw?: string };
  const raw = data.content ?? data.raw ?? "";
  const parsed = parseFrontmatter(raw);
  return {
    slug,
    path: data.path ?? `docs/${slug}.md`,
    title: data.title ?? parsed.title ?? slug,
    content: parsed.body,
    tags: data.tags ?? parsed.tags,
    sha: data.sha,
  };
}

export async function fetchNoteContent(slug: string, project?: string): Promise<string> {
  const note = await fetchNote(slug, project);
  return note?.content ?? "";
}

export interface CommitNotePayload {
  slug: string;
  title: string;
  content: string;
  tags: string[];
  sha?: string;
  project?: string;
}

export async function commitNote(payload: CommitNotePayload): Promise<{ success: boolean; path?: string; sha?: string }> {
  const gh = getActiveProjectGithub();
  if (gh) {
    const filePath = `docs/${payload.slug}.md`;
    const markdown = buildMarkdown(payload);
    const message = `notes: update ${payload.slug}`;
    try {
      const res = await api.githubCommitFile(gh.owner, gh.repo, filePath, markdown, message, gh.branch, gh.token);
      if (res.success) {
        const updatedNote: NoteContent = {
          slug: payload.slug,
          path: filePath,
          title: payload.title,
          content: payload.content,
          tags: payload.tags,
          sha: res.commitSha || payload.sha,
        };
        githubNoteCache.set(payload.slug, updatedNote);
        return { success: true, path: filePath, sha: res.commitSha };
      }
    } catch (e) {
      console.error("Error committing note to GitHub:", payload.slug, e);
    }
    return { success: false };
  }

  const token = jwt();
  if (!token) throw new Error("Не авторизовано (JWT відсутній)");
  const body = {
    slug: payload.slug,
    path: `docs/${payload.slug}.md`,
    content: buildMarkdown(payload),
    sha: payload.sha,
    message: `notes: update ${payload.slug}`,
    project: payload.project,
  };
  const res = await fetch(`${workerUrl()}/v1/notes/commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`commit HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}

function buildMarkdown(p: CommitNotePayload): string {
  const fm = ["---", `title: ${JSON.stringify(p.title)}`, `tags: [${p.tags.map((t) => JSON.stringify(t)).join(", ")}]`, "---", ""].join("\n");
  return fm + "\n" + p.content.trimStart();
}

function parseFrontmatter(raw: string): { title?: string; tags: string[]; body: string } {
  if (!raw.startsWith("---")) return { tags: [], body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { tags: [], body: raw };
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, "");
  let title: string | undefined;
  let tags: string[] = [];
  for (const line of fm.split("\n")) {
    const tm = line.match(/^title:\s*(.*)$/);
    if (tm) {
      title = tm[1].replace(/^["']|["']$/g, "").trim();
      continue;
    }
    const tagsMatch = line.match(/^tags:\s*\[(.*)\]/);
    if (tagsMatch) {
      tags = tagsMatch[1]
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
  }
  return { title, tags, body };
}

export type { NoteListItem, NoteContent };

export interface TreeNode {
  type: 'folder' | 'note';
  name?: string;
  path: string;
  children?: TreeNode[];
  slug?: string;
  title?: string;
  size?: number;
}

export async function fetchNotesTree(project?: string): Promise<TreeNode[]> {
  const gh = getActiveProjectGithub();
  if (gh) {
    const list = await fetchNotesList(project);
    return buildTreeFromFiles(list.map(n => ({ path: n.path, slug: n.slug, title: n.title || n.slug })));
  }

  const projectQs = project ? `&project=${encodeURIComponent(project)}` : "";
  const res = await fetch(`${workerUrl()}/v1/notes/list?flat=false${projectQs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`notes/tree HTTP ${res.status}`);
  const data = (await res.json()) as { tree?: TreeNode[] };
  return data.tree ?? [];
}

export async function deleteNote(slug: string, project?: string): Promise<void> {
  const gh = getActiveProjectGithub();
  if (gh) {
    const filePath = `docs/${slug}.md`;
    try {
      const res = await api.githubDeleteFile(gh.owner, gh.repo, filePath, gh.branch, gh.token);
      if (!res.success) {
        throw new Error(res.error || "Не вдалося видалити файл з GitHub");
      }
      githubNoteCache.delete(slug);
      return;
    } catch (e) {
      console.error("Error deleting note from GitHub:", slug, e);
      throw e;
    }
  }

  const token = jwt();
  if (!token) throw new Error("Не авторизовано (JWT відсутній)");
  const res = await fetch(`${workerUrl()}/v1/notes/delete`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ slug, project }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`delete HTTP ${res.status}: ${txt}`);
  }
}

export async function fetchNotesGraph(project?: string): Promise<{
  nodes: Array<{ slug: string; title: string; exists: boolean }>;
  edges: Array<{ source: string; target: string; type: string }>;
  stats: { notes: number; links: number };
}> {
  const gh = getActiveProjectGithub();
  if (gh) {
    const list = await fetchNotesList(project);
    const nodes = list.map(n => ({ slug: n.slug, title: n.title || n.slug, exists: true }));
    // Build structural edges client-side (folder topology)
    const byFolder = new Map<string, string[]>();
    for (const n of list) {
      const f = getRootFolder(n.slug);
      if (!byFolder.has(f)) byFolder.set(f, []);
      byFolder.get(f)!.push(n.slug);
    }
    const edges: { source: string; target: string; type: string }[] = [];
    for (const [, slugs] of byFolder) {
      if (slugs.length < 2) continue;
      for (let i = 1; i < slugs.length; i++) {
        edges.push({ source: slugs[0], target: slugs[i], type: "structural" });
      }
    }
    return {
      nodes,
      edges,
      stats: { notes: nodes.length, links: edges.length }
    };
  }

  const projectQs = project ? `?project=${encodeURIComponent(project)}` : "";
  const res = await fetch(`${workerUrl()}/v1/notes/graph${projectQs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Graph: ${res.status} ${res.statusText}`);
  return res.json() as Promise<{
    nodes: Array<{ slug: string; title: string; exists: boolean }>;
    edges: Array<{ source: string; target: string; type: string }>;
    stats: { notes: number; links: number };
  }>;
}

function getRootFolder(slug: string): string {
  const idx = slug.indexOf("/");
  return idx === -1 ? "_root" : slug.slice(0, idx);
}

export interface SemanticGraphBuildResponse {
  success: boolean;
  model: string;
  proposed: Array<{ slug: string; before: string; after: string }>;
  stats: { notes: number; links: number };
  git_status?: string;
}

export async function buildSemanticGraph(
  project?: string,
  apply = false,
  model?: string
): Promise<SemanticGraphBuildResponse> {
  const gh = getActiveProjectGithub();

  const token = jwt();
  if (!token) throw new Error("Не авторизовано (JWT відсутній)");

  const params = new URLSearchParams();
  if (project) params.set("project", project);
  params.set("apply", String(apply));
  if (model) params.set("model", model);
  // Pass GitHub project info so the Appwrite function can fetch files
  if (gh) {
    params.set("github_owner", gh.owner);
    params.set("github_repo", gh.repo);
    params.set("github_branch", gh.branch);
    if (gh.token) params.set("github_token", gh.token);
  }

  const res = await fetch(`${workerUrl()}/v1/notes/build-semantic-graph?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`build-semantic-graph HTTP ${res.status}: ${txt}`);
  }
  return res.json() as Promise<SemanticGraphBuildResponse>;
}

