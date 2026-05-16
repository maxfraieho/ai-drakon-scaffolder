import { Code2, Edit3, Maximize2, ScanSearch, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  diagramName?: string;
  level?: string;
  cyclomaticComplexity?: number;
  analysisActive: boolean;
  generationActive: boolean;
  onToggleAnalysis: () => void;
  onToggleGeneration: () => void;
  onEdit?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFullscreen?: () => void;
}

export function CanvasToolbar({
  diagramName,
  level,
  cyclomaticComplexity,
  analysisActive,
  generationActive,
  onToggleAnalysis,
  onToggleGeneration,
  onEdit,
  onZoomIn,
  onZoomOut,
  onFullscreen,
}: CanvasToolbarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5">
      {/* Left: diagram identity */}
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "font-mono text-[11px] font-semibold truncate",
            diagramName ? "text-[var(--accent-amber)]" : "text-[var(--text-muted)] italic",
          )}
        >
          {diagramName || "схему не вибрано"}
        </span>
        {level && (
          <>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="font-mono text-[11px] text-[var(--text-secondary)]">{level}</span>
          </>
        )}
        {typeof cyclomaticComplexity === "number" && (
          <>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="font-mono text-[11px] text-[var(--text-secondary)]" data-numeric="true">
              CC:{cyclomaticComplexity}
            </span>
          </>
        )}
      </div>

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleAnalysis}
          aria-pressed={analysisActive}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-sm border px-2 font-mono text-[11px] transition-colors",
            analysisActive
              ? "border-[rgba(245,158,11,0.4)] bg-[var(--accent-dim)] text-[var(--accent-amber)]"
              : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
          )}
        >
          <ScanSearch className="h-3.5 w-3.5" />
          Аналіз
        </button>
        <button
          type="button"
          onClick={onToggleGeneration}
          aria-pressed={generationActive}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-sm border px-2 font-mono text-[11px] transition-colors",
            generationActive
              ? "border-[rgba(245,158,11,0.4)] bg-[var(--accent-dim)] text-[var(--accent-amber)]"
              : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
          )}
        >
          <Code2 className="h-3.5 w-3.5" />
          Генерація
        </button>

        <span aria-hidden="true" className="mx-1 h-4 w-px bg-[var(--border-subtle)]" />

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Редагувати схему"
            title="Редагувати"
            className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        )}
        {onZoomOut && (
          <button
            type="button"
            onClick={onZoomOut}
            aria-label="Зменшити"
            className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
        )}
        {onZoomIn && (
          <button
            type="button"
            onClick={onZoomIn}
            aria-label="Збільшити"
            className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        )}
        {onFullscreen && (
          <button
            type="button"
            onClick={onFullscreen}
            aria-label="Повний екран"
            className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
