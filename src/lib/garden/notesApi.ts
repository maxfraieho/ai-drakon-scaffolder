import type { NoteListItem, NoteContent } from "./graphTypes";

function workerUrl(): string {
if (typeof window !== "undefined") {
const v = localStorage.getItem("app_worker_url");
if (v) return v.replace(/\/+$/, "");
}
return "https://drakon-mcp-worker.maxfraieho.workers.dev";
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
const projectQs = project ? `?project=${encodeURIComponent(project)}` : "";
const res = await fetch( `${workerUrl()}/v1/notes/list${projectQs}`, { headers: authHeaders() });
if (!res.ok) throw new Error(`notes/list HTTP ${res.status}`);
const data = (await res.json()) as { notes?: NoteListItem[] };
return data.notes ?? [];
}

export async function fetchNote(slug: string, project?: string): Promise<NoteContent | null> {
const projectQs = project ? `&project=${encodeURIComponent(project)}` : "";
const res = await fetch( `${workerUrl()}/v1/notes/get?slug=${encodeURIComponent(slug)}${projectQs}`,
{
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

// Convenience: returns just the markdown body for a slug, or "" if missing
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
}

export async function commitNote(payload: CommitNotePayload): Promise<{ success: boolean;
path?: string; sha?: string }> {
const token = jwt();
if (!token) throw new Error("Не авторизовано (JWT відсутній)");
const body = {
slug: payload.slug,
path: `docs/${payload.slug}.md`,
content: buildMarkdown(payload),
sha: payload.sha,
message: `notes: update ${payload.slug}`,
};
const res = await fetch( `${workerUrl()}/v1/notes/commit`, {
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
const fm = ["---", `title: ${JSON.stringify(p.title)}`, `tags: [${p.tags.map((t) =>
JSON.stringify(t)).join(", ")}]`, "---", ""].join("\n");
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
const tm = line.match(/^title:\s(.)$/);
if (tm) {
title = tm[1].replace(/^["']|["']$/g, "").trim();
continue;
}
const tagsMatch = line.match(/^tags:\s\[(.)\]/);
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
const projectQs = project ? `&project=${encodeURIComponent(project)}` : "";
const res = await fetch(`${workerUrl()}/v1/notes/list?flat=false${projectQs}`, { headers: authHeaders() });
if (!res.ok) throw new Error(`notes/tree HTTP ${res.status}`);
const data = (await res.json()) as { tree?: TreeNode[] };
return data.tree ?? [];
}

export async function deleteNote(slug: string, project?: string): Promise<void> {
const token = jwt();
if (!token) throw new Error("Не авторизовано (JWT відсутній)");
const res = await fetch( `${workerUrl()}/v1/notes/delete`, {
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
const projectQs = project ? `?project=${encodeURIComponent(project)}` : "";
const res = await fetch(`${workerUrl()}/v1/notes/graph${projectQs}`, {
headers: authHeaders(),
});
if (!res.ok) throw new Error(`Graph: ${res.status} ${res.statusText}`);
return res.json() as Promise<{nodes: Array<{slug: string; title: string; exists: boolean}>; edges:
Array<{source: string; target: string; type: string}>; stats: {notes: number; links: number}}>;
}

