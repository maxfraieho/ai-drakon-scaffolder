import { useState, useRef, useCallback, useEffect, type ElementType } from "react";
import {
  Check, ChevronRight, Copy, Loader2, Play,
  RefreshCw, RotateCcw, Lightbulb, Code2,
  TestTube2, Wrench, BookOpen, FileText, BarChart2,
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

type Scenario = "A" | "B" | "C" | "D" | "E" | "F" | "G";
type StepId = string;

interface Step { id: StepId; label: string; sublabel: string; }

const STEPS_A: Step[] = [
  { id: "code",          label: "Код",         sublabel: "Вхідний код" },
  { id: "analyze",       label: "Аналіз",      sublabel: "CC + функції" },
  { id: "ir",            label: "IR",           sublabel: "Intermediate repr." },
  { id: "edit",          label: "Редагування", sublabel: "Правки IR" },
  { id: "generate",      label: "Генерація",   sublabel: "Код з IR" },
  { id: "result",        label: "Результат",   sublabel: "Готовий код" },
];
const STEPS_B: Step[] = [
  { id: "idea",          label: "Ідея",        sublabel: "Опис фічі" },
  { id: "ir-gen",        label: "IR",           sublabel: "Генерація структури" },
  { id: "edit",          label: "Редагування", sublabel: "Правки IR" },
  { id: "generate",      label: "Генерація",   sublabel: "Код з IR" },
  { id: "result",        label: "Результат",   sublabel: "Готовий код" },
];
const STEPS_C: Step[] = [
  { id: "code-c",        label: "Код",         sublabel: "Вхідний код" },
  { id: "analyze-c",     label: "Аналіз",      sublabel: "CC + IR" },
  { id: "test-gen",      label: "Генерація",   sublabel: "pytest-кейси" },
  { id: "test-result",   label: "Тести",       sublabel: "Готові тести" },
];
const STEPS_D: Step[] = [
  { id: "code-d",        label: "Код",         sublabel: "Legacy-код" },
  { id: "analyze-d",     label: "Аналіз",      sublabel: "CC-звіт" },
  { id: "refactor-plan", label: "План",        sublabel: "Пропозиції" },
  { id: "refactor-gen",  label: "Генерація",   sublabel: "Рефакторинг" },
  { id: "refactor-res",  label: "Результат",   sublabel: "Чистий код" },
];
const STEPS_E: Step[] = [
  { id: "code-e",        label: "Код",         sublabel: "Вхідний код" },
  { id: "analyze-e",     label: "Аналіз",      sublabel: "IR структура" },
  { id: "explain",       label: "Пояснення",   sublabel: "docs-agent" },
  { id: "doc-result",    label: "Документ",    sublabel: "Markdown" },
];
const STEPS_F: Step[] = [
  { id: "spec",          label: "Специфікація",sublabel: "Вхідні вимоги" },
  { id: "ir-spec",       label: "IR",           sublabel: "Генерація структури" },
  { id: "edit-f",        label: "Редагування", sublabel: "Правки IR" },
  { id: "generate-f",    label: "Генерація",   sublabel: "Код зі специфікації" },
  { id: "result-f",      label: "Результат",   sublabel: "Готовий код" },
];
const STEPS_G: Step[] = [
  { id: "code-g",        label: "Модуль",      sublabel: "Весь файл/модуль" },
  { id: "batch-result",  label: "Звіт",        sublabel: "CC для всіх функцій" },
];

const SCENARIO_META: Record<Scenario, {
  icon: ElementType; label: string; desc: string; steps: Step[]; firstStep: StepId;
}> = {
  A: { icon: Code2,      label: "Код → Генерація",   desc: "Аналіз → IR → Код",    steps: STEPS_A, firstStep: "code" },
  B: { icon: Lightbulb,  label: "Ідея → Генерація",  desc: "IR з опису фічі",      steps: STEPS_B, firstStep: "idea" },
  C: { icon: TestTube2,  label: "Тест-кейси",         desc: "IR → pytest",          steps: STEPS_C, firstStep: "code-c" },
  D: { icon: Wrench,     label: "Рефакторинг",        desc: "CC → Спрощення коду",  steps: STEPS_D, firstStep: "code-d" },
  E: { icon: BookOpen,   label: "Пояснення",          desc: "Код → Документ",       steps: STEPS_E, firstStep: "code-e" },
  F: { icon: FileText,   label: "Специфікація",       desc: "Spec → IR → Код",      steps: STEPS_F, firstStep: "spec" },
  G: { icon: BarChart2,  label: "Batch аналіз",       desc: "Модуль → CC-звіт",     steps: STEPS_G, firstStep: "code-g" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractJson(text: string): object | null {
  try { return JSON.parse(text.trim()); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch {} }
  const start = text.search(/[{[]/);
  if (start !== -1) {
    for (let end = text.length; end > start; end--) {
      try { return JSON.parse(text.slice(start, end)); } catch {}
    }
  }
  return null;
}

function MarkdownView({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1 font-mono text-[11px] leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## "))
          return <div key={i} className="text-[var(--accent-amber)] font-bold mt-3 text-[12px]">{line.slice(3)}</div>;
        if (line.startsWith("# "))
          return <div key={i} className="text-[var(--text-primary)] font-bold mt-2 text-[13px]">{line.slice(2)}</div>;
        if (line.startsWith("- ") || line.startsWith("* "))
          return <div key={i} className="text-[var(--text-secondary)] pl-3">• {line.slice(2)}</div>;
        if (line.trim() === "")
          return <div key={i} className="h-2" />;
        return <div key={i} className="text-[var(--text-secondary)]">{line}</div>;
      })}
    </div>
  );
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
          )}>{step.label}</div>
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

// ── Shared / reused panels ─────────────────────────────────────────────────────

function PanelCode({ code, setCode, filePath, setFilePath, onNext, loading, btnLabel }: {
  code: string; setCode: (v: string) => void;
  filePath: string; setFilePath: (v: string) => void;
  onNext: () => void; loading: boolean; btnLabel?: string;
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
          <Play className="h-3 w-3" />{loading ? "Аналізую..." : (btnLabel ?? "Аналізувати")}
        </Button>
      </div>
    </div>
  );
}

function PanelAnalyzeBase({ analyzing, result, selected, setSelected, onNext, btnLabel }: {
  analyzing: boolean; result: AnalyzeResult | null;
  selected: Set<string>; setSelected: (s: Set<string>) => void;
  onNext: () => void; btnLabel?: string;
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
            {btnLabel ?? "Далі"} <ChevronRight className="h-3 w-3" />
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
  const copy = () => { navigator.clipboard.writeText(result.code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-widest text-green-400">Згенеровано</span>
        <span className="font-mono text-[9px] text-[var(--text-muted)]">{result.language} · {result.iterations} iter</span>
        {result.syntax_errors?.length > 0 && (
          <span className="font-mono text-[9px] text-red-400 ml-2">{result.syntax_errors.length} помилок</span>
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
            <span className="font-mono text-[11px] text-[var(--text-muted)]">architect-agent генерує IR...</span>
          </div>
        )}
        {error && !loading && (
          <div className="rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 p-3">
            <span className="font-mono text-[11px] text-red-400">{error}</span>
          </div>
        )}
        {!loading && irText && (
          <div className="space-y-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Згенерований IR</div>
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

// ── Scenario C — Test generation ───────────────────────────────────────────────

function PanelTestGen({ loading, testCode, error }: {
  loading: boolean; testCode: string; error: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(testCode); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <TestTube2 className="h-3 w-3 text-[var(--accent-amber)]" />
        <span className="font-mono text-[11px] text-[var(--text-secondary)]">Генерація тест-кейсів</span>
        {testCode && (
          <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={copy}>
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-amber)]" />
            <span className="font-mono text-[11px] text-[var(--text-muted)]">docs-agent генерує тести...</span>
          </div>
        )}
        {error && !loading && (
          <div className="rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 p-3">
            <span className="font-mono text-[11px] text-red-400">{error}</span>
          </div>
        )}
        {!loading && testCode && (
          <pre className="font-mono text-[11px] text-[var(--text-primary)] leading-relaxed bg-[var(--bg-base)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-4 overflow-auto">
            {testCode}
          </pre>
        )}
      </div>
    </div>
  );
}

// ── Scenario D — Refactoring ───────────────────────────────────────────────────

function PanelRefactorPlan({ loading, plan, error, onNext, generating }: {
  loading: boolean; plan: string; error: string | null; onNext: () => void; generating: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Wrench className="h-3 w-3 text-[var(--accent-amber)]" />
        <span className="font-mono text-[11px] text-[var(--text-secondary)]">План рефакторингу</span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-amber)]" />
            <span className="font-mono text-[11px] text-[var(--text-muted)]">architect-agent аналізує складність...</span>
          </div>
        )}
        {error && !loading && (
          <div className="rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 p-3">
            <span className="font-mono text-[11px] text-red-400">{error}</span>
          </div>
        )}
        {!loading && plan && <MarkdownView text={plan} />}
      </div>
      {!loading && plan && (
        <div className="flex justify-end px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
          <Button onClick={onNext} disabled={generating}
            className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110">
            <Play className="h-3 w-3" />{generating ? "Генерую..." : "Рефакторити"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Scenario E — Explanation ───────────────────────────────────────────────────

function PanelExplain({ loading, explanation, error }: {
  loading: boolean; explanation: string; error: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(explanation); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <BookOpen className="h-3 w-3 text-[var(--accent-amber)]" />
        <span className="font-mono text-[11px] text-[var(--text-secondary)]">Пояснення алгоритму</span>
        {explanation && (
          <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={copy}>
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-amber)]" />
            <span className="font-mono text-[11px] text-[var(--text-muted)]">docs-agent пояснює...</span>
          </div>
        )}
        {error && !loading && (
          <div className="rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 p-3 mb-3">
            <span className="font-mono text-[11px] text-red-400">{error}</span>
          </div>
        )}
        {!loading && explanation && <MarkdownView text={explanation} />}
      </div>
    </div>
  );
}

// ── Scenario F — Spec to Code ──────────────────────────────────────────────────

function PanelSpec({ spec, setSpec, language, setLanguage, onNext, loading }: {
  spec: string; setSpec: (v: string) => void;
  language: string; setLanguage: (v: string) => void;
  onNext: () => void; loading: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <FileText className="h-3 w-3 text-[var(--accent-amber)]" />
        <span className="font-mono text-[11px] text-[var(--text-secondary)]">Специфікація / вимоги</span>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}
          className="ml-auto font-mono text-[10px] bg-transparent text-[var(--text-secondary)] border-0 outline-none cursor-pointer">
          <option value="python">python</option>
          <option value="javascript">javascript</option>
          <option value="typescript">typescript</option>
          <option value="go">go</option>
        </select>
      </div>
      <Textarea value={spec} onChange={(e) => setSpec(e.target.value)}
        placeholder={"Опишіть вимоги або специфікацію:\n\nВхід: список рядків\nВихід: словник з підрахунком частоти\nОбмеження: ігнорувати регістр, пропускати порожні рядки\nОчікувана складність: O(n)"}
        className="flex-1 resize-none rounded-none border-0 bg-[var(--bg-base)] font-mono text-[12px] text-[var(--text-primary)] p-4 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed placeholder:text-[var(--text-muted)] placeholder:opacity-40"
        spellCheck={false} />
      <div className="flex justify-end px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <Button onClick={onNext} disabled={!spec.trim() || loading}
          className="h-7 gap-1.5 font-mono text-[11px] bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110">
          <Play className="h-3 w-3" />{loading ? "Генерую IR..." : "Генерувати IR"}
        </Button>
      </div>
    </div>
  );
}

// ── Scenario G — Batch analysis ────────────────────────────────────────────────

function PanelBatchResult({ analyzing, result }: {
  analyzing: boolean; result: AnalyzeResult | null;
}) {
  if (analyzing) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-amber)]" />
        <span className="font-mono text-[11px] text-[var(--text-muted)]">Аналізую весь модуль...</span>
      </div>
    </div>
  );
  if (!result) return null;

  const fns = result.drakon_ir;
  const high = fns.filter((f) => (f.cyclomatic_complexity ?? 0) > 20).length;
  const med  = fns.filter((f) => { const c = f.cyclomatic_complexity ?? 0; return c > 10 && c <= 20; }).length;
  const low  = fns.filter((f) => (f.cyclomatic_complexity ?? 0) <= 10).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">
          {fns.length} функцій
        </span>
        <span className="font-mono text-[9px] text-green-400">{low} OK</span>
        <span className="font-mono text-[9px] text-yellow-400">{med} warn</span>
        <span className="font-mono text-[9px] text-red-400">{high} crit</span>
        <span className="ml-auto font-mono text-[9px] text-[var(--text-muted)]">{result.tree_level}</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <th className="text-left px-4 py-2 text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-normal">Функція</th>
              <th className="text-center px-3 py-2 text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-normal">CC</th>
              <th className="text-center px-3 py-2 text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-normal">Ризик</th>
            </tr>
          </thead>
          <tbody>
            {fns
              .slice()
              .sort((a, b) => (b.cyclomatic_complexity ?? 0) - (a.cyclomatic_complexity ?? 0))
              .map((fn) => {
                const cc = fn.cyclomatic_complexity ?? 0;
                const risk = cc > 20 ? "критичний" : cc > 10 ? "середній" : "низький";
                const riskColor = cc > 20 ? "text-red-400" : cc > 10 ? "text-yellow-400" : "text-green-400";
                return (
                  <tr key={fn.name} className="border-b border-[var(--border-subtle)]/50 hover:bg-white/3">
                    <td className="px-4 py-2 text-[var(--text-primary)] truncate max-w-[200px]">
                      {fn.name.split(".").pop()}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px]",
                        cc > 20 ? "bg-red-500/15 text-red-400"
                        : cc > 10 ? "bg-yellow-500/15 text-yellow-400"
                        : "bg-green-500/15 text-green-400")}>
                        {cc}
                      </span>
                    </td>
                    <td className={cn("px-3 py-2 text-center text-[9px]", riskColor)}>{risk}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function PipelineCommandCenter() {
  const [scenario, setScenario] = useState<Scenario>("A");
  const meta = SCENARIO_META[scenario];
  const [currentStep, setCurrentStep] = useState<StepId>("code");
  const [doneSteps, setDoneSteps] = useState<Set<StepId>>(new Set());

  // ── Shared code/analyze state (A, C, D, E, G share code input + analysis) ──
  const [code, setCode] = useState("");
  const [filePath, setFilePath] = useState("untitled.py");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [selectedFns, setSelectedFns] = useState<Set<string>>(new Set());

  // ── Scenario B ──
  const [idea, setIdea] = useState("");
  const [irGenerating, setIrGenerating] = useState(false);
  const [irGenText, setIrGenText] = useState("");
  const [irGenError, setIrGenError] = useState<string | null>(null);

  // ── Scenario C ──
  const [testCode, setTestCode] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // ── Scenario D ──
  const [refactorPlan, setRefactorPlan] = useState("");
  const [refactorPlanLoading, setRefactorPlanLoading] = useState(false);
  const [refactorPlanError, setRefactorPlanError] = useState<string | null>(null);
  const [refactorResult, setRefactorResult] = useState<GenerateResult | null>(null);

  // ── Scenario E ──
  const [explanation, setExplanation] = useState("");
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // ── Scenario F ──
  const [spec, setSpec] = useState("");
  const [specIrText, setSpecIrText] = useState("");
  const [specIrLoading, setSpecIrLoading] = useState(false);
  const [specIrError, setSpecIrError] = useState<string | null>(null);

  // ── Shared generation ──
  const [irText, setIrText] = useState("");
  const [language, setLanguage] = useState("python");
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mark = (step: StepId) => setDoneSteps((p) => new Set([...p, step]));
  const goTo = (step: StepId) => setCurrentStep(step);

  // ── Shared: run analysis ───────────────────────────────────────────────────

  const runAnalysis = useCallback(async (nextStep: StepId, fromStep: StepId) => {
    if (!code.trim()) return;
    setAnalyzing(true); setAnalyzeResult(null); setSelectedFns(new Set());
    goTo(nextStep);
    try {
      const { job_id } = await startAnalysis(code, filePath);
      setJobId(job_id); mark(fromStep);
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

  // ── Shared: run generation ─────────────────────────────────────────────────

  const runGeneration = useCallback(async (ir: object, lang: string, desc: string, fromStep: StepId, toStep: StepId, onDone?: (r: GenerateResult) => void) => {
    setGenerating(true); goTo("generate"); mark(fromStep);
    try {
      const { job_id } = await startGeneration(ir, lang, desc);
      setJobId(job_id);
      let n = 0;
      pollRef.current = setInterval(async () => {
        if (++n > 80) { clearInterval(pollRef.current!); setGenerating(false); toast.error("Timeout"); return; }
        try {
          const s = await pollJob<GenerateResult>(job_id);
          if (s.status === "done" && s.result) {
            clearInterval(pollRef.current!); setGenerating(false);
            mark("generate"); goTo(toStep);
            if (onDone) onDone(s.result); else setGenerateResult(s.result);
          } else if (s.status === "error") {
            clearInterval(pollRef.current!); setGenerating(false);
            toast.error(s.error ?? "Помилка генерації");
          }
        } catch {}
      }, 1500);
    } catch { setGenerating(false); toast.error("Не вдалося запустити генерацію"); }
  }, []);

  // ── Scenario A handlers ────────────────────────────────────────────────────

  const handleAnalyzeA = useCallback(() => runAnalysis("analyze", "code"), [runAnalysis]);
  const handleToIR = useCallback(() => { mark("analyze"); goTo("ir"); }, []);
  const handleToEdit = useCallback(() => {
    if (!analyzeResult) return;
    const fns = analyzeResult.drakon_ir.filter((f) => selectedFns.has(f.name));
    setIrText(JSON.stringify(fns.length === 1 ? fns[0] : fns, null, 2));
    mark("ir"); goTo("edit");
  }, [analyzeResult, selectedFns]);
  const handleGenerateA = useCallback(async () => {
    let ir: object; try { ir = JSON.parse(irText); } catch { toast.error("Невалідний JSON"); return; }
    await runGeneration(ir, language, "", "edit", "result");
  }, [irText, language, runGeneration]);

  // ── Scenario B handlers ────────────────────────────────────────────────────

  const handleGenerateIR = useCallback(async () => {
    if (!idea.trim()) return;
    setIrGenerating(true); setIrGenText(""); setIrGenError(null);
    goTo("ir-gen"); mark("idea");
    try {
      const prompt = "Generate a DRAKON IR JSON structure for the following feature description:\n\n" + idea + "\n\nTarget language: " + language + "\n\nReturn ONLY valid JSON with 'name' and 'items' fields. No explanation, no markdown, just JSON.";
      const reply = await sendToAgent("architect", prompt);
      const parsed = extractJson(reply.reply);
      if (parsed) {
        const text = JSON.stringify(parsed, null, 2);
        setIrGenText(text); setIrText(text);
      } else {
        setIrGenError("Не вдалося розпарсити IR. Відредагуйте вручну.");
        setIrText(reply.reply);
      }
    } catch (e: unknown) {
      setIrGenError(e instanceof Error ? e.message : "Помилка з'єднання");
    } finally { setIrGenerating(false); }
  }, [idea, language]);

  const handleIRGenToEdit = useCallback(() => { mark("ir-gen"); goTo("edit"); }, []);
  const handleGenerateB = useCallback(async () => {
    let ir: object; try { ir = JSON.parse(irText); } catch { toast.error("Невалідний JSON"); return; }
    await runGeneration(ir, language, idea, "edit", "result");
  }, [irText, language, idea, runGeneration]);

  // ── Scenario C handlers ────────────────────────────────────────────────────

  const handleAnalyzeC = useCallback(() => runAnalysis("analyze-c", "code-c"), [runAnalysis]);
  const handleGenerateTests = useCallback(async () => {
    if (!analyzeResult) return;
    const fns = analyzeResult.drakon_ir.filter((f) => selectedFns.has(f.name));
    mark("analyze-c"); goTo("test-gen");
    setTestLoading(true); setTestCode(""); setTestError(null);
    try {
      const prompt = "Generate comprehensive pytest test cases for the following functions based on their DRAKON IR structure.\n\nDRAKON IR:\n" + JSON.stringify(fns, null, 2) + "\n\nRequirements:\n- Cover every branch and condition path shown in the IR\n- Use descriptive test function names\n- Include edge cases\n- Add docstrings explaining what each test covers\n- Return ONLY the Python test code, no explanations";
      const reply = await sendToAgent("docs", prompt);
      setTestCode(reply.reply);
      mark("test-gen"); goTo("test-result");
    } catch (e: unknown) {
      setTestError(e instanceof Error ? e.message : "Помилка з'єднання");
    } finally { setTestLoading(false); }
  }, [analyzeResult, selectedFns]);

  // ── Scenario D handlers ────────────────────────────────────────────────────

  const handleAnalyzeD = useCallback(() => runAnalysis("analyze-d", "code-d"), [runAnalysis]);
  const handleRefactorPlan = useCallback(async () => {
    if (!analyzeResult) return;
    const fns = analyzeResult.drakon_ir.filter((f) => selectedFns.has(f.name));
    mark("analyze-d"); goTo("refactor-plan");
    setRefactorPlanLoading(true); setRefactorPlan(""); setRefactorPlanError(null);
    try {
      const highCC = fns.filter((f) => (f.cyclomatic_complexity ?? 0) > 10);
      const prompt = "Analyze the following functions with high cyclomatic complexity and provide a refactoring plan.\n\nFunctions:\n" + JSON.stringify(fns, null, 2) + "\n\nOriginal code:\n" + code + "\n\nProvide:\n## Аналіз складності\n## Пропозиції рефакторингу\n## Кроки реалізації\n## Очікуваний результат\n\nWrite in Ukrainian. Be specific and actionable.";
      const reply = await sendToAgent("architect", prompt);
      setRefactorPlan(reply.reply);
      const irForRefactor = highCC.length > 0 ? highCC : fns;
      setIrText(JSON.stringify(irForRefactor.length === 1 ? irForRefactor[0] : irForRefactor, null, 2));
    } catch (e: unknown) {
      setRefactorPlanError(e instanceof Error ? e.message : "Помилка з'єднання");
    } finally { setRefactorPlanLoading(false); }
  }, [analyzeResult, selectedFns, code]);

  const handleRefactorGenerate = useCallback(async () => {
    let ir: object; try { ir = JSON.parse(irText); } catch { toast.error("Невалідний JSON"); return; }
    await runGeneration(ir, language, "Refactor to reduce complexity: " + refactorPlan.slice(0, 200), "refactor-plan", "refactor-res", (r) => { setRefactorResult(r); });
  }, [irText, language, refactorPlan, runGeneration]);

  // ── Scenario E handlers ────────────────────────────────────────────────────

  const handleAnalyzeE = useCallback(() => runAnalysis("analyze-e", "code-e"), [runAnalysis]);
  const handleExplain = useCallback(async () => {
    if (!analyzeResult) return;
    const fns = analyzeResult.drakon_ir.filter((f) => selectedFns.has(f.name));
    mark("analyze-e"); goTo("explain");
    setExplainLoading(true); setExplanation(""); setExplainError(null);
    try {
      const prompt = "Based on this DRAKON IR structure, provide a clear and detailed explanation of the algorithm in Ukrainian.\n\nDRAKON IR:\n" + JSON.stringify(fns, null, 2) + "\n\nOriginal source code:\n" + code + "\n\nStructure your response as:\n## Огляд алгоритму\n## Покрокове виконання\n## Ключові умови та гілки\n## Складність та особливості\n## Можливі покращення\n\nBe thorough but concise. Write in Ukrainian.";
      const reply = await sendToAgent("docs", prompt);
      setExplanation(reply.reply);
      mark("explain"); goTo("doc-result");
    } catch (e: unknown) {
      setExplainError(e instanceof Error ? e.message : "Помилка з'єднання");
    } finally { setExplainLoading(false); }
  }, [analyzeResult, selectedFns, code]);

  // trigger explain automatically when entering explain step
  useEffect(() => {
    if (scenario === "E" && currentStep === "explain" && !explanation && !explainLoading) {
      handleExplain();
    }
  }, [scenario, currentStep]);

  // ── Scenario F handlers ────────────────────────────────────────────────────

  const handleSpecToIR = useCallback(async () => {
    if (!spec.trim()) return;
    setSpecIrLoading(true); setSpecIrText(""); setSpecIrError(null);
    goTo("ir-spec"); mark("spec");
    try {
      const prompt = "Convert the following specification into a DRAKON IR JSON structure.\n\nSpecification:\n" + spec + "\n\nTarget language: " + language + "\n\nReturn ONLY valid JSON representing the DRAKON IR with 'name', 'items', and 'params' fields. No explanation, no markdown, just JSON.";
      const reply = await sendToAgent("architect", prompt);
      const parsed = extractJson(reply.reply);
      if (parsed) {
        const text = JSON.stringify(parsed, null, 2);
        setSpecIrText(text); setIrText(text);
      } else {
        setSpecIrError("Не вдалося розпарсити IR. Відредагуйте вручну.");
        setIrText(reply.reply);
      }
    } catch (e: unknown) {
      setSpecIrError(e instanceof Error ? e.message : "Помилка з'єднання");
    } finally { setSpecIrLoading(false); }
  }, [spec, language]);

  const handleSpecIRToEdit = useCallback(() => { mark("ir-spec"); goTo("edit-f"); }, []);
  const handleGenerateF = useCallback(async () => {
    let ir: object; try { ir = JSON.parse(irText); } catch { toast.error("Невалідний JSON"); return; }
    await runGeneration(ir, language, spec, "edit-f", "result-f");
  }, [irText, language, spec, runGeneration]);

  // ── Scenario G handlers ────────────────────────────────────────────────────

  const handleAnalyzeG = useCallback(async () => {
    if (!code.trim()) return;
    setAnalyzing(true); setAnalyzeResult(null);
    goTo("batch-result"); mark("code-g");
    try {
      const { job_id } = await startAnalysis(code, filePath);
      setJobId(job_id);
      let n = 0;
      pollRef.current = setInterval(async () => {
        if (++n > 60) { clearInterval(pollRef.current!); setAnalyzing(false); toast.error("Timeout"); return; }
        try {
          const s = await pollJob<AnalyzeResult>(job_id);
          if (s.status === "done" && s.result) {
            clearInterval(pollRef.current!); setAnalyzing(false); setAnalyzeResult(s.result);
          } else if (s.status === "error") {
            clearInterval(pollRef.current!); setAnalyzing(false); toast.error(s.error ?? "Помилка");
          }
        } catch {}
      }, 1500);
    } catch { setAnalyzing(false); toast.error("Не вдалося"); }
  }, [code, filePath]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setCurrentStep(meta.firstStep);
    setDoneSteps(new Set());
    setAnalyzing(false); setAnalyzeResult(null); setSelectedFns(new Set()); setJobId(null);
    setIrText(""); setGenerating(false); setGenerateResult(null);
    setTestCode(""); setTestLoading(false); setTestError(null);
    setRefactorPlan(""); setRefactorPlanLoading(false); setRefactorPlanError(null); setRefactorResult(null);
    setExplanation(""); setExplainLoading(false); setExplainError(null);
    setSpecIrText(""); setSpecIrLoading(false); setSpecIrError(null);
  }, [meta.firstStep]);

  const switchScenario = (s: Scenario) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setScenario(s);
    setCurrentStep(SCENARIO_META[s].firstStep);
    setDoneSteps(new Set());
    setAnalyzing(false); setAnalyzeResult(null); setGenerating(false);
    setGenerateResult(null); setRefactorResult(null);
    setTestCode(""); setExplanation(""); setSpecIrText("");
    setIrGenText(""); setIrGenError(null);
  };

  const selectedFnList = analyzeResult
    ? analyzeResult.drakon_ir.filter((f) => selectedFns.has(f.name)) : [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-base)]">
      {/* Left sidebar */}
      <aside className="w-48 shrink-0 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {/* Scenario list */}
        <div className="px-2 pt-2.5 pb-1 border-b border-[var(--border-subtle)] shrink-0">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1.5 px-1">
            Сценарій
          </div>
        </div>
        <div className="overflow-y-auto flex-shrink-0 border-b border-[var(--border-subtle)]">
          {(Object.keys(SCENARIO_META) as Scenario[]).map((s) => {
            const m = SCENARIO_META[s];
            const Icon = m.icon;
            const active = s === scenario;
            return (
              <button key={s} type="button" onClick={() => switchScenario(s)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors border-b border-[var(--border-subtle)]/30",
                  active
                    ? "bg-[var(--accent-dim)] border-l-2 border-l-[var(--accent-amber)]"
                    : "hover:bg-white/5",
                )}>
                <div className={cn(
                  "h-5 w-5 rounded flex items-center justify-center shrink-0 font-mono text-[9px] font-bold",
                  active ? "bg-[var(--accent-amber)] text-[#1a0a00]" : "bg-[var(--border-subtle)] text-[var(--text-muted)]"
                )}>
                  {s}
                </div>
                <div className="min-w-0">
                  <div className={cn("font-mono text-[10px] leading-tight font-medium",
                    active ? "text-[var(--accent-amber)]" : "text-[var(--text-secondary)]")}>
                    {m.label}
                  </div>
                  <div className="font-mono text-[8px] text-[var(--text-muted)] truncate">{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Steps */}
        <nav className="flex-1 overflow-y-auto py-3 px-1">
          {meta.steps.map((step, i) => (
            <StepIndicator key={step.id} step={step} index={i} steps={meta.steps}
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
            Сценарій {scenario}
          </span>
          <span className="text-[var(--border-subtle)]">·</span>
          <span className="font-mono text-[11px] text-[var(--accent-amber)]">
            {meta.steps.find((s) => s.id === currentStep)?.label ?? currentStep}
          </span>
          {jobId && (
            <span className="ml-auto font-mono text-[9px] text-[var(--text-muted)] truncate">
              job: {jobId.slice(0, 8)}…
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">

          {/* ── Scenario A ── */}
          {scenario === "A" && currentStep === "code" && (
            <PanelCode code={code} setCode={setCode} filePath={filePath} setFilePath={setFilePath}
              onNext={handleAnalyzeA} loading={analyzing} />
          )}
          {scenario === "A" && currentStep === "analyze" && (
            <PanelAnalyzeBase analyzing={analyzing} result={analyzeResult}
              selected={selectedFns} setSelected={setSelectedFns} onNext={handleToIR} />
          )}
          {scenario === "A" && currentStep === "ir" && (
            <PanelIR fns={selectedFnList} onNext={handleToEdit} />
          )}
          {scenario === "A" && currentStep === "edit" && (
            <PanelEdit irText={irText} setIrText={setIrText} language={language}
              setLanguage={setLanguage} onNext={handleGenerateA} generating={generating} />
          )}
          {scenario === "A" && currentStep === "generate" && <PanelGenerate generating={generating} />}
          {scenario === "A" && currentStep === "result" && generateResult && (
            <PanelResult result={generateResult} onReset={handleReset} />
          )}

          {/* ── Scenario B ── */}
          {scenario === "B" && currentStep === "idea" && (
            <PanelIdea idea={idea} setIdea={setIdea} language={language} setLanguage={setLanguage}
              onNext={handleGenerateIR} loading={irGenerating} />
          )}
          {scenario === "B" && currentStep === "ir-gen" && (
            <PanelIRGen loading={irGenerating} irText={irGenText} error={irGenError} onNext={handleIRGenToEdit} />
          )}
          {scenario === "B" && currentStep === "edit" && (
            <PanelEdit irText={irText} setIrText={setIrText} language={language}
              setLanguage={setLanguage} onNext={handleGenerateB} generating={generating} />
          )}
          {scenario === "B" && currentStep === "generate" && <PanelGenerate generating={generating} />}
          {scenario === "B" && currentStep === "result" && generateResult && (
            <PanelResult result={generateResult} onReset={handleReset} />
          )}

          {/* ── Scenario C ── */}
          {scenario === "C" && currentStep === "code-c" && (
            <PanelCode code={code} setCode={setCode} filePath={filePath} setFilePath={setFilePath}
              onNext={handleAnalyzeC} loading={analyzing} btnLabel="Аналізувати" />
          )}
          {scenario === "C" && currentStep === "analyze-c" && (
            <PanelAnalyzeBase analyzing={analyzing} result={analyzeResult}
              selected={selectedFns} setSelected={setSelectedFns}
              onNext={handleGenerateTests} btnLabel="Генерувати тести" />
          )}
          {scenario === "C" && (currentStep === "test-gen" || currentStep === "test-result") && (
            <PanelTestGen loading={testLoading} testCode={testCode} error={testError} />
          )}

          {/* ── Scenario D ── */}
          {scenario === "D" && currentStep === "code-d" && (
            <PanelCode code={code} setCode={setCode} filePath={filePath} setFilePath={setFilePath}
              onNext={handleAnalyzeD} loading={analyzing} btnLabel="Аналізувати CC" />
          )}
          {scenario === "D" && currentStep === "analyze-d" && (
            <PanelAnalyzeBase analyzing={analyzing} result={analyzeResult}
              selected={selectedFns} setSelected={setSelectedFns}
              onNext={handleRefactorPlan} btnLabel="Скласти план" />
          )}
          {scenario === "D" && currentStep === "refactor-plan" && (
            <PanelRefactorPlan loading={refactorPlanLoading} plan={refactorPlan}
              error={refactorPlanError} onNext={handleRefactorGenerate} generating={generating} />
          )}
          {scenario === "D" && currentStep === "refactor-gen" && <PanelGenerate generating={generating} />}
          {scenario === "D" && currentStep === "refactor-res" && refactorResult && (
            <PanelResult result={refactorResult} onReset={handleReset} />
          )}

          {/* ── Scenario E ── */}
          {scenario === "E" && currentStep === "code-e" && (
            <PanelCode code={code} setCode={setCode} filePath={filePath} setFilePath={setFilePath}
              onNext={handleAnalyzeE} loading={analyzing} btnLabel="Аналізувати" />
          )}
          {scenario === "E" && currentStep === "analyze-e" && (
            <PanelAnalyzeBase analyzing={analyzing} result={analyzeResult}
              selected={selectedFns} setSelected={setSelectedFns}
              onNext={handleExplain} btnLabel="Пояснити" />
          )}
          {scenario === "E" && (currentStep === "explain" || currentStep === "doc-result") && (
            <PanelExplain loading={explainLoading} explanation={explanation} error={explainError} />
          )}

          {/* ── Scenario F ── */}
          {scenario === "F" && currentStep === "spec" && (
            <PanelSpec spec={spec} setSpec={setSpec} language={language} setLanguage={setLanguage}
              onNext={handleSpecToIR} loading={specIrLoading} />
          )}
          {scenario === "F" && currentStep === "ir-spec" && (
            <PanelIRGen loading={specIrLoading} irText={specIrText} error={specIrError} onNext={handleSpecIRToEdit} />
          )}
          {scenario === "F" && currentStep === "edit-f" && (
            <PanelEdit irText={irText} setIrText={setIrText} language={language}
              setLanguage={setLanguage} onNext={handleGenerateF} generating={generating} />
          )}
          {scenario === "F" && currentStep === "generate-f" && <PanelGenerate generating={generating} />}
          {scenario === "F" && currentStep === "result-f" && generateResult && (
            <PanelResult result={generateResult} onReset={handleReset} />
          )}

          {/* ── Scenario G ── */}
          {scenario === "G" && currentStep === "code-g" && (
            <PanelCode code={code} setCode={setCode} filePath={filePath} setFilePath={setFilePath}
              onNext={handleAnalyzeG} loading={analyzing} btnLabel="Проаналізувати модуль" />
          )}
          {scenario === "G" && currentStep === "batch-result" && (
            <PanelBatchResult analyzing={analyzing} result={analyzeResult} />
          )}

        </div>
      </main>
    </div>
  );
}
