import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, Play, StopCircle, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NodeStateInspector } from "./NodeStateInspector";
import { convertIrToDiagram } from "@/lib/htse/ir-to-diagram";
import { upsertDiagramInStorage } from "@/lib/diagram-storage";
import { usePipelineExecution } from "@/hooks/usePipelineExecution";
import type { IrDiagram } from "@/lib/graph-pipeline-api";
import type { Diagram } from "@/types/drakon";

interface Props {
  pipelineName: string;
  ir: IrDiagram;
  onSave: (ir: IrDiagram) => Promise<void>;
}

// Match a DRAKON IR node against a LangGraph node name.
// Tries: exact key match, exact content match, content includes node name.
function matchesActiveNode(itemKey: string, itemContent: string, nodeName: string): boolean {
  const n = nodeName.toLowerCase();
  return (
    itemKey.toLowerCase() === n ||
    itemContent.toLowerCase() === n ||
    itemContent.toLowerCase().includes(n)
  );
}

type ExecStatus = "idle" | "running" | "breakpoint" | "done" | "error";

export function PipelineDrakonView({ pipelineName, ir }: Props) {
  const navigate = useNavigate();

  const {
    isRunning,
    activeNode,
    completedNodes,
    breakpointNode,
    breakpointState,
    error: execError,
    runPipeline,
    stopPipeline,
    resumePipeline,
  } = usePipelineExecution();

  const status: ExecStatus = execError
    ? "error"
    : breakpointNode
      ? "breakpoint"
      : isRunning
        ? "running"
        : completedNodes.size > 0
          ? "done"
          : "idle";

  const statusColors: Record<ExecStatus, string> = {
    idle: "border-[var(--border-subtle)] text-[var(--text-muted)]",
    running: "border-[var(--accent-amber)] text-[var(--accent-amber)] animate-pulse",
    breakpoint: "border-yellow-500 text-yellow-500",
    done: "border-green-500 text-green-500",
    error: "border-red-500 text-red-500",
  };

  const handleRun = async () => {
    try {
      await runPipeline(pipelineName);
    } catch {
      toast.error("Не вдалося запустити пайплайн");
    }
  };

  const handleOpenInDiagrams = () => {
    try {
      const drakonDiagram = convertIrToDiagram(ir);
      const diagramId = `pipeline-${pipelineName}`;
      const stored: Diagram = {
        id: diagramId,
        name: ir.name,
        folderId: "general",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        diagram: drakonDiagram as unknown as Diagram["diagram"],
      };
      upsertDiagramInStorage(stored);
      localStorage.setItem("_pending_open_diagram_id", diagramId);
      void navigate({ to: "/diagrams" });
    } catch {
      toast.error("Не вдалось конвертувати у схему");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mr-2">
          {pipelineName}
        </span>

        {!isRunning && !breakpointNode && (
          <Button
            size="sm"
            onClick={handleRun}
            className="h-7 bg-[var(--accent-amber)] text-black hover:brightness-110 text-[11px] font-mono"
          >
            <Play className="h-3 w-3 mr-1" /> Запустити
          </Button>
        )}

        {isRunning && !breakpointNode && (
          <Button
            size="sm"
            variant="destructive"
            onClick={stopPipeline}
            className="h-7 text-[11px] font-mono"
          >
            <StopCircle className="h-3 w-3 mr-1" /> Зупинити
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenInDiagrams}
          title="Відкрити у редакторі схем"
          className="h-7 text-[11px] font-mono"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Схеми
        </Button>

        <div className="ml-auto flex items-center gap-3">
          {activeNode && (
            <span className="font-mono text-[10px] text-[var(--accent-amber)] animate-pulse">
              ▶ {activeNode}
            </span>
          )}
          {!isRunning && completedNodes.size > 0 && (
            <span className="font-mono text-[10px] text-green-400">
              ✓ {completedNodes.size}
            </span>
          )}
          <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border ${statusColors[status]}`}>
            {status}
          </span>
        </div>
      </div>

      {execError && (
        <div className="shrink-0 px-4 py-1.5 bg-red-950/30 border-b border-red-900/40 font-mono text-[11px] text-red-400">
          {execError}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* IR viewer with 3-state node highlighting */}
        <div className="flex-1 min-w-0 relative overflow-auto p-4">
          <div className="font-mono text-[10px] text-[var(--text-secondary)] space-y-1">
            <div className="text-[var(--accent-amber)] mb-3 uppercase tracking-widest text-[9px]">
              {ir.name}
            </div>

            {Object.entries(ir.items).map(([id, item]) => {
              const isActive =
                activeNode !== null && matchesActiveNode(id, item.content, activeNode);
              const isDone =
                !isActive &&
                [...completedNodes].some((n) => matchesActiveNode(id, item.content, n));

              return (
                <div
                  key={id}
                  className={[
                    "flex items-center gap-2 px-2 py-1 rounded transition-all duration-300",
                    isActive
                      ? "bg-[var(--accent-amber)]/15 border border-[var(--accent-amber)]/50 text-[var(--accent-amber)]"
                      : isDone
                        ? "bg-green-900/20 border border-green-700/30 text-green-400/70"
                        : "text-[var(--text-secondary)]",
                  ].join(" ")}
                >
                  <span className="w-6 text-right text-[var(--text-muted)] shrink-0 text-[9px]">
                    {id}
                  </span>
                  <span
                    className={[
                      "w-16 shrink-0",
                      item.type === "question"
                        ? "text-yellow-500"
                        : item.type === "header" || item.type === "end"
                          ? "text-[var(--text-muted)]"
                          : isActive
                            ? "text-[var(--accent-amber)]"
                            : isDone
                              ? "text-green-400/70"
                              : "text-[var(--accent-amber)]/60",
                    ].join(" ")}
                  >
                    {item.type}
                  </span>

                  <span className="flex-1 truncate">{item.content}</span>

                  {item.one && (
                    <span className="text-[var(--text-muted)] shrink-0 text-[9px]">→{item.one}</span>
                  )}
                  {item.two && (
                    <span className="text-[var(--text-muted)] shrink-0 text-yellow-600 text-[9px]">↩{item.two}</span>
                  )}

                  {isActive && <Zap className="h-3 w-3 text-[var(--accent-amber)] animate-pulse shrink-0" />}
                  {isDone && <CheckCircle2 className="h-3 w-3 text-green-500/60 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakpoint inspector */}
        {breakpointNode && breakpointState && (
          <NodeStateInspector
            nodeName={breakpointNode}
            state={breakpointState}
            onResume={(stateOverride) => void resumePipeline(pipelineName, stateOverride)}
            className="w-80 shrink-0"
          />
        )}
      </div>
    </div>
  );
}
