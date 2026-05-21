import json
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/drakon-ir", tags=["drakon-ir"])

REPO_ROOT = Path(os.getenv("REPO_ROOT", ""))


def _ir_dir() -> Path:
    return REPO_ROOT / "docs" / "drakon-ir"


@router.get("/list")
def list_ir():
    ir_dir = _ir_dir()
    if not ir_dir.exists():
        return {"success": True, "diagrams": [], "folder": str(ir_dir)}
    diagrams = sorted(f.stem for f in ir_dir.glob("*.json"))
    return {"success": True, "diagrams": diagrams, "count": len(diagrams)}


@router.get("/get")
def get_ir(name: str = Query(..., description="Diagram name (without .json)")):
    name_clean = name.replace("..", "").replace("/", "").replace("\\", "")
    path = _ir_dir() / f"{name_clean}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"DRAKON IR not found: {name}")
    try:
        diagram = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON: {e}")
    return {"success": True, "name": name_clean, "diagram": diagram}
