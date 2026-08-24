---
status: "accepted"
date: 2026-08-18
deciders: "оператор + Codex"
spec: null
supersedes: null
superseded-by: null
---

# 0012. Використовувати DRAKON IR як двонапрямний контракт

## Контекст і формулювання проблеми

Agent pipelines мають два пов'язані сценарії: code → DRAKON IR та DRAKON IR → code. Контракт IR повинен бути валідованим проміжним представленням, а не одноразовим LLM-артефактом.

## Рушії рішення

* збереження diagram semantics;
* round-trip між кодом і діаграмою;
* validation перед code generation.

## Розглянуті варіанти

* спільний DRAKON IR для обох напрямків;
* окремі непов'язані JSON-моделі;
* генерація коду без IR.

## Підсумок рішення

Обрано двонапрямний DRAKON IR contract. Pipeline A генерує та валідовує IR з коду; Pipeline B приймає IR і генерує цільовий код. IR зберігає canonical node/edge semantics.

### Наслідки

* Добре: import/export мають спільну перевірювану модель.
* Добре: validation ловить структурні помилки до генерації.
* Погано: не всі мовні конструкції мають lossless DRAKON representation.

## Плюси і мінуси варіантів

### Спільний IR

* Добре: один контракт для UI, agents і generators.
* Погано: schema evolution потребує сумісності.

### Окремі моделі

* Добре: кожен direction оптимізується локально.
* Погано: drift і дубльовані validators.

### Без IR

* Добре: короткий path.
* Погано: немає стабільного import/export contract.

## Додаткова інформація

Evidence: `services/architect-agent/pipelines/pipeline_a.drakon.json`, `pipeline_b.drakon.json`, `services/architect-agent-flue/workflows/pipeline-a.ts`, `pipeline-b.ts`.
