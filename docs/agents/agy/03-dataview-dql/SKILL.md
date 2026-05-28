---
tags:
  - domain:agent
  - status:active
  - format:skill
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "Навичка AGY: Кінцева точка Dataview DQL та виправлення REPO_ROOT"
lang: uk
---

# Навичка AGY: Кінцева точка Dataview DQL та виправлення REPO_ROOT

> **Одноразова задача імплементації.** Стягнути зміни з `ai-drakon-setup`, реалізувати кінцеву точку `/docs/dataview/query`, виправити змінну `REPO_ROOT` у скрипті ініціалізації, зробити commit+push змін та перезапустити сервіс.

---

## Контекст

Сервіс `docs-agent` (FastAPI :8767, розгорнутий на сервері розробки `192.168.3.184`) надає доступ до документів через дві кінцеві точки:
- `GET /docs/list` — дерево файлів.
- `GET /docs/read` — читання одного файлу.

Інструмент Cloudflare Worker `docs.query` робить виклик до `POST /docs/dataview/query`, проте **ця кінцева точка ще не існує** (повертає помилку 404).

Крім того, скрипт ініціалізації OpenRC `/etc/init.d/ai-docs-agent` містить:
```
environment="REPO_ROOT=/home/vokov/workspace/sharon-global ..."
```
Це **невірно** — документи знаходяться у `/home/vokov/workspace/ai-drakon-scaffolder/docs/`. Необхідно виправити на `REPO_ROOT=/home/vokov/workspace/ai-drakon-scaffolder`.

---

## Репозиторії

| Репозиторій | Шлях на сервері | GitHub |
|------|--------------------|--------|
| `ai-drakon-setup` (бекэнд-сервіси) | `/home/vokov/workspace/ai-drakon-setup/` | `https://github.com/maxfraieho/ai-drakon-setup.git` |
| `ai-drakon-scaffolder` (фронтенд + документи) | `/home/vokov/workspace/ai-drakon-scaffolder/` | `https://github.com/maxfraieho/ai-drakon-scaffolder.git` |

Доступ до сервера по SSH: `sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184`

---

## Задача 1: Оновлення ai-drakon-setup на сервері

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cd /home/vokov/workspace/ai-drakon-setup && git pull"
```

---

## Задача 2: Створення `dataview_route.py`

**Файл для створення:** `/home/vokov/workspace/ai-drakon-setup/services/docs-agent/dataview_route.py`

Запишіть цей файл **точно** (через scp або heredoc через SSH):

```python
"""Dataview DQL query endpoint for docs-agent.

Supports a subset of Obsidian Dataview Query Language (DQL):
  LIST FROM "path"|#tag [WHERE field = "val"] [SORT field ASC|DESC] [LIMIT N]
  TABLE field1, field2 FROM "path"|#tag [WHERE field = "val"] [SORT field ASC|DESC] [LIMIT N]

WHERE supports: field = "value"  and  field != "value"
"""
import os
import re
from pathlib import Path
from typing import Optional

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/docs", tags=["dataview"])

REPO_ROOT = Path(os.getenv(
    "REPO_ROOT",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
))
DOCS_ROOT = REPO_ROOT / "docs"

_FRONTMATTER_RE = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)


def _read_frontmatter(path: Path) -> Optional[dict]:
    try:
        text = path.read_text(encoding="utf-8")
        m = _FRONTMATTER_RE.match(text)
        if not m:
            return None
        fm = yaml.safe_load(m.group(1))
        if not isinstance(fm, dict):
            return None
        fm["file.name"] = path.stem
        fm["file.path"] = str(path.relative_to(REPO_ROOT)).replace("\\", "/")
        return fm
    except Exception:
        return None


def _scan_docs(source: str) -> list[dict]:
    source = source.strip().strip('"')

    if source.startswith("#"):
        tag = source[1:]
        results = []
        for p in sorted(DOCS_ROOT.rglob("*.md")):
            fm = _read_frontmatter(p)
            if fm is None:
                continue
            tags = fm.get("tags") or []
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(",")]
            if tag in tags:
                results.append(fm)
        return results

    rel = source.lstrip("/")
    target = (REPO_ROOT / rel).resolve()
    if not str(target).startswith(str(REPO_ROOT)):
        return []

    results = []
    if target.is_file():
        fm = _read_frontmatter(target)
        if fm:
            results.append(fm)
    elif target.is_dir():
        for p in sorted(target.rglob("*.md")):
            fm = _read_frontmatter(p)
            if fm:
                results.append(fm)
    return results


def _parse_dql(query: str) -> dict:
    q = query.strip()
    result = {"op": None, "fields": [], "source": None, "where": None,
              "sort": None, "order": "ASC", "limit": None}

    upper = q.upper()
    if upper.startswith("LIST"):
        result["op"] = "LIST"
        rest = q[4:].strip()
    elif upper.startswith("TABLE"):
        result["op"] = "TABLE"
        rest = q[5:].strip()
    else:
        return result

    m = re.search(r'\bLIMIT\s+(\d+)\s*$', rest, re.IGNORECASE)
    if m:
        result["limit"] = int(m.group(1))
        rest = rest[:m.start()].strip()

    m = re.search(r'\bSORT\s+(\S+)(?:\s+(ASC|DESC))?\s*$', rest, re.IGNORECASE)
    if m:
        result["sort"] = m.group(1).lower()
        result["order"] = (m.group(2) or "ASC").upper()
        rest = rest[:m.start()].strip()

    m = re.search(r'\bWHERE\s+(.+)$', rest, re.IGNORECASE)
    if m:
        result["where"] = m.group(1).strip()
        rest = rest[:m.start()].strip()

    m = re.search(r'\bFROM\s+(.+)$', rest, re.IGNORECASE)
    if m:
        result["source"] = m.group(1).strip()
        rest = rest[:m.start()].strip()

    if rest:
        result["fields"] = [f.strip() for f in rest.split(",") if f.strip()]

    return result


_COND_RE = re.compile(r'(\S+)\s*(!=|=)\s*"([^"]*)"', re.IGNORECASE)


def _apply_where(rows: list[dict], clause: str) -> list[dict]:
    m = _COND_RE.match(clause.strip())
    if not m:
        return rows
    field, op, value = m.group(1), m.group(2), m.group(3)
    if op == "=":
        return [r for r in rows if str(r.get(field, "")) == value]
    if op == "!=":
        return [r for r in rows if str(r.get(field, "")) != value]
    return rows


class DataviewQueryRequest(BaseModel):
    query: str


@router.post("/dataview/query")
def dataview_query(req: DataviewQueryRequest):
    """Execute a DQL query against docs YAML frontmatter.

    Syntax:
      LIST FROM "path"|#tag [WHERE field = "val"|field != "val"]
                            [SORT field ASC|DESC] [LIMIT N]
      TABLE field1, field2 FROM "path"|#tag [WHERE ...]
                                             [SORT field ASC|DESC] [LIMIT N]
    """
    parsed = _parse_dql(req.query)
    if not parsed["op"]:
        raise HTTPException(status_code=400, detail=f"Cannot parse DQL: {req.query!r}")
    if not parsed["source"]:
        raise HTTPException(status_code=400, detail="FROM clause is required")

    rows = _scan_docs(parsed["source"])

    if parsed["where"]:
        rows = _apply_where(rows, parsed["where"])

    if parsed["sort"]:
        rows.sort(
            key=lambda r: str(r.get(parsed["sort"], "")),
            reverse=(parsed["order"] == "DESC"),
        )

    if parsed["limit"] is not None:
        rows = rows[:parsed["limit"]]

    if parsed["op"] == "TABLE" and parsed["fields"]:
        cols = parsed["fields"]
        result_rows = [{c: row.get(c) for c in cols} for row in rows]
        return {"type": "TABLE", "fields": cols, "rows": result_rows, "count": len(result_rows)}

    result_rows = [
        {"path": r.get("file.path", ""), "title": r.get("title", r.get("file.name", ""))}
        for r in rows
    ]
    return {"type": "LIST", "rows": result_rows, "count": len(result_rows)}
```

---

## Задача 3: Підключення роутера в `main.py`

**Файл для модифікації:** `/home/vokov/workspace/ai-drakon-setup/services/docs-agent/main.py`

Знайдіть блок імпорту роутерів (приблизно 20–25 рядки):
```python
from docs_route import router as docs_router
from notes_route import router as notes_router
from drakon_ir_route import router as drakon_ir_router
from projects_route import router as projects_router
```

Додайте один рядок **після** `from projects_route import router as projects_router`:
```python
from dataview_route import router as dataview_router
```

Знайдіть блок включення роутерів в додаток (приблизно 40–45 рядки):
```python
app.include_router(docs_router)
app.include_router(notes_router)
app.include_router(drakon_ir_router)
app.include_router(projects_router)
```

Додайте один рядок після `app.include_router(projects_router)`:
```python
app.include_router(dataview_router)
```

---

## Задача 4: Виправлення REPO_ROOT у скрипті ініціалізації

**Файл для модифікації:** `/etc/init.d/ai-docs-agent` на сервері (потребує прав sudo)

Поточний рядок:
```
environment="REPO_ROOT=/home/vokov/workspace/sharon-global PROXY_URL=http://localhost:8082 PROXY_TOKEN=freecc PROXY_MODEL=claude-haiku-4-5 PROXY_PROTOCOL=anthropic"
```

Змініть `sharon-global` на `ai-drakon-scaffolder`:
```
environment="REPO_ROOT=/home/vokov/workspace/ai-drakon-scaffolder PROXY_URL=http://localhost:8082 PROXY_TOKEN=freecc PROXY_MODEL=claude-haiku-4-5 PROXY_PROTOCOL=anthropic"
```

Команда SSH:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "sudo sed -i 's|REPO_ROOT=/home/vokov/workspace/sharon-global|REPO_ROOT=/home/vokov/workspace/ai-drakon-scaffolder|g' /etc/init.d/ai-docs-agent"
```

Перевірте зміни:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "grep REPO_ROOT /etc/init.d/ai-docs-agent"
```
Очікуваний вивід має містити `ai-drakon-scaffolder`.

---

## Задача 5: Commit та push до репозиторію ai-drakon-setup

На сервері розробки:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  cd /home/vokov/workspace/ai-drakon-setup &&
  git add services/docs-agent/dataview_route.py services/docs-agent/main.py &&
  git commit -m 'feat(docs-agent): add /docs/dataview/query DQL endpoint' &&
  git push
"
```

---

## Задача 6: Перезапуск сервісу ai-docs-agent

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "sudo rc-service ai-docs-agent restart"
```

Зачекайте 3 секунди, а потім перевірте стан здоров'я (health check):
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "curl -s http://localhost:8767/health"
```
Має повернути: `{"status":"ok","service":"docs-agent","port":8767}`

---

## Задача 7: Верифікація кінцевої точки

```bash
curl -s -X POST http://192.168.3.184:8767/docs/dataview/query \
  -H "Content-Type: application/json" \
  -d '{"query": "LIST FROM \"docs\" LIMIT 3"}'
```
Очікується: JSON з полями `{"type":"LIST","rows":[...],"count":3}`, де рядки мають параметри `path` та `title`.

Другий тест — табличний запит:
```bash
curl -s -X POST http://192.168.3.184:8767/docs/dataview/query \
  -H "Content-Type: application/json" \
  -d '{"query": "TABLE title, type, status FROM \"docs\" WHERE file.name != \"INDEX\" SORT type ASC LIMIT 5"}'
```
Очікується: `{"type":"TABLE","fields":["title","type","status"],"rows":[...],"count":5}`

---

## Задача 8: Індексація нової кінцевої точки в MemPalace

Після успішної перевірки проіндексуйте нову кінцеву точку в зоні (wing) `ai-drakon` в MemPalace:

```
Wing: ai-drakon
Room: source-services
Drawer: dataview-dql-endpoint
Content: POST /docs/dataview/query — DQL query over docs YAML frontmatter.
  Supported: LIST/TABLE FROM "path"|#tag WHERE field="val"|field!="val" SORT field ASC|DESC LIMIT N.
  File: services/docs-agent/dataview_route.py
  Wired via: main.py → app.include_router(dataview_router)
  REPO_ROOT resolves to: /home/vokov/workspace/ai-drakon-scaffolder
```

---

## Контрольний список (Checklist)

- [ ] `dataview_route.py` створено на сервері.
- [ ] `main.py` імпортує та включає `dataview_router`.
- [ ] `/etc/init.d/ai-docs-agent` містить REPO_ROOT = `ai-drakon-scaffolder`.
- [ ] Виконано `git commit + push` до репозиторію `ai-drakon-setup`.
- [ ] Сервіс `ai-docs-agent` успішно перезапущено + стан здоров'я OK.
- [ ] `POST /docs/dataview/query` успішно повертає валідний JSON.
- [ ] Оновлено шухляду (drawer) в MemPalace.

---

## Семантичні зв'язки

**Цей документ є частиною:** [[agents/agy/_INDEX]]
**Цей документ пов'язаний з:**
- [[01-docs-agent/SKILL]] — навичка роботи з документацією
- [[agents/agy/02-repo-analyzer/SKILL]] — навичка аналізу репозиторію