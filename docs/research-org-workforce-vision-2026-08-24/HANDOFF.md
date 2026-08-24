# HANDOFF — Organizational AI-Workforce Vision Research Package

**Created**: 2026-08-24
**Purpose**: everything needed to run (or hand to a human running) a Gemini Deep Research
pass detailing Q's organizational AI-workforce redesign vision for AI-DRAKON's own
frontend, and everything needed for whoever picks up the output afterward.

## What this folder is

Separate from `docs/architect-handoff-2026-08-23/` (that package is for the
tenancy/MCP-filtering backend work, Slice 3.3–4.4 — unrelated track, still active in
parallel: Slice 4.4's filtering logic landed on a branch tonight and still needs review/
merge, see that folder's CURRENT-PLAN.md for status).

This folder exists because Q described a substantial product-direction vision live in
conversation on 2026-08-24 — reframing AI-DRAKON's own frontend around organizations
(factories, apartment buildings) with per-worker AI agents, personal knowledge bases, and
a recursive-delegation billing model — and wants it detailed via deep research before an
architect plans real implementation work against it.

## Files in this folder

- `DEEP-RESEARCH-PROMPT.md` — the actual prompt to run through Gemini Deep Research.
  Read this first, it explains what to attach and why.
- `ADR-0026-organizational-ai-workforce-vision.md` — copy of `docs/adr/0026-...md` as it
  stood when this research package was assembled. **The canonical version lives in
  `docs/adr/`** — if it's been updated since, re-copy before running the research, don't
  trust this copy blindly for anything beyond archival record of what the research was
  run against.
- `EXISTING-SYSTEM-LOGIC-SCHEMAS.md` — three minimal Mermaid flow diagrams of how the
  CURRENT system routes a request (auth/tenant resolution, MCP tool filtering by role,
  harness-spec resolution) — written by Claude this session, grounded in code verified
  directly during tonight's Slice 3.2–4.4 review work, not a guess. Gives the research
  pass an accurate current-state picture without needing to re-derive it from the full
  code dump.
- `00-sdd-overview.md` — copy of `docs/sdd-book/00-overview.md` (this project's SDD
  methodology in one page; the copy IN `docs/sdd-book/` is dated 2026-08-18 and hasn't
  been regenerated since — treat as directionally accurate, not perfectly current).
- `0012-bidirectional-drakon-ir.md` — copy of the ADR explaining DRAKON IR as this
  platform's existing bidirectional code↔diagram contract.
- `sample-pipelines/` — 8 real `.drakon.json` pipeline files from
  `services/architect-agent/pipelines/`, showing what the platform's OWN internal
  DRAKON-based logic looks like today (distinct from the new user-facing workflow
  diagrams Q is going to draw for the vision itself — these are existing-system
  reference material, not part of the new vision).
- `ai-drakon-scaffolder_code_dump.md` / `.pdf` — full codebase snapshot, generated fresh
  for this package (see regeneration command in the architect-handoff folder's
  `ARCHITECT-START-PROMPT.md` if it goes stale: `python3
  /home/vokov/projects/resume/md_to_embeddings_service_v4.py --source
  /home/vokov/projects/ai-drakon-scaffolder --output <path>.md` — pass a `.pdf` path for
  the PDF form directly, the tool supports both).
- `CURRENT-PLAN.md` — copy of the tenancy/MCP-filtering track's status doc, included so
  the research doesn't propose something that conflicts with or duplicates work already
  decided/in-flight on that separate track.

## What's still open / not done

- The research hasn't been run yet — this folder is the input package, not the output.
- Q said they will separately provide DRAKON diagrams of the actual user workflow logic
  (onboarding, the core "on shift" loop, knowledge-base promotion, a non-industrial
  worked example) — those are NOT in this folder yet. When they arrive, add them here
  and note in `DEEP-RESEARCH-PROMPT.md`'s "Attach these files" section.
- Once research comes back: update ADR-0026 (or write ADR-0027+) with resolved answers to
  its open questions, then a `specs/NNN-.../spec.md`, before any implementation planning
  starts — same discipline as every other slice this project has used.
