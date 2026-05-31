import { useCallback, useEffect, useMemo, useState, type ChangeEvent, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, FileCode2 } from "lucide-react";

import { CodeAnalysisPanel } from "@/components/pipeline/CodeAnalysisPanel";
import { CodeGenerationPanel } from "@/components/pipeline/CodeGenerationPanel";
import { DiagramsLeftPanel } from "@/components/workspace/DiagramsLeftPanel";
import { DrakonIrPanel } from "@/components/workspace/DrakonIrPanel";
import { cn } from "@/lib/utils";
import { CanvasToolbar } from "@/components/workspace/CanvasToolbar";
import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import { PipelineDrakonView } from "@/components/pipelines/PipelineDrakonView";
import { convertDiagramToIr } from "@/lib/htse/diagram-to-ir";
import { savePipeline } from "@/lib/graph-pipeline-api";
import {
Dialog,
DialogContent,
DialogFooter,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { api } from "@/lib/api";
import {
readDiagramsFromStorage,
upsertDiagramInStorage,
} from "@/lib/diagram-storage";
import {
DEFAULT_FOLDER,
readFoldersFromStorage,
slugifyFolderName,
writeFoldersToStorage,
type Folder,
} from "@/lib/folder-storage";
import type { Diagram } from "@/types/drakon";
import type { DrakonItem } from "@/types/drakon";
import type { IrDiagram } from "@/lib/graph-pipeline-api";
export function DiagramsPage() {
const navigate = useNavigate();
const importInputRef = useRef<HTMLInputElement | null>(null);

type ViewMode = "local" | "ir";
const [viewMode, setViewMode] = useState<ViewMode>("local");
const [selectedIrName, setSelectedIrName] = useState<string | null>(null);

const [folders, setFolders] = useState<Folder[]>(() => readFoldersFromStorage());
const [selectedFolderSlug, setSelectedFolderSlug] = useState<string>(
() => readFoldersFromStorage()[0]?.slug || "general",
);
const [diagrams, setDiagrams] = useState<Diagram[]>([]);
const [selectedDiagram, setSelectedDiagram] = useState<Diagram | null>(null);
const [showEditor, setShowEditor] = useState(false);
const [col2Collapsed, setCol2Collapsed] = useState(false);

const [analysisOpen, setAnalysisOpen] = useState(false);
const [generationOpen, setGenerationOpen] = useState(false);
const [savePipelineOpen, setSavePipelineOpen] = useState(false);
const [pipelineNameInput, setPipelineNameInput] = useState("");
const [savingPipeline, setSavingPipeline] = useState(false);
const [irSheetIr, setIrSheetIr] = useState<IrDiagram | null>(null);

const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
const [newFolderName, setNewFolderName] = useState("");

const selectedFolder =
folders.find((f) => f.slug === selectedFolderSlug) ?? DEFAULT_FOLDER;

const loadDiagrams = async (folderSlug: string) => {
const local = readDiagramsFromStorage().filter((d) => d.folderId === folderSlug);
setDiagrams(local);
try {
const result = await api.listDiagrams(folderSlug);
const remoteIds = result.diagrams ?? [];
if (result.success && remoteIds.length > 0) {
const localIds = new Set(local.map((d) => d.id));
const missingIds = remoteIds.filter((id) => !localIds.has(id));
for (const id of missingIds) {
try {
const remote = await api.getDiagram(folderSlug, id);
if (remote.success && remote.diagram) {
upsertDiagramInStorage(remote.diagram);
}
} catch {
/ ignore /
}
}
const refreshed = readDiagramsFromStorage().filter(
(d) => d.folderId === folderSlug,
);
setDiagrams(refreshed);
}
} catch {
/ offline /
}
};

useEffect(() => {
void loadDiagrams(selectedFolder.slug);
}, [selectedFolder.slug]);
// Auto-select first diagram in folder when changing folder
useEffect(() => {
if (viewMode === "ir") return;
const inFolder = diagrams.filter((d) => d.folderId === selectedFolder.slug);
if (selectedDiagram && inFolder.some((d) => d.id === selectedDiagram.id)) return;
setSelectedDiagram(inFolder[0] ?? null);
}, [selectedFolder.slug, diagrams, selectedDiagram, viewMode]);

useEffect(() => {
const pendingId = localStorage.getItem("_pending_open_diagram_id");
if (!pendingId) return;
localStorage.removeItem("_pending_open_diagram_id");
const all = readDiagramsFromStorage();
const target = all.find((d) => d.id === pendingId);
if (target) {
setViewMode("local");
setSelectedDiagram(target);
setShowEditor(true);
}
}, []);

const allDiagrams = useMemo(() => diagrams, [diagrams]);

const createFolder = () => {
const trimmed = newFolderName.trim();
if (!trimmed) {
toast.error("Вкажіть назву папки");
return;
}
const slug = slugifyFolderName(trimmed);
if (!slug) {
toast.error("Некоректна назва папки");
return;
}
if (folders.some((f) => f.slug === slug)) {
toast.error("Папка з таким slug вже існує");
return;
}
const folder: Folder = { id: crypto.randomUUID(), name: trimmed, slug };
const next = [...folders, folder];
setFolders(next);
writeFoldersToStorage(next);
setSelectedFolderSlug(folder.slug);
setNewFolderName("");
setIsCreateFolderOpen(false);
};

const openNewDiagram = () => {
navigate({
to: "/diagram/editor",
search: { folderId: selectedFolder.slug, isNew: "true" },
});
};

const normalizeIrDiagram = (name: string, diagram: object): Diagram["diagram"] => {
const raw = diagram as Record<string, unknown>;
const rawItems = (raw.items ?? {}) as Record<string, Record<string, unknown>>;
const items: Record<string, DrakonItem> = {};
for (const [id, node] of Object.entries(rawItems)) {
items[id] = {
type: (node.type as DrakonItem["type"]) ?? "action",
content: typeof node.content === "string" ? node.content : "",
...(node.one != null ? { one: node.one as string } : {}),
...(node.two != null ? { two: node.two as string } : {}),
};
}
return { name, items };
};

const handleIrSelect = (name: string, diagram: object) => {
setSelectedIrName(name);
setSelectedDiagram({
id: "ir__" + name,
folderId: "__ir__",
name,
createdAt: new Date().toISOString(),
updatedAt: new Date().toISOString(),
diagram: normalizeIrDiagram(name, diagram),
});
setShowEditor(true);
};

const handleSwitchMode = (mode: ViewMode) => {
setViewMode(mode);
if (mode === "local") {
setSelectedIrName(null);
const inFolder = diagrams.filter((d) => d.folderId === selectedFolder.slug);
setSelectedDiagram(inFolder[0] ?? null);
} else {
setSelectedDiagram(null);
setSelectedIrName(null);
}
};

const handleDiagramSave = useCallback(async (diagram: import("@/types/drakonwidget").DrakonDiagram) => {
if (!selectedDiagram) return false;
const updated = {
  ...selectedDiagram,
  diagram: diagram as unknown as typeof selectedDiagram.diagram,
  updatedAt: new Date().toISOString(),
};
upsertDiagramInStorage(updated);
setSelectedDiagram(updated);
// Sync to MinIO for cross-device access (skip IR diagrams)
if (selectedDiagram.folderId !== "__ir__") {
  void api.saveDiagram(selectedDiagram.folderId, selectedDiagram.id, diagram).catch(() => {
    toast.error("Збережено локально. MinIO недоступний.");
  });
}
return true;
}, [selectedDiagram]);

const currentDiagramIsIr = selectedDiagram?.folderId === "__ir__";

const handleEditInIr = async () => {
if (!selectedDiagram || currentDiagramIsIr) return;
try {
const ir = convertDiagramToIr(
selectedDiagram.diagram as unknown as import("@/types/drakonwidget").DrakonDiagram,
);
setIrSheetIr(ir);
} catch {
toast.error("Помилка конвертації IR");
}
};

const handleSaveAsPipeline = async () => {
if (!selectedDiagram || !pipelineNameInput.trim()) return;
setSavingPipeline(true);
try {
const irDiagram = convertDiagramToIr(
selectedDiagram.diagram as unknown as import("@/types/drakonwidget").DrakonDiagram,
);
const slug = pipelineNameInput
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "_")
  .replace(/[^a-z0-9_]/g, "");
await savePipeline(slug, irDiagram);
setSavePipelineOpen(false);
setPipelineNameInput("");
toast.success(`Пайплайн "${slug}" збережено`);
void navigate({ to: "/pipelines" });
} catch (e) {
toast.error("Помилка: " + (e instanceof Error ? e.message : "unknown"));
} finally {
setSavingPipeline(false);
}
};

const handleImportJson = async (event: ChangeEvent<HTMLInputElement>) => {
const file = event.target.files?.[0];
if (!file) return;
try {
const text = await file.text();
const parsed = JSON.parse(text) as Diagram["diagram"];
const id = crypto.randomUUID();
const now = new Date().toISOString();
const name =
(parsed as { name?: string }).name ||
file.name.replace(/\.(drakon\.)?json$/i, "") ||
"Imported diagram";
await api.saveDiagram(selectedFolder.slug, id, parsed);
const stored: Diagram = {
id,
folderId: selectedFolder.slug,
name,
createdAt: now,
updatedAt: now,
diagram: { ...parsed, name, items: parsed.items ?? {} },
};
upsertDiagramInStorage(stored);
setDiagrams((prev) => [stored, ...prev]);
setSelectedDiagram(stored);
toast.success("Імпорт виконано");
} catch {
toast.error("Помилка імпорту JSON");
} finally {
event.target.value = "";
}
};

const itemCount = selectedDiagram?.diagram.items
? Object.keys(selectedDiagram.diagram.items).length
: 0;
const level = selectedDiagram?.diagram.metadata?.diagramLevel;

return (
<div className="flex h-full w-full flex-col overflow-hidden md:flex-row">
<div className="flex shrink-0 border-b border-[var(--border-subtle)] md:hidden">
<button
className={cn(
"flex-1 py-2 text-[11px] font-mono uppercase tracking-widest transition-colors",
!showEditor
? "border-b-2 border-[var(--accent-amber)] text-[var(--accent-amber)]"
: "text-[var(--text-muted)]",
)}
onClick={() => setShowEditor(false)}
>
Файли
</button>
<button
className={cn(
"flex-1 py-2 text-[11px] font-mono uppercase tracking-widest transition-colors",
showEditor
? "border-b-2 border-[var(--accent-amber)] text-[var(--accent-amber)]"
: "text-[var(--text-muted)]",
)}
onClick={() => setShowEditor(true)}
disabled={!selectedDiagram}
>
Редактор
</button>
</div>
<div
className={cn(
"flex min-h-0 flex-1 flex-col overflow-hidden border-r border-[var(--border-subtle)] md:flex-none",
showEditor ? "hidden" : "flex w-full",
col2Collapsed ? "md:hidden" : "md:flex md:w-[220px] md:shrink-0",
)}
>
<div className="flex h-7 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
<button
onClick={() => handleSwitchMode("local")}
className={cn(
"flex-1 font-mono text-[9px] uppercase tracking-[0.15em] transition-colors",
viewMode === "local"
? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[inset_0_-1px_0_rgba(245,158,11,0.5)]"
: "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
)}
>
Схеми
</button>
<button
onClick={() => handleSwitchMode("ir")}
className={cn(
"flex-1 font-mono text-[9px] uppercase tracking-[0.15em] transition-colors",
viewMode === "ir"
? "text-[var(--accent-amber)] shadow-[inset_0_-1px_0_rgba(245,158,11,0.5)]"
: "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
)}
>
DRAKON IR
</button>
</div>
{viewMode === "local" ? (
<DiagramsLeftPanel
folders={folders}
diagrams={allDiagrams}
selectedFolderSlug={selectedFolderSlug}
selectedDiagramId={selectedDiagram?.id ?? null}
onSelectFolder={setSelectedFolderSlug}
onSelectDiagram={(d) => {
setSelectedFolderSlug(d.folderId);
setSelectedDiagram(d);
setShowEditor(true);
}}
onNewDiagram={openNewDiagram}
onNewFolder={() => setIsCreateFolderOpen(true)}
/>
):(
<DrakonIrPanel
onSelectDiagram={handleIrSelect}
selectedName={selectedIrName}
/>
)}
</div>

<button
type="button"
onClick={() => {
setCol2Collapsed(v => !v);
setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
}}
title={col2Collapsed ? "Показати файли" : "Сховати файли"}
className="hidden md:flex h-full w-2 shrink-0 items-center justify-center border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--accent-dim)] text-[var(--text-secondary)] hover:text-[var(--accent-amber)] transition-colors cursor-pointer"
>
{col2Collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
</button>

{/* CENTER */}
<section className={cn("flex flex-1 min-w-0 flex-col overflow-hidden", showEditor ? "flex" : "hidden md:flex")}>
<CanvasToolbar
diagramName={selectedDiagram?.name}
level={level}
cyclomaticComplexity={itemCount > 0 ? itemCount : undefined}
analysisActive={analysisOpen}
generationActive={generationOpen}
onToggleAnalysis={() =>
setAnalysisOpen((v) => {
const next = !v;
if (next) setGenerationOpen(false);
return next;
})
}
onToggleGeneration={() =>
setGenerationOpen((v) => {
const next = !v;
if (next) setAnalysisOpen(false);
return next;
})
}
onEditInIr={selectedDiagram && !currentDiagramIsIr ? handleEditInIr : undefined}
onSaveAsPipeline={selectedDiagram && !currentDiagramIsIr ? () => setSavePipelineOpen(true) : undefined}
/>

<div className="flex flex-1 min-h-0 flex-col overflow-hidden">
{/* Canvas */}
<div
className="flex-1 min-h-0 overflow-hidden bg-[var(--bg-base)]"
style={{
backgroundImage:
"radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
backgroundSize: "24px 24px",
}}
>
{selectedDiagram ? (
<DrakonEditor
key={selectedDiagram.id}
diagram={selectedDiagram.diagram as unknown as
import("@/types/drakonwidget").DrakonDiagram}
diagramId={selectedDiagram.id}
onSaveOverride={handleDiagramSave}
/>
):(
<div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
<FileCode2 className="h-10 w-10 text-[var(--text-muted)]" />
<div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
Виберіть схему зі списку зліва
</div>
<input
ref={importInputRef}
type="file"
accept=".json,.drakon.json"
className="hidden"
onChange={handleImportJson}
/>
<div className="flex gap-2 mt-2">
<button
type="button"
onClick={openNewDiagram}
className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[var(--accent-amber)] px-3 font-mono text-[11px] uppercase tracking-wider text-black active:scale-[0.96]"
>
                              • Нова схема
</button>
<button
type="button"
onClick={() => importInputRef.current?.click()}
className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-[var(--border-default)] px-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
>
Імпорт JSON
</button>
</div>
</div>
)}
</div>

{/* BOTTOM DRAWER — generation */}
<CodeGenerationPanel
open={generationOpen}
onClose={() => setGenerationOpen(false)}
diagramIr={
selectedDiagram?.diagram.items
? { items: selectedDiagram.diagram.items }
: null
}
/>
</div>
</section>

{/* RIGHT SLIDE-IN — analysis */}
<CodeAnalysisPanel
open={analysisOpen}
onClose={() => setAnalysisOpen(false)}
onImportIr={(ir) => {
const id = crypto.randomUUID();
const now = new Date().toISOString();
const stored: Diagram = {
id,
folderId: selectedFolder.slug,
name: ir.name || "imported",
createdAt: now,
updatedAt: now,
diagram: {
name: ir.name || "imported",
// eslint-disable-next-line @typescript-eslint/no-explicit-any
items: (ir.items ?? {}) as any,
},
};
upsertDiagramInStorage(stored);
setDiagrams((prev) => [stored, ...prev]);
setSelectedDiagram(stored);
toast.success(`IR імпортовано: ${ir.name}`);
}}
/>

<Dialog open={savePipelineOpen} onOpenChange={setSavePipelineOpen}>
<DialogContent className="sm:max-w-sm">
<DialogHeader>
<DialogTitle className="font-mono text-sm">Зберегти як пайплайн</DialogTitle>
</DialogHeader>
<div className="py-4">
<Input
placeholder="назва_пайплайну"
value={pipelineNameInput}
onChange={(e) => setPipelineNameInput(e.target.value)}
className="font-mono text-sm"
onKeyDown={(e) => e.key === "Enter" && void handleSaveAsPipeline()}
autoFocus
/>
</div>
<DialogFooter>
<Button variant="outline" onClick={() => setSavePipelineOpen(false)}>Скасувати</Button>
<Button onClick={() => void handleSaveAsPipeline()} disabled={!pipelineNameInput.trim() || savingPipeline}>
{savingPipeline ? "Збереження…" : "Зберегти"}
</Button>
</DialogFooter>
</DialogContent>
</Dialog>

<Sheet open={irSheetIr !== null} onOpenChange={(o) => { if (!o) setIrSheetIr(null); }}>
<SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
<SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
<SheetTitle className="font-mono text-sm">
IR — {selectedDiagram?.name}
</SheetTitle>
</SheetHeader>
<div className="flex-1 min-h-0 overflow-auto">
{irSheetIr && (
<PipelineDrakonView
ir={irSheetIr}
pipelineName={selectedDiagram?.name ?? ""}
onSave={async (updatedIr) => {
setIrSheetIr(updatedIr);
}}
/>
)}
</div>
</SheetContent>
</Sheet>

{/* New folder dialog */}
<Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
<DialogContent>
<DialogHeader>
<DialogTitle>Нова папка</DialogTitle>
</DialogHeader>
<Input
value={newFolderName}
onChange={(e) => setNewFolderName(e.target.value)}
placeholder="Назва папки"
autoFocus
/>
<DialogFooter>
<Button type="button" onClick={createFolder}>
Створити
</Button>
</DialogFooter>
</DialogContent>
</Dialog>
</div>
);
}

