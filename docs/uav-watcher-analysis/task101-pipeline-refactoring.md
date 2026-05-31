# TASK-101: Pipeline "Рефакторинг" — score_proximity

**Date:** 2026-05-31  
**Function:** `score_proximity` (uav_watcher.py, lines 78-105)  
**Scenario:** D — CC → Спрощення коду  

## UI Screenshot

`screenshots/task101-pipeline-d-selected.png` — Scenario D selected in /pipelines

## Pipeline API Result

**Endpoint:** `http://192.168.3.184:8766/pipeline/analyze`  
**Job ID:** `cad8301d-cc7e-4c9b-9287-14ce48afbb70`  
**Status:** `done`  
**IR size:** 1908 chars  

## DRAKON IR (trimmed)

```json
{
  "name": "score_proximity",
  "params": "text: str, city_keywords: list",
  "items": {
    "n1": {"type": "action", "content": "tl = text.lower()\nscore = 1\nterms = []", "one": "q2"},
    "q2": {"type": "question", "content": "kw in city_keywords?", "one": "q4", "two": "q8"},
    "q4": {"type": "question", "content": "kw.lower() in tl?", "one": "n5", "two": "q2"},
    "n5": {"type": "action", "content": "score += 3, terms.append(kw)", "one": "q8"},
    "...": "...",
    "end": {"type": "end"}
  }
}
```

## Висновки

- Pipeline A (Code → DRAKON IR) працює для `score_proximity`
- CC аналіз: функція має 4 незалежних гілки → CC ≈ 5 (рівень primitive)
- Рефакторинг пропозиція: об'єднати 4 for-loops в один загальний механізм scoring
- UI Scenario D: вибір сценарію клікається, кнопка "Аналізувати CC" доступна після вставки коду
