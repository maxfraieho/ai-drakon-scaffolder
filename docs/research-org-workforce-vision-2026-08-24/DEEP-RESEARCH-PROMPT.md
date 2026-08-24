# Deep Research Prompt — Organizational AI-Workforce Vision (Gemini Deep Research)

**Purpose of this document**: paste the prompt below (or the whole file) into Gemini Deep
Research, alongside the attached files listed in "Attach these files" below. This is not
an implementation task — it's a research/detailing pass to turn Q's vision (ADR-0026)
into something concrete enough for an architect to plan against.

---

## The prompt

You are doing deep research to help detail an early-stage product vision for
`ai-drakon-scaffolder`, an existing Cloudflare Workers + Appwrite + D1 SaaS platform that
today builds AI-assisted development pipelines around DRAKON diagrams (a visual flowchart
language) and Spec-Driven Development (SDD: specs + ADRs as the source of truth for why
the system is built the way it is).

**The vision** (full text: `ADR-0026-organizational-ai-workforce-vision.md`, attached):
the platform's own frontend should be reframed so that a "tenant" is a real-world
organization (a factory with workshops/brigades/engineers, or a non-industrial example
like a multi-apartment building's management — utilities, legal, administration), and
each individual worker/specialist within that organization gets their own lightweight AI
agent (installable on a phone, Termux-bootstrapped for now, a proper app later) with a
personal knowledge base built from ADR-style records, processed by AI agents, and folded
into the organization's shared system. Workers receive tasks, communicate with an AI
supervisor agent about process/materials/tools, add their own experience back to the
shared system, and report status when "online"/on-shift. Growth is recursive — the
project owner (who pays, billed monthly by participant count, dynamically) creates the
first participants, and those participants can themselves add further participants,
building an org structure of subdivisions/sub-projects/departments/brigades. **A hard
design constraint Q stated explicitly: the redesign must target the mass/general user
(not a developer), with SIMPLE internal logic — not a simplified UI layered over
complexity that still exists underneath.**

**What the existing system already provides** (see `EXISTING-SYSTEM-LOGIC-SCHEMAS.md`,
attached, for three minimal current-state flow diagrams — auth/tenant resolution, MCP
tool filtering by role, and harness-spec resolution): a tenant boundary enforced by
construction (ADR-0025), a per-role "harness spec" model with scoped tool grants
(Slice 3.4a/4.4 — the closest existing precedent for "each worker role is a scoped
agent"), and DRAKON IR as an existing bidirectional code↔diagram contract
(`0012-bidirectional-drakon-ir.md`, attached) already used for the platform's own
pipeline definitions (sample real pipeline DRAKON-JSON files attached for reference —
these represent the CURRENT internal-logic pattern the platform already uses
internally, not the new user-facing workflows this research is about).

**What this research should produce** — work through these in order, and be concrete
(cite specific mechanisms, not just restate the vision back):

1. **Resolve ADR-0026's open questions Q1–Q4** (client bootstrap path, personal
   knowledge-base scope/boundary, AI-supervisor granularity, generalization beyond
   industrial "shift" vocabulary) with concrete proposed answers, reasoned from how the
   existing tenancy/harness-spec/DRAKON-IR mechanisms could realistically extend to
   support each one — not free-floating product opinions detached from what this
   codebase can actually do.
2. **Design the org-hierarchy shape for Q6** (nested sub-groups within a tenant vs.
   nested tenants) — recommend one, with the tradeoff reasoning made explicit, especially
   against ADR-0025's existing hard-isolation guarantee between tenants. Sketch (in
   DRAKON-diagram-describable terms — nodes and decision points, not prose) who can
   see/act on whose data across owner → subdivision → individual worker.
3. **Produce the core recurring-loop diagram**: a single "worker on shift" cycle (task
   received → work performed → materials/tools requested from AI supervisor → experience
   added back to shared knowledge → status reported), described precisely enough that it
   could be redrawn as an actual DRAKON diagram by a human or by this platform's own
   DRAKON-IR tooling.
4. **Produce the knowledge-base authoring/promotion flow**: how a worker's own ADR-style
   record gets written, reviewed (if at all), and merged into the organization's shared
   knowledge — is this AI-agent-mediated summarization, a human review step, automatic,
   or some mix? Reason about what's simple enough to satisfy the mass-user constraint
   above.
5. **Stress-test the vocabulary against the non-industrial example** (the
   apartment-building case) — does "shift," "brigade," "supervisor" survive as neutral
   terms, or does the model need renaming/generalizing? Give a concrete second worked
   example (the building case) alongside the first (factory case) so both are covered by
   the same underlying model, not two different models wearing different words.
6. **Flag anything in the existing SDD/ADR/DRAKON-IR methodology** (see attached
   `00-sdd-overview.md`) **that this vision would need to extend or work around** — e.g.
   does "a worker's personal ADR record" fit the existing ADR format/tooling as-is, or
   does it need a lighter-weight variant since ADRs today are written by
   developers/architects, not factory workers?

Do not propose specific UI mockups or pixel-level design — this is about the underlying
logic and data/workflow model, matching the explicit "simple internal logic, not just a
simple UI" constraint. Where you're genuinely uncertain or the existing codebase doesn't
give enough signal to answer confidently, say so explicitly rather than inventing a
confident-sounding answer — this research feeds a real architect-level plan afterward,
and a wrong confident answer is worse than a flagged open question.

## Attach these files (from this same folder unless noted)

- `ADR-0026-organizational-ai-workforce-vision.md` — the vision itself (source of truth
  for what's being researched).
- `EXISTING-SYSTEM-LOGIC-SCHEMAS.md` — three minimal current-state flow diagrams.
- `00-sdd-overview.md` — this project's SDD methodology in one page.
- `0012-bidirectional-drakon-ir.md` — how DRAKON IR works as a code↔diagram contract
  today.
- `sample-pipelines/` — real `.drakon.json` pipeline definitions from
  `services/architect-agent/pipelines/` (8 files), showing what the platform's own
  internal DRAKON-based logic looks like in practice today.
- `ai-drakon-scaffolder_code_dump.pdf` — full current codebase, for grounding any claim
  that needs verifying against actual code rather than documentation (documentation can
  drift from code; treat the code dump as higher-truth where they conflict, per this
  project's own stated provenance convention).
- `CURRENT-PLAN.md` — current slice/feature status, so research doesn't propose
  something already decided against or already in flight elsewhere.

## After the research comes back

This is an input to a NEW architect planning pass, not a final design. Bring the output
back into this session (or paste it into the chat) — the next step is writing an updated
ADR-0026 (or a new ADR-0027+) and a concrete `specs/NNN-.../spec.md` once the open
questions above have real answers, following the same discipline every other slice this
project has used (verify claims against live state, don't implement from a paraphrase).
