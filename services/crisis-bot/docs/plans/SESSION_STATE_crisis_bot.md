# Crisis-Bot — Session State & Handoff
# =====================================
# Цей файл дозволяє іншому Claude (з іншого акаунта) продовжити роботу з точного місця.
# Оновлено: 2026-05-17

## МЕТА ПРОЕКТУ

Створити `services/crisis-bot/` — FastAPI мікросервіс (порт 8770) з:
- BM25 knowledge base що **авто-індексує** `.md` файли з папки `knowledge/`
- watchdog: нові/змінені файли → авто-реіндекс без рестарту
- LangGraph StateGraph: retrieve_kb → generate (з conversation memory per session_id)
- Endpoints: `/chat`, `/kb/sections`, `/kb/search`, `/health`

---

## ДОСТУП ДО СЕРВЕРА

```
Host:     192.168.3.184 (Alpine Linux dev server)
User:     vokov
Password: 805235io.   ← КРАПКА В КІНЦІ! Обовʼязково.
SSH:      sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
SCP:      sshpass -p '805235io.' scp -o StrictHostKeyChecking=no <local> vokov@192.168.3.184:<remote>
```

---

## РЕПОЗИТОРІЙ

```
Remote repo: https://github.com/maxfraieho/ai-drakon-setup
Local path on server: /home/vokov/workspace/ai-drakon-setup/
Service path: /home/vokov/workspace/ai-drakon-setup/services/crisis-bot/
Plan on server: services/crisis-bot/docs/plans/2026-05-17-crisis-bot-langgraph.md
```

---

## СТАТУС ВИКОНАННЯ

| Task | Опис | Статус | Git SHA |
|------|------|--------|---------|
| Task 1 | Scaffold: dir structure, pyproject.toml, .env.example, knowledge/00-crisis-base.md | ✅ DONE | `9284c45` |
| Task 2 | knowledge_base/: ingest.py, retrieval.py, watcher.py + tests (3/3 pass) | ✅ DONE | `b741a73` |
| Task 3 | pipeline/: states.py, nodes.py, graph.py + tests | ⏳ NEXT | — |
| Task 4 | main.py: FastAPI app, lifespan KB init + watchdog | ⏳ pending | — |
| Task 5 | Wire web_config.py /api/chat → crisis-bot (optional) | ⏳ optional | — |

**Поточна HEAD:** `b741a73`

---

## СТРУКТУРА ФАЙЛІВ (що вже є)

```
services/crisis-bot/
├── pyproject.toml              ✅ (hatchling, Python 3.11+, 8 deps)
├── .env.example                ✅
├── knowledge/
│   └── 00-crisis-base.md       ✅ (10 секцій кризових інструкцій UA)
├── memory/
│   └── .gitkeep                ✅
├── knowledge_base/
│   ├── __init__.py             ✅
│   ├── ingest.py               ✅ (BM25Plus, Кирилиця tokenizer, section splitter)
│   ├── retrieval.py            ✅ (singleton: init(), retrieve(), retrieve_text())
│   └── watcher.py              ✅ (watchdog Observer, auto-reindex on .md change)
├── pipeline/
│   └── __init__.py             ✅ (порожній)
├── tests/
│   ├── __init__.py             ✅
│   └── test_knowledge_base.py  ✅ (3/3 pass)
└── docs/plans/
    └── 2026-05-17-crisis-bot-langgraph.md  ✅
```

---

## TASK 3 — ЩО ТРЕБА ЗРОБИТИ (NEXT)

Створити LangGraph pipeline. Всі файли нижче — точний код для копіювання.

### `pipeline/states.py`
```python
from typing import TypedDict, Annotated
from langgraph.graph import add_messages


class CrisisState(TypedDict):
    messages: Annotated[list, add_messages]
    query: str
    kb_context: str
    reply: str
    session_id: str
```

### `pipeline/nodes.py`
```python
"""LangGraph nodes: retrieve_kb, generate."""
import os
import httpx
from .states import CrisisState

PROXY_URL   = os.getenv("PROXY_URL", "http://localhost:18880/v1")
PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc")
PROXY_MODEL = os.getenv("PROXY_MODEL", "docs-assistant-proxy")

SYSTEM_PROMPT = """Ти — кризовий консультант системи UAV Watcher.
Відповідай стисло, чітко, по пунктах. Використовуй надану базу знань.
Якщо питання не стосується безпеки — ввічливо поясни що ти спеціалізуєшся на кризових ситуаціях.
Відповідай УКРАЇНСЬКОЮ мовою."""


def _llm_call(messages: list[dict]) -> str:
    resp = httpx.post(
        f"{PROXY_URL}/chat/completions",
        json={"model": PROXY_MODEL, "messages": messages, "temperature": 0.15},
        headers={"Authorization": f"Bearer {PROXY_TOKEN}"},
        timeout=60.0,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def retrieve_kb(state: CrisisState) -> dict:
    from knowledge_base.retrieval import retrieve_text
    context = retrieve_text(state["query"], top_k=3)
    return {"kb_context": context}


def generate(state: CrisisState) -> dict:
    history = list(state.get("messages", []))
    user_content = state["query"]
    if state.get("kb_context"):
        user_content = f"[База знань]\n{state['kb_context']}\n\n[Запит]\n{state['query']}"

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history[-6:]:
        messages.append({"role": msg["type"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_content})

    reply = _llm_call(messages)
    return {
        "reply": reply,
        "messages": [
            {"type": "human", "content": state["query"]},
            {"type": "ai", "content": reply},
        ],
    }
```

### `pipeline/graph.py`
```python
"""LangGraph StateGraph for crisis bot."""
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from .states import CrisisState
from .nodes import retrieve_kb, generate


def build_graph():
    g = StateGraph(CrisisState)
    g.add_node("retrieve_kb", retrieve_kb)
    g.add_node("generate", generate)
    g.set_entry_point("retrieve_kb")
    g.add_edge("retrieve_kb", "generate")
    g.add_edge("generate", END)
    return g.compile(checkpointer=MemorySaver())


_graph = None

def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph
```

### `tests/test_pipeline.py`
```python
import pytest
import textwrap


def setup_kb(tmp_path):
    (tmp_path / "kb.md").write_text("## БПЛА\n\nВідійди від вікон.")
    from knowledge_base import retrieval
    retrieval.init(tmp_path)


def test_graph_returns_reply(tmp_path, monkeypatch):
    setup_kb(tmp_path)
    import pipeline.nodes as nodes
    monkeypatch.setattr(nodes, "_llm_call", lambda msgs: "Відійди від вікон — це важливо.")

    from pipeline.graph import build_graph
    graph = build_graph()
    result = graph.invoke(
        {"messages": [], "query": "що робити при бпла",
         "kb_context": "", "reply": "", "session_id": "test-1"},
        config={"configurable": {"thread_id": "test-1"}},
    )
    assert result.get("reply") == "Відійди від вікон — це важливо."


def test_kb_context_injected(tmp_path, monkeypatch):
    setup_kb(tmp_path)
    captured = {}
    import pipeline.nodes as nodes

    def fake_llm(msgs):
        captured["msgs"] = msgs
        return "ok"

    monkeypatch.setattr(nodes, "_llm_call", fake_llm)
    from pipeline.graph import build_graph
    graph = build_graph()
    graph.invoke(
        {"messages": [], "query": "бпла", "kb_context": "", "reply": "", "session_id": "t2"},
        config={"configurable": {"thread_id": "t2"}},
    )
    user_msg = captured["msgs"][-1]["content"]
    assert "База знань" in user_msg
    assert "БПЛА" in user_msg
```

### Команди для Task 3 на сервері:
```bash
# Створити файли (через scp з локального або heredoc)
# Запустити тести:
cd /home/vokov/workspace/ai-drakon-setup/services/crisis-bot
pip install langgraph --quiet
python -m pytest tests/test_pipeline.py -v

# Якщо пройшли — commit:
cd /home/vokov/workspace/ai-drakon-setup
git add services/crisis-bot/pipeline/ services/crisis-bot/tests/test_pipeline.py
git commit -m "feat(crisis-bot): LangGraph StateGraph with BM25 retrieve + MemorySaver"
```

---

## TASK 4 — MAIN.PY (після Task 3)

### `main.py`
```python
import os, logging
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

load_dotenv()
log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

PORT         = int(os.getenv("PORT", "8770"))
AGENT_NAME   = os.getenv("AGENT_NAME", "crisis-bot")
KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"
MEMORY_DIR    = Path(__file__).parent / "memory"
MEMORY_DIR.mkdir(exist_ok=True)

_watcher_observer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _watcher_observer
    from knowledge_base import retrieval
    from knowledge_base.watcher import start_watcher
    try:
        count = retrieval.init(KNOWLEDGE_DIR)
        log.info(f"[{AGENT_NAME}] KB indexed: {count} sections")
    except Exception as e:
        log.warning(f"[{AGENT_NAME}] KB init failed: {e}")
    _watcher_observer = start_watcher(KNOWLEDGE_DIR)
    yield
    if _watcher_observer:
        _watcher_observer.stop()
        _watcher_observer.join()


app = FastAPI(title="crisis-bot", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    kb_sections_used: int


@app.get("/health")
def health():
    from knowledge_base import retrieval
    return {"status": "ok", "service": AGENT_NAME, "port": PORT,
            "kb_sections": len(retrieval._docs)}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    from pipeline.graph import get_graph
    try:
        result = get_graph().invoke(
            {"messages": [], "query": req.message,
             "kb_context": "", "reply": "", "session_id": req.session_id},
            config={"configurable": {"thread_id": req.session_id}},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    from knowledge_base.retrieval import retrieve
    return ChatResponse(reply=result.get("reply", ""),
                        session_id=req.session_id,
                        kb_sections_used=len(retrieve(req.message, top_k=3)))


@app.get("/kb/sections")
def kb_sections():
    from knowledge_base import retrieval
    return {"count": len(retrieval._docs),
            "sections": [{"source": d["source"], "heading": d["heading"]}
                         for d in retrieval._docs]}


@app.get("/kb/search")
def kb_search(q: str, top_k: int = 3):
    from knowledge_base.retrieval import retrieve
    return {"results": retrieve(q, top_k=top_k)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, reload=False)
```

### Верифікація Task 4:
```bash
cd /home/vokov/workspace/ai-drakon-setup/services/crisis-bot
pip install -e . --quiet
python main.py &
sleep 2
curl http://localhost:8770/health
# Expected: {"status":"ok","service":"crisis-bot","kb_sections":10}
curl -X POST http://localhost:8770/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"що робити при бпла","session_id":"test"}'
```

### Commit Task 4:
```bash
cd /home/vokov/workspace/ai-drakon-setup
git add services/crisis-bot/main.py
git commit -m "feat(crisis-bot): FastAPI app :8770, lifespan KB init + watchdog auto-reindex"
```

---

## КОНТЕКСТ ПРОЕКТУ

### Чому BM25Plus (не BM25Okapi)
BM25Okapi IDF = log((N-n+0.5)/(n+0.5)). При N=2, n=1 → log(1)=0 → всі scores=0.
BM25Plus = log((N+1)/n) → завжди позитивний. Alias прозорий для всіх call sites.

### Proxy LLM
Сервер 192.168.3.184 має локальний LLM proxy на `:18880/v1` (OpenAI-compatible).
Model: `docs-assistant-proxy`. Токен: `freecc`. Timeout: 60s.

### Існуючі сервіси в репо (для розуміння паттернів)
- `services/architect-agent/` — FastAPI + LangGraph + BM25 KB (без watchdog, без memory)
- `services/drakon-agent/` — містить `memory_manager.py` (GitHub-backed memory)
- `services/shared/drakon_shared/` — shared pipeline schema

### UAV Watcher web_config.py (опційна інтеграція Task 5)
Файл: `/home/vokov/projects/uav-watcher/web_config.py` на 192.168.3.184
Поточний `/api/chat` — keyword matching локально (CHAT_KB dict).
Task 5 (optional): форвардувати `/api/chat` → `http://localhost:8770/chat`, fallback на CHAT_KB.

---

## ЯК ПРОДОВЖИТИ (для іншого Claude)

1. Прочитай цей файл повністю
2. SSH на 192.168.3.184, перевір поточний стан:
   ```bash
   cd /home/vokov/workspace/ai-drakon-setup && git log --oneline -5
   ls services/crisis-bot/pipeline/
   ```
3. Почни з Task 3 (pipeline/) — код вище готовий до копіювання
4. Після Task 3 → Task 4 (main.py)
5. Перевір `/health` і `/chat` endpoints
6. Зафіксуй прогрес у цьому файлі (оновити таблицю статусу)
