import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { PipelineList } from "@/components/agents/PipelineList";
import { StudioToolbar } from "@/components/agents/StudioToolbar";
import { RuntimeTargetToggle } from "@/components/agents/RuntimeTargetToggle";
import { PropertiesPanel } from "@/components/agents/PropertiesPanel";
import { ExecutionPanel } from "@/components/agents/ExecutionPanel";
import { AgentChatPanel } from "@/components/agents/AgentChatPanel";
import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { getPipeline, savePipeline } from "@/lib/graph-pipeline-api";
import { convertIrToDiagram } from "@/lib/htse/ir-to-diagram";
import { convertDiagramToIr } from "@/lib/htse/diagram-to-ir";
import { usePipelineExecution } from "@/hooks/usePipelineExecution";
import { UnsavedChangesGuard } from "@/components/workspace/UnsavedChangesGuard";
import { toast } from "sonner";
import { ChevronRight, Loader2 } from "lucide-react";
import { getGithubConfig } from "@/lib/settings-storage";
import { getAccessToken } from "@/lib/auth";
import { api } from "@/lib/api";
import { resolveWorkerUrl } from "@/lib/worker-url";
import { getProject } from "@/lib/appwrite-projects";
import type { DrakonDiagram } from "@/types/drakonwidget";

export default function AgentStudioPage() {
  const { slug, agentId } = useParams({ from: "/p/$slug/agents/$agentId/studio" });

  const [selectedPipelineName, setSelectedPipelineName] = useState<string | null>(agentId);
  const [activeDiagram, setActiveDiagram] = useState<DrakonDiagram | undefined>(undefined);
  const [stateClass, setStateClass] = useState("AnalysisState");
  const [breakpoints, setBreakpoints] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [pendingPipelineName, setPendingPipelineName] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const [centerTab, setCenterTab] = useState<"graph" | "logic">("graph");
  const [logicJson, setLogicJson] = useState("");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftPanelMobileOpen, setLeftPanelMobileOpen] = useState(false);
  const [rightPanelMobileOpen, setRightPanelMobileOpen] = useState(false);
  const [runtimeTarget, setRuntimeTarget] = useState<"flue" | "eve">("flue");
  const isMobile = useIsMobile();
  const hasOpenedMobileListRef = useRef(false);

  const { data: project } = useQuery({
    queryKey: ["project", slug],
    queryFn: () => getProject(slug),
    staleTime: 5 * 60 * 1000,
  });

  // SSE Pipeline Execution Hook
  const {
    isRunning,
    activeNode,
    logs,
    breakpointNode,
    breakpointState,
    runPipeline,
    stopPipeline,
    resumePipeline,
    clearLogs,
  } = usePipelineExecution();

  // Load pipeline diagram
  useEffect(() => {
    setSelectedPipelineName(agentId);
  }, [agentId]);

  useEffect(() => {
    if (!selectedPipelineName) return;

    let active = true;
    async function load() {
      setIsLoading(true);
      setSelectedNodeId(null);
      setIsDirty(false);
      try {
        const ir = await getPipeline(selectedPipelineName!);
        if (active) {
          // Convert canonical IR to Drakon Editor runtime diagram format
          const diagram = convertIrToDiagram(ir);
          setActiveDiagram(diagram);
          
          // Load state class and initial breakpoints from schema
          const irSchema = (ir as any).schema ?? {};
          setStateClass(irSchema.state_class ?? "AnalysisState");
          setBreakpoints([]); // resets
        }
      } catch (err) {
        console.error("Failed to load pipeline IR:", err);
        toast.error("Помилка завантаження конфігурації пайплайну.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [selectedPipelineName]);

  // Sync logic JSON representation when active diagram or active tab changes
  useEffect(() => {
    if (activeDiagram && centerTab === "logic") {
      try {
        setLogicJson(JSON.stringify(convertDiagramToIr(activeDiagram), null, 2));
      } catch (err) {
        console.error("Error converting diagram to IR:", err);
      }
    }
  }, [activeDiagram, centerTab]);

  // Handle Pipeline list selection
  const handleSelectPipeline = useCallback((name: string) => {
    if (isDirty) {
      setPendingPipelineName(name);
      setShowUnsavedDialog(true);
    } else {
      setSelectedPipelineName(name);
    }
  }, [isDirty]);

  // Handle diagram name edit
  const handleChangeDiagramName = (name: string) => {
    if (!activeDiagram) return;
    setActiveDiagram({ ...activeDiagram, name });
    setIsDirty(true);
  };

  // Node property edits
  const handleUpdateNode = (id: string, updatedNode: any) => {
    if (!activeDiagram) return;
    const nextItems = { ...activeDiagram.items, [id]: updatedNode };
    setActiveDiagram({ ...activeDiagram, items: nextItems });
    setIsDirty(true);
    toast.success("Властивості вузла оновлено!");
  };

  // Diagram change on canvas
  const handleSaveOverride = async (diagramToSave: DrakonDiagram) => {
    if (!selectedPipelineName) return false;
    setIsSaving(true);
    try {
      // 1. Convert Editor diagram back to canonical IR
      const ir = convertDiagramToIr(diagramToSave);
      
      // Inject schema updates
      (ir as any).schema = {
        state_class: stateClass,
      };

      // 2. PUT request to commit changes
      await savePipeline(selectedPipelineName, ir);
      
      // Після локального save — комітимо в GitHub якщо налаштовано
      const ghCfg = getGithubConfig();
      if (ghCfg.owner && ghCfg.repo && ghCfg.token) {
        const path = `services/architect-agent/pipelines/${selectedPipelineName}.drakon.json`;
        const content = JSON.stringify(ir, null, 2);
        try {
          await api.githubCommitFile(
            ghCfg.owner,
            ghCfg.repo,
            path,
            content,
            `feat(drakon): update ${selectedPipelineName} pipeline`,
            ghCfg.branch || "main",
            ghCfg.token
          );
          toast.success("Пайплайн збережено локально + GitHub!");
        } catch (commitErr) {
          console.error("GitHub commit failed:", commitErr);
          toast.success("Пайплайн збережено локально (GitHub save failed)");
        }
      } else {
        toast.success("Пайплайн збережено локально");
      }
      
      // Update local state
      setActiveDiagram(diagramToSave);
      setIsDirty(false);
      return true;
    } catch (err) {
      console.error("Save error:", err);
      toast.error(`Помилка збереження: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Save handler for manual JSON logic editing
  const handleSaveLogicJson = async () => {
    try {
      const parsedIr = JSON.parse(logicJson);
      const diagram = convertIrToDiagram(parsedIr);
      await handleSaveOverride(diagram);
    } catch (err) {
      console.error("JSON parsing error:", err);
      toast.error(`Помилка валідації JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Manual save trigger from toolbar
  const handleManualSave = () => {
    if (!activeDiagram) return;
    handleSaveOverride(activeDiagram);
  };

  // Export pseudocode
  const handleExport = () => {
    if (!activeDiagram) return;
    const jsonStr = JSON.stringify(convertDiagramToIr(activeDiagram), null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedPipelineName || "pipeline"}.drakon.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Файл конфігурації експортовано успішно!");
  };

  // Breakpoints management
  const handleToggleBreakpoint = (nodeName: string) => {
    setBreakpoints((prev) =>
      prev.includes(nodeName) ? prev.filter((n) => n !== nodeName) : [...prev, nodeName]
    );
  };

  // Get list of action nodes in the diagram
  const getActionNodes = () => {
    if (!activeDiagram) return [];
    return Object.entries(activeDiagram.items)
      .filter(([_, item]: any) => item.type === "action" && item.content)
      .map(([id, item]: any) => ({ id, name: item.content }));
  };

  // Handle canvas selection changes
  const handleSelectionChanged = (items: any[] | null) => {
    if (items && items.length > 0) {
      setSelectedNodeId(items[0].id);
    } else {
      setSelectedNodeId(null);
    }
  };

  // Launch pipeline
  const handleRun = async () => {
    if (!selectedPipelineName) return;

    if (runtimeTarget === "eve") {
      if (!activeDiagram) {
        toast.error("Немає активної DRAKON-схеми для компіляції.");
        return;
      }

      try {
        const currentDrakonIR = convertDiagramToIr(activeDiagram);
        const token = getAccessToken();
        const response = await fetch(`${resolveWorkerUrl()}/v1/architect/compile-eve/zip`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            ir: currentDrakonIR,
            projectId: slug,
            projectName: agentId,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(errorText || `HTTP ${response.status}`);
        }

        const zipBlob = await response.blob();
        const downloadUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${agentId}-eve-agent.zip`;
        link.click();
        URL.revokeObjectURL(downloadUrl);

        toast.success("EVE agent filesystem compiled and downloaded successfully!");
      } catch (err) {
        console.error("EVE compile failed:", err);
        toast.error(`Помилка EVE-компіляції: ${err instanceof Error ? err.message : String(err)}`);
      }

      return;
    }

    setConsoleOpen(true);
    runPipeline(selectedPipelineName, {}, breakpoints);
  };

  // Resume pipeline
  const handleResume = () => {
    if (!selectedPipelineName) return;
    resumePipeline(selectedPipelineName, {});
  };

  const selectedNode = selectedNodeId && activeDiagram ? activeDiagram.items[selectedNodeId] : null;

  useEffect(() => {
    if (!isMobile || hasOpenedMobileListRef.current || selectedPipelineName) return;
    hasOpenedMobileListRef.current = true;
    setLeftPanelMobileOpen(true);
  }, [isMobile, selectedPipelineName]);

  useEffect(() => {
    if (isMobile) {
      setConsoleOpen(false);
    }
  }, [isMobile]);

  const deploymentStatus: "deployed" | "draft" | "error" = (() => {
    const rawStatus = String((project as any)?.status ?? "").toLowerCase();
    if (rawStatus === "error" || rawStatus === "failed") return "error";
    if (rawStatus === "draft" || rawStatus === "pending") return "draft";
    if (project && (project as any).exists === false) return "draft";
    return "deployed";
  })();

  const statusBadge = {
    deployed: {
      text: "● Live",
      className: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
    },
    draft: {
      text: "● Draft",
      className: "border-amber-400/30 bg-amber-500/15 text-amber-200",
    },
    error: {
      text: "● Error",
      className: "border-red-400/30 bg-red-500/15 text-red-200",
    },
  }[deploymentStatus];

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden text-xs"
      style={{
        backgroundColor: "var(--bg-base)",
        color: "var(--text-primary)",
      }}
    >
      <header className="shrink-0 border-b border-white/10 bg-slate-950/40 px-3 py-2 backdrop-blur-xl md:px-4">
        <nav className="flex flex-wrap items-center gap-1 text-[11px] text-slate-300/90">
          <Link to="/" className="transition-colors hover:text-white">
            Projects
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-500" />
          <Link to="/p/$slug/overview" params={{ slug }} className="transition-colors hover:text-white">
            {project?.name ?? slug}
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-500" />
          <Link to="/p/$slug/agents" params={{ slug }} className="transition-colors hover:text-white">
            Agents
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-500" />
          <span className="text-white">Studio</span>
        </nav>

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/p/$slug/agents"
              params={{ slug }}
              className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/10"
            >
              ← Back to Agents
            </Link>
            <span className="font-mono text-xs text-slate-100">{agentId}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadge.className}`}>
              {statusBadge.text}
            </span>
          </div>
        </div>
      </header>

      {/* 3-Column Studio Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Column 1: Pipeline Sidebar List (desktop) */}
        {!isMobile && leftPanelOpen && (
          <PipelineList
            selectedPipelineName={selectedPipelineName}
            onSelectPipeline={handleSelectPipeline}
          />
        )}

        {/* Column 2: Center Editor Arena */}
        <div className="flex flex-col flex-1 min-w-0">
          <StudioToolbar
            isRunning={isRunning}
            isSaving={isSaving}
            isDirty={isDirty}
            hasBreakpoint={!!breakpointNode}
            leftPanelOpen={leftPanelOpen}
            rightPanelOpen={rightPanelOpen}
            onStop={stopPipeline}
            onSave={handleManualSave}
            onExport={handleExport}
            onResume={handleResume}
            onToggleLeftPanel={() => setLeftPanelOpen((v) => !v)}
            onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
            onOpenLeftMobile={() => setLeftPanelMobileOpen(true)}
            onOpenRightMobile={() => setRightPanelMobileOpen(true)}
            onRun={() => {
              void handleRun();
            }}
            runLabel={runtimeTarget === "eve" ? "Compile for EVE" : "Запустити"}
            runTitle={runtimeTarget === "eve" ? "Compile for EVE" : "Запустити пайплайн"}
            rightSlot={
              <RuntimeTargetToggle
                value={runtimeTarget}
                onValueChange={setRuntimeTarget}
                disabled={isRunning || isSaving}
              />
            }
          />

          {runtimeTarget === "eve" && (
            <div className="mx-3 mt-2 rounded-xl border border-fuchsia-400/30 bg-gradient-to-r from-fuchsia-500/15 via-violet-500/15 to-purple-500/15 px-3 py-2 text-[11px] text-fuchsia-100 shadow-[0_0_28px_rgba(217,70,239,0.2)]">
              EVE target selected. Output compilation will generate Vercel EVE filesystem structure (agent/).
            </div>
          )}

          {/* Tab Bar */}
          <div
            className="flex border-b px-4 shrink-0"
            style={{
              backgroundColor: "var(--color-surface-container-high)",
              borderColor: "rgba(128, 128, 128, 0.2)"
            }}
          >
            <button
              onClick={() => setCenterTab("graph")}
              className="px-4 py-2 font-medium focus:outline-none"
              style={{
                color: "var(--text-primary)",
                borderBottom: centerTab === "graph" ? "2px solid var(--color-primary-container)" : "2px solid transparent",
                opacity: centerTab === "graph" ? 1 : 0.6,
              }}
            >
              DRAKON Logic
            </button>
            <button
              onClick={() => setCenterTab("logic")}
              className="px-4 py-2 font-medium focus:outline-none"
              style={{
                color: "var(--text-primary)",
                borderBottom: centerTab === "logic" ? "2px solid var(--color-primary-container)" : "2px solid transparent",
                opacity: centerTab === "logic" ? 1 : 0.6,
              }}
            >
              JSON
            </button>
          </div>

          {centerTab === "graph" ? (
            <div className="flex-1 relative overflow-hidden bg-muted/10">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activeDiagram && selectedPipelineName ? (
                <DrakonEditor
                  diagram={activeDiagram}
                  diagramId={selectedPipelineName}
                  onSaveOverride={handleSaveOverride}
                  onSelectionChanged={handleSelectionChanged}
                  className="h-full w-full"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground italic select-none">
                  Оберіть пайплайн із бічної панелі для редагування графа
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-4 overflow-hidden relative" style={{ backgroundColor: "var(--bg-base)" }}>
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activeDiagram && selectedPipelineName ? (
                <div className="flex flex-col h-full space-y-2">
                  <textarea
                    value={logicJson}
                    onChange={(e) => setLogicJson(e.target.value)}
                    className="flex-1 w-full p-3 font-mono text-xs rounded border focus:outline-none"
                    style={{
                      backgroundColor: "var(--color-surface-container-high)",
                      color: "var(--text-primary)",
                      borderColor: "rgba(128, 128, 128, 0.3)",
                      resize: "none"
                    }}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveLogicJson}
                      className="px-4 py-2 rounded font-medium text-xs transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: "var(--color-primary-container)",
                        color: "var(--text-primary)",
                      }}
                    >
                      Зберегти
                    </button>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground italic select-none">
                  Оберіть пайплайн із бічної панелі для редагування JSON
                </div>
              )}
            </div>
          )}
        </div>

        {/* Column 3+4: Right inspector stack (desktop) */}
        {!isMobile && rightPanelOpen && (
          <>
            <PropertiesPanel
              diagramName={activeDiagram?.name || ""}
              onChangeDiagramName={handleChangeDiagramName}
              stateClass={stateClass}
              onChangeStateClass={setStateClass}
              selectedNodeId={selectedNodeId}
              selectedNode={selectedNode}
              onUpdateNode={handleUpdateNode}
              allNodes={getActionNodes()}
              breakpoints={breakpoints}
              onToggleBreakpoint={handleToggleBreakpoint}
            />
            <AgentChatPanel className="w-[280px] shrink-0 border-l" />
          </>
        )}
      </div>

      {/* Mobile side panels */}
      <Sheet open={leftPanelMobileOpen} onOpenChange={setLeftPanelMobileOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-[340px] p-0 border-r border-[var(--border-subtle)] bg-[var(--bg-base)]">
          <PipelineList
            selectedPipelineName={selectedPipelineName}
            onSelectPipeline={(name) => {
              handleSelectPipeline(name);
              setLeftPanelMobileOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={rightPanelMobileOpen} onOpenChange={setRightPanelMobileOpen}>
        <SheetContent side="right" className="w-[92vw] max-w-[420px] p-0 border-l border-[var(--border-subtle)] bg-[var(--bg-base)]">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <PropertiesPanel
                diagramName={activeDiagram?.name || ""}
                onChangeDiagramName={handleChangeDiagramName}
                stateClass={stateClass}
                onChangeStateClass={setStateClass}
                selectedNodeId={selectedNodeId}
                selectedNode={selectedNode}
                onUpdateNode={handleUpdateNode}
                allNodes={getActionNodes()}
                breakpoints={breakpoints}
                onToggleBreakpoint={handleToggleBreakpoint}
              />
            </div>
            <div className="h-[45%] min-h-[260px] border-t border-[var(--border-subtle)]">
              <AgentChatPanel className="h-full" />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Docked Execution Log Console */}
      <ExecutionPanel
        logs={logs}
        onClear={clearLogs}
        isOpen={consoleOpen}
        onToggle={() => setConsoleOpen((v) => !v)}
      />

      <UnsavedChangesGuard isDirty={isDirty} />

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-sm uppercase tracking-wider text-[var(--accent-amber)]">
              Незбережені зміни
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[var(--text-secondary)]">
              У вашому пайплайні є незбережені зміни. Ви впевнені, що хочете перемкнутися на інший пайплайн без збереження?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel
              onClick={() => {
                setShowUnsavedDialog(false);
                setPendingPipelineName(null);
              }}
              className="border-[var(--border-default)] bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)] text-xs h-8"
            >
              Скасувати
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingPipelineName) {
                  setSelectedPipelineName(pendingPipelineName);
                  setIsDirty(false);
                }
                setShowUnsavedDialog(false);
                setPendingPipelineName(null);
              }}
              className="bg-[#ef4444] text-white hover:bg-[#ef4444]/90 text-xs h-8"
            >
              Продовжити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}