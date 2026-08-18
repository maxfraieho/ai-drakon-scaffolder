---
status: "accepted"
date: 2026-08-18
deciders: "оператор + Codex"
spec: null
supersedes: null
superseded-by: null
---

# 0013. Зберігати конфігурацію crisis-bot в одному GitHub-backed project config

## Контекст і формулювання проблеми

`architect-agent` project tools читають і записують project config у `projects/u/{userId}/{slug}/config.json`. Crisis-bot має LangGraph-план, але поточний checkout не містить готового runtime config schema. Потрібен один versioned config boundary для pilot integration.

## Рушії рішення

* одна source of truth для repo, branch і agent settings;
* Git review/history;
* відсутність конфлікту між env defaults і per-project data.

## Розглянуті варіанти

* один GitHub project config;
* окремі env-файли для кожного agent;
* Appwrite-only config.

## Підсумок рішення

Обрано один GitHub-backed project config як target architecture для crisis-bot integration. Runtime secrets лишаються в environment; repo/branch/agent metadata та non-secret behavior config зберігаються в versioned config. Реалізація потребує окремого implementation spec.

### Наслідки

* Добре: конфігурацію можна review-ити та відкотити.
* Добре: agents отримують однаковий project context.
* Погано: GitHub availability і write permissions стають runtime dependency.

## Плюси і мінуси варіантів

### Один GitHub config

* Добре: прозора source of truth.
* Погано: потрібні token scopes і conflict handling.

### Окремі env-файли

* Добре: простий локальний старт.
* Погано: drift та відсутність reviewable history.

### Appwrite-only

* Добре: central runtime storage.
* Погано: config changes менш видимі в code review.

## Додаткова інформація

Evidence: `services/architect-agent-flue/src/tools/project-pipelines.ts`, `services/crisis-bot/pyproject.toml`, `services/crisis-bot/docs/plans/2026-05-17-crisis-bot-langgraph.md`.
