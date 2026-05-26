---
title: "Lovable Safe Migration Init Prompt"
type: guide
tags: [drakon, agent, cloudflare, frontend, tracing]
status: active
created: 2026-05-26
updated: 2026-05-26
---

This is an existing production codebase — **do not generate code or scaffold, do not modify any files.**

Read the existing repo and acknowledge you can see it.

Critical invariants (NEVER violate):
- `src/lib/htse/` — DRAKON IR core, never modify
- `public/drakonwidget.js` — canvas renderer, never touch  
- `.github/workflows/mirror-to-ai-drakon.yml` — mirror CI, never delete
- **Every file change must be applied to BOTH `src/` and `.lovable/src/`** (two copies exist)

Stack: React 18 + Vite + TanStack Router (file-based, `src/routes/`) + shadcn/ui + Tailwind.
Backend agents: drakon-agent :8765, architect-agent :8766, docs-agent :8767 — accessed via Cloudflare Worker.

Confirm: list 5 files you can see in the repo (routes/, components/, lib/).
Ready for feature prompts.
