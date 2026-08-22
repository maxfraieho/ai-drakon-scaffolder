import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type WorkflowScenario = "IDLE" | "REFACTORING" | "NEW_FEATURE";
export type StepStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ERROR";
export type ViewRoute = "/github" | "/diagrams" | "/agents" | "/devcycle";

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
  {
    id: "r1",
    label: "Select Target File",
    status: "PENDING",
    associatedView: "/github",
    actionText: "Open Repository",
  },
  {
    id: "r2",
    label: "Analyze with Claude",
    status: "PENDING",
    associatedView: "/agents",
    actionText: "Open Chat",
  },
  {
    id: "r3",
    label: "Generate DRAKON IR",
    status: "PENDING",
    associatedView: "/diagrams",
    actionText: "View Diagrams",
  },
  {
    id: "r4",
    label: "Refine Diagram",
    status: "PENDING",
    associatedView: "/diagrams",
    actionText: "Edit Diagram",
  },
  {
    id: "r5",
    label: "Generate & Review Code",
    status: "PENDING",
    associatedView: "/github",
    actionText: "Review in GitHub",
  },
];

const NEW_FEATURE_STEPS: DevStep[] = [
  {
    id: "n1",
    label: "Conceptualize Algorithm",
    status: "PENDING",
    associatedView: "/agents",
    actionText: "Open Chat",
  },
  {
    id: "n2",
    label: "Draft DRAKON Schema",
    status: "PENDING",
    associatedView: "/diagrams",
    actionText: "Open Editor",
  },
  {
    id: "n3",
    label: "Refine Diagram",
    status: "PENDING",
    associatedView: "/diagrams",
    actionText: "Edit Diagram",
  },
  {
    id: "n4",
    label: "Generate Code",
    status: "PENDING",
    associatedView: "/diagrams",
    actionText: "Open Generation",
  },
  {
    id: "n5",
    label: "Review & Commit",
    status: "PENDING",
    associatedView: "/github",
    actionText: "Open Repository",
  },
];

const cloneSteps = (steps: DevStep[]) => steps.map((step) => ({ ...step }));

export function DevCycleProvider({ children }: { children: React.ReactNode }) {
  const [scenario, setScenario] = useState<WorkflowScenario>("IDLE");
  const [steps, setSteps] = useState<DevStep[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [isPipelineActive, setIsPipelineActive] = useState(false);

  const startScenario = useCallback((nextScenario: WorkflowScenario) => {
    if (nextScenario === "IDLE") {
      setScenario("IDLE");
      setSteps([]);
      setCurrentStepId(null);
      setIsPipelineActive(false);
      return;
    }

    const baseSteps =
      nextScenario === "REFACTORING" ? cloneSteps(REFACTORING_STEPS) : cloneSteps(NEW_FEATURE_STEPS);

    if (baseSteps[0]) {
      baseSteps[0].status = "IN_PROGRESS";
    }

    setScenario(nextScenario);
    setSteps(baseSteps);
    setCurrentStepId(baseSteps[0]?.id ?? null);
    setIsPipelineActive(true);
  }, []);

  const setStepStatus = useCallback((stepId: string, status: StepStatus) => {
    setSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, status } : step)));
  }, []);

  const advanceStep = useCallback((stepId: string) => {
    setSteps((prev) => {
      const idx = prev.findIndex((step) => step.id === stepId);
      if (idx === -1) return prev;

      const next = prev.map((step, i) => {
        if (i === idx) return { ...step, status: "COMPLETED" as StepStatus };
        if (i === idx + 1 && step.status === "PENDING") return { ...step, status: "IN_PROGRESS" as StepStatus };
        return step;
      });

      const nextStep = next[idx + 1];
      setCurrentStepId(nextStep?.id ?? null);
      setIsPipelineActive(Boolean(nextStep));

      return next;
    });
  }, []);

  const resetCycle = useCallback(() => {
    setScenario("IDLE");
    setSteps([]);
    setCurrentStepId(null);
    setIsPipelineActive(false);
  }, []);

  const value = useMemo<DevCycleContextValue>(
    () => ({
      scenario,
      steps,
      currentStepId,
      isPipelineActive,
      startScenario,
      advanceStep,
      setStepStatus,
      resetCycle,
    }),
    [
      scenario,
      steps,
      currentStepId,
      isPipelineActive,
      startScenario,
      advanceStep,
      setStepStatus,
      resetCycle,
    ],
  );

  return <DevCycleContext.Provider value={value}>{children}</DevCycleContext.Provider>;
}

export function useDevCycle() {
  const context = useContext(DevCycleContext);
  if (!context) {
    throw new Error("useDevCycle must be used within DevCycleProvider");
  }
  return context;
}