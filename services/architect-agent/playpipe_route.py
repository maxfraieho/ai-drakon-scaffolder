import json
import re
import time
import uuid
import asyncio
from typing import AsyncGenerator, List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ai_chat.architect_chat import architect_chat

router = APIRouter(prefix="/architect")

# In-memory execution sessions
BUILD_STORE: dict[str, dict] = {}


class DecomposeRequest(BaseModel):
    appDescription: str


class ComponentItem(BaseModel):
    name: str
    description: str
    agentId: Optional[str] = None


class BuildParallelRequest(BaseModel):
    components: List[ComponentItem]


class RetryRequest(BaseModel):
    componentId: str


def extract_json_from_text(text: str) -> dict:
    m = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if m:
        return json.loads(m.group(1).strip())
    m = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if m:
        return json.loads(m.group(1).strip())
    return json.loads(text.strip())


@router.post("/decompose")
async def decompose_app(body: DecomposeRequest):
    try:
        prompt = (
            "Decompose this app into 3-7 independent components for parallel AI agent development. "
            "Return JSON only: {\"components\": [{\"name\": str, \"description\": str}]}"
        )
        message = f"App Description:\n{body.appDescription}\n\nTask: {prompt}"

        # Call architect_chat
        res = architect_chat(message=message)
        reply = res.get("reply", "")

        try:
            parsed = extract_json_from_text(reply)
            components = parsed.get("components", [])
            return {"success": True, "components": components}
        except Exception as parse_err:
            return {
                "success": False,
                "error": f"Failed to parse JSON response from LLM: {parse_err}. Reply was: {reply}"
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _run_parallel_build(build_id: str):
    session = BUILD_STORE[build_id]
    components = session["components"]

    async def _build_single(comp: dict):
        comp_id = comp["id"]
        
        # 1. Start building
        comp["status"] = "building"
        session["events"].append({
            "action": "status_update",
            "componentId": comp_id,
            "status": "building",
            "component": comp
        })

        # Mock delay for compilation: between 2 and 5 seconds
        import random
        await asyncio.sleep(random.uniform(2.0, 5.0))

        if session["status"] == "stopped":
            comp["status"] = "stopped"
            session["events"].append({
                "action": "status_update",
                "componentId": comp_id,
                "status": "stopped",
                "component": comp
            })
            return

        # 2. Complete successfully
        comp["status"] = "success"
        session["events"].append({
            "action": "status_update",
            "componentId": comp_id,
            "status": "success",
            "component": comp
        })

    tasks = [_build_single(c) for c in components]
    await asyncio.gather(*tasks)

    if session["status"] != "stopped":
        session["status"] = "done"
        session["events"].append({
            "action": "build_complete_global"
        })


@router.post("/build-parallel")
async def build_parallel(body: BuildParallelRequest):
    build_id = f"build-{int(time.time())}-{uuid.uuid4().hex[:6]}"

    components = []
    for idx, c in enumerate(body.components):
        components.append({
            "id": f"comp-{idx}-{uuid.uuid4().hex[:4]}",
            "name": c.name,
            "description": c.description,
            "agentId": c.agentId,
            "status": "pending"
        })

    BUILD_STORE[build_id] = {
        "status": "running",
        "components": components,
        "events": [],
    }

    asyncio.create_task(_run_parallel_build(build_id))

    return {"success": True, "buildId": build_id}


@router.get("/playpipe/build/{buildId}/stream")
async def stream_build(buildId: str):
    if buildId not in BUILD_STORE:
        async def empty_generator():
            yield f"data: {json.dumps({'action': 'error_halt', 'errorMessage': 'Build not found'}, ensure_ascii=False)}\n\n"
        return StreamingResponse(
            empty_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    async def event_generator() -> AsyncGenerator[str, None]:
        session = BUILD_STORE[buildId]

        # First emit initial states for components
        for comp in session["components"]:
            yield f"data: {json.dumps({'action': 'status_update', 'componentId': comp['id'], 'status': comp['status'], 'component': comp}, ensure_ascii=False)}\n\n"

        sent_idx = 0
        while True:
            events = session["events"]
            while sent_idx < len(events):
                ev = events[sent_idx]
                yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
                sent_idx += 1
            status = session["status"]
            if status in ("done", "stopped", "error"):
                break
            await asyncio.sleep(0.1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _retry_single_build(build_id: str, comp: dict):
    session = BUILD_STORE[build_id]
    comp_id = comp["id"]

    comp["status"] = "building"
    session["events"].append({
        "action": "status_update",
        "componentId": comp_id,
        "status": "building",
        "component": comp
    })

    await asyncio.sleep(3.0)

    if session["status"] == "stopped":
        comp["status"] = "stopped"
        session["events"].append({
            "action": "status_update",
            "componentId": comp_id,
            "status": "stopped",
            "component": comp
        })
        return

    comp["status"] = "success"
    session["events"].append({
        "action": "status_update",
        "componentId": comp_id,
        "status": "success",
        "component": comp
    })

    if all(c["status"] == "success" for c in session["components"]):
        session["status"] = "done"
        session["events"].append({
            "action": "build_complete_global"
        })


@router.post("/playpipe/build/{buildId}/retry")
async def retry_component(buildId: str, body: RetryRequest):
    if buildId not in BUILD_STORE:
        raise HTTPException(404, "Build not found")
    session = BUILD_STORE[buildId]
    comp = next((c for c in session["components"] if c["id"] == body.componentId), None)
    if not comp:
        raise HTTPException(404, "Component not found")

    if session["status"] in ("done", "stopped"):
        session["status"] = "running"
        asyncio.create_task(_retry_single_build(buildId, comp))
    elif session["status"] == "running":
        asyncio.create_task(_retry_single_build(buildId, comp))

    return {"success": True}


@router.post("/playpipe/build/{buildId}/stop")
async def stop_build(buildId: str):
    if buildId not in BUILD_STORE:
        raise HTTPException(404, "Build not found")
    BUILD_STORE[buildId]["status"] = "stopped"
    return {"success": True}
