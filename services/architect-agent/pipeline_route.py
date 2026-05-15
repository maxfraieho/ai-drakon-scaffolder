"""FastAPI router for /pipeline/* endpoints."""
import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from pipeline.graphs import analysis_graph, vibe_graph
from pipeline.states import AnalysisState, VibeCodingState
from pipeline.job_store import create_job, get_job, update_job

router = APIRouter(prefix="/pipeline")
_executor = ThreadPoolExecutor(max_workers=4)


class AnalyzeRequest(BaseModel):
    source_code: str
    file_path: str = "module.py"


class GenerateRequest(BaseModel):
    drakon_ir: dict
    description: str = ""
    language: str = "python"


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    job_id = create_job()
    update_job(job_id, "running")

    def run():
        try:
            initial: AnalysisState = {
                "source_code": req.source_code,
                "file_path": req.file_path,
                "cyclomatic_complexity": 0,
                "call_graph": {},
                "tree_level": "",
                "drakon_type": "",
                "behavioral_yaml": "",
                "drakon_ir": [],
                "validation_errors": [],
                "iteration_count": 0,
            }
            final = analysis_graph.invoke(initial)
            update_job(job_id, "done", result={
                "drakon_ir": final["drakon_ir"],
                "tree_level": final["tree_level"],
                "cyclomatic_complexity": final["cyclomatic_complexity"],
                "validation_errors": final["validation_errors"],
            })
        except Exception as e:
            update_job(job_id, "error", error=str(e))

    loop = asyncio.get_event_loop()
    loop.run_in_executor(_executor, run)
    return {"job_id": job_id}


@router.post("/generate")
async def generate(req: GenerateRequest):
    job_id = create_job()
    update_job(job_id, "running")

    def run():
        try:
            initial: VibeCodingState = {
                "drakon_ir": req.drakon_ir,
                "description": req.description,
                "language": req.language,
                "generated_code": "",
                "syntax_errors": [],
                "iteration_count": 0,
            }
            final = vibe_graph.invoke(initial)
            update_job(job_id, "done", result={
                "code": final["generated_code"],
                "language": final["language"],
                "syntax_errors": final["syntax_errors"],
                "iterations": final["iteration_count"],
            })
        except Exception as e:
            update_job(job_id, "error", error=str(e))

    loop = asyncio.get_event_loop()
    loop.run_in_executor(_executor, run)
    return {"job_id": job_id}


@router.get("/status/{job_id}")
def status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": job.job_id,
        "status": job.status,
        "result": job.result,
        "error": job.error,
    }
