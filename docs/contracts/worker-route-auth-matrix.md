# Worker Route/Auth Contract Matrix — Slice 3.1

Baseline for `cloudflare-worker/worker-mcp-drakon.js`. Characterization only — records
current behavior including known bugs, so Slice 3.2's rewrite of the auth gate can diff
against it and show exactly what changed. Generated alongside
`cloudflare-worker/__tests__/route-contract.test.ts`, which is the executable source of
truth; this file is the human-readable summary.

Scope: routes flagged as security-relevant across three independent audits this session
(`docs/reports/2026-08-23-openbot-verifier-final-synthesis.md`), not the full ~73
dispatch conditions. Extending coverage is additive — add a test case, not a new harness.

| Route | Method | No auth | Worker JWT `role:'owner'` | Appwrite JWT, non-owner email (`role:'user'`, truthy) | Notes |
|---|---|---|---|---|---|
| `/health` | GET | 200-class (no 401) | — | — | Intentionally public. |
| `/mcp` | POST | 401 | passes (not 401) | **passes (not 401) — D13, confirmed bug** | Checks only `if (!owner)`; any truthy `verifyOwnerAuth` result — including a non-owner Appwrite user — clears it. All 24 MCP tools reachable, incl. `github.commitfile`. |
| `/v1/notes/commit` | POST | 401 | passes | **passes — corrected D14** | Was described as fully pre-gate/unauthenticated; actually authenticates (`if (!authPayload) return 401`) but never checks `role`. Any logged-in user can commit notes. |
| `/v1/notes/delete` | DELETE | 401 | passes | **passes — corrected D14** | Same pattern as `/v1/notes/commit`. |
| `/v1/notes/build-semantic-graph` | POST | 401 | passes | **passes — corrected D14** | Same pattern. Third route in this class (N6). |
| `/v1/github/tree` | GET | 401 | passes | 401 | Below the L2849 explicit `role !== 'owner'` gate — correctly owner-only. |
| `/v1/pipeline/execute-deterministic` | POST | 401 | passes | 401 | Same gate, correctly owner-only. |
| `/v1/compiler/n8n` | POST | 401 | passes | 401 | Same gate, correctly owner-only. |
| `/ws/room/{roomId}` | GET (Upgrade) | **reaches `RoomDO.fetch` directly — no 401 possible, no auth check exists** | n/a | n/a | **N1, Critical, live.** Dispatched at L2641, before the `try {}` block, before `JWT_SECRET` check, before any `verifyOwnerAuth` call. `roomId` is a raw path segment (`idFromName`), not a secret. `ROOM_DO` is bound in the live Worker. |
| `/v1/diagram/{diagramId}/sync` | POST (Upgrade) | 500 if `DIAGRAM_SYNC` unbound (**live-matching default — accidental fail-closed, not a real fix**); reaches `DiagramSyncDO.fetch` directly with no auth if bound | n/a | n/a | **N1/N2, Critical.** Same missing-auth pattern as `/ws/room/*`. The 500 today is an artifact of the binding being absent from the live config, not a deliberate control — closing the Slice 3.0c config contradiction by binding `DIAGRAM_SYNC` activates this surface unless Slice 3.6 ships at the same time. |

## Mechanism note (corrects a subtlety in the prior round's phrasing)

"Role:'user' passes" does **not** mean a Worker-issued JWT with `role:'user'` — that
correctly returns `null` from `verifyOwnerAuth` (confirmed by
`cloudflare-worker/__tests__/worker-auth.test.ts`) and is rejected everywhere. The actual
bypass is the **Appwrite JWT path**: `verifyOwnerAuth` returns a truthy
`{role:'user', sub, email}` object for any Appwrite-authenticated user whose email isn't
in `OWNER_EMAILS` — and checks written as `if (!owner)` (D13, three `/v1/notes/*` routes)
accept that truthy-but-non-owner object, while checks written as
`if (!owner || owner.role !== 'owner')` (the L2849 global gate, and
`handleDrakonExecuteDeterministicStatus` at L4671) correctly reject it. This is exactly
the difference Slice 3.2's declarative `ROUTE_AUTH` table is meant to eliminate structurally.

## Not yet characterized (open, not blocking)

`/v1/github/{commit,delete,branches,oauth/*,create-repo}`, `/v1/compiler/n8n/push`,
`/v1/pipeline/execute-deterministic/status` (owner-check confirmed via direct source —
D23 — but no fetch-level test yet), and the remaining ~60 dispatch conditions not flagged
as security-relevant by any audit this round.
