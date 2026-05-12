import os
import sys
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

load_dotenv()

_DRAKON_AGENT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "drakon-agent"))
if _DRAKON_AGENT not in sys.path:
    sys.path.append(_DRAKON_AGENT)

from memory_manager import ensure_agent_memory, save_memory, get_memory, list_memory
from ai_chat.docs_chat import docs_chat

AGENT_NAME = os.getenv("AGENT_NAME", "docs")
PORT = int(os.getenv("PORT", "8767"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_agent_memory(AGENT_NAME)
    except Exception as exc:
        print(f"[warn] memory bootstrap failed: {exc}")
    yield


app = FastAPI(title="docs-agent", version="0.1.0", lifespan=lifespan)
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
    return {"status": "ok", "service": "docs-agent", "port": PORT}


@app.post("/chat")
def chat(req: ChatRequest):
    ctx = req.context or {}
    current_doc = ctx.get("currentDoc") or ctx.get("current_doc")
    file_tree = ctx.get("fileTree") or ctx.get("file_tree")

    memory_context = ""
    try:
        memory_context = get_memory(AGENT_NAME, "MEMORY.md") or ""
    except Exception:
        pass

    try:
        result = docs_chat(
            req.message,
            current_doc=current_doc,
            file_tree=file_tree,
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
