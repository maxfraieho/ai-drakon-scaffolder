import { useEffect, useRef, useState } from "react";
import { Code2, Copy, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  streamJob,
  startGeneration,
  type GenerateResult,
} from "@/lib/pipeline-api";

interface CodeGenerationPanelProps {
  open: boolean;
  onClose: () => void;
  diagramIr: object | null;
  diagramName?: string;
}

type Status = "idle" | "running" | "done" | "error";
type Lang = "python" | "typescript" | "javascript";

const LANGS: { id: Lang; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
];

export function CodeGenerationPanel({ open, onClose, diagramIr }: CodeGenerationPanelProps) {
  const [lang, setLang] = useState<Lang>("python");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => { setDescription(""); }, [diagramIr]);

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
    return streamJob<GenerateResult>(jobId, (data) => {
      if (data.status === "done") {
        setResult(data.result);
        setStatus("done");
        toast.success("Код згенеровано");
      } else if (data.status === "error") {
        setErrorMsg(data.error || "Невідома помилка");
        setStatus("error");
      }
    });
  }, [status, jobId]);

  const runGenerate = async () => {
    if (!diagramIr) {
      toast.error("Немає вибраної схеми");
      return;
    }
    setStatus("running");
    setResult(null);
    setErrorMsg("");
    try {
      const resp = await startGeneration(diagramIr, lang, description.trim());
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

  const copyCode = async () => {
    if (!result?.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
      toast.success("Скопійовано");
    } catch {
      toast.error("Не вдалося скопіювати");
    }
  };

  if (!open) return null;

  return (
    <section className="flex h-[280px] shrink-0 flex-col border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <header className="flex h-10 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="h-3.5 w-3.5 text-[var(--accent-amber)]" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Генерувати код
            </span>
          </div>
          <div className="flex items-center gap-1">
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLang(l.id)}
                className={cn(
                  "rounded-[var(--radius-sm)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  lang === l.id
                    ? "bg-[var(--accent-amber)] text-black"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
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

      <div className="flex-1 overflow-auto p-3 space-y-2">
        <div className="flex flex-col gap-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опис поведінки (необов'язково)"
            rows={1}
            disabled={status === "running"}
            className="text-xs resize-none"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={runGenerate}
              disabled={status === "running" || !diagramIr}
              className="bg-[var(--accent-amber)] text-black hover:bg-[var(--accent-amber)]/90"
            >
              {status === "running" ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Генерація… {elapsed}s
                </>
              ) : (
                <>Генерувати</>
              )}
            </Button>
            {!diagramIr ? (
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                Виберіть схему
              </span>
            ) : null}
          </div>
        </div>

        {status === "running" && (
          <div className="border border-[var(--border-default)] bg-[var(--surface-container)] p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-amber)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-amber)]" />
                </span>
                <span className="font-mono text-[11px] text-[var(--accent-amber)] uppercase font-bold tracking-wider">
                  ВИКОНУЄТЬСЯ
                </span>
              </div>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">{elapsed}s</span>
            </div>
            <div className="w-full bg-[var(--bg-base)] h-[2px] overflow-hidden">
              <div
                className="bg-[var(--accent-amber)] h-full transition-all"
                style={{ width: `${Math.min(90, elapsed * 5)}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] italic">
              Pipeline B запущено. Генерація коду з DRAKON IR...
            </p>
          </div>
        )}

        {status === "done" && result && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-3 py-2 border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="text-[16px]">✓</span>
                <span className="font-mono text-[11px] font-bold uppercase">КОД ЗГЕНЕРОВАНО</span>
                {result.syntax_errors.length === 0 ? (
                  <span className="font-mono text-[10px] text-emerald-400">syntax: OK</span>
                ) : (
                  <span className="font-mono text-[10px] text-red-400">
                    {result.syntax_errors.length} syntax помилок
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-[var(--text-muted)]">{elapsed}s · {result.iterations} ітерацій</span>
                <button
                  type="button"
                  onClick={reset}
                  className="font-mono text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase"
                >
                  Перегенерувати
                </button>
              </div>
            </div>

            <div className="relative group">
              <pre className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] p-3 font-mono text-[11px] overflow-auto max-h-[160px] text-[var(--text-primary)] leading-relaxed whitespace-pre">
                <code>{result.code}</code>
              </pre>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={copyCode}
                  className="bg-[var(--surface-container)]/80 border border-[var(--border-default)] p-1 text-[var(--text-secondary)] hover:text-[var(--accent-amber)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="border border-red-500/30 bg-red-500/5 p-3 flex flex-col gap-2">
            <p className="font-mono text-[11px] text-red-400">{errorMsg || "Помилка"}</p>
            <button
              type="button"
              onClick={reset}
              className="w-full border border-[var(--border-default)] py-1 font-mono text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-amber)] transition-colors"
            >
              Повторити
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
