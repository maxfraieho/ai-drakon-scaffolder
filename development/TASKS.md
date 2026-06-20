
[x] TASK-DRK-1: Планування DRAKON Platform — PRD + Issues + TASKS
!!IMPORTANT!! Run locally on AGY3 Termux. Do NOT SSH anywhere.

## Контекст
ai-drakon — платформа для розробки ПЗ на основі DRAKON-схем з AI-агентами.
Підтверджені рішення (grilling Q1-Q4):
- Q2: Зберігання = GitHub репо юзера. Структура: solution.json, docs/domain.md, module-*/func.drakon, generated/output.js
- Q3: Старт = interview (документознавець) → domain.md → архітектор → заглушки .drakon → GitHub репо
- Q4: getObjectByHandle(handle) = GitHub API fetch. Збірка: drakontechgen рекурсивний обхід → один output файл
- Q1: /codegen потребує переосмислення. Редактор на /diagrams вже є — не дублювати

## Завдання (модель claude-opus-4-8 або gemini-2.5-pro через localhost:8080)

Згенеруй відповідь max_tokens: 8000 з такими секціями:

SECTION 1 — GRILLING Q5-Q9 (власні відповіді):
Q5: Документознавець і архітектор — окремі чи один агент?
Q6: drakonwidget — в /codegen, /diagrams, чи нова /project сторінка?
Q7: Збірка — сервер (Appwrite Function) чи браузер (drakontechgen client-side)?
Q8: Auth агентів — Appwrite JWT юзера чи service account?
Q9: MVP scope — що обов'язково зараз, що відкласти?

SECTION 2 — PRD (Problem Statement, Solution, User Stories x15+,
Implementation Decisions, Testing Decisions, Out of Scope, Further Notes)

SECTION 3 — ISSUES (мінімум 10, формат: Category/Summary/Current/Desired/Interfaces/Criteria/OutOfScope/Complexity)

SECTION 4 — TASKS.md рядки (формат: [ ] TASK-DRK-N: Назва [AGENT: claude|opus|agt3])

## Збереження
Збережи у /tmp/drakon-platform-prd.md
scp до vokov@192.168.3.184:/home/vokov/projects/ai-drakon-scaffolder/development/DRAKON-PLATFORM-PRD.md


# DRAKON Platform Implementation Tasks (from DRAKON-PLATFORM-PRD.md)
[x] TASK-DRK-2: React-компонент обгортка для drakonwidget [AGENT: agt3]
[x] TASK-DRK-3: Динамічне завантаження drakontechgen.js у браузері [AGENT: agt3]
[x] TASK-DRK-4: Клієнтська компіляція .drakon->JS/Lua (drakontechgen buildGenerator) [AGENT: opus]
[x] TASK-DRK-5: Файлове дерево проекту у бічній панелі Workspace [AGENT: agt3]
[ ] TASK-DRK-6: Збереження схем та коду в GitHub через GitHub API [AGENT: opus]
[ ] TASK-DRK-7: Docs-Agent Appwrite Function — оновлення docs/domain.md [AGENT: claude]
[ ] TASK-DRK-8: Architect-Agent Appwrite Function — генерація скелетних .drakon схем [AGENT: claude]
[ ] TASK-DRK-9: Валідація .drakon схем у drakon-codegen Appwrite Function [AGENT: opus]
[ ] TASK-DRK-10: Silent Refresh для Appwrite JWT (15хв expiry) [AGENT: agt3]
[ ] TASK-DRK-11: UI стартового інтерв'ю для нових проектів (/project/new) [AGENT: agt3]
[ ] TASK-DRK-12: Лінкер — збірка всіх модулів за solution.json [AGENT: opus]
[ ] TASK-DRK-13: Підсвітка помилок компіляції на вузлах drakonwidget [AGENT: agt3]
[ ] TASK-DRK-14: Тести генерації та збірки DRAKON-схем [AGENT: opus]
[ ] TASK-DRK-15: CF Worker нові endpoints для агентів (docs-agent, architect-agent) [AGENT: agt3]
