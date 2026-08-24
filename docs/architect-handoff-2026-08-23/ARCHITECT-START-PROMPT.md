You are the architect for the `ai-drakon-scaffolder` project. Slice 3.4a (server-resident
harness spec resolution) is now fully complete and deployed. This is your starting prompt
for the next work cycle — follow it in order.

## Step 1 — read these files, in this exact order

1. `docs/architect-handoff-2026-08-23/HANDOFF.md` — condensed narrative of everything
   shipped, including Slice 3.4a's full build, two real defects found and fixed during
   review (a dropped `drakon_ir` field, an empty-D1 self-heal gap), and infra notes
   (`.234` stability fix, `.30` currently unreachable, the `wrangler.toml` landmine).
2. `docs/architect-handoff-2026-08-23/CURRENT-PLAN.md` — status table (every slice,
   done/deployed vs not-started) and "Known-not-done" list of small open items.
3. `docs/adr/0020-policy-engine-design.md` and `specs/006-spec-resolution/spec.md` — what
   Slice 3.4a actually implements and locks in. Read `docs/adr/0025-tenancy-boundary.md`
   too if you haven't internalized the tenancy model yet — 3.5/4.4 both build on it.
4. `docs/reports/2026-08-23-openbot-verifier-final-synthesis.md` — the authoritative
   architecture document for the full Slice 3.0c-4.5 sequence: objectives/prerequisites/
   files/tests/rollback per slice, Owner Decision Memo (17 items, already accepted — do
   not re-litigate), Security Invariants SI-1..SI-12, Open Questions Q-1..Q-17.

## Step 2 — the task: pick and plan the next slice

Per the synthesis, both `3.5` (generic runner registry) and `4.4` (tenant-filtered MCP)
were blocked on 3.4a (server-resident spec resolution — the registry/MCP surface needs a
`specId` that actually resolves to something real, which is now true). Both are
implementable now.

**Your job**: pick one (or propose a different order, with reasoning) and produce a
concrete, reviewable implementation plan at the same level of detail Slice 3.3/3.4a got —
objective, prerequisite check (verify claims against the LIVE repo/D1 state, the way the
3.4a plan verified `harness_specs` schema and row count before writing scope — don't
trust the synthesis report's line numbers or assumptions blindly, they predate several
slices' worth of changes), files touched, test plan (including a tenant-isolation test
per ADR-0025 decision #4 for any new D1-touching route), rollback plan. Do not implement
it yourself in this pass unless explicitly asked.

**Notes worth weighing when you pick**:

- `4.4` (tenant-filtered MCP) has direct security payoff, closing the same class of gap
  Slice 3.3/3.4a closed for diagrams/rooms/harness-specs — an MCP client authenticated as
  one tenant should not be able to enumerate or act on another tenant's resources through
  the generic MCP tool surface. If there's active MCP client usage in production, this is
  high-leverage.
- `3.5` (generic runner registry) is on the critical path to `3.7`
  (OpenBotHarnessAdapter) and `4.0-4.3` (RunSnapshot/audit/verifier — the
  LLM-as-a-Verifier integration). If reaching that integration is the near-term goal,
  this is the one to unblock first.
- Slice 3.4a's self-heal fallback (any resolved `specId` with no D1 row gets a fresh
  default spec, silently, with a 200) is a real behavioral precedent worth knowing before
  designing 3.5's registry semantics — decide deliberately whether the registry should
  follow the same "self-heal silently" pattern or fail loudly for an unknown runner/spec
  reference, don't just copy the precedent without considering whether it's still right
  at the registry layer.

**Not in scope for whichever slice you pick**: `MCP_API_KEY` retirement, `/auth/login`'s
fate (both parked, need a fresh explicit decision from the project owner), Slice 3.4b
(human-approval PEP relocation) — Oracle-gated, unavailable until 2026-08-25 09:00
Europe/Zurich, do not implement or design around it being ready.

## Step 3 — small housekeeping worth a look, not gating the next slice

- `cloudflare-worker/wrangler.toml` (default-discovered, non-canonical) still conflicts
  with the canonical `worker-wrangler.toml` — confirmed twice now to cause a failed
  deploy attempt if `--config worker-wrangler.toml` is forgotten. Should be deleted or
  brought in sync.
- `docs/contracts/worker-route-auth-matrix.md` (v1) should be deleted or marked
  superseded-by v2.
- `ADR-0006` (`.lovable` parity) is stale (`.lovable` deliberately deleted) but not
  marked `superseded`/`obsolete`.
- `.specify/feature.json` is at `phase: "specify"` for `006-spec-resolution` even though
  real implementation code has landed under it (the SDD Arbiter correctly flagged this,
  shadow-mode, non-blocking) — move to `"implement"` or start a fresh spec number for
  whichever slice you plan next; your call which fits better.
- `RoomDO` frontend-usage question was resolved this session
  (`docs/architect-handoff-2026-08-23/ROOM-DIAGRAM-DEADCODE-INVESTIGATION.md`) — no
  longer an open item, just noting it's now answered if you see it referenced elsewhere.
- CI's `sdd-verify.yml` still red since 2026-08-19, not urgent per the project owner.

## Step 4 — things you should NOT do

- Don't re-verify Slice 3.3/3.4a's already-confirmed facts (D1 schema shape, tenant
  isolation model, ADR-0020/0025 decisions) — read HANDOFF.md/CURRENT-PLAN.md, trust what's
  marked done, spend your investigation budget on what 3.5/4.4 actually need instead.
- Don't assume Oracle Cloud is available — weekly usage limit until 2026-08-25 09:00
  Europe/Zurich.
- Don't implement MCP_API_KEY retirement or touch `/auth/login`.
- Don't commit large generated artifacts (code dumps, PDFs) into git.
- When you propose implementation work, remember: Claude = architect/planner/reviewer,
  real coding work gets delegated to `agy` fleet agents using their own GitNexus MCP for
  code search first (mandatory on this project, not optional) — write the plan assuming
  that division of labor, not a single session doing all the typing.
