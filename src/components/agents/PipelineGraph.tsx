import { cn } from "@/lib/utils";
import type { AgentPipeline } from "@/lib/agent-studio-data";

interface Props {
  pipeline: AgentPipeline;
}

export function PipelineGraph({ pipeline }: Props) {
  return (
    <div className="rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono-label uppercase text-[var(--color-on-surface-variant)]">
          LangGraph StateGraph
        </span>
        <span className="font-mono-label text-[var(--color-on-surface-variant)]">
          {pipeline.nodes.length} nodes
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pipeline.nodes.map((node, i) => {
          const isLlm = node.hasPrompt;
          return (
            <div key={node.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 rounded border px-2.5 py-1.5",
                  isLlm
                    ? "border-[var(--color-secondary-container)] bg-[color-mix(in_oklab,var(--color-secondary-container)_20%,transparent)]"
                    : "border-[color-mix(in_oklab,var(--color-tertiary)_40%,transparent)] bg-[var(--color-surface-container-low)]"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[16px]",
                    isLlm
                      ? "text-[var(--color-on-secondary-container)]"
                      : "text-[var(--color-tertiary)]"
                  )}
                >
                  {node.icon}
                </span>
                <span
                  className={cn(
                    "font-mono-code",
                    isLlm
                      ? "text-[var(--color-on-secondary-container)]"
                      : "text-[var(--color-on-surface)]"
                  )}
                >
                  {node.label}
                </span>
              </div>
              {i < pipeline.nodes.length - 1 && (
                <span className="material-symbols-outlined text-[14px] text-[var(--color-outline)]">
                  arrow_forward
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
