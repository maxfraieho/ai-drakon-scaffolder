import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  AGENT_LABELS,
  type AgentPipeline,
  type AgentNode,
  type KbFile,
} from "@/lib/agent-studio-data";

interface Props {
  pipelines: AgentPipeline[];
  kbFiles: KbFile[];
  selectedPipeline: AgentPipeline;
  selectedNode: AgentNode | null;
  onSelectPipeline: (p: AgentPipeline) => void;
  onSelectNode: (n: AgentNode) => void;
  onSelectKbFile: (f: KbFile) => void;
  open?: boolean;
  onClose?: () => void;
}

export function AgentSidebar({
  pipelines,
  kbFiles,
  selectedPipeline,
  selectedNode,
  onSelectPipeline,
  onSelectNode,
  onSelectKbFile,
  open,
  onClose,
}: Props) {
  const agentKbFiles = useMemo(
    () => kbFiles.filter((f) => f.agentId === selectedPipeline.agentId),
    [kbFiles, selectedPipeline.agentId]
  );
  const agentPipelines = useMemo(
    () => pipelines.filter((p) => p.agentId === selectedPipeline.agentId),
    [pipelines, selectedPipeline.agentId]
  );

  return (
    <nav
      className={cn(
        "flex h-full w-[220px] shrink-0 flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface)] transition-transform duration-200",
        "md:relative md:translate-x-0",
        "absolute inset-y-0 left-0 z-40",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="flex flex-col gap-1 border-b border-[var(--color-outline-variant)] p-3">
        <span className="font-headline-sm text-[var(--color-primary-container)]">WORKSPACE</span>
        <span className="font-mono-label text-[var(--color-on-surface-variant)]">
          {AGENT_LABELS[selectedPipeline.agentId].label}
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <section className="border-b border-[var(--color-outline-variant)] py-1">
          <div className="px-3 py-1.5 font-mono-label uppercase text-[var(--color-on-surface-variant)]">
            Пайплайни
          </div>
          {agentPipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelectPipeline(p);
                onClose?.();
              }}
              className={cn(
                "flex w-full items-center gap-2 border-l-2 px-3 py-1.5 text-left transition-colors",
                selectedPipeline.id === p.id
                  ? "border-[var(--color-primary-container)] bg-[var(--color-surface-container-high)] text-[var(--color-primary-container)]"
                  : "border-transparent text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)]"
              )}
            >
              <span className="material-symbols-outlined text-[16px]">linear_scale</span>
              <span className="font-ui-md truncate">{p.shortName}</span>
            </button>
          ))}
        </section>

        <section className="border-b border-[var(--color-outline-variant)] py-1">
          <div className="px-3 py-1.5 font-mono-label uppercase text-[var(--color-on-surface-variant)]">
            Вузли
          </div>
          {selectedPipeline.nodes.map((n) => {
            const active = selectedNode?.id === n.id;
            return (
              <button
                key={n.id}
                onClick={() => onSelectNode(n)}
                className={cn(
                  "flex w-full items-center gap-2 border-l-2 px-3 py-1.5 text-left transition-colors",
                  active
                    ? "border-[var(--color-primary-container)] bg-[var(--color-surface-container-highest)]"
                    : "border-transparent hover:bg-[var(--color-surface-container-low)]"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[16px]",
                    n.hasPrompt
                      ? "text-[var(--color-on-secondary-container)]"
                      : "text-[var(--color-tertiary)]"
                  )}
                >
                  {n.icon}
                </span>
                <span
                  className={cn(
                    "font-mono-code flex-1 truncate",
                    active
                      ? "text-[var(--color-on-surface)]"
                      : "text-[var(--color-on-surface-variant)]"
                  )}
                >
                  {n.label}
                </span>
                {n.hasPrompt && (
                  <span className="font-mono-label text-[var(--color-on-secondary-container)]">
                    LLM
                  </span>
                )}
              </button>
            );
          })}
        </section>

        <section className="py-1">
          <div className="px-3 py-1.5 font-mono-label uppercase text-[var(--color-on-surface-variant)]">
            База знань
          </div>
          {agentKbFiles.map((f) => (
            <button
              key={f.id}
              onClick={() => onSelectKbFile(f)}
              className="flex w-full items-center gap-2 border-l-2 border-transparent px-3 py-1.5 text-left transition-colors hover:bg-[var(--color-surface-container-low)]"
            >
              <span className="material-symbols-outlined text-[16px] text-[var(--color-primary-container)]">
                description
              </span>
              <span className="font-mono-code truncate text-[var(--color-on-surface-variant)]">
                {f.filename}
              </span>
            </button>
          ))}
        </section>
      </div>
    </nav>
  );
}
