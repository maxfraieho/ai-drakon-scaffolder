import { useState, useEffect, useMemo } from "react";
import {
Plus, Loader2, RefreshCw, FileText, Folder, FolderOpen,
ChevronDown, ChevronRight, Trash2, FolderPlus, FilePlus,
PanelLeftOpen, PanelLeftClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NoteEditor } from "@/components/docs/garden/NoteEditor";
import { useNotesEditor } from "@/hooks/useNotesEditor";
import { fetchNotesTree, deleteNote, commitNote, type TreeNode } from
"@/lib/garden/notesApi";
import { toast } from "sonner";
import { useProject } from "@/context/ProjectContext";

const NEW_SLUG = "__new__";
const LOCAL_FOLDERS_KEY = "docs.localFolders";

interface NotesTabProps {
focusSlug?: string | null;
onFocusClear?: () => void;
}

function slugifySegment(s: string): string {
return s.toLowerCase().trim()
.replace(/[^a-z0-9\u0400-\u04ff\s-]/g, "")
.replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

function readLocalFolders(): string[] {
if (typeof window === "undefined") return [];
try {
const raw = localStorage.getItem(LOCAL_FOLDERS_KEY);
return raw ? (JSON.parse(raw) as string[]) : [];
} catch { return []; }
}
function writeLocalFolders(list: string[]) {
if (typeof window === "undefined") return;
localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(list));
}

function mergeLocalFolders(tree: TreeNode[], local: string[]): TreeNode[] {
const existing = new Set(tree.filter((n) => n.type === "folder").map((n) => n.name));
const extras: TreeNode[] = local
.filter((n) => !existing.has(n))
.map((name) => ({ type: "folder" as const, name, path: name, children: [] }));
return [...tree, ...extras];
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
return nodes.flatMap((n) => (n.type === "note" ? [n] : flattenTree(n.children ?? [])));
}

function SidebarTreeNode({
node, level, activeSlug, onNoteClick, onDeleteNote, onAddInFolder, onDeleteFolder,
}: {
node: TreeNode;
level: number;
activeSlug: string | null;
onNoteClick: (slug: string) => void;
onDeleteNote: (slug: string) => void;
onAddInFolder: (folderPath: string) => void;
onDeleteFolder: (folderPath: string, hasChildren: boolean) => void;
}) {
const [open, setOpen] = useState(true);

if (node.type === "note") {
const isActive = activeSlug === node.slug;
return (
<div
className={cn(
"group flex w-full items-center rounded transition-colors hover:bg-muted",
isActive && "bg-muted",
)}
style={{ paddingLeft: `${8 + level * 14}px` }}
>
<button
onClick={() => onNoteClick(node.slug!)}
className={cn(
"flex flex-1 items-center gap-1.5 py-1.5 text-left text-xs min-w-0",
isActive && "font-medium",
)}
>
<FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
<span className="truncate">{node.title ?? node.slug}</span>
</button>
<button
onClick={(e) => { e.stopPropagation(); onDeleteNote(node.slug!); }}
className="mr-1 h-6 w-6 shrink-0 rounded p-0.5 text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
title="Видалити"
>
<Trash2 className="h-3 w-3" />
</button>
</div>
);
}

const childCount = (node.children ?? []).length;
return (
<div>
<div
className="group flex items-center rounded hover:bg-muted/60"
style={{ paddingLeft: `${4 + level * 14}px` }}
>
<button
onClick={() => setOpen((o) => !o)}
className="flex flex-1 items-center gap-1.5 py-1 text-left text-xs font-medium text-muted-foreground min-w-0"
>
{open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
{open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/60" /> : <Folder
className="h-3.5 w-3.5 shrink-0 text-primary/60" />}
<span className="truncate">{node.name}</span>
</button>
<button
onClick={(e) => { e.stopPropagation(); onAddInFolder(node.path); }}
className="h-6 w-6 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary md:opacity-0 md:group-hover:opacity-100"
title="Новий документ у цій папці"
>
<FilePlus className="h-3 w-3" />
</button>
<button
onClick={(e) => { e.stopPropagation(); onDeleteFolder(node.path, childCount > 0); }}
className="mr-1 h-6 w-6 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
title="Видалити папку"
>
<Trash2 className="h-3 w-3" />
</button>
</div>
{open && (node.children ?? []).map((child, i) => (
<SidebarTreeNode
key={child.slug ?? child.path ?? i}
node={child}
level={level + 1}
activeSlug={activeSlug}
onNoteClick={onNoteClick}
onDeleteNote={onDeleteNote}
onAddInFolder={onAddInFolder}
onDeleteFolder={onDeleteFolder}
/>
))}
</div>
);
}

export function NotesTab({ focusSlug, onFocusClear }: NotesTabProps = {}) {
  const { activeProject } = useProject();
  const [rawTree, setRawTree] = useState<TreeNode[]>([]);
  const [localFolders, setLocalFolders] = useState<string[]>(() => readLocalFolders());
  const [loading, setLoading] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [pendingFolder, setPendingFolder] = useState<string | null>(null);
  // Mobile document list panel
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const tree = useMemo(() => mergeLocalFolders(rawTree, localFolders), [rawTree, localFolders]);

  const editorSlug = activeSlug === NEW_SLUG ? undefined : activeSlug ?? undefined;
  const editor = useNotesEditor({ slug: editorSlug, project: activeProject?.slug });

useEffect(() => {
if (focusSlug) {
setActiveSlug(focusSlug);
setSidebarOpen(false);
onFocusClear?.();
}
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [focusSlug]);

  const loadTree = async () => {
    setLoading(true);
    try {
      const t = await fetchNotesTree(activeProject?.slug);
      setRawTree(t);
      // Cleanup local folders that now exist on server
      const serverFolders = new Set(t.filter((n) => n.type === "folder").map((n) => n.name));
      setLocalFolders((prev) => {
        const next = prev.filter((n) => !serverFolders.has(n));
        if (next.length !== prev.length) writeLocalFolders(next);
        return next;
      });
    } catch (e) {
      console.error("notes tree error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTree(); }, [activeProject?.slug]);

const handleSave = async () => {
const savedSlug = await editor.save();
if (savedSlug) {
await loadTree();
setActiveSlug(savedSlug);
setPendingFolder(null);
}
};

const handleNewNote = (folder: string | null) => {
setPendingFolder(folder);
setActiveSlug(NEW_SLUG);
setSidebarOpen(false);
};

// Pre-set title with folder prefix hint via the slug system in useNotesEditor:
// We override slug at save time by injecting folder. Simpler: set initial title to "" and on save prefix slug.
// Implementation: when pendingFolder set, intercept editor.save by wrapping it in handleSave.
// We do it by passing currentSlug and syncing title -> editor will slugify title; we then prepend folder.
// For this, override editor.save here using a quick monkeypatch via wrapper:
const wrappedSave = async () => {
if (pendingFolder && !editor.title.trim()) {
toast.error("Вкажіть заголовок");
return;
}
if (pendingFolder) {
// Use commitNote directly to control slug
const slugBase = slugifySegment(editor.title) || `note-${Date.now()}`;
const finalSlug = `${pendingFolder}/${slugBase}`;
try {
await commitNote({
slug: finalSlug,
title: editor.title.trim(),
content: editor.content,
tags: editor.tags,
});
toast.success("Документ створено");
await loadTree();
setActiveSlug(finalSlug);
setPendingFolder(null);
} catch (e) {
toast.error(e instanceof Error ? e.message : "Помилка збереження");
}
return;
}
await handleSave();
};

  const handleDeleteNote = async (slug: string) => {
    const title = flattenTree(tree).find((n) => n.slug === slug)?.title ?? slug;
    if (!window.confirm(`Видалити документ «${title}»? Це незворотня дія.`)) return;
    try {
      await deleteNote(slug, activeProject?.slug);
      if (activeSlug === slug) setActiveSlug(null);
      await loadTree();
      toast.success("Документ видалено");
} catch (e) {
console.error(e);
toast.error(e instanceof Error ? e.message : "Помилка видалення");
}
};

const handleAddFolder = () => {
const name = window.prompt("Назва нової папки:");
if (!name) return;
const slug = slugifySegment(name);
if (!slug) { toast.error("Некоректна назва"); return; }
if (localFolders.includes(slug) || rawTree.some((n) => n.type === "folder" && n.name ===
slug)) {
toast.error("Така папка вже існує");
return;
}
const next = [...localFolders, slug];
setLocalFolders(next);
writeLocalFolders(next);
toast.success(`Папку «${slug}» створено. Додайте до неї документ, щоб зберегти.`);
};

  const handleDeleteFolder = async (folderPath: string, hasChildren: boolean) => {
    if (hasChildren) {
      if (!window.confirm(`Папка «${folderPath}» містить документи. Видалити папку РАЗОМ із усіма документами?`)) return;
      const notes = flattenTree(tree.filter((n) => n.type === "folder" && n.name === folderPath));
      try {
        for (const n of notes) {
          if (n.slug) await deleteNote(n.slug, activeProject?.slug);
        }
        toast.success("Папку видалено");
await loadTree();
} catch (e) {
toast.error(e instanceof Error ? e.message : "Помилка видалення");
}
} else {
// local-only empty folder
const next = localFolders.filter((n) => n !== folderPath);
setLocalFolders(next);
writeLocalFolders(next);
toast.success("Папку видалено");
}
};

const wikilinkSuggestions = flattenTree(tree).map((n) => ({
title: (n.slug?.split("/").pop() ?? n.slug ?? "").replace(/\.md$/, ""),
slug: n.slug!,
}));

return (
<div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border md:flex-row">
{/* Sidebar — mobile stacked panel, desktop side panel */}
<aside
className={cn(
"min-w-0 flex-col border-border bg-muted/20",
sidebarOpen ? "flex max-h-[38dvh] border-b" : "hidden",
"md:flex md:h-full md:max-h-none md:w-56 md:shrink-0 md:border-b-0 md:border-r",
)}
>
<div className="flex items-center justify-between border-b border-border p-2">
<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
Документи
</span>
<div className="flex gap-0.5">
<Button size="icon" variant="ghost" className="h-7 w-7" onClick={loadTree}
disabled={loading} title="Оновити">
<RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
</Button>
<Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddFolder}
title="Нова папка">
<FolderPlus className="h-3.5 w-3.5" />
</Button>
<Button size="icon" variant="ghost" className="h-7 w-7" onClick={() =>
handleNewNote(null)} title="Новий документ">
<Plus className="h-3.5 w-3.5" />
</Button>
<Button size="icon" variant="ghost" className="h-7 w-7 md:hidden" onClick={() =>
setSidebarOpen(false)} title="Сховати">
<PanelLeftClose className="h-3.5 w-3.5" />
</Button>
</div>
</div>
<div className="border-b border-border px-2 py-1">
<input
value={sidebarSearch}
onChange={(e) => setSidebarSearch(e.target.value)}
placeholder="Пошук документів..."
className="w-full rounded-sm border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
/>
</div>
<ScrollArea className="flex-1">
{loading ? (
<div className="flex items-center justify-center p-4">
<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
</div>
) : tree.length === 0 ? (
<div className="p-3 text-center text-xs text-muted-foreground">
Документів поки немає
</div>
):(
<div className="space-y-0 p-1">
{(sidebarSearch.trim()
? flattenTree(tree).filter((n) =>
n.slug?.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
n.title?.toLowerCase().includes(sidebarSearch.toLowerCase()),
)
: tree
).map((node, i) => (
<SidebarTreeNode
key={node.slug ?? node.path ?? i}
node={node}
level={0}
activeSlug={activeSlug}
onNoteClick={(s) => { setActiveSlug(s); setPendingFolder(null); setSidebarOpen(false); }}
onDeleteNote={handleDeleteNote}
onAddInFolder={(p) => handleNewNote(p)}
onDeleteFolder={handleDeleteFolder}
/>
))}
</div>
)}
</ScrollArea>
</aside>

{/* Editor area */}
<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
{/* Mobile bar with sidebar toggle */}
<div className="flex items-center gap-2 border-b border-border bg-muted/10 px-2 py-1 md:hidden">
<Button
size="icon" variant="ghost" className="h-8 w-8"
onClick={() => setSidebarOpen((o) => !o)}
title="Список документів"
>
{sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
</Button>
<span className="truncate text-xs text-muted-foreground">
{activeSlug === NEW_SLUG
? ( `pendingFolder ? Новий у /${pendingFolder} : "Новий документ"`)
: activeSlug ?? "Оберіть документ"}
</span>
</div>

{activeSlug === null ? (
<div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
<FileText className="h-10 w-10 opacity-20" />
<p className="text-sm">
Оберіть документ або{" "}
<button
className="underline transition-colors hover:text-foreground"
onClick={() => handleNewNote(null)}
>
створіть новий
</button>
</p>
</div>
):(
<NoteEditor
title={editor.title}
content={editor.content}
tags={editor.tags}
isDirty={editor.isDirty || (activeSlug === NEW_SLUG && !!editor.title)}
isSaving={editor.isSaving}
hasDraft={editor.hasDraft}
currentSlug={activeSlug === NEW_SLUG ? (pendingFolder ? `${pendingFolder}/…` : undefined) : activeSlug}
onTitleChange={editor.setTitle}
onContentChange={editor.setContent}
onTagsChange={editor.setTags}
onSave={wrappedSave}
onRestoreDraft={editor.restoreDraft}
onDiscardDraft={editor.discardDraft}
wikilinkSuggestions={wikilinkSuggestions}
insertAtCursor={editor.insertAtCursor}
/>
)}
</div>
</div>
);
}

