"""CRUD + SSE execution for DRAKON-defined LangGraph pipelines."""
import json
import asyncio
import uuid
from pathlib import Path
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from pipeline.graph_loader import load_graph_from_ir

PIPELINES_DIR = Path(__file__).parent / "pipelines"
router = APIRouter(prefix="/graph-pipelines")

# In-memory execution sessions
_sessions: dict[str, dict] = {}


def _list_pipeline_files() -> list[dict]:
    if not PIPELINES_DIR.exists():
        return []
    result = []
    for f in sorted(PIPELINES_DIR.glob("*.drakon.json")):
        try:
            ir = json.loads(f.read_text())
            name = f.name.replace(".drakon.json", "")
            result.append({"name": name, "display_name": ir.get("name", name)})
        except Exception:
            pass
    return result


def _load_ir(name: str) -> dict:
    path = PIPELINES_DIR / f"{name}.drakon.json"
    if not path.exists():
        raise HTTPException(404, f"Pipeline '{name}' not found")
    return json.loads(path.read_text())


@router.get("")
def list_pipelines():
    return {"pipelines": _list_pipeline_files()}


@router.get("/{name}")
def get_pipeline(name: str):
    return _load_ir(name)


class PipelineIR(BaseModel):
    name: str
    items: dict
    schema_: dict = {}

    class Config:
        populate_by_name = True


@router.put("/{name}")
def update_pipeline(name: str, body: PipelineIR):
    path = PIPELINES_DIR / f"{name}.drakon.json"
    PIPELINES_DIR.mkdir(parents=True, exist_ok=True)
    data = {"name": body.name, "items": body.items, "schema": body.schema_}
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    try:
        load_graph_from_ir(data)
    except Exception as e:
        raise HTTPException(422, f"Graph compile error: {e}")
    return {"ok": True, "name": name}


class ExecuteRequest(BaseModel):
    initial_state: dict = {}
    breakpoints: list[str] = []


@router.post("/{name}/execute")
def start_execution(name: str, body: dict):
    _load_ir(name)  # validate exists
    job_id = str(uuid.uuid4())
    
    # Support both nested initial_state and direct root-level parameters
    initial_state = body.get("initial_state", {})
    if not initial_state:
        initial_state = {k: v for k, v in body.items() if k != "breakpoints"}
        
    breakpoints = body.get("breakpoints", [])
    if not isinstance(breakpoints, list):
        breakpoints = []

    _sessions[job_id] = {
        "status": "pending",
        "graph_name": name,
        "initial_state": initial_state,
        "breakpoints": set(breakpoints),
        "current_node": None,
        "current_state": {},
        "events": [],
        "resume_event": asyncio.Event(),
        "resume_state_override": None,
    }
    return {"job_id": job_id}


async def _run_pipeline(job_id: str) -> None:
    session = _sessions[job_id]
    name = session["graph_name"]
    try:
        ir = _load_ir(name)
        graph = load_graph_from_ir(ir)
        session["status"] = "running"
        initial = session["initial_state"]

        for step in graph.stream(initial):
            if not step:
                continue
            node_name = list(step.keys())[0]
            state_update = step[node_name]
            session["current_node"] = node_name
            session["current_state"].update(state_update)
            session["events"].append({
                "event": "node_done",
                "node": node_name,
                "state": dict(session["current_state"]),
            })

            if node_name in session["breakpoints"]:
                session["status"] = "breakpoint"
                session["events"].append({
                    "event": "breakpoint",
                    "node": node_name,
                    "state": dict(session["current_state"]),
                })
                await session["resume_event"].wait()
                session["resume_event"].clear()
                if session["resume_state_override"]:
                    session["current_state"].update(session["resume_state_override"])
                    session["resume_state_override"] = None
                session["status"] = "running"

        session["status"] = "done"
        session["events"].append({"event": "done", "node": None, "state": dict(session["current_state"])})

    except Exception as e:
        session["status"] = "error"
        session["events"].append({"event": "error", "node": None, "error": str(e)})


@router.get("/{name}/execute/{job_id}/stream")
async def stream_execution(name: str, job_id: str):
    if job_id not in _sessions:
        raise HTTPException(404, "Job not found")

    async def event_generator() -> AsyncGenerator[str, None]:
        asyncio.create_task(_run_pipeline(job_id))
        sent_idx = 0
        while True:
            events = _sessions[job_id]["events"]
            while sent_idx < len(events):
                ev = events[sent_idx]
                yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
                sent_idx += 1
            status = _sessions[job_id]["status"]
            if status in ("done", "error"):
                break
            await asyncio.sleep(0.05)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class ResumeRequest(BaseModel):
    state_override: dict = {}


@router.post("/{name}/execute/{job_id}/resume")
async def resume_execution(name: str, job_id: str, body: ResumeRequest):
    if job_id not in _sessions:
        raise HTTPException(404, "Job not found")
    session = _sessions[job_id]
    if session["status"] != "breakpoint":
        raise HTTPException(400, "Job is not at a breakpoint")
    session["resume_state_override"] = body.state_override or None
    session["resume_event"].set()
    return {"ok": True}


@router.get("/{name}/execute/{job_id}/state")
def get_job_state(name: str, job_id: str):
    if job_id not in _sessions:
        raise HTTPException(404, "Job not found")
    s = _sessions[job_id]
    return {
        "job_id": job_id,
        "status": s["status"],
        "current_node": s["current_node"],
        "state": s["current_state"],
    }
