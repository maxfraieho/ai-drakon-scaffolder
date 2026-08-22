import { cn } from "@/lib/utils";

export interface ProvenanceChipProps {
  /** Short label shown in the chip, e.g. "runtime", "canonical", "indexed". */
  label: string;
  /** Optional short suffix, e.g. a package/service name: "policy-engine", "worker". */
  detail?: string;
  /**
   * Full explanatory text for the tooltip. Required -- callers must state
   * exactly where this data comes from rather than relying on a guessed
   * default, so this stays accurate as the underlying architecture changes.
   */
  title: string;
  className?: string;
}

/**
 * Small, purely presentational provenance/boundary label. Does not fetch,
 * compare, or infer anything -- every caller supplies its own accurate
 * label/detail/title for the specific data it renders next to.
 */
export function ProvenanceChip({ label, detail, title, className }: ProvenanceChipProps) {
  return (
    <span
      data-testid="provenance-chip"
      data-variant={label}
      data-size="sm"
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
        className,
      )}
    >
      {label}
      {detail && <span className="opacity-70">· {detail}</span>}
    </span>
  );
}
