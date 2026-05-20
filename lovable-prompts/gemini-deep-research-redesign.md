# Deep Research Prompt for Gemini Pro
# AI-DRAKON Platform — Complete Redesign Analysis & Implementation Proposal

---

## Your Task

You are a senior product engineer and UX architect. I need you to deeply analyze the current state of a development platform, understand its workflows, and propose a complete redesign + implementation plan.

This is not a generic "make it pretty" request. I need you to understand the actual human+AI collaborative development workflow and design an interface that makes it feel natural and powerful.

Read everything carefully. Think about edge cases. Propose concrete implementations with code.

---

## 1. Platform Overview

**AI-DRAKON** is a web-based AI-assisted development platform. It combines:
- A DRAKON flowchart editor (DRAKON is a visual programming language originally from Soviet space programs — it represents algorithms as structured flowcharts)
- 3 AI agents working as a pipeline
- GitHub integration
- Documentation viewer
- Project management

**Live URL:** https://ai-drakon-setup.pages.dev  
**Tech stack:** React 18 + TypeScript + Vite + TanStack Router + Tailwind CSS + shadcn/ui  
**Hosting:** Cloudflare Pages  
**Backend:** Cloudflare Worker (proxy) → 3 FastAPI agents on local server (192.168.3.184)

### Current page structure:
```
WorkspaceShell (layout wrapper)
├── Left sidebar (220px)
│   ├── ProjectSelector — active project + switcher
│   ├── Navigation (Diagrams, Notes, Sync, GitHub, Agents, Settings)
│   └── DevCyclePanel — placeholder showing Pipeline A/B status
├── /diagrams — DRAKON editor with left panel (folder/diagram list + DRAKON IR tab)
├── /docs — Notes/documentation viewer
├── /sync — Currently: sync status page (CANDIDATE FOR REPLACEMENT)
├── /github — GitHub file browser
├── /agents — Agent pipeline UI (LangGraph visualization)
└── /settings — Settings page
```

---

## 2. The 3 AI Agents

All agents run on 192.168.3.184, exposed via Cloudflare tunnel:

**1. docs-agent (:8767)**
- Generates documentation from code
- CRUD for notes/docs in git
- Lists available projects
- Serves DRAKON IR JSON files

**2. architect-agent (:8766)**  
- **Pipeline A (Refactoring):** Takes existing code → analyzes structure → generates DRAKON IR JSON
- **Pipeline B (New Development):** Takes DRAKON IR → generates code skeleton
- Understands project architecture

**3. drakon-agent (:8765)**
- Converts AST/code to DRAKON IR
- Validates DRAKON diagrams
- Generates DRAKON IR from natural language descriptions

### DRAKON IR format:
```json
{
  "name": "processPayment",
  "params": ["amount", "userId"],
  "items": {
    "1": {"type": "start", "content": "processPayment", "one": "2"},
    "2": {"type": "action", "content": "validate amount > 0", "one": "3"},
    "3": {"type": "question", "content": "user exists?", "one": "4", "two": "5"},
    "4": {"type": "action", "content": "deduct balance", "one": "6"},
    "5": {"type": "action", "content": "return error", "one": "6"},
    "6": {"type": "end", "content": ""}
  }
}
```

---

## 3. Direct Claude Access (CodeProxy)

There are two endpoints that proxy directly to Claude API (Anthropic-compatible):
- `https://claude.exodus.pp.ua` — RPi 3b (192.168.3.234:3456)
- `https://claude2.exodus.pp.ua` — OrangePi PC2 (192.168.3.161:3456)

These use OpenAI-compatible API format:
```
POST /v1/chat/completions
Authorization: Bearer <slot-key>
Content-Type: application/json

{
  "model": "claude-sonnet-4-6",
  "messages": [{"role": "user", "content": "..."}],
  "stream": true
}
```

**This means the web UI can chat DIRECTLY with Claude** without going through the agent pipeline. This is important for the human-Claude collaboration workflow described below.

---

## 4. The Two Development Scenarios

### Scenario A: Refactoring Existing Code

Human has existing messy code and wants to understand + improve it.

```
Step 1: Human selects project (e.g., "code-proxy")
Step 2: Human picks a file or folder in GitHub browser
Step 3: Human asks Claude (direct): "Help me understand this code's logic"
Step 4: Claude and Human discuss the code in chat
Step 5: Human/Claude decide: "let's make DRAKON diagrams"
Step 6: architect-agent analyzes the code → generates DRAKON IR JSON
Step 7: DRAKON IR appears in the Diagrams page (DRAKON IR tab)
Step 8: Human reviews diagrams in the DRAKON editor
Step 9: Human chats with drakon-agent IN the diagram editor: "rename this node", "add error branch"
Step 10: drakon-agent modifies DRAKON IR
Step 11: architect-agent generates new code from updated DRAKON IR
Step 12: Human reviews code in code editor panel
Step 13: Code gets committed to GitHub
```

### Scenario B: New Feature Development

Human wants to build something new from scratch.

```
Step 1: Human selects project
Step 2: Human opens DRAKON editor
Step 3: Human chats with Claude (direct): "I want to add rate limiting to the proxy"
Step 4: Claude helps design the algorithm as a DRAKON diagram
Step 5: Human and Claude refine the diagram through chat
Step 6: drakon-agent creates the DRAKON IR JSON from the conversation
Step 7: Human reviews the diagram in the DRAKON editor
Step 8: Human asks architect-agent to generate code
Step 9: Code appears in code editor
Step 10: Human reviews, tweaks, commits
```

---

## 5. Current Problems

### Problem 1: Views don't react to active project
When the user switches from "Sharon Global" to "Code Proxy" in the sidebar:
- GitHub browser still shows Sharon Global's repo
- Docs viewer still shows Sharon Global's notes
- DRAKON IR tab still shows Sharon Global's IR files
- Vector/knowledge graph still shows Sharon Global

Each page reads from its own hardcoded settings or localStorage. The `activeProject` from `ProjectContext` is not wired to any of these pages.

### Problem 2: No direct Claude chat
The platform has an "Agent Chat" sidebar, but it only routes to the 3 pipeline agents. There's no way to have a direct, contextual conversation with Claude that's aware of what the user is currently looking at (current file, current diagram, current code).

### Problem 3: Dev Cycle is invisible
There's a `DevCyclePanel` placeholder in the sidebar but it shows no meaningful state. The user doesn't know if they're in "Scenario A" or "Scenario B", what step they're on, or what to do next.

### Problem 4: No code editor
After the agents generate code, there's nowhere to view/edit it in the platform. The user has to switch to an external editor.

### Problem 5: Sync tab is useless
The `/sync` page exists but provides minimal value. This space should be repurposed.

---

## 6. Project Context Data Model

Each project now has GitHub metadata:
```typescript
interface Project {
  slug: string;           // "sharon-global"
  name: string;           // "Sharon Global"
  description: string;
  path: string;           // "/home/vokov/workspace/sharon-global"
  hasDrakonIr: boolean;
  hasDocs: boolean;
  exists: boolean;        // server path actually exists
  github?: {
    owner: string;        // "maxfraieho"
    repo: string;         // "sharon-global"
    branch: string;       // "main"
  };
}
```

---

## 7. What I Want You To Design

### 7.1 Complete redesign of the Dev Cycle tab (replace /sync)

This should be the **command center** for active development. Design it to:

1. **Show active scenario** — A (Refactoring) or B (New Development) — with a clear visual distinction
2. **Show current step** in the workflow with status indicators (done/in-progress/pending)
3. **Provide context-aware action buttons** — e.g., "Analyze with Architect" should be clickable when code is selected; "Generate Code" should be clickable when DRAKON IR is ready
4. **Show pipeline status** — are the agents running, idle, queued?
5. **Link steps to views** — clicking "Review Diagrams" should navigate to the right diagram

### 7.2 Claude Direct Chat Panel

Design a **context-aware chat panel** that:
1. Uses CodeProxy (claude.exodus.pp.ua) — OpenAI-compatible streaming API
2. Shows what context is being sent (current file path, current diagram name, etc.)
3. Has a "context picker" — user can attach: current file from GitHub browser, current DRAKON diagram, current code from code editor
4. Supports streaming responses
5. Can be opened as a sidebar (right side, like the current agent chat) or as a split view in the DRAKON editor
6. Has "send to agent" buttons — e.g., "Send this plan to architect-agent" or "Send this diagram spec to drakon-agent"

### 7.3 DRAKON Editor Enhancement

The DRAKON editor (`/diagrams`) should:
1. Have its own **agent chat sidebar** — specifically for drakon-agent
2. Chat context automatically includes the current diagram's JSON
3. drakon-agent responses can include "apply this change" buttons
4. Support chat commands like: "rename node 3 to 'validate input'", "add a decision branch after node 4"

### 7.4 Code Editor Integration

Add a code editor view (Monaco Editor or CodeMirror) that:
1. Can show files fetched from GitHub
2. Can show code generated by architect-agent
3. Has a "commit to GitHub" button
4. Has a "send to Claude" button (attaches file content to Claude chat)
5. Can be shown as a split panel next to the DRAKON editor (side by side workflow)

### 7.5 Universal Project Binding

ALL pages must react when `activeProject` changes:
- `/github` → updates owner/repo/branch from `activeProject.github`
- `/docs` → filters notes/docs for active project path
- `/diagrams` DRAKON IR tab → uses `?project=activeProject.slug`
- Knowledge graph → uses active project
- Dev Cycle → shows pipeline status for active project

---

## 8. Design Constraints & Requirements

### Technical:
- React + TypeScript — no framework changes
- State management: React Context (no Redux/Zustand)
- UI components: shadcn/ui already installed
- Icons: lucide-react
- CSS variables already defined: `--bg-base`, `--bg-surface`, `--bg-elevated`, `--accent-amber`, `--border-subtle`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent-dim`
- Streaming: use native fetch + ReadableStream (no extra libs)
- No new npm packages unless absolutely necessary

### Aesthetic:
- Dark theme by default (military/terminal aesthetic)
- Amber (#f59e0b) as primary accent
- Monospace font throughout (font-mono)
- Dense, information-rich but not cluttered
- Compact: 32px topbar, 220px sidebar, everything else is content

### Performance:
- Server is a weak ARM device — don't spawn heavy polling
- Prefer event-driven over polling
- Lazy load the code editor (it's large)

---

## 9. What I Need From You

Please provide:

### A. Analysis
1. Which of the current pages/components need the most surgery vs. just wiring `useProject`?
2. What's the minimal set of changes to fix "Problem 1" (project binding)?
3. How should CodeProxy authentication work in the frontend? (slot keys, where stored, how rotated)

### B. Architecture Proposal
1. How should the "Dev Cycle" state machine work? (state = {scenario, currentStep, stepStatuses, pipelineJobs})
2. Where should this state live? (ProjectContext extension? Separate DevCycleContext?)
3. How should the Claude chat context be assembled? (what to include, how to truncate large files)

### C. Implementation — provide full working code for:

1. **`DevCycleContext.tsx`** — state machine for scenarios A and B
2. **`DevCyclePage.tsx`** (replaces `/sync`) — the command center view
3. **`ClaudeChat.tsx`** — the direct Claude chat component with streaming + context attachment
4. **Fix for `/routes/github.tsx`** — wire `useProject` so GitHub tab reacts to project changes
5. **`useCodeProxy.ts`** — a hook that handles streaming chat with CodeProxy

### D. Lovable Prompts
Write 2-3 precise Lovable prompts (the AI frontend builder we use) that implement these changes. Each prompt must:
- Be self-contained (Lovable has no memory between prompts)
- Reference exact file paths
- Include complete replacement code (not just descriptions)
- Be in Ukrainian or Russian (Lovable understands both)

---

## 10. Additional Context: The Human-Claude Collaboration Model

The human (Q) described this workflow vision:

> "I write DRAKON diagrams, give you (Claude) links to them, you use them for coding. In the reverse process (refactoring), I get raw DRAKON schemas from the machine, refine them with you in dialog, we give tasks to the architect agent, it fixes the tree/structure of schemas, the DRAKON agent writes changes to the DRAKON schemas from chat within the DRAKON editor."

This tells us:
- The human sees Claude as a **collaborator**, not just a tool
- The DRAKON editor should have Claude chat built-in (not as a separate tab)
- Chat messages can reference diagram nodes by ID
- The workflow is bidirectional: human→diagram→code AND code→diagram→human understanding
- The "chat" is about diagrams, not just code
- When Claude modifies a diagram in chat, the diagram should update visually in real-time

Design your implementation with this mental model in mind.

---

## 11. Notes on DRAKON

DRAKON (Дружелюбный Русский Алгоритмический язык, Который Обеспечивает Наглядность) was designed for the Soviet space program to make algorithms readable by humans, especially in team settings. Key properties:
- Every diagram has exactly one entrance (start) and one or more exits (end)
- Decision nodes (question) always have YES/NO branches
- Actions are simple imperative statements
- The structure must be deterministic — no ambiguity

When Claude discusses DRAKON diagrams, it should understand this language and suggest modifications that maintain well-formedness.

---

Please provide your complete analysis and implementation proposal. Code should be production-ready TypeScript/React, not pseudocode. Be thorough — this is a major architectural decision.
