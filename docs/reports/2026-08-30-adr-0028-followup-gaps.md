---
status: open
date: 2026-08-30
related: ADR-0028, spec 007
---

# Follow-up: gaps left open by ADR-0028 / spec 007

Source: live UX walkthrough on `design-system/astryx-genspark` dev build,
2026-08-30, investigated via Oracle Claude (edgee, `--model opus`,
sequential-thinking + GitNexus). ADR-0028 distilled 3 low-risk items into
spec 007 (all 3 committed: `57e79d63`, `b06d2078`, `5eae23dc`). This doc
tracks what the same walkthrough raised that ADR-0028 explicitly deferred.

## 1. Nav surfaces still visually duplicated

ADR-0028 fixed the *source* (IconRail now renders from `ASTRYX_NAV_ITEMS`
instead of a separate hardcoded array) but explicitly left the *surface
count* as an implementation detail. Pi's commit `57e79d63` chose to keep
IconRail as a separate consolidated surface, not delete it. Original
complaint stands: header + IconRail + sidebar can still show the same
route (`/diagrams`, `/agents`, `/pipelines`) three times on desktop.

Candidate fix: remove IconRail entirely (sidebar + header already cover
every `iconRail: true` route) or make it collapse/hide when sidebar is
expanded. Frontend-only, bounded to `WorkspaceShell.tsx` +
`astryx-nav-config.ts`. Low risk -- same files already touched by commit 1.

## 2. Diagram-source unification is a hint, not a merge

Commit `5eae23dc` (spec 007 commit 3) is a banner pointing to Workspace,
not the true unified list spec 007 originally asked for. Root blocker:
`handleGithubListTree` (`cloudflare-worker/worker-mcp-drakon.js:1380`) is
not recursive -- one GitHub Contents API directory level per call. A real
merge needs:
- backend: recursive git-tree walk (`?recursive=1`, already used
  elsewhere in the same worker file for a different, unrelated codepath)
  or a new endpoint
- frontend: folder<->git-path correlation (`readFoldersFromStorage()`
  currently has zero concept of git paths)

Out of "frontend redesign" scope as currently framed -- crosses into
`cloudflare-worker/`. Needs explicit go-ahead before starting; not a
Pi/deepseek frontend task.

## 3. ADR-0026 role-gating / multi-participant ADR concept

User's original complaint ("переосмислити в світлі нової концепції
додавання ADR різними учасниками розробки") maps to ADR-0026
(organizational AI-workforce vision, worker/supervisor role-gated
spaces) and `WORKFORCE-UI-CONSOLIDATED-PLAN.md`. Blocked on
`resolveTenant()` hardcoded `roles: ['owner']`
(`packages/tenancy/src/index.ts:79`) -- same blocker ADR-0027 and
ADR-0028 both hit. Separate, larger track from the genspark visual
redesign; not started.

## Next picked

Item 1 (IconRail dedup) -- frontend-only, bounded, matches "по фронтенду"
scope Q asked for. Delegating to Pi on `.30`.
