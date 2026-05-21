import { useState, useEffect } from "react";
import {
ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProject } from "@/context/ProjectContext";
import { cn } from "@/lib/utils";
import { fetchNotesTree, type TreeNode } from "@/lib/garden/notesApi";
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
const [searchQuery, setSearchQuery] = useState("");

const load = async () => {
setLoading(true);
try {
setTree(await fetchNotesTree(activeProject?.slug));
} catch (e) {
console.error("tree load error", e);
} finally {
setLoading(false);
}
};

useEffect(() => {
void load();
}, [activeProject?.slug]);

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
<TreeNodeItem
key={node.slug ?? node.path ?? i}
node={node}
level={0}
onNoteClick={(slug) => onNoteOpen(slug)}
searchQuery={searchQuery}
/>
))}
</div>
)}
</ScrollArea>
</div>
);
}

