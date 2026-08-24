# Addendum: LLM-as-a-Verifier integration with the workforce vision

**Date**: 2026-08-24, third round of NotebookLM cross-examination (same notebook,
`08ddaf87-5d8f-413b-8246-9d80bb1cc94d`).
**Status**: Proposed, NOT yet GitNexus-verified (this addendum is research output, needs
the same step-6 verification pass as SYNTHESIS-round2.md before it becomes plan/ADR text).

## Why this exists

Q flagged that `llm-as-a-verifier` (already planned, per
`docs/reports/2026-08-23-openbot-verifier-final-synthesis.md`, as Slice 4.0-4.3 —
a Python scoring/ranking library hosted as an Appwrite Function, originally scoped to
verify AI coding-agent trajectories) becomes a materially more important piece under the
organizational-workforce vision: the same pattern that catches an AI agent falsely
claiming "I fixed the bug" can catch a worker falsely claiming "I fixed the leak" —
useful for collective optimization of real operational processes, not just code review.

## Core adaptation (verified against the actual `llm_verifier` API surface, not hand-waved)

The existing library's real primitives — `select() -> VerifierResult` (per-criterion
independent scoring, criteria loaded from a markdown file with `### Criterion Name`
headings) and the "don't trust self-narration, check the actual evidence" ground rule —
translate directly:

- **Software**: don't trust "I fixed the bug", check the actual terminal output/test
  results.
- **Field work**: don't trust "I fixed the leak", check the actual empirical artifact
  (photo of the repaired part, barcode scan of the replacement component, sensor
  telemetry) submitted alongside the Micro-ADR / task completion.

## Example operational criteria file (same format as `criteria/TEMPLATE.md`)

```markdown
### Physical Evidence Integrity {#evidence_integrity}
Compare the worker's text claims against the actual uploaded artifacts (photo, barcode
scan, sensor reading). Score HIGH only with explicit, un-falsifiable evidence of the
claimed state change. Score LOW if evidence is absent, unrelated, or doesn't show the
completed state.

### Workflow Adherence {#workflow_adherence}
Compare the worker's actual path through the DRAKON IR against the prescribed path
(including mandatory safety/diagnostic steps). Score LOW if safety checks were skipped
or blocked states were cleared without approval.

### Resolution Coherence {#resolution_coherence}
Does the final logged state match the initially reported problem? Score LOW if the action
taken doesn't address the reported symptom, or post-work telemetry shows the anomaly is
still active.
```

## Integration with the Micro-ADR promotion pipeline — WITHOUT reviving the rejected
   auto-promotion mechanism

SYNTHESIS-round2.md explicitly rejected confidence-score-driven auto-promotion (opaque,
unauditable, real safety risk if a hallucinated score silently merges unsafe field notes).
The verifier integration must not reintroduce that under a different name. The proposed
shape avoids it:

1. Every submission still lands as `PENDING_REVIEW` in D1 — **no automated path to
   `PROMOTED`**, full stop.
2. On shift close, the verifier runs `K=4` independent scoring passes (matching the
   existing MVP's own `K=4` discipline from the original openbot-verifier synthesis) over
   the operational criteria above.
3. Results are **purely advisory sorting/prioritization**, never a gate: high-dispersion
   (disagreeing) scores → "High Uncertainty" flag; low mean score → "Verification Failed"
   flag with the specific failing criterion named; otherwise → "clean pass," eligible for
   the lead to bulk-approve.
4. A human lead still makes every promotion decision — the verifier's only job is
   ordering the review queue and surfacing what to look at closely, never deciding for
   the lead.
5. New table (proposed, not yet verified): `tenant_shift_verifications(tenant_id,
   work_item_id, verifier_version, scores_json, variance, reasoning_summary,
   created_at)` — same tenant-scoped-repository discipline as everything else, advisory
   table, never joined into an authorization/gate decision path.

## MVP scope (mass-user-simplicity constraint applied)

**Build**: the advisory table above, the Python Appwrite Function hosting `llm_verifier`
(reusing the existing four-call-site POST-execution/GET-status pattern the Worker already
has), N=1/K=4 scoring (matching the original MVP's own bound, not a new number), simple
red/yellow/green pill indicators + expandable reasoning snippet in the lead's review UI.

**Defer**: `ProgressTracker` online step-by-step scoring (expensive, needs SSE/
prefix-caching infra not yet built), Best-of-N tournaments (irrelevant — a worker
produces exactly one trajectory, not competing candidates to rank), any automated
side-effect (no auto-reject, no locking the worker's app, no forced rework) — verifier
output is read-only signal, never an action-taker.

## Next step

Same as SYNTHESIS-round2.md: verify concrete claims (does the Worker's existing four
POST-execution/GET-status call sites actually have the shape this addendum assumes? does
`llm_verifier`'s real `select()` signature match what's described here, re-check against
the actual `/home/vokov/projects/llm-as-a-verifier` clone, not just the prior synthesis
report's summary of it?) via GitNexus before this becomes real plan/ADR text — fold into
the Slice 5.1 architect plan's governance section as a noted future extension, not
in-scope for the first slice itself (this is Slice 4.0-4.3 territory, still blocked on
3.5/3.7 per CURRENT-PLAN.md).
