CURRENT PLAN — ai-drakon-scaffolder, 2026-08-23 (Slice 3.3 fully DONE + deployed; ready for next slice)

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
| 3.3 (packages/tenancy) | DONE, merged | resolveTenant() (Appwrite Teams, Option A per owner decision), 6 tenant-scoped D1 repositories + upsert(). |
| 3.3 §3.4 (room/diagram ownership) | MERGED (35b681c3) + DEPLOYED (DIAGRAM_SYNC binding live, 2026-08-23) | Room + diagram tenant-scoped auth reachable in production, smoke-tested. |
| 3.3 (diagrams-table write path) | MERGED (9cb8fdc06) + DEPLOYED | Wires `handleDrakonCommit` + MCP `drakon.mutatediagram`/`drakon.savediagram` to `DiagramRepository.upsert()`. Closes the "403-forever" gap §3.4 review flagged. 91/91 tests on .184+.30, tsc clean, dry-run bundles clean. See "Slice 3.3 diagrams-write-path review notes" below. |
| 3.3 §4 steps 6-7 (retire OWNER_EMAILS, tenant-or-legacy-owner gate) | **MERGED (f9e76489b) + DEPLOYED (version 391cdebd, 2026-08-23)** | `verifyOwnerAuth()`'s OWNER_EMAILS/OWNER_EMAIL/owner-label branch removed (fail-open warning gone). Central `ROUTE_AUTH_TABLE` gate + room/diagram-sync DO routes now pass `'owner'` on legacy owner (MCP_API_KEY, Worker-JWT) OR a resolved tenant via `resolveTenant()`. MCP_API_KEY retirement and `/auth/login` explicitly deferred per Q ("так, окремим кроком"). 220/220 tests on .30, 97/97 cross-verified on .184. Smoke-tested live: /health=200, /v1/diagram/:id/sync and /ws/room/:id both correctly 401 unauthenticated. |
| 3.4-old | NOT STARTED | server-resident spec resolution (round-2 synthesis's original numbering) — blocked on 3.3 completing |
| 3.5 | NOT STARTED | generic runner registry — blocked on 3.4a (now unblocked) |
| 4.4 | NOT STARTED | tenant-filtered MCP (pulled forward in the plan) — blocked on 3.4a (now unblocked) |
| 3.7 | NOT STARTED | OpenBotHarnessAdapter — blocked on 3.3-3.5 |
| 4.0-4.3 | NOT STARTED | RunSnapshot/audit/verifier (LLM-as-a-Verifier integration) — blocked on 3.7 |
| 4.5 | NOT STARTED | generic UI — blocked on 4.0-4.3 |
| 3.4a (server-resident harness spec resolution, ADR-0020) | **MERGED (76a834c36, 591610d77) + DEPLOYED (version 544a9f89-54ab-4439-b149-a9a22452e389)** | `handleDrakonExecuteDeterministic` resolves+validates `HarnessSpec` server-side via `HarnessSpecRepository` (D1, tenant-scoped) instead of trusting client `harness_spec`/`gates`. Client (`usePipelineExecution.ts`/`pipeline-client.ts`) now sends `{specId, drakon_ir, breakpoints}`. Dual-accept flag `REJECT_LEGACY_HARNESS_SPEC=false` (open). Two real defects found+fixed during review before merge: (1) `drakon_ir` dropped entirely from client request in the original agy commit — fixed same night; (2) `harness_specs` D1 table was empty with no way to pre-seed a not-yet-created tenant — closed with a self-healing fallback (`createDefaultSpec()`+`upsert()` on D1 miss, commit 6d5d1bd79). Side effect: the two-tenant isolation test's semantics shifted from "wrong specId → 404" to "wrong specId → 200 with caller's own default spec, never the other tenant's" — isolation still holds, but a bad specId now silently succeeds instead of erroring; worth a UX/observability look later, not a blocker. 147/147 tests, cross-verified .234+.184. Smoke-tested live: /health=200, unauthenticated pipeline-execute=401. Unblocks 3.5 and 4.4.

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
flag-back. This is SAFE (deny-by-default, no regression) but at the time meant the
diagram-sync feature could not actually complete a first sync in practice, because nothing
wrote rows into the `diagrams` D1 table. **RESOLVED same session — see "Slice 3.3
diagrams-write-path" below.**

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

**RESOLVED:** Q approved, merged to main (35b681c3).

## Slice 3.3 diagrams-write-path review notes (2026-08-23, after merge)

Follow-up to close the gap the §3.4 review flagged. Implemented by agy on .30, this time in
an isolated git worktree (`ai-drakon-scaffolder-diagwrite`, own checkout, own branch) rather
than switching branches in the main working copy — cleaner isolation than the §3.4 round.

**What's correct:**
- Found and wired BOTH real diagram-write code paths: `handleDrakonCommit` (REST
  `/v1/drakon/commit`) and the MCP tool `drakon.mutatediagram`. Each calls `resolveTenant()`
  (same pattern/fallback as §3.4) then `DiagramRepository.upsert(...)` after a successful
  MinIO write.
- Added `DiagramRepository.upsert()` (get→update if exists, else create) rather than forcing
  every call site to duplicate that branching — good factoring, consistent with the class's
  existing constructor-bound-tenantId style.
- **Found and fixed a real, separate bug while there**: the MCP tool `drakon.savediagram`
  built an internal synthetic `Request` to call `handleDrakonCommit` but never forwarded the
  caller's `Authorization` header — without this fix, `resolveTenant()` would always fail for
  that specific MCP path (no JWT to verify), silently falling through to a degraded tenant
  ID every time. Not something I asked for; agy found it by tracing the actual call path.
- `project_slug`/`name` values are pulled from already-validated data at each call site
  (`folderSlug`, `normalized.name` in the REST path; `folderId` in the MCP path) — not
  invented placeholders. `.update()` never touches `project_slug`, so the two write paths
  can't drift/conflict on that field even if their naming differs.
- 91/91 tests (cloudflare-worker + packages/tenancy, 10 new: 7 route-contract + 3
  repositories), passing identically on .30 and .184. tsc clean. `wrangler --dry-run` bundles
  cleanly, same 5 live bindings as before (still no `DIAGRAM_SYNC` — no production risk).
- One leftover uncommitted noise file (`src/routeTree.gen.ts`, pure line-ending diff, no
  content change) found during review and discarded before merge — not part of the feature.

**Merged to main:** commit 9cb8fdc06, 2026-08-23.

**Known residual gaps carried forward (same as §3.4, not reintroduced, not fixed here):**
MCP_API_KEY callers still collapse to a shared `'mcp-agent'` tenant bucket; Worker-level
tests still exercise `resolveTenant()`'s fallback path, not its real Appwrite-network happy
path.

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

- Inline auth checks inside individual handler functions (handleNotesCommit etc.) were left
  in place as redundant defense-in-depth, not cleaned up.
- docs/contracts/worker-route-auth-matrix.md (v1, stale/wrong) still exists alongside v2 —
  should be deleted or marked superseded.
- **`cloudflare-worker/wrangler.toml` (default-discovered, non-canonical) still contains a
  `[[migrations]]` block and is DANGEROUS** — confirmed live 2026-08-23: running
  `wrangler deploy` without `--config worker-wrangler.toml` picks THIS file by default and
  fails at the Cloudflare API (100403, exports-vs-migrations conflict). It didn't corrupt
  anything (API rejects atomically) but wastes a deploy cycle and could confuse a future
  operator who doesn't already know to pass `--config`. Should be deleted, renamed to make
  it obviously non-canonical, or updated to mirror `worker-wrangler.toml`'s `[exports.*]`
  blocks so either file is safe to use. `wrangler-antigravity.jsonc` also still undisposed.
- CI (`sdd-verify.yml`) red since 2026-08-19 — separate ticket, not blocking, per Q.
- ADR-0006 (`.lovable` frontend/backend parity) is stale — `.lovable` was deliberately
  deleted this session (commit e0f1a779) — but the ADR file itself was never updated to say
  `superseded-by` or `status: obsolete`. A future reader hitting ADR-0006 cold will think
  `.lovable` still exists.
- `RoomDO` still has no confirmed frontend caller (unlike `DiagramSyncDO`, which does, via
  `y-websocket` in `DrakonEditor.tsx`) — flagged as a possible deletion candidate, still not
  acted on, still Q's call not the architect's/agent's to make unilaterally.

## Resolved since last version of this doc

- `scripts/sdd_llm_judge.py` / `update_plan.py` gitignore swallow — FIXED (`.gitignore` now
  has explicit `!scripts/sdd_llm_judge.py` / `!update_plan.py` negations, both files tracked).
- Slice 3.3 §4 steps 6-7 (OWNER_EMAILS retirement) — merged AND deployed (see Status table).

## Oracle dependency

Oracle Cloud Claude instance is on a weekly usage limit until 2026-08-25 09:00 Europe/
Zurich (still ~1.5 days out as of this writing) — anything in the synthesis report's
O-1..O-10 Oracle-Deferred list stays blocked until then.

## Recommended next action

**Slice 3.3 is now fully complete and deployed end-to-end**: D1 schema, `packages/tenancy`,
room/diagram tenant ownership (§3.4), the diagrams-table D1 write path, the `DIAGRAM_SYNC`
binding, and OWNER_EMAILS retirement (steps 6-7) are all merged to `main` and live in
production (current deployed version: `391cdebd-c54d-4354-a498-3237539c5aea`). There is no
more global "owner" role reachable via a plain Appwrite login — auth is genuinely
tenant-scoped now per ADR-0025, with `MCP_API_KEY` and Worker-JWT-owner kept as intentional,
explicitly-scoped exceptions (service/automation access, not a backdoor for regular users).

Per the round-2 synthesis's slice sequence, `slice/3.4-old` (server-resident spec
resolution), `3.5` (generic runner registry), and `4.4` (tenant-filtered MCP) were all
blocked ONLY on Slice 3.3 — that block is now lifted. The new architect's first real job is
to pick the order among these three (or propose a different one) and produce the same level
of detail Slice 3.2/3.3 got before implementation — see ARCHITECT-START-PROMPT.md for the
concrete task framing and proposals to weigh.

Two items explicitly deferred, NOT part of the next slice unless the architect argues
otherwise: MCP_API_KEY retirement (needs new per-tenant `ZoneSecret` infrastructure, not yet
designed) and `/auth/login`'s fate.

## Note for future DO-binding work: `exports` vs `migrations`

This Worker is now permanently committed to the declarative `exports` flow for Durable
Object bindings (RoomDO, DiagramSyncDO) — Cloudflare's API rejects any deploy attempt using
the older `[[migrations]]` block once a Worker has been deployed via `exports` (API code
100403). Any FUTURE new Durable Object class must be added the same way: a new
`[exports.ClassName]` block with `type = "durable-object"` and `storage = "sqlite"`,
never a `[[migrations]]` entry. Always `--dry-run` first — the two failure modes tonight
(mixing `migrations`+`exports` in one file; attempting to revert to `migrations` at all)
were both caught before touching live state, but only because dry-run/deploy-time errors
were checked rather than assumed clean.

