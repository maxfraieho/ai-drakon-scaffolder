# Prompt 52 — Autonomous UX Research & Self-Directed Improvement

## Your Role

You are a senior product engineer and UX architect with deep expertise in developer tools and AI-assisted workflow interfaces. Your task is to **independently analyze** the current state of the AI-DRAKON platform and propose + implement targeted UX improvements.

---

## Context

AI-DRAKON is a visual programming platform for Ukrainian developers:
- **DRAKON diagrams** — visual flowchart editor (tab: /diagrams)
- **Pipelines** — DRAKON IR JSON editor with AI generation (tab: /pipelines)
- **Docs/Notes** — documentation generator + knowledge graph (tab: /docs)
- **Agents** — LLM agent chat + config (tab: /agents)
- **GitHub** — repository browser (tab: /github)
- **DevCycle** — AI-assisted dev cycle (tab: /devcycle)

Stack: React 18 + Vite + TanStack Router + shadcn/ui + Tailwind.
Critical: every change must be in BOTH `src/` AND `.lovable/src/`.

---

## Step 1: Read and Analyze

Before making any changes, read and analyze these key files to understand current UX:
- `src/routes/` — all route files (page structure)
- `src/components/workspace/WorkspaceShell.tsx` — shell nav
- `src/pages/DiagramsPage.tsx` — main diagram editor
- `src/components/pipelines/PipelinesPage.tsx` — pipelines list
- `src/routes/docs.tsx` — docs page

---

## Step 2: Identify Problems

Based on your analysis, identify UX problems across these categories:

1. **Navigation friction** — too many clicks to get to core work
2. **Empty states** — unhelpful blank areas with no guidance
3. **Inconsistency** — different interaction patterns for similar actions
4. **Information density** — too much or too little visible at once
5. **Viewport waste** — panels that don't use available space

---

## Step 3: Remove the Sync Tab

The `/sync` route and its navigation link are no longer needed. Remove:
- Navigation link to Sync from `WorkspaceShell.tsx`
- The sync tab/route entry from navigation
- Do NOT delete the route file itself — just hide it from nav

---

## Step 4: Add Claude Direct Chat to Pipelines Panel

In `src/components/pipelines/PipelinesPage.tsx` AND `.lovable/src/components/pipelines/PipelinesPage.tsx`:

The pipelines panel shows a list on the left and `PipelineDrakonView` on the right.
Add a collapsible "Claude" chat sidebar that appears on the right when a pipeline is selected.

Use the existing agent chat infrastructure:
- Import `AgentChatPanel` or `useAgentChatStore` (already exists in `src/store/useAgentChatStore.ts`)
- Add a toggle button in the pipeline toolbar: `<Bot className="h-4 w-4" />` icon
- When toggled, show a chat panel (width ~320px) to the right of PipelineDrakonView
- The chat context should include the current pipeline IR as system context

If `AgentChatPanel` is not suitable, create a minimal `PipelineChat` component using the existing `useAgentChatStore` or direct fetch to the agent endpoint.

---

## Step 5: Implement Your Top 3 UX Fixes

Based on your analysis in Step 2, independently choose and implement the 3 most impactful UX improvements. For each:

1. State the problem you identified
2. State your solution
3. Implement it

Focus on: reducing clicks, improving empty states, fixing layout inconsistencies.

---

## Constraints

- Do NOT redesign the visual style (colors, fonts stay as-is)
- Do NOT remove existing features — only improve access to them
- Do NOT add new dependencies
- Keep changes focused and surgical — no big rewrites
- Apply all changes to BOTH `src/` AND `.lovable/src/`
