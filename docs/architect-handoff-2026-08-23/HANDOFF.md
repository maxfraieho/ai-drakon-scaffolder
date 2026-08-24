SESSION 2026-08-22/23 — ARCHITECT HANDOFF (Claude Sonnet 5 architect, replacing Perplexity Pro)

**Updated 2026-08-23, end of session: Slice 3.3 (tenancy/D1) is now fully complete and
deployed.** This file previously described the state right as Slice 3.3 was starting — that
version is obsolete. Everything below reflects the actual end state.

## What this is

Package this session built for the architect working on `ai-drakon-scaffolder`. Read this
file first, then CURRENT-PLAN.md for the status table, then the referenced docs only as needed.

## Where everything lives (all on .184, repo ai-drakon-scaffolder)

- THIS FILE: docs/architect-handoff-2026-08-23/HANDOFF.md
- Prior architect synthesis (round 1, Opus): docs/reports/2026-08-23-openbot-harnessadapter-revised-plan.md
- Prior architect synthesis (round 2, Opus, fleet-reconciled, authoritative for the full
  Slice 3.0c-4.5 sequence, Owner Decision Memo, Security Invariants SI-1..SI-12): docs/reports/2026-08-23-openbot-verifier-final-synthesis.md
- ADR-0025 (tenancy boundary, governs everything Slice 3.3 did): docs/adr/0025-tenancy-boundary.md
- Route-auth matrix v1 (STALE, do not use): docs/contracts/worker-route-auth-matrix.md
- Route-auth matrix v2 (CURRENT, 68-route audit, basis for Slice 3.2): docs/contracts/worker-route-auth-matrix-v2.md
- CURRENT-PLAN.md (same directory) — status table + recommended next action, kept current

## What shipped this session (chronological, condensed)

**Slice 3.2** (declarative ROUTE_AUTH_TABLE, closes weak-auth-bypass on 7 routes + zero-auth
leak on 3 routes) — merged, deployed (version b84dad42). Full detail in the git log; not
re-summarized here since it's several sessions old relative to Slice 3.3 below.

**Slice 3.3 (tenancy/D1, per ADR-0025)** — the main body of tonight's work:
1. D1 schema applied live to `ai-drakon-saas` (6 tenant-scoped tables).
2. `packages/tenancy` built: `resolveTenant(request, appwriteConfig)` (real Appwrite Teams —
   `teams.list()` → `teams.create()` if empty → persist to `user_profiles.teamId`, with
   retry-on-conflict for concurrent first-provisioning races — Option A, not a fake
   tenant-of-one), plus 6 tenant-scoped D1 repository classes.
3. **§3.4 (room/diagram tenant ownership)**: `/ws/room/*` and `/v1/diagram/*/sync` Durable
   Object keys now prefixed `${tenantId}:${roomId}` instead of bare `roomId` — one tenant can
   no longer join another tenant's room/diagram session by guessing its ID. Diagram-sync also
   added an explicit `DiagramRepository.get()` ownership check (403, not 404, on mismatch).
4. **Diagrams-table D1 write path**: `handleDrakonCommit` and the MCP tools
   `drakon.mutatediagram`/`drakon.savediagram` now call `DiagramRepository.upsert()` after a
   successful MinIO write — closes a gap §3.4's review had flagged (diagram ownership checks
   existed but the D1 row they checked against was never actually written, so sync would 403
   forever for anyone). Also fixed, as a byproduct: `drakon.savediagram`'s internal synthetic
   request wasn't forwarding the caller's `Authorization` header, so `resolveTenant()` always
   failed for that specific MCP tool — real bug, found during review, fixed in the same pass.
5. **`DIAGRAM_SYNC` Durable Object binding**: existed in code since Slice 3.6 but was NEVER
   actually bound in the Worker config — confirmed via a live GET showing it absent from
   `exports`. Meant `/v1/diagram/*/sync` 500'd for everyone regardless of auth, and NONE of
   §3.4/write-path's diagram-tenancy work was reachable in production until this was fixed.
   Now declared under `[exports.DiagramSyncDO]` (see "exports vs migrations" note below) and
   live. Smoke-tested: previously-500ing route now correctly 401s unauthenticated callers.
6. **Steps 6-7: retire OWNER_EMAILS, tenant-or-legacy-owner central gate.**
   `verifyOwnerAuth()`'s `OWNER_EMAILS`/`OWNER_EMAIL`/owner-label branch — including its
   fail-open-with-warning behavior when unset — is gone. There is no more global "owner" role
   reachable via a plain Appwrite login, full stop, per ADR-0025 ("так, як задумано ADR-0025",
   explicit owner sign-off, no allowlist). The central `ROUTE_AUTH_TABLE` gate and the two DO
   dispatch points now accept `'owner'`-level access on EITHER the legacy `role === 'owner'`
   path (still reachable via `MCP_API_KEY` or a Worker-issued JWT — both intentionally KEPT,
   these are service/automation credentials, not a user backdoor) OR a successfully
   `resolveTenant()`-resolved tenant. Implemented by `agy.exe` on the .30 fleet host, reviewed
   (full diff read, not just the self-report), 220/220 tests passing on .30, 97/97
   cross-verified on .184. Merged (`f9e76489b`) and deployed live (version
   `391cdebd-c54d-4354-a498-3237539c5aea`), smoke-tested: `/health`=200,
   `/v1/diagram/:id/sync` and `/ws/room/:id` both correctly 401 for unauthenticated callers.

**Explicitly deferred, not part of this slice** (per Q, "так, окремим кроком"):
`MCP_API_KEY` retirement (needs new per-tenant `ZoneSecret` infrastructure, not designed
yet) and `/auth/login`'s fate. Do not silently retire either without a fresh decision.

**Small housekeeping, also closed tonight**: the `.gitignore`'s over-broad `*.py` rule was
swallowing `scripts/sdd_llm_judge.py` (the real SDD Arbiter script) and `update_plan.py` —
both now explicitly negated and tracked.

**Slice 3.4a (server-resident harness spec resolution, ADR-0020)** — shipped after this
file was first written, now also merged and deployed:
1. `handleDrakonExecuteDeterministic` in the Worker now resolves and validates
   `HarnessSpec` server-side via a new tenant-scoped `HarnessSpecRepository` (D1-backed,
   same repository pattern as `DiagramRepository`), instead of trusting client-supplied
   `harness_spec`/`gates`. `validateHarnessSpec` (previously written, zero call sites —
   confirmed via GitNexus before starting) now has its first real call site.
2. Client (`usePipelineExecution.ts`, `pipeline-client.ts`) no longer mints its own
   default policy (`createDefaultSpec()` client-side removed); sends `{specId, drakon_ir,
   breakpoints}`. `validateHarnessSpec`/`createDefaultSpec` relocated from
   `src/lib/harness/harness-spec.ts` (frontend-only) to `packages/harness-contract` (a
   shared workspace package the Worker can import), with `harness-spec.ts` re-exporting
   for backward compat.
3. Dual-accept transition: `REJECT_LEGACY_HARNESS_SPEC` flag landed OFF — legacy
   `harness_spec`-body requests still work (deprecation-warned), new `specId`-only
   requests work too. Flipping to reject-only is a separate, later, one-line change.
4. **Two real defects found during review, both fixed same night before merge**:
   - The first implementation dropped `drakon_ir` from the client request entirely
     (a literal-instruction flaw in the delegation prompt, not agy's fault) — the engine
     would have received `drakon_ir: undefined`, breaking all real pipeline execution.
     Fixed same session (commit `3d6d535fa`), verified with a new test asserting
     `forwardedPayload.drakon_ir` is actually forwarded.
   - `harness_specs` D1 table was live but empty, with no real tenant_id anywhere in D1
     yet (confirmed: 0 rows across every tenant-scoped table) — `resolveTenant()` creates
     a tenant's Appwrite Team lazily on first request, so there was no way to pre-seed a
     tenant that doesn't exist yet. Without a fix, the first real "run pipeline" attempt
     by anyone would 404. Closed with a self-healing fallback: if
     `HarnessSpecRepository.get()` finds nothing, generate via `createDefaultSpec()`,
     `upsert()` it into D1, and proceed (commit `6d5d1bd79`). **Side effect worth
     architect awareness**: this changed the two-tenant isolation test's semantics from
     "wrong specId → 404" to "wrong specId → 200 with the caller's own self-healed
     default spec (never the other tenant's real spec)". Isolation still holds (verified:
     tenant A gets `min_score: 0.7` default, never tenant B's real `0.99`, tenant B's row
     untouched) but a typo'd/wrong specId now silently succeeds instead of erroring —
     possibly worth an observability/metrics follow-up later, not a blocker.
5. 147/147 tests (145 baseline + 2 new for the self-heal path), cross-verified on both
   `.234` and `.184`. Merged (`76a834c36`, `591610d77`), deployed live (version
   `544a9f89-54ab-4439-b149-a9a22452e389`), smoke-tested: `/health`=200, unauthenticated
   `/v1/pipeline/execute-deterministic`=401.
6. New governance artifact: `specs/006-spec-resolution/spec.md` created, references
   ADR-0020 and ADR-0025, `.specify/feature.json` repointed off the stale
   `002-methodology-and-astryx-refactor` onto `006-spec-resolution` (was pointing at an
   unrelated Astryx/frontend spec — the SDD Arbiter had nothing correct to judge Slice
   3.4a's commits against until this was fixed). **Note for the next architect**:
   `feature.json`'s `phase` is still `"specify"` — the SDD Arbiter correctly flagged this
   as a real (shadow-mode, non-blocking) drift once real implementation code landed;
   worth moving to `"implement"` or adding a `plan.md`/`tasks.md` if picking 3.5/4.4 up
   under the same feature, or starting a fresh spec number for the next slice.

**Slice 3.4b (human-approval PEP relocation, "Adjustment C")** — explicitly NOT done,
deliberately held. Oracle Cloud Claude instance (needed to review this PEP-relocation
design decision per the original synthesis report) is on a weekly usage limit until
2026-08-25 09:00 Europe/Zurich. Do not implement this without that review.

## Infra note: `.234` stability + `.30` reachability

Mid-session, `.234` (the weaker Linux SBC used for `agy` delegation) became flaky —
SSH connections timing out on plain `echo`. Root cause: a 3-day-old zombie Chromium/Xvfb
stack (from an old `agent-workspace` MCP browser-automation session, PIDs from `сер21`/
Aug 21) pegged at ~95% CPU nonstop on a 897MB-RAM host. Killed (PID 294892 and children,
Xvfb 12468) — host immediately stabilized. Root-caused further: agy's MCP config
(`~/.gemini/antigravity-cli/mcp_config.json` on `.234`) spawns EVERY configured MCP
server on every `agy` invocation regardless of task relevance — the `agent-workspace`
entry literally SSHes into `.234` itself and launches a headless browser stack. Removed
`mempalace` and `agent-workspace` entries from that config (unneeded for code-delegation
tasks broadly, and `agent-workspace`'s browser automation is redundant with the existing
`.30`-driven browser-proxy pattern) — 10 MCP servers remain (gitnexus, ai-memory, drakon,
notebooklm, n8n, and several Windows-side chrome/comet SSE endpoints). If a future task
genuinely needs mempalace or local headless-browser MCP on `.234` specifically, re-add
the entries rather than assuming they're gone for a good reason unrelated to this.

Separately: `.30` (the Windows `agy.exe` fleet host, used for the bulk of Slice 3.4a's
actual implementation) is CURRENTLY UNREACHABLE as of this handoff (`No route to host`) —
unclear if this is a reboot, network change, or something else. Its
`ai-drakon-scaffolder-spec34a` worktree still exists there with an already-merged branch;
clean it up (`git worktree remove`) once reachable again, low priority.

## New finding this session: `wrangler.toml` is a live landmine

`cloudflare-worker/wrangler.toml` (the DEFAULT config wrangler auto-discovers — distinct
from the CANONICAL `worker-wrangler.toml`) still has a `[[migrations]]` block. Running
`wrangler deploy` without explicitly passing `--config worker-wrangler.toml` picks this file
and fails at the Cloudflare API level (error 100403 — this Worker was already committed to
the declarative `exports` flow earlier this session, and Cloudflare permanently refuses to
revert). The API rejects it atomically (no live-state corruption happened, verified), but it
wastes a deploy cycle and will confuse anyone who doesn't already know about the `--config`
requirement. **Always pass `--config worker-wrangler.toml` explicitly.** Flagged in
CURRENT-PLAN.md's "Known-not-done" as a cleanup candidate — not fixed tonight, still open.

## SDD Arbiter pre-commit hook

Exists on .184's git config (`core.hooksPath` → `.githooks/`), calls
`scripts/sdd_llm_judge.py --staged --dry-run` (shadow mode — prints a verdict, does not
block commits). Ran correctly all session, including a real PASS verdict on tonight's D1/
tenancy commits. CI's `sdd-verify.yml` (separate, unfiltered, runs on every push) has been
red since 2026-08-19 — likely a missing `pip install pytest` step, unconfirmed, not blocking
per Q, separate ticket.

## Deliberate design decisions this session, worth architect awareness

- Slice 3.2's central gate runs auth BEFORE route handlers' own binding-existence checks —
  an unauthenticated caller gets 401 even when a DO binding is missing (previously 500,
  leaking a config-error signal pre-auth). Still true, unchanged tonight.
- The tenant-or-legacy-owner OR-logic (steps 6-7) means `MCP_API_KEY` and Worker-JWT-owner
  remain fully privileged (equivalent to "owner" everywhere `resolveTenant()` would also
  pass) — this is intentional (service credentials), not an oversight, but it means those
  two paths are NOT tenant-scoped and can act across all tenants. Worth keeping in mind when
  MCP_API_KEY retirement is eventually designed.

## Still open / not done

See CURRENT-PLAN.md's "Known-not-done" section — kept as the single source of truth for this
list so it doesn't drift out of sync between two files. Summary: stale route-auth-matrix v1,
the wrangler.toml landmine above, ADR-0006 not marked superseded despite `.lovable` being
deleted, RoomDO's still-unconfirmed frontend usage, CI red ticket, and the two explicitly
deferred auth items (MCP_API_KEY, /auth/login).

## Fleet / infra notes

- .184 = canonical dev server (Alpine Linux), git push/pull authority, GitNexus + ai-memory
  live here. All real commits originate from or are relayed through here.
- .30 = Windows build/test host, `agy.exe` (Antigravity CLI) fleet agent lives here. `git
  push` from here is broken (Windows Credential Manager has no tty over SSH) — use the
  git-bundle relay pattern (bundle → scp → .184 → fetch/merge/push) instead. `agy.exe`
  invoked from THIS orchestrating Claude session's own Bash tool works fine even with
  `--dangerously-skip-permissions`; invoked from a spawned sub-agent's Bash tool, it can hit
  that sub-agent's own stricter permission ceiling ("don't ask mode" denial) — if that
  happens, the orchestrator running the command directly is the fix, not re-authorizing the
  sub-agent. Also: `agy.exe --print-timeout` defaults to 5 minutes — pass a longer value
  (e.g. `25m`) for any task involving `pnpm install`/`vitest`/`tsc`, or it aborts mid-run
  with uncommitted edits still on disk (recoverable via `agy.exe --continue --print '...'`
  to resume the same conversation and finish the job, rather than restarting from scratch).
- .234 = Linux SBC, `agy` CLI (same product, different install, GitNexus MCP available).
- GitNexus reindex after every push to main: `docker exec gitnexus-server node
  /app/gitnexus/dist/cli/index.js analyze /projects/ai-drakon-scaffolder` on .184.

## Recommendation for the architect's first move

Read CURRENT-PLAN.md's status table and "Recommended next action" section, then
ARCHITECT-START-PROMPT.md for the concrete task framing. Short version: Slice 3.4a is
fully done, deployed, and unblocks `3.5` (generic runner registry) and `4.4`
(tenant-filtered MCP). Plan whichever one goes first, at the same detail level Slice
3.2/3.3/3.4a got before implementation.
