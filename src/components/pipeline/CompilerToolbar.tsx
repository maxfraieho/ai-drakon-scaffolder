import { Search, FileCode2, Play, CheckCircle2, Rocket } from "lucide-react";

interface CompilerToolbarProps {
  onAnalyze?: () => void;
  onExportMrna?: () => void;
  onCompile?: () => void;
  disabled?: boolean;
}

interface ToolbarButton {
  label: string;
  Icon: React.FC<{ className?: string }>;
  handler?: () => void;
  sprint?: string;
}

export function CompilerToolbar({
  onAnalyze,
  onExportMrna,
  onCompile,
  disabled = false,
}: CompilerToolbarProps) {
  const buttons: ToolbarButton[] = [
    {
      label: "Analyze",
      Icon: Search,
      handler: onAnalyze,
    },
    {
      label: "Export mRNA",
      Icon: FileCode2,
      handler: onExportMrna,
    },
    {
      label: "Compile",
      Icon: Play,
      handler: onCompile,
    },
    {
      label: "Validate",
      Icon: CheckCircle2,
      sprint: "Sprint 3",
    },
    {
      label: "Deploy",
      Icon: Rocket,
      sprint: "Sprint 3",
    },
  ];

  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
      <span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
        Compiler
      </span>
      <div className="h-4 w-px bg-[var(--border-subtle)]" />
      {buttons.map(({ label, Icon, handler, sprint }) => {
        const isDisabled = disabled || !handler;
        return (
          <button
            key={label}
            type="button"
            onClick={!isDisabled ? handler : undefined}
            disabled={isDisabled}
            title={sprint ? `${label} — ${sprint}` : label}
            className={[
              "inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5",
              "font-mono text-[11px] uppercase tracking-wider",
              "transition-colors duration-150",
              isDisabled
                ? "cursor-not-allowed text-[var(--text-tertiary)] opacity-40"
                : [
                    "text-[var(--text-secondary)]",
                    "hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]",
                    "active:scale-[0.96] active:transition-transform active:duration-75",
                    handler === onCompile || handler === onAnalyze
                      ? "hover:text-amber-400"
                      : "",
                  ].join(" "),
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
