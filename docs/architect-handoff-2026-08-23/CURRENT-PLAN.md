CURRENT PLAN — ai-drakon-scaffolder, 2026-08-23 (post Slice 3.2)

Source of truth for the full slice sequence, Owner Decision Memo, and Security Invariants:
docs/reports/2026-08-23-openbot-verifier-final-synthesis.md (round-2 Opus synthesis).
This file only tracks WHICH slice we're actually on and what changed since that report
was written — read the synthesis report for the "why", this file for the "where are we now".

## Status

| Slice | State | Notes |
|---|---|---|
| 3.0c | done (pre-existing) | baseline |
| 3.1 | DONE, deployed | route-contract characterization tests (27→29 tests now) |
| 3.6 | DONE, deployed | WebSocket/DO auth fix (pulled forward ahead of 3.2-3.5 because it was a live critical hole) |
| 3.2 | DONE, deployed 2026-08-23 (version b84dad42) | declarative ROUTE_AUTH_TABLE, closes weak-auth-bypass (7 routes) + zero-auth-leak (3 routes). See docs/architect-handoff-2026-08-23/HANDOFF.md for full detail. |
| 3.3 | NOT STARTED | tenancy/D1 — real per-room/per-diagram membership. This is the natural next step; nothing blocks it. |
| 3.4 | NOT STARTED | server-resident spec resolution — blocked on 3.3 |
| 3.5 | NOT STARTED | generic runner registry — blocked on 3.3 |
| 4.4 | NOT STARTED | tenant-filtered MCP (pulled forward in the plan) — blocked on 3.3 |
| 3.7 | NOT STARTED | OpenBotHarnessAdapter — blocked on 3.3-3.5 |
| 4.0-4.3 | NOT STARTED | RunSnapshot/audit/verifier (LLM-as-a-Verifier integration) — blocked on 3.7 |
| 4.5 | NOT STARTED | generic UI — blocked on 4.0-4.3 |

## Also fixed tonight, outside the numbered slice sequence

- Plaintext MCP_API_KEY rotated + removed from source (commit 863985d1).
- OWNER_EMAILS set live (was unset — fail-open to every Appwrite user).
- worker-wrangler.toml RoomDO SQLite export declaration committed (was live-deployed but
  untracked in git — gap closed, commit 6c809fc6).

## Known-not-done, explicitly out of scope for 3.2

- Room/diagram IDs are still not tenant-isolated (any owner can join any room by knowing/
  guessing its ID) — this is what 3.3 actually fixes, 3.2 only closed the "no auth at all"
  and "wrong auth level" bugs, not the tenancy gap.
- Inline auth checks inside individual handler functions (handleNotesCommit etc.) were left
  in place as redundant defense-in-depth, not cleaned up. Fine to leave; a future slice could
  remove them for clarity once ROUTE_AUTH_TABLE has been live long enough to trust fully.
- docs/contracts/worker-route-auth-matrix.md (v1, stale/wrong) still exists alongside v2 —
  should be deleted or marked superseded.
- Non-canonical wrangler configs (wrangler-antigravity.jsonc, cloudflare-worker/wrangler.toml)
  never formally disposed of.

## Oracle dependency

Oracle Cloud Claude instance is on a weekly usage limit until 2026-08-25 09:00 Europe/
Zurich. Anything in the synthesis report's O-1..O-10 Oracle-Deferred list stays blocked
until then.

## Recommended next action

Start Slice 3.3 (tenancy/D1). Nothing blocks it. Read the synthesis report's Slice 3.3
section for the design before implementing.
