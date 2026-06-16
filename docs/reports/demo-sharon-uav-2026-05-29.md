---
tags: [domain:report, status:active, format:report, tier:3]
created: 2026-05-29
title: "Demo: Sharon UAV Threat Classifier — End-to-End Test"
lang: uk
---

# Demo: Sharon UAV Threat Classifier

Перший зовнішній проект на AI-DRAKON уніфікованому фреймворку.

## Конфігурація
- Project: sharon-uav
- Agent: threat-classifier
- Pipeline: 4 ноди (header → search_kb → LLM prompt → end)
- KB: /home/vokov/projects/sharon-uav/agents/threat-classifier/kb/threats.md

## Тест 1: UAV загроза
Input: "чую характерний звук двигуна на малій висоті, нагадує шахед"

SSE Output:
```
data: {"status": "started", "agent": "threat-classifier"}

data: {"node": "search_kb", "status": "done"}

data: {"node": "_______________________________________KB__________9600ecb8", "status": "done"}

data: {"status": "finished"}


```

## Висновок
- Фреймворк працює end-to-end ✅
- DRAKON IR → LangGraph → built_in_tool + LLM → SSE
- Будь-який проект може використати цей паттерн

## Семантичні зв'язки
**Цей документ є частиною:** [[reports/_INDEX]]

**Цей документ пов'язаний з:**
- [[plans/2026-05-29-unified-agent-framework-v2]] — пов'язаний документ (2026 05 29 unified agent framework v2)