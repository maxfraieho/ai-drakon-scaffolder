import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Activity, ArrowRight, Circle, Clock3, RotateCcw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDevCycle, type WorkflowScenario } from "@/context/DevCycleContext";

const scenarioLabels: Record<WorkflowScenario, string> = {
  IDLE: "Idle",
  REFACTORING: "Refactoring",
  NEW_FEATURE: "New Feature",
};

export function DevCycleCommandCenter() {
  const navigate = useNavigate();
  const { scenario, steps, currentStepId, isPipelineActive, startScenario, advanceStep, resetCycle } = useDevCycle();

  const progress = useMemo(() => {
    if (steps.length === 0) return 0;
    const completed = steps.filter((step) => step.status === "COMPLETED").length;
    return Math.round((completed / steps.length) * 100);
  }, [steps]);

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle,#334155)] bg-[var(--bg-surface,var(--background))] p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--text-primary,var(--foreground))]">
            <Activity className="h-5 w-5 text-[var(--accent-amber,#f59e0b)]" />
            Command Center
          </h1>
          <p className="text-sm text-[var(--text-secondary,var(--muted-foreground))]">
            Керування циклом розробки AI-DRAKON.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="border border-[var(--accent-dim,#475569)] bg-transparent text-[var(--text-secondary,var(--muted-foreground))]">
            {scenarioLabels[scenario]}
          </Badge>
          <Badge className="border border-[var(--accent-dim,#475569)] bg-transparent text-[var(--text-secondary,var(--muted-foreground))]">
            {progress}%
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-[var(--accent-dim,#475569)] text-[var(--text-secondary,var(--muted-foreground))]"
            onClick={resetCycle}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          className="justify-start border-[var(--border-subtle,#334155)] bg-[var(--bg-elevated,var(--card))] text-[var(--text-primary,var(--foreground))] hover:bg-[var(--accent-dim,#1e293b)]"
          onClick={() => startScenario("REFACTORING")}
        >
          <Clock3 className="mr-2 h-4 w-4 text-[var(--accent-amber,#f59e0b)]" />
          Start Refactoring Flow
        </Button>
        <Button
          variant="outline"
          className="justify-start border-[var(--border-subtle,#334155)] bg-[var(--bg-elevated,var(--card))] text-[var(--text-primary,var(--foreground))] hover:bg-[var(--accent-dim,#1e293b)]"
          onClick={() => startScenario("NEW_FEATURE")}
        >
          <Sparkles className="mr-2 h-4 w-4 text-[var(--accent-amber,#f59e0b)]" />
          Start New Feature Flow
        </Button>
      </div>

      <Separator className="my-4 bg-[var(--border-subtle,#334155)]" />

      {scenario === "IDLE" || steps.length === 0 ? (
        <p className="text-sm text-[var(--text-muted,var(--muted-foreground))]">
          Обери сценарій, щоб запустити pipeline.
        </p>
      ) : (
        <div className="space-y-2">
          {steps.map((step, i) => {
            const isActive = step.id === currentStepId;
            const isCompleted = step.status === "COMPLETED";

            return (
              <div
                key={step.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle,#334155)] bg-[var(--bg-elevated,var(--card))] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Circle
                    className={`h-3.5 w-3.5 ${
                      isCompleted
                        ? "fill-emerald-400 text-emerald-400"
                        : isActive
                          ? "fill-[var(--accent-amber,#f59e0b)] text-[var(--accent-amber,#f59e0b)]"
                          : "text-[var(--text-muted,var(--muted-foreground))]"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium uppercase tracking-wide ${
                      isActive
                        ? "text-[var(--text-primary,var(--foreground))]"
                        : "text-[var(--text-secondary,var(--muted-foreground))]"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")} — {step.label}
                  </span>
                </div>

                {isActive && step.actionText && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 border-[var(--accent-amber,#f59e0b)]/50 text-[var(--accent-amber,#f59e0b)] hover:bg-[var(--accent-amber,#f59e0b)] hover:text-black text-[10px] uppercase tracking-wider transition-colors"
                      onClick={() => navigate({ to: step.associatedView })}
                    >
                      {step.actionText} <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] text-[var(--text-muted,var(--muted-foreground))] hover:text-emerald-400"
                      onClick={() => advanceStep(step.id)}
                    >
                      ✓ Готово
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isPipelineActive && (
        <p className="mt-3 text-xs text-[var(--text-muted,var(--muted-foreground))]">
          Pipeline active: виконуй кроки послідовно.
        </p>
      )}
    </div>
  );
}