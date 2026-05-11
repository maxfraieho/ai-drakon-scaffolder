import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, FolderTree, PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import { GitHubPanel } from "@/components/github/GitHubPanel";
import { ValidationPanel } from "@/components/htse/ValidationPanel";
import { MutationLogPanel } from "@/components/htse/MutationLogPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useDiagramStore } from "@/store/useDiagramStore";
import { readDiagramsFromStorage } from "@/lib/diagram-storage";
import { cn } from "@/lib/utils";

export default function DiagramEditorPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    diagramId?: string;
    folderId?: string;
    isNew?: string;
  };

  const diagramId = search.diagramId || "";
  const folderId = search.folderId || "general";
  const isNew = search.isNew === "true";

  const diagramData = useMemo(() => {
    if (isNew || !diagramId) return undefined;
    const stored = readDiagramsFromStorage().find((d) => d.id === diagramId);
    return stored?.diagram;
  }, [isNew, diagramId]);

  // DEBUG START — temporary instrumentation
  const [debugInfo, setDebugInfo] = useState<string>("initializing...");
  useEffect(() => {
    const stored = readDiagramsFromStorage().find((d) => d.id === diagramId);
    const info = {
      url: typeof window !== "undefined" ? window.location.pathname + window.location.search : "ssr",
      diagramId,
      folderId,
      isNew,
      foundInStorage: !!stored,
      storedName: stored?.name,
      diagramKeys: stored?.diagram ? Object.keys(stored.diagram) : null,
      itemCount: stored?.diagram?.items ? Object.keys(stored.diagram.items).length : null,
    };
    setDebugInfo(JSON.stringify(info, null, 2));
    console.log("[DEP] DiagramEditorPage mounted", info);
  }, [diagramId, folderId, isNew]);
  // DEBUG END

  const [validationOpen, setValidationOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false); // desktop left rail
  const [filesSheetOpen, setFilesSheetOpen] = useState(false); // mobile sheet

  const handleSelectPath = async (path: string, type: "file" | "dir") => {
    try {
      await navigator.clipboard.writeText(path);
      toast.success(`Скопійовано шлях: ${path}`);
    } catch {
      toast.success(`Обрано: ${path}`);
    }
    if (type === "file") {
      setFilesSheetOpen(false);
    }
  };

  const handleAnalyzeFolder = (path: string) => {
    navigate({
      to: "/diagrams",
      search: {
        autoAnalyze: "true",
        analyzePath: path || "src",
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Editor toolbar */}
      <div className="flex h-12 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 md:px-4">
        <Link
          to="/diagrams"
          aria-label="Back to diagrams"
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back
        </Link>

        {/* Desktop: toggle left files rail */}
        <button
          type="button"
          onClick={() => setFilesOpen((v) => !v)}
          aria-label={filesOpen ? "Сховати файли" : "Показати файли"}
          aria-pressed={filesOpen}
          title="Файловий менеджер"
          className={cn(
            "hidden md:inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-sm",
            filesOpen
              ? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]",
          )}
        >
          {filesOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          <span className="hidden lg:inline">Файли</span>
        </button>

        {/* Mobile: open files sheet */}
        <Sheet open={filesSheetOpen} onOpenChange={setFilesSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Відкрити файловий менеджер"
              title="Файли"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <FolderTree className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[88vw] max-w-sm border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0"
          >
            <SheetHeader className="border-b border-[var(--border-subtle)] px-4 py-3">
              <SheetTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Файловий менеджер
              </SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100vh-56px)] overflow-auto p-3">
              <GitHubPanel
                onSelectPath={handleSelectPath}
                onAnalyzeFolder={(p) => {
                  setFilesSheetOpen(false);
                  handleAnalyzeFolder(p);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {isNew ? "New" : "Edit"}
          </span>
          {!isNew && diagramId && (
            <span
              className="truncate font-mono text-[11px] tabular-nums text-[var(--text-secondary)]"
              title={diagramId}
              data-numeric="true"
            >
              {diagramId.slice(0, 12)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setValidationOpen((v) => !v)}
          aria-label={validationOpen ? "Close validation panel" : "Open validation panel"}
          aria-pressed={validationOpen}
          title="Валідація"
          className={cn(
            "ml-auto inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
            validationOpen
              ? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]",
          )}
          style={{ transition: "transform 100ms, background-color 150ms, color 150ms" }}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Main + sidebars */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop left files rail */}
        <aside
          className={cn(
            "hidden md:flex flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]",
            filesOpen ? "w-72 lg:w-80" : "w-0",
          )}
          style={{ transitionProperty: "width", transitionDuration: "200ms" }}
          aria-hidden={!filesOpen}
          aria-label="Файловий менеджер"
        >
          {filesOpen && (
            <div className="flex h-full flex-col">
              <div className="flex h-10 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Files
                </span>
              </div>
              <div className="flex-1 overflow-auto p-3">
                <GitHubPanel
                  onSelectPath={handleSelectPath}
                  onAnalyzeFolder={handleAnalyzeFolder}
                />
              </div>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden p-3 md:p-4">
          {/* DEBUG */}
          <pre style={{fontSize: 10, background: '#1a1a2e', color: '#00ff00', padding: 8, margin: '0 0 8px 0', borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>
            DEP debug: {debugInfo}
          </pre>
          <DrakonEditor
            diagramId={diagramId}
            folderSlug={folderId}
            isNew={isNew}
            diagram={diagramData as never}
            height={600}
            onSaved={() => {}}
          />
        </div>

        <aside
          className={cn(
            "flex flex-shrink-0 flex-col overflow-hidden border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]",
            validationOpen ? "w-80" : "w-0",
          )}
          style={{ transitionProperty: "width", transitionDuration: "200ms" }}
          aria-hidden={!validationOpen}
          aria-label="Validation and mutation log"
        >
          {validationOpen && (
            <>
              <ValidationPanel
                className="flex-shrink-0"
                onApplySafe={(ops) => {
                  ops.forEach((op) => useDiagramStore.getState().enqueueMutation(op));
                }}
              />
              <MutationLogPanel className="flex-1 min-h-0" />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
