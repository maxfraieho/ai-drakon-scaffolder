import { useState, useRef, useCallback } from "react";
import { startExecution, streamExecution, resumeExecution, type ExecutionEvent } from "@/lib/graph-pipeline-api";
import { DeterministicPipelineClient } from "@/lib/harness/pipeline-client";
import { useDiagramStore } from "@/store/useDiagramStore";
import { convertDiagramToIr } from "@/lib/htse/diagram-to-ir";

export interface PipelineExecutionLog {
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "node";
  message: string;
}

export function usePipelineExecution() {
  const [isRunning, setIsRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<PipelineExecutionLog[]>([]);
  const [breakpointNode, setBreakpointNode] = useState<string | null>(null);
  const [breakpointState, setBreakpointState] = useState<Record<string, unknown> | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [nodeVerdicts, setNodeVerdicts] = useState<Record<string, import("@/lib/harness/pipeline-client").GateVerdict[]>>({});
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const addLog = useCallback((type: PipelineExecutionLog["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, type, message }]);
  }, []);

  const stopPipeline = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
    setActiveNode(null);
    setBreakpointNode(null);
    setBreakpointState(null);
    addLog("warning", "Виконання пайплайну зупинено користувачем.");
  }, [addLog]);

  const runPipeline = useCallback(
    async (
      pipelineName: string,
      initialState: Record<string, unknown> = {},
      breakpoints: string[] = []
    ) => {
      const useDeterministic = import.meta.env.VITE_USE_DETERMINISTIC === "true";

      if (useDeterministic) {
        stopPipeline();
        setIsRunning(true);
        setError(null);
        setActiveNode(null);
        setCompletedNodes(new Set());
        setBreakpointNode(null);
        setBreakpointState(null);
        setNodeVerdicts({});
        setLogs([]);

        addLog("info", `Запуск детермінованого пайплайну '${pipelineName}'...`);
        try {
          const client = new DeterministicPipelineClient({
            workerBaseUrl: import.meta.env.VITE_WORKER_URL || "https://drakon-antigravity-worker.maxfraieho.workers.dev",
            authToken: localStorage.getItem("jwt") || undefined,
          });

          // Отримуємо поточну DrakonDiagram зі стору
          const currentDiagram = useDiagramStore.getState().currentDiagram;
          if (!currentDiagram) {
            throw new Error("Немає активної діаграми для запуску.");
          }

          // Конвертуємо у IR (канонічний формат)
          const ir = convertDiagramToIr(currentDiagram);
          
          client.execute(
            ir,
            pipelineName,
            {
              onEvent: (ev) => {
                if (ev.event === "node_start") {
                  setActiveNode(ev.node_id);
                  addLog("info", `Початок виконання вузла '${ev.node_id}'...`);
                } else if (ev.event === "node_done") {
                  setCompletedNodes((prev) => new Set(prev).add(ev.node_id));
                  if (ev.gate_verdicts) {
                    setNodeVerdicts((prev) => ({ ...prev, [ev.node_id]: ev.gate_verdicts }));
                  }
                  setActiveNode(ev.node_id); // update active node reference
                  addLog("node", `Вузол '${ev.node_id}' успішно виконано.`);
                } else if (ev.event === "breakpoint") {
                  setBreakpointNode(ev.node_id);
                  setActiveNode(null);
                  addLog("warning", `Зупинка на Точці Зупинки у вузлі '${ev.node_id}'.`);
                } else if (ev.event === "gate_blocked") {
                  addLog("error", `Блокування Gate [${ev.gate}]: ${ev.reason}`);
                }
              },
              onComplete: (events) => {
                setIsRunning(false);
                setActiveNode(null);
                addLog("success", "Детермінований пайплайн завершив виконання успішно.");
              },
              onError: (err) => {
                setIsRunning(false);
                setActiveNode(null);
                setError(err.message);
                addLog("error", `Помилка виконання: ${err.message}`);
              }
            },
            breakpoints
          );
        } catch (err) {
          setIsRunning(false);
          const errMsg = err instanceof Error ? err.message : String(err);
          setError(errMsg);
          addLog("error", `Не вдалося запустити пайплайн: ${errMsg}`);
        }
        return;
      }

      stopPipeline();
      setIsRunning(true);
      setError(null);
      setActiveNode(null);
      setCompletedNodes(new Set());
      setBreakpointNode(null);
      setBreakpointState(null);
      setLogs([]);

      addLog("info", `Запуск пайплайну '${pipelineName}'...`);
      try {
        const jId = await startExecution(pipelineName, initialState, breakpoints);
        setJobId(jId);
        addLog("info", `Пайплайн запущено. Job ID: ${jId}. Встановлено SSE підписку.`);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        streamExecution(
          pipelineName,
          jId,
          (ev: ExecutionEvent) => {
            if (ev.event === "node_done") {
              if (ev.node) {
                setCompletedNodes((prev) => new Set(prev).add(ev.node as string));
              }
              setActiveNode(ev.node);
              addLog("node", `Вузол '${ev.node}' успішно виконано.`);
              if (ev.state) {
                addLog("info", `Оновлення стану: ${JSON.stringify(ev.state)}`);
              }
            } else if (ev.event === "breakpoint") {
              setBreakpointNode(ev.node);
              setBreakpointState(ev.state ?? null);
              setActiveNode(null);
              addLog("warning", `Зупинка на Точці Зупинки (Breakpoint) у вузлі '${ev.node}'.`);
            } else if (ev.event === "done") {
              setIsRunning(false);
              setActiveNode(null);
              setBreakpointNode(null);
              setBreakpointState(null);
              addLog("success", "Пайплайн завершив виконання успішно.");
            } else if (ev.event === "error") {
              setIsRunning(false);
              setActiveNode(null);
              setBreakpointNode(null);
              setBreakpointState(null);
              setError(ev.error ?? "Невідома помилка");
              addLog("error", `Помилка виконання: ${ev.error ?? "Невідома помилка"}`);
            }
          },
          controller.signal
        );
      } catch (err) {
        setIsRunning(false);
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg);
        addLog("error", `Не вдалося запустити пайплайн: ${errMsg}`);
      }
    },
    [stopPipeline, addLog]
  );

  const resume = useCallback(
    async (pipelineName: string, stateOverride: Record<string, unknown> = {}) => {
      if (!jobId || !breakpointNode) {
        addLog("error", "Неможливо продовжити виконання: немає активної сесії або точки зупинки.");
        return;
      }

      addLog("info", `Продовження виконання з вузла '${breakpointNode}'...`);
      try {
        setBreakpointNode(null);
        setBreakpointState(null);
        await resumeExecution(pipelineName, jobId, stateOverride);
        addLog("info", "Команду на продовження відправлено успішно.");
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        addLog("error", `Не вдалося продовжити виконання: ${errMsg}`);
      }
    },
    [jobId, breakpointNode, addLog]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    isRunning,
    activeNode,
    completedNodes,
    logs,
    breakpointNode,
    breakpointState,
    nodeVerdicts,
    error,
    runPipeline,
    stopPipeline,
    resumePipeline: resume,
    clearLogs,
  };
}
