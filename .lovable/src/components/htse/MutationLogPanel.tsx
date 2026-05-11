import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { useDiagramStore } from "@/store/useDiagramStore";
import { cn } from "@/lib/utils";

export function MutationLogPanel({ className }: { className?: string }) {
  const mutationLog = useDiagramStore((s) => s.mutationLog);
  const isProcessingMutation = useDiagramStore((s) => s.isProcessingMutation);
  const mutationQueue = useDiagramStore((s) => s.mutationQueue);
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={cn("flex min-h-0 flex-col border-t border-[var(--border-subtle)]", className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label="Toggle mutation log"
        className="flex items-center justify-between px-3 py-2 transition-colors duration-150 hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Mutation Log
          </span>

          {isProcessingMutation && (
            <span
              className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-amber-400"
              aria-label="Processing mutation"
              role="status"
            />
          )}

          {mutationQueue.length > 0 && (
            <span
              className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]"
              aria-label={`${mutationQueue.length} mutations queued`}
              data-numeric="true"
            >
              +{mutationQueue.length}
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            "h-3 w-3 text-[var(--text-muted)] transition-transform duration-150",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div
          className="max-h-48 space-y-0.5 overflow-y-auto px-3 py-2"
          aria-live="polite"
          aria-label="Mutation log entries"
        >
          {mutationLog.length === 0 && (
            <p className="py-2 text-center font-mono text-[11px] text-[var(--text-muted)]">
              No mutations yet
            </p>
          )}

          {mutationLog.slice(0, 10).map((entry, i) => (
            <div
              key={`${entry.timestamp}-${i}`}
              className="flex items-start gap-2 border-b border-[var(--border-subtle)] py-1.5 font-mono text-[11px] last:border-0"
            >
              <span
                className={cn(
                  "mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full",
                  entry.status === "applied" ? "bg-green-500" : "bg-red-500",
                )}
                aria-label={entry.status === "applied" ? "Applied" : "Rejected"}
                role="status"
              />

              <span className="flex-shrink-0 tabular-nums text-[var(--text-muted)]">
                {entry.op}
              </span>

              {entry.nodeId && (
                <span className="truncate font-mono tabular-nums text-[var(--text-secondary)]">
                  {String(entry.nodeId).slice(0, 12)}
                </span>
              )}

              {entry.reason && (
                <span className="min-w-0 flex-1 truncate text-red-400" title={entry.reason}>
                  {entry.reason}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
