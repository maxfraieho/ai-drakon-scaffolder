import { useState, useRef, useCallback } from "react";
import {
  Check, ChevronRight, Copy, Loader2, Play,
  RefreshCw, RotateCcw, Lightbulb, Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  startAnalysis, startGeneration, pollJob,
  type AnalyzeResult, type GenerateResult, type AnalyzedFunction,
} from "@/lib/pipeline-api";
import { sendToAgent } from "@/lib/agent-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type Scenario = "A" | "B";

type StepIdA = "code" | "analyze" | "ir" | "edit" | "generate" | "result";
type StepIdB = "idea" | "ir-gen" | "edit" | "generate" | "result";
type StepId = StepIdA | StepIdB;

interface Step { id: StepId; label: string; sublabel: string; }

const STEPS_A: Step[] = [
  { id: "code",     label: "Код",         sublabel: "Вхідний код" },
  { id: "analyze",  label: "Аналіз",      sublabel: "CC + функції" },
  { id: "ir",       label: "IR",           sublabel: "Intermediate repr." },
  { id: "edit",     label: "Редагування", sublabel: "Правки IR" },
  { id: "generate", label: "Генерація",   sublabel: "Код з IR" },
  { id: "result",   label: "Результат",   sublabel: "Готовий код" },
];

const STEPS_B: Step[] = [
  { id: "idea",     label: "Ідея",        sublabel: "Опис фічі" },
  { id: "ir-gen",   label: "IR",           sublabel: "Генерація структури" },
  { id: "edit",     label: "Редагування", sublabel: "Правки IR" },
  { id: "generate", label: "Генерація",   sublabel: "Код з IR" },
  { id: "result",   label: "Результат",   sublabel: "Готовий код" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractJson(text: string): object | null {
  try { return JSON.parse(text.trim()); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch {} }
  const start = text.search(/[{[]/);
  if (start !== -1) {
    // Try progressively shorter substrings from the end
    for (let end = text.length; end > start; end--) {
      try { return JSON.parse(text.slice(start, end)); } catch {}
    }
  }
  return null;
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ step, index, steps, currentStep, doneSteps }: {
  step: Step; index: number; steps: Step[];
  currentStep: StepId; doneSteps: Set<StepId>;
}) {
  const isDone = doneSteps.has(step.id);
  const isActive = step.id === currentStep;
  const isLast = index === steps.length - 1;
  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center gap-2.5 px-2 py-1">
        <div className={cn(
          "h-5 w-5 shrink-0 rounded-full flex items-center justify-center font-mono text-[9px] border transition-all duration-200",
          isDone ? "bg-green-500/15 border-green-500/60 text-green-400"
          : isActive ? "bg-[var(--accent-amber)] border-[var(--accent-amber)] text-[#1a0a00] shadow-[0_0_6px_var(--accent-amber)]"
          : "bg-transparent border-[var(--border-subtle)] text-[var(--text-muted)]",
        )}>
          {isDone ? <Check className="h-2.5 w-2.5" /> : index + 1}
        </div>
        <div className="min-w-0">
          <div className={cn(
            "font-mono text-[11px] leading-tight",
            isActive ? "text-[var(--accent-amber)]"
            : isDone ? "text-[var(--text-secondary)]"
            : "text-[var(--text-muted)]",
          )}>
            {step.label}
          </div>
          <div className="font-mono text-[9px] text-[var(--text-muted)] truncate">{step.sublabel}</div>
        </div>
        {isActive && <ChevronRight className="h-3 w-3 text-[var(--accent-amber)] ml-auto shrink-0" />}
      </div>
      {!isLast && (
        <div className={cn("w-px h-4 ml-4", isDone ? "bg-green-500/40" : "bg-[var(--border-subtle)]")}
          style={{ borderLeft: "1px dashed" }} />
      )}
    </div>
  );
}

// ── Scenario A panels ──────────────────────────────────────────────────────────

function PanelCode({ code, setCode, filePath, setFilePath, onNext, loading }: {
  code: string; setCode: (v: string) => void;
  filePath: string; setFilePath: (v: string) => void;
  onNext: () => void; loading: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Code2 className="h-3 w-3 text-[var(--accent-amber)]" />
        <input value={filePath} onChange={(e) => setFilePath(e.target.value)}
          className="font-mono text-[11px] text-[var(--text-secondary)] bg-transparent outline-none flex-1 min-w-0"
          placeholder="path/to/file.py" />
      </div>
      <Textarea value={code} onChange={(e) => setCode(e.target.value)}
        placeholder={"# Вставте Python-код\n\ndef my_function(x, y):\n    ..."}
        className="flex-1 resize-none rounded-none border-0 bg-[var(--bg-base)] font-mono text-[12px] text-[var(--text-primary)] p-4 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed placeholder:text-[var(--text-muted)] placeholder:opacity-40"
        spellCheck={false} />
      <div className="flex justify-end px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Button onClick={onNext} disabled={!code.trim() || loading}
          className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110">
          <Play className="h-3 w-3" />{loading ? "Аналізую..." : "Аналізувати"}
        </Button>
      </div>
    </div>
  );
}

function PanelAnalyze({ analyzing, result, selected, setSelected, onNext }: {
  analyzing: boolean; result: AnalyzeResult | null;
  selected: Set<string>; setSelected: (s: Set<string>) => void;
  onNext: () => void;
}) {
  const toggle = (name: string) => {
    const next = new Set(selected);
    next.has(name) ? next.delete(name) : next.add(name);
    setSelected(next);
  };
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {analyzing && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-amber)]" />
            <span className="font-mono text-[11px] text-[var(--text-muted)]">architect-agent аналізує...</span>
          </div>
        )}
        {result && (
          <>
            <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-subtle)]">
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest">CC</span>
              <span className={cn("font-mono text-[13px] font-bold",
                result.cyclomatic_complexity <= 10 ? "text-green-400"
                : result.cyclomatic_complexity <= 20 ? "text-yellow-400" : "text-red-400")}>
                {result.cyclomatic_complexity}
              </span>
              <span className="font-mono text-[9px] text-[var(--text-muted)] ml-auto">{result.tree_level}</span>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] pb-1">
              Функції ({result.drakon_ir.length}) — оберіть
            </div>
            {result.drakon_ir.map((fn) => (
              <button key={fn.name} type="button" onClick={() => toggle(fn.name)}
                className={cn("w-full text-left rounded-[var(--radius-sm)] border p-2.5 transition-colors",
                  selected.has(fn.name) ? "border-[var(--accent-amber)] bg-[var(--accent-dim)]"
                  : "border-[var(--border-subtle)] hover:border-[var(--accent-amber)]/50")}>
                <div className="flex items-center gap-2">
                  <div className={cn("h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0",
                    selected.has(fn.name) ? "bg-[var(--accent-amber)] border-[var(--accent-amber)]"
                    : "border-[var(--border-subtle)]")}>
                    {selected.has(fn.name) && <Check className="h-2 w-2 text-[#1a0a00]" />}
                  </div>
                  <span className="font-mono text-[11px] text-[var(--text-primary)] flex-1 truncate">
                    {fn.name.split(".").pop()}
                  </span>
                  {fn.cyclomatic_complexity !== undefined && (
                    <span className={cn("font-mono text-[9px] px-1.5 rounded",
                      fn.cyclomatic_complexity <= 10 ? "bg-green-500/15 text-green-400"
                      : fn.cyclomatic_complexity <= 20 ? "bg-yellow-500/15 text-yellow-400"
                      : "bg-red-500/15 text-red-400")}>
                      CC={fn.cyclomatic_complexity}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </>
        )}
      </div>
      {result && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
          <span className="font-mono text-[10px] text-[var(--text-muted)]">{selected.size} обрано</span>
          <Button onClick={onNext} disabled={selected.size === 0}
            className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110">
            Далі <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function PanelIR({ fns, onNext }: { fns: AnalyzedFunction[]; onNext: () => void }) {
  const [open, setOpen] = useState<string | null>(fns[0]?.name ?? null);
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] pb-1">IR функцій</div>
        {fns.map((fn) => (
          <div key={fn.name} className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] overflow-hidden">
            <button type="button" onClick={() => setOpen(open === fn.name ? null : fn.name)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5">
              <ChevronRight className={cn("h-3 w-3 text-[var(--text-muted)] transition-transform", open === fn.name && "rotate-90")} />
              <span className="font-mono text-[11px] text-[var(--text-primary)]">{fn.name.split(".").pop()}</span>
            </button>
            {open === fn.name && (
              <pre className="px-3 pb-3 font-mono text-[10px] text-[var(--text-secondary)] overflow-x-auto bg-[var(--bg-base)] border-t border-[var(--border-subtle)]">
                {JSON.stringify(fn, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Button onClick={onNext}
          className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110">
          Редагувати <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Scenario B panels ──────────────────────────────────────────────────────────

function PanelIdea({ idea, setIdea, language, setLanguage, onNext, loading }: {
  idea: string; setIdea: (v: string) => void;
  language: string; setLanguage: (v: string) => void;
  onNext: () => void; loading: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Lightbulb className="h-3 w-3 text-[var(--accent-amber)]" />
        <span className="font-mono text-[11px] text-[var(--text-secondary)]">Опишіть фічу</span>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}
          className="ml-auto font-mono text-[10px] bg-transparent text-[var(--text-secondary)] border-0 outline-none cursor-pointer">
          <option value="python">python</option>
          <option value="javascript">javascript</option>
          <option value="typescript">typescript</option>
          <option value="go">go</option>
        </select>
      </div>
      <Textarea value={idea} onChange={(e) => setIdea(e.target.value)}
        placeholder={"Опишіть нову функцію або модуль:\n\nНаприклад: Функція яка приймає список замовлень, групує їх за категорією, підраховує суму та повертає звіт у вигляді словника."}
        className="flex-1 resize-none rounded-none border-0 bg-[var(--bg-base)] font-mono text-[12px] text-[var(--text-primary)] p-4 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed placeholder:text-[var(--text-muted)] placeholder:opacity-40"
        spellCheck={false} />
      <div className="flex justify-end px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Button onClick={onNext} disabled={!idea.trim() || loading}
          className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110">
          <Play className="h-3 w-3" />{loading ? "Генерую IR..." : "Генерувати IR"}
        </Button>
      </div>
    </div>
  );
}

function PanelIRGen({ loading, irText, error, onNext }: {
  loading: boolean; irText: string; error: string | null; onNext: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-amber)]" />
            <span className="font-mono text-[11px] text-[var(--text-muted)]">architect-agent генерує IR структуру...</span>
          </div>
        )}
        {error && !loading && (
          <div className="rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 p-3">
            <span className="font-mono text-[11px] text-red-400">{error}</span>
          </div>
        )}
        {!loading && irText && (
          <div className="space-y-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">
              Згенерований IR
            </div>
            <pre className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3 font-mono text-[10px] text-[var(--text-secondary)] overflow-x-auto">
              {irText}
            </pre>
          </div>
        )}
      </div>
      {!loading && irText && (
        <div className="flex justify-end px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
          <Button onClick={onNext}
            className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110">
            Редагувати <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Shared panels ──────────────────────────────────────────────────────────────

function PanelEdit({ irText, setIrText, language, setLanguage, onNext, generating }: {
  irText: string; setIrText: (v: string) => void;
  language: string; setLanguage: (v: string) => void;
  onNext: () => void; generating: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">IR JSON</span>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}
          className="ml-auto font-mono text-[10px] bg-transparent text-[var(--text-secondary)] border-0 outline-none cursor-pointer">
          <option value="python">python</option>
          <option value="javascript">javascript</option>
          <option value="typescript">typescript</option>
          <option value="go">go</option>
        </select>
      </div>
      <Textarea value={irText} onChange={(e) => setIrText(e.target.value)}
        className="flex-1 resize-none rounded-none border-0 bg-[var(--bg-base)] font-mono text-[11px] text-[var(--text-primary)] p-4 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed"
        spellCheck={false} />
      <div className="flex justify-end px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Button onClick={onNext} disabled={!irText.trim() || generating}
          className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110">
          <Play className="h-3 w-3" />{generating ? "Генерую..." : "Генерувати"}
        </Button>
      </div>
    </div>
  );
}

function PanelGenerate({ generating }: { generating: boolean }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className={cn("h-8 w-8 text-[var(--accent-amber)]", generating && "animate-spin")} />
        <span className="font-mono text-[11px] text-[var(--text-muted)]">
          {generating ? "drakon-agent генерує код..." : "Готово"}
        </span>
      </div>
    </div>
  );
}

function PanelResult({ result, onReset }: { result: GenerateResult; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-widest text-green-400">✓ Згенеровано</span>
        <span className="font-mono text-[9px] text-[var(--text-muted)]">{result.language} · {result.iterations} iter</span>
        {result.syntax_errors?.length > 0 && (
          <span className="font-mono text-[9px] text-red-400 ml-2">⚠ {result.syntax_errors.length} помилок</span>
        )}
        <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 font-mono text-[10px]" onClick={copy}>
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="flex-1 overflow-auto p-4 font-mono text-[12px] text-[var(--text-primary)] leading-relaxed bg-[var(--bg-base)]">
        {result.code}
      </pre>
      <div className="flex justify-start px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Button variant="ghost" size="sm" onClick={onReset}
          className="h-7 gap-1.5 font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <RotateCcw className="h-3 w-3" />Нова сесія
        </Button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function PipelineCommandCenter() {
  const [scenario, setScenario] = useState<Scenario>("A");
  const steps = scenario === "A" ? STEPS_A : STEPS_B;

  // Step tracking
  const [currentStep, setCurrentStep] = useState<StepId>("code");
  const [doneSteps, setDoneSteps] = useState<Set<StepId>>(new Set());

  // Scenario A state
  const [code, setCode] = useState("");
  const [filePath, setFilePath] = useState("untitled.py");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [selectedFns, setSelectedFns] = useState<Set<string>>(new Set());

  // Scenario B state
  const [idea, setIdea] = useState("");
  const [irGenerating, setIrGenerating] = useState(false);
  const [irGenText, setIrGenText] = useState("");
  const [irGenError, setIrGenError] = useState<string | null>(null);

  // Shared state
  const [irText, setIrText] = useState("");
  const [language, setLanguage] = useState("python");
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mark = (step: StepId) => setDoneSteps((p) => new Set([...p, step]));
  const goTo = (step: StepId) => setCurrentStep(step);

  // ── Scenario A handlers ──────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) return;
    setAnalyzing(true); setAnalyzeResult(null); setSelectedFns(new Set());
    goTo("analyze");
    try {
      const { job_id } = await startAnalysis(code, filePath);
      setJobId(job_id); mark("code");
      let n = 0;
      pollRef.current = setInterval(async () => {
        if (++n > 60) { clearInterval(pollRef.current!); setAnalyzing(false); toast.error("Timeout"); return; }
        try {
          const s = await pollJob<AnalyzeResult>(job_id);
          if (s.status === "done" && s.result) {
            clearInterval(pollRef.current!); setAnalyzing(false); setAnalyzeResult(s.result);
            setSelectedFns(new Set(s.result.drakon_ir.map((f) => f.name)));
          } else if (s.status === "error") {
            clearInterval(pollRef.current!); setAnalyzing(false);
            toast.error(s.error ?? "Помилка аналізу");
          }
        } catch {}
      }, 1500);
    } catch { setAnalyzing(false); toast.error("Не вдалося запустити аналіз"); }
  }, [code, filePath]);

  const handleToIR = useCallback(() => { mark("analyze"); goTo("ir"); }, []);

  const handleToEdit = useCallback(() => {
    if (!analyzeResult) return;
    const fns = analyzeResult.drakon_ir.filter((f) => selectedFns.has(f.name));
    setIrText(JSON.stringify(fns.length === 1 ? fns[0] : fns, null, 2));
    mark("ir"); goTo("edit");
  }, [analyzeResult, selectedFns]);

  // ── Scenario B handlers ──────────────────────────────────────────────────────

  const handleGenerateIR = useCallback(async () => {
    if (!idea.trim()) return;
    setIrGenerating(true); setIrGenText(""); setIrGenError(null);
    goTo("ir-gen"); mark("idea");
    try {
      const prompt = `Generate a DRAKON IR JSON structure for the following feature description:\n\n${idea}\n\nTarget language: ${language}\n\nReturn ONLY valid JSON (array or object with 'name' and 'items' fields). No explanation, no markdown, just JSON.`;
      const reply = await sendToAgent("architect", prompt);
      const parsed = extractJson(reply.reply);
      if (parsed) {
        const text = JSON.stringify(parsed, null, 2);
        setIrGenText(text);
        setIrText(text);
      } else {
        setIrGenError("Не вдалося розпарсити IR з відповіді агента. Спробуйте ще раз або відредагуйте вручну.");
        setIrText(reply.reply);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Помилка з'єднання";
      setIrGenError(msg);
    } finally {
      setIrGenerating(false);
    }
  }, [idea, language]);

  const handleIRGenToEdit = useCallback(() => { mark("ir-gen"); goTo("edit"); }, []);

  // ── Shared handlers ──────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    let ir: object;
    try { ir = JSON.parse(irText); } catch { toast.error("Невалідний JSON в IR"); return; }
    setGenerating(true); goTo("generate"); mark("edit");
    try {
      const desc = scenario === "B" ? idea : "";
      const { job_id } = await startGeneration(ir, language, desc);
      setJobId(job_id);
      let n = 0;
      pollRef.current = setInterval(async () => {
        if (++n > 80) { clearInterval(pollRef.current!); setGenerating(false); toast.error("Timeout"); return; }
        try {
          const s = await pollJob<GenerateResult>(job_id);
          if (s.status === "done" && s.result) {
            clearInterval(pollRef.current!); setGenerating(false);
            setGenerateResult(s.result); mark("generate"); goTo("result");
          } else if (s.status === "error") {
            clearInterval(pollRef.current!); setGenerating(false);
            toast.error(s.error ?? "Помилка генерації");
          }
        } catch {}
      }, 1500);
    } catch { setGenerating(false); toast.error("Не вдалося запустити генерацію"); }
  }, [irText, language, scenario, idea]);

  const handleReset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setCurrentStep(scenario === "A" ? "code" : "idea");
    setDoneSteps(new Set());
    setCode(""); setFilePath("untitled.py"); setAnalyzing(false); setAnalyzeResult(null);
    setSelectedFns(new Set()); setJobId(null); setIrText("");
    setIdea(""); setIrGenerating(false); setIrGenText(""); setIrGenError(null);
    setGenerating(false); setGenerateResult(null);
  }, [scenario]);

  const switchScenario = (s: Scenario) => {
    setScenario(s);
    setCurrentStep(s === "A" ? "code" : "idea");
    setDoneSteps(new Set());
    setGenerateResult(null); setAnalyzeResult(null);
    setIrGenText(""); setIrGenError(null);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const selectedFnList = analyzeResult
    ? analyzeResult.drakon_ir.filter((f) => selectedFns.has(f.name)) : [];

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-base)]">
      {/* Left sidebar */}
      <aside className="w-44 shrink-0 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {/* Scenario switcher */}
        <div className="px-2 pt-2.5 pb-2 border-b border-[var(--border-subtle)]">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1.5 px-1">
            Сценарій
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => switchScenario("A")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-7 rounded-[var(--radius-sm)] font-mono text-[10px] font-bold border transition-all",
                scenario === "A"
                  ? "bg-[var(--accent-amber)] border-[var(--accent-amber)] text-[#1a0a00]"
                  : "bg-transparent border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--accent-amber)]/50",
              )}>
              <Code2 className="h-2.5 w-2.5" />A
            </button>
            <button type="button" onClick={() => switchScenario("B")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-7 rounded-[var(--radius-sm)] font-mono text-[10px] font-bold border transition-all",
                scenario === "B"
                  ? "bg-[var(--accent-amber)] border-[var(--accent-amber)] text-[#1a0a00]"
                  : "bg-transparent border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--accent-amber)]/50",
              )}>
              <Lightbulb className="h-2.5 w-2.5" />B
            </button>
          </div>
          <div className="font-mono text-[9px] text-[var(--text-muted)] mt-1 px-1">
            {scenario === "A" ? "Код → IR → Генерація" : "Ідея → IR → Генерація"}
          </div>
        </div>

        {/* Steps */}
        <nav className="flex-1 overflow-y-auto py-3 px-1">
          {steps.map((step, i) => (
            <StepIndicator key={step.id} step={step} index={i} steps={steps}
              currentStep={currentStep} doneSteps={doneSteps} />
          ))}
        </nav>

        <div className="px-2 py-2 border-t border-[var(--border-subtle)]">
          <button type="button" onClick={handleReset}
            className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-mono text-[9px] uppercase tracking-widest transition-colors px-1">
            <RefreshCw className="h-2.5 w-2.5" />Скинути
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Pipeline {scenario}
          </span>
          <span className="text-[var(--border-subtle)]">·</span>
          <span className="font-mono text-[11px] text-[var(--accent-amber)]">
            {steps.find((s) => s.id === currentStep)?.label}
          </span>
          {jobId && (
            <span className="ml-auto font-mono text-[9px] text-[var(--text-muted)] truncate">
              job: {jobId.slice(0, 8)}…
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Scenario A panels */}
          {scenario === "A" && currentStep === "code" && (
            <PanelCode code={code} setCode={setCode} filePath={filePath} setFilePath={setFilePath}
              onNext={handleAnalyze} loading={analyzing} />
          )}
          {scenario === "A" && currentStep === "analyze" && (
            <PanelAnalyze analyzing={analyzing} result={analyzeResult}
              selected={selectedFns} setSelected={setSelectedFns} onNext={handleToIR} />
          )}
          {scenario === "A" && currentStep === "ir" && (
            <PanelIR fns={selectedFnList} onNext={handleToEdit} />
          )}

          {/* Scenario B panels */}
          {scenario === "B" && currentStep === "idea" && (
            <PanelIdea idea={idea} setIdea={setIdea} language={language} setLanguage={setLanguage}
              onNext={handleGenerateIR} loading={irGenerating} />
          )}
          {scenario === "B" && currentStep === "ir-gen" && (
            <PanelIRGen loading={irGenerating} irText={irGenText}
              error={irGenError} onNext={handleIRGenToEdit} />
          )}

          {/* Shared panels */}
          {currentStep === "edit" && (
            <PanelEdit irText={irText} setIrText={setIrText} language={language}
              setLanguage={setLanguage} onNext={handleGenerate} generating={generating} />
          )}
          {currentStep === "generate" && <PanelGenerate generating={generating} />}
          {currentStep === "result" && generateResult && (
            <PanelResult result={generateResult} onReset={handleReset} />
          )}
        </div>
      </main>
    </div>
  );
}
