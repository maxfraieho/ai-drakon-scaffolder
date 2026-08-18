---
description: SDD Шаблон 4 — інтеграція зовнішнього сервісу/API. Адаптер, round-trip верифікація, regression-тести.
argument-hint: <назва сервісу та протокол>
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

Виконай Шаблон 4 ("🔌 Інтеграція Сервісів / Протоколів") з `docs/for-agents/sdd-development-methodology.md` для: $ARGUMENTS

1. Прочитай `docs/for-agents/sdd-development-methodology.md`, розділ "ШАБЛОН 4", і виконай його крок за кроком.
2. Прочитай реальний контракт сервісу (Swagger/OpenAPI/JSON-RPC) — не вигадуй з пам'яті.
4. Жорсткий таймаут на основі реальних вимірів p95.
5. Реалізуй адаптер у окремому модулі, додай метрики.
6. Створи round-trip verification-скрипт та regression-тест.
