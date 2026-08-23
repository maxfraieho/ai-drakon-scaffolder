You are the architect for the `ai-drakon-scaffolder` project. This is your starting prompt
for the next work cycle — Slice 3.3 (tenancy/D1) is now fully complete and deployed. Follow
this in order; it will get you oriented without re-deriving context that already exists.

## Step 1 — read these files, in this exact order

1. `docs/architect-handoff-2026-08-23/HANDOFF.md` — condensed narrative of everything that
   shipped this session, including Slice 3.3's full build (D1 schema, tenancy package,
   room/diagram ownership, diagrams write path, DIAGRAM_SYNC binding, OWNER_EMAILS
   retirement) and one live landmine (`wrangler.toml` vs `worker-wrangler.toml`) found along
   the way. Read this first — it tells you what NOT to re-investigate.
2. `docs/architect-handoff-2026-08-23/CURRENT-PLAN.md` — the status table (every slice,
   done/deployed vs not-started) and a "Known-not-done" list of small open items.
3. `docs/adr/0025-tenancy-boundary.md` — the six decisions that governed everything Slice
   3.3 built. Slice 3.3 implements this ADR exactly; do not re-litigate its decisions,
   but DO use it as the reference for what "tenant-scoped" means everywhere from here on.
4. `docs/reports/2026-08-23-openbot-verifier-final-synthesis.md` — the authoritative
   architecture document for the full Slice 3.0c-4.5 sequence: objectives/prerequisites/
   files/tests/rollback per slice, Owner Decision Memo (17 items, already accepted — do not
   re-litigate), Security Invariants SI-1..SI-12, Open Questions Q-1..Q-17.
5. `docs/contracts/worker-route-auth-matrix-v2.md` — current, verified-accurate 68-route
   auth inventory. A `worker-route-auth-matrix.md` (no "v2") also exists and is stale —
   ignore it (it's on the cleanup list, see Step 3 below).

## Step 2 — the task: pick and plan the next slice

Per the round-2 synthesis, `slice/3.4-old` (server-resident spec resolution), `3.5`
(generic runner registry), and `4.4` (tenant-filtered MCP) were all blocked ONLY on Slice
3.3's tenancy infrastructure. That block is now lifted — all three are implementable.

**Your job**: pick one (or propose a different order, with reasoning) and produce a
concrete, reviewable implementation plan at the same level of detail Slice 3.2 and 3.3 got
— objective, prerequisite check, files touched, test plan, rollback plan. Do not implement
it yourself in this pass unless explicitly asked; the plan needs sanity-checking first.

**Proposals worth weighing when you pick (not a prescription — your call, with reasoning)**:

- **`4.4` (tenant-filtered MCP) has the most direct security payoff** — it closes the gap
  where an MCP client authenticated as one tenant could plausibly enumerate or act on
  another tenant's resources through the generic MCP tool surface, the same class of bug
  Slice 3.3 just closed for rooms/diagrams. If there's any active MCP client usage in
  production right now, this is the highest-leverage next step.
- **`3.5` (generic runner registry) is the one most likely to unblock parallel work** — 3.7
  (OpenBotHarnessAdapter) and everything in 4.0-4.3 (RunSnapshot/audit/verifier) sits behind
  it. If the near-term goal is reaching the LLM-as-a-Verifier integration, this is the
  critical path.
- **`3.4-old` (server-resident spec resolution) is the most self-contained** — smallest
  blast radius, good candidate if you want a lower-risk slice to firm up the new tenancy
  patterns (repository classes, `resolveTenant()` usage) before the bigger runner-registry
  and MCP-surface work.

**Two items deliberately NOT in scope for this next slice** (already decided by the project
owner, don't re-open): `MCP_API_KEY` retirement and `/auth/login`'s fate. Both are real,
both need a proper design (the API-key one needs new per-tenant `ZoneSecret` infrastructure
that doesn't exist yet) — flag if you think either should be pulled forward, but don't just
do it.

## Step 3 — small housekeeping worth a look, not gating the next slice

These don't block Step 2 and can be picked up opportunistically or delegated separately:

- `cloudflare-worker/wrangler.toml` (default-discovered, non-canonical) still has a
  `[[migrations]]` block that conflicts with the canonical `worker-wrangler.toml`'s
  `[exports.*]` declarations — a real deploy attempt without `--config` fails at the
  Cloudflare API. Should be deleted, clearly marked non-canonical, or brought in sync.
- `docs/contracts/worker-route-auth-matrix.md` (v1) should be deleted or marked
  superseded-by v2 — currently just sits there as a trap for whoever reads it cold.
- `ADR-0006` (`.lovable` frontend/backend parity) is stale — `.lovable` was deliberately
  deleted this session — but the ADR itself was never marked `superseded`/`obsolete`.
- `RoomDO` still has no confirmed frontend caller (contrast: `DiagramSyncDO` does, via
  `y-websocket`). Worth a real investigation (not another grep-only pass) before anyone
  decides whether it's dead code or just not-yet-wired-up.
- CI's `sdd-verify.yml` has been red since 2026-08-19 (separate from the local, working,
  shadow-mode SDD Arbiter pre-commit hook) — likely a missing `pip install pytest` step,
  unconfirmed. Not urgent per the project owner, but worth a ticket.

## Step 4 — things you should NOT do

- Don't re-run the 68-route audit — v2 is already exhaustive and high-confidence.
- Don't re-investigate the 17 Owner Decision Memo items or ADR-0025's six decisions —
  already accepted, closed.
- Don't assume Oracle Cloud is available — weekly usage limit until 2026-08-25 09:00
  Europe/Zurich; anything deferred to it (O-1..O-10 in the synthesis report) stays blocked.
- Don't implement MCP_API_KEY retirement or touch `/auth/login` without a fresh, explicit
  decision from the project owner — both are intentionally parked, not forgotten.
- Don't commit large generated artifacts (code dumps, PDFs) into git.
- When you DO propose implementation work, remember: Claude = architect/planner/reviewer,
  real coding work gets delegated to `agy` fleet agents (`.30`, `.234`) using their own
  GitNexus MCP for code search first — don't write the plan assuming a human or a single
  monolithic session does the typing.
