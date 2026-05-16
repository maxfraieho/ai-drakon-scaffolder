# Lovable Prompt 33 — Stitch Design Implementation: CodeGenerationPanel

> **ВАЖЛИВО:** Після всіх змін скопіюй `src/` до `.lovable/src/` (вони мають бути синхронізовані).

---

## Задача

Повністю переробити `CodeGenerationPanel.tsx` за дизайн-системою Stitch (Modern Technical Minimalism):
- JetBrains Mono для всього тексту
- Obsidian dark palette
- Amber (#ffc174) тільки для actionable елементів
- Мінімальні border radius (2–3px)
- History panel у idle-стані (праворуч)
- Monaco Editor замість `<pre>` у done-стані
- localStorage history (5 останніх генерацій)

---

## 1. CSS-змінні — додати/оновити в globals.css або index.css

```css
:root, .dark {
  /* Obsidian palette */
  --drakon-bg:           #131313;
  --drakon-surface:      #131313;
  --drakon-surface-low:  #1c1b1b;
  --drakon-surface-mid:  #201f1f;
  --drakon-surface-high: #2a2a2a;
  --drakon-surface-top:  #353534;
  --drakon-surface-base: #0e0e0e;

  /* Text */
  --drakon-on-surface:     #e5e2e1;
  --drakon-on-muted:       #d8c3ad;

  /* Borders */
  --drakon-border:         #534434;
  --drakon-border-subtle:  #a08e7a;

  /* Primary — amber ONLY for actions */
  --drakon-primary:        #ffc174;
  --drakon-primary-dim:    #ffb95f;
  --drakon-primary-bg:     #f59e0b;
  --drakon-on-primary:     #2a1700;

  /* Accent — blue for code keywords */
  --drakon-accent:         #8fd5ff;

  /* Status */
  --drakon-success:        #4ade80;
  --drakon-error:          #ffb4ab;

  /* Font */
  --drakon-font: 'JetBrains Mono', monospace;
}
```

Додати в `<head>` (index.html або головний layout, якщо ще немає):
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 2. Встановити залежність

```bash
npm install @monaco-editor/react
```

---

## 3. localStorage history — новий файл `src/lib/pipeline-history.ts`

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
  const entry: GenerationHistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  const updated = [entry, ...history].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export function loadGenerationHistory(): GenerationHistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GenerationHistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function clearGenerationHistory(): void {
  localStorage.removeItem(KEY);
}
```

---

## 4. CodeGenerationPanel.tsx — повна переробка

### 4.1 Імпорти

```tsx
import Editor from '@monaco-editor/react';
import { saveGenerationHistory, loadGenerationHistory, GenerationHistoryItem } from '@/lib/pipeline-history';
```

### 4.2 Структура панелі (обидва стани)

Панель займає нижню частину екрану. Висота:
- Idle: `h-64`
- Done/generating: `h-[480px]`

Перехід між висотами: `transition-[height] duration-200 ease-in-out`.

**PANEL HEADER** (спільний):
```tsx
<div className="h-10 flex items-center justify-between px-4 border-b shrink-0"
     style={{ background: 'var(--drakon-surface-low)', borderColor: 'var(--drakon-border)' }}>
  {/* Left: icon + title */}
  <div className="flex items-center gap-2">
    <span className="text-[18px]" style={{ color: 'var(--drakon-primary)' }}>⚡</span>
    <span className="text-[11px] font-semibold uppercase tracking-[0.05em]"
          style={{ color: 'var(--drakon-primary)', fontFamily: 'var(--drakon-font)' }}>
      ГЕНЕРУВАТИ КОД
    </span>
  </div>
  {/* Right: language tabs + close */}
  <div className="flex items-center gap-3">
    {/* Language toggle */}
    <div className="flex p-[1px] border rounded-[3px]"
         style={{ background: 'var(--drakon-surface-top)', borderColor: 'var(--drakon-border)' }}>
      {(['python', 'typescript', 'javascript'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setSelectedLanguage(lang)}
          className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-[2px] transition-colors active:scale-[0.96]"
          style={{
            fontFamily: 'var(--drakon-font)',
            background: selectedLanguage === lang ? 'var(--drakon-primary)' : 'transparent',
            color: selectedLanguage === lang ? 'var(--drakon-on-primary)' : 'var(--drakon-on-muted)',
          }}>
          {lang === 'python' ? 'PY' : lang === 'typescript' ? 'TS' : 'JS'}
        </button>
      ))}
    </div>
    {/* Close */}
    <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[3px] transition-colors active:scale-[0.96]"
            style={{ color: 'var(--drakon-on-muted)' }}>
      ✕
    </button>
  </div>
</div>
```

### 4.3 IDLE STATE — двоколонковий layout

```
┌─────────────────────────────────┬─────────────────────┐
│  ФОРМА (flex-1)                 │  ОСТАННІ ГЕНЕРАЦІЇ  │
│  ┌─────────────┐ ┌───────────┐  │  ─────────────────  │
│  │ СХЕМА:  [▼] │ │ МОВА: PY  │  │  py · sum.py  12:34 │
│  └─────────────┘ └───────────┘  │  ts · parse.ts 12:28│
│  ┌─────────────────────────┐    │  py · greet.py 11:55│
│  │ Опис... (textarea)      │    │                     │
│  └─────────────────────────┘    │                     │
│  [підказка]         [⚡ ГЕНЕРУВАТИ] │               │
└─────────────────────────────────┴─────────────────────┘
```

ФОРМА (ліва частина, `flex-1 p-3 border-r flex flex-col gap-2`):

```tsx
{/* Controls row */}
<div className="flex items-center gap-4">
  {/* Scheme */}
  <div className="flex items-center gap-2 flex-1">
    <span className="text-[10px] font-semibold uppercase tracking-wider shrink-0"
          style={{ color: 'var(--drakon-on-muted)', fontFamily: 'var(--drakon-font)' }}>
      СХЕМА:
    </span>
    <select
      value={selectedScheme}
      onChange={e => setSelectedScheme(e.target.value)}
      disabled={schemes.length === 0}
      className="flex-1 h-8 px-2 text-[13px] border rounded-[3px] outline-none appearance-none cursor-pointer"
      style={{
        fontFamily: 'var(--drakon-font)',
        background: 'var(--drakon-surface-mid)',
        borderColor: 'var(--drakon-border)',
        color: 'var(--drakon-on-surface)',
      }}>
      <option value="">Виберіть схему...</option>
      {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  </div>
</div>

{/* Description textarea */}
<textarea
  value={description}
  onChange={e => setDescription(e.target.value)}
  placeholder="Опис поведінки (необов'язково)..."
  className="flex-1 w-full p-2 text-[12px] border rounded-[3px] resize-none outline-none focus:border-[var(--drakon-primary)]"
  style={{
    fontFamily: 'var(--drakon-font)',
    background: 'var(--drakon-surface-mid)',
    borderColor: 'var(--drakon-border)',
    color: 'var(--drakon-on-surface)',
  }}
/>

{/* Generate row */}
<div className="flex items-center justify-between">
  <span className="text-[10px] italic" style={{ color: 'var(--drakon-on-muted)', fontFamily: 'var(--drakon-font)' }}>
    {!selectedScheme ? 'Виберіть схему для початку генерації' : 'Готово до генерації'}
  </span>
  <button
    onClick={handleGenerate}
    disabled={!selectedScheme || status === 'loading'}
    className="h-10 px-6 text-[11px] font-semibold uppercase tracking-wider rounded-[3px] transition-all active:scale-[0.96]"
    style={{
      fontFamily: 'var(--drakon-font)',
      background: selectedScheme ? 'var(--drakon-primary)' : 'color-mix(in srgb, var(--drakon-primary) 40%, transparent)',
      color: selectedScheme ? 'var(--drakon-on-primary)' : 'color-mix(in srgb, var(--drakon-on-primary) 40%, transparent)',
      cursor: selectedScheme ? 'pointer' : 'not-allowed',
    }}>
    ⚡ ГЕНЕРУВАТИ
  </button>
</div>
```

HISTORY PANEL (права частина, `w-[300px] flex flex-col shrink-0`):

```tsx
<div className="w-[300px] flex flex-col shrink-0 border-l"
     style={{ background: 'var(--drakon-surface-mid)', borderColor: 'var(--drakon-border)' }}>
  {/* Header */}
  <div className="h-8 flex items-center px-3 border-b text-[10px] font-semibold uppercase tracking-wider"
       style={{ borderColor: 'var(--drakon-border)', color: 'var(--drakon-on-muted)', fontFamily: 'var(--drakon-font)' }}>
    ОСТАННІ ГЕНЕРАЦІЇ
  </div>
  {/* List */}
  <div className="flex-1 overflow-y-auto p-1 flex flex-col gap-[1px]">
    {history.slice(0, 5).map(item => (
      <div
        key={item.id}
        onClick={() => loadHistoryItem(item)}
        className="group flex items-center justify-between p-2 rounded-[3px] border border-transparent cursor-pointer transition-all"
        style={{ background: 'transparent' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--drakon-surface-high)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--drakon-border)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
        }}>
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Language badge */}
          <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold uppercase shrink-0"
                style={{
                  fontFamily: 'var(--drakon-font)',
                  background: 'var(--drakon-primary-bg)',
                  color: 'var(--drakon-on-primary)',
                }}>
            {item.language === 'python' ? 'PY' : item.language === 'typescript' ? 'TS' : 'JS'}
          </span>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[12px] truncate" style={{ fontFamily: 'var(--drakon-font)', color: 'var(--drakon-on-surface)' }}>
              {item.scheme}
            </span>
            <span className="text-[10px] font-variant-numeric tabular-nums"
                  style={{ fontFamily: 'var(--drakon-font)', color: 'var(--drakon-on-muted)' }}>
              {new Date(item.timestamp).toLocaleTimeString('uk', { hour: '2-digit', minute: '2-digit' })} · {item.iterations} iter
            </span>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); loadHistoryItem(item); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-[2px]"
          style={{ color: 'var(--drakon-on-muted)' }}
          title="Відновити">
          ↺
        </button>
      </div>
    ))}
    {history.length === 0 && (
      <div className="flex-1 flex items-center justify-center text-[11px] opacity-40"
           style={{ fontFamily: 'var(--drakon-font)', color: 'var(--drakon-on-muted)' }}>
        Ще немає генерацій
      </div>
    )}
  </div>
</div>
```

### 4.4 DONE STATE — Monaco + status bar

```
┌──────────────────────────────────────────────────────────┐
│ ✓ КОД ЗГЕНЕРОВАНО · syntax: OK     3s | 2 iter  [COPY] [↺] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   Monaco Editor (flex-1, theme vs-dark, readOnly)        │
│   height: 100% (fills remaining panel space)             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

STATUS BAR:
```tsx
<div className="flex items-center justify-between px-3 py-1.5 border-b shrink-0"
     style={{ background: 'var(--drakon-surface-low)', borderColor: 'var(--drakon-border)' }}>
  {/* Left: status */}
  <div className="flex items-center gap-2">
    <span style={{ color: 'var(--drakon-success)' }}>✓</span>
    <span className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ fontFamily: 'var(--drakon-font)', color: 'var(--drakon-success)' }}>
      КОД ЗГЕНЕРОВАНО
    </span>
    <span style={{ color: 'var(--drakon-border-subtle)' }}>·</span>
    <span className="text-[11px]" style={{ fontFamily: 'var(--drakon-font)', color: 'var(--drakon-on-muted)' }}>
      syntax: <span style={{ color: result.syntax_errors.length === 0 ? 'var(--drakon-success)' : 'var(--drakon-error)' }}>
        {result.syntax_errors.length === 0 ? 'OK' : `${result.syntax_errors.length} err`}
      </span>
    </span>
  </div>
  {/* Right: timing + actions */}
  <div className="flex items-center gap-3">
    <span className="text-[11px] font-variant-numeric tabular-nums"
          style={{ fontFamily: 'var(--drakon-font)', color: 'var(--drakon-on-muted)' }}>
      {elapsed}s <span style={{ opacity: 0.5 }}>|</span> {result.iterations} iter
    </span>
    <button onClick={copyCode}
            className="flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-semibold uppercase transition-all active:scale-[0.96]"
            style={{
              fontFamily: 'var(--drakon-font)',
              color: 'var(--drakon-on-muted)',
              opacity: 0.8,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}>
      ⎘ COPY
    </button>
    <button onClick={handleRegenerate}
            className="flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-semibold uppercase transition-all active:scale-[0.96]"
            style={{ fontFamily: 'var(--drakon-font)', color: 'var(--drakon-primary)' }}>
      ↺ ПЕРЕГЕНЕРУВАТИ
    </button>
  </div>
</div>
```

MONACO EDITOR (замість `<pre>`):
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
      hideCursorInOverviewRuler: true,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6,
      },
    }}
  />
</div>
```

### 4.5 Логіка history

```tsx
const [history, setHistory] = useState<GenerationHistoryItem[]>([]);

// Завантажити при mount
useEffect(() => {
  setHistory(loadGenerationHistory());
}, []);

// Зберегти після успішної генерації (в onSuccess або після setResult):
if (result) {
  saveGenerationHistory({
    scheme: selectedScheme,
    language: selectedLanguage,
    description,
    code: result.code,
    iterations: result.iterations,
    elapsed,
  });
  setHistory(loadGenerationHistory());
}

// Відновити з history:
const loadHistoryItem = (item: GenerationHistoryItem) => {
  setSelectedScheme(item.scheme);
  setSelectedLanguage(item.language as Language);
  setDescription(item.description);
  // якщо хочеш одразу показати код:
  // setResult({ code: item.code, syntax_errors: [], iterations: item.iterations });
  // setElapsed(item.elapsed);
  // setStatus('done');
};
```

### 4.6 Взаємодія панелей

Коли відкривається CodeGenerationPanel (клік на кнопку "Генерація"):
- Якщо відкрита права панель "АНАЛІЗ КОДУ" — закрити її (`setCodeAnalysisPanelOpen(false)` або аналог)
- Вони не повинні бути відкриті одночасно

---

## 5. Елементи що НЕ змінювати

- `drakonwidget.js` — НЕ чіпати
- Логіку SSE streaming у Worker
- Маршрутизацію та auth
- Інші компоненти (крім CodeGenerationPanel і нового pipeline-history.ts)

---

## 6. Фінальна перевірка

1. Idle state: форма + history panel поряд, generate disabled без схеми
2. Done state: Monaco замість `<pre>`, статус-бар з tabular-nums, copy opacity 0.8
3. History зберігається між сесіями (localStorage)
4. JetBrains Mono скрізь у панелі
5. Amber (#ffc174) тільки на: активна мова-таб, кнопка Generate (enabled), кнопка ПЕРЕГЕНЕРУВАТИ, language badge в history

---

## ВАЖЛИВО: Sync

**Після змін обов'язково скопіюй:**
```
src/ → .lovable/src/
```
Обидві директорії мають бути ідентичні. CF Pages будує з `.lovable/src/`.

