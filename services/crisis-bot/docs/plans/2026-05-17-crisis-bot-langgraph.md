# Crisis Bot — LangGraph + Auto-Indexed KB Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `services/crisis-bot/` — a FastAPI service that auto-indexes `.md` files from a `knowledge/` folder and uses a LangGraph StateGraph with persistent memory for crisis consultation.

**Architecture:** BM25 knowledge base built from `knowledge/*.md` at startup; `watchdog` file watcher triggers reindex when files change. LangGraph `StateGraph` handles the conversation loop: retrieve → generate → save. Per-session memory persisted to local `memory/{session_id}.json`; reloaded on next chat call.

**Tech Stack:** FastAPI, LangGraph ≥0.2, rank_bm25, watchdog, httpx, pydantic v2, python-dotenv.

**Target path on dev server (192.168.3.184):** `/home/vokov/workspace/ai-drakon-setup/services/crisis-bot/`

---

## Task 1: Project scaffold + pyproject.toml

**Files:**
- Create: `services/crisis-bot/pyproject.toml`
- Create: `services/crisis-bot/.env.example`
- Create: `services/crisis-bot/knowledge/00-crisis-base.md`
- Create: `services/crisis-bot/memory/.gitkeep`

**Step 1: Create directory structure**
```bash
mkdir -p services/crisis-bot/{knowledge,memory,knowledge_base,pipeline,tests}
touch services/crisis-bot/knowledge_base/__init__.py
touch services/crisis-bot/pipeline/__init__.py
touch services/crisis-bot/tests/__init__.py
touch services/crisis-bot/memory/.gitkeep
```

**Step 2: Create pyproject.toml**
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "crisis-bot"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.111.0",
    "uvicorn[standard]>=0.29.0",
    "httpx>=0.27.0",
    "pydantic>=2.0",
    "python-dotenv>=1.0.0",
    "langgraph>=0.2.0",
    "rank-bm25>=0.2.2",
    "watchdog>=4.0.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

**Step 3: Create .env.example**
```bash
PROXY_URL=http://localhost:18880/v1
PROXY_TOKEN=freecc
PROXY_MODEL=docs-assistant-proxy
PORT=8770
AGENT_NAME=crisis-bot
```

**Step 4: Create initial knowledge file `knowledge/00-crisis-base.md`**
```markdown
## БПЛА / Дрон-камікадзе

Відійди від вікон, ляж на підлогу. Вимкни світло. НЕ виходь надвір — дрон відстежує рух.
Правило двох стін: ванна кімната або коридор. Після вибуху в радіусі 500м — зачини вікна, зачекай 15 хв.

## Балістична ракета / Іскандер

Час: 2–4 хвилини до удару. Підвал або 1-й поверх, несучі стіни.
Якщо не встиг: ляж у заглиблення, відкрий рот, прикрий потилицю руками.

## Крилата ракета / Калібр

Підземний паркінг або підвал — мета №1. Від вікон якомога далі. Попередження може бути коротким.

## FAB авіабомба / Планер

Правило двох стін НЕ ПРАЦЮЄ. Потрібен глибокий підвал або метро.
Відійди від будівель щонайменше 50м, ляж у ямку.

## Хімічна / Токсична загроза

Закрий ВСІ вікна герметично. Змочи тканину, прикрий рот і ніс.
Піднімись вище — більшість газів важчі за повітря.

## Під завалами

Стукай по трубах кожні 30 сек. Дихай спокійно — економ кисень. Зателефонуй 101.

## Паніка — техніка заземлення 5-4-3-2-1

1. Назви 5 речей які бачиш
2. Торкнись 4 поверхні
3. Назви 3 звуки
4. Відчуй 2 запахи
5. Зроби 1 глибокий вдих

## Відбій тривоги

Зачекай 5–10 хв після офіційного відбою. Огляди вулицю через вікно.
Не торкайся невідомих предметів на вулиці.

## Де ховатись — ієрархія укриттів

1. Метро / глибокий підвал / бомбосховище
2. Підземний паркінг
3. 1-й поверх — ванна/коридор (від вікон)
4. Будь-яке заглиблення надворі

## Телефони екстрених служб

101 — Пожежа / ДСНС
102 — Поліція
103 — Швидка допомога
112 — Єдина екстрена (всі три)
```

**Step 5: Commit**
```bash
git add services/crisis-bot/
git commit -m "feat(crisis-bot): project scaffold, pyproject.toml, initial knowledge base"
```

---

## Task 2: Knowledge Base — BM25 ingest + retrieval + watchdog watcher

**Files:**
- Create: `services/crisis-bot/knowledge_base/ingest.py`
- Create: `services/crisis-bot/knowledge_base/retrieval.py`
- Create: `services/crisis-bot/knowledge_base/watcher.py`
- Test: `services/crisis-bot/tests/test_knowledge_base.py`

**Step 1: Write failing test**
```python
# tests/test_knowledge_base.py
import pytest
from pathlib import Path
import tempfile, textwrap

def test_build_index_and_retrieve(tmp_path):
    (tmp_path / "test.md").write_text(textwrap.dedent("""
    ## БПЛА / Дрон

    Відійди від вікон, ляж на підлогу.

    ## Телефони

    101 — пожежа, 112 — єдина
    """))
    from knowledge_base.ingest import build_index
    index, docs = build_index(tmp_path)
    assert len(docs) == 2
    assert docs[0]["heading"] == "БПЛА / Дрон"

def test_retrieve_relevant(tmp_path):
    (tmp_path / "kb.md").write_text("## БПЛА\n\nВідійди від вікон.\n\n## Телефони\n\n101 пожежа")
    from knowledge_base import retrieval
    retrieval.init(tmp_path)
    results = retrieval.retrieve("бпла дрон", top_k=1)
    assert results[0]["heading"] == "БПЛА"
    assert results[0]["score"] > 0
```

**Step 2: Run test — expect FAIL**
```bash
cd services/crisis-bot && python -m pytest tests/test_knowledge_base.py -v
# Expected: ImportError: No module named 'knowledge_base.ingest'
```

**Step 3: Create `knowledge_base/ingest.py`**
```python
"""BM25 index builder — loads all .md files from knowledge_dir."""
import re
from pathlib import Path
from rank_bm25 import BM25Okapi


def _tokenize(text: str) -> list[str]:
    # Split on non-alphanumeric; keep Cyrillic + Latin
    return re.findall(r"[a-zA-Zа-яА-ЯіІїЇєЄёЁ0-9_]+", text.lower())


def _split_sections(text: str) -> list[dict]:
    sections, heading, lines = [], "intro", []
    for line in text.splitlines():
        if line.startswith("## "):
            if lines:
                sections.append({"heading": heading, "text": "\n".join(lines).strip()})
            heading, lines = line[3:].strip(), []
        else:
            lines.append(line)
    if lines:
        sections.append({"heading": heading, "text": "\n".join(lines).strip()})
    return [s for s in sections if s["text"]]


def build_index(knowledge_dir: str | Path) -> tuple[BM25Okapi, list[dict]]:
    """Load all .md files → BM25 index + docs list."""
    knowledge_dir = Path(knowledge_dir)
    docs: list[dict] = []
    for md in sorted(knowledge_dir.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        for sec in _split_sections(text):
            tokens = _tokenize(sec["heading"] + " " + sec["text"])
            docs.append({"source": md.name, "heading": sec["heading"],
                         "text": sec["text"], "tokens": tokens})
    if not docs:
        raise ValueError(f"No .md files in {knowledge_dir}")
    return BM25Okapi([d["tokens"] for d in docs]), docs
```

**Step 4: Create `knowledge_base/retrieval.py`**
```python
"""BM25 retrieval singleton — call init() once at startup."""
from pathlib import Path
from rank_bm25 import BM25Okapi
from .ingest import build_index, _tokenize

_index: BM25Okapi | None = None
_docs: list[dict] = []


def init(knowledge_dir: str | Path) -> int:
    """Build index from knowledge_dir. Returns number of sections indexed."""
    global _index, _docs
    _index, _docs = build_index(knowledge_dir)
    return len(_docs)


def retrieve(query: str, top_k: int = 3) -> list[dict]:
    if _index is None:
        return []
    scores = _index.get_scores(_tokenize(query))
    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    return [
        {"source": _docs[i]["source"], "heading": _docs[i]["heading"],
         "text": _docs[i]["text"], "score": round(float(s), 4)}
        for i, s in ranked[:top_k] if s > 0
    ]


def retrieve_text(query: str, top_k: int = 3) -> str:
    secs = retrieve(query, top_k)
    return "\n\n---\n\n".join(f"### {s['heading']}\n{s['text']}" for s in secs)
```

**Step 5: Create `knowledge_base/watcher.py`**
```python
"""watchdog-based file watcher — rebuilds BM25 index when .md files change."""
import logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from . import retrieval

log = logging.getLogger(__name__)


class _KBHandler(FileSystemEventHandler):
    def __init__(self, knowledge_dir: Path):
        self._dir = knowledge_dir

    def _reindex(self):
        try:
            count = retrieval.init(self._dir)
            log.info(f"[crisis-bot] KB reindexed: {count} sections")
        except Exception as e:
            log.error(f"[crisis-bot] reindex failed: {e}")

    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith(".md"):
            self._reindex()

    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(".md"):
            self._reindex()

    def on_deleted(self, event):
        if not event.is_directory and event.src_path.endswith(".md"):
            self._reindex()


def start_watcher(knowledge_dir: str | Path) -> Observer:
    """Start background watchdog observer. Returns observer (call .stop() to halt)."""
    knowledge_dir = Path(knowledge_dir)
    handler = _KBHandler(knowledge_dir)
    observer = Observer()
    observer.schedule(handler, str(knowledge_dir), recursive=False)
    observer.start()
    log.info(f"[crisis-bot] Watching {knowledge_dir} for changes")
    return observer
```

**Step 6: Run test — expect PASS**
```bash
cd services/crisis-bot && python -m pytest tests/test_knowledge_base.py -v
# Expected: 2 passed
```

**Step 7: Commit**
```bash
git add services/crisis-bot/knowledge_base/ services/crisis-bot/tests/
git commit -m "feat(crisis-bot): BM25 knowledge base with auto-reindex watchdog"
```

---

## Task 3: LangGraph Pipeline — states + nodes + graph with MemorySaver

**Files:**
- Create: `services/crisis-bot/pipeline/states.py`
- Create: `services/crisis-bot/pipeline/nodes.py`
- Create: `services/crisis-bot/pipeline/graph.py`
- Test: `services/crisis-bot/tests/test_pipeline.py`

**Step 1: Write failing test**
```python
# tests/test_pipeline.py
import pytest, tempfile, textwrap
from pathlib import Path

def setup_kb(tmp_path):
    (tmp_path / "kb.md").write_text("## БПЛА\n\nВідійди від вікон.")
    from knowledge_base import retrieval
    retrieval.init(tmp_path)

def test_graph_returns_reply(tmp_path, monkeypatch):
    setup_kb(tmp_path)

    # Mock LLM call so test doesn't need network
    import pipeline.nodes as nodes
    monkeypatch.setattr(nodes, "_llm_call", lambda messages: "Відійди від вікон — це важливо.")

    from pipeline.graph import build_graph
    graph = build_graph()
    result = graph.invoke(
        {"messages": [], "query": "що робити при бпла", "session_id": "test-1"},
        config={"configurable": {"thread_id": "test-1"}},
    )
    assert "reply" in result
    assert len(result["reply"]) > 0
```

**Step 2: Run — expect FAIL**
```bash
cd services/crisis-bot && python -m pytest tests/test_pipeline.py -v
# Expected: ImportError: No module named 'pipeline.states'
```

**Step 3: Create `pipeline/states.py`**
```python
from typing import TypedDict, Annotated
from langgraph.graph import add_messages


class CrisisState(TypedDict):
    messages: Annotated[list, add_messages]  # full conversation history
    query: str                                # current user message
    kb_context: str                           # retrieved knowledge sections
    reply: str                                # bot reply
    session_id: str                           # for memory namespacing
```

**Step 4: Create `pipeline/nodes.py`**
```python
"""LangGraph nodes: retrieve_kb, generate, save_memory."""
import os
import httpx
from .states import CrisisState

PROXY_URL  = os.getenv("PROXY_URL", "http://localhost:18880/v1")
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
    """Retrieve relevant KB sections for the current query."""
    from knowledge_base.retrieval import retrieve_text
    context = retrieve_text(state["query"], top_k=3)
    return {"kb_context": context}


def generate(state: CrisisState) -> dict:
    """Call LLM with conversation history + KB context."""
    history = list(state.get("messages", []))

    user_content = state["query"]
    if state.get("kb_context"):
        user_content = f"[База знань]\n{state['kb_context']}\n\n[Запит]\n{state['query']}"

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    # Add recent history (last 6 messages)
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

**Step 5: Create `pipeline/graph.py`**
```python
"""LangGraph StateGraph for crisis bot — retrieve → generate, with MemorySaver."""
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from .states import CrisisState
from .nodes import retrieve_kb, generate


def build_graph() -> object:
    g = StateGraph(CrisisState)

    g.add_node("retrieve_kb", retrieve_kb)
    g.add_node("generate", generate)

    g.set_entry_point("retrieve_kb")
    g.add_edge("retrieve_kb", "generate")
    g.add_edge("generate", END)

    checkpointer = MemorySaver()
    return g.compile(checkpointer=checkpointer)


# Singleton — one compiled graph per process
_graph = None

def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph
```

**Step 6: Run test — expect PASS**
```bash
cd services/crisis-bot && python -m pytest tests/test_pipeline.py -v
# Expected: 1 passed
```

**Step 7: Commit**
```bash
git add services/crisis-bot/pipeline/ services/crisis-bot/tests/test_pipeline.py
git commit -m "feat(crisis-bot): LangGraph StateGraph with BM25 retrieve + MemorySaver"
```

---

## Task 4: main.py — FastAPI app + lifespan (KB init + watcher)

**Files:**
- Create: `services/crisis-bot/main.py`
- Create: `services/crisis-bot/prompts.py`  ← (reuse if needed, just SYSTEM_PROMPT)

**Step 1: Create `main.py`**
```python
import os
import logging
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

PORT        = int(os.getenv("PORT", "8770"))
AGENT_NAME  = os.getenv("AGENT_NAME", "crisis-bot")
KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"
MEMORY_DIR    = Path(__file__).parent / "memory"
MEMORY_DIR.mkdir(exist_ok=True)

_watcher_observer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _watcher_observer
    # 1. Initial KB index
    from knowledge_base import retrieval
    from knowledge_base.watcher import start_watcher
    try:
        count = retrieval.init(KNOWLEDGE_DIR)
        log.info(f"[{AGENT_NAME}] KB indexed: {count} sections from {KNOWLEDGE_DIR}")
    except Exception as e:
        log.warning(f"[{AGENT_NAME}] KB init failed: {e}")

    # 2. Start watchdog
    _watcher_observer = start_watcher(KNOWLEDGE_DIR)

    yield  # server running

    # Shutdown
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
    return {
        "status": "ok",
        "service": AGENT_NAME,
        "port": PORT,
        "kb_sections": len(retrieval._docs),
    }


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    from pipeline.graph import get_graph
    graph = get_graph()

    try:
        result = graph.invoke(
            {"messages": [], "query": req.message,
             "kb_context": "", "reply": "", "session_id": req.session_id},
            config={"configurable": {"thread_id": req.session_id}},
        )
    except Exception as e:
        log.error(f"Pipeline error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

    from knowledge_base.retrieval import retrieve
    kb_hits = retrieve(req.message, top_k=3)

    return ChatResponse(
        reply=result.get("reply", ""),
        session_id=req.session_id,
        kb_sections_used=len(kb_hits),
    )


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

**Step 2: Verify server starts**
```bash
cd services/crisis-bot
pip install -e . --quiet
python main.py &
sleep 2
curl http://localhost:8770/health
# Expected: {"status":"ok","service":"crisis-bot","kb_sections":N}
```

**Step 3: Test /chat endpoint**
```bash
curl -X POST http://localhost:8770/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "що робити при бпла", "session_id": "test-1"}'
# Expected: {"reply": "...", "session_id": "test-1", "kb_sections_used": 1}
```

**Step 4: Test auto-reindex — drop new file**
```bash
echo "## Новий розділ\n\nТестовий контент" > knowledge/test-new.md
sleep 2  # watchdog picks it up
curl http://localhost:8770/kb/sections
# Expected: kb_sections count increased by N new sections
```

**Step 5: Commit**
```bash
git add services/crisis-bot/main.py services/crisis-bot/.env.example
git commit -m "feat(crisis-bot): FastAPI app with lifespan KB init + watchdog auto-reindex"
```

---

## Task 5: Wire to UAV Watcher web_config.py (optional — only if requested)

This is a separate integration step. The `crisis-bot` runs on port 8770. The web_config.py `/api/chat` endpoint currently does keyword matching locally — it can be forwarded to crisis-bot for richer LangGraph-powered responses:

```python
# In web_config.py do_POST, replace /api/chat handler:
if path == "/api/chat":
    q = payload.get("q", "").strip()
    session = payload.get("session_id", "default")
    try:
        import urllib.request, json
        data = json.dumps({"message": q, "session_id": session}).encode()
        req = urllib.request.Request(
            "http://localhost:8770/chat",
            data=data, headers={"Content-Type": "application/json"}, method="POST"
        )
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        self.send_json({"title": "", "text": result["reply"]})
    except Exception as e:
        self.send_json(chat_match(q))  # fallback to local KB
    return
```

**Skip this task for now — keep local KB as fallback, integrate when crisis-bot is stable.**

---

## Execution Notes

**Run on dev server (192.168.3.184):**
```bash
sshpass -p '805235io.' ssh vokov@192.168.3.184
cd /home/vokov/workspace/ai-drakon-setup/services/crisis-bot
pip install -e .
python main.py
```

**Add new knowledge:** Just drop `.md` files into `knowledge/` — watchdog picks them up within 1 second, no restart needed.

**Memory:** LangGraph `MemorySaver` keeps conversation per `session_id` in RAM. For cross-restart persistence, replace with `SqliteSaver` (add `langgraph-checkpoint-sqlite` dep).
