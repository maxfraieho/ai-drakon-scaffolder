---
tags:
  - domain:concept
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "AI-DRAKON: Документація системи"
lang: uk
---

# AI-DRAKON: Документація системи

> Система розробки застосунків на основі візуального програмування DRAKON з підтримкою AI-агентів.

## Зміст

| Документ | Опис |
|----------|------|
| [01 — Концепція](./01-vision.md) | Що таке AI-DRAKON, навіщо та для кого |
| [02 — Мова DRAKON](./02-drakon-primer.md) | DRAKON для розробника: типи, правила, IR-формат |
| [03 — Архітектура системи](./03-architecture.md) | Агенти, інфраструктура, потоки даних |
| [04 — Пайплайни](./04-pipelines.md) | Pipeline A (код → IR) та Pipeline B (IR → код) |
| [05 — Human-Agent Loop](./05-human-agent-loop.md) | Модель взаємодії людини та агента |
| [06 — База знань](./06-knowledge-base.md) | Роль предметних знань у системі |
| [08 — Агенти та markdown-KB](./08-agent-docs-integration.md) | DQL, MCP-інструменти, повна інтеграція docs-agent |

## UI та фронтенд

| Документ | Опис |
|----------|------|
| [UI Pages Reference](../ui-pages-reference.md) | Всі сторінки: маршрути, компоненти, API-виклики, TypeScript-інтерфейси |
| [UX Audit](../ux-audit/audit.md) | Детальний аудит UX з доказами та рекомендаціями |

## Архітектурні посібники (LangGraph)

| Документ | Опис |
|----------|------|
| [Фаза 1 — LangGraph для початківців](../architecture/01_langgraph_for_beginners.md) | Стан, вузли, ребра, цикли |
| [Фаза 2 — DRAKON → LangGraph mapping](../architecture/02_drakon_to_langgraph_mapping.md) | Ralph Loop, Syntax Loop |
| [Фаза 3 — Live Tracing Protocol](../architecture/03_live_tracing_protocol.md) | SSE, node events, підсвічування вузлів |
| [Фаза 4 — Валідація та помилки](../architecture/04_validation_and_errors.md) | ValidationIssue, геометрична перевірка |
| [Фаза 5 — Безпека та деплой](../architecture/05_security_and_deployment.md) | JWT, Worker, Cloudflare Pages |

## Швидкий старт

```
Код на Python
    ↓  Pipeline A (architect-agent)
DRAKON IR  ←→  Редактор (Lovable frontend)
    ↓  Pipeline B (architect-agent)
Код цільовою мовою
```

Повний опис → [04 — Пайплайни](./04-pipelines.md).

---

## Семантичні зв'язки
**Цей документ є частиною:** [[concept/_INDEX]]
**Цей документ пов'язаний з:**
- [[ui-pages-reference]] — референс сторінок UI
