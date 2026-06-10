import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, FolderOpen, Folder, AlertCircle } from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import { readSettings } from "@/lib/settings-storage";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NoteRenderer } from "@/components/docs/garden/NoteRenderer";

interface GhFile {
  path: string;
  type: "blob" | "tree";
  url: string;
  sha: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

function buildTree(files: GhFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const f of files) {
    const parts = f.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const existing = current.find(n => n.name === name);
      if (i === parts.length - 1) {
        if (!existing) current.push({ name, path: f.path, type: "file" });
      } else {
        if (!existing) {
          const folder: TreeNode = { name, path: parts.slice(0, i + 1).join("/"), type: "folder", children: [] };
          current.push(folder);
          current = folder.children!;
        } else {
          current = existing.children ?? (existing.children = []);
        }
      }
    }
  }
  return root.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function TreeNodeItem({ node, depth, selected, onSelect }: {
  node: TreeNode; depth: number; selected: string | null; onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  if (node.type === "folder") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 w-full px-2 py-0.5 rounded font-mono text-[10px] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {open ? <FolderOpen className="h-3 w-3 shrink-0" /> : <Folder className="h-3 w-3 shrink-0" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children?.map(c => (
          <TreeNodeItem key={c.path} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} />
        ))}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={cn(
        "flex items-center gap-1.5 w-full px-2 py-0.5 rounded font-mono text-[10px] transition-colors",
        selected === node.path
          ? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
          : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
      )}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      <FileText className="h-3 w-3 shrink-0" />
      <span className="truncate">{node.name.replace(/\.md$/, "")}</span>
    </button>
  );
}

export function GitHubDocsPage() {
  const { activeProject } = useProject();
  const gh = activeProject?.github;

  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);

  const fetchTree = useCallback(async () => {
    if (!gh) return;
    setLoading(true);
    setError(null);
    setTree([]);
    setSelectedPath(null);
    setContent("");
    try {
      const token = readSettings().github?.token;
      const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Get HEAD tree recursively (docs folder only)
      const resp = await fetch(
        `https://api.github.com/repos/${gh.owner}/${gh.repo}/git/trees/${gh.branch}?recursive=1`,
        { headers }
      );
      if (!resp.ok) throw new Error(`GitHub ${resp.status}`);
      const data = await resp.json() as { tree: GhFile[] };
      const mdFiles = data.tree.filter(f =>
        f.type === "blob" && f.path.match(/\.(md|mdx)$/)
      );
      setTree(buildTree(mdFiles));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [gh?.owner, gh?.repo, gh?.branch]);

  useEffect(() => { void fetchTree(); }, [fetchTree]);

  const openFile = useCallback(async (path: string) => {
    if (!gh) return;
    setSelectedPath(path);
    setContentLoading(true);
    setContent("");
    try {
      const token = readSettings().github?.token;
      const headers: Record<string, string> = { Accept: "application/vnd.github.raw" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(
        `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}?ref=${gh.branch}`,
        { headers }
      );
      if (!resp.ok) throw new Error(`GitHub ${resp.status}`);
      setContent(await resp.text());
    } catch {
      setContent("Помилка завантаження файлу");
    } finally {
      setContentLoading(false);
    }
  }, [gh?.owner, gh?.repo, gh?.branch]);

  if (!gh) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <AlertCircle className="h-8 w-8 text-[var(--text-muted)]" />
        <p className="font-mono text-[11px] text-[var(--text-muted)]">
          Оберіть репозиторій у хедері для перегляду документації
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden font-mono">
      {/* File tree */}
      <div className="w-56 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col overflow-hidden">
        <div className="px-2 py-1.5 border-b border-[var(--border-subtle)] shrink-0">
          <p className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
            {gh.owner}/{gh.repo}
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center flex-1 gap-2 text-[10px] text-[var(--text-muted)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Завантаження...
          </div>
        ) : error ? (
          <div className="p-3 text-[10px] text-red-400">{error}</div>
        ) : tree.length === 0 ? (
          <div className="p-3 text-[10px] text-[var(--text-muted)]">Немає .md файлів</div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="py-1 pr-1">
              {tree.map(n => (
                <TreeNodeItem key={n.path} node={n} depth={0} selected={selectedPath} onSelect={openFile} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[var(--bg-base)]">
        {contentLoading ? (
          <div className="flex items-center justify-center flex-1 gap-2 text-[10px] text-[var(--text-muted)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Завантаження...
          </div>
        ) : content ? (
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-3xl">
              <NoteRenderer content={content} onNavigate={() => {}} />
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-[10px] text-[var(--text-muted)]">
            <FileText className="h-6 w-6" />
            Оберіть файл зі списку
          </div>
        )}
      </div>
    </div>
  );
}
