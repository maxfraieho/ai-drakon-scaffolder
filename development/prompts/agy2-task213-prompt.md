# Промпт для Antigravity Desktop (AGY2, Windows 11) — TASK-213

> Скопіюй усе нижче цієї лінії у десктопний Antigravity.
> Робоча тека: локальний клон ai-drakon-scaffolder (якщо нема —
> `git clone https://github.com/maxfraieho/ai-drakon-scaffolder`).

---

Ти працюєш у репозиторії **ai-drakon-scaffolder** (React 18 + TypeScript +
Tailwind + Vite). Виконай задачу **TASK-213 — UI Redesign Фаза A** точно за
кроками. Мова відповідей і комітів — як вказано нижче.

## Крок 0 — синхронізація (ОБОВ'ЯЗКОВО ПЕРШИМ)

```
git pull origin main
```

Прочитай ПОВНІСТЮ `docs/DESIGN.md` (v1.1 "Compiler-First") — особливо
§4 (токени), §12 (Reality Map + інваріанти), §14 (протокол real-code).
Це канонічна специфікація. Також переглянь `docs/ARCHITECTURE-CORE.md` §0
для розуміння концепції (компілятор DRAKON → агентний код, ДНК→білок).

## Крок 1 — палітра (тільки значення CSS-змінних)

У файлі зі змінними теми (`src/styles.css` або `src/index.css` — знайди, де
визначені `--background`, `--border` тощо) онови ЗНАЧЕННЯ під DESIGN.md §4:

- `--background` → `#111318`
- surface/card → `#1a1b21`
- elevated → `#282a2f`
- `--foreground` → `#e2e2e9`
- `--muted-foreground` → `#9aa0aa`
- `--border` → `rgba(255,255,255,0.10)`
- акцент `#f59e0b` (`--accent-amber`) — НЕ ЧІПАТИ
- додай, якщо нема: `--accent-info: #8fd5ff; --accent-success: #51e77b; --accent-error: #ff6b6b;`

ЗАБОРОНЕНО: нові hex-кольори в компонентах. Тільки CSS-змінні.
Якщо змінні задані в HSL-форматі для Tailwind (`--background: 222 14% 8%`) —
конвертуй нові hex у той самий формат, НЕ ламай існуючу схему.

## Крок 2 — WorkspaceShell (real-code правило!)

Файл: `src/components/workspace/WorkspaceShell.tsx`.

**ПРАВИЛО (DESIGN.md §14): модифікуй ІСНУЮЧИЙ код. Збережи ВСІ поточні
props, children-слоти, collapsible-механіку панелей, імпорти. Нічого з
існуючої функціональності не видаляй. Не вигадуй неіснуючі модулі.**

Додай:

1. **Лівий IconRail 40px** — вертикальна колонка з 6 іконками lucide-react:
   - Logic = `GitBranch` → navigate `/diagrams`
   - mRNA = `FileCode2` → disabled, `title="Sprint 3"`
   - Ribosome = `Cpu` → navigate `/agents`
   - Protein = `Braces` → navigate `/pipelines`
   - Knowledge = `BookOpen` → navigate `/knowledge`
   - Runtime = `Activity` → navigate `/observability`
   Активний маршрут — амбер-іконка (`--accent-amber`), решта muted.
   Навігація через react-router-dom v6 (`useNavigate`/`NavLink`).

2. **Нижній Evidence Drawer** — collapsible панель 200–320px заввишки,
   toggle-стріпом у тому ж стилі, що існуючі collapsible-панелі shell-а.
   Поки що порожній контейнер з заголовком "EVIDENCE" і slot-ом для
   children (контент підключимо у Фазі C). Після collapse/expand виклич
   `window.dispatchEvent(new Event('resize'))` — canvas мусить reflow
   (так уже зроблено для бічних панелей — подивись існуючий код).

Стилі — тільки токени через Tailwind-класи (`bg-background`, `border-border`,
`text-muted-foreground`) як у решті файлу.

## Крок 3 — дзеркало .lovable (ОБОВ'ЯЗКОВО)

```
cp src/styles.css .lovable/src/styles.css        (або який файл правив у кроці 1)
cp src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx
```

(На Windows — `copy` з відповідними шляхами.)

## Крок 4 — верифікація

```
npx tsc --noEmit
```

МУСИТЬ бути 0 помилок. Якщо є — виправ і повтори.

## Крок 5 — commit + push

У `development/TASKS.md` знайди рядок `[ ] TASK-213` і зміни на `[x] TASK-213`.

```
git add src/... .lovable/src/... development/TASKS.md   (конкретні файли, НЕ git add .)
git commit -m "feat(ui): phase A compiler-first — semantic palette + WorkspaceShell IconRail/Evidence Drawer (TASK-213)"
git push origin main
```

## Заборонено (інваріанти проекту)

- `git add .` — тільки конкретні файли
- Чіпати `drakonwidget.js`, `src/lib/drakon/adapter.ts`
- Чіпати будь-які інші сторінки/компоненти (це окремі наступні задачі)
- Нові npm-залежності
- Секрети/токени у коді чи комітах

## Звіт

Після push напиши короткий підсумок: які файли змінено, hash коміту,
результат tsc.
