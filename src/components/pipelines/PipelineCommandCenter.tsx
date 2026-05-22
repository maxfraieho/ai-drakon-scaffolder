import { useState, useRef, useCallback } from "react";
import { Check, ChevronRight, Copy, Loader2, Play, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  startAnalysis,
  startGeneration,
  pollJob,
  type AnalyzeResult,
  type GenerateResult,
  type AnalyzedFunction,
} from "@/lib/pipeline-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

type Scenario = "A" | "B";

type StepId = "code" | "analyze" | "ir" | "edit" | "generate" | "result";

interface Step {
  id: StepId;
  label: string;
  sublabel: string;
}

const STEPS_A: Step[] = [
  { id: "code",     label: "Код",         sublabel: "Вхідний код" },
  { id: "analyze",  label: "Аналіз",      sublabel: "CC + функції" },
  { id: "ir",       label: "IR",           sublabel: "Intermediate repr." },
  { id: "edit",     label: "Редагування", sublabel: "Правки IR" },
  { id: "generate", label: "Генерація",   sublabel: "Код з IR" },
  { id: "result",   label: "Результат",   sublabel: "Готовий код" },
];

const STEP_ORDER_A: StepId[] = ["code", "analyze", "ir", "edit", "generate", "result"];

// ── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  step, index, currentStep, doneSteps,
}: {
  step: Step; index: number; currentStep: StepId; doneSteps: Set<StepId>;
}) {
  const isDone = doneSteps.has(step.id);
  const isActive = step.id === currentStep;
  const isLast = index === STEPS_A.length - 1;

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => {}} // navigation via Next/Back only
        className="flex w-full items-center gap-2.5 px-2 py-1 group"
      >
        <div
          className={cn(
            "h-5 w-5 shrink-0 rounded-full flex items-center justify-center font-mono text-[9px] border transition-all duration-200",
            isDone
              ? "bg-green-500/15 border-green-500/60 text-green-400"
              : isActive
              ? "bg-[var(--accent-amber)] border-[var(--accent-amber)] text-[#1a0a00] shadow-[0_0_6px_var(--accent-amber)]"
              : "bg-transparent border-[var(--border-subtle)] text-[var(--text-muted)]",
          )}
        >
          {isDone ? <Check className="h-2.5 w-2.5" /> : index + 1}
        </div>
        <div className="min-w-0 text-left">
          <div
            className={cn(
              "font-mono text-[11px] leading-tight",
              isActive
                ? "text-[var(--accent-amber)]"
                : isDone
                ? "text-[var(--text-secondary)]"
                : "text-[var(--text-muted)]",
            )}
          >
            {step.label}
          </div>
          <div className="font-mono text-[9px] text-[var(--text-muted)] truncate">
            {step.sublabel}
          </div>
        </div>
        {isActive && (
          <ChevronRight className="h-3 w-3 text-[var(--accent-amber)] ml-auto shrink-0" />
        )}
      </button>
      {!isLast && (
        <div
          className={cn(
            "w-px h-4 ml-4",
            isDone ? "bg-green-500/40" : "bg-[var(--border-subtle)]",
          )}
          style={{ borderLeft: "1px dashed" }}
        />
      )}
    </div>
  );
}

// ── Step panels ──────────────────────────────────────────────────────────────

function StepCode({
  code, setCode, filePath, setFilePath, onNext, loading,
}: {
  code: string; setCode: (v: string) => void;
  filePath: string; setFilePath: (v: string) => void;
  onNext: () => void; loading: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <input
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          className="font-mono text-[11px] text-[var(--text-secondary)] bg-transparent outline-none flex-1 min-w-0"
          placeholder="path/to/file.py"
        />
      </div>
      <Textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={"# Вставте Python-код\n\ndef my_function(x, y):\n    ..."}
        className="flex-1 resize-none rounded-none border-0 bg-[var(--bg-base)] font-mono text-[12px] text-[var(--text-primary)] p-4 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed placeholder:text-[var(--text-muted)] placeholder:opacity-40"
        spellCheck={false}
      />
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Button
          onClick={onNext}
          disabled={!code.trim() || loading}
          className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110"
        >
          <Play className="h-3 w-3" />
          {loading ? "Аналізую..." : "Аналізувати"}
        </Button>
      </div>
    </div>
  );
}

function StepAnalyze({
  analyzing, result, selected, setSelected, onNext,
}: {
  analyzing: boolean; result: AnalyzeResult | null;
  selected: Set<string>; setSelected: (s: Set<string>) => void;
  onNext: () => void;
}) {
  const toggle = (name: string) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name); else next.add(name);
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
              <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest">CC</div>
              <span className={cn(
                "font-mono text-[13px] font-bold",
                result.cyclomatic_complexity <= 10 ? "text-green-400" :
                result.cyclomatic_complexity <= 20 ? "text-yellow-400" : "text-red-400",
              )}>
                {result.cyclomatic_complexity}
              </span>
              <span className="font-mono text-[9px] text-[var(--text-muted)] ml-auto">{result.tree_level}</span>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] pb-1">
              Функції ({result.drakon_ir.length}) — оберіть для редагування
            </div>
            {result.drakon_ir.map((fn) => (
              <button
                key={fn.name}
                type="button"
                onClick={() => toggle(fn.name)}
                className={cn(
                  "w-full text-left rounded-[var(--radius-sm)] border p-2.5 transition-colors",
                  selected.has(fn.name)
                    ? "border-[var(--accent-amber)] bg-[var(--accent-dim)]"
                    : "border-[var(--border-subtle)] hover:border-[var(--accent-amber)]/50",
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0",
                    selected.has(fn.name)
                      ? "bg-[var(--accent-amber)] border-[var(--accent-amber)]"
                      : "border-[var(--border-subtle)]",
                  )}>
                    {selected.has(fn.name) && <Check className="h-2 w-2 text-[#1a0a00]" />}
                  </div>
                  <span className="font-mono text-[11px] text-[var(--text-primary)] flex-1 truncate">
                    {fn.name.split(".").pop()}
                  </span>
                  {fn.cyclomatic_complexity !== undefined && (
                    <span className={cn(
                      "font-mono text-[9px] px-1.5 rounded",
                      fn.cyclomatic_complexity <= 10 ? "bg-green-500/15 text-green-400" :
                      fn.cyclomatic_complexity <= 20 ? "bg-yellow-500/15 text-yellow-400" :
                      "bg-red-500/15 text-red-400",
                    )}>CC={fn.cyclomatic_complexity}</span>
                  )}
                </div>
              </button>
            ))}
          </>
        )}
      </div>
      {result && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {selected.size} обрано
          </span>
          <Button
            onClick={onNext}
            disabled={selected.size === 0}
            className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110"
          >
            Далі <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function StepIR({ fns, onNext }: { fns: AnalyzedFunction[]; onNext: () => void }) {
  const [open, setOpen] = useState<string | null>(fns[0]?.name ?? null);
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] pb-1">
          IR для обраних функцій
        </div>
        {fns.map((fn) => (
          <div key={fn.name} className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(open === fn.name ? null : fn.name)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
            >
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
        <Button
          onClick={onNext}
          className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110"
        >
          Редагувати <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function StepEdit({
  irText, setIrText, language, setLanguage, onNext, generating,
}: {
  irText: string; setIrText: (v: string) => void;
  language: string; setLanguage: (v: string) => void;
  onNext: () => void; generating: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">IR JSON</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="ml-auto font-mono text-[10px] bg-transparent text-[var(--text-secondary)] border-0 outline-none cursor-pointer"
        >
          <option value="python">python</option>
          <option value="javascript">javascript</option>
          <option value="typescript">typescript</option>
          <option value="go">go</option>
        </select>
      </div>
      <Textarea
        value={irText}
        onChange={(e) => setIrText(e.target.value)}
        className="flex-1 resize-none rounded-none border-0 bg-[var(--bg-base)] font-mono text-[11px] text-[var(--text-primary)] p-4 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed"
        spellCheck={false}
      />
      <div className="flex items-center justify-end px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Button
          onClick={onNext}
          disabled={!irText.trim() || generating}
          className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110"
        >
          <Play className="h-3 w-3" />
          {generating ? "Генерую..." : "Генерувати"}
        </Button>
      </div>
    </div>
  );
}

function StepGenerate({ generating }: { generating: boolean }) {
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

function StepResult({ result, onReset }: { result: GenerateResult; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-widest text-green-400">
          ✓ Згенеровано
        </span>
        <span className="font-mono text-[9px] text-[var(--text-muted)]">{result.language}</span>
        <span className="font-mono text-[9px] text-[var(--text-muted)]">· {result.iterations} iter</span>
        {result.syntax_errors?.length > 0 && (
          <span className="font-mono text-[9px] text-red-400 ml-2">
            ⚠ {result.syntax_errors.length} syntax error(s)
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-2 font-mono text-[10px]" onClick={copy}>
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <pre className="flex-1 overflow-auto p-4 font-mono text-[12px] text-[var(--text-primary)] leading-relaxed bg-[var(--bg-base)]">
        {result.code}
      </pre>
      <div className="flex justify-between items-center px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={onReset}
        >
          <RotateCcw className="h-3 w-3" />
          Нова сесія
        </Button>
      </div>
    </div>
  );
}

// ── Main command center ───────────────────────────────────────────────────────

export function PipelineCommandCenter() {
  const [scenario] = useState<Scenario>("A");
  const [currentStep, setCurrentStep] = useState<StepId>("code");
  const [doneSteps, setDoneSteps] = useState<Set<StepId>>(new Set());

  // Step 1: code
  const [code, setCode] = useState("");
  const [filePath, setFilePath] = useState("untitled.py");

  // Step 2: analyze
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [selectedFns, setSelectedFns] = useState<Set<string>>(new Set());
  const [jobId, setJobId] = useState<string | null>(null);

  // Step 3: ir — computed from analyzeResult + selectedFns

  // Step 4: edit
  const [irText, setIrText] = useState("");
  const [language, setLanguage] = useState("python");

  // Step 5: generate
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mark = (step: StepId) =>
    setDoneSteps((prev) => new Set([...prev, step]));

  const goTo = (step: StepId) => setCurrentStep(step);

  // Step 1 → 2: trigger analysis
  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) return;
    setAnalyzing(true);
    setAnalyzeResult(null);
    setSelectedFns(new Set());
    goTo("analyze");
    try {
      const { job_id } = await startAnalysis(code, filePath);
      setJobId(job_id);
      mark("code");
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 60) {
          clearInterval(pollRef.current!);
          setAnalyzing(false);
          toast.error("Timeout — architect-agent не відповів");
          return;
        }
        try {
          const status = await pollJob<AnalyzeResult>(job_id);
          if (status.status === "done" && status.result) {
            clearInterval(pollRef.current!);
            setAnalyzing(false);
            setAnalyzeResult(status.result);
            // Auto-select all functions
            setSelectedFns(new Set(status.result.drakon_ir.map((f) => f.name)));
          } else if (status.status === "error") {
            clearInterval(pollRef.current!);
            setAnalyzing(false);
            toast.error(status.error ?? "Помилка аналізу");
          }
        } catch {}
      }, 1500);
    } catch {
      setAnalyzing(false);
      toast.error("Не вдалось запустити аналіз");
    }
  }, [code, filePath]);

  // Step 2 → 3: go to IR
  const handleToIR = useCallback(() => {
    mark("analyze");
    goTo("ir");
  }, []);

  // Step 3 → 4: go to edit
  const handleToEdit = useCallback(() => {
    if (!analyzeResult) return;
    const fns = analyzeResult.drakon_ir.filter((f) => selectedFns.has(f.name));
    setIrText(JSON.stringify(fns.length === 1 ? fns[0] : fns, null, 2));
    mark("ir");
    goTo("edit");
  }, [analyzeResult, selectedFns]);

  // Step 4 → 5: trigger generation
  const handleGenerate = useCallback(async () => {
    let ir: object;
    try {
      ir = JSON.parse(irText);
    } catch {
      toast.error("Невалідний JSON в IR");
      return;
    }
    setGenerating(true);
    goTo("generate");
    mark("edit");
    try {
      const { job_id } = await startGeneration(ir, language, "");
      setJobId(job_id);
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 80) {
          clearInterval(pollRef.current!);
          setGenerating(false);
          toast.error("Timeout — drakon-agent не відповів");
          return;
        }
        try {
          const status = await pollJob<GenerateResult>(job_id);
          if (status.status === "done" && status.result) {
            clearInterval(pollRef.current!);
            setGenerating(false);
            setGenerateResult(status.result);
            mark("generate");
            goTo("result");
          } else if (status.status === "error") {
            clearInterval(pollRef.current!);
            setGenerating(false);
            toast.error(status.error ?? "Помилка генерації");
          }
        } catch {}
      }, 1500);
    } catch {
      setGenerating(false);
      toast.error("Не вдалось запустити генерацію");
    }
  }, [irText, language]);

  // Reset
  const handleReset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setCurrentStep("code");
    setDoneSteps(new Set());
    setCode("");
    setFilePath("untitled.py");
    setAnalyzing(false);
    setAnalyzeResult(null);
    setSelectedFns(new Set());
    setJobId(null);
    setIrText("");
    setGenerating(false);
    setGenerateResult(null);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const selectedFnList = analyzeResult
    ? analyzeResult.drakon_ir.filter((f) => selectedFns.has(f.name))
    : [];

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-base)]">
      {/* Left: step list */}
      <aside className="w-44 shrink-0 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {/* Scenario badge */}
        <div className="px-3 pt-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Сценарій
            </span>
            <span className="font-mono text-[10px] font-bold text-[var(--accent-amber)] px-1.5 rounded border border-[var(--accent-amber)]/40 bg-[var(--accent-dim)]">
              {scenario}
            </span>
          </div>
          <div className="font-mono text-[9px] text-[var(--text-muted)] mt-0.5">
            {scenario === "A" ? "Код → IR → Генерація" : "Ідея → IR → Генерація"}
          </div>
        </div>

        {/* Steps */}
        <nav className="flex-1 overflow-y-auto py-3 px-1">
          {STEPS_A.map((step, i) => (
            <StepIndicator
              key={step.id}
              step={step}
              index={i}
              currentStep={currentStep}
              doneSteps={doneSteps}
            />
          ))}
        </nav>

        {/* Reset */}
        <div className="px-2 py-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-mono text-[9px] uppercase tracking-widest transition-colors px-1"
          >
            <RefreshCw className="h-2.5 w-2.5" />
            Скинути
          </button>
        </div>
      </aside>

      {/* Main: step content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Step header */}
        <div className="flex items-center gap-2 px-4 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Pipeline A
          </span>
          <span className="text-[var(--border-subtle)]">·</span>
          <span className="font-mono text-[11px] text-[var(--accent-amber)]">
            {STEPS_A.find((s) => s.id === currentStep)?.label}
          </span>
          {jobId && (
            <span className="ml-auto font-mono text-[9px] text-[var(--text-muted)] truncate">
              job: {jobId.slice(0, 8)}…
            </span>
          )}
        </div>

        {/* Step panels */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {currentStep === "code" && (
            <StepCode
              code={code} setCode={setCode}
              filePath={filePath} setFilePath={setFilePath}
              onNext={handleAnalyze} loading={analyzing}
            />
          )}
          {currentStep === "analyze" && (
            <StepAnalyze
              analyzing={analyzing}
              result={analyzeResult}
              selected={selectedFns}
              setSelected={setSelectedFns}
              onNext={handleToIR}
            />
          )}
          {currentStep === "ir" && (
            <StepIR fns={selectedFnList} onNext={handleToEdit} />
          )}
          {currentStep === "edit" && (
            <StepEdit
              irText={irText} setIrText={setIrText}
              language={language} setLanguage={setLanguage}
              onNext={handleGenerate} generating={generating}
            />
          )}
          {currentStep === "generate" && <StepGenerate generating={generating} />}
          {currentStep === "result" && generateResult && (
            <StepResult result={generateResult} onReset={handleReset} />
          )}
        </div>
      </main>
    </div>
  );
}
