# Synthesis: Organizational AI-Workforce Vision (round 2)

**Author**: Claude, synthesizing two independent research passes (Gemini Spark +
NotebookLM's second pass) cross-examined via 4 rounds of `chat_ask` against both
documents plus this project's existing architecture docs.
**Date**: 2026-08-24
**Status**: Proposed synthesis — resolves ADR-0026's Q1–Q4 and Q6 concretely enough to
scope a first slice, but **not yet verified against live GitNexus/codebase state**. Every
file path, table name, and existing-mechanism claim below needs the same G1/G2-style
verification pass every other slice this project has gotten before real implementation
starts (see CURRENT-PLAN.md's established discipline). Treat this as the input to that
verification, not a finished plan.

---

## How this was produced

Both research documents (`RESEARCH-RESULT-1-gemini-spark.md`, `Organizational AI
Workforce Vision Research.md`) were loaded into a NotebookLM notebook alongside
ADR-0026, `EXISTING-SYSTEM-LOGIC-SCHEMAS.md`, `CURRENT-PLAN.md`, and
`0012-bidirectional-drakon-ir.md`. Four rounds of adversarial questioning followed:
(1) where the two passes disagree and which is more consistent with the codebase,
(2) devil's-advocate against the "winning" pass's own claim to satisfy ADR-0026's
mass-user-simplicity constraint, (3) the smallest concrete first implementation slice,
(4) what both passes failed to address entirely. Notebook:
`08ddaf87-5d8f-413b-8246-9d80bb1cc94d`.

---

## Resolved: Q1 — Client bootstrap path

**PWA, not Termux.** Both research passes initially disagreed here (pass 1: PWA; pass 2:
Termux+local Node+SQLite), but round-2 questioning found pass 2's Termux proposal
self-contradicts ADR-0026's own "no dev constructs exposed to frontline personnel"
requirement — sideloading Termux, running shell bootstrap scripts, and babysitting a
background daemon is a developer workflow, not a mass-user one.

- **Client**: standard PWA on the existing React + Vite + TanStack Router frontend.
  Offline storage via browser-native IndexedDB or SQLite-over-OPFS, not a native SQLite
  process.
- **Native wrapper (Capacitor/Tauri)**: deferred, but likely necessary later for camera/
  barcode/Bluetooth-sensor access and reliable push notifications — flag as a real gap in
  a pure-PWA approach (see "New gaps" below), not something to promise away.
- **Auth**: WebAuthn/passkeys or SMS OTP, not corporate email+password — matches the
  mass-user constraint better than reusing today's Appwrite dashboard-login flow as-is.
- **Onboarding**: QR-code provisioning from a lead's dashboard (scan → auto-install PWA →
  auto-provision Appwrite credentials + initial `org_path`), not manual signup.
- **Shared/kiosk devices**: needs an explicit fast-user-switching mode (PIN/RFID/
  biometric) with per-user local-storage namespace isolation — today's auth model assumes
  one persistent logged-in user per device, which breaks on a wall-mounted shift tablet.

## Resolved: Q2 — Personal vs. organizational knowledge-base boundary

**On-device personal tier, deterministic staging queue for promotion — not cloud-side
"private" tables, not confidence-score auto-promotion.**

- Personal/unverified worker notes (raw observations, in-progress drafts) live entirely
  on-device (IndexedDB/OPFS), never synced until the worker explicitly submits them.
  **Must be encrypted at rest** — see device-loss gap below, neither pass addressed this.
- Promotion path: worker submits → lands in a new D1 table as `PENDING_REVIEW` → a
  subdivision lead manually approves/rejects via a simple list UI → approved rows become
  visible to the subdivision.
- **Explicitly rejected**: the earlier confidence-score (`C ≥ θ_auto`) auto-promotion idea
  from research pass 2 — non-deterministic, unauditable, and a real security risk (a
  hallucinated high confidence score could auto-merge unverified/unsafe field notes into
  shared knowledge with no human check). AI's role is limited to drafting a clean summary
  of the worker's raw input, never gatekeeping.
- **Correction to both passes**: neither MemPalace nor GitNexus are usable here — both are
  session-local development tooling (used by Claude/agy while building this codebase),
  not deployed product infrastructure. Confirmed by Q directly. Any promoted-knowledge
  search in the actual product needs its own mechanism (plain D1 `LIKE`/FTS for a first
  slice; vector search is a later, separate addition, not free from reusing dev tooling).

## Resolved: Q3 — AI-supervisor granularity

**Static `harness_specs` role archetype, not a dynamically-hydrated per-request
supervisor context.** A "supervisor" is a specialized `agent_name` row (same pattern
Slice 3.4a/4.4 already built for `architect`/`docs`/etc.), with its own `allowed_tools`
grant. A worker's material/tool request becomes a standard MCP `tools/call` against the
supervisor's scoped tool set, filtered and audited exactly the way Slice 4.4 already
does it — not a bespoke real-time agent-orchestration layer rebuilt per request. This is
both simpler (reuses tested infrastructure) and more consistent with the stateless
Cloudflare Workers execution model than a "persistent supervisor process per team" idea
from research pass 1.

## Resolved: Q4 — Vocabulary generalization

Both passes independently converged on the same abstract-primitive table — treat as
settled pending naming bikeshedding, not a real disagreement:

| Abstract primitive | Factory | Building | Office/knowledge team |
|---|---|---|---|
| `OrgUnit` | Workshop | Building/complex | Department |
| `TeamPod` | Brigade/crew | Service team (plumbing/HVAC) | Squad |
| `ParticipantRole` | Technician | Maintenance/concierge | Specialist |
| `DutyCycle` | Shift | On-call/dispatch window | Workday/sprint phase |
| `CoordinatorAgent` | Shift supervisor | Property dispatcher | Project coordinator |
| `OperationalRecord` | Tool/machine log | Maintenance ticket | Decision record/memo |

## Resolved: Q6 — Organizational hierarchy shape

**Materialized-path sub-groups within one tenant** (`org_path` like `/root/workshop-3/
assembly-b/`), not nested tenants. Both passes converged on this independently — nested
tenants would fracture ADR-0025's hard isolation guarantee and massively complicate
billing aggregation.

**Critical correction found during round-2 questioning, not present in either original
pass**: naive `org_path LIKE '/prefix/%'` filtering written ad hoc in route handlers is a
real regression from ADR-0025's actual discipline (isolation enforced by construction —
an unscoped query unrepresentable in the type system — not developer memory). The
sub-group boundary must get the same treatment `tenantId` already gets: a repository
class with `orgPathPrefix` bound at the constructor, so an unscoped or wrongly-scoped
query is a compile-time impossibility, not a discipline problem. Sketch:

```typescript
class ScopedWorkItemRepository {
  constructor(
    private db: D1Database,
    private tenantId: string,
    private orgPathPrefix: string, // bound once, from the authenticated caller's own path
  ) {}
  list() {
    return this.db.prepare(
      `SELECT * FROM tenant_work_items WHERE tenant_id = ? AND org_path LIKE ?`
    ).bind(this.tenantId, `${this.orgPathPrefix}%`).all();
  }
}
```

## Correction: reuse MCP surface, don't build parallel REST routes

Both research passes proposed new plain REST endpoints (`/v1/workforce/tasks`,
`/v1/workforce/sync`) for the PWA client. This duplicates auth/validation/audit logic
that Slice 4.4 already built and tested. New worker-facing actions should be new MCP
tools (e.g. `workforce.get_tasks`, `workforce.sync_logs`) with their own `agent_name`
role entries in `harness_specs`, going through the existing `tools/list`/`tools/call`
filtering + `McpToolAuditRepository` machinery — not a second, parallel API surface.

## Correction: DRAKON diagrams need state-machine traversal, not flattening

Neither pass's "present the diagram as a vertical checklist" idea survives contact with
real diagrams — the actual `.drakon.json` samples in this research folder have branches
and questions, not linear-only sequences (a factory boiler check needs to branch to a
lockout sequence on an out-of-range reading; a leak repair branches on where the isolation
valve is). The PWA client should traverse the DRAKON IR as a state machine: show only the
current node and its outgoing choices, advance `current_step_id` to whichever branch the
worker picks. No IR schema changes needed — this uses the existing IR structure as-is,
just walked by the client instead of flattened.

## `tenant_members` table — justified, not redundant with Appwrite Teams

Appwrite Teams (already used by `resolveTenant()`) handle the top-level tenant perimeter
and basic role labels, but have no concept of a materialized-path hierarchy — you cannot
prefix-query an Appwrite Team for "everyone under this subdivision." A new `tenant_members`
D1 table (keyed by `tenant_id` + `user_id`, storing `role_id` and `org_path`) is a
necessary extension, not duplication — Appwrite still owns authentication/session
identity, `tenant_members` owns where-in-the-org-tree a given member sits.

**Must include from day one** (even though the full billing engine is deferred):
`invited_by`, `created_at`, `deactivated_at` columns. Q's stated monetization model is
recursive delegation with dynamic monthly billing by participant count — omitting these
columns now would force a painful migration later just to reconstruct delegation lineage
and active-participant history that should have been captured from the start.

## New gaps surfaced — neither research pass engaged with these seriously

These need real answers before a full spec, not just a first slice:

1. **Offline sync conflict resolution.** "Offline-first" alone doesn't say what happens
   when two workers modify the same task/resource state while both offline and reconnect
   at different times. Needs an explicit policy (CRDT-style merge, or a checkout/lock-lease
   model) — "last write wins" will silently corrupt physical-world state tracking (e.g.
   two people believing they each have the same tool checked out).
2. **Device loss/theft.** A worker's phone carries real operational data (checklists,
   facility layouts, draft field notes). Needs: encryption at rest for local storage,
   a remote-revocation/poison-pill mechanism (session-invalidation checked via heartbeat,
   triggering local purge), and data-minimization (cache only the worker's own `org_path`
   subtree locally, not the whole tenant).
3. **Zero-IT onboarding.** Covered above (QR provisioning + passwordless credentials) —
   flagged here as a gap because neither original pass considered it at all, not because
   it's unsolved now.
4. **Shared/kiosk device auth.** Also covered above — flagged as a gap neither pass
   noticed: today's auth model assumes one persistent user session per device.
5. **Multilingual runtime.** Q writes in Ukrainian; workers in a real deployment may read
   a third language entirely (Polish, Spanish, etc.); the codebase and tool names are in
   English. Needs per-node localization in the DRAKON IR's displayed text and a
   translation step for AI-generated instructions/summaries — not addressed by either pass.
6. **Native hardware + battery.** A pure browser PWA has limited access to camera/
   barcode-scan/Bluetooth-sensor APIs and persistent WebSocket connections drain mobile
   battery over an 8-hour shift. Likely needs a thin Capacitor/Tauri native wrapper later,
   and the client should default to event-driven polling rather than a persistent
   connection when idle. Neither pass weighed this against the "pure PWA" recommendation.

## Smallest concrete first slice (proposed, NOT yet GitNexus-verified)

**New D1 tables** (exact final shape needs verification against current `infrastructure/
d1/schema.sql` conventions and migration numbering — see Slice 4.4's `001-mcp-tool-audit.sql`
precedent):
- `tenant_members(tenant_id, user_id, role_id, org_path, invited_by, created_at,
  deactivated_at)`
- `tenant_work_items(tenant_id, item_id, org_path, assigned_user_id, title,
  drakon_diagram_id, current_step_id, status, updated_at)`
- `tenant_micro_adrs(tenant_id, adr_id, org_path, author_id, title, context,
  action_taken, outcome, status[PENDING_REVIEW|PROMOTED|REJECTED], created_at, updated_at)`

**New/modified code** (paths are proposals, need re-locating via GitNexus before trusting
them — this project's standing rule): a `ScopedWorkItemRepository`/similar in
`packages/tenancy` following the pattern above; two new MCP tools (`workforce.get_tasks`,
`workforce.sync_logs`) plus their `agent_name` harness-spec entries; a PWA route for the
worker's shift UI (state-machine DRAKON traversal, not a flattened list) and a lead's
simple approve/reject review UI; browser-side IndexedDB/OPFS wrapper with encryption.

**Explicitly out of scope for this first slice**: dynamic LLM-driven supervisor context
(supervisor = static role archetype only), vector/RAG search over promoted knowledge
(plain SQL match for v1), any DRAKON IR schema changes, native wrapper / hardware access,
actual billing calculation (structural columns only), multilingual runtime, offline
conflict-resolution beyond a naive policy (needs its own design pass first — flagged
above, not solved here).

**Test plan shape** (mirroring Slice 3.3/3.4a's established convention): subgroup-prefix
isolation test (member A's `org_path` never sees member B's sibling subtree — same rigor
as the two-tenant tests every D1-touching route has needed since Slice 3.3), tenant
cross-boundary rejection test, offline-capture-then-sync round-trip test, deterministic
promotion-queue test (PENDING_REVIEW → PROMOTED via explicit approve action, never
automatic).

## Next step

Verify every concrete claim above (file paths, current repository shapes, D1 migration
numbering, whether `packages/tenancy` conventions match what's assumed here) against the
LIVE codebase via GitNexus before turning this into an actual architect plan / ADR-0027 /
`specs/NNN-.../spec.md` — same discipline as every prior slice. This document is
input to that verification, not a substitute for it.
