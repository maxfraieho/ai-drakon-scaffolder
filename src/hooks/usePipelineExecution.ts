import { useState, useRef, useCallback } from "react";
import {
  startExecution,
  streamExecution,
  resumeExecution,
  type ExecutionEvent,
} from "@/lib/graph-pipeline-api";

export interface PipelineExecutionLog {
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "node";
  message: string;
}

export function usePipelineExecution() {
  const [isRunning, setIsRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [logs, setLogs] = useState<PipelineExecutionLog[]>([]);
  const [breakpointNode, setBreakpointNode] = useState<string | null>(null);
  const [breakpointState, setBreakpointState] = useState<Record<string, unknown> | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
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
      stopPipeline();
      setIsRunning(true);
      setError(null);
      setActiveNode(null);
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

  return {
    isRunning,
    activeNode,
    logs,
    breakpointNode,
    breakpointState,
    error,
    runPipeline,
    stopPipeline,
    resumePipeline: resume,
  };
}
