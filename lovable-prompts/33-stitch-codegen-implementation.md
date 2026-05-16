# Prompt 33 — Переробити CodeGenerationPanel за Stitch-дизайном

## Мета
Повністю переробити `src/components/pipeline/CodeGenerationPanel.tsx` — idle-стан та done-стан — за Stitch-дизайном "Modern Technical Minimalism".

---

## Референс (читати перед усім іншим)

**Done state:** `import/stitch_ai_drakon_codegen_ui_refinement/variant_a_monaco_done_state/code.html`
— секція `<!-- Bottom Panel: Code Generation (Done State) -->` і далі.

**Idle state:** `import/stitch_ai_drakon_codegen_ui_refinement/variant_b_idle_history_state/code.html`
— секція `<!-- Bottom Code Generation Panel -->` і далі.

**Дизайн-система:** `import/stitch_ai_drakon_codegen_ui_refinement/ai_drakon_ide/DESIGN.md`

> **Правило токенів:** Використовувати тільки Tailwind-токени з DESIGN.md. Hex-значення не хардкодити — тільки через CSS-змінні або токени з конфігурації.

---

## Стани та референси

| Стан | HTML-файл | Секція в HTML | Що взяти |
|------|-----------|---------------|----------|
| **Idle** (немає результату) | `variant_b.../code.html` | `<!-- Bottom Code Generation Panel -->` | Двоколонковий layout: форма (flex-1) + history (w-[320px]) |
| **Done** (є результат) | `variant_a.../code.html` | `<!-- Bottom Panel: Code Generation (Done State) -->` | Status bar + Monaco editor area |
| **Loading** | Немає референсу | — | Адаптуй від idle: кнопка `disabled` + `opacity-50`, додай spinner у label |

> Hover/анімації — в HTML статично, додати вручну:
> - Hover на history item: `bg-surface-container-high border border-outline-variant`, перехід `transition-colors duration-150`
> - Кнопки: `active:scale-[0.96] transition-transform duration-75`
> - Панель відкривається: `transition-[height] duration-200 ease-in-out` між `h-64` (idle) та `h-[480px]` (done)

---

## Нові файли

### `src/lib/pipeline-history.ts` (новий)

```typescript
export interface GenerationHistoryItem {
  id: string;
  timestamp: number;
  scheme: string;
  language: string;
  description: string;
  code: string;
  iterations: number;
  elapsed: number;
}

const KEY = 'drakon:generation-history';
const MAX = 20;

export function saveGenerationHistory(item: Omit<GenerationHistoryItem, 'id' | 'timestamp'>): void {
  const history = loadGenerationHistory();
  const updated = [{ ...item, id: crypto.randomUUID(), timestamp: Date.now() }, ...history].slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
}

export function loadGenerationHistory(): GenerationHistoryItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}
```

---

## Зміни в CodeGenerationPanel.tsx

### Залежності

```tsx
import Editor from '@monaco-editor/react';  // npm install @monaco-editor/react
import { saveGenerationHistory, loadGenerationHistory, type GenerationHistoryItem } from '@/lib/pipeline-history';
```

### Panel header (спільний для всіх станів)

Взяти з `variant_a.../code.html`, `<div class="flex items-center justify-between px-margin-md h-10 ...">`:
- Ліворуч: amber-іконка `code` + `text-primary uppercase tracking-widest` заголовок "ГЕНЕРУВАТИ КОД"
- Праворуч: сегментований перемикач мов (PY/TS/JS) у стилі `bg-surface-container-highest border border-outline-variant p-gutter rounded-sm` + кнопка закриття

> Перемикач мов — в header, НЕ у тілі форми.

### Idle state layout

Взяти з `variant_b.../code.html`, `<div class="flex-1 flex overflow-hidden">`:

```
┌──────────────────────────────────┬──────────────────────┐
│ Ліва форма (flex-1)              │ History (w-[320px])  │
│  СХЕМА: [select▼]  МОВА: [PY]   │ ОСТАННІ ГЕНЕРАЦІЇ    │
│  ┌──────────────────────────┐   │ py · Main Logic 12:34│
│  │ textarea опис...         │   │ ts · Auth Flow  12:28│
│  └──────────────────────────┘   │ py · Data Proc  11:55│
│  [підказка]      [⚡ ГЕНЕРУВАТИ] │                      │
└──────────────────────────────────┴──────────────────────┘
```

- Кнопка ГЕНЕРУВАТИ: `disabled` (cursor-not-allowed + opacity-50) якщо scheme не вибрана
- У рядку з кнопкою ліворуч — текст-підказка: "Виберіть схему для початку" або пусто

**History item** (з `variant_b`):
- Language badge: `bg-primary-container text-on-primary-container text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[2px]`
- Filename + "time · N iter" (tabular-nums для числа iter та часу)
- Refresh-іконка: `opacity-0 group-hover:opacity-100` — з'являється при hover на item
- Мінімальна зона кліку history item: 40px висота (`min-h-[40px]`)

### Done state layout

Взяти з `variant_a.../code.html`, повний `<div class="flex-1 flex flex-col border ...">`:

**Status bar** (над кодом):
```tsx
<div className="flex items-center justify-between px-4 py-1.5 border-b shrink-0"
     style={{ background: 'var(--surface-container-low, #1c1b1b)', borderColor: 'var(--outline-variant, #534434)' }}>
  {/* Ліворуч */}
  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
    <span className="text-[#4ade80]">✓</span>
    <span className="text-[#4ade80]">КОД ЗГЕНЕРОВАНО</span>
    <span className="opacity-40 mx-1">·</span>
    <span className="text-on-surface-variant">
      syntax: <span className={result.syntax_errors.length === 0 ? 'text-[#4ade80]' : 'text-error'}>
        {result.syntax_errors.length === 0 ? 'OK' : `${result.syntax_errors.length} err`}
      </span>
    </span>
  </div>
  {/* Праворуч */}
  <div className="flex items-center gap-3 text-[11px]">
    {/* tabular-nums — щоб числа не стрибали */}
    <span className="tabular-nums text-on-surface-variant font-mono">
      {elapsed}s <span className="opacity-40 mx-1">|</span> {result.iterations} iter
    </span>
    {/* COPY — opacity-60 за замовчуванням (НЕ opacity-0!) */}
    <button onClick={copyCode}
            className="flex items-center gap-1 px-2 py-1 rounded-[2px] opacity-60 hover:opacity-100 transition-opacity active:scale-[0.96] transition-transform duration-75 min-h-[32px]">
      ⎘ COPY
    </button>
    <button onClick={handleRegenerate}
            className="flex items-center gap-1 px-2 py-1 rounded-[2px] text-primary hover:text-primary-fixed-dim transition-colors active:scale-[0.96] transition-transform duration-75 min-h-[32px]">
      ↺ ПЕРЕГЕНЕРУВАТИ
    </button>
  </div>
</div>
```

**Monaco Editor** (замість `<pre>`):
```tsx
<div className="flex-1 min-h-0">
  <Editor
    height="100%"
    language={selectedLanguage === 'python' ? 'python' : selectedLanguage}
    value={result.code}
    theme="vs-dark"
    options={{
      readOnly: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: 'JetBrains Mono, monospace',
      fontLigatures: true,
      padding: { top: 12, bottom: 12 },
      renderLineHighlight: 'none',
      overviewRulerLanes: 0,
      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    }}
  />
</div>
```

### Взаємодія панелей

Коли відкривається CodeGenerationPanel (кнопка "Генерація" у toolbar):
- Якщо відкрита права панель "АНАЛІЗ КОДУ" — закрити її
- Тільки одна панель може бути відкрита одночасно

### make-interfaces checklist (перевір перед фінішем)

- [ ] `antialiased` на кореневому елементі панелі
- [ ] `tabular-nums` на elapsed та iterations
- [ ] `active:scale-[0.96] transition-transform duration-75` на всіх кнопках
- [ ] Copy: `opacity-60` (не `opacity-0`)
- [ ] History item hover: `transition-colors duration-150` (не `transition-all`)
- [ ] Усі інтерактивні елементи ≥ 40px висота
- [ ] Concentric border radius: panel (`rounded-sm`) → button всередині (`rounded-[2px]`)
- [ ] `will-change` — тільки якщо є перший кадр гальма (не за замовчуванням)

---

## Порядок змін схема → мова

У `variant_a` і `variant_b` **схема йде перед мовою**:
1. Scheme select
2. Description input/textarea
3. Generate button

Мовний перемикач — у **header панелі**, не в тілі форми.

---

## Що НЕ чіпати

- `drakonwidget.js`
- SSE streaming logic у Worker
- Auth, routing
- Будь-які компоненти окрім `CodeGenerationPanel.tsx` і нового `pipeline-history.ts`

---

## ВАЖЛИВО: Sync після змін

```
src/ → .lovable/src/
```
Обидві директорії мають бути ідентичні. CF Pages будує з `.lovable/src/`.
