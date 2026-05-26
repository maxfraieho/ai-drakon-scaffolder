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
