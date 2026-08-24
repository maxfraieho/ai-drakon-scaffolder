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

## Open questions (TBD — need Q's further input before this becomes actionable)

1. **Client bootstrap path.** Termux-on-Android is stated as the starting point, "далі
   застосунком" (later as a proper app). Is Termux a real intended interim distribution
   channel for actual organizational end-users, or a development/prototyping convenience
   that shouldn't shape the architecture? This materially affects whether the mobile
   client is designed as a thin API consumer from day one (portable to a native app
   later) or something more Termux-specific.
2. **Personal knowledge base scope and boundary.** "Own specialized knowledge base... from
   ADR records... processed by AI agents... joined into the overall system" — is a
   worker's personal KB private-then-promoted (worker authors, reviews, then it merges
   into the org's shared KB), or live-shared from the start? Does it live in the same D1
   tenant-scoped tables as everything else, or does per-worker knowledge need its own
   storage shape (more document/vector-oriented than the current relational
   `harness_specs`/`diagrams` tables)?
3. **"AI supervisor" role.** Described as something a worker communicates with about
   process, needed materials/tools, and reporting. Is this a single per-organization
   supervisor agent, one per department/brigade, or one per worker (a personal
   assistant that escalates to a shared supervisor)? This is a harness-spec /
   `agent_name` design question, not just a UI one.
4. **Non-industrial generalization.** The building-management example (utilities, legal,
   administration) suggests the "organization" concept needs to generalize beyond a
   literal workplace-with-shifts model. Is "on shift" specific to labor contexts, or does
   the vision need a more general "actively engaged with the system" state that also
   fits, e.g., a resident interacting with building management occasionally rather than
   during a shift?
5. **Relationship to the existing AI-DRAKON product surface.** Is this an additional
   product mode built on the same tenancy/agent infrastructure (AI-DRAKON stays a
   dev-pipeline tool; this is a separate deployed application using the same backend
   primitives), or a reframing of what AI-DRAKON's own frontend should become? Affects
   whether this lives as new `src/` surface area or a wholly separate consumer of the
   Worker/D1 backend.

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
