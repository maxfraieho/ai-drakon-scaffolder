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

## Швидкий старт

```
Код на Python
    ↓  Pipeline A (architect-agent)
DRAKON IR  ←→  Редактор (Lovable frontend)
    ↓  Pipeline B (architect-agent)
Код цільовою мовою
```

Повний опис → [04 — Пайплайни](./04-pipelines.md).
