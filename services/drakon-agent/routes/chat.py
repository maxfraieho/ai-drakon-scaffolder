"""drakon-agent /chat и /analyze_folder routes."""
import glob
import os
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

PROXY_URL = os.getenv("PROXY_URL", "http://localhost:18880/v1")
PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc")
PROXY_MODEL = os.getenv("PROXY_MODEL", "agent-proxy")

# Project root for folder analysis (server-side path)
REPO_ROOT = os.getenv(
    "REPO_ROOT",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
)

DRAKON_CHAT_SYSTEM = """Ти — DRAKON-агент, спеціаліст з аналізу Python-коду та генерації DRAKON-схем.

**Відповідай завжди УКРАЇНСЬКОЮ мовою.**

Твої можливості:
- Аналізую Python-функції та генерую DRAKON IR (схеми потоку виконання)
- Аналізую цілу папку Python-файлів за командою
- Вчуся на зворотному зв'язку — надсилай виправлення через кнопку "Зворотний зв'язок"
- Зберігаю бази знань про DRAKON-правила та типові патерни

Доступні папки проекту для аналізу:
- services/drakon-agent/ — сам агент (Python)
- services/architect-agent/ — архітектор (Python)
- services/docs-agent/ — документознавець (Python)
- cloudflare-worker/ — Cloudflare Worker (JavaScript)

Як мене використовувати:
1. Надішли Python-функцію → отримаєш DRAKON-схему
2. Напиши "аналізуй папку services/drakon-agent" → проаналізую всі .py файли
3. Постав питання про DRAKON або схеми → відповім

Якщо питання про проект загалом — зверни до Архітектора. Якщо потрібна документація — до Документознавця.
"""


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


class AnalyzeFolderRequest(BaseModel):
    folder_path: str
    max_files: int = 20
    refine: bool = True


@router.post("/chat")
def chat(req: ChatRequest):
    messages = [
        {"role": "system", "content": DRAKON_CHAT_SYSTEM},
        {"role": "user", "content": req.message},
    ]
    try:
        resp = httpx.post(
            f"{PROXY_URL}/chat/completions",
            json={"model": PROXY_MODEL, "messages": messages, "temperature": 0.3},
            headers={"Authorization": f"Bearer {PROXY_TOKEN}"},
            timeout=60.0,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return {"reply": content}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/analyze_folder")
def analyze_folder(req: AnalyzeFolderRequest):
    # Resolve path relative to REPO_ROOT for safety
    target = Path(REPO_ROOT) / req.folder_path
    if not target.exists() or not target.is_dir():
        raise HTTPException(status_code=404, detail=f"Folder not found: {req.folder_path}")

    py_files = sorted(target.rglob("*.py"))
    py_files = [f for f in py_files if "__pycache__" not in str(f)][:req.max_files]

    if not py_files:
        return {"diagrams": [], "summary": "Папка не містить Python-файлів.", "analyzed": 0}

    # Import analyze function from existing analyze route
    try:
        from routes.analyze import analyze_code
    except ImportError:
        raise HTTPException(status_code=500, detail="analyze_code not available")

    results = []
    errors = []
    for fpath in py_files:
        rel = fpath.relative_to(Path(REPO_ROOT))
        try:
            code = fpath.read_text(encoding="utf-8")
            result = analyze_code(code, filename=str(rel), refine=req.refine)
            if result.get("diagrams"):
                results.extend(result["diagrams"])
        except Exception as e:
            errors.append({"file": str(rel), "error": str(e)})

    return {
        "diagrams": results,
        "analyzed": len(py_files),
        "files": [str(f.relative_to(Path(REPO_ROOT))) for f in py_files],
        "errors": errors,
        "summary": f"Проаналізовано {len(py_files)} файлів, отримано {len(results)} схем.",
    }
