import { useState, useEffect, useCallback } from "react";
import { PipelineList } from "@/components/agents/PipelineList";
import { StudioToolbar } from "@/components/agents/StudioToolbar";
import { PropertiesPanel } from "@/components/agents/PropertiesPanel";
import { ExecutionPanel } from "@/components/agents/ExecutionPanel";
import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import { getPipeline, savePipeline } from "@/lib/graph-pipeline-api";
import { convertIrToDiagram, convertDiagramToIr } from "@/lib/htse/ir-to-diagram";
import { usePipelineExecution } from "@/hooks/usePipelineExecution";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { DrakonDiagram } from "@/types/drakonwidget";

export default function AgentStudioPage() {
  const [selectedPipelineName, setSelectedPipelineName] = useState<string | null>(null);
  const [activeDiagram, setActiveDiagram] = useState<DrakonDiagram | undefined>(undefined);
  const [stateClass, setStateClass] = useState("AnalysisState");
  const [breakpoints, setBreakpoints] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);

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
  } = usePipelineExecution();

  // Load pipeline diagram
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

  // Handle Pipeline list selection
  const handleSelectPipeline = useCallback((name: string) => {
    if (isDirty) {
      if (!confirm("У вас є незбережені зміни. Бажаєте продовжити без збереження?")) {
        return;
      }
    }
    setSelectedPipelineName(name);
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
      
      // Update local state
      setActiveDiagram(diagramToSave);
      setIsDirty(false);
      toast.success("Пайплайн успішно збережено та скомпільовано на бекенді!");
      return true;
    } catch (err) {
      console.error("Save error:", err);
      toast.error(`Помилка збереження: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setIsSaving(false);
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
  const handleRun = () => {
    if (!selectedPipelineName) return;
    setConsoleOpen(true);
    runPipeline(selectedPipelineName, {}, breakpoints);
  };

  // Resume pipeline
  const handleResume = () => {
    if (!selectedPipelineName) return;
    resumePipeline(selectedPipelineName, {});
  };

  const selectedNode = selectedNodeId && activeDiagram ? activeDiagram.items[selectedNodeId] : null;

  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden text-xs"
      style={{
        backgroundColor: "var(--bg-base)",
        color: "var(--text-primary)",
      }}
    >
      {/* 3-Column Studio Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Column 1: Pipeline Sidebar List */}
        <PipelineList
          selectedPipelineName={selectedPipelineName}
          onSelectPipeline={handleSelectPipeline}
        />

        {/* Column 2: Center Editor Arena */}
        <div className="flex flex-col flex-1 min-w-0">
          <StudioToolbar
            isRunning={isRunning}
            isSaving={isSaving}
            isDirty={isDirty}
            hasBreakpoint={!!breakpointNode}
            onRun={handleRun}
            onStop={stopPipeline}
            onSave={handleManualSave}
            onExport={handleExport}
            onResume={handleResume}
          />

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
        </div>

        {/* Column 3: Properties Sidebar Inspector */}
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

      {/* Docked Execution Log Console */}
      <ExecutionPanel
        logs={logs}
        onClear={() => {}}
        isOpen={consoleOpen}
        onToggle={() => setConsoleOpen((v) => !v)}
      />
    </div>
  );
}
