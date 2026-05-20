"""Serves DRAKON IR JSON files from the active project's docs/drakon-ir/ folder."""
import json
from typing import Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/drakon-ir", tags=["drakon-ir"])


def _ir_dir(project: Optional[str]) -> Path:
    from projects_route import resolve_project_root
    return resolve_project_root(project) / "docs" / "drakon-ir"


@router.get("/list")
def list_ir(project: Optional[str] = Query(None)):
    ir_dir = _ir_dir(project)
    if not ir_dir.exists():
        return {"success": True, "diagrams": [], "count": 0, "folder": str(ir_dir)}
    diagrams = sorted(f.stem for f in ir_dir.glob("*.json"))
    return {"success": True, "diagrams": diagrams, "count": len(diagrams)}


@router.get("/get")
def get_ir(name: str = Query(...), project: Optional[str] = Query(None)):
    name_clean = name.replace("..", "").replace("/", "").replace("\\", "")
    path = _ir_dir(project) / f"{name_clean}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"DRAKON IR not found: {name}")
    return {"success": True, "name": name_clean, "diagram": json.loads(path.read_text())}
