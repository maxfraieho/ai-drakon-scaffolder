# Prompt 38 — "Save to KB" кнопки в CodeAnalysisPanel та CodeGenerationPanel

## Мета
Додати кнопку "Save to KB" у done-стан обох панелей.
При натисканні — POST до `/v1/kb/contribute` через Worker.
Показати toast: "Збережено до KB" або "Помилка збереження".

## Дизайн-система
`import/stitch_agent_logic_studio/drakon_logic_system/DESIGN.md` — тільки Tailwind-токени.

---

## 1. Новий файл: `src/lib/kb-api.ts`

```typescript
const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? "";

export interface KbContributePayload {
  code: string;
  ir_yaml: string;
  language?: string;
  description?: string;
  job_id?: string;
}

export async function kbContribute(
  payload: KbContributePayload,
  token: string
): Promise<{ id: string; timestamp: number }> {
  const res = await fetch(`${WORKER_URL}/v1/kb/contribute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`KB contribute failed: ${res.status}`);
  return res.json();
}
```

---

## 2. `src/components/pipeline/CodeAnalysisPanel.tsx`

### 2а. Додати імпорти

```typescript
import { kbContribute } from "@/lib/kb-api";
import { useToast } from "@/hooks/use-toast";
```

### 2б. Додати стан та хендлер (усередині компонента):

```typescript
const { toast } = useToast();
const [kbSaving, setKbSaving] = useState(false);
const [kbSaved, setKbSaved] = useState(false);

const handleSaveToKb = async () => {
  if (!result || kbSaving || kbSaved) return;
  setKbSaving(true);
  try {
    const token = localStorage.getItem("auth_token") ?? "";
    await kbContribute(
      {
        code: lastSubmittedCode ?? "",
        ir_yaml: JSON.stringify(result.drakon_ir, null, 2),
        language: "python",
        description: result.scheme_name ?? "",
        job_id: lastJobId ?? undefined,
      },
      token
    );
    setKbSaved(true);
    toast({ title: "Збережено до KB", description: result.scheme_name });
  } catch {
    toast({ title: "Помилка збереження", variant: "destructive" });
  } finally {
    setKbSaving(false);
  }
};
```

> **Примітка:** `lastSubmittedCode` та `lastJobId` — це вже існуючий state/ref у панелі (якщо їх немає, додай `const [lastSubmittedCode, setLastSubmittedCode] = useState("")` та встановлюй при submit; аналогічно для `lastJobId`).

### 2в. Додати кнопку у done-state поряд із COPY:

Знайди блок де є кнопка Copy IR — після неї додай:

```tsx
<button
  type="button"
  onClick={handleSaveToKb}
  disabled={kbSaving || kbSaved}
  className="flex items-center gap-1.5 rounded border border-[var(--accent-amber)]/40 px-2 py-1 font-mono text-[11px] text-[var(--accent-amber)] transition-colors hover:bg-[var(--accent-amber)]/10 disabled:opacity-50"
>
  {kbSaved ? "✓ Збережено" : kbSaving ? "..." : "Save to KB"}
</button>
```

---

## 3. `src/components/pipeline/CodeGenerationPanel.tsx`

### 3а. Додати імпорти (якщо немає):

```typescript
import { kbContribute } from "@/lib/kb-api";
import { useToast } from "@/hooks/use-toast";
```

### 3б. Додати стан та хендлер:

```typescript
const { toast } = useToast();
const [kbSaving, setKbSaving] = useState(false);
const [kbSaved, setKbSaved] = useState(false);

const handleSaveToKb = async () => {
  if (!result?.code || kbSaving || kbSaved) return;
  setKbSaving(true);
  try {
    const token = localStorage.getItem("auth_token") ?? "";
    await kbContribute(
      {
        code: result.code,
        ir_yaml: description ?? "",
        language: lang,
        description: description ?? "",
        job_id: lastJobId ?? undefined,
      },
      token
    );
    setKbSaved(true);
    toast({ title: "Збережено до KB", description: `${lang} · ${result.code.split("\n").length} рядків` });
  } catch {
    toast({ title: "Помилка збереження", variant: "destructive" });
  } finally {
    setKbSaving(false);
  }
};

// Reset kbSaved when new result comes in:
// У useEffect де setResult(...) — додати: setKbSaved(false);
```

### 3в. Додати кнопку у done-state status-bar, поряд із COPY та ПЕРЕГЕНЕРУВАТИ:

```tsx
<button
  type="button"
  onClick={handleSaveToKb}
  disabled={kbSaving || kbSaved || !result?.code}
  className="flex items-center gap-1.5 rounded border border-[var(--accent-amber)]/40 px-2 py-1 font-mono text-[11px] text-[var(--accent-amber)] transition-colors hover:bg-[var(--accent-amber)]/10 disabled:opacity-50"
>
  {kbSaved ? "✓ Збережено" : kbSaving ? "..." : "Save to KB"}
</button>
```

---

## Що НЕ чіпати
- `kb.db` та `kb_route.py` в architect-agent — вже реалізовані
- Worker маршрути `/v1/kb/*` — вже задеплоєні
- Monaco Editor, SSE streaming, history — без змін
- WorkspaceShell, AgentStudioPage — без змін

---

## Checklist перед фінішем
- [ ] `src/lib/kb-api.ts` створено
- [ ] "Save to KB" кнопка з'являється в CodeAnalysisPanel (done state) поряд із COPY IR
- [ ] "Save to KB" кнопка з'являється в CodeGenerationPanel (done state) поряд із COPY
- [ ] После натискання — toast "Збережено до KB" з назвою схеми
- [ ] Кнопка блокується після збереження (показує "✓ Збережено")
- [ ] При новому аналізі/генерації — кнопка скидається (знову "Save to KB")

## ВАЖЛИВО: Sync після змін
Після всіх змін скопіюй `src/` до `.lovable/src/` — вони мають бути ідентичні.
