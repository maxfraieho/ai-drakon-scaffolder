import sqlite3
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/kb", tags=["kb"])

DB_PATH = Path(__file__).parent / "kb.db"


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS contributions (
            id TEXT PRIMARY KEY,
            timestamp INTEGER NOT NULL,
            language TEXT NOT NULL DEFAULT 'python',
            description TEXT NOT NULL DEFAULT '',
            code TEXT NOT NULL,
            ir_yaml TEXT NOT NULL,
            job_id TEXT,
            tags TEXT NOT NULL DEFAULT ''
        )
    """)
    conn.commit()
    return conn


class ContributeRequest(BaseModel):
    code: str
    ir_yaml: str
    language: Optional[str] = "python"
    description: Optional[str] = ""
    job_id: Optional[str] = None
    tags: Optional[str] = ""


class ContributeResponse(BaseModel):
    id: str
    timestamp: int


@router.post("/contribute", response_model=ContributeResponse)
def kb_contribute(req: ContributeRequest):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="code is required")
    if not req.ir_yaml.strip():
        raise HTTPException(status_code=400, detail="ir_yaml is required")

    entry_id = str(uuid.uuid4())
    ts = int(time.time())

    conn = _get_db()
    try:
        conn.execute(
            """INSERT INTO contributions (id, timestamp, language, description, code, ir_yaml, job_id, tags)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (entry_id, ts, req.language or "python", req.description or "",
             req.code, req.ir_yaml, req.job_id, req.tags or ""),
        )
        conn.commit()
    finally:
        conn.close()

    return ContributeResponse(id=entry_id, timestamp=ts)


@router.get("/list")
def kb_list(limit: int = 20, offset: int = 0):
    conn = _get_db()
    try:
        rows = conn.execute(
            """SELECT id, timestamp, language, description, job_id, tags,
                      length(code) as code_len
               FROM contributions
               ORDER BY timestamp DESC
               LIMIT ? OFFSET ?""",
            (min(limit, 100), offset),
        ).fetchall()
        total = conn.execute("SELECT COUNT(*) FROM contributions").fetchone()[0]
    finally:
        conn.close()

    return {
        "total": total,
        "items": [dict(r) for r in rows],
    }


@router.get("/get/{entry_id}")
def kb_get(entry_id: str):
    conn = _get_db()
    try:
        row = conn.execute(
            "SELECT * FROM contributions WHERE id = ?", (entry_id,)
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return dict(row)


@router.delete("/delete/{entry_id}")
def kb_delete(entry_id: str):
    conn = _get_db()
    try:
        cur = conn.execute("DELETE FROM contributions WHERE id = ?", (entry_id,))
        conn.commit()
        deleted = cur.rowcount
    finally:
        conn.close()

    if not deleted:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": entry_id}
