# Lovable Prompt 11 — AgentChatPanel

Add an **Agent Chat** feature to the AI-DRAKON platform.
Three AI agents run on the local server and help users build DRAKON diagrams.

**DO NOT touch:**
- `src/lib/htse/` — DRAKON IR core, never modify
- `cloudflare-worker/` — Worker code, changed separately
- `drakonwidget.js` — canvas renderer
- Existing routes in `src/routes/`

---

## Step 1 — Types (`src/types/agent-chat.ts`)

```typescript
export type AgentId = "drakon" | "architect" | "docs";

export interface AgentMessage {
  id: string;
  agentId: AgentId;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metadata?: {
    diagrams?: Array<{ name: string; items: Record<string, unknown> }>;
    diagramId?: string;
    feedback?: string;
    correctedIr?: Record<string, unknown>;
  };
}

export interface AgentStatus {
  agentId: AgentId;
  online: boolean;
  url: string;
}
```

---

## Step 2 — Agent API (`src/lib/agent-api.ts`)

```typescript
import type { AgentId, AgentMessage } from "@/types/agent-chat";

const AGENT_LABELS: Record<AgentId, string> = {
  drakon: "DRAKON",
  architect: "Architect",
  docs: "Docs",
};

function getBaseUrl(): string {
  // Read from localStorage settings key "drakon_agent_base_url"
  try {
    const stored = localStorage.getItem("drakon_agent_base_url");
    if (stored) return stored;
  } catch {}
  return "http://192.168.3.184";
}

const AGENT_PORTS: Record<AgentId, number> = {
  drakon: 8765,
  architect: 8766,
  docs: 8767,
};

export function getAgentUrl(agentId: AgentId): string {
  return `${getBaseUrl()}:${AGENT_PORTS[agentId]}`;
}

export async function checkAgentHealth(agentId: AgentId): Promise<boolean> {
  try {
    const resp = await fetch(`${getAgentUrl(agentId)}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function sendToAgent(
  agentId: AgentId,
  message: string,
  context?: Record<string, unknown>
): Promise<{ reply: string; diagrams?: unknown[] }> {
  const url = getAgentUrl(agentId);

  if (agentId === "drakon") {
    const resp = await fetch(`${url}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: message, refine: true }),
    });
    if (!resp.ok) throw new Error(`DRAKON agent error: ${resp.status}`);
    const data = await resp.json();
    const diagrams = data.diagrams ?? [];
    const names = diagrams.map((d: { name: string }) => d.name).join(", ");
    return {
      reply: diagrams.length
        ? `Generated ${diagrams.length} diagram(s): **${names}**`
        : "No diagrams generated. Is the code a valid Python function?",
      diagrams,
    };
  }

  const resp = await fetch(`${url}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context }),
  });
  if (!resp.ok) throw new Error(`${AGENT_LABELS[agentId]} agent error: ${resp.status}`);
  const data = await resp.json();
  return { reply: data.reply ?? data.message ?? JSON.stringify(data) };
}

export async function sendFeedback(
  agentId: AgentId,
  diagramName: string,
  feedback: string,
  correctedIr?: Record<string, unknown>
): Promise<void> {
  await fetch(`${getAgentUrl(agentId)}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      diagram_name: diagramName,
      feedback,
      corrected_ir: correctedIr ?? null,
    }),
  });
}
```

---

## Step 3 — Store (`src/store/useAgentChatStore.ts`)

Zustand store. Sessions per agent. Persist to localStorage key `"agent_chat_history"`.

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { AgentId, AgentMessage } from "@/types/agent-chat";
import { sendToAgent } from "@/lib/agent-api";

interface AgentChatState {
  sessions: Record<AgentId, AgentMessage[]>;
  activeAgent: AgentId;
  loading: Record<AgentId, boolean>;
  error: Record<AgentId, string | null>;
  setActiveAgent: (id: AgentId) => void;
  sendMessage: (agentId: AgentId, content: string, context?: Record<string, unknown>) => Promise<void>;
  clearHistory: (agentId: AgentId) => void;
}

export const useAgentChatStore = create<AgentChatState>()(
  persist(
    (set, get) => ({
      sessions: { drakon: [], architect: [], docs: [] },
      activeAgent: "drakon",
      loading: { drakon: false, architect: false, docs: false },
      error: { drakon: null, architect: null, docs: null },

      setActiveAgent: (id) => set({ activeAgent: id }),

      sendMessage: async (agentId, content, context) => {
        const userMsg: AgentMessage = {
          id: nanoid(),
          agentId,
          role: "user",
          content,
          timestamp: new Date().toISOString(),
        };
        set((s) => ({
          sessions: {
            ...s.sessions,
            [agentId]: [...s.sessions[agentId], userMsg],
          },
          loading: { ...s.loading, [agentId]: true },
          error: { ...s.error, [agentId]: null },
        }));

        try {
          const result = await sendToAgent(agentId, content, context);
          const assistantMsg: AgentMessage = {
            id: nanoid(),
            agentId,
            role: "assistant",
            content: result.reply,
            timestamp: new Date().toISOString(),
            metadata: result.diagrams?.length ? { diagrams: result.diagrams } : undefined,
          };
          set((s) => ({
            sessions: {
              ...s.sessions,
              [agentId]: [...s.sessions[agentId], assistantMsg],
            },
          }));
        } catch (e) {
          set((s) => ({
            error: { ...s.error, [agentId]: String(e) },
          }));
        } finally {
          set((s) => ({ loading: { ...s.loading, [agentId]: false } }));
        }
      },

      clearHistory: (agentId) =>
        set((s) => ({ sessions: { ...s.sessions, [agentId]: [] } })),
    }),
    {
      name: "agent_chat_history",
      partialize: (s) => ({ sessions: s.sessions, activeAgent: s.activeAgent }),
    }
  )
);
```

---

## Step 4 — AgentChatPanel (`src/components/agents/AgentChatPanel.tsx`)

Full-height chat panel with tabs for 3 agents.

Layout (use shadcn Tabs, ScrollArea, Textarea, Button, Badge):

```
┌─────────────────────────────────────────────┐
│ Tabs: [DRAKON●] [Architect●] [Docs○]        │ ← ● green=online, ○ red=offline
├─────────────────────────────────────────────┤
│                                             │
│  [AI] Ready. Paste Python code or ask       │ ← initial welcome per agent
│       about the project architecture.       │
│                                             │
│  [You] def greet(name): ...                 │
│                                             │
│  [AI] Generated 1 diagram: **greet**        │
│       [Open in Editor] [👎 Feedback]        │ ← only when diagrams[]
│                                             │
│  [👎 feedback form — inline collapsible]    │
│   What was wrong? [textarea]                │
│   Corrected IR (JSON, optional): [textarea] │
│   [Send Feedback]                           │
│                                             │
├─────────────────────────────────────────────┤
│ [Message...              ] [Send]           │
│ [🗑 Clear]                                  │
└─────────────────────────────────────────────┘
```

Implementation notes:
- Use `ScrollArea` from shadcn, auto-scroll to bottom on new messages
- User messages: right-aligned, colored background
- Assistant messages: left-aligned, Card background
- When `metadata.diagrams` exists on assistant message: show "Open in Editor" button
  - On click: call `api.saveDiagram(diagrams[0])` then `navigate("/diagrams")`
  - Use existing `mcpCall` or `api` pattern already in the codebase
- Feedback form: collapsible below the message (not a modal)
  - On submit: call `sendFeedback(agentId, diagramName, feedback, correctedIr)`
- Loading: show animated `...` dots while waiting
- Error: show red alert with the error message, allow retry

---

## Step 5 — Health status hook (`src/hooks/useAgentHealth.ts`)

```typescript
import { useEffect, useState } from "react";
import type { AgentId } from "@/types/agent-chat";
import { checkAgentHealth } from "@/lib/agent-api";

const AGENTS: AgentId[] = ["drakon", "architect", "docs"];

export function useAgentHealth() {
  const [status, setStatus] = useState<Record<AgentId, boolean>>({
    drakon: false, architect: false, docs: false,
  });

  useEffect(() => {
    const check = async () => {
      const results = await Promise.allSettled(AGENTS.map(checkAgentHealth));
      setStatus({
        drakon: results[0].status === "fulfilled" && results[0].value,
        architect: results[1].status === "fulfilled" && results[1].value,
        docs: results[2].status === "fulfilled" && results[2].value,
      });
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  return status;
}
```

---

## Step 6 — Add "Agents" to navigation

In the existing navigation (sidebar or header tabs), add:

- Label: **"Agents"** with a bot icon (use `Bot` from lucide-react)
- On click: open `AgentChatPanel` in a Sheet (slide-in from right)
  - Sheet width: `w-[480px]` on desktop, full-width on mobile
  - Use the existing Sheet component from shadcn

The Sheet trigger button: place next to other action buttons in the header/toolbar area.
The panel inside the Sheet: `<AgentChatPanel className="h-full" />`

---

## Step 7 — Settings: Agent Base URL

In the existing Settings page, in the "Application" tab, add a new field:

- Label: "Agent Server URL"
- Input: `placeholder="http://192.168.3.184"`
- Help text: "Base URL for AI agents (drakon:8765, architect:8766, docs:8767)"
- Save to: `localStorage.setItem("drakon_agent_base_url", value)`
- Load on mount: `localStorage.getItem("drakon_agent_base_url") ?? "http://192.168.3.184"`

---

## After implementation, report:

1. List of new files created
2. Which existing file was modified for the navigation entry
3. How to test: exact steps to open the panel and send a message
4. Any regressions to watch for
