import { Button } from "@/components/ui/button";
import { Play, Square, Save, Download, RefreshCw } from "lucide-react";

interface StudioToolbarProps {
  isRunning: boolean;
  isSaving: boolean;
  isDirty: boolean;
  hasBreakpoint: boolean;
  onRun: () => void;
  onStop: () => void;
  onSave: () => void;
  onExport: () => void;
  onResume: () => void;
}

export function StudioToolbar({
  isRunning,
  isSaving,
  isDirty,
  hasBreakpoint,
  onRun,
  onStop,
  onSave,
  onExport,
  onResume,
}: StudioToolbarProps) {
  return (
    <div
      className="flex h-10 shrink-0 items-center justify-between border-b px-3"
      style={{
        backgroundColor: "var(--bg-base)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-primary)",
      }}
    >
      <div className="flex items-center gap-2">
        {!isRunning && !hasBreakpoint ? (
          <Button
            size="sm"
            onClick={onRun}
            className="flex items-center gap-1.5 h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Запустити</span>
          </Button>
        ) : hasBreakpoint ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onResume}
              className="flex items-center gap-1.5 h-7 px-2.5 text-white"
              style={{ backgroundColor: "var(--accent-amber)", color: "#111827" }}
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Продовжити</span>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onStop}
              className="flex items-center gap-1.5 h-7 px-2.5"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Зупинити</span>
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            onClick={onStop}
            className="flex items-center gap-1.5 h-7 px-2.5"
          >
            <Square className="h-3.5 w-3.5" />
            <span>Зупинити</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 h-7 px-2.5 relative border"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--bg-base)",
            color: "var(--text-primary)",
          }}
        >
          <Save className="h-3.5 w-3.5" />
          <span>Зберегти</span>
          {isDirty && (
            <span
              className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "var(--accent-amber)" }}
            />
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={onExport}
          className="flex items-center gap-1.5 h-7 px-2.5 border"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--bg-base)",
            color: "var(--text-primary)",
          }}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Експорт</span>
        </Button>
      </div>
    </div>
  );
}
