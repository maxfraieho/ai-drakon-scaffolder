# Lovable Handoff — AI-DRAKON Platform Codebase Context

> Paste this AFTER pushing the real codebase to the connected repository.
> This gives Lovable full context before any feature prompts.

---

The codebase has been synced. Here is the complete context before we continue:

## What this app does

AI-DRAKON Platform converts Python source code into visual DRAKON flowchart diagrams.
Users paste Python functions → AI agent (drakon-agent) generates DRAKON IR JSON →
the `drakonwidget.js` canvas renders the visual diagram.
Diagrams are saved to MinIO S3 and optionally to GitHub.

## File structure (key files)

```
src/
├── routes/
│   ├── __root.tsx           — root layout (QueryClient, TooltipProvider, AppHeader)
│   ├── login.tsx            — JWT auth
│   ├── diagrams.tsx         — main page (folder tree + diagram grid)
│   ├── editor.$diagramId.tsx — DRAKON canvas editor
│   ├── settings.tsx         — configuration page
│   └── overview.tsx         — redirect root
│
├── components/
│   ├── app/AppHeader.tsx    — top navigation
│   ├── drakon/              — DRAKON-specific components (DrakonEditor, DiagramCard)
│   ├── ui/                  — shadcn/ui generated components (DO NOT EDIT)
│   └── agents/              — NEW: AgentChatPanel (to be added)
│
├── lib/
│   ├── settings-storage.ts  — localStorage settings (Worker URL, auth)
│   ├── htse/                — DRAKON IR types and validation (DO NOT TOUCH)
│   │   ├── ir-types.ts      — IrDiagram, IrItem interfaces
│   │   └── ir-validator-core.ts
│   └── mcp-client.ts        — calls to Cloudflare Worker MCP endpoint
│
├── hooks/                   — custom React hooks
├── store/                   — Zustand stores
└── types/                   — TypeScript type definitions
```

## Architectural invariants (NEVER violate)

1. `src/lib/htse/` — DRAKON IR core. Never modify. Never import from outside this directory except ir-types.ts.
2. `drakonwidget.js` in public/ — canvas renderer. Never touch.
3. `cloudflare-worker/` — Worker code, changed separately, not by Lovable.
4. All Worker calls go through `lib/mcp-client.ts` → `mcpCall()` function.
5. `params` in IrDiagram is always a STRING, never an array.
6. Every diagram IR must have: `b0` (branch entry) + `end` (terminal node).

## Three AI agents (running on local server)

```
drakon-agent    → http://192.168.3.184:8765  (POST /analyze → Python → DRAKON IR)
architect-agent → http://192.168.3.184:8766  (POST /chat → architecture advice)
docs-agent      → http://192.168.3.184:8767  (POST /chat → documentation)
```

Agent base URL is configurable in Settings → "Agent Server URL" field.
Stored in localStorage key `"drakon_agent_base_url"`.

## Zustand stores (existing)

- Check `src/store/` for existing store patterns before creating new ones
- Auth state is managed separately in settings-storage.ts

## shadcn/ui usage

All UI components are in `src/components/ui/` — use them directly.
Available: Button, Card, Sheet, Tabs, Textarea, Badge, ScrollArea, Dialog, Input, Label, Separator, Tooltip.

## What's already built

- ✅ Login / auth with JWT
- ✅ Diagrams page with GitHub folder tree + diagram grid
- ✅ DRAKON editor with drakonwidget.js canvas
- ✅ Settings page (Worker URL, MinIO, model config)
- ✅ MinIO S3 save/load for diagrams
- ✅ GitHub API integration for diagram persistence
- ✅ Cloudflare Worker MCP (10+ tools)

## Ready to continue

Next task: add AgentChatPanel (see prompt 11-agent-chat-panel.md).
