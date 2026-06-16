---
name: AI-DRAKON Interface — Compiler-First
version: 1.1
updated: 2026-06-12
status: canonical
lang: uk
---

# DESIGN.md — Інтерфейс AI-DRAKON у світлі оновленої концепції

> v1.1: додано Reality Map (мапінг на реальний код), фази міграції та
> протокол роботи з OpenDesign. Концептуальна основа: `ARCHITECTURE-CORE.md`.

## 0) Продуктова опора (незмінна)

AI-DRAKON — **не редактор діаграм**, а **компілятор візуальної мови DRAKON в агентний код**.
UI має відображати це буквально:

- **DRAKON-схема** = джерело істини (ДНК)
- **Псевдокод** = транскрипція (мРНК)
- **Рибосома (агент + KB)** = компіляторна машина
- **Код агента** = артефакт збірки (білок)

> Візуальний пріоритет: не "намалювати гарно блоки", а "швидко пройти цикл
> компіляції і перевірити результат".

---

## 1) UX-принципи

1. **Compiler-first, editor-second** — у центрі сценарію: Compile → Validate → Diff → Deploy.
2. **One source of truth** — редагується логіка в DRAKON IR; код лише переглядається/перегенերується.
3. **Knowledge-aware by default** — користувач завжди бачить, з якої Зони Знань рибосома бере контекст.
4. **Deterministic + AI hybrid** — транскрипція IR→псевдокод детермінована; генерація коду — AI-крок з трасою.
5. **Auditability over ornament** — кожен крок має статус, вхід/вихід і причину помилки.

---

## 2) Інформаційна архітектура інтерфейсу

### Головна рамка (Workspace Shell)

```text
┌ TopBar: Project / Branch / Target / KB Zone / User ──────────────────────┐
├ IconRail ┬ Explorer ┬ Canvas+Pipeline ┬ Evidence Drawer ┬ Inspector      ┤
└──────────────────────────────────────────────────────────────────────────┘
```

### Зони

- **IconRail (40px):** Logic (DRAKON) · mRNA (псевдокод) · Ribosome (генерація) ·
  Protein (код) · Knowledge (MCP/зони) · Runtime (jobs/logs)
- **Explorer (220–260px):** Проєкти / Алгоритми / Пайплайни; стани артефактів (IR, pseudo, code)
- **Canvas+Pipeline (центр):** DRAKON canvas; контекстний toolbar: Analyze / Export pseudo / Compile
- **Evidence Drawer (нижній, 200–320px):** кроки компіляції; prompt/tool trace; validation
- **Inspector (правий, 340–380px):** властивості вузла; tool/LLM семантика; залежності від KB

---

## 3) Ключові сценарії користувача

### 3.1 Compile loop (основний happy path)

1. Користувач редагує DRAKON.
2. Натискає **Export mRNA** (IR → псевдокод).
3. Обирає target framework (Flue / LangGraph JS / LangGraph Py / CF Agents).
4. Натискає **Compile with Ribosome**.
5. Отримує: generated code · typecheck/validation status · diff до попередньої збірки · deploy-ready marker.

### 3.2 Debug loop (коли зламалось)

Помилка прив'язується до конкретного етапу: IR validation → pseudo export →
KB retrieval → code generation → typecheck/deploy.
UI дає кнопку **Retry from failed stage**, а не "запустити все заново".

### 3.3 Multi-target loop

Один DRAKON алгоритм → кілька білків (targets). Порівняння output у split
diff-режимі (перформанс, складність, tool-calls).

---

## 4) Візуальна мова (design system)

### Стиль

**Precision Dark IDE.** Плоскі поверхні, без тіней/градієнтів. 1px межі для
структури. Щільність 11–13px UI.

### Кольори (semantic)

Реалізація — ТІЛЬКИ через існуючі CSS-змінні проекту (`src/styles.css`:
`--background`, `--border`, `--muted-foreground`, `--accent-amber` тощо).
Перехід = оновлення значень змінних, НЕ хардкод hex у компонентах.

| Токен | Значення | Існуюча CSS-змінна |
|---|---|---|
| `bg.base` | #111318 | `--background` |
| `bg.surface` | #1a1b21 | `--card` / surface |
| `bg.elevated` | #282a2f | elevated |
| `text.primary` | #e2e2e9 | `--foreground` |
| `text.muted` | #9aa0aa | `--muted-foreground` |
| `accent.primary` | #f59e0b | `--accent-amber` (без змін!) |
| `accent.info` | #8fd5ff | info |
| `accent.success` | #51e77b | success |
| `accent.error` | #ff6b6b | destructive |
| `border.default` | rgba(255,255,255,0.10) | `--border` |

> Примітка: попередня палітра (#0A0A0A чистий чорний) замінюється на
> синювато-темну (#111318). Акцент #F59E0B — спільний, не змінюється.

### Типографіка

- UI: **IBM Plex Sans** (12/13px); fallback: Inter, system-ui
- Технічні сутності: **JetBrains Mono** (11/12px)
- Uppercase labels: +0.06em (тільки дрібні секційні заголовки)

### Радіуси

Панелі: 0–4px. Контроли: 4px. Жодних м'яких rounded hero-форм.

---

## 5) Компоненти (обов'язкові)

1. **CompilerToolbar** — Analyze · Export mRNA · Compile · Validate · Deploy
2. **PipelineTimeline** — стадії IR → mRNA → KB → Ribosome → Code → Typecheck → Deploy; статуси idle/running/success/fail
3. **ArtifactTabs** — IR JSON · Pseudocode · Generated Code · Diff · Logs
4. **KnowledgeZoneBadge** — активна зона; джерело (GitNexus/NotebookLM/...); freshness/retrieval status
5. **NodeSemanticsPanel** — для selected node: tool/llm marker, expected output schema, branch semantics

---

## 6) Контент-стратегія в UI (копірайт)

Мова компілятора, не мова "дизайн-редактора":
✅ "Export псевдокоду" · "Compile target" · "Validation passed" · "Regenerate artifact"
❌ "Зберегти красиву діаграму" · "Презентаційний режим"

---

## 7) Motion & interaction

Анімації 120–180ms, функціональні: зміна стану stage, reveal log, resize split.
Ніяких декоративних ефектів (glow/orbs/parallax).

---

## 8) Responsive policy

- **Desktop (primary):** повний 5-панельний layout.
- **Tablet:** Inspector як slide-over; Evidence Drawer collapse.
- **Mobile (secondary):** один активний контекст за раз (Canvas / Pipeline /
  Artifacts / Knowledge); sticky compile bar з 2 діями: Export mRNA · Compile.

---

## 9) Definition of Done для інтерфейсу

1. Користувач за ≤60 сек проходить повний compile loop від схеми до коду.
2. Кожна помилка локалізована до конкретної стадії.
3. Видно, яку KB-зону використано і чому результат такий.
4. DRAKON лишається єдиним editable source-of-truth.
5. Multi-target генерація доступна без дублювання логіки.

---

## 10) Антипатерни (заборонено)

- Перетворювати продукт на "ще один diagram board".
- Ховати pipeline/trace за модалками "для простоти".
- Змішувати контент маркетингу і compiler workspace на одному екрані.
- Робити code-editing primary, а DRAKON secondary.

---

## 11) Короткий маніфест

**AI-DRAKON UI — це операційна панель компілятора візуальної логіки.**
Користувач має відчувати не "я малюю блоки", а "я збираю агентну систему з
контрольованими артефактами та відтворюваним результатом".

---

## 12) Reality Map — мапінг на РЕАЛЬНИЙ код (v1.1)

Нова концепція НЕ пишеться з нуля. Кожен новий елемент еволюціонує з
існуючого компонента. Шляхи — фактичні, з репо `ai-drakon-scaffolder`:

| Новий елемент | Еволюціонує з | Реальний файл |
|---|---|---|
| Workspace Shell (5 панелей) | існуючий shell з collapsible-панелями | `src/components/workspace/WorkspaceShell.tsx` |
| Canvas (Logic) | DRAKON canvas сторінки діаграм | `src/pages/DiagramsPage.tsx`, `src/pages/DiagramEditorPage.tsx` |
| CompilerToolbar | toolbar PipelinesPage (list→ir→chat) | `src/pages/PipelineEditorPage.tsx` |
| PipelineTimeline | граф пайплайна (@xyflow/react) | `src/components/agents/PipelineFlowGraph.tsx` |
| ArtifactTabs | вкладки IR/чат у Pipelines | `src/pages/PipelineEditorPage.tsx` + `src/components/pipeline/` |
| Evidence Drawer | SSE job events + логи | job DO API architect-agent-flue (`/jobs/:id` SSE), `src/lib/graph-pipeline-api.ts` |
| Ribosome (генерація) | agent chat | `src/components/agents/AgentChatPanel.tsx`, `src/store/useAgentChatStore.ts`, `src/lib/agent-api.ts` |
| Knowledge (зони) | сторінка Knowledge (Gateway zones) | `src/pages/KnowledgePage.tsx`, `src/components/knowledge/` |
| KnowledgeZoneBadge | NotebookLM інтеграція | `src/pages/NotebookLMPage.tsx`, `src/components/notebooklm/` |
| Runtime (jobs/logs) | Observability | `src/pages/ObservabilityPage.tsx` |
| TopBar Target selector | налаштування агентів | `src/lib/settings-storage.ts` (agents.*Url, llm config) |
| Export mRNA (кнопка) | ✅ TASK-215 (готовий drakongen) | `src/lib/drakon/pseudocode.ts` + `public/libs/drakongen.js` |
| Compile (кнопка) | ✅ TASK-216/217 (рибосома) | `services/architect-agent-flue/tools/ribosome.ts` + `POST /compile` |

### Незмінні інваріанти коду

- `drakonwidget.js`, `src/lib/drakon/adapter.ts` — НЕДОТОРКАНІ.
- IR без X/Y; `params` — STRING; b0: type="branch", branchId=0 (число).
- CSS-змінні — єдиний механізм теми (`theme-provider.tsx` лишається).
- `src/` ↔ `.lovable/src/` дзеркало після кожної зміни.
- `npx tsc --noEmit` чистий після кожного компонента.
- UI українською; технічні терміни (DRAKON, Pipeline, IR) без перекладу.

---

## 13) Фази міграції UI

> Статус 2026-06-12: Фаза A ✅ (TASK-213, AGY2); Фаза B-1 CompilerToolbar ✅
> (TASK-214); з Фази C достроково: Export mRNA ✅ (215) і Compile ✅ (217).
> Лишилось: B-2 PipelineTimeline, B-3 ArtifactTabs, B-4 KnowledgeZoneBadge,
> B-5 NodeSemanticsPanel; C: Evidence Drawer ← SSE jobs.

- **Фаза A — токени + shell:** оновити CSS-змінні палітри; WorkspaceShell
  розширити до IconRail + Evidence Drawer (collapsible, без зламу існуючих маршрутів).
- **Фаза B — compiler-компоненти:** CompilerToolbar, PipelineTimeline,
  ArtifactTabs, KnowledgeZoneBadge, NodeSemanticsPanel — кожен генерується
  через OpenDesign З РЕАЛЬНИМ кодом-предком у промпті, інтегрується окремим комітом.
- **Фаза C — wiring:** підключення до реальних API (SSE jobs, pseudocode-export
  з Sprint 3, /zones з Sprint 4). Фаза C йде ПІСЛЯ Sprint 3 backend-у.

---

## 14) Протокол OpenDesign (real-code, ОБОВ'ЯЗКОВИЙ)

OpenDesign (192.168.3.184:7460, plugin `ai-drakon-mobile`, design-system
`ds-ai-drakon-scaffolder-design-system`) НЕ має доступу до git. Тому:

1. **Перед кожною генерацією** виконавець читає РЕАЛЬНИЙ файл-предок з репо
   і вкладає його сирцем у промпт od-generate.sh:
   `"ОСЬ ПОТОЧНИЙ КОД <шлях>: <code>...</code>. Redesign за DESIGN.md §N: <вимога>. Зберегти всі існуючі props, imports, store-хуки."`
2. Генерувати ТІЛЬКИ через `bash ~/bin/od-generate.sh` на dev-сервері (НЕ curl з AGY3).
3. **Приймання результату:** згенерований код МУСИТЬ імпортувати реальні
   модулі проекту (`@/store/useAgentChatStore`, `@/lib/agent-api`, ...) і
   зберігати існуючі props/контракти. Якщо OpenDesign вигадав неіснуючі
   imports/types — результат ВІДХИЛЯЄТЬСЯ, промпт уточнюється, генерація повторюється.
4. Після інтеграції: `npx tsc --noEmit` → дзеркало `.lovable` → окремий коміт на компонент.

## Семантичні зв'язки
**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[ARCHITECTURE-CORE]] — пов'язаний документ (ARCHITECTURE CORE)
- [[ui-pages-reference]] — пов'язаний документ (ui pages reference)