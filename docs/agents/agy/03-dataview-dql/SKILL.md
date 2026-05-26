---
title: "AGY Skill 03 — Dataview DQL endpoint + REPO_ROOT fix"
type: guide
tags: [agy, docs-agent, dataview, dql, fix]
status: active
created: 2026-05-26
updated: 2026-05-26
---

# AGY Skill 03 — Docs-agent: Dataview DQL endpoint + REPO_ROOT fix

> **One-time implementation task.** Pull `ai-drakon-setup`, implement `/docs/dataview/query`, fix `REPO_ROOT` in init script, commit+push, restart service.

---

## Context

`docs-agent` (FastAPI :8767, dev server `192.168.3.184`) exposes docs via two endpoints:
- `GET /docs/list` — file tree
- `GET /docs/read` — read one file

The Cloudflare Worker tool `docs.query` calls `POST /docs/dataview/query` — but **this endpoint does not exist** yet (returns 404).

Additionally, the OpenRC service `/etc/init.d/ai-docs-agent` has:
```
environment="REPO_ROOT=/home/vokov/workspace/sharon-global ..."
```
This is **wrong** — docs live in `/home/vokov/workspace/ai-drakon-scaffolder/docs/`. Must be fixed to `REPO_ROOT=/home/vokov/workspace/ai-drakon-scaffolder`.

---

## Repositories

| Repo | Path on dev server | GitHub |
|------|--------------------|--------|
| `ai-drakon-setup` (backend services) | `/home/vokov/workspace/ai-drakon-setup/` | `https://github.com/maxfraieho/ai-drakon-setup.git` |
| `ai-drakon-scaffolder` (frontend + docs) | `/home/vokov/workspace/ai-drakon-scaffolder/` | `https://github.com/maxfraieho/ai-drakon-scaffolder.git` |

Dev server SSH: `sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184`

---

## Task 1: Pull ai-drakon-setup on dev server

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cd /home/vokov/workspace/ai-drakon-setup && git pull"
```

---

## Task 2: Create `dataview_route.py`

**File to create:** `/home/vokov/workspace/ai-drakon-setup/services/docs-agent/dataview_route.py`

Write this file **exactly** (scp or heredoc via SSH):

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

## Task 3: Wire router into `main.py`

**File to modify:** `/home/vokov/workspace/ai-drakon-setup/services/docs-agent/main.py`

Find the block that imports routers (around line 20–25):
```python
from docs_route import router as docs_router
from notes_route import router as notes_router
from drakon_ir_route import router as drakon_ir_router
from projects_route import router as projects_router
```

Add one line **after** `from projects_route import router as projects_router`:
```python
from dataview_route import router as dataview_router
```

Find the block that includes routers (around line 40–45):
```python
app.include_router(docs_router)
app.include_router(notes_router)
app.include_router(drakon_ir_router)
app.include_router(projects_router)
```

Add one line after `app.include_router(projects_router)`:
```python
app.include_router(dataview_router)
```

---

## Task 4: Fix REPO_ROOT in init script

**File to modify:** `/etc/init.d/ai-docs-agent` on dev server (requires sudo)

Current line:
```
environment="REPO_ROOT=/home/vokov/workspace/sharon-global PROXY_URL=http://localhost:8082 PROXY_TOKEN=freecc PROXY_MODEL=claude-haiku-4-5 PROXY_PROTOCOL=anthropic"
```

Change `sharon-global` to `ai-drakon-scaffolder`:
```
environment="REPO_ROOT=/home/vokov/workspace/ai-drakon-scaffolder PROXY_URL=http://localhost:8082 PROXY_TOKEN=freecc PROXY_MODEL=claude-haiku-4-5 PROXY_PROTOCOL=anthropic"
```

SSH command:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "sudo sed -i 's|REPO_ROOT=/home/vokov/workspace/sharon-global|REPO_ROOT=/home/vokov/workspace/ai-drakon-scaffolder|g' /etc/init.d/ai-docs-agent"
```

Verify the change:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "grep REPO_ROOT /etc/init.d/ai-docs-agent"
```
Expected output must contain `ai-drakon-scaffolder`.

---

## Task 5: Commit and push to ai-drakon-setup

On dev server:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  cd /home/vokov/workspace/ai-drakon-setup &&
  git add services/docs-agent/dataview_route.py services/docs-agent/main.py &&
  git commit -m 'feat(docs-agent): add /docs/dataview/query DQL endpoint' &&
  git push
"
```

---

## Task 6: Restart ai-docs-agent service

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "sudo rc-service ai-docs-agent restart"
```

Wait 3 seconds, then check health:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "curl -s http://localhost:8767/health"
```
Expected: `{"status":"ok","service":"docs-agent","port":8767}`

---

## Task 7: Verify endpoint

```bash
curl -s -X POST http://192.168.3.184:8767/docs/dataview/query \
  -H "Content-Type: application/json" \
  -d '{"query": "LIST FROM \"docs\" LIMIT 3"}'
```

Expected: JSON with `{"type":"LIST","rows":[...],"count":3}` where rows have `path` and `title`.

Second test — TABLE query:
```bash
curl -s -X POST http://192.168.3.184:8767/docs/dataview/query \
  -H "Content-Type: application/json" \
  -d '{"query": "TABLE title, type, status FROM \"docs\" WHERE file.name != \"INDEX\" SORT type ASC LIMIT 5"}'
```

Expected: `{"type":"TABLE","fields":["title","type","status"],"rows":[...],"count":5}`

---

## Task 8: Index new endpoint in MemPalace

After successful verification, index the new endpoint in MemPalace wing `ai-drakon`:

```
Wing: ai-drakon
Room: source-services  (або source-worker якщо room вже є)
Drawer: dataview-dql-endpoint
Content: POST /docs/dataview/query — DQL query over docs YAML frontmatter.
  Supported: LIST/TABLE FROM "path"|#tag WHERE field="val"|field!="val" SORT field ASC|DESC LIMIT N.
  File: services/docs-agent/dataview_route.py
  Wired via: main.py → app.include_router(dataview_router)
  REPO_ROOT resolves to: /home/vokov/workspace/ai-drakon-scaffolder
```

---

## Checklist

- [ ] `dataview_route.py` created on dev server
- [ ] `main.py` imports + includes `dataview_router`
- [ ] `/etc/init.d/ai-docs-agent` REPO_ROOT = `ai-drakon-scaffolder`
- [ ] `git commit + push` to `ai-drakon-setup`
- [ ] `ai-docs-agent` service restarted + health OK
- [ ] `POST /docs/dataview/query` returns valid JSON (not 404)
- [ ] MemPalace drawer updated
