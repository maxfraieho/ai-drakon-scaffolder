import os
import subprocess
import sys
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

load_dotenv()

_DRAKON_AGENT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "drakon-agent"))
if _DRAKON_AGENT not in sys.path:
    sys.path.append(_DRAKON_AGENT)

from memory_manager import ensure_agent_memory, save_memory, get_memory, list_memory
from ai_chat.docs_chat import docs_chat
from docs_route import router as docs_router
from notes_route import router as notes_router
from drakon_ir_route import router as drakon_ir_router
from projects_route import router as projects_router
from dataview_route import router as dataview_router
from gitnexus_route import router as gitnexus_router

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
app.include_router(docs_router)
app.include_router(notes_router)
app.include_router(drakon_ir_router)
app.include_router(projects_router)
app.include_router(dataview_router)
app.include_router(gitnexus_router)


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


class MemorySaveRequest(BaseModel):
    file: str
    content: str
    commit_msg: str


class DocumentRequest(BaseModel):
    module_name: str
    code: str
    slug: Optional[str] = None
    project: Optional[str] = "uav-watcher"
    tags: Optional[List[str]] = None


class AgentSettingsRequest(BaseModel):
    repo_root: Optional[str] = None
    proxy_model: Optional[str] = None
    proxy_protocol: Optional[str] = None


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


@app.get("/settings")
def get_settings():
    """Return current agent runtime settings."""
    from ai_chat.docs_chat import PROXY_URL, PROXY_MODEL, PROXY_PROTOCOL
    return {
        "repo_root": os.getenv("REPO_ROOT", ""),
        "proxy_url": PROXY_URL,
        "proxy_model": PROXY_MODEL,
        "proxy_protocol": PROXY_PROTOCOL,
        "agent": AGENT_NAME,
    }


@app.post("/document")
def document_module(req: DocumentRequest):
    """Generate module documentation and save to docs/ with git commit."""
    from ai_chat.docs_chat import PROXY_URL, PROXY_MODEL

    REPO_ROOT_path = Path(os.getenv("REPO_ROOT", ""))
    DOCS_ROOT = REPO_ROOT_path / "docs"

    slug = req.slug or f"modules/{req.module_name}"
    tag_list = req.tags or ["module", req.project or "uav-watcher"]
    tags_str = ", ".join(tag_list)

    message = (
        f"Задокументуй модуль `{req.module_name}` проекту {req.project}.\n\n"
        f"Напиши документ у форматі Obsidian Markdown. УВАГА: НЕ обгортай відповідь у ```markdown або ```yaml блоки. Починай відразу з --- frontmatter. З YAML frontmatter:\n"
        f"```yaml\n---\ntitle: <назва модуля>\ntype: module\nmodule: {req.module_name}\n"
        f"project: {req.project}\ntags: [{tags_str}]\nrelated: []\ncreated: {date.today().isoformat()}\n"
        f"status: documented\n---\n```\n\n"
        f"Секції документу (УКРАЇНСЬКОЮ):\n"
        f"## Призначення\n## Архітектура\n## Ключові функції\n## Потік виконання\n## Залежності\n\n"
        f"Код модуля:\n```python\n{req.code[:5000]}\n```"
    )

    memory_context = ""
    try:
        memory_context = get_memory(AGENT_NAME, "MEMORY.md") or ""
    except Exception:
        pass

    try:
        result = docs_chat(message, memory_context=memory_context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    content = result.get("reply", "")
    if not content:
        raise HTTPException(status_code=502, detail="Empty reply from LLM")

    # Save file
    DOCS_ROOT.mkdir(parents=True, exist_ok=True)
    clean_slug = slug.lstrip("/").replace("..", "").replace("\\", "/")
    if not clean_slug.endswith(".md"):
        clean_slug += ".md"
    out_path = DOCS_ROOT / clean_slug
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(content, encoding="utf-8")

    # Git commit + push
    rel_path = f"docs/{clean_slug}"
    git_ok, git_err = _git_save(REPO_ROOT_path, rel_path, f"docs: document module {req.module_name}")

    return {
        "success": True,
        "slug": slug,
        "path": rel_path,
        "git_ok": git_ok,
        "git_error": git_err if not git_ok else None,
        "preview": content[:500],
    }


def _git_save(repo_root: Path, rel_path: str, message: str) -> tuple:
    """git add + commit + push. Returns (ok, error_msg)."""
    try:
        subprocess.run(
            ["git", "-C", str(repo_root), "pull", "--rebase", "--autostash", "-q"],
            check=True, capture_output=True, timeout=30
        )
        subprocess.run(
            ["git", "-C", str(repo_root), "add", rel_path],
            check=True, capture_output=True, timeout=10
        )
        r = subprocess.run(
            ["git", "-C", str(repo_root), "commit", "-m", message],
            capture_output=True, timeout=10
        )
        if r.returncode not in (0, 1):
            return False, r.stderr.decode()
        subprocess.run(
            ["git", "-C", str(repo_root), "push", "-q"],
            check=True, capture_output=True, timeout=30
        )
        return True, ""
    except subprocess.CalledProcessError as e:
        return False, (e.stderr.decode() if e.stderr else str(e))
    except subprocess.TimeoutExpired:
        return False, "git timeout"


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
