import os
import sys
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

load_dotenv()

# Add drakon-agent to path AFTER module-level imports so uvicorn doesn't shadow "main"
from files_route import router as files_router
_DRAKON_AGENT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "drakon-agent"))
if _DRAKON_AGENT not in sys.path:
    sys.path.append(_DRAKON_AGENT)

from memory_manager import ensure_agent_memory, save_memory, get_memory, list_memory
from ai_chat.architect_chat import architect_chat

AGENT_NAME = os.getenv("AGENT_NAME", "architect")
PORT = int(os.getenv("PORT", "8766"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_agent_memory(AGENT_NAME)
    except Exception as exc:
        print(f"[warn] memory bootstrap failed: {exc}")
    yield


app = FastAPI(title="architect-agent", version="0.1.0", lifespan=lifespan)
app.include_router(files_router)
from pipeline_route import router as pipeline_router
from kb_route import router as kb_router
app.include_router(pipeline_router)
app.include_router(kb_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


class MemorySaveRequest(BaseModel):
    file: str
    content: str
    commit_msg: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "architect-agent", "port": PORT}


@app.post("/chat")
def chat(req: ChatRequest):
    ctx = req.context or {}
    file_tree = ctx.get("fileTree") or ctx.get("file_tree")
    current_diagram = ctx.get("currentDiagram") or ctx.get("current_diagram")

    memory_context = ""
    try:
        memory_context = get_memory(AGENT_NAME, "MEMORY.md") or ""
    except Exception:
        pass

    try:
        result = architect_chat(
            req.message,
            file_tree=file_tree,
            current_diagram=current_diagram,
            memory_context=memory_context,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return result


@app.get("/memory/list")
def memory_list():
    return {"files": list_memory(AGENT_NAME)}


@app.get("/memory/get")
def memory_get(file: str):
    content = get_memory(AGENT_NAME, file)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    return {"file": file, "content": content}


@app.post("/memory/save")
def memory_save(req: MemorySaveRequest):
    result = save_memory(AGENT_NAME, req.file, req.content, req.commit_msg)
    if not result["success"]:
        raise HTTPException(status_code=500, detail="Failed to save to GitHub")
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
