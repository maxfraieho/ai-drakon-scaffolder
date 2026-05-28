---
tags:
  - domain:agent
  - status:active
  - format:skill
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "Навичка AGY: Документування (Docs Agent)"
lang: uk
---

# Навичка AGY: Документування (Docs Agent)

## Призначення

Генерація вичерпної технічної документації для платформи AI-DRAKON, зокрема опис **агентських пайплайнів LangGraph**, **середовища виконання DRAKON IR** та **архітектури компонентів фронтенду**.

Документація базується на **реальній семантиці виконання**, а не лише на структурі вихідного коду.

---

## Перевірка готовності (ЗАВЖДИ виконувати спочатку)

```
1. mempalace_search("ai-drakon architecture")
2. mempalace_search("LangGraph architect-agent")
3. notebooklm_ask("drn-ai", "What is the LangGraph pipeline architecture?")
4. notebooklm_ask("drn-ai", "How does DRAKON IR map to agent execution?")
```

Якщо MemPalace містить свіжі дані (< 7 днів) → використовуйте їх безпосередньо.
Якщо дані застаріли → спочатку запустіть навичку `02-repo-analyzer`, а потім поверніться сюди.

---

## Конвеєр документування

### Фаза 1 — Вилучення архітектурних даних
Цільові файли (на 192.168.3.184):
```bash
# Core architecture
~/workspace/ai-drakon-scaffolder/docs/architecture.md
~/workspace/ai-drakon-scaffolder/services/architect-agent/
~/workspace/ai-drakon-scaffolder/services/drakon-agent/
~/workspace/ai-drakon-scaffolder/services/docs-agent/
~/workspace/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js
```

Прочитайте через SSH. Вилучіть:
- Обов'язки сервісів та контракти API.
- Визначення вузлів LangGraph та топологію пайплайнів.
- Формат DRAKON IR (items: Record<string, IrItem>).
- Визначення інструментів MCP з коду воркера.

### Фаза 2 — Документування LangGraph (ПРІОРИТЕТ)
Задокументуйте такі патерни з `architect-agent`:
- Формат визначення пайплайнів (JSON конфіги в `drn/`).
- Детерміновані вузли проти ШІ-вузлів (LLM nodes).
- Структура класу Стан (`State`).
- Потік виконання графа (start → nodes → END).
- Точки зупинки (breakpoints) та механізм відновлення (resume).
- Протокол SSE-стрімінгу (`/graph-pipelines/{name}/execute/{id}/stream`).

Результат: `docs/generated/langgraph-architecture.md`

### Документування Фази 3 — Специфікація DRAKON IR
Задокументуйте на основі `src/lib/htse/`:
- Формат `IrDiagram`: `{name, access, params, items: Record<nodeId, IrItem>}`.
- Типи `IrItem`: action | question | select | case | header | end | address | branch | insertion | input | output | shelf | process | timer | duration.
- Конвеєр конвертації: код → AST → сирий IR → очищений IR → drakonwidget.js.
- Валідація (`ir-validator-core.ts`).
- Двонаправлена конвертація (`diagram-to-ir.ts`, `ir-to-diagram.ts`).

Результат: `docs/generated/drakon-ir-spec.md`

### Фаза 4 — Документування компонентів фронтенду
Задокументуйте ключові компоненти:
```
WorkspaceShell.tsx    — 3-колонковий IDE-макет, висувні панелі
DiagramsPage.tsx      — редактор DRAKON + IR таблиця (Колонка 1 + Колонка 2)
AgentStudioPage.tsx   — редактор графів DRAKON (CELESTINE GERONIMO)
PipelinesPage.tsx     — mobile-first: потік list→ir→chat
PipelineChat.tsx      — SSE-стрімінг чату з агентами
ProjectContext.tsx    — керування станом активного проекту
```

Результат: `docs/generated/frontend-components.md`

### Фаза 5 — Референс API Cloudflare Worker
Вилучіть усі маршрути (routes) з `cloudflare-worker/worker-mcp-drakon.js`:
- Згрупуйте за доменами: auth, drakon, analysis, github, projects, notes, pipeline.
- Задокументуйте схеми запитів/відповідей (request/response).
- Вкажіть вимоги до авторизації.

Результат: `docs/generated/worker-api-reference.md`

---

## Інтеграція з NotebookLM

Після генерації кожного розділу документації:
```bash
notebooklm source add --notebook drn-ai ./docs/generated/<file>.md
```

Потім надішліть запити для збагачення:
```bash
notebooklm ask "drn-ai" "Explain the execution flow of this pipeline from a developer perspective"
notebooklm generate report --notebook drn-ai --format study-guide
```

Використовуйте відповіді NotebookLM для додавання секції "Developer Notes" до кожного документа.

---

## Стандарти оформлення

Усі згенеровані документи використовують таку структуру:
```markdown
---
title: <назва компоненту>
type: generated-docs
generated: <ISO дата>
project: ai-drakon-scaffolder
status: draft
---

## Overview
## Architecture
## Key Interfaces / API
## Execution Flow
## Integration Points
## Developer Notes (from NotebookLM)
## Known Issues / TODOs
```

Мова: Українська (технічні терміни англійською).

---

## Збереження артефактів

- Тимчасові: `~/.gemini/antigravity-cli/brain/ai-drakon-docs/`
- Фінальні: `~/workspace/ai-drakon-scaffolder/docs/generated/`
- Git commit після кожної фази: `docs: generate <component> documentation [agy]`

---

## Індексація в MemPalace (після кожної Фази)

```python
mempalace_add_drawer(
  wing="ai-drakon",
  room="generated-docs",
  source_file="docs/generated/<file>.md",
  content=<summary 500 words max>
)
```

---

## Звіт для Claude

Після повного виконання конвеєра надішліть стисле резюме:
```
DOCS COMPLETE:
- Phase 1-5: [done/partial/blocked]
- Files: [list of docs/generated/*.md]
- Key findings: [max 5 bullets]
- NotebookLM: [what was added to drn-ai]
- Blockers: [any]
```

---

## Семантичні зв'язки
**Цей документ є частиною:** [[agents/_INDEX]]

**Цей документ пов'язаний з:**
- [[kb/zettelkasten-mempalace-principles]] — принципи балансування Вікі-графу та оновлення пам'яті
- [[agents/_INDEX]] — переглянути всі документи розділу