---
name: notebooklm-research-pipeline
description: "MANDATORY step before writing or updating any ADR/spec that captures a product-vision or architecture decision sourced from external research (Gemini Spark, deep research, or any AI research pass outside this codebase). Use when the user shares a research document/vision, asks to 'research this', or before turning a vision conversation into an ADR. Enforces: research → NotebookLM adversarial cross-examination → GitNexus verification against live code → then write the ADR/spec. Skipping straight from research to ADR is not allowed."
---

# NotebookLM Research → Verify → ADR Pipeline

## Why this exists

2026-08-24: two independent AI research passes on the same product vision (organizational
AI-workforce reframing, ADR-0026) disagreed with each other on several load-bearing points,
and both independently proposed things that were factually wrong about this codebase
(MemPalace/GitNexus treated as deployed product infrastructure — they are dev-tooling
only) or architecturally inconsistent with this project's own stated invariants (a raw
`LIKE`-prefix SQL scoping proposal that regresses ADR-0025's construction-enforced tenant
isolation). Adversarially cross-examining the research against itself and against the
existing codebase — via NotebookLM's `chat_ask`, not by trusting either document at face
value — caught all of this before it reached an ADR. That cross-examination is the
mandatory step this skill encodes.

**NotebookLM replaces the "first draft architect."  It does NOT replace GitNexus
verification against live code.** Research output can invent plausible-sounding file
paths, table names, and "existing mechanisms" that don't actually exist or don't match
current state — it has no live access to this repo. Every concrete technical claim in a
NotebookLM-produced synthesis must still be checked against the real codebase (GitNexus
query, live D1 row counts, actual file re-location by name not by any line number the
research guessed) before it becomes an ADR decision or implementation scope — the exact
same G1/G2-style discipline every code slice in this project already requires.

## The pipeline (all steps required, in order)

### 1. Assemble the research package

New folder under `docs/research-<topic>-<date>/` (see
`docs/research-org-workforce-vision-2026-08-24/` for the reference shape). Include:
a deep-research prompt document, a copy of the governing ADR/vision doc, minimal
current-state schemas (Mermaid flow diagrams or similar — grounded in verified code, not
guessed), relevant existing ADRs/methodology docs, and a fresh code dump if the research
tool needs full-codebase grounding. See `~/.claude/skills/notebooklm-mcp/SKILL.md` for
NotebookLM API mechanics (server location, tool list, script usage).

### 2. Get the raw research (external tool)

Whatever tool the user specifies (Gemini Spark, Deep Research, etc.) — this step happens
outside this session; the user pastes the result back in, or it's saved as a file.
**Never skip straight from this step to writing an ADR.**

### 3. Load into a NotebookLM notebook

Create (or reuse) a notebook via `notebooks_create`, upload every file from the research
package via `sources_add_file` (prefer this over `sources_add_text` for real files — but
note NotebookLM's raw upload endpoint rejects some mime types, e.g. `.json`; fall back to
`sources_add_text` with the file's content for those, matching the file's actual name as
the title). If more than one independent research pass exists, load all of them into the
SAME notebook so cross-examination in step 4 can compare them directly.

**Size limit encountered in practice**: `chat_ask` can hit "RPC response exceeded
52428800 bytes" if a huge source (a multi-MB full-codebase PDF dump) is pulled into every
question's context. Scope `chat_ask` calls with the `source_ids` parameter to the smaller,
relevant docs and exclude the code-dump source when this happens.

### 4. Adversarial cross-examination (the mandatory core of this skill)

Ask `chat_ask` questions in this order — do not settle for one shallow "summarize this"
question:

1. **Disagreement mapping**: if multiple research passes exist, where do they materially
   disagree, and which is more consistent with the existing codebase's stated invariants
   (cite specific ADRs/docs, not vibes)?
2. **Devil's advocate against the "winning" answer**: given this project's own explicit
   design constraints (e.g. ADR-0026's mass-user-simplicity mandate), which parts of the
   apparently-better proposal are themselves NOT actually simple / NOT actually
   consistent, and does the research's own text self-contradict on this? Push back
   explicitly — don't accept a research pass's self-assessment that it satisfies a
   constraint.
3. **Concrete minimal slice extraction**: ask for the smallest shippable implementation
   slice at the SAME level of concreteness this project's own Slice N plans use (exact
   files, exact D1 schema, exact test plan) — reject vague product language.
4. **Gap-finding**: ask what BOTH (or all) research passes failed to address entirely —
   operational realities like offline-conflict handling, security of lost devices,
   onboarding without IT support, multilingual needs, hardware/battery constraints, or
   whatever category of real-world friction the vision touches. Research passes
   consistently underweight this category.

Save every meaningful `chat_ask` exchange's substance into the research folder (not just
the raw research documents) — either as an updated research-result file or a dedicated
synthesis document (see step 5).

### 5. Compile a synthesis document

One file (e.g. `SYNTHESIS-round2.md`) in the research folder that: resolves each open
question with a concrete answer and its reasoning, lists corrections found during
cross-examination that neither original research pass had, lists newly-surfaced open
questions the gap-finding step raised, and states explicitly **this has not yet been
verified against live code** — that's the next step, not this one.

### 6. GitNexus verification (mandatory, not skippable)

Before any claim from the synthesis becomes an ADR decision or implementation scope:
query GitNexus (`repo="ai-drakon-scaffolder"`) for every concrete file path, function
name, table name, and "existing mechanism" claim the synthesis makes. Confirm they
actually exist and match the shape described — don't trust research-guessed line numbers
or invented conventions (e.g. a proposed table name that sounds plausible but doesn't
exist yet is fine as a NEW proposal, but must be labeled as new, not described as if it
already exists). This is the same verification discipline this project's own architect
plans (Slice 3.3, 3.4a, 4.4) have used before any code got written.

### 7. Write or update the ADR/spec

Only now. Update the governing ADR (or write a new one) with the verified synthesis,
referencing the research folder and the verification pass. Follow the existing MADR-style
template (`docs/adr/template.md`) and this project's numbering convention.

## What NOT to do

- Don't paste a research document straight into an ADR without cross-examination — every
  research pass so far has contained at least one factually-wrong or self-contradictory
  claim that only surfaced under adversarial questioning.
- Don't accept a research pass's own claim that it satisfies a stated constraint (e.g.
  "this design is simple") without explicitly asking a skeptical follow-up.
- Don't treat NotebookLM's synthesis as verified against live code — it isn't, and can't
  be, since it has no GitNexus/live-repo access. Step 6 is not optional.
- Don't skip the gap-finding question (step 4.4) — it's the one that catches what neither
  research pass thought to address at all, not just what they got wrong.
