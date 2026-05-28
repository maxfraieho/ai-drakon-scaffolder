---
tags:
  - domain:ux
  - status:active
  - format:reference
created: 2026-05-26
updated: 2026-05-28
tier: 3
title: "Довідник по сторінках інтерфейсу UI"
lang: uk
---

# UI Pages Reference — AI-DRAKON Platform

Довідник по всіх сторінках фронтенду. Для кожної сторінки: маршрут, призначення, ключові компоненти, API-виклики.

---

## Навігація (карта сторінок)

```
/login                  ← вхід (без JWT)
/                       ← redirect → /diagrams
/diagrams               ← основний редактор діаграм + Pipeline A/B  ★ головна
/diagram/editor         ← повноекранний DRAKON-редактор
/editor/:id             ← редактор конкретної діаграми за ID
/agents                 ← Agent Studio (IDE для пайплайнів)
/pipeline/:id/edit      ← редактор пайплайну
/pipelines              ← список/CRUD пайплайнів
/devcycle               ← DevCycle (сценарії рефакторингу)
/code                   ← Monaco editor + Pipeline A запуск
/github                 ← GitHub file browser + AI-аналіз
/sync                   ← diff: код ↔ DRAKON-схеми
/docs                   ← генерація документації (docs-agent)
/settings               ← Worker URL, JWT, GitHub token, LLM моделі
```

Всі сторінки (крім `/login` і `/devcycle`) перевіряють `hasClientJwt()` і редиректять на `/login` за відсутності токена.

---

## `/diagrams` — Головна сторінка (DiagramsPage)

**Файл:** `src/pages/DiagramsPage.tsx`

Центральна сторінка платформи. Поєднує бібліотеку DRAKON-схем з Pipeline A (код → IR) і Pipeline B (IR → код).

### Макет

```
┌─ DiagramsLeftPanel ─┬─────────── Canvas area ──────────────────┐
│ Список схем по      │  DrakonEditor (DRAKON widget)             │
│ папках. Кнопки:     │  + DrakonIrPanel (IR JSON поруч)          │
│  + Нова схема       ├──────────── Бокові панелі ────────────────┤
│  + Нова папка       │  CodeAnalysisPanel  (Pipeline A, ліво)    │
│                     │  CodeGenerationPanel (Pipeline B, право)  │
└─────────────────────┴───────────────────────────────────────────┘
```

### Ключові компоненти

| Компонент | Роль |
|-----------|------|
| `DiagramsLeftPanel` | Дерево папок та схем, пошук, CRUD |
| `DrakonEditor` | Рендер DRAKON-схеми через DRAKON Widget |
| `DrakonIrPanel` | Панель IR JSON (відображення/редагування сирого IR) |
| `CodeAnalysisPanel` | Pipeline A: вставити код → отримати IR |
| `CodeGenerationPanel` | Pipeline B: IR → згенерований код |
| `CanvasToolbar` | Зум, теми, кнопки Save/Export |
| `PipelineDrakonView` | Overlay візуального трейсингу (live node highlight) |

### API-виклики

```typescript
// Pipeline A: код → DRAKON IR
startAnalysis(sourceCode, filePath)  // POST /v1/pipeline/analyze
  → job_id → pollJob(job_id)         // GET  /v1/pipeline/status/:id

// Pipeline B: IR → код
startGeneration(ir, targetLang)      // POST /v1/pipeline/generate
  → job_id → pollJob(job_id)

// Збереження пайплайну
savePipeline(name, ir)               // POST /api/graph-pipelines/:name
```

### Локальний стан

- Схеми зберігаються в `localStorage` (через `diagram-storage.ts`)
- Папки — в `localStorage` (через `folder-storage.ts`)
- Pipeline A/B — тільки сесійний стан (не персистований)

---

## `/agents` — Agent Studio (AgentStudioPage)

**Файл:** `src/pages/AgentStudioPage.tsx`

IDE для редагування та запуску LangGraph-пайплайнів через DRAKON-нотацію. Сторінку розробив CELESTINE GERONIMO.

### Макет

```
┌─ PipelineList ─┬─────── DrakonEditor ──────┬─ PropertiesPanel ─┐
│ Список назв    │  DRAKON-схема пайплайну   │  Стан (StateClass)│
│ пайплайнів     │  з live node highlight    │  Breakpoints list  │
│                │                           │                    │
├────────────────┴───────────────────────────┴────────────────────┤
│ ExecutionPanel: logs + SSE stream + Run/Stop/Resume buttons     │
└─────────────────────────────────────────────────────────────────┘
```

### Ключові компоненти

| Компонент | Роль |
|-----------|------|
| `PipelineList` | Список пайплайнів, завантаження для редагування |
| `DrakonEditor` | Редактор DRAKON-схеми пайплайну, validation chips |
| `StudioToolbar` | Run / Stop / Resume / Save / breakpoints toggle |
| `PropertiesPanel` | Вибір LangGraph StateClass та брейкпоінтів |
| `ExecutionPanel` | Консоль виконання: SSE-логи, статус, JSON стану |

### Live Tracing (T2)

```typescript
// usePipelineExecution hook:
//  activeNode  — вузол, що виконується зараз (amber pulse)
//  completedNodes: Set<string>  — виконані вузли (green dim + checkmark)
//
// SSE stream:
streamExecution(name, jobId)
  // events: node_done | breakpoint | done | error
  // node_done → додає nodeId в completedNodes
  // breakpoint → зупиняє виконання, чекає resumeExecution()
```

### API-виклики

```typescript
getPipeline(name)         // GET  /api/graph-pipelines/:name → IrDiagram
savePipeline(name, ir)    // POST /api/graph-pipelines/:name
startExecution(name, input, breakpoints)  // POST /api/graph-pipelines/:name/execute
streamExecution(name, jobId)              // GET  /api/graph-pipelines/:name/execute/:jobId/stream  (SSE)
resumeExecution(name, jobId, state)       // POST /api/graph-pipelines/:name/execute/:jobId/resume
```

---

## `/pipelines` — Pipeline Command Center

**Файл:** `src/components/pipelines/PipelineCommandCenter.tsx`

CRUD для пайплайнів: список, створення, видалення. Переходить на `/pipeline/:id/edit` для детального редагування.

---

## `/pipeline/:pipelineId/edit` — Pipeline Editor

**Файл:** `src/pages/PipelineEditorPage.tsx`

Повноцінний редактор одного пайплайну з DRAKON-схемою, LangGraph-конфігурацією, налаштуванням вузлів. Відкривається з `/pipelines`.

---

## `/devcycle` — DevCycle Command Center

**Файл:** `src/components/devcycle/DevCycleCommandCenter.tsx`

Покроковий workflow для рефакторингу та нових фіч через чергування Pipeline A/B.

### Сценарії

| Сценарій | Кроки |
|----------|-------|
| `REFACTORING` | Аналіз → DRAKON IR → Review → Генерація → Diff |
| `NEW_FEATURE` | Специфікація → IR → Генерація → Тести |

Стан зберігається в `DevCycleContext`. Кнопки `advanceStep()` / `resetCycle()`.

---

## `/code` — Code Editor (CodePage)

**Файл:** `src/pages/CodePage.tsx`

Monaco Editor з вибором файлів через GitHub або локально. Запускає Pipeline A прямо з редактора.

### Можливості

- **Monaco Editor** — підсвічування синтаксису для Python, TS, JS, Go, Rust, SQL та ін.
- **GitHub file picker** — відкрити файл з налаштованого репозиторію
- **Run Pipeline A** → `startAnalysis(code, path)` → перехід на `/diagrams` з результатом

---

## `/github` — GitHub Browser

**Файл:** `src/routes/github.tsx`

Браузер файлів GitHub-репозиторію з AI-аналізом через Pipeline A.

### Функції

- Дерево репозиторію (folders + files)
- Перегляд файлу в Dialog/Drawer
- **Analyze** кнопка → `startAnalysis()` → IR результат
- Завантаження файлу, відкриття в `/code`

**Передумова:** в Settings має бути налаштований `github.token` та `github.repo`.

---

## `/sync` — Code ↔ Diagram Sync

**Файл:** `src/routes/sync.tsx`

Порівнює результат Pipeline A (аналіз коду) із збереженими DRAKON-схемами. Знаходить розбіжності.

### Diff-типи

```typescript
type CodeDiagramDiff = {
  matched: MatchedItem[];        // є і в коді, і в схемах
  missingInDiagram: MissingInDiagram[];  // є в коді, немає схеми
  missingInCode: MissingInCode[];        // є схема, немає в коді
};
```

Корисно після рефакторингу коду — бачиш, які схеми застаріли.

---

## `/docs` — Documentation Hub

**Файл:** `src/routes/docs.tsx`

3 вкладки:

| Вкладка | Компонент | Опис |
|---------|-----------|------|
| Generator | inline в routes/docs.tsx | Запускає `docs-agent` job (POST /api/docs/generate), polling статусу |
| Documents | `NotesTab` | CRUD Markdown-нотаток через `docs-api.ts` |
| Graph | `NotesGraphTab` | Граф зв'язків між нотатками (wiki-links) |

### API-виклики (docs-agent)

```typescript
// через docs-api.ts → Cloudflare Worker → docs-agent:8767
docsApi.startJob(instructions)    // POST /api/docs/generate → job_id
docsApi.pollJob(job_id)           // GET  /api/docs/status/:id
docsApi.listNotes()               // GET  /api/docs/notes
docsApi.getNote(slug)             // GET  /api/docs/notes/:slug
docsApi.saveNote(slug, content)   // PUT  /api/docs/notes/:slug
```

---

## `/diagram/editor` — Full-Screen DRAKON Editor

**Файл:** `src/pages/DiagramEditorPage.tsx`

Повноекранний редактор без бокових панелей. Для детальної роботи з однією схемою.

---

## `/editor/:id` — Editor by Diagram ID

**Файл:** `src/pages/EditorPage.tsx`

Редактор за `diagramId` — відкривається при кліку з `/diagrams` або через direct link.

---

## `/settings` — Settings

**Файл:** `src/routes/settings.tsx`

2 вкладки:

### Вкладка: Worker

| Поле | Ключ в localStorage | Призначення |
|------|---------------------|-------------|
| Worker URL | `settings.workerUrl` | Base URL Cloudflare Worker |
| Password | → POST /api/login → JWT | Логін, отримання `clientJwt` |
| GitHub Token | `settings.github.token` | GitHub API для file browser |
| GitHub Repo | `settings.github.repo` | `owner/repo` для browser |

### Вкладка: Agents LLM

Компонент `AgentLlmCard` для кожного агента (drakon, architect, docs). Вибір моделі, temperature, max_tokens. Зберігається через Worker API.

---

## `/login` — Login Page

**Файл:** `src/routes/login.tsx`

Форма з полем Password. POST → Worker `/api/login` → отримує JWT → зберігає в `localStorage` як `clientJwt`. Після успіху → redirect `/diagrams`.

---

## Ключові TypeScript-інтерфейси

### Pipeline A/B (`src/lib/pipeline-api.ts`)

```typescript
interface PipelineJob {
  job_id: string;
  status: "pending" | "running" | "done" | "error";
}

interface AnalyzedFunction {
  name: string;
  ir: IrDiagram;
  // ... Python AST metadata
}

interface AnalyzeResult {
  functions: AnalyzedFunction[];
  job_id: string;
}

interface GenerateResult {
  code: string;
  language: string;
}

interface JobStatus<T = unknown> {
  status: "pending" | "running" | "done" | "error";
  result?: T;
  error?: string;
}
```

### Graph Pipelines (`src/lib/graph-pipeline-api.ts`)

```typescript
interface PipelineInfo {
  name: string;
  description?: string;
}

interface ExecutionEvent {
  type: "node_done" | "breakpoint" | "done" | "error";
  node?: string;        // nodeId для node_done/breakpoint
  state?: unknown;      // LangGraph State snapshot
  output?: unknown;     // фінальний результат для done
  error?: string;
}
```

### DRAKON IR (`src/types/drakon.ts` + `src/lib/htse/`)

```typescript
interface IrDiagram {
  name: string;
  params: string;       // РЯДОК, не масив
  items: Record<string, IrItem>;
}

type IrItem =
  | { type: "branch"; branchId: number; one: string }
  | { type: "action"; content: string; one: string }
  | { type: "question"; content: string; one: string; two: string }
  | { type: "end" };

// Validation (T3)
interface ValidationIssue {
  code: "DANGLING_POINTER" | "UNKNOWN_ITEM_TYPE" | string;
  severity: "error" | "warning";
  message: string;
  nodeId: string;       // ID проблемного вузла
}
```

---

## Auth Flow

```
User → /login → POST Worker /api/login (password)
     ← JWT token (24h expiry)
     → зберігається в localStorage як "clientJwt"

Всі API запити: Authorization: Bearer <clientJwt>
Worker → jwtVerify(token, JWT_SECRET)
       → proxy до agents або відповідь 401
```

`hasClientJwt()` (`src/lib/route-auth.ts`) — синхронна перевірка наявності токена в localStorage (не валідує підпис, лише наявність).

---

## Структура директорій фронтенду

```
.lovable/src/
├── routes/          ← TanStack Router: по одному файлу на route
├── pages/           ← Page-level компоненти (layout + state)
├── components/
│   ├── agents/      ← Agent Studio UI
│   ├── devcycle/    ← DevCycle workflow
│   ├── docs/        ← NotesTab, NotesGraphTab, DaviaSettingsPanel
│   ├── drakon/      ← DrakonEditor, DrakonCanvas (DRAKON widget wrapper)
│   ├── pipeline/    ← CodeAnalysisPanel, CodeGenerationPanel
│   ├── pipelines/   ← PipelineDrakonView, PipelineCommandCenter
│   ├── ui/          ← shadcn/ui primitives
│   └── workspace/   ← DiagramsLeftPanel, DrakonIrPanel, CanvasToolbar
├── hooks/           ← usePipelineExecution, useGithubRepos, ...
├── lib/
│   ├── api.ts                ← базовий fetch wrapper (додає JWT header)
│   ├── pipeline-api.ts       ← Pipeline A/B (startAnalysis, startGeneration, pollJob)
│   ├── graph-pipeline-api.ts ← Graph pipelines CRUD + SSE execution
│   ├── docs-api.ts           ← docs-agent API
│   ├── agent-api.ts          ← sendToAgent (architect/drakon/docs)
│   ├── diagram-storage.ts    ← localStorage для DRAKON-схем
│   ├── folder-storage.ts     ← localStorage для папок
│   └── htse/                 ← DRAKON IR ↔ DrakonWidget конвертери + validator
└── types/
    ├── drakon.ts             ← Diagram, Folder, IrItem types
    ├── drakonwidget.ts       ← DrakonDiagram (widget internal format)
    └── settings.ts           ← AppSettings type
```

---

## Семантичні зв'язки
**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[INDEX]] — переглянути всі документи розділу