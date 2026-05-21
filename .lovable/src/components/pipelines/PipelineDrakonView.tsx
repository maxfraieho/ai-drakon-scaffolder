import { useState, useRef } from "react";
import {
  startExecution,
  streamExecution,
  resumeExecution,
  type IrDiagram,
  type ExecutionEvent,
} from "@/lib/graph-pipeline-api";
import { NodeStateInspector } from "./NodeStateInspector";
import { Button } from "@/components/ui/button";
import { Play, StopCircle, Zap, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { convertIrToDiagram } from "@/lib/htse/ir-to-diagram";
import { upsertDiagramInStorage } from "@/lib/diagram-storage";
import type { Diagram } from "@/types/drakon";

interface Props {
  pipelineName: string;
  ir: IrDiagram;
  onSave: (ir: IrDiagram) => Promise<void>;
}

type ExecStatus = "idle" | "running" | "breakpoint" | "done" | "error";

export function PipelineDrakonView({ pipelineName, ir, onSave }: Props) {
  const navigate = useNavigate();
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ExecStatus>("idle");
  const [breakpointState, setBreakpointState] = useState<Record<string, unknown>>({});
  const [breakpointNode, setBreakpointNode] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleRun = async () => {
    try {
      const jid = await startExecution(pipelineName, {});
      setJobId(jid);
      setStatus("running");
      setActiveNode(null);
      abortRef.current = new AbortController();
      streamExecution(
        pipelineName,
        jid,
        (ev: ExecutionEvent) => {
          if (ev.event === "node_done" && ev.node) setActiveNode(ev.node);
          if (ev.event === "breakpoint") {
            setStatus("breakpoint");
            setBreakpointNode(ev.node);
            setBreakpointState(ev.state ?? {});
          }
          if (ev.event === "done") {
            setStatus("done");
            setActiveNode(null);
            toast.success("Пайплайн завершено");
          }
          if (ev.event === "error") {
            setStatus("error");
            setActiveNode(null);
            toast.error(ev.error ?? "Помилка виконання");
          }
        },
        abortRef.current.signal,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStatus("idle");
    setActiveNode(null);
    setJobId(null);
  };

  const handleResume = async (stateOverride: Record<string, unknown>) => {
    if (!jobId) return;
    setStatus("running");
    try {
      await resumeExecution(pipelineName, jobId, stateOverride);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Resume failed");
    }
  };

  const statusColors: Record<ExecStatus, string> = {
    idle: "border-[var(--border-subtle)] text-[var(--text-muted)]",
    running: "border-[var(--accent-amber)] text-[var(--accent-amber)] animate-pulse",
    breakpoint: "border-yellow-500 text-yellow-500",
    done: "border-green-500 text-green-500",
    error: "border-red-500 text-red-500",
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
        diagram: drakonDiagram,
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
        {(status === "idle" || status === "done" || status === "error") && (
          <Button
            size="sm"
            onClick={handleRun}
            className="h-7 bg-[var(--accent-amber)] text-black hover:brightness-110 text-[11px] font-mono"
          >
            <Play className="h-3 w-3 mr-1" /> Запустити
          </Button>
        )}
        {status === "running" && (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleStop}
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
            <span className="font-mono text-[10px] text-[var(--text-secondary)]">
              → {activeNode}
            </span>
          )}
          <span
            className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border ${statusColors[status]}`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* IR viewer — simple read-only JSON view until DrakonEditor is fully wired */}
        <div className="flex-1 min-w-0 relative overflow-auto p-4">
          <div className="font-mono text-[10px] text-[var(--text-secondary)] space-y-1">
            <div className="text-[var(--accent-amber)] mb-3 uppercase tracking-widest text-[9px]">
              {ir.name}
            </div>
            {Object.entries(ir.items).map(([id, item]) => (
              <div
                key={id}
                className={`flex items-center gap-2 px-2 py-1 rounded transition-all ${
                  activeNode === item.content
                    ? "bg-[var(--accent-amber)]/15 border border-[var(--accent-amber)]/40 text-[var(--accent-amber)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                <span className="w-4 text-right text-[var(--text-muted)] shrink-0">{id}</span>
                <span
                  className={`w-16 shrink-0 ${
                    item.type === "question"
                      ? "text-yellow-500"
                      : item.type === "header" || item.type === "end"
                        ? "text-[var(--text-muted)]"
                        : "text-[var(--accent-amber)]"
                  }`}
                >
                  {item.type}
                </span>
                <span className="flex-1 truncate">{item.content}</span>
                {item.one && (
                  <span className="text-[var(--text-muted)] shrink-0">→{item.one}</span>
                )}
                {item.two && (
                  <span className="text-[var(--text-muted)] shrink-0 text-yellow-600">
                    ↩{item.two}
                  </span>
                )}
                {activeNode === item.content && (
                  <Zap className="h-3 w-3 text-[var(--accent-amber)] animate-pulse shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — breakpoint inspector */}
        {status === "breakpoint" && breakpointNode && (
          <NodeStateInspector
            nodeName={breakpointNode}
            state={breakpointState}
            onResume={handleResume}
            className="w-80 shrink-0"
          />
        )}
      </div>
    </div>
  );
}
