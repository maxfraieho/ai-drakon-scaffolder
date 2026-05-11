import { useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import { ValidationPanel } from "@/components/htse/ValidationPanel";
import { MutationLogPanel } from "@/components/htse/MutationLogPanel";
import { useDiagramStore } from "@/store/useDiagramStore";
import { cn } from "@/lib/utils";

export default function DiagramEditorPage() {
  const search = useSearch({ strict: false }) as {
    diagramId?: string;
    folderId?: string;
    isNew?: string;
  };

  const diagramId = search.diagramId || "";
  const folderId = search.folderId || "general";
  const isNew = search.isNew === "true";

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Editor toolbar */}
      <div className="flex h-12 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 md:px-4">
        <Link
          to="/diagrams"
          aria-label="Back to diagrams"
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back
        </Link>

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
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? "Close validation panel" : "Open validation panel"}
          aria-pressed={sidebarOpen}
          className={cn(
            "ml-auto inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
            sidebarOpen
              ? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]",
          )}
          style={{ transition: "transform 100ms, background-color 150ms, color 150ms" }}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Main + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-hidden p-3 md:p-4">
          <DrakonEditor
            diagramId={diagramId}
            folderSlug={folderId}
            isNew={isNew}
            height={600}
            onSaved={() => {}}
          />
        </div>

        <aside
          className={cn(
            "flex flex-shrink-0 flex-col overflow-hidden border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]",
            sidebarOpen ? "w-80" : "w-0",
          )}
          style={{ transitionProperty: "width", transitionDuration: "200ms" }}
          aria-hidden={!sidebarOpen}
          aria-label="Validation and mutation log"
        >
          {sidebarOpen && (
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
