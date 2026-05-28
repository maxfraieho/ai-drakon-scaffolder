---
tags:
  - domain:plan
  - status:active
  - format:plan
created: 2026-05-16
updated: 2026-05-28
tier: 3
title: "Інтерфейс пайплайну — План реалізації"
lang: uk
---

# Pipeline UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Pipeline A (code→DRAKON IR) and Pipeline B (IR→code) UI panels, plus remove redundant "Файли" tab from Docs.

**Architecture:** Two new components mount inside existing pages — CodeAnalysisPanel as a right-side rail in DiagramsPage (list view), CodeGenerationPanel as a bottom drawer in DiagramEditorPage. Both use the setInterval polling pattern from docs.tsx. Direct implementation on dev server (192.168.3.184), then sync to .lovable/src/ and commit.

**Tech Stack:** React 18, TypeScript, TanStack Router, lucide-react, Sonner toasts, Precision Dark CSS vars, JetBrains Mono

**Dev server:** `sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184`
**Project root:** `~/workspace/ai-drakon-setup/`

---

## Context: What exists, what's missing

**Backend (all deployed ✅):**
- `POST /v1/pipeline/analyze` → `{ job_id }` (Pipeline A: code→IR)
- `POST /v1/pipeline/generate` → `{ job_id }` (Pipeline B: IR→code)
- `GET /v1/pipeline/status/{job_id}` → `{ status, result, error }` — all require JWT

**Frontend (missing):**
- `src/lib/pipeline-api.ts` — API client
- `src/components/pipeline/CodeAnalysisPanel.tsx` — right panel in DiagramsPage
- `src/components/pipeline/CodeGenerationPanel.tsx` — bottom drawer in DiagramEditorPage

**Key existing patterns to reuse:**
- Polling: `docs.tsx` setInterval + status check pattern (lines 46-84)
- Right panel: `DiagramEditorPage` `<aside>` with animated width (ValidationPanel pattern)
- Toolbar button: `DiagramEditorPage` toolbar button style (ShieldCheck icon pattern)
- Import IR: `DiagramsPage.handleImportJson` (lines ~287-320) — create Diagram from IR, upsertDiagramInStorage, navigate to editor

---

## Task 1: Create `src/lib/pipeline-api.ts`

**Files:**
- Create: `~/workspace/ai-drakon-setup/src/lib/pipeline-api.ts`
- Mirror: `~/workspace/ai-drakon-setup/.lovable/src/lib/pipeline-api.ts`

**Step 1: Write the file on dev server**

```bash
cat > ~/workspace/ai-drakon-setup/src/lib/pipeline-api.ts << 'EOF'
const workerUrl = () =>
  (typeof window !== "undefined" && (window as any).__ENV_WORKER_URL__) ||
  import.meta.env.VITE_WORKER_URL ||
  "https://drakon-mcp-worker.maxfraieho.workers.dev";

function authHeaders(): Record<string, string> {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
  return {
    "Content-Type": "application/json",
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };
}

export interface PipelineJob {
  job_id: string;
}

export interface AnalyzedFunction {
  name: string;
  params: string;
  items: Record<string, unknown>;
  error?: string;
}

export interface AnalyzeResult {
  drakon_ir: AnalyzedFunction[];
  tree_level: string;
  cyclomatic_complexity: number;
  validation_errors: string[];
}

export interface GenerateResult {
  code: string;
  language: string;
  syntax_errors: string[];
  iterations: number;
}

export interface JobStatus<T = unknown> {
  job_id: string;
  status: "pending" | "running" | "done" | "error";
  result: T;
  error: string;
}

export async function startAnalysis(
  source_code: string,
  file_path = "module.py",
): Promise<PipelineJob> {
  const res = await fetch(`${workerUrl()}/v1/pipeline/analyze`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ source_code, file_path }),
  });
  if (!res.ok) throw new Error(`analyze HTTP ${res.status}`);
  return res.json();
}

export async function startGeneration(
  drakon_ir: object,
  language: string,
  description = "",
): Promise<PipelineJob> {
  const res = await fetch(`${workerUrl()}/v1/pipeline/generate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ drakon_ir, description, language }),
  });
  if (!res.ok) throw new Error(`generate HTTP ${res.status}`);
  return res.json();
}

export async function pollJob<T = unknown>(job_id: string): Promise<JobStatus<T>> {
  const res = await fetch(`${workerUrl()}/v1/pipeline/status/${job_id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`status HTTP ${res.status}`);
  return res.json();
}
EOF
```

**Step 2: Mirror to .lovable**

```bash
cp ~/workspace/ai-drakon-setup/src/lib/pipeline-api.ts \
   ~/workspace/ai-drakon-setup/.lovable/src/lib/pipeline-api.ts
```

**Step 3: Verify no syntax errors**

```bash
cd ~/workspace/ai-drakon-setup && npx tsc --noEmit --skipLibCheck 2>&1 | grep pipeline-api
```
Expected: no output (no errors)

**Step 4: Commit**

```bash
cd ~/workspace/ai-drakon-setup && git add src/lib/pipeline-api.ts .lovable/src/lib/pipeline-api.ts
git commit -m "feat: add pipeline-api.ts for Pipeline A/B frontend integration"
```

---

## Task 2: Create `src/components/pipeline/CodeAnalysisPanel.tsx`

**Files:**
- Create: `~/workspace/ai-drakon-setup/src/components/pipeline/CodeAnalysisPanel.tsx`
- Mirror: `~/workspace/ai-drakon-setup/.lovable/src/components/pipeline/CodeAnalysisPanel.tsx`

**Context:** This panel appears as a right-side collapsible rail in DiagramsPage (list view). User pastes Python code → "Аналізувати" → polling → list of functions with CC score → "↓ Імпортувати" button per function calls `onImportIr`.

**Step 1: Create directory**

```bash
mkdir -p ~/workspace/ai-drakon-setup/src/components/pipeline
mkdir -p ~/workspace/ai-drakon-setup/.lovable/src/components/pipeline
```

**Step 2: Write CodeAnalysisPanel.tsx**

```bash
cat > ~/workspace/ai-drakon-setup/src/components/pipeline/CodeAnalysisPanel.tsx << 'EOF'
import { useEffect, useRef, useState } from "react";
import { X, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { startAnalysis, pollJob, type AnalyzeResult, type AnalyzedFunction } from "@/lib/pipeline-api";

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

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast.error("Вставте Python-код для аналізу");
      return;
    }
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
            setStatus("done");
            setResult(data.result as AnalyzeResult);
          } else if (data.status === "error") {
            setStatus("error");
            setErrorMsg(data.error || "Помилка аналізу");
          }
        } catch (e: unknown) {
          if (cancelled) return;
          if (e instanceof Error && e.message.includes("404")) {
            setStatus("error");
            setErrorMsg("Сервіс недоступний — спробуйте знову");
          } else {
            setStatus("error");
            setErrorMsg(e instanceof Error ? e.message : "Невідома помилка");
          }
        }
      };
      const id = setInterval(tick, 3000);
      void tick();
      // store cleanup ref
      (handleAnalyze as any)._cleanup = () => {
        cancelled = true;
        clearInterval(id);
      };
    } catch (e: unknown) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Невідома помилка");
    }
  };

  const handleReset = () => {
    (handleAnalyze as any)._cleanup?.();
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
      {/* Header */}
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

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 overflow-auto p-3">
        {status === "idle" || status === "running" ? (
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
                "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-black transition-colors",
                status === "running"
                  ? "cursor-not-allowed bg-[var(--accent-amber)]/50"
                  : "bg-[var(--accent-amber)] active:scale-[0.96]",
              )}
              style={{ transition: "transform 100ms" }}
            >
              {status === "running" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {elapsed}с…
                </>
              ) : (
                "Аналізувати"
              )}
            </button>
          </>
        ) : null}

        {status === "done" && result ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Результат — {result.tree_level} (CC {result.cyclomatic_complexity})
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
                    {fn.error ? (
                      <span className="ml-1 text-red-400">— помилка</span>
                    ) : null}
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
        ) : null}

        {status === "error" ? (
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
        ) : null}
      </div>
    </aside>
  );
}
EOF
```

**Step 3: Mirror to .lovable**

```bash
cp ~/workspace/ai-drakon-setup/src/components/pipeline/CodeAnalysisPanel.tsx \
   ~/workspace/ai-drakon-setup/.lovable/src/components/pipeline/CodeAnalysisPanel.tsx
```

**Step 4: TypeCheck**

```bash
cd ~/workspace/ai-drakon-setup && npx tsc --noEmit --skipLibCheck 2>&1 | grep -i 'CodeAnalysis\|pipeline' | head -20
```
Expected: no errors

**Step 5: Commit**

```bash
cd ~/workspace/ai-drakon-setup
git add src/components/pipeline/CodeAnalysisPanel.tsx .lovable/src/components/pipeline/CodeAnalysisPanel.tsx
git commit -m "feat: add CodeAnalysisPanel for Pipeline A (code→DRAKON IR)"
```

---

## Task 3: Create `src/components/pipeline/CodeGenerationPanel.tsx`

**Files:**
- Create: `~/workspace/ai-drakon-setup/src/components/pipeline/CodeGenerationPanel.tsx`
- Mirror: `.lovable/src/components/pipeline/CodeGenerationPanel.tsx`

**Context:** Bottom drawer in DiagramEditorPage. Receives `diagramIr` (current diagram items). User picks language, optional description, "Генерувати" → polls → shows code block with copy button.

**Step 1: Write CodeGenerationPanel.tsx**

```bash
cat > ~/workspace/ai-drakon-setup/src/components/pipeline/CodeGenerationPanel.tsx << 'EOF'
import { useEffect, useRef, useState } from "react";
import { X, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { startGeneration, pollJob, type GenerateResult } from "@/lib/pipeline-api";

type Language = "python" | "typescript" | "javascript";

interface CodeGenerationPanelProps {
  open: boolean;
  onClose: () => void;
  diagramIr: object | null;
}

type PanelStatus = "idle" | "running" | "done" | "error";

const LANG_LABELS: Record<Language, string> = {
  python: "Python",
  typescript: "TypeScript",
  javascript: "JavaScript",
};

export function CodeGenerationPanel({ open, onClose, diagramIr }: CodeGenerationPanelProps) {
  const [language, setLanguage] = useState<Language>("python");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

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

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const handleGenerate = async () => {
    if (!diagramIr) return;
    cleanupRef.current?.();
    setStatus("running");
    setResult(null);
    setErrorMsg("");

    try {
      const { job_id } = await startGeneration(diagramIr, language, description);
      let cancelled = false;
      const tick = async () => {
        try {
          const data = await pollJob<GenerateResult>(job_id);
          if (cancelled) return;
          if (data.status === "done") {
            setStatus("done");
            setResult(data.result as GenerateResult);
          } else if (data.status === "error") {
            setStatus("error");
            setErrorMsg(data.error || "Помилка генерації");
          }
        } catch (e: unknown) {
          if (cancelled) return;
          if (e instanceof Error && e.message.includes("404")) {
            setStatus("error");
            setErrorMsg("Сервіс недоступний — спробуйте знову");
          } else {
            setStatus("error");
            setErrorMsg(e instanceof Error ? e.message : "Невідома помилка");
          }
        }
      };
      const id = setInterval(tick, 3000);
      void tick();
      cleanupRef.current = () => {
        cancelled = true;
        clearInterval(id);
      };
    } catch (e: unknown) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Невідома помилка");
    }
  };

  const handleCopy = async () => {
    if (!result?.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      toast.success("Скопійовано");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не вдалося скопіювати");
    }
  };

  const handleReset = () => {
    cleanupRef.current?.();
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setElapsed(0);
  };

  if (!open) return null;

  return (
    <div
      className="flex h-[280px] shrink-0 flex-col border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      aria-label="Генерація коду"
    >
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Генерувати код
        </span>

        {/* Language tabs */}
        <div className="flex items-center gap-0.5">
          {(["python", "typescript", "javascript"] as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={cn(
                "rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                language === lang
                  ? "bg-[var(--accent-amber)] text-black"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 overflow-auto p-3">
        {!diagramIr ? (
          <p className="font-mono text-xs text-[var(--text-muted)]">
            Відкрийте схему для генерації коду.
          </p>
        ) : status === "idle" ? (
          <>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опис поведінки (необов'язково)"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-base)] px-2 py-1.5 text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-amber)] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-amber)] px-4 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-black active:scale-[0.96]"
              style={{ transition: "transform 100ms" }}
            >
              Генерувати
            </button>
          </>
        ) : status === "running" ? (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-amber)]" />
            <span className="font-mono text-xs text-[var(--text-muted)]">
              Генерація… {elapsed}с
            </span>
          </div>
        ) : status === "done" && result ? (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <pre className="max-h-[160px] overflow-auto rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] p-2 font-mono text-xs text-[var(--text-primary)]">
                <code>{result.code}</code>
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Копіювати код"
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
              >
                {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                Копіювати
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "font-mono text-[10px]",
                  result.syntax_errors.length === 0 ? "text-green-400" : "text-red-400",
                )}
              >
                {result.syntax_errors.length === 0
                  ? "syntax ✓"
                  : `syntax: ${result.syntax_errors.length} помилок`}
              </span>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                {result.iterations} іт.
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                Перегенерувати
              </button>
            </div>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col gap-2">
            <div className="rounded-[var(--radius-sm)] border border-red-500/20 bg-red-500/5 px-3 py-2">
              <p className="font-mono text-xs text-red-400">{errorMsg}</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-default)] px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              Повторити
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
EOF
```

**Step 2: Mirror**

```bash
cp ~/workspace/ai-drakon-setup/src/components/pipeline/CodeGenerationPanel.tsx \
   ~/workspace/ai-drakon-setup/.lovable/src/components/pipeline/CodeGenerationPanel.tsx
```

**Step 3: TypeCheck**

```bash
cd ~/workspace/ai-drakon-setup && npx tsc --noEmit --skipLibCheck 2>&1 | grep -i 'CodeGeneration\|pipeline' | head -20
```

**Step 4: Commit**

```bash
cd ~/workspace/ai-drakon-setup
git add src/components/pipeline/CodeGenerationPanel.tsx .lovable/src/components/pipeline/CodeGenerationPanel.tsx
git commit -m "feat: add CodeGenerationPanel for Pipeline B (IR→code)"
```

---

## Task 4: Integrate CodeAnalysisPanel into DiagramsPage

**File:** `~/workspace/ai-drakon-setup/src/pages/DiagramsPage.tsx`

**What to change:**
1. Import `CodeAnalysisPanel` and `ScanSearch`, `Code2` icons
2. Add state `const [isPipelineOpen, setIsPipelineOpen] = useState(false);`
3. Add "Аналізувати код" button to toolbar (near IMPORT button, line ~670)
4. Wrap content area with flex row when `isPipelineOpen`
5. Add `onImportIr` handler that creates diagram from IR

**Step 1: Read current imports block to find correct insertion point**

```bash
sed -n '1,35p' ~/workspace/ai-drakon-setup/src/pages/DiagramsPage.tsx
```

**Step 2: Add import for CodeAnalysisPanel**

Find the line with `import { GitHubPanel }` and add after it:
```typescript
import { CodeAnalysisPanel } from "@/components/pipeline/CodeAnalysisPanel";
import type { AnalyzedFunction } from "@/lib/pipeline-api";
```

Also add `ScanSearch` to the lucide-react import.

**Step 3: Add state after `isGitHubOpen` state (line ~137)**

Find:
```typescript
const [isGitHubOpen, setIsGitHubOpen] = useState(false);
```
Add after:
```typescript
const [isPipelineAnalysisOpen, setIsPipelineAnalysisOpen] = useState(false);
```

**Step 4: Add `handleImportIr` function** — add near `openNewDiagram` (line ~275):

```typescript
const handleImportIr = (fn: AnalyzedFunction) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const diagram = {
    id,
    name: fn.name,
    folderId: selectedFolder.slug,
    createdAt: now,
    updatedAt: now,
    diagram: {
      name: fn.name,
      items: fn.items as Record<string, import("@/types/drakon").DrakonItem>,
      metadata: { sourceType: "ai" as const, diagramLevel: "L1" as const },
    },
  };
  upsertDiagramInStorage(diagram);
  navigate({
    to: "/diagram/editor",
    search: { diagramId: id, folderId: selectedFolder.slug },
  });
};
```

**Step 5: Add "Аналізувати код" button to toolbar**

In the toolbar div (line ~647, where IMPORT and + NEW buttons are), find the IMPORT button block and add before it:
```tsx
<button
  type="button"
  onClick={() => setIsPipelineAnalysisOpen((v) => !v)}
  aria-pressed={isPipelineAnalysisOpen}
  className={cn(
    "hidden rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-transparent px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 md:inline-flex items-center gap-1.5",
    isPipelineAnalysisOpen
      ? "border-[var(--accent-amber)] text-[var(--accent-amber)]"
      : "text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
  )}
>
  <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
  Аналіз
</button>
```

**Step 6: Wrap content area with flex row**

Find the CONTENT div (line ~754):
```tsx
<div className="flex flex-1 flex-col gap-4 p-4 md:p-6 xl:flex-row">
```

This is the outer content div. The `CodeAnalysisPanel` needs to be rendered at the same level as this div, as a sibling, forming a flex row. Find the parent div and wrap:

Replace the outer main `<main>` or container that holds the header, level-tabs, and content with a flex-row wrapper. The simplest approach: render `CodeAnalysisPanel` as a sibling to the existing `<main>` element using the `xl:flex-row` div already in place.

Actually the cleanest change: **add `CodeAnalysisPanel` right before `</main>` closing tag** and make it a flex sibling by adding `flex flex-row min-h-0` to the main content area.

Find the exact structure by running:
```bash
grep -n 'CONTENT\|<main\|</main\|flex-1 flex-col' ~/workspace/ai-drakon-setup/src/pages/DiagramsPage.tsx | head -20
```

Then add the panel as a flex-row sibling to the diagram list section.

**Step 7: Mirror and TypeCheck**

```bash
cp ~/workspace/ai-drakon-setup/src/pages/DiagramsPage.tsx \
   ~/workspace/ai-drakon-setup/.lovable/src/pages/DiagramsPage.tsx
cd ~/workspace/ai-drakon-setup && npx tsc --noEmit --skipLibCheck 2>&1 | grep -i 'DiagramsPage\|pipeline' | head -20
```

**Step 8: Commit**

```bash
git add src/pages/DiagramsPage.tsx .lovable/src/pages/DiagramsPage.tsx
git commit -m "feat: integrate CodeAnalysisPanel into DiagramsPage toolbar"
```

---

## Task 5: Integrate CodeGenerationPanel into DiagramEditorPage

**File:** `~/workspace/ai-drakon-setup/src/pages/DiagramEditorPage.tsx`

**What to change:**
1. Import `CodeGenerationPanel` and `Code2` icon
2. Add state `const [codeGenOpen, setCodeGenOpen] = useState(false);`
3. Add "Генерувати код" button to toolbar (after ShieldCheck button)
4. Add `CodeGenerationPanel` as bottom drawer in the main content area
5. Pass `diagramData?.items ?? null` as `diagramIr`

**Step 1: Add import**

After the `ValidationPanel` import line:
```typescript
import { CodeGenerationPanel } from "@/components/pipeline/CodeGenerationPanel";
```

Add `Code2` to lucide-react imports.

**Step 2: Add state after `validationOpen`**

```typescript
const [codeGenOpen, setCodeGenOpen] = useState(false);
```

**Step 3: Add "Генерувати код" button to toolbar** (after ShieldCheck button, line ~147):

```tsx
<button
  type="button"
  onClick={() => setCodeGenOpen((v) => !v)}
  aria-label={codeGenOpen ? "Закрити генерацію коду" : "Відкрити генерацію коду"}
  aria-pressed={codeGenOpen}
  title="Генерувати код"
  className={cn(
    "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
    codeGenOpen
      ? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
      : "text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]",
  )}
  style={{ transition: "transform 100ms, background-color 150ms, color 150ms" }}
>
  <Code2 className="h-4 w-4" aria-hidden="true" />
</button>
```

**Step 4: Add CodeGenerationPanel as bottom drawer**

Find the main content div:
```tsx
<div className="min-w-0 flex-1 overflow-hidden p-3 md:p-4">
  <DrakonEditor ... />
</div>
```

Change to flex column + add panel below:
```tsx
<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
  <div className="flex-1 overflow-hidden p-3 md:p-4">
    <DrakonEditor ... />
  </div>
  <CodeGenerationPanel
    open={codeGenOpen}
    onClose={() => setCodeGenOpen(false)}
    diagramIr={diagramData?.items ?? null}
  />
</div>
```

**Step 5: Mirror and TypeCheck**

```bash
cp ~/workspace/ai-drakon-setup/src/pages/DiagramEditorPage.tsx \
   ~/workspace/ai-drakon-setup/.lovable/src/pages/DiagramEditorPage.tsx
cd ~/workspace/ai-drakon-setup && npx tsc --noEmit --skipLibCheck 2>&1 | grep -i 'DiagramEditor\|CodeGen' | head -20
```

**Step 6: Commit**

```bash
git add src/pages/DiagramEditorPage.tsx .lovable/src/pages/DiagramEditorPage.tsx
git commit -m "feat: integrate CodeGenerationPanel into DiagramEditorPage toolbar"
```

---

## Task 6: Remove "Файли" tab, add search to NotesTab sidebar

### Part A: docs.tsx — remove "files" tab

**File:** `~/workspace/ai-drakon-setup/src/routes/docs.tsx`

**Step 1: Read current tabs**

```bash
grep -n '"files"\|DocsFilesTab\|TabsTrigger\|docsTab' ~/workspace/ai-drakon-setup/src/routes/docs.tsx | head -20
```

**Step 2: Remove "files" from type**

Find: `"generator" | "notes" | "files" | "graph"`
Replace: `"generator" | "notes" | "graph"`

**Step 3: Remove DocsFilesTab import** (if used only in docs.tsx):

```bash
grep -rn 'DocsFilesTab' ~/workspace/ai-drakon-setup/src/
```
If only in docs.tsx, remove the import line.

**Step 4: Remove the TabsTrigger and TabsContent for "files"**

Find and remove the `<TabsTrigger value="files">` block and `<TabsContent value="files">` block.

**Step 5: Verify no broken references**

```bash
cd ~/workspace/ai-drakon-setup && npx tsc --noEmit --skipLibCheck 2>&1 | grep -i 'docs\|files' | head -10
```

### Part B: NotesTab.tsx — add search to sidebar

**File:** `~/workspace/ai-drakon-setup/src/components/docs/NotesTab.tsx`

**Step 1: Add state**

Find: `const [sidebarOpen, setSidebarOpen] = useState(true);`
Add after:
```typescript
const [sidebarSearch, setSidebarSearch] = useState("");
```

**Step 2: Filter tree by search**

After `const mergedTree = ...` (wherever the tree is computed), add:
```typescript
const filteredTree = sidebarSearch.trim()
  ? mergedTree.filter((node) => {
      const q = sidebarSearch.toLowerCase();
      if (node.type === "note") return node.name?.toLowerCase().includes(q) || node.slug?.toLowerCase().includes(q);
      // for folders, keep if any children match
      const flat = flattenTree([node]);
      return flat.some((n) => n.name?.toLowerCase().includes(q) || n.slug?.toLowerCase().includes(q));
    })
  : mergedTree;
```

**Step 3: Add search input above the tree**

Find the sidebar content area (the `<ScrollArea>` or `<div>` wrapping the tree). Add above the tree:
```tsx
<div className="border-b border-[var(--border-subtle)] px-2 py-1.5">
  <input
    value={sidebarSearch}
    onChange={(e) => setSidebarSearch(e.target.value)}
    placeholder="Пошук…"
    className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-base)] px-2 py-1 text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-amber)] focus:outline-none"
  />
  <span className="mt-1 block font-mono text-[10px] text-[var(--text-muted)]">
    {flattenTree(filteredTree).length} документів
  </span>
</div>
```

**Step 4: Replace `mergedTree` with `filteredTree` in the map** that renders `SidebarTreeNode`.

**Step 5: Mirror both files**

```bash
cp ~/workspace/ai-drakon-setup/src/routes/docs.tsx \
   ~/workspace/ai-drakon-setup/.lovable/src/routes/docs.tsx
cp ~/workspace/ai-drakon-setup/src/components/docs/NotesTab.tsx \
   ~/workspace/ai-drakon-setup/.lovable/src/components/docs/NotesTab.tsx
```

**Step 6: Final typecheck**

```bash
cd ~/workspace/ai-drakon-setup && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: 0 errors

**Step 7: Commit**

```bash
git add src/routes/docs.tsx .lovable/src/routes/docs.tsx \
         src/components/docs/NotesTab.tsx .lovable/src/components/docs/NotesTab.tsx
git commit -m "feat: remove Files tab, add search to NotesTab sidebar (prompt 27 cleanup)"
```

---

## Task 7: Verify in browser via PinchTab

**Step 1: Check dev server build**

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cd ~/workspace/ai-drakon-setup && npm run build 2>&1 | tail -20"
```

If build fails — fix TypeScript errors before continuing.

**Step 2: Take screenshots via PinchTab**

The deployed app is at `https://ai-drakon-setup.pages.dev` (CF Pages auto-deploys from GitHub Action mirror).

Wait for deploy (~2 min after git push), then screenshot:
1. `/diagrams` — verify "Аналіз" button appears in toolbar
2. Click "Аналіз" — verify panel opens on right side
3. `/diagram/editor` — verify `Code2` button appears in toolbar
4. Click Code2 — verify bottom drawer opens
5. `/docs` — verify "Файли" tab is gone, "Документи" sidebar has search input

---

## Success Criteria

| Item | Pass condition |
|------|----------------|
| pipeline-api.ts | TypeScript clean, no import errors |
| CodeAnalysisPanel | Opens as right rail, submits to `/v1/pipeline/analyze`, polls, shows function list |
| CodeGenerationPanel | Opens as bottom drawer, submits to `/v1/pipeline/generate`, polls, shows code with copy |
| DiagramsPage toolbar | "Аналіз" button visible, toggles panel |
| DiagramEditorPage toolbar | Code2 button visible, toggles drawer |
| Docs page | "Файли" tab gone, "Документи" sidebar has search + count |
| Build | `npm run build` exits 0 |

---

## Architecture invariants (DO NOT violate)

- Do NOT touch `drakonwidget.js`
- Do NOT modify existing agent chat code
- Do NOT change AppHeader navigation
- Do NOT change Precision Dark CSS vars
- `params` fields must remain STRING (never array)
- Every change to `src/` must be mirrored to `.lovable/src/`

---

## Семантичні зв'язки
**Цей документ є частиною:** [[plans/_INDEX]]

**Цей документ пов'язаний з:**
- [[plans/2026-05-16-sprint5-pipeline-mgmt]] — наступний розділ (2026 05 16 sprint5 pipeline mgmt)