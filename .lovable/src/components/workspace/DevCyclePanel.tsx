import { useState } from "react";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from
"@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";

type StepStatus = "idle" | "running" | "done" | "error";

type StepKey = "analyze" | "drakon" | "document" | "review";

const STEP_META: Array<{ key: StepKey; label: string; hint: string }> = [
{ key: "analyze", label: "ANALYZE", hint: "ast → extract modules" },
{ key: "drakon", label: "DRAKON IR", hint: "generate flow diagrams" },
{ key: "document", label: "DOCUMENT", hint: "write module docs" },
{ key: "review", label: "REVIEW", hint: "open Docs / Diagrams" },
];

function StepStateMark({ status }: { status: StepStatus }) {
  if (status === "running") {
    return <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--astryx-color-brand)]" />;
  }
  if (status === "done") return <span className="font-mono text-[11px] text-[var(--astryx-text-primary)]">✓</span>;
  if (status === "error") return <span className="font-mono text-[11px] text-red-400">✗</span>;
  return <span className="font-mono text-[11px] text-[var(--astryx-text-muted)]">○</span>;
}

export function DevCyclePanel() {
const navigate = useNavigate();
const { activeProject } = useProject();
const [open, setOpen] = useState(false);
const [statuses, setStatuses] = useState<Record<StepKey, StepStatus>>({
analyze: "idle",
drakon: "idle",
document: "idle",
review: "idle",
});

const disabled = !activeProject?.slug;

const runStep = async (key: StepKey) => {
if (!activeProject?.slug) return;

setStatuses((prev) => ({ ...prev, [key]: "running" }));
try {
if (key === "analyze") await api.runArchitectAnalyze(activeProject.slug);
if (key === "drakon") await api.runDrakonGenerate(activeProject.slug);
if (key === "document") await api.runDocsDocument(activeProject.slug, "");
setStatuses((prev) => ({ ...prev, [key]: "done" }));
} catch {
setStatuses((prev) => ({ ...prev, [key]: "error" }));
}
};

const openReview = () => {
setStatuses((prev) => ({ ...prev, review: "done" }));
const target = activeProject?.hasDocs ? "/docs" : "/diagrams";
void navigate({ to: target });
};

return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-t border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-elevated)] px-2 py-1.5">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-[var(--astryx-radius-sm)] px-1 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--astryx-text-muted)] hover:bg-[var(--astryx-surface-secondary)]"
          >
            DEV CYCLE
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
          <ul className="mt-1 space-y-1">
            {STEP_META.map((step, idx) => {
              const status = statuses[step.key];
              const isReview = step.key === "review";
              const isRunning = status === "running";

              return (
                <li
                  key={step.key}
                  className="animate-in fade-in-0 slide-in-from-bottom-1 rounded-[var(--astryx-radius-sm)] border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-page)] px-2 py-1"
                  style={{ animationDelay: `${idx * 55}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[var(--astryx-color-brand)]">{idx + 1}</span>
                    <span className="font-mono text-[10px] uppercase text-[var(--astryx-text-secondary)]">{step.label}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!isReview && disabled}
                      onClick={() => (isReview ? openReview() : runStep(step.key))}
                      className="ml-auto h-5 px-1.5 font-mono text-[9px] uppercase border-[var(--astryx-border-subtle)] bg-transparent text-[var(--astryx-text-secondary)] hover:bg-[var(--astryx-surface-elevated)]"
                    >
                      {isRunning ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isReview ? (
                        <ArrowRight className="h-3 w-3" />
                      ) : (
                        "Run"
                      )}
                    </Button>
                    <StepStateMark status={status} />
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[9px] text-[var(--astryx-text-muted)]">{step.hint}</p>
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

