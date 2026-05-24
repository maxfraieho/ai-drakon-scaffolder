import { useEffect, useRef } from "react";
import { type PipelineExecutionLog } from "@/hooks/usePipelineExecution";
import { Terminal, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExecutionPanelProps {
  logs: PipelineExecutionLog[];
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ExecutionPanel({
  logs,
  onClear,
  isOpen,
  onToggle,
}: ExecutionPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      className="flex flex-col border-t transition-all duration-300"
      style={{
        height: isOpen ? "280px" : "32px",
        backgroundColor: "var(--bg-base)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-primary)",
      }}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex h-8 shrink-0 cursor-pointer items-center justify-between px-3 select-none"
        style={{
          borderBottom: isOpen ? "1px solid var(--border-subtle)" : "none",
        }}
      >
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <Terminal className="h-3.5 w-3.5" />
          <span>Консоль виконання пайплайну (LangGraph SSE Stream)</span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {isOpen && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClear}
              className="h-5 px-1.5 text-[9px] font-mono text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Очистити лог
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onToggle}
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Logs Scroll Area */}
      {isOpen && (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1.5 bg-[#0a0f1d] selection:bg-accent/40"
        >
          {logs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground italic">
              Консоль пуста. Очікування запуску пайплайну...
            </div>
          ) : (
            logs.map((log, idx) => {
              let color = "#e2e8f0"; // Default white
              let prefix = "";

              if (log.type === "success") {
                color = "#10b981"; // Emerald green
                prefix = "[SUCCESS] ";
              } else if (log.type === "warning") {
                color = "var(--accent-amber)"; // Amber yellow
                prefix = "[WARNING] ";
              } else if (log.type === "error") {
                color = "#ef4444"; // Red
                prefix = "[ERROR] ";
              } else if (log.type === "node") {
                color = "#38bdf8"; // Cyan
                prefix = "[NODE Done] ";
              } else {
                prefix = "[INFO] ";
              }

              return (
                <div key={idx} className="flex gap-2 leading-relaxed">
                  <span className="text-muted-foreground select-none shrink-0">
                    [{log.timestamp}]
                  </span>
                  <span style={{ color }} className="break-all whitespace-pre-wrap">
                    {prefix}
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
