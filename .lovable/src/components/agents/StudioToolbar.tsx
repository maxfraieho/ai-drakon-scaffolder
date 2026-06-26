import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, Save, Download, RefreshCw, PanelLeft, PanelRight } from "lucide-react";

interface StudioToolbarProps {
  isRunning: boolean;
  isSaving: boolean;
  isDirty: boolean;
  hasBreakpoint: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onRun: () => void;
  onStop: () => void;
  onSave: () => void;
  onExport: () => void;
  onResume: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onOpenLeftMobile: () => void;
  onOpenRightMobile: () => void;
  runLabel?: string;
  runTitle?: string;
  rightSlot?: ReactNode;
}

export function StudioToolbar({
  isRunning,
  isSaving,
  isDirty,
  hasBreakpoint,
  leftPanelOpen,
  rightPanelOpen,
  onRun,
  onStop,
  onSave,
  onExport,
  onResume,
  onToggleLeftPanel,
  onToggleRightPanel,
  onOpenLeftMobile,
  onOpenRightMobile,
  runLabel = "Запустити",
  runTitle = "Запустити пайплайн",
  rightSlot,
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
            className="flex items-center gap-1.5 h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            title={runTitle}
          >
            <Play className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{runLabel}</span>
          </Button>
        ) : hasBreakpoint ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onResume}
              className="flex items-center gap-1.5 h-7 px-2 text-white"
              style={{ backgroundColor: "var(--accent-amber)", color: "#111827" }}
              title="Продовжити"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden md:inline">Продовжити</span>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onStop}
              className="flex items-center gap-1.5 h-7 px-2"
              title="Зупинити"
            >
              <Square className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Зупинити</span>
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            onClick={onStop}
            className="flex items-center gap-1.5 h-7 px-2"
            title="Зупинити"
          >
            <Square className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Зупинити</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={onToggleLeftPanel} className="h-7 px-2" title="Панель пайплайнів">
            <PanelLeft className="h-3.5 w-3.5" />
            <span>{leftPanelOpen ? "Сховати" : "Показати"}</span>
          </Button>
          <Button size="sm" variant="outline" onClick={onToggleRightPanel} className="h-7 px-2" title="Панелі праворуч">
            <PanelRight className="h-3.5 w-3.5" />
            <span>Агенти</span>
          </Button>
        </div>

        <div className="flex md:hidden items-center gap-1">
          <Button size="sm" variant="outline" onClick={onOpenLeftMobile} className="h-7 px-2" title="Панель пайплайнів">
            <PanelLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Пайплайни</span>
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenRightMobile} className="h-7 px-2" title="Панелі праворуч">
            <PanelRight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Агенти</span>
          </Button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 h-7 px-2 relative border"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--bg-base)",
            color: "var(--text-primary)",
          }}
          title="Зберегти пайплайн"
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Зберегти</span>
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
          className="flex items-center gap-1.5 h-7 px-2 border"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--bg-base)",
            color: "var(--text-primary)",
          }}
          title="Експортувати конфігурацію JSON"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Експорт</span>
        </Button>

        {rightSlot}
      </div>
    </div>
  );
}
