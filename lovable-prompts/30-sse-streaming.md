# Prompt 30 — SSE Streaming + "Kinetic Logic" Visual Redesign

## Контекст

Cloudflare Worker підтримує SSE endpoint:
```
GET /v1/pipeline/stream/{job_id}?token=JWT
```
Повертає `text/event-stream` з подіями `data: {"status":"pending"|"running"|"done"|"error", ...}\n\n`

**Двi задачi одночасно:**
1. Замінити `setInterval` polling на `EventSource` у pipeline панелях
2. Перероблення візуальних станів (running / done / error) за дизайном "Kinetic Logic"

---

## Крок 1: `src/lib/pipeline-api.ts` — додати `streamJob()`

Після існуючої функції `pollJob` додати:

```typescript
export function streamJob<T = unknown>(
  job_id: string,
  onEvent: (data: JobStatus<T>) => void
): () => void {
  const jwt =
    typeof window !== "undefined" ? (localStorage.getItem("jwt") ?? "") : "";
  const url = `${workerUrl()}/v1/pipeline/stream/${encodeURIComponent(job_id)}?token=${encodeURIComponent(jwt)}`;
  const es = new EventSource(url);

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as JobStatus<T>;
      onEvent(data);
      if (data.status === "done" || data.status === "error") {
        es.close();
      }
    } catch {
      es.close();
    }
  };

  es.onerror = () => {
    onEvent({
      job_id,
      status: "error",
      result: null as unknown as T,
      error: "SSE connection error",
    });
    es.close();
  };

  return () => es.close();
}
```

`pollJob` **залишити** — не видаляти.

---

## Крок 2: `src/components/pipeline/CodeAnalysisPanel.tsx` — SSE + візуальний редизайн

### 2a. Замінити import

```typescript
// ВИДАЛИТИ: import pollJob
// ДОДАТИ: import streamJob
import { streamJob, startAnalysis, type AnalyzeResult, type AnalyzedFunction } from "@/lib/pipeline-api";
```

### 2b. Замінити useEffect з setInterval/pollJob на streamJob

**ВИДАЛИТИ** весь useEffect що містить `setInterval(tick, 3000)` та `pollJob`.

**ЗАМІНИТИ** на:
```typescript
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
```

useEffect для elapsed timer (setInterval 1000ms) — **залишити без змін**.

### 2c. Redesign — Running State

Коли `status === "running"`, показувати **окремий статус-блок** (не тільки спінер у кнопці) після кнопки "Аналізувати":

```tsx
{status === "running" && (
  <div className="border border-[var(--border-default)] bg-[var(--surface-container)] p-3 flex flex-col gap-2">
    {/* Status row */}
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
      <span className="font-mono text-[11px] text-[var(--text-muted)]">
        {elapsed}s
      </span>
    </div>
    {/* Amber progress bar */}
    <div className="w-full bg-[var(--bg-base)] h-[2px] overflow-hidden">
      <div
        className="bg-[var(--accent-amber)] h-full transition-all"
        style={{ width: `${Math.min(90, elapsed * 5)}%` }}
      />
    </div>
    {/* Info text */}
    <p className="text-[11px] text-[var(--text-secondary)] italic">
      Pipeline A запущено. Очікуємо результат обробки синтаксичного дерева...
    </p>
  </div>
)}
```

Кнопку "Аналізувати" показувати завжди (але `disabled` коли running).

### 2d. Redesign — Done State

Коли `status === "done" && result`, показувати:

```tsx
{status === "done" && result && (
  <div className="flex flex-col gap-3">
    {/* Success banner */}
    <div className="flex items-center justify-between px-3 py-2 border border-emerald-500/30 bg-emerald-500/5">
      <div className="flex items-center gap-2 text-emerald-400">
        <span className="text-[16px]">✓</span>
        <span className="font-mono text-[11px] font-bold uppercase">
          АНАЛІЗ ЗАВЕРШЕНО
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] text-[var(--text-muted)]">{elapsed}s</span>
        <button
          type="button"
          onClick={reset}
          className="font-mono text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase"
        >
          Новий аналіз
        </button>
      </div>
    </div>

    {/* DRAKON IR output */}
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          DRAKON IR OUTPUT
        </span>
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          CC: {result.cyclomatic_complexity}
        </span>
      </div>
      <div className="relative group">
        <pre className="w-full h-[320px] bg-[var(--bg-base)] border border-[var(--border-default)] p-3 font-mono text-[11px] overflow-auto text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
          {JSON.stringify(result.drakon_ir, null, 2)}
        </pre>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(JSON.stringify(result.drakon_ir, null, 2));
              toast.success("Скопійовано");
            }}
            className="bg-[var(--surface-container)]/80 border border-[var(--border-default)] p-1 text-[var(--text-secondary)] hover:text-[var(--accent-amber)]"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    {/* Stats grid */}
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-[var(--bg-base)] border border-[var(--border-default)] p-2">
        <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase">Functions</div>
        <div className="font-mono text-[13px] text-[var(--text-primary)]">
          {result.drakon_ir.length}
        </div>
      </div>
      <div className="bg-[var(--bg-base)] border border-[var(--border-default)] p-2">
        <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase">CC</div>
        <div className="font-mono text-[13px] text-[var(--text-primary)]">
          {result.cyclomatic_complexity}
        </div>
      </div>
      <div className="bg-[var(--bg-base)] border border-[var(--border-default)] p-2">
        <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase">Level</div>
        <div className="font-mono text-[13px] text-[var(--text-primary)]">
          {result.tree_level}
        </div>
      </div>
    </div>

    {/* Import buttons for each valid function */}
    <div className="flex flex-col gap-1">
      {result.drakon_ir.map((fn, i) => {
        const valid = !fn.error && (!fn.validation_errors || fn.validation_errors.length === 0);
        return valid ? (
          <button
            key={`${fn.name}-${i}`}
            type="button"
            onClick={() => onImportIr(fn)}
            className="w-full flex items-center justify-between px-2 py-1.5 border border-[var(--border-default)] bg-[var(--bg-base)] hover:border-[var(--accent-amber)] hover:bg-[var(--accent-amber)]/5 transition-all font-mono text-xs text-[var(--text-primary)]"
          >
            <span>{fn.name}</span>
            <span className="text-[var(--text-muted)]">↓ Імпортувати</span>
          </button>
        ) : null;
      })}
    </div>
  </div>
)}
```

### 2e. Error state — без змін, тільки стиль

```tsx
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
```

---

## Крок 3: `src/components/pipeline/CodeGenerationPanel.tsx` — SSE + візуальний редизайн

### 3a. Замінити import

```typescript
// ВИДАЛИТИ: import pollJob
// ДОДАТИ: import streamJob
import { streamJob, startGeneration, type GenerateResult } from "@/lib/pipeline-api";
```

### 3b. Замінити useEffect

**ВИДАЛИТИ** весь useEffect що містить `setInterval(tick, 3000)` та `pollJob`.

**ЗАМІНИТИ** на:
```typescript
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
```

useEffect для elapsed timer та useEffect для `setDescription("")` на зміну `diagramIr` — **залишити без змін**.

### 3c. Redesign — Running State

Аналогічно CodeAnalysisPanel — окремий статус-блок після кнопки "Генерувати":

```tsx
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
```

### 3d. Redesign — Done State

```tsx
{status === "done" && result && (
  <div className="flex flex-col gap-2">
    {/* Success banner */}
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

    {/* Code output */}
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
```

---

## Що НЕ змінювати

- Розміри та позицію панелей (aside / section)
- `startAnalysis()`, `startGeneration()` — не чіпати
- `pollJob` функцію в `pipeline-api.ts` — залишити
- useEffect для elapsed timer (`setInterval` 1000ms)
- useEffect для `setDescription("")` в CodeGenerationPanel
- Решту UI компонентів поза pipeline панелями

---

## Перевірка

Після змін:
1. `CodeAnalysisPanel.tsx` і `CodeGenerationPanel.tsx` — немає `setInterval(tick` та `pollJob`
2. `pipeline-api.ts` — є `streamJob` після `pollJob`
3. Pulsing amber dot у running state
4. Green success banner у done state
5. TypeScript: 0 помилок компіляції
