import { useEffect, useRef, useState } from "react";
import { X, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  startAnalysis,
  pollJob,
  type AnalyzeResult,
  type AnalyzedFunction,
} from "@/lib/pipeline-api";

interface CodeAnalysisPanelProps {
  open: boolean;
  onClose: () => void;
  onImportIr: (fn: AnalyzedFunction) => void;
}

type PanelStatus = "idle" | "running" | "done" | "error";

export function CodeAnalysisPanel({ open, onClose, onImportIr }: CodeAnalysisPanelProps) {
  const [code, setCode] = useState("");
  const [filePath, setFilePath] = useState("module.py");
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status !== "running") return;
    startedAtRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      if (startedAtRef.current) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast.error("Вставте Python-код для аналізу");
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("running");
    setResult(null);
    setErrorMsg("");

    try {
      const { job_id } = await startAnalysis(code, filePath || "module.py");
      let cancelled = false;
      const tick = async () => {
        try {
          const data = await pollJob<AnalyzeResult>(job_id);
          if (cancelled) return;
          if (data.status === "done") {
            cancelled = true;
            if (intervalRef.current) clearInterval(intervalRef.current);
            setStatus("done");
            setResult(data.result as AnalyzeResult);
          } else if (data.status === "error") {
            cancelled = true;
            if (intervalRef.current) clearInterval(intervalRef.current);
            setStatus("error");
            setErrorMsg(data.error || "Помилка аналізу");
          }
        } catch (e: unknown) {
          if (cancelled) return;
          cancelled = true;
          if (intervalRef.current) clearInterval(intervalRef.current);
          setStatus("error");
          setErrorMsg(e instanceof Error ? e.message : "Невідома помилка");
        }
      };
      intervalRef.current = setInterval(tick, 3000);
      void tick();
    } catch (e: unknown) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Невідома помилка");
    }
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setElapsed(0);
  };

  if (!open) return null;

  return (
    <aside
      className="flex w-[380px] shrink-0 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      aria-label="Аналіз коду"
    >
      <div className="flex h-10 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
        <span className="flex-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Аналіз коду
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити панель аналізу"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-auto p-3">
        {(status === "idle" || status === "running") && (
          <>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="# Вставте Python-код..."
              rows={10}
              className="w-full resize-y rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-base)] p-2 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-amber)] focus:outline-none"
              disabled={status === "running"}
            />
            <input
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="module.py"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-base)] px-2 py-1.5 font-mono text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-amber)] focus:outline-none"
              disabled={status === "running"}
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={status === "running"}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-black",
                status === "running"
                  ? "cursor-not-allowed bg-[var(--accent-amber)]/50"
                  : "bg-[var(--accent-amber)] active:scale-[0.96]",
              )}
            >
              {status === "running" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {elapsed}с...
                </>
              ) : (
                "Аналізувати"
              )}
            </button>
          </>
        )}

        {status === "done" && result && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {result.tree_level} — CC {result.cyclomatic_complexity}
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                Новий аналіз
              </button>
            </div>
            {result.validation_errors.length > 0 && (
              <div className="rounded-[var(--radius-sm)] border border-amber-400/20 bg-amber-400/5 px-2 py-1.5">
                <p className="font-mono text-[10px] text-amber-400">
                  {result.validation_errors.length} попередж.
                </p>
              </div>
            )}
            <ul className="flex flex-col gap-1">
              {result.drakon_ir.map((fn) => (
                <li
                  key={fn.name}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1.5"
                >
                  <span
                    className={cn(
                      "flex-1 truncate font-mono text-[11px]",
                      fn.error ? "text-red-400" : "text-[var(--text-primary)]",
                    )}
                    title={fn.name}
                  >
                    {fn.name}
                    {fn.error && <span className="ml-1 text-red-400">— помилка</span>}
                  </span>
                  {!fn.error && (
                    <button
                      type="button"
                      onClick={() => onImportIr(fn)}
                      className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--accent-amber)]"
                    >
                      <ChevronRight className="h-3 w-3" />
                      Імпортувати
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-2">
            <div className="rounded-[var(--radius-sm)] border border-red-500/20 bg-red-500/5 px-3 py-2">
              <p className="font-mono text-xs text-red-400">{errorMsg}</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-default)] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              Повторити
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
