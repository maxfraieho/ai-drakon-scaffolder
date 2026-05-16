import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, ScanSearch, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  streamJob,
  startAnalysis,
  type AnalyzeResult,
  type AnalyzedFunction,
} from "@/lib/pipeline-api";

interface CodeAnalysisPanelProps {
  open: boolean;
  onClose: () => void;
  onImportIr: (ir: AnalyzedFunction) => void;
}

type Status = "idle" | "running" | "done" | "error";

export function CodeAnalysisPanel({ open, onClose, onImportIr }: CodeAnalysisPanelProps) {
  const [source, setSource] = useState("");
  const [filePath, setFilePath] = useState("module.py");
  const [status, setStatus] = useState<Status>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (status !== "running" || !jobId) return;
    return streamJob<AnalyzeResult>(jobId, (data) => {
      if (data.status === "done") {
        setResult(data.result);
        setStatus("done");
        toast.success("Аналіз завершено");
      } else if (data.status === "error") {
        setErrorMsg(data.error || "Невідома помилка");
        setStatus("error");
      }
    });
  }, [status, jobId]);

  const runAnalysis = async () => {
    if (!source.trim()) {
      toast.error("Вставте код для аналізу");
      return;
    }
    setStatus("running");
    setResult(null);
    setErrorMsg("");
    try {
      const resp = await startAnalysis(source, filePath || "module.py");
      setJobId(resp.job_id);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Не вдалося запустити");
    }
  };

  const reset = () => {
    setStatus("idle");
    setJobId(null);
    setResult(null);
    setErrorMsg("");
    setElapsed(0);
  };

  if (!open) return null;

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] xl:w-[380px]">
      <header className="flex h-12 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
        <div className="flex items-center gap-2">
          <ScanSearch className="h-3.5 w-3.5 text-[var(--accent-amber)]" aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Аналіз коду
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити панель"
          className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {status === "idle" || status === "running" ? (
          <>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Шлях файлу
              </label>
              <Input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="module.py"
                disabled={status === "running"}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Python код
              </label>
              <Textarea
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="def hello():&#10;    print('hello')"
                rows={12}
                disabled={status === "running"}
                className="font-mono text-xs resize-y"
              />
            </div>
            <Button
              type="button"
              onClick={runAnalysis}
              disabled={status === "running"}
              className="w-full bg-[var(--accent-amber)] text-black hover:bg-[var(--accent-amber)]/90"
            >
              {status === "running" ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Аналіз… {elapsed}s
                </>
              ) : (
                <>Аналізувати</>
              )}
            </Button>
          </>
        ) : null}

        {status === "done" && result ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Результат · {result.tree_level} · CC {result.cyclomatic_complexity}
              </span>
              <Button variant="ghost" size="sm" onClick={reset} className="h-6 text-xs">
                Новий аналіз
              </Button>
            </div>
            <ul className="space-y-1.5">
              {result.drakon_ir.map((fn, i) => {
                const valid = !fn.error && (!fn.validation_errors || fn.validation_errors.length === 0);
                return (
                  <li
                    key={`${fn.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs text-[var(--text-primary)] truncate">
                        {fn.name}
                        {typeof fn.cyclomatic_complexity === "number" ? (
                          <span className="ml-2 text-[var(--text-muted)]">CC: {fn.cyclomatic_complexity}</span>
                        ) : null}
                        {valid ? (
                          <span className="ml-2 text-emerald-500">✓</span>
                        ) : (
                          <span className="ml-2 text-red-400">
                            — {fn.error || `${fn.validation_errors?.length ?? 0} помилок`}
                          </span>
                        )}
                      </div>
                    </div>
                    {valid ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onImportIr(fn)}
                        className="h-6 px-2 text-[11px] font-mono"
                      >
                        ↓ Імпортувати
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="space-y-2 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/5 p-3">
            <p className="font-mono text-xs text-red-400">{errorMsg || "Помилка"}</p>
            <Button variant="outline" size="sm" onClick={reset}>
              Повторити
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
