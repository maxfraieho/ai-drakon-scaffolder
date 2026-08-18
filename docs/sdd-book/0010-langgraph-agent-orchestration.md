---
status: "accepted"
date: 2026-08-18
deciders: "оператор + Codex"
spec: null
supersedes: null
superseded-by: null
---

# 0010. Використовувати LangGraph для оркестрації агентських графів

## Контекст і формулювання проблеми

`services/architect-agent` залежить від `langgraph` і містить графові pipeline-и та state/node модулі. Потрібен явний orchestration layer для багатокрокової декомпозиції, аналізу та виконання.

## Рушії рішення

* явний state та порядок кроків;
* умовні переходи й повторне виконання;
* тестованість pipeline без прихованого control flow.

## Розглянуті варіанти

* LangGraph;
* власний dispatcher на FastAPI;
* один LLM-виклик без графа.

## Підсумок рішення

Обрано LangGraph як orchestration framework для agent workflows. FastAPI лишається transport layer; graph state, nodes і transitions — окремий execution layer.

### Наслідки

* Добре: pipeline має явну структуру та checkpoint/retry surface.
* Добре: node-level тести ізолюють orchestration logic.
* Погано: залежність від LangGraph API та складніша діагностика distributed runs.

## Плюси і мінуси варіантів

### LangGraph

* Добре: state graph відповідає багатокроковим агентським процесам.
* Погано: додаткова runtime-залежність.

### Власний FastAPI dispatcher

* Добре: мінімум залежностей.
* Погано: retries, branching і state lifecycle стають ad hoc.

### Один LLM-виклик

* Добре: проста реалізація.
* Погано: немає контрольованої декомпозиції та відновлення.

## Додаткова інформація

Evidence: `services/architect-agent/pyproject.toml`, `services/architect-agent/pipeline/`.
