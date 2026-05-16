# Prompt 30 — SSE Streaming для Pipeline Panels

## Контекст

Cloudflare Worker тепер підтримує SSE endpoint:
```
GET /v1/pipeline/stream/{job_id}?token=JWT
```
Повертає `text/event-stream` з подіями `data: {"status":"pending"|"running"|"done"|"error", ...}\n\n`

Потрібно замінити клієнтський polling (`setInterval` кожні 3 секунди) на `EventSource` у двох панелях.

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

---

## Крок 2: `src/components/pipeline/CodeAnalysisPanel.tsx`

**Замінити import** (прибрати `pollJob`, додати `streamJob`):
```typescript
// Було:
import { pollJob, startAnalysis, type AnalyzeResult } from "@/lib/pipeline-api";
// Стало:
import { streamJob, startAnalysis, type AnalyzeResult } from "@/lib/pipeline-api";
```

**Знайти та ВИДАЛИТИ весь useEffect з setInterval** — він виглядає так:
```typescript
useEffect(() => {
  if (status !== "running" || !jobId) return;
  let cancelled = false;
  const tick = async () => {
    try {
      const data = await pollJob<AnalyzeResult>(jobId);
      // ...
    }
  };
  const id = setInterval(tick, 3000);
  void tick();
  return () => {
    cancelled = true;
    clearInterval(id);
  };
}, [status, jobId]);
```

**Замінити на:**
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

---

## Крок 3: `src/components/pipeline/CodeGenerationPanel.tsx`

**Замінити import** (прибрати `pollJob`, додати `streamJob`):
```typescript
// Було:
import { pollJob, startGeneration, type GenerateResult } from "@/lib/pipeline-api";
// Стало:
import { streamJob, startGeneration, type GenerateResult } from "@/lib/pipeline-api";
```

**Знайти та ВИДАЛИТИ весь useEffect з setInterval** — він виглядає так:
```typescript
useEffect(() => {
  if (status !== "running" || !jobId) return;
  let cancelled = false;
  const tick = async () => {
    try {
      const data = await pollJob<GenerateResult>(jobId);
      // ...
    }
  };
  const id = setInterval(tick, 3000);
  void tick();
  return () => {
    cancelled = true;
    clearInterval(id);
  };
}, [status, jobId]);
```

**Замінити на:**
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

---

## Що НЕ змінювати

- `useEffect` для elapsed timer (`setInterval(..., 1000)` для лічильника секунд) — залишити
- `startAnalysis()`, `startGeneration()` — не чіпати
- `pollJob` функцію в `pipeline-api.ts` — залишити (може знадобитись для fallback)
- Весь UI, стилі, компонування — не чіпати

---

## Перевірка результату

Після змін переконайся:
1. `CodeAnalysisPanel.tsx` і `CodeGenerationPanel.tsx` — немає `setInterval`, немає `pollJob`
2. `pipeline-api.ts` — є `streamJob` функція після `pollJob`
3. TypeScript: немає помилок компіляції
