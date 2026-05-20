# Lovable Prompt 45 — DevCycle State Machine + Command Center (50-point account)

## Мета
Замінити непотрібну вкладку `/sync` на Command Center для управління циклом розробки.

## Крок 1: Створити `src/context/DevCycleContext.tsx`

```tsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type WorkflowScenario = 'IDLE' | 'REFACTORING' | 'NEW_FEATURE';
export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';
export type ViewRoute = '/github' | '/diagrams' | '/code' | '/chat' | '/docs';

export interface DevStep {
  id: string;
  label: string;
  status: StepStatus;
  associatedView: ViewRoute;
  actionText?: string;
}

interface DevCycleContextValue {
  scenario: WorkflowScenario;
  steps: DevStep[];
  currentStepId: string | null;
  isPipelineActive: boolean;
  startScenario: (scenario: WorkflowScenario) => void;
  advanceStep: (stepId: string) => void;
  setStepStatus: (stepId: string, status: StepStatus) => void;
  resetCycle: () => void;
}

const DevCycleContext = createContext<DevCycleContextValue | undefined>(undefined);

const REFACTORING_STEPS: DevStep[] = [
  { id: 'r1', label: 'Select Target File', status: 'PENDING', associatedView: '/github', actionText: 'Open Repository' },
  { id: 'r2', label: 'Analyze with Claude', status: 'PENDING', associatedView: '/diagrams', actionText: 'Open Chat' },
  { id: 'r3', label: 'Generate DRAKON IR', status: 'PENDING', associatedView: '/diagrams', actionText: 'View Diagrams' },
  { id: 'r4', label: 'Refine Diagram', status: 'PENDING', associatedView: '/diagrams', actionText: 'Edit Diagram' },
  { id: 'r5', label: 'Generate & Review Code', status: 'PENDING', associatedView: '/code', actionText: 'View Code' },
];

const NEW_FEATURE_STEPS: DevStep[] = [
  { id: 'n1', label: 'Conceptualize Algorithm', status: 'PENDING', associatedView: '/diagrams', actionText: 'Open Chat' },
  { id: 'n2', label: 'Draft DRAKON Schema', status: 'PENDING', associatedView: '/diagrams', actionText: 'Open Editor' },
  { id: 'n3', label: 'Refine Diagram', status: 'PENDING', associatedView: '/diagrams', actionText: 'Edit Diagram' },
  { id: 'n4', label: 'Generate Code', status: 'PENDING', associatedView: '/code', actionText: 'Generate' },
  { id: 'n5', label: 'Review & Commit', status: 'PENDING', associatedView: '/github', actionText: 'Commit to GitHub' },
];

export const DevCycleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scenario, setScenario] = useState<WorkflowScenario>('IDLE');
  const [steps, setSteps] = useState<DevStep[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [isPipelineActive, setIsPipelineActive] = useState(false);

  const startScenario = useCallback((newScenario: WorkflowScenario) => {
    setScenario(newScenario);
    setIsPipelineActive(true);
    const template = newScenario === 'REFACTORING' ? REFACTORING_STEPS : NEW_FEATURE_STEPS;
    const initialized = template.map((s, i) => i === 0 ? { ...s, status: 'IN_PROGRESS' as StepStatus } : { ...s, status: 'PENDING' as StepStatus });
    setSteps(initialized);
    setCurrentStepId(template[0].id);
  }, []);

  const setStepStatus = useCallback((stepId: string, status: StepStatus) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status } : s));
  }, []);

  const advanceStep = useCallback((stepId: string) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === stepId);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], status: 'COMPLETED' };
      next[idx + 1] = { ...next[idx + 1], status: 'IN_PROGRESS' };
      setCurrentStepId(next[idx + 1].id);
      return next;
    });
  }, []);

  const resetCycle = useCallback(() => {
    setScenario('IDLE');
    setSteps([]);
    setCurrentStepId(null);
    setIsPipelineActive(false);
  }, []);

  const value = useMemo(() => ({
    scenario, steps, currentStepId, isPipelineActive,
    startScenario, advanceStep, setStepStatus, resetCycle,
  }), [scenario, steps, currentStepId, isPipelineActive, startScenario, advanceStep, setStepStatus, resetCycle]);

  return <DevCycleContext.Provider value={value}>{children}</DevCycleContext.Provider>;
};

export const useDevCycle = () => {
  const ctx = useContext(DevCycleContext);
  if (!ctx) throw new Error('useDevCycle must be used within DevCycleProvider');
  return ctx;
};
```

## Крок 2: Замінити `src/routes/sync.tsx` на `src/routes/devcycle.tsx`

Видали `sync.tsx`. Створи `devcycle.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useDevCycle } from '@/context/DevCycleContext';
import { useProject } from '@/context/ProjectContext';
import { CheckCircle2, Circle, ArrowRight, Activity, Terminal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/devcycle')({
  component: DevCyclePage,
});

function DevCyclePage() {
  const { scenario, steps, currentStepId, isPipelineActive, startScenario, advanceStep, resetCycle } = useDevCycle();
  const { activeProject } = useProject();
  const navigate = useNavigate();

  if (!activeProject) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-base)] font-mono text-[var(--text-muted)] text-sm">
        ⚠ Оберіть активний проект в сайдбарі
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-5 bg-[var(--bg-base)] font-mono text-[var(--text-primary)] overflow-y-auto">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-[0.12em] text-[var(--accent-amber)] uppercase">
            Dev Cycle — {activeProject.name}
          </h1>
          <p className="text-[var(--text-muted)] mt-0.5 text-[10px] tracking-wider">
            {activeProject.github ? `${activeProject.github.owner}/${activeProject.github.repo} @ ${activeProject.github.branch}` : activeProject.path}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded border font-mono tracking-wider",
            isPipelineActive
              ? "border-[var(--accent-amber)]/40 text-[var(--accent-amber)] bg-[var(--accent-dim)]"
              : "border-[var(--border-subtle)] text-[var(--text-muted)] bg-[var(--bg-surface)]"
          )}>
            <Activity className={cn("h-3 w-3", isPipelineActive && "animate-pulse")} />
            {isPipelineActive ? 'PIPELINE ACTIVE' : 'STANDBY'}
          </div>
          {isPipelineActive && (
            <button
              type="button"
              onClick={resetCycle}
              className="flex items-center gap-1 px-2 py-1.5 rounded border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] hover:text-red-400 hover:border-red-400/30 transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> RESET
            </button>
          )}
        </div>
      </div>

      {scenario === 'IDLE' ? (
        /* Scenario selector */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {[
            {
              id: 'REFACTORING' as const,
              title: 'Сценарій A — Рефакторинг',
              description: 'Існуючий код → DRAKON IR → розуміння логіки → покращений код',
              steps: ['Обрати файл', 'Аналіз з Claude', 'DRAKON схеми', 'Рефайнінг', 'Новий код'],
            },
            {
              id: 'NEW_FEATURE' as const,
              title: 'Сценарій B — Нова розробка',
              description: 'Ідея → DRAKON схема → перевірка логіки → генерація коду',
              steps: ['Концептуалізація', 'Чернетка схеми', 'Рефайнінг', 'Генерація коду', 'Комміт'],
            },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => startScenario(s.id)}
              className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-left hover:border-[var(--accent-amber)]/50 hover:bg-[var(--bg-elevated)] transition-all group"
            >
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[var(--accent-amber)]" />
                <span className="text-[12px] font-semibold text-[var(--text-primary)] uppercase tracking-wide group-hover:text-[var(--accent-amber)] transition-colors">
                  {s.title}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{s.description}</p>
              <div className="flex gap-1.5 flex-wrap">
                {s.steps.map((step, i) => (
                  <span key={i} className="rounded px-1.5 py-0.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[9px] text-[var(--text-muted)]">
                    {i + 1}. {step}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Active pipeline steps */
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
            {scenario === 'REFACTORING' ? '▶ Сценарій A: Рефакторинг' : '▶ Сценарій B: Нова розробка'}
          </p>
          {steps.map((step, i) => {
            const isActive = step.id === currentStepId;
            const isDone = step.status === 'COMPLETED';
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center justify-between rounded-[var(--radius-sm)] border px-4 py-3 transition-all",
                  isActive
                    ? "border-[var(--accent-amber)]/50 bg-[var(--bg-elevated)] shadow-[0_0_12px_rgba(245,158,11,0.08)]"
                    : isDone
                    ? "border-[var(--border-subtle)] bg-[var(--bg-base)] opacity-60"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface)] opacity-40"
                )}
              >
                <div className="flex items-center gap-3">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : isActive ? (
                    <Activity className="h-4 w-4 text-[var(--accent-amber)] animate-pulse shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                  )}
                  <span className={cn(
                    "text-[11px] font-semibold tracking-wide uppercase",
                    isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  )}>
                    {String(i + 1).padStart(2, '0')} — {step.label}
                  </span>
                </div>
                {isActive && step.actionText && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 border-[var(--accent-amber)]/50 text-[var(--accent-amber)] hover:bg-[var(--accent-amber)] hover:text-black text-[10px] uppercase tracking-wider transition-colors font-mono"
                      onClick={() => navigate({ to: step.associatedView })}
                    >
                      {step.actionText} <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] text-[var(--text-muted)] hover:text-emerald-400 font-mono"
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
    </div>
  );
}
```

## Крок 3: Оновити навігацію в `WorkspaceShell.tsx`

В масиві `RAIL_TOP` замінити:
```ts
{ to: "/sync", label: "Sync", icon: GitCompare },
```
на:
```ts
{ to: "/devcycle", label: "Dev Cycle", icon: Activity },
```

Додати імпорт `Activity` з `lucide-react` (замість або поруч з `GitCompare`).

## Крок 4: `src/main.tsx` або кореневий файл

Обгорнути додаток `DevCycleProvider` — поставити всередину `ProjectProvider`:
```tsx
<ProjectProvider>
  <DevCycleProvider>
    {/* RouterProvider або App */}
  </DevCycleProvider>
</ProjectProvider>
```

## Важливо
- Не змінювати і не видаляти `ProjectSelector`, `AgentChatPanel`, `CommandPalette`, `DevCyclePanel` (якщо є в сайдбарі)
- Іконки тільки з `lucide-react`
- CSS змінні `var(--bg-base)`, `var(--bg-surface)`, `var(--bg-elevated)`, `var(--accent-amber)`, `var(--border-subtle)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--accent-dim)`, `var(--radius-sm)` — вже визначені
