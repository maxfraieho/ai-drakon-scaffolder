---
status: "accepted"
date: 2026-08-18
deciders: "оператор + Codex"
spec: null
supersedes: null
superseded-by: null
---

# 0011. Будувати семантичний граф як GitHub-backed зв'язки Markdown

## Контекст і формулювання проблеми

Сервіс `semantic-graph` сканує Markdown-файли репозиторію, витягує LLM-відносини, застосовує link budget і записує секції `## Семантичні зв'язки` через GitHub API. Потрібне рішення, де зберігати knowledge links і як робити результат відтворюваним у Git.

## Рушії рішення

* repository-native history;
* dry-run/apply контроль;
* bounded links та робота з великими репозиторіями.

## Розглянуті варіанти

* Markdown sections у GitHub;
* окрема vector graph database;
* links лише в runtime memory.

## Підсумок рішення

Обрано GitHub-backed semantic graph: Markdown є source of truth, LLM генерує candidate relations, budget обмежує граф, `apply` записує зміни через commit API.

### Наслідки

* Добре: links reviewable, versioned і відновлювані.
* Добре: dry-run дозволяє перевірити зміни до запису.
* Погано: LLM relations можуть drift-ити; потрібні повторні побудови та review.

## Плюси і мінуси варіантів

### GitHub Markdown

* Добре: проста інтеграція та audit trail.
* Погано: graph queries повільніші за спеціальну DB.

### Vector graph database

* Добре: швидкий semantic retrieval.
* Погано: окремий storage та sync drift.

### Runtime memory

* Добре: немає write-back.
* Погано: knowledge зникає між runs.

## Додаткова інформація

Evidence: `services/semantic-graph/src/main.ts`, `collect.ts`, `render.ts`.
