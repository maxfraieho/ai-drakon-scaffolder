import { cn } from "@/lib/utils";
import type { AgentNode } from "@/lib/agent-studio-data";

interface Props {
  node: AgentNode;
  selected: boolean;
  onClick: () => void;
}

export function NodeCard({ node, selected, onClick }: Props) {
  const isLlm = node.hasPrompt;
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded border bg-[var(--color-surface)] px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-[var(--color-primary-container)] bg-[var(--color-surface-container-high)]"
          : "border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-low)]"
      )}
    >
      <span
        className={cn(
          "material-symbols-outlined shrink-0 text-[20px]",
          isLlm ? "text-[var(--color-on-secondary-container)]" : "text-[var(--color-tertiary)]"
        )}
      >
        {node.icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono-code text-[var(--color-on-surface)] truncate">
            {node.label}
          </span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-mono-label uppercase",
              isLlm
                ? "bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]"
                : "bg-[var(--color-surface-container-high)] text-[var(--color-tertiary)]"
            )}
          >
            {isLlm ? "LLM" : "DET"}
          </span>
        </div>
        <p className="font-ui-sm text-[var(--color-on-surface-variant)] line-clamp-2">
          {node.description}
        </p>
      </div>
      <span
        className={cn(
          "material-symbols-outlined shrink-0 text-[18px] text-[var(--color-on-surface-variant)] transition-transform",
          selected && "rotate-90 text-[var(--color-primary-container)]"
        )}
      >
        chevron_right
      </span>
    </button>
  );
}
