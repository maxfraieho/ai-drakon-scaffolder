import { useState } from "react";
import { ChevronDown, ChevronRight, FileCode2, FolderClosed, FolderOpen, Plus, Search } from
"lucide-react";

import { cn } from "@/lib/utils";
import type { Diagram } from "@/types/drakon";
import type { Folder } from "@/lib/folder-storage";

interface DiagramsLeftPanelProps {
folders: Folder[];
diagrams: Diagram[];
selectedFolderSlug: string;
selectedDiagramId: string | null;
onSelectFolder: (slug: string) => void;
onSelectDiagram: (diagram: Diagram) => void;
onNewDiagram: () => void;
onNewFolder: () => void;
}

type Tab = "files" | "explorer" | "history";

export function DiagramsLeftPanel({
folders,
diagrams,
selectedFolderSlug,
selectedDiagramId,
onSelectFolder,
onSelectDiagram,
onNewDiagram,
onNewFolder,
}: DiagramsLeftPanelProps) {
const [tab, setTab] = useState<Tab>("files");
const [search, setSearch] = useState("");
const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() => ({
[selectedFolderSlug]: true,
}));

const toggleFolder = (slug: string) => {
setOpenFolders((prev) => ({ ...prev, [slug]: !prev[slug] }));
onSelectFolder(slug);
};

const filteredDiagrams = (folderSlug: string) => {
return diagrams
.filter((d) => d.folderId === folderSlug)
.filter((d) =>
search.trim() ? d.name.toLowerCase().includes(search.toLowerCase()) : true,
);
};

return (
<aside className="hidden md:flex h-full w-[220px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
{/ Header /}
<div className="flex h-7 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-2.5">
<span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
Diagrams
</span>
<button
type="button"
onClick={onNewDiagram}
aria-label="Нова схема"
title="Нова схема"
className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
>
<Plus className="h-3.5 w-3.5" />
</button>
</div>

{/ Tabs /}
<div className="flex shrink-0 gap-1 border-b border-[var(--border-subtle)] px-1.5 py-1">
{([
{ id: "files", label: "Files" },
{ id: "explorer", label: "Explorer" },
{ id: "history", label: "History" },
] as Array<{ id: Tab; label: string }>).map((t) => (
<button
key={t.id}
type="button"
onClick={() => setTab(t.id)}
className={cn(
"flex-1 rounded-sm py-0.5 text-center font-mono text-[10px] uppercase tracking-wider transition-colors",
tab === t.id
? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
: "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
)}
>
{t.label}
</button>
))}
</div>

{/ Search /}
<div className="relative mx-2 my-1.5 shrink-0">
<Search
aria-hidden="true"
className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]"
/>
<input
value={search}
onChange={(e) => setSearch(e.target.value)}
placeholder="Пошук…"
className="h-6 w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-elevated)] pl-7 pr-2 font-mono text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-amber)]"
/>
</div>
{/ Tree /}
<div className="flex-1 overflow-y-auto">
{tab === "files" || tab === "explorer" ? (
<ul className="text-sm">
{folders.map((folder) => {
const isOpen = openFolders[folder.slug] ?? false;
const isFolderActive = folder.slug === selectedFolderSlug;
const items = filteredDiagrams(folder.slug);
return (
<li key={folder.id}>
<button
type="button"
onClick={() => toggleFolder(folder.slug)}
className={cn(
"flex h-6 w-full items-center gap-1.5 px-2 font-mono text-[11px] transition-colors",
isFolderActive
? "text-[var(--text-primary)]"
: "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
"hover:bg-white/[0.03]",
)}
>
{isOpen ? (
<ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
):(
<ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
)}
{isOpen ? (
<FolderOpen className="h-3.5 w-3.5 text-[var(--text-muted)]" />
):(
<FolderClosed className="h-3.5 w-3.5 text-[var(--text-muted)]" />
)}
<span className="truncate">{folder.name}</span>
<span className="ml-auto font-mono text-[9px] text-[var(--text-muted)]">
{items.length}
</span>
</button>
{isOpen && (
<ul>
{items.length === 0 ? (
<li className="px-7 py-1 font-mono text-[10px] italic text-[var(--text-muted)]">
порожньо
</li>
):(
items.map((d) => {
const isActive = d.id === selectedDiagramId;
const cc = d.diagram.metadata?.diagramLevel;
return (
<li key={d.id}>
<button
type="button"
onClick={() => onSelectDiagram(d)}
className={cn(
"relative flex h-7 w-full items-center gap-1.5 pl-7 pr-2 font-mono text-[11px] transition-colors",
isActive
? "bg-[rgba(245,158,11,0.06)] text-[var(--text-primary)]"
: "text-[var(--text-secondary)] hover:bg-white/[0.03] hover:text-[var(--text-primary)]",
)}
>
{isActive && (
<span
aria-hidden="true"
className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent-amber)]"
/>
)}
<FileCode2 className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
<span className="truncate flex-1 text-left">{d.name}</span>
{cc && (
<span className="font-mono text-[9px] text-[var(--text-muted)]">
{cc}
</span>
)}
</button>
</li>
);
})
)}
</ul>
)}
</li>
);
})}
</ul>
):(
<div className="px-3 py-3 font-mono text-[10px] text-[var(--text-muted)]">
History — coming soon
</div>
)}
</div>

{/ Footer /}
<div className="shrink-0 border-t border-[var(--border-subtle)] p-2">
<button
type="button"
onClick={onNewFolder}
className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-[var(--border-default)] py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)]"
>
<Plus className="h-3 w-3" />
Папка
</button>
</div>
</aside>
);
}
---
### components/workspace/CanvasToolbar.tsx
**Розмір:** 4,886 байт


import { Code2, Edit3, Maximize2, ScanSearch, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
diagramName?: string;
level?: string;
cyclomaticComplexity?: number;
analysisActive: boolean;
generationActive: boolean;
onToggleAnalysis: () => void;
onToggleGeneration: () => void;
onEdit?: () => void;
onZoomIn?: () => void;
onZoomOut?: () => void;
onFullscreen?: () => void;
}

export function CanvasToolbar({
diagramName,
level,
cyclomaticComplexity,
analysisActive,
generationActive,
onToggleAnalysis,
onToggleGeneration,
onEdit,
onZoomIn,
onZoomOut,
onFullscreen,
}: CanvasToolbarProps) {
return (
<div className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5">
{/ Left: diagram identity /}
<div className="flex min-w-0 items-center gap-2">
<span
className={cn(
"font-mono text-[11px] font-semibold truncate",
diagramName ? "text-[var(--accent-amber)]" : "text-[var(--text-muted)] italic",
)}
>
{diagramName || "схему не вибрано"}
</span>
{level && (
<>
<span className="text-[var(--text-muted)]">·</span>
<span className="font-mono text-[11px] text-[var(--text-secondary)]">{level}</span>
</>
)}
{typeof cyclomaticComplexity === "number" && (
<>
<span className="text-[var(--text-muted)]">·</span>
<span className="font-mono text-[11px] text-[var(--text-secondary)]" data-numeric="true">
CC:{cyclomaticComplexity}
</span>
</>
)}
</div>

{/ Right: actions /}
<div className="ml-auto flex items-center gap-1">
<button
type="button"
onClick={onToggleAnalysis}
aria-pressed={analysisActive}
className={cn(
"inline-flex h-6 items-center gap-1 rounded-sm border px-2 font-mono text-[11px] transition-colors",
analysisActive
? "border-[rgba(245,158,11,0.4)] bg-[var(--accent-dim)] text-[var(--accent-amber)]"
: "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
)}
>
<ScanSearch className="h-3.5 w-3.5" />
Аналіз
</button>
<button
type="button"
onClick={onToggleGeneration}
aria-pressed={generationActive}
className={cn(
"inline-flex h-6 items-center gap-1 rounded-sm border px-2 font-mono text-[11px] transition-colors",
generationActive
? "border-[rgba(245,158,11,0.4)] bg-[var(--accent-dim)] text-[var(--accent-amber)]"
: "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
)}
>
<Code2 className="h-3.5 w-3.5" />
Генерація
</button>

<span aria-hidden="true" className="mx-1 h-4 w-px bg-[var(--border-subtle)]" />

{onEdit && (
<button
type="button"
onClick={onEdit}
aria-label="Редагувати схему"
title="Редагувати"
className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
>
<Edit3 className="h-3.5 w-3.5" />
</button>
)}
{onZoomOut && (
<button
type="button"
onClick={onZoomOut}
aria-label="Зменшити"
className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
>
<ZoomOut className="h-3.5 w-3.5" />
</button>
)}
{onZoomIn && (
<button
type="button"
onClick={onZoomIn}
aria-label="Збільшити"
className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
>
<ZoomIn className="h-3.5 w-3.5" />
</button>
)}
{onFullscreen && (
<button
type="button"
onClick={onFullscreen}
aria-label="Повний екран"
className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
>
<Maximize2 className="h-3.5 w-3.5" />
</button>
)}
</div>
</div>
);
}

