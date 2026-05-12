"""POST /analyze — full pipeline: AST → raw IR → KB retrieval → AI refine → validate."""
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from analyzer.ast_analyzer import PythonAnalyzer
from knowledge_base.retrieval import init as kb_init, retrieve_text
from ai_refiner.refiner import refine_ir_safe
from validator.ir_validator import validate_ir

router = APIRouter()

_kb_ready = False

KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "knowledge")


def _ensure_kb():
    global _kb_ready
    if not _kb_ready:
        try:
            kb_init(KNOWLEDGE_DIR)
            _kb_ready = True
        except Exception:
            pass  # KB optional — degrade gracefully


class AnalyzeRequest(BaseModel):
    code: str
    filename: Optional[str] = "module.py"
    refine: bool = True


@router.post("/analyze")
def analyze(req: AnalyzeRequest):
    _ensure_kb()

    try:
        raw_diagrams = PythonAnalyzer().analyze(req.code, req.filename or "module.py")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    results = []
    for raw_ir in raw_diagrams:
        if "error" in raw_ir:
            results.append(raw_ir)
            continue

        kb_ctx = retrieve_text(
            f"{raw_ir.get('name','')} {raw_ir.get('params','')}", top_k=3
        )

        ir = refine_ir_safe(raw_ir, kb_ctx) if req.refine else raw_ir

        validation = validate_ir(ir)
        ir["_valid"] = validation.valid
        if validation.errors:
            ir["_errors"] = validation.errors
        if validation.warnings:
            ir["_warnings"] = validation.warnings

        results.append(ir)

    return {"filename": req.filename, "diagrams": results, "count": len(results)}
