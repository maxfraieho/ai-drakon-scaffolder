# @ai-drakon/policy-engine

Pure, unit-tested evaluation logic for the deterministic-engine's 4-Gate
Control Plane -- `evaluateSafetyGate`, `evaluatePolicyGate`,
`evaluateConfidenceGate`, `evaluateCostGate`, and the `capabilityMatches`
wildcard matcher. Extracted from
`services/deterministic-engine/src/main.ts` (Phase 2 Slice 3, ADR-0020).

**Status:** active. `services/deterministic-engine/src/main.ts` imports
these four functions and calls them in the same order as before
(safety → policy → confidence → cost), passing in already-resolved inputs
(compiled safety regexes, harness_spec config values, and -- for the
confidence/cost gates -- values that are inherently orchestration- or
randomness-driven, computed by `main.ts` itself and passed in rather than
recomputed here).

**Scope:** pure evaluation only. Logging, event sequencing, the
NotebookLM context-injection mock, the Math.random()-driven LLM-node
token-cost simulation, and "question" node branch selection all remain in
`main.ts` -- see the package's `src/index.ts` header comment for the exact
per-gate split rationale. No React, Vite, Worker APIs, Appwrite SDKs,
NotebookLM, network, or filesystem access.

Depends on `@ai-drakon/harness-contract` for the shared `GateVerdict`
type. Every function reproduces the original inline logic bit-for-bit,
including known unresolved gaps carried over unchanged:
`gates.safety.require_human_approval` is part of the harness spec type
but is not read anywhere in this package (nor was it in the original
code) -- implementing it is out of scope for this slice.
