---
tags:
  - domain:plan
  - status:active
  - format:plan
created: 2026-05-12
updated: 2026-05-28
tier: 3
title: "Мультиагентна система DRAKON — План реалізації"
lang: uk
---

# Мультиагентна система DRAKON — План реалізації

> **Для Claude:** НЕОБХІДНИЙ SUB-SKILL: Використовуйте superpowers:executing-plans для реалізації цього плану завдання за завданням.

**Мета:** Розширити платформу AI-DRAKON двома спеціалізованими агентами (Architect + Docs), які мають спільну базу знань з існуючим `drakon-agent`, спілкуються через єдиний чат-інтерфейс та зберігають свою пам'ять у репозиторії git.

**Архітектура:** Три агенти FastAPI, які використовують спільну директорію бази знань BM25; кожен агент має підпростір імен `memory/` у репозиторії; Cloudflare Worker надає нові інструменти MCP для агентів; фронтенд React додає компоненти `AgentChatPanel`, інтегровані з існуючою сторінкою `DiagramsPage`.

**Стек технологій:** Python 3.11 FastAPI (агенти), TypeScript/React (фронтенд), Cloudflare Worker (MCP-брокер), MinIO (діаграми), GitHub API (збереження пам'яті), BM25Okapi (отримання даних із бази знань).

---

## Загальний огляд (Executive Summary)

### Поточний стан (2026-05-12)

Платформа має три робочі рівні:

```
┌─────────────────────────────────────────────────┐
│  FRONTEND (CF Pages → ai-drakon-setup.pages.dev) │
│  React 19 / TanStack Router / Zustand            │
│  DiagramsPage: дерево папок + сітка діаграм      │
│  DiagramEditorPage: редактор drakonwidget.js      │
└───────────────┬─────────────────────────────────┘
                │ MCP HTTP (Authorization: Bearer drakon-mcp-2026)
┌───────────────▼─────────────────────────────────┐
│  CLOUDFLARE WORKER (drakon-mcp-worker)            │
│  drakon.listdiagrams / savediagram / deletediagram│
│  drakon.validateir / mutatediagram               │
│  drakon.analyzecodebase (→ AST мікросервіс)      │
│  drakon.savetogit / listgitdiagrams / getgitdiagram│
│  drakon.diffcodevsdiagram                        │
└───────┬───────────────────────────────┬──────────┘
        │                               │
┌───────▼────────┐            ┌─────────▼──────────┐
│  MinIO S3      │            │  GitHub API         │
│  apiminio.…ua  │            │  drn/ папка в репо  │
│  bucket=drakon │            │  memory/*.md файли  │
└────────────────┘            └────────────────────┘

┌─────────────────────────────────────────────────┐
│  DRAKON-AGENT (192.168.3.184:8765)               │
│  FastAPI + Python AST аналізатор                 │
│  База знань BM25 (knowledge/*.md)                │
│  AI покращувач → проксі :18880 (coding-proxy)    │
│  Валідатор (цілісність b0/end/question/action)   │
│  POST /analyze  GET /health  POST /feedback      │
└─────────────────────────────────────────────────┘
```

### Контракт DRAKON IR (канонічний, ніколи не порушувати)

```typescript
// src/lib/htse/ir-types.ts — єдине джерело правди
interface IrItem {
  type: "action"|"question"|"select"|"case"|"header"|"end"|
        "address"|"branch"|"insertion"|"input"|"output"|
        "shelf"|"process"|"timer"|"duration";
  content: string;
  one?: string;   // наступний вузол / гілка ТАК
  two?: string;   // гілка НІ (тільки для питань)
  side?: string;
  branchId?: string;
}
interface IrDiagram {
  name: string;
  access: "public"|"private";
  params: string[];       // масив у фронтенді, рядок у drakon-agent (застаріле)
  items: Record<string, IrItem>;
}
```

**Правило:** `b0` (type: "branch", branchId: 0) МУСИТЬ існувати. `end` (type: "end") МУСИТЬ існувати. Без `b0` drakonwidget рендерить тільки заголовок, а не блок-схему.

---

## Концепція: Мультиагентна платформа

### Три агенти, один інтерфейс користувача (UI)

```
┌──────────────────────────────────────────────────────────────────┐
│  AI-DRAKON UI  (DiagramsPage — головний екран)                   │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────────────────────────┐  │
│  │ Дерево папок    │  │  Бічна панель чату з агентом         │  │
│  │ (GitHub репо)   │  │  ┌──────────┬──────────┬──────────┐  │  │
│  │                 │  │  │Architect │  Docs    │ Editor   │  │  │
│  │ project/        │  │  └──────────┴──────────┴──────────┘  │  │
│  │  ├─ src/        │  │  [Повідомлення чату + дії]           │  │
│  │  │   └─ *.py   │  │  [Застосувати] [Відхилити] [Запитати]│  │
│  │  └─ docs/       │  └──────────────────────────────────────┘  │
│  │                 │                                             │
│  └─────────────────┘                                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Сітка діаграм DRAKON (папки + мініатюри діаграм)        │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Ролі агентів

| Агент | Порт | Відповідальність | Зона змін |
|-------|------|------------------|-----------|
| **drakon-agent** (існуючий) | 8765 | Python AST → DRAKON IR | `POST /analyze` діаграми |
| **architect-agent** (новий) | 8766 | Структура проекту, діаграми модулів, архітектурні рішення | `memory/architect/*.md`, діаграми DRAKON проекту в папці `architecture/` |
| **docs-agent** (новий) | 8767 | Керування документацією, API docs, генерація README | `memory/docs/*.md`, діаграми DRAKON документації в папці `documentation/` |

### Архітектура пам'яті (із збереженням в git)

Кожен агент має свій простір імен у директорії `memory/` репозиторію:

```
memory/
├── architect/
│   ├── MEMORY.md          # індекс (≤200 рядків)
│   ├── project-structure.md
│   ├── decisions/         # записи у стилі ADR
│   │   └── 2026-05-12-use-fastapi.md
│   └── diagrams-index.md  # які діаграми що описують
├── docs/
│   ├── MEMORY.md
│   ├── api-coverage.md    # які кінцеві точки задокументовані
│   ├── glossary.md
│   └── documentation-map.md
└── shared/
    ├── MEMORY.md
    └── project-context.md # факти на рівні проекту, потрібні обом агентам
```

**Правило ініціалізації:** Якщо `memory/` не існує в клонованому репозиторії, агенти автоматично створюють її та роблять перший коміт при запуску.

### Спільна база знань

Усі три агенти читають з `services/drakon-agent/knowledge/`:

```
services/drakon-agent/knowledge/
├── drakon-ir-format.md        # існуючий
├── 01-diagram-types.md        # з досліджень Gemini KB (планується)
├── 02-icon-semantics.md
├── 03-content-labeling.md
├── 04-ast-mapping.md
├── 05-rightward-degradation.md
├── 06-validation-metrics.md
├── 07-code-patterns.md
└── 08-bm25-index.md
```

**Architect-agent додатково читає:** `memory/architect/` для контексту конкретного проекту.  
**Docs-agent додатково читає:** `memory/docs/` + `memory/shared/`.

### Розширення інструментів MCP (нові інструменти воркера)

Нові інструменти, необхідні в Cloudflare Worker:

```javascript
// Нові визначення інструментів для додавання в worker-mcp-drakon.js:

drakon.listmemory      // { agent: "architect"|"docs"|"shared" } → список файлів пам'яті
drakon.getmemory       // { agent, file } → вміст файлу
drakon.savememory      // { agent, file, content, commitMsg } → git push
drakon.listproject     // { owner, repo, branch, path? } → рекурсивне дерево файлів
drakon.getfile         // { owner, repo, branch, path } → вміст файлу
drakon.agentchat       // { agent, message, context } → проксіюється на сервіс агента
```

---

## Порядок виконання

### Завдання 1: Система автозапуску пам'яті репозиторію

**Файли:**
- Створити: `services/drakon-agent/memory_manager.py`
- Створити: `memory/.gitkeep` (заповнювач)
- Створити: `memory/shared/MEMORY.md`
- Створити: `memory/shared/project-context.md`

**Що це робить:** При запуску агента перевірити, чи існує `memory/{agent_name}/` в репозиторії GitHub. Якщо ні, створити її з порожнім `MEMORY.md`. Зробити початковий коміт.

```python
# memory_manager.py
import os, httpx

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO = os.getenv("GITHUB_REPO", "maxfraieho/ai-drakon-setup")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")
MEMORY_BASE = "memory"

def ensure_agent_memory(agent_name: str) -> bool:
    """Create memory namespace in repo if missing. Returns True if created."""
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }
    index_path = f"{MEMORY_BASE}/{agent_name}/MEMORY.md"
    check_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{index_path}"
    
    resp = httpx.get(check_url, headers=headers)
    if resp.status_code == 200:
        return False  # вже існує
    
    # Створити початковий MEMORY.md
    import base64
    content = f"# {agent_name.title()} Agent Memory\n\n(auto-created on first startup)\n"
    encoded = base64.b64encode(content.encode()).decode()
    httpx.put(check_url, headers=headers, json={
        "message": f"feat: initialize {agent_name} agent memory namespace",
        "content": encoded,
        "branch": GITHUB_BRANCH,
    })
    return True


def save_memory(agent_name: str, filename: str, content: str, commit_msg: str) -> dict:
    """Write a memory file to the repo."""
    import base64
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }
    path = f"{MEMORY_BASE}/{agent_name}/{filename}"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
    
    # Отримати поточний SHA, якщо файл існує (потрібно для оновлення)
    existing = httpx.get(url, headers=headers)
    sha = existing.json().get("sha") if existing.status_code == 200 else None
    
    encoded = base64.b64encode(content.encode()).decode()
    payload = {"message": commit_msg, "content": encoded, "branch": GITHUB_BRANCH}
    if sha:
        payload["sha"] = sha
    
    resp = httpx.put(url, headers=headers, json=payload)
    return {"success": resp.status_code in (200, 201), "path": path}


def get_memory(agent_name: str, filename: str) -> str | None:
    """Read a memory file from the repo."""
    import base64
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }
    path = f"{MEMORY_BASE}/{agent_name}/{filename}"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
    resp = httpx.get(url, headers=headers)
    if resp.status_code != 200:
        return None
    return base64.b64decode(resp.json()["content"]).decode()
```

**Крок 1:** Написати тест: `pytest services/drakon-agent/tests/test_memory_manager.py::test_ensure_creates_namespace`  
**Крок 2:** Запустити тест → FAIL  
**Крок 3:** Реалізувати `ensure_agent_memory()` + `save_memory()` + `get_memory()`  
**Крок 4:** Запустити тест → PASS  
**Крок 5:** Коміт: `feat: add memory_manager for git-persisted agent memory`

---

### Завдання 2: Сервіс архітектурного агента (Architect Agent)

**Файли:**
- Створити: `services/architect-agent/main.py`
- Створити: `services/architect-agent/analyzer/structure_analyzer.py`
- Створити: `services/architect-agent/ai_chat/architect_chat.py`
- Створити: `services/architect-agent/pyproject.toml`
- Створити: `services/architect-agent/.env.example`
- Створити: `memory/architect/MEMORY.md` (bootstrap)

**API:**
```
GET  /health
POST /chat          { message, context: { file_tree?, current_diagram? } } → { reply, suggested_mutations? }
POST /analyze-repo  { owner, repo, branch } → { architecture_diagrams: IrDiagram[] }
POST /memory/save   { file, content, commit_msg } → { success }
GET  /memory/list   → { files: string[] }
GET  /memory/get    { file } → { content }
```

**Основна логіка — `architect_chat.py`:**
```python
from typing import Optional
import httpx, os, json

PROXY_URL = os.getenv("PROXY_URL", "http://localhost:18880/v1")
PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc")
PROXY_MODEL = os.getenv("PROXY_MODEL", "coding-proxy")

SYSTEM_PROMPT = """You are the Architect agent for an AI-DRAKON platform.
Your role: analyze project structure, create DRAKON architecture diagrams,
suggest structural improvements, answer architecture questions.

You have access to:
- The project file tree (GitHub repo contents)
- Existing DRAKON diagrams in the "architecture/" folder
- Your memory (memory/architect/*.md) with previous decisions
- DRAKON IR format rules from the knowledge base

When suggesting diagram changes, output MutationOp[] in JSON format.
When answering questions, be concise and reference specific files.

DRAKON IR quick reference:
- b0: {type:"branch",branchId:0,one:"<first_node>"} MANDATORY
- end: {type:"end"} MANDATORY  
- action: {type:"action",content:"<text>",one:"<next>"}
- question: {type:"question",content:"<cond>?",one:"<yes>",two:"<no>"}
"""

def build_architect_context(
    message: str,
    file_tree: Optional[dict] = None,
    current_diagram: Optional[dict] = None,
    memory_context: str = "",
    kb_context: str = "",
) -> list[dict]:
    user_content = []
    if memory_context:
        user_content.append(f"## My Memory\n{memory_context}")
    if kb_context:
        user_content.append(f"## DRAKON Rules\n{kb_context}")
    if file_tree:
        user_content.append(f"## Project File Tree\n{json.dumps(file_tree, indent=2)[:3000]}")
    if current_diagram:
        user_content.append(f"## Current Diagram\n{json.dumps(current_diagram, indent=2)[:2000]}")
    user_content.append(f"## User Message\n{message}")
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "\n\n".join(user_content)},
    ]

def architect_chat(
    message: str,
    file_tree=None,
    current_diagram=None,
    memory_context="",
    kb_context="",
) -> dict:
    messages = build_architect_context(message, file_tree, current_diagram, memory_context, kb_context)
    resp = httpx.post(
        f"{PROXY_URL}/chat/completions",
        json={"model": PROXY_MODEL, "messages": messages, "temperature": 0.2},
        headers={"Authorization": f"Bearer {PROXY_TOKEN}"},
        timeout=90.0,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    
    # Спробувати витягнути MutationOp JSON, якщо він присутній
    mutations = None
    if "```json" in content:
        import re
        m = re.search(r"```json\s*(\[.*?\])\s*```", content, re.DOTALL)
        if m:
            try:
                mutations = json.loads(m.group(1))
            except Exception:
                pass
    
    return {"reply": content, "suggested_mutations": mutations}
```

**Крок 1:** Написати тест для `architect_chat` з імітованим проксі  
**Крок 2:** Запустити тест → FAIL  
**Крок 3:** Реалізувати `architect_chat.py`  
**Крок 4:** Запустити тест → PASS  
**Крок 5:** Реалізувати `main.py` (FastAPI з /health, /chat, /analyze-repo, /memory/*)  
**Крок 6:** Запустити сервіс: `cd services/architect-agent && .venv/bin/python3 main.py`  
**Крок 7:** Димовий тест (smoke test): `curl http://localhost:8766/health`  
**Крок 8:** Коміт: `feat: architect-agent service (port 8766) with chat + memory API`

---

### Завдання 3: Сервіс агента документації (Docs Agent)

**Файли:**
- Створити: `services/docs-agent/main.py`
- Створити: `services/docs-agent/ai_chat/docs_chat.py`
- Створити: `services/docs-agent/analyzer/doc_coverage.py`
- Створити: `memory/docs/MEMORY.md` (bootstrap)

**API:**
```
GET  /health
POST /chat          { message, context: { file_tree?, current_doc? } } → { reply, doc_suggestions? }
POST /analyze-docs  { owner, repo, branch } → { coverage_report, missing_docs: string[] }
POST /memory/save   { file, content, commit_msg } → { success }
GET  /memory/list   → { files: string[] }
```

**Основна логіка — `doc_coverage.py`:**
```python
"""Analyze which files/functions lack documentation."""
import re

def analyze_doc_coverage(file_tree: dict) -> dict:
    """Given GitHub file tree, find Python files without docstrings."""
    py_files = [f for f in file_tree.get("tree", []) if f.get("path","").endswith(".py")]
    missing = []
    for f in py_files:
        path = f["path"]
        # Евристика: файли в src/ без відповідного запису в docs/
        if path.startswith("src/") and not any(
            d["path"].startswith(f"docs/{path.replace('src/','').replace('.py','')}") 
            for d in file_tree.get("tree", [])
        ):
            missing.append(path)
    return {"py_files": len(py_files), "missing_docs": missing[:20]}
```

**Крок 1-8:** Той самий шаблон, що й для Завдання 2, але для docs-agent (порт 8767)  
**Крок 9:** Коміт: `feat: docs-agent service (port 8767) with chat + doc coverage`

---

### Завдання 4: Кінцеві точки для внесення внесків до бази знань

Кожен агент додає контекст до спільної бази знань. Додати до обох агентів (architect та docs):

**Файли:**
- Змінити: `services/architect-agent/main.py` — додати `POST /kb/contribute`
- Змінити: `services/docs-agent/main.py` — додати `POST /kb/contribute`
- Спільна бібліотека: `services/shared/kb_writer.py` (символічне посилання або копія)

```python
# services/shared/kb_writer.py
import os, hashlib
from pathlib import Path

KB_DIR = os.getenv(
    "KB_DIR",
    str(Path(__file__).parent.parent / "drakon-agent/knowledge")
)

def contribute_to_kb(filename: str, content: str, agent_name: str) -> str:
    """Write a markdown file to the shared KB. Returns the path."""
    path = Path(KB_DIR) / filename
    existing = path.read_text() if path.exists() else ""
    if hashlib.md5(content.encode()).hexdigest() == hashlib.md5(existing.encode()).hexdigest():
        return str(path)  # без змін
    with open(path, "w") as f:
        f.write(f"<!-- contributed by {agent_name} -->\n{content}")
    return str(path)
```

**Крок 1:** Написати тест для `contribute_to_kb`  
**Крок 2:** Запустити → FAIL  
**Крок 3:** Реалізувати  
**Крок 4:** Запустити → PASS  
**Крок 5:** Додати кінцеву точку до обох агентів  
**Крок 6:** Коміт: `feat: KB contribution endpoint for architect+docs agents`

---

### Завдання 5: Нові інструменти MCP у воркері Cloudflare

**Файл:** `cloudflare-worker/worker-mcp-drakon.js`

Додати до відповіді `tools/list` та обробника `tools/call`:

```javascript
// Нові описи інструментів (додати до масиву tools ~рядок 1170):

{ name: 'drakon.listmemory',
  description: 'List memory files for an agent namespace',
  inputSchema: { type:'object', properties: {
    agent: { type:'string', enum:['architect','docs','shared'] }
  }, required:['agent'] }
},
{ name: 'drakon.getmemory',
  description: 'Get content of a memory file',
  inputSchema: { type:'object', properties: {
    agent: { type:'string' }, file: { type:'string' }
  }, required:['agent','file'] }
},
{ name: 'drakon.savememory',
  description: 'Save a memory file and push to git',
  inputSchema: { type:'object', properties: {
    agent: { type:'string' }, file: { type:'string' },
    content: { type:'string' }, commit_msg: { type:'string' }
  }, required:['agent','file','content','commit_msg'] }
},
{ name: 'drakon.agentchat',
  description: 'Send a message to a specialist agent (architect or docs)',
  inputSchema: { type:'object', properties: {
    agent: { type:'string', enum:['architect','docs'] },
    message: { type:'string' },
    context: { type:'object' }
  }, required:['agent','message'] }
},

// Обробник (додати до switch tools/call ~рядок 1530):
if (name === 'drakon.agentchat') {
  const { agent, message, context = {} } = params;
  const portMap = { architect: 8766, docs: 8767 };
  const port = portMap[agent];
  if (!port) return errorResponse('Unknown agent', 400);
  
  // У продакшені: використовувати внутрішній URL сервісу, а не localhost
  const agentUrl = env[`${agent.toUpperCase()}_AGENT_URL`] 
    || `http://localhost:${port}`;
  
  const resp = await fetch(`${agentUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
  });
  const data = await resp.json();
  return jsonResponse({ success: true, ...data });
}

if (name === 'drakon.savememory') {
  const { agent, file, content, commit_msg } = params;
  const requestToken = request.headers.get('X-Github-Token') || '';
  
  const path = `memory/${agent}/${file}`;
  // Повторно використати існуючу логіку savetogit, але для шляху пам'яті
  const result = await saveFileToGit(env, {
    owner: 'maxfraieho', repo: 'ai-drakon-setup',
    branch: 'main', path, content, message: commit_msg
  }, requestToken);
  return jsonResponse(result);
}
```

**Крок 1:** Протестувати поточний воркер локально або через curl  
**Крок 2:** Додати описи інструментів  
**Крок 3:** Додати обробники  
**Крок 4:** Деплой: `CLOUDFLARE_API_TOKEN=<token> npx wrangler@latest deploy`  
**Крок 5:** Протестувати: `curl -X POST https://drakon-antigravity-worker.maxfraieho.workers.dev/mcp -H "Authorization: Bearer drakon-mcp-2026" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`  
**Крок 6:** Перевірити, що нові інструменти з'явилися у списку  
**Крок 7:** Коміт: `feat: worker MCP tools for agent memory + chat routing`

---

### Завдання 6: Фронтенд — Компонент AgentChatPanel

**Файли:**
- Створити: `src/components/agents/AgentChatPanel.tsx`
- Створити: `src/components/agents/AgentMessage.tsx`
- Створити: `src/hooks/useAgentChat.ts`
- Змінити: `src/pages/DiagramsPage.tsx` — додати бічну панель агентів

**Структура `AgentChatPanel.tsx`:**
```typescript
// src/components/agents/AgentChatPanel.tsx
import { useState } from "react";
import { Bot, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgentChat } from "@/hooks/useAgentChat";
import { AgentMessage } from "./AgentMessage";

export type AgentType = "architect" | "docs";

interface Props {
  agent: AgentType;
  projectContext?: {
    fileTree?: unknown;
    currentDiagram?: unknown;
    folderSlug?: string;
  };
}

export function AgentChatPanel({ agent, projectContext }: Props) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading } = useAgentChat(agent);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input, projectContext);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <AgentMessage key={i} message={msg} />
        ))}
        {isLoading && <div className="flex gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4"/><span>Thinking...</span></div>}
      </div>
      <div className="p-4 border-t flex gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Ask ${agent === "architect" ? "Architect" : "Docs"} agent...`}
          className="flex-1 resize-none"
          rows={2}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

**`AgentMessage.tsx`** — рендерить відповідь агента з додатковою кнопкою "Застосувати зміни" (Apply mutations):
- Виявляє, якщо `message.suggested_mutations` існує → показує кнопку `[Apply]`.
- `[Apply]` → викликає `mcpCall("drakon.mutatediagram", { mutations })`.
- Показує мутації як згорнутий JSON-перегляд.

**`useAgentChat.ts`:**
- Викликає `mcpCall("drakon.agentchat", { agent, message, context })`.
- Зберігає масив історії повідомлень.
- Повертає `{ messages, sendMessage, isLoading }`.

**Зміна DiagramsPage.tsx:** Додати бічну панель агента у вигляді Sheet/Panel:
- Стан: `agentSidebarOpen`, `activeAgent: "architect"|"docs"|null`.
- Кнопка на панелі інструментів: `<Bot /> "Agents"` → відкриває Sheet.
- Вміст Sheet: Вкладки `["Architect" | "Docs"]`.
- Кожна вкладка: `<AgentChatPanel agent={...} projectContext={{fileTree: githubFileTree, folderSlug}} />`.

**Крок 1:** Створити `AgentChatPanel.tsx` з фіксованими тестовими повідомленнями  
**Крок 2:** Додати до DiagramsPage за кнопкою перемикання бічної панелі  
**Крок 3:** Перевірити рендеринг у браузері  
**Крок 4:** Створити `useAgentChat.ts`, підключений до інструменту MCP `drakon.agentchat`  
**Крок 5:** Протестувати надсилання реального повідомлення до architect-agent  
**Крок 6:** Додати `AgentMessage.tsx` з кнопкою застосування мутацій  
**Крок 7:** Протестувати застосування запропонованих мутацій до поточної діаграми  
**Крок 8:** Коміт: `feat: AgentChatPanel + useAgentChat hook in DiagramsPage sidebar`

---

### Завдання 7: Архітектурний агент — Аналіз структури проекту

**Файл:** `services/architect-agent/analyzer/structure_analyzer.py`

```python
"""Analyze GitHub repo structure and generate DRAKON architecture diagrams."""
import httpx, os, re
from typing import NamedTuple

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

class FileNode(NamedTuple):
    path: str
    type: str  # "blob" | "tree"

def fetch_repo_tree(owner: str, repo: str, branch: str = "main") -> list[FileNode]:
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }
    sha_resp = httpx.get(
        f"https://api.github.com/repos/{owner}/{repo}/git/ref/heads/{branch}",
        headers=headers
    )
    sha = sha_resp.json()["object"]["sha"]
    tree_resp = httpx.get(
        f"https://api.github.com/repos/{owner}/{repo}/git/trees/{sha}?recursive=1",
        headers=headers
    )
    items = tree_resp.json().get("tree", [])
    return [FileNode(i["path"], i["type"]) for i in items if not i["path"].startswith(".")]

def repo_to_architecture_ir(owner: str, repo: str, branch: str = "main") -> dict:
    """Generate a high-level architecture DRAKON IR from repo structure."""
    nodes = fetch_repo_tree(owner, repo, branch)
    
    # Групувати за директорією верхнього рівня
    dirs = {}
    for n in nodes:
        top = n.path.split("/")[0] if "/" in n.path else n.path
        dirs.setdefault(top, []).append(n)
    
    # Побудувати DRAKON IR: одна дія (action) на модуль верхнього рівня
    items = {"end": {"type": "end"}}
    node_ids = []
    for i, (dirname, files) in enumerate(sorted(dirs.items())):
        nid = f"n{i+1}"
        py_count = sum(1 for f in files if f.path.endswith(".py"))
        ts_count = sum(1 for f in files if f.path.endswith((".ts",".tsx")))
        items[nid] = {
            "type": "action",
            "content": f"{dirname}/ ({len(files)} files"
                      + (f", {py_count} py" if py_count else "")
                      + (f", {ts_count} ts" if ts_count else "") + ")",
        }
        node_ids.append(nid)
    
    # Зв'язати вузли
    for i, nid in enumerate(node_ids):
        items[nid]["one"] = node_ids[i+1] if i+1 < len(node_ids) else "end"
    
    items["b0"] = {"type": "branch", "branchId": 0, "one": node_ids[0] if node_ids else "end"}
    
    return {
        "name": f"{repo} Architecture",
        "params": "",
        "items": items,
    }
```

**Крок 1:** Написати тест: `test_repo_to_architecture_ir` з імітованим API GitHub  
**Крок 2-5:** Цикл TDD  
**Крок 6:** Підключити до кінцевої точки `POST /analyze-repo`  
**Крок 7:** Протестувати: `curl -X POST http://localhost:8766/analyze-repo -d '{"owner":"maxfraieho","repo":"ai-drakon-setup","branch":"main"}'`  
**Крок 8:** Коміт: `feat: architect-agent repo structure → DRAKON IR analysis`

---

### Завдання 8: Автоматичний bootstrap при клонуванні нового проекту

**Файл:** `scripts/bootstrap.py`

```python
#!/usr/bin/env python3
"""Bootstrap script — run after cloning the repo on a new machine.
Creates required directories, checks env files, starts services."""
import os, subprocess, sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent

REQUIRED_DIRS = [
    "memory/architect",
    "memory/docs",
    "memory/shared",
    "services/drakon-agent/knowledge",
    "services/drakon-agent/.venv",
]

REQUIRED_ENV_FILES = [
    ("services/drakon-agent/.env.example", "services/drakon-agent/.env"),
    ("services/architect-agent/.env.example", "services/architect-agent/.env"),
    ("services/docs-agent/.env.example", "services/docs-agent/.env"),
]

def main():
    print("🚀 AI-DRAKON Bootstrap")
    
    for d in REQUIRED_DIRS:
        path = REPO_ROOT / d
        path.mkdir(parents=True, exist_ok=True)
        gitkeep = path / ".gitkeep"
        if not any(path.iterdir()) if path.exists() else True:
            gitkeep.touch()
    print("✅ Directories created")
    
    for src, dst in REQUIRED_ENV_FILES:
        src_path = REPO_ROOT / src
        dst_path = REPO_ROOT / dst
        if src_path.exists() and not dst_path.exists():
            import shutil
            shutil.copy(src_path, dst_path)
            print(f"✅ Created {dst} from example")
    
    for svc in ["drakon-agent", "architect-agent", "docs-agent"]:
        svc_path = REPO_ROOT / "services" / svc
        if svc_path.exists() and not (svc_path / ".venv").exists():
            print(f"  Setting up venv for {svc}...")
            subprocess.run([
                sys.executable, "-m", "venv", ".venv", "--system-site-packages"
            ], cwd=svc_path, check=True)
            subprocess.run([
                ".venv/bin/pip", "install", "-r", "requirements.txt"
            ], cwd=svc_path)
    print("✅ Virtual environments ready")
    print("")
    print("Next: edit .env files in each service, then run:")
    print("  cd services/drakon-agent && .venv/bin/python3 main.py &")
    print("  cd services/architect-agent && .venv/bin/python3 main.py &")
    print("  cd services/docs-agent && .venv/bin/python3 main.py &")

if __name__ == "__main__":
    main()
```

**Крок 1:** Написати тест для створення директорій bootstrap  
**Крок 2-5:** Цикл TDD  
**Крок 6:** Додати скрипт-обгортку `scripts/bootstrap.sh`:
```bash
#!/bin/bash
python3 "$(dirname "$0")/bootstrap.py" "$@"
```
**Крок 7:** Протестувати: `python3 scripts/bootstrap.py` при чистому клонуванні репозиторію  
**Крок 8:** Коміт: `feat: bootstrap.py auto-creates memory dirs + .env files`

---

## Сценарії використання (Use Cases)

### UC-1: "Поясни архітектуру цього репозиторію"

```
Користувач відкриває DiagramsPage → натискає кнопку "Agents" → вибирає вкладку "Architect"
Користувач пише: "Explain the overall architecture of the ai-drakon-setup repo"

Потік (Flow):
1. Фронтенд надсилає до drakon.agentchat { agent:"architect", message:"...", 
   context:{ fileTree: <github tree>, folderSlug:"architecture" }}
2. Воркер проксіює запит на http://localhost:8766/chat
3. architect-agent:
   a. retrieve_text(message) зі спільної KB → контекст правил DRAKON
   b. читає memory/architect/MEMORY.md → контекст попередніх рішень
   c. architect_chat(message, file_tree, memory) → відповідь LLM
4. Повертає: "The repo has 4 main layers: Frontend (React/CF Pages), 
   Worker (MCP broker), drakon-agent (AST analysis), MinIO (storage).
   
   Here's an architecture diagram I can create:
   [Розгорнути, щоб побачити diagram IR]
   [Apply as new diagram]"
5. Користувач натискає [Apply] → створює нову діаграму DRAKON у папці "architecture/"
```

### UC-2: "Онови документацію для кінцевої точки analyze"

```
Користувач відкриває вкладку Docs
Користувач пише: "The /analyze endpoint now supports refine=false parameter, update the docs"

Потік (Flow):
1. Воркер → http://localhost:8767/chat
2. docs-agent:
   a. retrieve_text з KB → правила API docs
   b. читає memory/docs/api-coverage.md
   c. docs_chat(message) → відповідь із запропонованим оновленням документації
3. Повертає: "Updated docs for POST /analyze:
   Added: refine (bool, default true) - set false to skip AI refiner
   Updated: example curl command
   
   [Apply to memory/docs/api-coverage.md]"
4. Користувач натискає [Apply] → docs-agent викликає save_memory() → git push
```

### UC-3: "Архітектор створює діаграму структури модуля"

```
Користувач відкриває вкладку Architect, вибирає папку "src/lib/htse" в дереві файлів
Користувач пише: "Create a DRAKON diagram showing the HTSE pipeline flow"

Потік (Flow):
1. architect-agent аналізує файли в src/lib/htse/
2. Визначає: ir-types → ir-validator-core → diagram-to-ir → ir-to-diagram
3. Генерує IrDiagram з вузлами action на модуль + question для валідації
4. Повертає діаграму + список мутацій
5. Користувач натискає [Apply] → drakon.mutatediagram → діаграма з'являється у папці "architecture/"
6. architect-agent зберігає резюме в memory/architect/diagrams-index.md
7. Робить пуш у git
```

### UC-4: "Новий розробник клонує репозиторій"

```
Розробник клонує ai-drakon-setup
Запускає: python3 scripts/bootstrap.py
Вивід:
  ✅ Directories created (memory/architect, memory/docs, memory/shared)
  ✅ Created .env files from examples
  ✅ Virtual environments ready

Розробник редагує .env файли (додає GITHUB_TOKEN, PROXY_URL)
Запускає сервіси:
  .venv/bin/python3 services/drakon-agent/main.py &   (порт 8765)
  .venv/bin/python3 services/architect-agent/main.py & (порт 8766)
  .venv/bin/python3 services/docs-agent/main.py &      (порт 8767)

При першому запуску кожен агент викликає ensure_agent_memory() →
створює memory/{agent}/MEMORY.md у репозиторії GitHub, якщо він відсутній →
розробник бачить чистий початковий стан у репозиторії
```

---

## Довідка щодо змінних оточення

### Усі сервіси (.env)
```
# OpenAI-сумісний проксі
PROXY_URL=http://localhost:18880/v1
PROXY_TOKEN=freecc
PROXY_MODEL=coding-proxy

# GitHub (для збереження пам'яті)
GITHUB_TOKEN=ghp_...
GITHUB_REPO=maxfraieho/ai-drakon-setup
GITHUB_BRANCH=main

# Директорія KB (відносно сервісу)
KB_DIR=../drakon-agent/knowledge
```

### Архітектурний агент (додатково)
```
PORT=8766
AGENT_NAME=architect
```

### Агент документації (додатково)
```
PORT=8767
AGENT_NAME=docs
```

### Секрети воркера Cloudflare (додати через wrangler)
```
ARCHITECT_AGENT_URL=http://192.168.3.184:8766
DOCS_AGENT_URL=http://192.168.3.184:8767
```

---

## Структура файлів після реалізації

```
ai-drakon-setup/
├── memory/                          # НОВЕ — пам'ять агентів з фіксацією в git
│   ├── architect/
│   │   ├── MEMORY.md
│   │   └── diagrams-index.md
│   ├── docs/
│   │   ├── MEMORY.md
│   │   └── api-coverage.md
│   └── shared/
│       ├── MEMORY.md
│       └── project-context.md
│
├── services/
│   ├── drakon-agent/               # існуючий (порт 8765)
│   │   ├── knowledge/              # СПІЛЬНА KB ← усі агенти читають
│   │   │   ├── drakon-ir-format.md
│   │   │   └── (Gemini KB файли 01-08)
│   │   ├── memory_manager.py       # НОВЕ — спільна утиліта
│   │   └── ...
│   │
│   ├── architect-agent/            # НОВИЙ (порт 8766)
│   │   ├── main.py
│   │   ├── analyzer/structure_analyzer.py
│   │   ├── ai_chat/architect_chat.py
│   │   ├── pyproject.toml
│   │   └── .env.example
│   │
│   └── docs-agent/                 # НОВИЙ (порт 8767)
│       ├── main.py
│       ├── ai_chat/docs_chat.py
│       ├── analyzer/doc_coverage.py
│       ├── pyproject.toml
│       └── .env.example
│
├── scripts/
│   ├── bootstrap.py                # НОВЕ
│   ├── bootstrap.sh                # НОВЕ
│   └── codetomd/...
│
├── src/
│   ├── components/
│   │   ├── agents/                 # НОВЕ
│   │   │   ├── AgentChatPanel.tsx
│   │   │   └── AgentMessage.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useAgentChat.ts         # НОВЕ
│   │   └── ...
│   └── pages/
│       └── DiagramsPage.tsx        # ЗМІНЕНО — додано бічну панель агентів
│
└── cloudflare-worker/
    └── worker-mcp-drakon.js        # ЗМІНЕНО — додано 4 нові інструменти MCP
```

---

## Обмеження та відомі проблеми

| Обмеження | Деталі |
|-----------|--------|
| Процесор AMD C-60 (без AVX) | Сервіси повинні використовувати `python3 -m venv .venv --system-site-packages` |
| Воркер на CF Edge | Сервіси агентів повинні бути доступні для Воркера (використовуйте ngrok або cloudflared для локальної розробки) |
| Єдиний GITHUB_TOKEN | Збереження пам'яті від усіх 3 агентів використовує один токен — ризик конфлікту запису в один файл |
| drakonwidget.js | НЕ модифікувати. Він не має зовнішніх залежностей і повинен залишатися без змін |
| Контракт формату IR | `IrDiagram.params` — це `string[]` у типах фронтенду, але `string` у drakon-agent — нормалізувати на межі |
| Зростання пам'яті агентів | Індекс `MEMORY.md` має залишатися ≤200 рядків; старі записи переміщуються в архівовані файли з датами |

---

## Швидка довідка: Ключові адреси

| Сервіс | Адреса | Авторизація |
|--------|--------|-------------|
| Фронтенд | https://ai-drakon-setup.pages.dev | JWT (сторінка входу) |
| Воркер MCP | https://drakon-antigravity-worker.maxfraieho.workers.dev/mcp | Bearer drakon-mcp-2026 |
| drakon-agent | http://192.168.3.184:8765 | немає (локально) |
| architect-agent | http://192.168.3.184:8766 | немає (локально) |
| docs-agent | http://192.168.3.184:8767 | немає (локально) |
| MinIO API | https://apiminio.exodus.pp.ua | MINIO_ACCESS_KEY=vokov / MINIO_SECRET_KEY=805235io |
| OpenAI Proxy | http://192.168.3.184:18880/v1 | Bearer freecc |

---

## Порядок виконання

1. **Завдання 1** — `memory_manager.py` (основа для збереження)
2. **Завдання 8** — `bootstrap.py` (запуск один раз на кожному новому клоні)
3. **Завдання 2** — сервіс `architect-agent`
4. **Завдання 3** — сервіс `docs-agent`
5. **Завдання 4** — кінцеві точки внесків до KB
6. **Завдання 5** — нові інструменти воркера MCP
7. **Завдання 6** — фронтенд `AgentChatPanel`
8. **Завдання 7** — аналіз структури репозиторію Architect

Кожне завдання можна розгортати незалежно. Починайте із Завдань 1+8 (чистий Python, жодних залежностей від інших завдань).

---

## Семантичні зв'язки
**Цей документ є частиною:** [[plans/_INDEX]]

**Цей документ пов'язаний з:**
- [[plans/2026-05-12-platform-redesign-proposal]] — наступний розділ (2026 05 12 platform redesign proposal)