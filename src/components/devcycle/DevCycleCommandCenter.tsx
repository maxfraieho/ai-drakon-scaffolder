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
    <div className="astryx-migrated rounded-[var(--astryx-radius-sm)] border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)] p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--astryx-text-primary)]">
            <Activity className="h-5 w-5 text-[var(--astryx-color-brand)]" />
            Command Center
          </h1>
          <p className="text-sm text-[var(--astryx-text-secondary)]">
            Керування циклом розробки AI-DRAKON.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="border border-[var(--astryx-border-subtle)] bg-transparent text-[var(--astryx-text-secondary)]">
            {scenarioLabels[scenario]}
          </Badge>
          <Badge className="border border-[var(--astryx-border-subtle)] bg-transparent text-[var(--astryx-text-secondary)]">
            {progress}%
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-[var(--astryx-border-subtle)] text-[var(--astryx-text-secondary)]"
            onClick={resetCycle}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          className="justify-start border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-elevated)] text-[var(--astryx-text-primary)] hover:bg-[var(--astryx-surface-secondary)]"
          onClick={() => startScenario("REFACTORING")}
        >
          <Clock3 className="mr-2 h-4 w-4 text-[var(--astryx-color-brand)]" />
          Start Refactoring Flow
        </Button>
        <Button
          variant="outline"
          className="justify-start border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-elevated)] text-[var(--astryx-text-primary)] hover:bg-[var(--astryx-surface-secondary)]"
          onClick={() => startScenario("NEW_FEATURE")}
        >
          <Sparkles className="mr-2 h-4 w-4 text-[var(--astryx-color-brand)]" />
          Start New Feature Flow
        </Button>
      </div>

      <Separator className="my-4 bg-[var(--astryx-border-subtle)]" />

      {scenario === "IDLE" || steps.length === 0 ? (
        <p className="text-sm text-[var(--astryx-text-muted)]">
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--astryx-radius-sm)] border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-elevated)] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Circle
                    className={`h-3.5 w-3.5 ${
                      isCompleted
                        ? "fill-emerald-400 text-emerald-400"
                        : isActive
                          ? "fill-[var(--astryx-color-brand)] text-[var(--astryx-color-brand)]"
                          : "text-[var(--astryx-text-muted)]"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium uppercase tracking-wide ${
                      isActive
                        ? "text-[var(--astryx-text-primary)]"
                        : "text-[var(--astryx-text-secondary)]"
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
                      className="h-6 border-[var(--astryx-color-brand)]/50 text-[var(--astryx-color-brand)] hover:bg-[var(--astryx-color-brand)] hover:text-[var(--astryx-color-on-brand)] text-[10px] uppercase tracking-wider transition-colors"
                      onClick={() => navigate({ to: step.associatedView })}
                    >
                      {step.actionText} <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] text-[var(--astryx-text-muted)] hover:text-emerald-400"
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
        <p className="mt-3 text-xs text-[var(--astryx-text-muted)]">
          Pipeline active: виконуй кроки послідовно.
        </p>
      )}
    </div>
  );
}