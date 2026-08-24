---
status: proposed
date: 2026-08-24
deciders: Q, platform architecture
spec:
supersedes:
superseded-by:
---

# 0026. Reframe the platform as a multi-tenant organizational AI workforce

## Context

Everything built through Slice 3.3–4.4 gives `ai-drakon-scaffolder` a tenant boundary
(`tenant_id` = Appwrite `teamId`, ADR-0025) and a per-agent-role spec model
(`harness_specs.agent_name` → `allowed_tools`, Slice 3.4a/4.4). Neither was designed with
a specific end-user picture in mind — they were built to close concrete security gaps
(cross-tenant leakage, capability escalation between MCP callers).

Q's stated product vision (2026-08-24 conversation, not yet written down anywhere else)
reframes what a "tenant" and an "agent" actually represent in practice: a tenant is an
**organization** — a factory with workshops/brigades/engineers, or a non-industrial
example like a multi-apartment building's management (utilities, legal, administration).
Within that organization, each individual worker/specialist gets their own AI agent
access point: installable on a phone (bootstrapped via Termux, eventually a proper app),
with a personal specialized knowledge base built from ADR-style records that AI agents
process and fold into the organization's shared system. When "on shift" / online, a
worker uses a UI to receive tasks, add their own experience back to the shared knowledge
base, communicate with an AI supervisor agent about process/materials/tools needed, and
report status.

This is a materially different framing from "AI-DRAKON as a dev tool for building AI
pipelines" — it points toward the *deployed product* built with AI-DRAKON being itself an
organizational AI-workforce coordination layer, with individual human workers as
first-class participants alongside AI agents, not just an internal admin/ops surface.

**This ADR captures the vision as stated, at the level of detail available today. It does
not yet make binding technical decisions** — Q has explicitly framed this as an initial
sketch to be detailed further (with DRAKON diagrams of concrete user workflows and a
fuller strategy document) before any implementation planning starts. Sections below marked
TBD are open questions this ADR exists partly to surface, not resolve.

## What's already load-bearing (confirmed, not proposed)

- `tenant_id` = organization. Already true per ADR-0025 — no change needed, this vision is
  additive interpretation, not a schema change.
- `harness_specs.agent_name` = a natural fit for "specialized worker role" (factory
  brigade, engineer, building's utilities manager, etc.) — the repository pattern
  (tenant-scoped, one row per role, `allowed_tools` gating what that role's agent can
  invoke) already matches the shape this vision needs. Slice 4.4's vocabulary work
  (choosing `allowed_tools` per `agent_name`) is a direct, if narrower, precedent for
  "each role gets a scoped capability set."
- ADR-as-knowledge-unit is already the project's own convention (`docs/adr/`) — reusing
  that same format for a *worker's* personal knowledge base is a natural, not a novel,
  choice.

## Open questions (round 1) — RESOLVED 2026-08-24, second research pass

Full reasoning trail: `docs/research-org-workforce-vision-2026-08-24/SYNTHESIS-round2.md`
(two independent research passes, cross-examined via NotebookLM chat against this ADR and
the existing codebase docs). **Not yet GitNexus-verified against live code** — treat as
proposed pending that pass, same discipline as every other slice.

1. **Client bootstrap path — RESOLVED: PWA, not Termux.** Termux's shell-script/daemon
   bootstrap contradicts this ADR's own "no dev constructs exposed to frontline
   personnel" principle. Standard PWA (existing React/Vite/TanStack frontend),
   IndexedDB/OPFS for offline storage, WebAuthn/passkeys or OTP auth (not corporate
   email+password), QR-code onboarding, shared-kiosk fast-user-switching mode. A native
   wrapper (Capacitor/Tauri) is a likely later addition for camera/Bluetooth/push, not
   day-one scope.
2. **Personal knowledge base scope and boundary — RESOLVED: on-device tier +
   deterministic staging queue.** Personal/unverified notes stay on-device (encrypted at
   rest), promoted only via an explicit `PENDING_REVIEW` → manual-approve D1 staging
   table — not confidence-score auto-promotion (rejected as non-deterministic and
   unauditable), not MemPalace/GitNexus (confirmed dev-tooling only, not deployed product
   infrastructure).
3. **"AI supervisor" role — RESOLVED: static harness-spec role archetype.** A supervisor
   is a specialized `agent_name` row (same Slice 3.4a/4.4 pattern already built), not a
   dynamically-hydrated per-request agent context. Worker requests to a supervisor are
   ordinary MCP `tools/call`s against that role's `allowed_tools` grant.
4. **Non-industrial generalization — RESOLVED: both research passes independently
   converged on the same abstract-primitive vocabulary** (`OrgUnit`/`TeamPod`/
   `ParticipantRole`/`DutyCycle`/`CoordinatorAgent`/`OperationalRecord`, with
   per-domain lexicon overlays) — see SYNTHESIS-round2.md for the full mapping table.
5. **Relationship to the existing AI-DRAKON product surface — RESOLVED (2026-08-24):**
   this is a reframing of AI-DRAKON's own frontend, not a separate product surface. New
   `src/` surface area on the existing frontend, consuming the existing Worker/D1
   backend — not a second deployed app.

## New corrections found during round-2 synthesis (not in either original research pass)

- **`org_path` sub-group scoping must be repository-enforced**, not raw `LIKE`-prefix SQL
  written in route handlers — otherwise it's a real regression from this ADR's own
  construction-enforced isolation discipline (§3, mirrors `tenantId`).
- **New worker-facing actions should be MCP tools (reusing Slice 4.4's filtering/audit
  machinery), not a parallel REST API** — both research passes proposed new REST routes
  without considering the MCP surface already built for exactly this purpose.
- **DRAKON diagrams need state-machine traversal, not flattening to a linear checklist**
  — real diagrams branch (see `sample-pipelines/*.drakon.json`); both passes' "vertical
  checklist" framing silently assumed linear-only workflows, which doesn't hold for real
  factory/building tasks that branch on conditions.

## New open questions (round 2) — surfaced by adversarial review, neither pass addressed

1. **Offline sync conflict resolution.** No policy defined yet for two workers modifying
   the same task/resource state while both offline (CRDT-style merge vs. checkout/lock
   lease) — "last write wins" risks silently corrupting physical-world state tracking.
2. **Device loss/theft.** Needs encryption-at-rest for local storage, a remote-revocation/
   poison-pill mechanism, and data-minimization (cache only the worker's own `org_path`
   subtree, not the whole tenant).
3. **Multilingual runtime.** Q writes Ukrainian; real deployments may involve workers in a
   third language entirely, while the codebase/tool names are English. Needs per-node
   DRAKON IR localization and translation middleware for AI-generated content — unaddressed
   by either research pass.
4. **Native hardware + battery.** Pure browser PWAs have limited camera/Bluetooth-sensor
   access and persistent WebSockets drain mobile battery over a shift — likely needs a
   thin native wrapper and event-driven polling instead of persistent connections, a real
   tension with the "pure PWA" recommendation above that neither pass weighed.


## What would help detail this further

Per Q's own plan to provide DRAKON schemas of user workflow logic — concretely, the
following flows would resolve the open questions above fastest, roughly in priority
order:

1. **Worker onboarding/bootstrap** — from "organization decides to onboard a
   worker/role" to "worker has a working agent on their phone." Resolves Q1.
2. **A single "on shift" work cycle** — task received → work performed → materials/tools
   requested from supervisor → experience/knowledge added back → status reported →
   shift ends. Resolves Q2 and Q3 together; this is likely the highest-value diagram
   since it's the core recurring loop.
3. **Knowledge base authoring/promotion** — how a worker's own ADR-style record gets
   written, and what "joining the overall system" concretely means as a data flow
   (review step? automatic? AI-agent-mediated summarization before merge?). Resolves Q2.
4. **A non-industrial example end-to-end** (the building-management case) — even a rough
   sketch, specifically to pressure-test whether the factory-shaped vocabulary above
   (shift, brigade, supervisor) survives generalization or needs renaming into more
   neutral terms. Resolves Q4.

A short strategy note alongside the diagrams — even a few sentences — on Q5 (is this a new
product surface or a reframing of AI-DRAKON itself) would let planning start on the right
side of that fork instead of guessing.

## Organizational structure and billing (added 2026-08-24, second pass)

Q also described the ownership/growth/billing model for a tenant:

- **Project owner** = the tenant's root user, pays for the subscription. Creates the
  first cohort of participants directly.
- **Recursive delegation**: users the owner adds can themselves add further users —
  membership isn't flat owner-creates-everyone, it's a tree. This is how the
  subdivision/sub-project/department/brigade structure Q described earlier
  (§Context) actually gets built: each person who onboards others effectively creates
  their own branch of the org chart within the tenant.
- **Billing**: time-based, monthly packages priced by participant count, with the
  explicit note that pricing tiers "can be dynamic" — i.e. cost scaling as
  participants are added/removed mid-cycle, not just fixed seat blocks purchased
  upfront.

**New open question this raises (Q6)**: the current tenancy model (ADR-0025) treats a
`tenant_id` as a flat Appwrite Team — `resolveTenant()` creates one personal team per
top-level user, with no concept of nested sub-groups within a tenant. This vision needs
either (a) a hierarchy *within* one Appwrite Team (e.g. via team roles/labels marking
subdivision membership), or (b) nested tenants (a sub-tenant whose parent is another
tenant) — a materially bigger change to the tenancy model than (a). Which of these two
shapes fits depends on whether cross-subdivision boundaries need the SAME hard isolation
guarantee ADR-0025 gives between top-level tenants (unscoped-query-unrepresentable), or a
softer "same organization, different visibility" boundary. Worth a dedicated DRAKON
diagram: **who can see/act-on whose data** across owner → subdivision → individual
worker, since that's the concrete question the billing/hierarchy model turns on.

## Design principle: simplicity for the mass user (added 2026-08-24, third pass)

Q explicitly flagged that the current AI-DRAKON design is too complex for this vision's
target audience. The redesign must be oriented toward the **mass/general user** (a
factory-floor worker, a building resident — not a developer), which Q framed as needing
**simple internal logic**, not just a simplified UI layered over the current complexity.
This is a constraint on the architecture, not only the frontend: whatever the org-hierarchy
(Q6) and per-role-agent (§Context) mechanisms end up being, they need to be simple enough
in their own operation that they don't leak complexity into the user-facing flows — a
UI can't fully hide a genuinely complicated underlying model. Worth treating as an
explicit design constraint alongside the open questions above, not an afterthought for
the eventual frontend pass: when the DRAKON workflow diagrams (§What would help) get
drawn, simplicity of the diagram itself is a signal of whether the underlying design is
actually simple, not just prettified.

## Decision

Not yet made. This ADR exists to record the vision as stated and the open questions it
raises, so the next planning pass (architect-level, once the diagrams above exist) starts
from a written artifact instead of re-deriving this conversation from scratch.

### Consequences

* Good, because the vision is now a durable, linkable artifact instead of only living in
  a chat transcript that will scroll out of context.
* Good, because the open-questions list gives Q a concrete, prioritized shape for what to
  produce next (the DRAKON diagrams), rather than an open-ended "describe everything."
* Neutral, because this ADR makes no binding technical commitment — it will very likely
  need real edits (or a `superseded-by`) once the diagrams and strategy land and the open
  questions above get resolved.

## Additional information

Source: Q, live conversation, 2026-08-24 (this session). No prior written document exists
for this vision as of this ADR's authoring. Related, narrower precedent already in the
codebase: ADR-0025 (tenancy boundary), Slice 3.4a/4.4 (per-agent-role `harness_specs` and
`allowed_tools` — the closest existing implementation of "each specialized role gets a
scoped agent").
