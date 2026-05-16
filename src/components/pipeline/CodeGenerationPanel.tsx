import { useEffect, useRef, useState } from "react";
import { Code2, Copy, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  pollJob,
  startGeneration,
  type GenerateResult,
} from "@/lib/pipeline-api";

interface CodeGenerationPanelProps {
  open: boolean;
  onClose: () => void;
  diagramIr: object | null;
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
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await pollJob<GenerateResult>(jobId);
        if (cancelled) return;
        if (data.status === "done") {
          setResult(data.result);
          setStatus("done");
          toast.success("Код згенеровано");
        } else if (data.status === "error") {
          setErrorMsg(data.error || "Невідома помилка");
          setStatus("error");
        }
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Помилка статусу");
        setStatus("error");
      }
    };
    const id = setInterval(tick, 3000);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
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

      <div className="flex-1 overflow-auto p-3">
        {status === "idle" || status === "running" ? (
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
        ) : null}

        {status === "done" && result ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  {result.language} · ітерацій: {result.iterations}
                </span>
                {result.syntax_errors.length === 0 ? (
                  <span className="font-mono text-[10px] text-emerald-500">syntax: ✓</span>
                ) : (
                  <span className="font-mono text-[10px] text-red-400">
                    syntax: {result.syntax_errors.length} помилок
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={copyCode} className="h-6 text-[11px]">
                  <Copy className="mr-1 h-3 w-3" />
                  Копіювати
                </Button>
                <Button variant="ghost" size="sm" onClick={reset} className="h-6 text-[11px]">
                  Перегенерувати
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline-offset-2 hover:underline"
                >
                  Закрити
                </button>
              </div>
            </div>
            <pre className="font-mono text-xs bg-[var(--bg-base)] p-3 rounded-[var(--radius-sm)] overflow-auto max-h-[180px] w-full border border-[var(--border-subtle)]">
              <code>{result.code}</code>
            </pre>
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
    </section>
  );
}
