# Lovable Prompt 48 — Autonomous UX Audit & Self-Directed Improvements

## Твоя роль

Ти — провідний UX-спеціаліст і архітектор інтерфейсів з глибокою експертизою в:
- Human-AI collaborative workflows
- Visual programming interfaces (DRAKON, flowcharts)
- Developer tooling (IDE-like interfaces)
- AI pipeline UX (LangGraph, agent orchestration)

## Що потрібно зробити

### Фаза 1: Вивчи проект

Прочитай наступні файли з репозиторію (вони вже є в кодовій базі):

1. `docs/ux-audit/audit.md` — попередній UX-аудит з пріоритетами
2. `docs/ux-audit/risks.md` — технічні ризики інтерфейсу
3. `docs/ux-audit/stitch-prompt.md` — бажаний IDE-layout (TOP BAR + ICON RAIL + panels)
4. `docs/ux-audit/stitch-prompt-pipeline-panels.md` — дизайн CodeAnalysis/CodeGeneration панелей
5. `docs/ux-audit/stitch-prompt-agent-studio.md` — дизайн Agent Logic Studio
6. `docs/AI-DRAKON Platform Redesign Proposal.md` — повне дослідження редизайну
7. `lovable-prompts/00-handoff.md` — архітектура проекту і критичні файли

### Фаза 2: Проаналізуй поточний код

Вивчи ключові файли:
- `src/components/workspace/WorkspaceShell.tsx` — навігація і layout
- `src/pages/DiagramsPage.tsx` — основна сторінка зі схемами
- `src/components/pipeline/CodeAnalysisPanel.tsx` — Pipeline A UI
- `src/components/pipeline/CodeGenerationPanel.tsx` — Pipeline B UI
- `src/routes/agents.tsx` або `src/pages/AgentsPage.tsx` — агенти
- `src/context/DevCycleContext.tsx` — DevCycle state machine

### Фаза 3: Сформулюй знахідки

На основі аудиту визнач:

**Критичні UX проблеми** (що заважає основним workflows):
- Відсутність чіткого "entry point" для Pipeline A (код → DRAKON) та Pipeline B (DRAKON → код)
- Незрозумілий зв'язок між DevCycle кроками і конкретними діями в UI
- Відсутність feedback loop між агентами і діаграмами

**Основні людино-AI пайплайни** які мають бути очевидними:
1. `REFACTORING FLOW`: Відкрити файл → Аналізувати (Pipeline A) → Переглянути DRAKON схему → Відредагувати → Генерувати код (Pipeline B) → Зберегти
2. `NEW FEATURE FLOW`: Намалювати DRAKON схему → Генерувати код (Pipeline B) → Переглянути → Зберегти в GitHub
3. `UNDERSTAND FLOW`: Завантажити код → Pipeline A → Читати схему → Нотатки

### Фаза 4: Реалізуй покращення

На основі аналізу самостійно реалізуй **3-5 конкретних покращень** які найбільше покращать UX пайплайнів. Пріоритет:

1. **Pipeline entry points** — зроби кнопки "Аналізувати код" і "Генерувати код" максимально помітними на DiagramsPage (canvas toolbar або floating)
2. **Pipeline status feedback** — під час роботи агента показуй прогрес (які кроки виконуються)
3. **DevCycle ↔ UI зв'язок** — коли активний DevCycle крок, підсвічуй відповідну панель/кнопку amber кольором
4. **Empty state helpfulness** — порожні стани мають показувати наступний крок (not just "no diagrams")
5. **Error recovery** — замість червоного екрану — корисне повідомлення з кнопкою дії

## Технічні обмеження

- CSS змінні: `var(--bg-base)`, `var(--bg-surface)`, `var(--bg-elevated)`, `var(--accent-amber)`, `var(--border-subtle)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--accent-dim)`, `var(--radius-sm)`
- Іконки тільки з `lucide-react`
- НЕ чіпати: `vite.config.ts`, `src/routeTree.gen.ts`, `src/lib/client-config.ts`, `.github/workflows/`
- API: всі запити через `src/lib/api.ts` на `/web/api/*`
- Шрифт: JetBrains Mono (вже підключений)
- NO gradients, NO box-shadow blur, NO glow effects

## Очікуваний результат

Після виконання промту:
- Основні AI пайплайни (A і B) мають бути одразу зрозумілими новому користувачу
- DevCycle Command Center має візуально "вести" по кроках
- Помилки не мають крашити UI — тільки inline повідомлення
- Порожні стани мають CTA кнопки для наступного кроку

Починай з Фази 1 (читання документації), потім Фази 2 (аналіз коду), і тільки після цього реалізуй зміни.
