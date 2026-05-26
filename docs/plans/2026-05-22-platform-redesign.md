---
title: "AI-DRAKON Platform Redesign — 2026-05-22"
type: plan
tags: [drakon, pipeline, agent, plan]
status: active
created: 2026-05-22
updated: 2026-05-26
---

# AI-DRAKON Platform Redesign — 2026-05-22

## Мета

Єдиний командний центр для співпраці: людина ↔ CLI-агент (Claude/Codex) ↔ браузерні агенти (MCP) ↔ NVIDIA-проксі.

Підтверджено в brainstorming-сесії 2026-05-22.

---

## Секція 1 — Нова навігація

Дві зони в сайдбарі:

```
── РОБОЧИЙ ПРОСТІР
  Pipeline       /pipeline    (командний центр)
  Схеми          /diagrams
  Код            /code        (Monaco, новий)
  Нотатки        /docs

── СИСТЕМА
  Агенти         /agents
  Налаштування   /settings
```

- GitHub прибирається з навігації — стає інлайн-компонентом у Pipeline і Settings
- /code — нова вкладка, Monaco + GitHub picker + міні-Pipeline A

---

## Секція 2 — Pipeline Command Center (/pipeline)

Макет:
- Лівий стовпець: список кроків (Сценарій A або B), поточний підсвічений
- Права панель: змінюється на кожному кроці (файл-пікер / code viewer / IR list / DRAKON editor / code output)
- Нижній статус-бар: стан агентів + активний job_id

Сценарій A (Рефакторинг): код → аналіз → IR → редагування → генерація → результат
Сценарій B (Нова фіча): ідея → IR → редагування → генерація → результат

---

## Секція 3 — Видимість агентів

1. Глобальний статус-бар (28px внизу): drakon ● | architect ● | docs ● | job...
2. Картки агентів у Pipeline (на кроці де агент активний): модель, статус, прогрес ітерації
3. Вибір моделі в Settings: per-agent dropdown, моделі з /v1/models (кеш)

---

## Секція 4 — Редактор коду (/code)

- Monaco editor — ліворуч (основна зона)
- Права панель — міні Pipeline A: CC-скор, список функцій, [Аналізувати], [→ В схеми]
- Відкрити файл з GitHub — popup browser репозиторію
- Не IDE: призначений для читання + запуску Pipeline A + переходу до /diagrams

---

## Пріоритет реалізації

1. WorkspaceShell: нова навігація (2 зони, прибрати GitHub)
2. Pipeline Command Center: кроки + активна панель + статус-бар агентів
3. Глобальний агент-статус-бар у WorkspaceShell
4. /code: Monaco + GitHub picker + Pipeline A sidebar
5. Settings: вибір моделі per-agent
