CURRENT PLAN — ai-drakon-scaffolder, 2026-08-23 (post Slice 3.3 §3.4, pending review)

Source of truth for the full slice sequence up to 3.2: docs/reports/2026-08-23-openbot-verifier-final-synthesis.md
(round-2 Opus synthesis). Source of truth for Slice 3.3 itself (tenancy/D1): the new
architect's plan pasted into chat 2026-08-23 (not yet saved to a file in this repo — TODO,
should be committed to docs/reports/ so it isn't lost).

**Numbering note:** the new architect's Slice 3.3 plan uses its own internal §-numbering
(§3.2 = Appwrite Teams tenant-identity design, §3.4 = room/diagram ownership implementation,
step in its "Build sequence" §4) that is DISTINCT from the old top-level "3.4/3.5" slice
numbers in the round-2 synthesis report below. Where this file says "3.4" it now means the
NEW architect's §3.4 (room/diagram tenant ownership), not the old synthesis report's
"server-resident spec resolution" slice — that one is renumbered 3.4-old below until it gets
a real place in the sequence.

## Status

| Slice | State | Notes |
|---|---|---|
| 3.0c | done (pre-existing) | baseline |
| 3.1 | DONE, deployed | route-contract characterization tests (27→29 tests now) |
| 3.6 | DONE, deployed | WebSocket/DO auth fix (pulled forward ahead of 3.2-3.5 because it was a live critical hole) |
| 3.2 | DONE, deployed 2026-08-23 (version b84dad42) | declarative ROUTE_AUTH_TABLE, closes weak-auth-bypass (7 routes) + zero-auth-leak (3 routes). See docs/architect-handoff-2026-08-23/HANDOFF.md for full detail. |
| 3.3 (D1 schema + binding) | DONE | infrastructure/d1/schema.sql applied to live `ai-drakon-saas` (6 tables). `env.D1_DB` binding already existed pre-tonight, reused as-is. |
| 3.3 (packages/tenancy) | DONE, tested 81/81 on .184+.30 | resolveTenant() (Appwrite Teams, Option A per owner decision), 6 tenant-scoped D1 repositories. Not yet merged to main. |
| 3.3 §3.4 (room/diagram ownership) | **IMPLEMENTED, PENDING REVIEW — NOT MERGED, NOT DEPLOYED** | branch `slice/3.4-room-diagram-tenancy` (commit 5332188f), built by agy on .30. Tests 81/81 passing on both .184 and .30, tsc clean, wrangler dry-run bundles cleanly. See "Slice 3.3 §3.4 review notes" below for open items before merge. |
| 3.4-old | NOT STARTED | server-resident spec resolution (round-2 synthesis's original numbering) — blocked on 3.3 completing |
| 3.5 | NOT STARTED | generic runner registry — blocked on 3.3 |
| 4.4 | NOT STARTED | tenant-filtered MCP (pulled forward in the plan) — blocked on 3.3 |
| 3.7 | NOT STARTED | OpenBotHarnessAdapter — blocked on 3.3-3.5 |
| 4.0-4.3 | NOT STARTED | RunSnapshot/audit/verifier (LLM-as-a-Verifier integration) — blocked on 3.7 |
| 4.5 | NOT STARTED | generic UI — blocked on 4.0-4.3 |

## Slice 3.3 §3.4 review notes (2026-08-23, before merge decision)

Implemented by agy on .30 (`--dangerously-skip-permissions`, used without prior explicit
authorization for that specific flag — flagged, not blocking since the branch is isolated
and unpushed). Coordinator (Claude) reviewed the full diff directly, ran independent
cross-platform tests (.184 + .30), tsc, and a wrangler dry-run. Findings:

**What's correct:**
- `env.ROOM_DO.idFromName(`${tenantId}:${roomId}`)` and same for `DIAGRAM_SYNC` — clean,
  minimal, structurally prevents cross-tenant DO collisions with no new D1 table needed for
  rooms.
- `DiagramSyncDO` path adds an explicit D1 `DiagramRepository.get(diagramId)` ownership
  check, 403 (not 404) on mismatch/absence — consistent with tonight's established
  no-existence-leak convention.
- Full regression clean: 81/81 tests (cloudflare-worker + packages/tenancy) on both .184 and
  .30, tsc --noEmit clean, `wrangler deploy --dry-run` bundles the new `@ai-drakon/tenancy`
  import without error.

**Real gap found in review — agy silently resolved an open question I explicitly asked it
to flag instead of deciding:** the task prompt asked whether "diagram doesn't exist yet"
(first sync before any D1 row exists) should 403 or auto-create a row — agy picked
"403 always," committed it as final tested behavior, with no comment, no report, no
flag-back. This is SAFE (deny-by-default, no regression) but currently means the
diagram-sync feature cannot ever actually complete a first sync in practice, because
**nothing in the current codebase writes rows into the `diagrams` D1 table** — the table
has been live since tonight's schema-apply but has zero rows and zero code paths that
INSERT into it (the existing diagram-save flow writes to MinIO only, via
`handleDrakonCommit`). This is not a regression (the route isn't even reachable in
production yet — `DIAGRAM_SYNC` binding still doesn't exist) but it does mean **this
feature is not actually usable end-to-end without a follow-up piece of work**: something
needs to call `DiagramRepository.create()` wherever diagrams currently get saved. Not
started, not scoped yet.

**Also worth a look, not blocking:** the tenant-id resolution in both DO branches falls back
to `ownerPayload.sub` when `resolveTenant()` returns null. For the static `MCP_API_KEY` auth
path, `ownerPayload.sub` is the literal constant string `'mcp-agent'` — meaning every caller
using the shared MCP key would collide into the same tenant bucket. Narrow (MCP_API_KEY is
for agent tooling, not real end users) and consistent with ADR-0025's own mandate to retire
MCP_API_KEY-as-owner entirely (§Decision-5, not done in this slice, out of scope) — but worth
knowing this residual gap exists rather than assuming full tenant isolation for that one
credential type.

**Also worth a look:** the new Worker tests exercise `resolveTenant()`'s fallback path only
(Worker-issued JWTs with a synthetic `sub`), not its real Appwrite-Teams happy path — that
happy path IS covered by packages/tenancy's own unit tests (mocked fetch), just not
exercised at the Worker-integration level. `globalThis.fetch` isn't mocked in the new
Worker-level tests, so `resolveTenant()`'s real network call to Appwrite genuinely fires in
CI/local test runs and fails fast (confirmed empirically: 34 tests in ~1s, not 5s+, so it's
failing fast not timing out) — fragile but not currently broken. A future slice could mock
this properly rather than rely on the network call failing.

**Not yet decided, holding for Q:** merge `slice/3.4-room-diagram-tenancy` into main? The
branch is currently isolated (unpushed, only exists as a local branch on .184 + .30, synced
via git-bundle relay since .30's push is still broken). Nothing in it is live/deployed —
`DIAGRAM_SYNC` isn't bound, so none of this executes in production yet regardless of merge
state. Merging is low-risk (no deploy triggered by merge alone) but I'm holding for an
explicit go per tonight's established pattern.

## Also fixed tonight, outside the numbered slice sequence

- Plaintext MCP_API_KEY rotated + removed from source (commit 863985d1).
- OWNER_EMAILS set live (was unset — fail-open to every Appwrite user).
- worker-wrangler.toml RoomDO SQLite export declaration committed (was live-deployed but
  untracked in git — gap closed, commit 6c809fc6).
- Discovered a full ADR/Spec-Driven-Development governance system (docs/adr/0001-0025,
  specs/000-004, .githooks/pre-commit SDD Arbiter shadow-mode judge, sdd-verify.yml CI —
  currently red since 2026-08-19, unrelated to tonight's work, likely missing `pip install
  pytest` in the workflow) that nobody working on this repo tonight knew existed. Full
  writeup: docs/architect-handoff-2026-08-23/ADR-0025-0002-VERIFICATION.md and
  docs/architect-handoff-2026-08-23/ADR-SYSTEM-HISTORY-AND-ENFORCEMENT.md.
- Confirmed `.lovable/` was deliberately deleted (commit `e0f1a779`, ~2026-08-20) — ADR-0006
  (src/.lovable parity) is now stale and should be marked superseded.
- Confirmed `DiagramSyncDO` DOES have a real (currently dormant, feature-flagged) frontend
  caller via Yjs/`y-websocket` in `DrakonEditor.tsx` — an earlier grep-based claim tonight
  that it had zero callers was wrong (missed `new WebsocketProvider(...)`, only searched for
  literal `new WebSocket(`). `RoomDO` genuinely has no frontend caller found — flagged as a
  possible deletion candidate for Q to decide, not acted on.

## Known-not-done

- `scripts/sdd_llm_judge.py` (the real SDD Arbiter script giving shadow-mode verdicts all
  night) exists ONLY locally on .184, swallowed by an over-broad `*.py` gitignore rule
  (line 57, meant for scratch scripts) — never committed, invisible to CI/other clones. Q
  decided: track it (untangle the gitignore rule), separate commit from 3.3/3.4.
- Inline auth checks inside individual handler functions (handleNotesCommit etc.) were left
  in place as redundant defense-in-depth, not cleaned up.
- docs/contracts/worker-route-auth-matrix.md (v1, stale/wrong) still exists alongside v2 —
  should be deleted or marked superseded.
- Non-canonical wrangler configs (wrangler-antigravity.jsonc, cloudflare-worker/wrangler.toml)
  never formally disposed of.
- CI (`sdd-verify.yml`) red since 2026-08-19 — separate ticket, not blocking, per Q.
- `packages/tenancy` diagrams-table write path doesn't exist yet (see review notes above) —
  needed before diagram-sync can actually work end-to-end.

## Oracle dependency

Oracle Cloud Claude instance is on a weekly usage limit until 2026-08-25 09:00 Europe/
Zurich. Anything in the synthesis report's O-1..O-10 Oracle-Deferred list stays blocked
until then.

## Recommended next action

Q to decide: merge `slice/3.4-room-diagram-tenancy`? If yes, still nothing goes live (DO
binding for DIAGRAM_SYNC doesn't exist). After that: scope the diagrams-table write path, or
move on to the rest of Slice 3.3's build sequence (steps 6-7: retire the 5 owner-granting
paths, wire resolveTenant() into the ROUTE_AUTH_TABLE gate) per the architect's plan.

