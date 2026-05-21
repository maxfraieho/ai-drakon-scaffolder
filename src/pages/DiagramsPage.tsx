import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileCode2, Pencil } from "lucide-react";

import { CodeAnalysisPanel } from "@/components/pipeline/CodeAnalysisPanel";
import { CodeGenerationPanel } from "@/components/pipeline/CodeGenerationPanel";
import { DiagramsLeftPanel } from "@/components/workspace/DiagramsLeftPanel";
import { DrakonIrPanel } from "@/components/workspace/DrakonIrPanel";
import { cn } from "@/lib/utils";
import { CanvasToolbar } from "@/components/workspace/CanvasToolbar";
import { DrakonViewer } from "@/components/drakon/DrakonViewer";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { api } from "@/lib/api";
import { useDevCycle } from "@/context/DevCycleContext";
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

class DiagramErrorBoundary extends Component<
  { children: ReactNode; diagramId: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; diagramId: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: { children: ReactNode; diagramId: string }) {
    if (prevProps.diagramId !== this.props.diagramId && this.state.hasError) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--bg-base)] px-4 font-mono">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-error,#ffb4ab)]">
            Помилка рендерингу схеми
          </div>
          <div className="max-w-xs text-center text-[10px] text-[var(--text-muted)]">
            {this.state.error?.message || "Невідома помилка"}
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 rounded-sm border border-[var(--border-subtle)] px-3 py-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Спробувати знову
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function DiagramsPage() {
  const navigate = useNavigate();
  const { currentStepId } = useDevCycle();
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

  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [generationStatus, setGenerationStatus] = useState<"idle" | "running" | "done" | "error">("idle");

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
            /* ignore */
          }
        }
        const refreshed = readDiagramsFromStorage().filter(
          (d) => d.folderId === folderSlug,
        );
        setDiagrams(refreshed);
      }
    } catch {
      /* offline */
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

  const openInEditor = (d: Diagram) => {
    navigate({
      to: "/diagram/editor",
      search: { diagramId: d.id, folderId: selectedFolder.slug },
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

  const currentDiagramIsIr = selectedDiagram?.folderId === "__ir__";
  const suggestedAction = currentStepId?.startsWith("r3") || currentStepId?.startsWith("n2")
    ? "analysis"
    : currentStepId?.startsWith("r5") || currentStepId?.startsWith("n4")
      ? "generation"
      : null;

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
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex h-full flex-col overflow-hidden border-r border-[var(--border-subtle)]" style={{width: 220}}>
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
            }}
            onNewDiagram={openNewDiagram}
            onNewFolder={() => setIsCreateFolderOpen(true)}
          />
        ) : (
          <DrakonIrPanel
            onSelectDiagram={handleIrSelect}
            selectedName={selectedIrName}
          />
        )}
      </div>

      {/* CENTER */}
      <section className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <CanvasToolbar
          diagramName={selectedDiagram?.name}
          level={level}
          cyclomaticComplexity={itemCount > 0 ? itemCount : undefined}
          analysisActive={analysisOpen}
          generationActive={generationOpen}
          analysisSuggested={suggestedAction === "analysis"}
          generationSuggested={suggestedAction === "generation"}
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
          onEdit={selectedDiagram && !currentDiagramIsIr ? () => openInEditor(selectedDiagram) : undefined}
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
              <div className="relative h-full">
                <DiagramErrorBoundary diagramId={selectedDiagram.id}>
                  <DrakonViewer
                    key={selectedDiagram.id}
                    diagram={selectedDiagram.diagram as unknown as import("@/types/drakonwidget").DrakonDiagram}
                    diagramId={selectedDiagram.id}
                    height={9999}
                    className="h-full"
                  />
                </DiagramErrorBoundary>
                {!currentDiagramIsIr ? (
                  <button
                    type="button"
                    onClick={() => openInEditor(selectedDiagram)}
                    className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-sm bg-[var(--accent-amber)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-black shadow-lg transition-all hover:brightness-110"
                  >
                    <Pencil className="h-3 w-3" /> Редагувати
                  </button>
                ) : null}

                {(analysisStatus === "running" || generationStatus === "running") && (
                  <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-sm border border-[rgba(245,158,11,0.35)] bg-[var(--bg-surface)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent-amber)]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-amber)]" />
                    {analysisStatus === "running" ? "Pipeline A: аналіз" : "Pipeline B: генерація"}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
                <FileCode2 className="h-10 w-10 text-[var(--text-muted)]" />
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Виберіть схему зі списку зліва
                </div>
                <div className="max-w-[420px] font-mono text-[10px] text-[var(--text-secondary)]">
                  Наступний крок: створіть або імпортуйте схему, потім натисніть <span className="text-[var(--accent-amber)]">Аналізувати код</span> чи <span className="text-[var(--accent-amber)]">Генерувати код</span> у верхньому toolbar.
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
                    + Нова схема
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
            onStatusChange={setGenerationStatus}
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
        onStatusChange={setAnalysisStatus}
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
