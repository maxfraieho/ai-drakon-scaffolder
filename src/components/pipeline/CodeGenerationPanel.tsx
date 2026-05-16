import { useEffect, useRef, useState } from "react";
import { X, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { startGeneration, pollJob, type GenerateResult } from "@/lib/pipeline-api";

type Language = "python" | "typescript" | "javascript";

interface CodeGenerationPanelProps {
  open: boolean;
  onClose: () => void;
  diagramIr: Record<string, unknown> | null;
  diagramName?: string;
}

type PanelStatus = "idle" | "running" | "done" | "error";

const LANG_LABELS: Record<Language, string> = {
  python: "Python",
  typescript: "TypeScript",
  javascript: "JavaScript",
};

export function CodeGenerationPanel({
  open,
  onClose,
  diagramIr,
  diagramName = "diagram",
}: CodeGenerationPanelProps) {
  const [language, setLanguage] = useState<Language>("python");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
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

  const handleGenerate = async () => {
    if (!diagramIr) {
      toast.error("Немає IR діаграми для генерації");
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("running");
    setResult(null);
    setErrorMsg("");

    try {
      const ir = { name: diagramName, params: "", items: diagramIr };
      const { job_id } = await startGeneration(ir, language, description);
      let cancelled = false;
      const tick = async () => {
        try {
          const data = await pollJob<GenerateResult>(job_id);
          if (cancelled) return;
          if (data.status === "done") {
            cancelled = true;
            if (intervalRef.current) clearInterval(intervalRef.current);
            setStatus("done");
            setResult(data.result as GenerateResult);
          } else if (data.status === "error") {
            cancelled = true;
            if (intervalRef.current) clearInterval(intervalRef.current);
            setStatus("error");
            setErrorMsg(data.error || "Помилка генерації");
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

  const handleCopy = async () => {
    if (!result?.code) return;
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setElapsed(0);
    setCopied(false);
  };

  if (!open) return null;

  return (
    <div
      className="flex h-[320px] shrink-0 flex-col border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      aria-label="Генерація коду"
    >
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
        <span className="flex-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Генерація коду
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити генерацію"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        {/* Left: controls */}
        <div className="flex w-48 shrink-0 flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Мова
            </label>
            <div className="flex flex-col gap-0.5">
              {(Object.keys(LANG_LABELS) as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "rounded-[var(--radius-sm)] px-2 py-1 text-left font-mono text-xs transition-colors",
                    language === lang
                      ? "bg-[var(--accent-amber)]/15 text-[var(--accent-amber)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]",
                  )}
                >
                  {LANG_LABELS[lang]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Контекст (необов.)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опис поведінки..."
              rows={3}
              disabled={status === "running"}
              className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-base)] p-1.5 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-amber)] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={status === "done" ? handleReset : handleGenerate}
            disabled={status === "running" || !diagramIr}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-black",
              status === "running" || !diagramIr
                ? "cursor-not-allowed bg-[var(--accent-amber)]/50"
                : "bg-[var(--accent-amber)] active:scale-[0.96]",
            )}
          >
            {status === "running" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {elapsed}с...
              </>
            ) : status === "done" ? (
              "Новий запит"
            ) : (
              "Генерувати"
            )}
          </button>
        </div>

        {/* Right: output */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-base)]">
          {status === "idle" && (
            <div className="flex flex-1 items-center justify-center">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {diagramIr ? "Готово до генерації" : "Відкрийте діаграму в редакторі"}
              </span>
            </div>
          )}

          {status === "running" && (
            <div className="flex flex-1 items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-amber)]" />
              <span className="font-mono text-xs text-[var(--text-muted)]">Генерація... {elapsed}с</span>
            </div>
          )}

          {status === "done" && result && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-2 py-1">
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  {result.language} · iter {result.iterations}
                  {result.syntax_errors.length > 0 && (
                    <span className="ml-2 text-amber-400">
                      {result.syntax_errors.length} попередж.
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied ? "Скопійовано" : "Копіювати"}
                </button>
              </div>
              <pre className="flex-1 overflow-auto p-2 font-mono text-xs text-[var(--text-primary)] leading-relaxed">
                {result.code}
              </pre>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-1 items-center justify-center p-3">
              <p className="font-mono text-xs text-red-400">{errorMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
