---
title: "Multi-Agent DRAKON System — Implementation Plan"
type: plan
tags: [drakon, agent, cloudflare, frontend, typescript]
status: active
created: 2026-05-12
updated: 2026-05-26
---

# Multi-Agent DRAKON System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the AI-DRAKON platform with two specialist agents (Architect + Docs) that share a knowledge base with the existing `drakon-agent`, communicate through a unified chat UI, and persist their memory to the git repository.

**Architecture:** Three FastAPI agents sharing one BM25 knowledge base directory; each agent has a `memory/` sub-namespace in the repo; the Cloudflare Worker exposes new MCP tools for the agents; the React frontend adds `AgentChatPanel` components wired to the existing `DiagramsPage`.

**Tech Stack:** Python 3.11 FastAPI (agents), TypeScript/React (frontend), Cloudflare Worker (MCP broker), MinIO (diagrams), GitHub API (memory persistence), BM25Okapi (KB retrieval).

---

## Executive Summary

### Current State (2026-05-12)

The platform has three working layers:

```
┌─────────────────────────────────────────────────┐
│  FRONTEND (CF Pages → ai-drakon-setup.pages.dev) │
│  React 19 / TanStack Router / Zustand            │
│  DiagramsPage: folder tree + DRAKON diagram grid │
│  DiagramEditorPage: drakonwidget.js editor        │
└───────────────┬─────────────────────────────────┘
                │ MCP HTTP (Authorization: Bearer drakon-mcp-2026)
┌───────────────▼─────────────────────────────────┐
│  CLOUDFLARE WORKER (drakon-mcp-worker)            │
│  drakon.listdiagrams / savediagram / deletediagram│
│  drakon.validateir / mutatediagram               │
│  drakon.analyzecodebase (→ AST microservice)     │
│  drakon.savetogit / listgitdiagrams / getgitdiagram│
│  drakon.diffcodevsdiagram                        │
└───────┬───────────────────────────────┬──────────┘
        │                               │
┌───────▼────────┐            ┌─────────▼──────────┐
│  MinIO S3      │            │  GitHub API         │
│  apiminio.…ua  │            │  drn/ folder in repos│
│  bucket=drakon │            │  memory/*.md files  │
└────────────────┘            └────────────────────┘

┌─────────────────────────────────────────────────┐
│  DRAKON-AGENT (192.168.3.184:8765)               │
│  FastAPI + Python AST analyzer                   │
│  BM25 knowledge base (knowledge/*.md)            │
│  AI refiner → proxy :18880 (coding-proxy model)  │
│  Validator (b0/end/question/action integrity)    │
│  POST /analyze  GET /health  POST /feedback      │
└─────────────────────────────────────────────────┘
```

### DRAKON IR Contract (canonical, never break)

```typescript
// src/lib/htse/ir-types.ts — the single source of truth
interface IrItem {
  type: "action"|"question"|"select"|"case"|"header"|"end"|
        "address"|"branch"|"insertion"|"input"|"output"|
        "shelf"|"process"|"timer"|"duration";
  content: string;
  one?: string;   // next / YES branch
  two?: string;   // NO branch (questions only)
  side?: string;
  branchId?: string;
}
interface IrDiagram {
  name: string;
  access: "public"|"private";
  params: string[];       // array in frontend, string in drakon-agent (legacy)
  items: Record<string, IrItem>;
}
```

**Rule:** `b0` (type: "branch", branchId: 0) MUST exist. `end` (type: "end") MUST exist. Without `b0`, drakonwidget renders only the header, no flowchart.

---

## Vision: Multi-Agent Platform

### Three Agents, One UI

```
┌──────────────────────────────────────────────────────────────────┐
│  AI-DRAKON UI  (DiagramsPage — main screen)                       │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────────────────────────┐  │
│  │ Folder Tree      │  │  Agent Chat Sidebar                  │  │
│  │ (GitHub repo)   │  │  ┌──────────┬──────────┬──────────┐  │  │
│  │                 │  │  │Architect │  Docs    │ Editor   │  │  │
│  │ project/        │  │  └──────────┴──────────┴──────────┘  │  │
│  │  ├─ src/        │  │  [Chat messages + suggested actions]  │  │
│  │  │   └─ *.py   │  │  [Apply] [Reject] [Ask follow-up]    │  │
│  │  └─ docs/       │  └──────────────────────────────────────┘  │
│  └─────────────────┘                                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  DRAKON Diagram Grid (folders + diagram thumbnails)       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Agent Roles

| Agent | Port | Responsibility | Zone of Change |
|-------|------|----------------|----------------|
| **drakon-agent** (existing) | 8765 | Python AST → DRAKON IR | `POST /analyze` diagrams |
| **architect-agent** (new) | 8766 | Project structure, module diagrams, architecture decisions | `memory/architect/*.md`, project DRAKON diagrams in `architecture/` folder |
| **docs-agent** (new) | 8767 | Documentation management, API docs, README generation | `memory/docs/*.md`, docs DRAKON diagrams in `documentation/` folder |

### Memory Architecture (git-persisted)

Each agent has its own namespace in the repo's `memory/` directory:

```
memory/
├── architect/
│   ├── MEMORY.md          # index (≤200 lines)
│   ├── project-structure.md
│   ├── decisions/         # ADR-style records
│   │   └── 2026-05-12-use-fastapi.md
│   └── diagrams-index.md  # which diagrams represent what
├── docs/
│   ├── MEMORY.md
│   ├── api-coverage.md    # which endpoints are documented
│   ├── glossary.md
│   └── documentation-map.md
└── shared/
    ├── MEMORY.md
    └── project-context.md # project-level facts both agents need
```

**Bootstrap rule:** If `memory/` doesn't exist in a cloned repo, agents create it and push a first commit automatically on startup.

### Shared Knowledge Base

All three agents READ from `services/drakon-agent/knowledge/`:

```
services/drakon-agent/knowledge/
├── drakon-ir-format.md        # existing
├── 01-diagram-types.md        # from Gemini KB research (planned)
├── 02-icon-semantics.md
├── 03-content-labeling.md
├── 04-ast-mapping.md
├── 05-rightward-degradation.md
├── 06-validation-metrics.md
├── 07-code-patterns.md
└── 08-bm25-index.md
```

**Architect-agent additionally reads:** `memory/architect/` for project-specific context.
**Docs-agent additionally reads:** `memory/docs/` + `memory/shared/`.

### MCP Tool Extensions (new Worker tools)

New tools needed in the Cloudflare Worker:

```javascript
// New tools to add to worker-mcp-drakon.js:

drakon.listmemory      // { agent: "architect"|"docs"|"shared" } → memory file list
drakon.getmemory       // { agent, file } → file content
drakon.savememory      // { agent, file, content, commitMsg } → git push
drakon.listproject     // { owner, repo, branch, path? } → recursive file tree
drakon.getfile         // { owner, repo, branch, path } → file content
drakon.agentchat       // { agent, message, context } → proxied to agent service
```

---

## Implementation Tasks

### Task 1: Repository Memory Bootstrap System

**Files:**
- Create: `services/drakon-agent/memory_manager.py`
- Create: `memory/.gitkeep` (placeholder)
- Create: `memory/shared/MEMORY.md`
- Create: `memory/shared/project-context.md`

**What it does:** On agent startup, check if `memory/{agent_name}/` exists in the GitHub repo. If not, create it with empty `MEMORY.md`. Push initial commit.

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
        return False  # already exists
    
    # Create initial MEMORY.md
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
    
    # Get current SHA if file exists (needed for update)
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

**Step 1:** Write test: `pytest services/drakon-agent/tests/test_memory_manager.py::test_ensure_creates_namespace`  
**Step 2:** Run test → FAIL  
**Step 3:** Implement `ensure_agent_memory()` + `save_memory()` + `get_memory()`  
**Step 4:** Run test → PASS  
**Step 5:** Commit: `feat: add memory_manager for git-persisted agent memory`

---

### Task 2: Architect Agent Service

**Files:**
- Create: `services/architect-agent/main.py`
- Create: `services/architect-agent/analyzer/structure_analyzer.py`
- Create: `services/architect-agent/ai_chat/architect_chat.py`
- Create: `services/architect-agent/pyproject.toml`
- Create: `services/architect-agent/.env.example`
- Create: `memory/architect/MEMORY.md` (bootstrap)

**API:**
```
GET  /health
POST /chat          { message, context: { file_tree?, current_diagram? } } → { reply, suggested_mutations? }
POST /analyze-repo  { owner, repo, branch } → { architecture_diagrams: IrDiagram[] }
POST /memory/save   { file, content, commit_msg } → { success }
GET  /memory/list   → { files: string[] }
GET  /memory/get    { file } → { content }
```

**Core logic — `architect_chat.py`:**
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
    
    # Try to extract MutationOp JSON if present
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

**Step 1:** Write test for `architect_chat` with mocked proxy  
**Step 2:** Run test → FAIL  
**Step 3:** Implement `architect_chat.py`  
**Step 4:** Run test → PASS  
**Step 5:** Implement `main.py` (FastAPI with /health, /chat, /analyze-repo, /memory/*)  
**Step 6:** Start service: `cd services/architect-agent && .venv/bin/python3 main.py`  
**Step 7:** Smoke test: `curl http://localhost:8766/health`  
**Step 8:** Commit: `feat: architect-agent service (port 8766) with chat + memory API`

---

### Task 3: Docs Agent Service

**Files:**
- Create: `services/docs-agent/main.py`
- Create: `services/docs-agent/ai_chat/docs_chat.py`
- Create: `services/docs-agent/analyzer/doc_coverage.py`
- Create: `memory/docs/MEMORY.md` (bootstrap)

**API:**
```
GET  /health
POST /chat          { message, context: { file_tree?, current_doc? } } → { reply, doc_suggestions? }
POST /analyze-docs  { owner, repo, branch } → { coverage_report, missing_docs: string[] }
POST /memory/save   { file, content, commit_msg } → { success }
GET  /memory/list   → { files: string[] }
```

**Core logic — `doc_coverage.py`:**
```python
"""Analyze which files/functions lack documentation."""
import re

def analyze_doc_coverage(file_tree: dict) -> dict:
    """Given GitHub file tree, find Python files without docstrings."""
    py_files = [f for f in file_tree.get("tree", []) if f.get("path","").endswith(".py")]
    missing = []
    for f in py_files:
        path = f["path"]
        # Heuristic: files in src/ without corresponding docs/ entry
        if path.startswith("src/") and not any(
            d["path"].startswith(f"docs/{path.replace('src/','').replace('.py','')}") 
            for d in file_tree.get("tree", [])
        ):
            missing.append(path)
    return {"py_files": len(py_files), "missing_docs": missing[:20]}
```

**Step 1-8:** Same pattern as Task 2 but for docs-agent (port 8767)  
**Step 9:** Commit: `feat: docs-agent service (port 8767) with chat + doc coverage`

---

### Task 4: Knowledge Base Contribution Endpoints

Each agent adds context to the shared KB. Add to both architect-agent and docs-agent:

**Files:**
- Modify: `services/architect-agent/main.py` — add `POST /kb/contribute`
- Modify: `services/docs-agent/main.py` — add `POST /kb/contribute`
- Shared lib: `services/shared/kb_writer.py` (symlinked or copied)

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
        return str(path)  # unchanged
    with open(path, "w") as f:
        f.write(f"<!-- contributed by {agent_name} -->\n{content}")
    return str(path)
```

**Step 1:** Write test for `contribute_to_kb`  
**Step 2:** Run → FAIL  
**Step 3:** Implement  
**Step 4:** Run → PASS  
**Step 5:** Add endpoint to both agents  
**Step 6:** Commit: `feat: KB contribution endpoint for architect+docs agents`

---

### Task 5: New MCP Tools in Cloudflare Worker

**File:** `cloudflare-worker/worker-mcp-drakon.js`

Add to `tools/list` response and `tools/call` handler:

```javascript
// New tool definitions (add to the tools array ~line 1170):

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

// Handler (add to tools/call switch ~line 1530):
if (name === 'drakon.agentchat') {
  const { agent, message, context = {} } = params;
  const portMap = { architect: 8766, docs: 8767 };
  const port = portMap[agent];
  if (!port) return errorResponse('Unknown agent', 400);
  
  // In production: use internal service URL, not localhost
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
  // Reuse existing savetogit logic but for memory path
  const result = await saveFileToGit(env, {
    owner: 'maxfraieho', repo: 'ai-drakon-setup',
    branch: 'main', path, content, message: commit_msg
  }, requestToken);
  return jsonResponse(result);
}
```

**Step 1:** Test current worker locally or via curl  
**Step 2:** Add tool definitions  
**Step 3:** Add handlers  
**Step 4:** Deploy: `CLOUDFLARE_API_TOKEN=<token> npx wrangler@latest deploy`  
**Step 5:** Test: `curl -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp -H "Authorization: Bearer drakon-mcp-2026" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`  
**Step 6:** Verify new tools appear in list  
**Step 7:** Commit: `feat: worker MCP tools for agent memory + chat routing`

---

### Task 6: Frontend — AgentChatPanel Component

**Files:**
- Create: `src/components/agents/AgentChatPanel.tsx`
- Create: `src/components/agents/AgentMessage.tsx`
- Create: `src/hooks/useAgentChat.ts`
- Modify: `src/pages/DiagramsPage.tsx` — add agent sidebar

**`AgentChatPanel.tsx` structure:**
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

**`AgentMessage.tsx`** — renders agent reply with optional "Apply mutations" button:
```typescript
// Detects if message.suggested_mutations exists → shows [Apply] button
// [Apply] → calls mcpCall("drakon.mutatediagram", { mutations })
// Shows mutations as collapsible JSON preview
```

**`useAgentChat.ts`:**
```typescript
// Calls mcpCall("drakon.agentchat", { agent, message, context })
// Maintains message history array
// Returns { messages, sendMessage, isLoading }
```

**Modify DiagramsPage.tsx:** Add agent sidebar as a Sheet/Panel:
```typescript
// Add to DiagramsPage:
// - State: agentSidebarOpen, activeAgent: "architect"|"docs"|null
// - Button in toolbar: <Bot /> "Agents" → opens Sheet
// - Sheet content: Tabs ["Architect" | "Docs"]
// - Each tab: <AgentChatPanel agent={...} projectContext={{fileTree: githubFileTree, folderSlug}} />
```

**Step 1:** Create `AgentChatPanel.tsx` with hardcoded mock messages  
**Step 2:** Add to DiagramsPage behind a sidebar toggle button  
**Step 3:** Verify it renders in browser  
**Step 4:** Create `useAgentChat.ts` wired to `drakon.agentchat` MCP tool  
**Step 5:** Test sending a real message to architect-agent  
**Step 6:** Add `AgentMessage.tsx` with mutation Apply button  
**Step 7:** Test applying suggested mutations to current diagram  
**Step 8:** Commit: `feat: AgentChatPanel + useAgentChat hook in DiagramsPage sidebar`

---

### Task 7: Architect Agent — Project Structure Analysis

**File:** `services/architect-agent/analyzer/structure_analyzer.py`

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
    
    # Group by top-level directory
    dirs = {}
    for n in nodes:
        top = n.path.split("/")[0] if "/" in n.path else n.path
        dirs.setdefault(top, []).append(n)
    
    # Build DRAKON IR: one action per top-level module
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
    
    # Chain nodes
    for i, nid in enumerate(node_ids):
        items[nid]["one"] = node_ids[i+1] if i+1 < len(node_ids) else "end"
    
    items["b0"] = {"type": "branch", "branchId": 0, "one": node_ids[0] if node_ids else "end"}
    
    return {
        "name": f"{repo} Architecture",
        "params": "",
        "items": items,
    }
```

**Step 1:** Write test: `test_repo_to_architecture_ir` with mocked GitHub API  
**Step 2-5:** TDD cycle  
**Step 6:** Wire into `POST /analyze-repo` endpoint  
**Step 7:** Test: `curl -X POST http://localhost:8766/analyze-repo -d '{"owner":"maxfraieho","repo":"ai-drakon-setup","branch":"main"}'`  
**Step 8:** Commit: `feat: architect-agent repo structure → DRAKON IR analysis`

---

### Task 8: Auto-Bootstrap on New Project Clone

**File:** `scripts/bootstrap.py`

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

**Step 1:** Write test for bootstrap directory creation  
**Step 2-5:** TDD cycle  
**Step 6:** Add `scripts/bootstrap.sh` wrapper:
```bash
#!/bin/bash
python3 "$(dirname "$0")/bootstrap.py" "$@"
```
**Step 7:** Test: `python3 scripts/bootstrap.py` on clean checkout  
**Step 8:** Commit: `feat: bootstrap.py auto-creates memory dirs + .env files`

---

## Use Cases

### UC-1: "Explain the architecture of this repo"

```
User opens DiagramsPage → clicks "Agents" button → selects "Architect" tab
User types: "Explain the overall architecture of the ai-drakon-setup repo"

Flow:
1. Frontend sends to drakon.agentchat { agent:"architect", message:"...", 
   context:{ fileTree: <github tree>, folderSlug:"architecture" }}
2. Worker proxies to http://localhost:8766/chat
3. architect-agent:
   a. retrieve_text(message) from shared KB → DRAKON rules context
   b. read memory/architect/MEMORY.md → previous decisions context
   c. architect_chat(message, file_tree, memory) → LLM response
4. Returns: "The repo has 4 main layers: Frontend (React/CF Pages), 
   Worker (MCP broker), drakon-agent (AST analysis), MinIO (storage).
   
   Here's an architecture diagram I can create:
   [Expand to see diagram IR]
   [Apply as new diagram]"
5. User clicks [Apply] → creates new DRAKON diagram in "architecture/" folder
```

### UC-2: "Update docs for the analyze endpoint"

```
User opens Docs tab
User types: "The /analyze endpoint now supports refine=false parameter, update the docs"

Flow:
1. Worker → http://localhost:8767/chat
2. docs-agent:
   a. retrieve_text from KB → API docs rules
   b. read memory/docs/api-coverage.md
   c. docs_chat(message) → response with suggested doc update
3. Returns: "Updated docs for POST /analyze:
   Added: refine (bool, default true) - set false to skip AI refiner
   Updated: example curl command
   
   [Apply to memory/docs/api-coverage.md]"
4. User clicks [Apply] → docs-agent calls save_memory() → git push
```

### UC-3: "Architect creates module structure diagram"

```
User opens Architect tab, selects folder "src/lib/htse" in file tree
User types: "Create a DRAKON diagram showing the HTSE pipeline flow"

Flow:
1. architect-agent analyzes files in src/lib/htse/
2. Identifies: ir-types → ir-validator-core → diagram-to-ir → ir-to-diagram
3. Generates IrDiagram with action nodes per module + question for validation
4. Returns diagram + mutation list
5. User clicks [Apply] → drakon.mutatediagram → diagram appears in "architecture/" folder
6. architect-agent saves summary to memory/architect/diagrams-index.md
7. Pushes to git
```

### UC-4: "New developer clones repo"

```
Developer clones ai-drakon-setup
Runs: python3 scripts/bootstrap.py
Output:
  ✅ Directories created (memory/architect, memory/docs, memory/shared)
  ✅ Created .env files from examples
  ✅ Virtual environments ready

Developer edits .env files (adds GITHUB_TOKEN, PROXY_URL)
Starts services:
  .venv/bin/python3 services/drakon-agent/main.py &   (port 8765)
  .venv/bin/python3 services/architect-agent/main.py & (port 8766)
  .venv/bin/python3 services/docs-agent/main.py &      (port 8767)

On first startup, each agent calls ensure_agent_memory() →
creates memory/{agent}/MEMORY.md in GitHub repo if missing →
developer sees clean starting state in repo
```

---

## Environment Variables Reference

### All Services (.env)
```
# OpenAI-compatible proxy
PROXY_URL=http://localhost:18880/v1
PROXY_TOKEN=freecc
PROXY_MODEL=coding-proxy

# GitHub (for memory persistence)
GITHUB_TOKEN=ghp_...
GITHUB_REPO=maxfraieho/ai-drakon-setup
GITHUB_BRANCH=main

# KB directory (relative to service)
KB_DIR=../drakon-agent/knowledge
```

### Architect Agent (extra)
```
PORT=8766
AGENT_NAME=architect
```

### Docs Agent (extra)
```
PORT=8767
AGENT_NAME=docs
```

### Cloudflare Worker Secrets (add via wrangler)
```
ARCHITECT_AGENT_URL=http://192.168.3.184:8766
DOCS_AGENT_URL=http://192.168.3.184:8767
```

---

## File Structure After Implementation

```
ai-drakon-setup/
├── memory/                          # NEW — git-persisted agent memory
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
│   ├── drakon-agent/               # existing (port 8765)
│   │   ├── knowledge/              # SHARED KB ← all agents read
│   │   │   ├── drakon-ir-format.md
│   │   │   └── (Gemini KB files 01-08)
│   │   ├── memory_manager.py       # NEW — shared utility
│   │   └── ...
│   │
│   ├── architect-agent/            # NEW (port 8766)
│   │   ├── main.py
│   │   ├── analyzer/structure_analyzer.py
│   │   ├── ai_chat/architect_chat.py
│   │   ├── pyproject.toml
│   │   └── .env.example
│   │
│   └── docs-agent/                 # NEW (port 8767)
│       ├── main.py
│       ├── ai_chat/docs_chat.py
│       ├── analyzer/doc_coverage.py
│       ├── pyproject.toml
│       └── .env.example
│
├── scripts/
│   ├── bootstrap.py                # NEW
│   ├── bootstrap.sh                # NEW
│   └── codetomd/...
│
├── src/
│   ├── components/
│   │   ├── agents/                 # NEW
│   │   │   ├── AgentChatPanel.tsx
│   │   │   └── AgentMessage.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useAgentChat.ts         # NEW
│   │   └── ...
│   └── pages/
│       └── DiagramsPage.tsx        # MODIFIED — add agent sidebar
│
└── cloudflare-worker/
    └── worker-mcp-drakon.js        # MODIFIED — add 4 new MCP tools
```

---

## Constraints & Known Issues

| Constraint | Detail |
|-----------|--------|
| AMD C-60 CPU (no AVX) | Services must use `python3 -m venv .venv --system-site-packages` |
| Worker runs at CF edge | Agent services must be callable from Worker (use ngrok or cloudflared for local dev) |
| Single GITHUB_TOKEN | Memory pushes from all 3 agents share one token — risk of write conflict on same file |
| drakonwidget.js | Do NOT modify. It has no external deps and must stay as-is |
| IR format contract | `IrDiagram.params` is `string[]` in frontend types, but `string` in drakon-agent — normalize at boundary |
| Agent memory growth | `MEMORY.md` index must stay ≤200 lines; old entries move to dated archive files |

---

## Quick Reference: Key Addresses

| Service | Address | Auth |
|---------|---------|------|
| Frontend | https://ai-drakon-setup.pages.dev | JWT (login page) |
| Worker MCP | https://drakon-mcp-worker.maxfraieho.workers.dev/mcp | Bearer drakon-mcp-2026 |
| drakon-agent | http://192.168.3.184:8765 | none (local) |
| architect-agent | http://192.168.3.184:8766 | none (local) |
| docs-agent | http://192.168.3.184:8767 | none (local) |
| MinIO API | https://apiminio.exodus.pp.ua | MINIO_ACCESS_KEY=vokov / MINIO_SECRET_KEY=805235io |
| OpenAI Proxy | http://192.168.3.184:18880/v1 | Bearer freecc |

---

## Execution Order

1. **Task 1** — memory_manager.py (foundation for all persistence)
2. **Task 8** — bootstrap.py (run once on each new clone)
3. **Task 2** — architect-agent service
4. **Task 3** — docs-agent service  
5. **Task 4** — KB contribution endpoints
6. **Task 5** — Worker new MCP tools
7. **Task 6** — Frontend AgentChatPanel
8. **Task 7** — Architect repo analysis

Each task is independently deployable. Start with Task 1+8 (pure Python, no dependencies on other tasks).
