"""architect-agent /files/list and /files/read endpoints."""
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/files", tags=["files"])

REPO_ROOT = Path(os.getenv(
    "REPO_ROOT",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
))

# Extensions that are safe to read
_TEXT_EXTS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md",
    ".yml", ".yaml", ".toml", ".env.example", ".txt", ".sh",
}

_SKIP_DIRS = {"__pycache__", ".git", "node_modules", ".venv", "dist", "build"}


@router.get("/list")
def list_files(path: str = Query(default=".", description="Relative path inside project")):
    target = (REPO_ROOT / path).resolve()
    if not str(target).startswith(str(REPO_ROOT)):
        raise HTTPException(status_code=403, detail="Path outside project root")
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Path not found: {path}")

    entries = []
    if target.is_file():
        entries.append({"path": str(target.relative_to(REPO_ROOT)), "type": "file", "size": target.stat().st_size})
    else:
        for item in sorted(target.iterdir()):
            if item.name.startswith(".") and item.name not in {".env.example"}:
                continue
            if item.name in _SKIP_DIRS:
                continue
            entry = {
                "path": str(item.relative_to(REPO_ROOT)),
                "type": "dir" if item.is_dir() else "file",
            }
            if item.is_file():
                entry["size"] = item.stat().st_size
                entry["readable"] = item.suffix in _TEXT_EXTS
            entries.append(entry)

    return {"root": str(REPO_ROOT), "path": path, "entries": entries}


@router.get("/read")
def read_file(
    path: str = Query(..., description="Relative file path inside project"),
    max_chars: int = Query(default=8000, description="Max chars to return"),
):
    target = (REPO_ROOT / path).resolve()
    if not str(target).startswith(str(REPO_ROOT)):
        raise HTTPException(status_code=403, detail="Path outside project root")
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    if not target.is_file():
        raise HTTPException(status_code=400, detail="Path is a directory, use /files/list")
    if target.suffix not in _TEXT_EXTS and target.name not in {".env.example"}:
        raise HTTPException(status_code=415, detail=f"File type not readable: {target.suffix}")

    try:
        content = target.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        content = target.read_text(encoding="latin-1")

    truncated = len(content) > max_chars
    return {
        "path": path,
        "content": content[:max_chars],
        "size": len(content),
        "truncated": truncated,
    }
