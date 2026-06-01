import { useState, useEffect } from "react";
import {
ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Loader2, RefreshCw, Pencil, X, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProject } from "@/context/ProjectContext";
import { cn } from "@/lib/utils";
import { fetchNotesTree, type TreeNode } from "@/lib/garden/notesApi";
import { api } from "@/lib/api";
import { getGithubConfig } from "@/lib/settings-storage";
function nodeMatchesSearch(node: TreeNode, q: string): boolean {
if (!q) return true;
const lq = q.toLowerCase();
if (node.type === "note") {
return (node.title ?? node.slug ?? "").toLowerCase().includes(lq) ||
(node.slug ?? "").toLowerCase().includes(lq);
}
return (node.children ?? []).some((c) => nodeMatchesSearch(c, q));
}

function countNotes(nodes: TreeNode[]): number {
return nodes.reduce(
(acc, n) => acc + (n.type === "note" ? 1 : countNotes(n.children ?? [])),
0,
);
}

function TreeNodeItem({
node,
level,
onNoteClick,
searchQuery,
}: {
node: TreeNode;
level: number;
onNoteClick: (slug: string) => void;
searchQuery: string;
}) {
const [open, setOpen] = useState(true);

if (!nodeMatchesSearch(node, searchQuery)) return null;

if (node.type === "note") {
return (
<button
onClick={() => onNoteClick(node.slug!)}
className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors hover:bg-muted"
style={{ paddingLeft: `${12 + level * 18}px` }}
>
<FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
<span className="truncate flex-1">{node.title ?? node.slug}</span>
{node.size != null && (
<span className="ml-auto text-[10px] text-muted-foreground shrink-0">
{(node.size / 1024).toFixed(1)}k
</span>
)}
</button>
);
}

const noteCount = countNotes(node.children ?? []);
return (
<div>
<button
onClick={() => setOpen((o) => !o)}
className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted/60"
style={{ paddingLeft: `${12 + level * 18}px` }}
>
{open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight
className="h-3.5 w-3.5 shrink-0" />}
{open ? <FolderOpen className="h-4 w-4 shrink-0 text-primary/70" /> : <Folder
className="h-4 w-4 shrink-0 text-primary/70" />}
<span className="truncate flex-1 text-left">{node.name}</span>
<span className="text-[10px] text-muted-foreground shrink-0">{noteCount}</span>
</button>
{open && (node.children ?? []).map((child, i) => (
<TreeNodeItem
key={child.slug ?? child.path ?? i}
node={child}
level={level + 1}
onNoteClick={onNoteClick}
searchQuery={searchQuery}
/>
))}
</div>
);
}

interface DocsFilesTabProps {
onNoteOpen: (slug: string) => void;
}

export function DocsFilesTab({ onNoteOpen }: DocsFilesTabProps) {
const { activeProject } = useProject();
const [tree, setTree] = useState<TreeNode[]>([]);
const [loading, setLoading] = useState(false);
const [loadError, setLoadError] = useState<string | null>(null);
const [searchQuery, setSearchQuery] = useState("");
const [editingPath, setEditingPath] = useState<string | null>(null);
const [editContent, setEditContent] = useState("");
const [editSaving, setEditSaving] = useState(false);

const ghOwner = activeProject?.github?.owner || getGithubConfig().owner || "";
const ghRepoName = activeProject?.github?.repo || getGithubConfig().repo || "";
const ghBranch = activeProject?.github?.branch || getGithubConfig().branch || "main";

const load = async () => {
  setLoading(true);
  setLoadError(null);
  try {
    if (ghOwner && ghRepoName) {
      console.log("[DocsFilesTab] loading github", ghOwner, ghRepoName, ghBranch);
      const result = await api.githubListTree(ghOwner, ghRepoName, "docs", ghBranch);
      console.log("[DocsFilesTab] result", result);
      const items: Array<{ path?: string; name?: string; type?: string }> =
        result.entries ?? [];
      const nodes: TreeNode[] = items.map((item) => ({
        slug: ((item.path ?? item.name ?? "") as string).replace(/\.md$/, ""),
        title: ((item.name ?? item.path ?? "") as string).replace(/\.md$/, ""),
        type: (item.type === "dir" ? "folder" : "note") as "note" | "folder",
        path: (item.path ?? item.name ?? "") as string,
        children: [],
      }));
      setTree(nodes);
    } else {
      console.log("[DocsFilesTab] no github config, fetching notes tree for", activeProject?.slug);
      setTree(await fetchNotesTree(activeProject?.slug || undefined));
    }
  } catch (e) {
    console.error("[DocsFilesTab] load error", e);
    setLoadError(String(e));
  } finally {
    setLoading(false);
  }
};

const openEditor = async (path: string) => {
  setEditSaving(true);
  try {
    const result = await api.githubGetFile(ghOwner, ghRepoName, path, ghBranch);
    const decoded = result.content
      ? atob(result.content.replace(/\n/g, ""))
      : "";
    setEditContent(decoded);
    setEditingPath(path);
  } catch (e) {
    console.error("open editor error", e);
  } finally {
    setEditSaving(false);
  }
};

const saveFile = async () => {
  if (!editingPath) return;
  setEditSaving(true);
  try {
    const token = getGithubConfig().token;
    await api.githubCommitFile(
      ghOwner, ghRepoName, editingPath, editContent,
      `docs: update ${editingPath}`, ghBranch, token,
    );
    setEditingPath(null);
  } catch (e) {
    console.error("save file error", e);
  } finally {
    setEditSaving(false);
  }
};

useEffect(() => {
  void load();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [ghOwner, ghRepoName, ghBranch]);

if (editingPath) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{editingPath}</span>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingPath(null)} title="Скасувати">
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={saveFile} disabled={editSaving}>
          {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Зберегти
        </Button>
      </div>
      <textarea
        className="flex-1 resize-none bg-background p-3 font-mono text-sm focus:outline-none"
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}

return (
<div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border">
<div className="flex items-center gap-2 border-b border-border px-3 py-2">
<Input
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
placeholder="Пошук документів…"
className="h-7 flex-1 text-sm"
/>
<Button
size="icon"
variant="ghost"
className="h-7 w-7 shrink-0"
onClick={load}
disabled={loading}
title="Оновити"
>
<RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
</Button>
</div>

<div className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
{loading ? "Завантаження…" : `${countNotes(tree)} документів`}
{!loading && !ghOwner && <span className="ml-2 text-yellow-500">⚠ repo не вказано</span>}
{loadError && <span className="ml-2 text-red-500">❌ {loadError}</span>}
</div>

<ScrollArea className="flex-1">
{loading ? (
<div className="flex items-center justify-center p-8">
<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
</div>
) : tree.length === 0 ? (
<div className="p-6 text-center text-sm text-muted-foreground">Документів немає</div>
):(
<div className="py-1">
{tree.map((node, i) => (
  <div key={node.slug ?? node.path ?? i} className="group flex items-center">
    <div className="flex-1">
      <TreeNodeItem
        node={node}
        level={0}
        onNoteClick={(slug) => onNoteOpen(slug)}
        searchQuery={searchQuery}
      />
    </div>
    {node.type === "note" && ghOwner && ghRepoName && (
      <Button
        size="icon"
        variant="ghost"
        className="mr-1 h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
        title="Редагувати"
        onClick={() => openEditor(node.path ?? node.slug ?? "")}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    )}
  </div>
))}
</div>
)}
</ScrollArea>
</div>
);
}

