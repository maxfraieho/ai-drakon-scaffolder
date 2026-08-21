// Unit tests for the pure gate-evaluation functions extracted from
// services/deterministic-engine/src/main.ts (Phase 2 Slice 3).
//
// These test the extracted functions directly, in isolation, using the
// existing characterization tests
// (services/deterministic-engine/src/__tests__/main.characterization.test.ts)
// as the behavior oracle: every assertion here should agree with what that
// suite already proved is the CURRENT behavior when run through the full
// main() orchestration. No new behavior is invented here.

import { describe, it, expect } from "vitest";
import {
  capabilityMatches,
  evaluateSafetyGate,
  evaluatePolicyGate,
  evaluateConfidenceGate,
  evaluateCostGate,
} from "../index";

describe("capabilityMatches", () => {
  it("matches an exact string", () => {
    expect(capabilityMatches("github.repo.commit", "github.repo.commit")).toBe(true);
  });
  it("'*' matches anything", () => {
    expect(capabilityMatches("*", "anything.at.all")).toBe(true);
  });
  it("wildcard prefix matches the bare prefix and any sub-path", () => {
    expect(capabilityMatches("tool.invoke.gitnexus.*", "tool.invoke.gitnexus")).toBe(true);
    expect(capabilityMatches("tool.invoke.gitnexus.*", "tool.invoke.gitnexus.query")).toBe(true);
  });
  it("wildcard prefix does not match an unrelated string", () => {
    expect(capabilityMatches("tool.invoke.gitnexus.*", "tool.invoke.github")).toBe(false);
  });
  it("non-matching, non-wildcard strings do not match", () => {
    expect(capabilityMatches("github.repo.commit", "github.repo.delete")).toBe(false);
  });
});

describe("evaluateSafetyGate", () => {
  it("allows content matching no blocked pattern", () => {
    const v = evaluateSafetyGate("do something benign", []);
    expect(v).toEqual({ gate: "safety", allowed: true, reason: undefined });
  });

  it("blocks content matching a blocked_patterns regex", () => {
    const v = evaluateSafetyGate("rm -rf /", [/rm\s+-rf/i]);
    expect(v.allowed).toBe(false);
    expect(v.gate).toBe("safety");
    expect(v.reason).toMatch(/Safety check failed/);
  });
});

describe("evaluatePolicyGate", () => {
  it("passes non-tool action nodes without evaluating capability", () => {
    const v = evaluatePolicyGate({
      nodeType: "action",
      nodeKind: undefined,
      nodeContent: "just some text",
      safetyPassed: true,
      allowedCapabilities: [],
      denyPatterns: [],
    });
    expect(v.allowed).toBe(true);
  });

  it("allows an exact-match capability", () => {
    const v = evaluatePolicyGate({
      nodeType: "action",
      nodeKind: "tool",
      nodeContent: "commit via github",
      safetyPassed: true,
      allowedCapabilities: ["github.repo.commit"],
      denyPatterns: [],
    });
    expect(v.allowed).toBe(true);
  });

  it("allows a capability matched via wildcard", () => {
    const v = evaluatePolicyGate({
      nodeType: "action",
      nodeKind: "tool",
      nodeContent: "query gitnexus for context",
      safetyPassed: true,
      allowedCapabilities: ["tool.invoke.gitnexus.*"],
      denyPatterns: [],
    });
    expect(v.allowed).toBe(true);
  });

  it("blocks a capability that is not in allowed_capabilities", () => {
    const v = evaluatePolicyGate({
      nodeType: "action",
      nodeKind: "tool",
      nodeContent: "commit via github",
      safetyPassed: true,
      allowedCapabilities: [],
      denyPatterns: [],
    });
    expect(v.allowed).toBe(false);
    expect(v.gate).toBe("policy");
  });

  it("deny_patterns overrides an otherwise-allowed capability via wildcard", () => {
    const v = evaluatePolicyGate({
      nodeType: "action",
      nodeKind: "tool",
      nodeContent: "query gitnexus for impact analysis",
      safetyPassed: true,
      allowedCapabilities: ["tool.invoke.gitnexus.*"],
      denyPatterns: ["tool.invoke.gitnexus.impact"],
    });
    expect(v.allowed).toBe(false);
  });

  it("is skipped (allowed: true) when safetyPassed is false", () => {
    const v = evaluatePolicyGate({
      nodeType: "action",
      nodeKind: "tool",
      nodeContent: "commit via github",
      safetyPassed: false,
      allowedCapabilities: [],
      denyPatterns: [],
    });
    expect(v.allowed).toBe(true);
  });
});

describe("evaluateConfidenceGate (deterministic retry math: 0.65 start, +0.15/retry)", () => {
  it("is skipped (allowed: true, score undefined) when shouldEvaluate is false", () => {
    const r = evaluateConfidenceGate({ shouldEvaluate: false, minScore: 0.9, maxRetries: 2 });
    expect(r.verdict).toEqual({ gate: "confidence", allowed: true, score: undefined, reason: undefined, metadata: undefined });
    expect(r.attempts).toEqual([]);
  });

  it("passes with zero retries when min_score <= 0.65", () => {
    const r = evaluateConfidenceGate({ shouldEvaluate: true, minScore: 0.5, maxRetries: 2 });
    expect(r.verdict.allowed).toBe(true);
    expect(r.finalScore).toBe(0.65);
    expect(r.attempts).toEqual([]);
  });

  it("passes after exactly one retry for the default min_score 0.7", () => {
    const r = evaluateConfidenceGate({ shouldEvaluate: true, minScore: 0.7, maxRetries: 2 });
    expect(r.verdict.allowed).toBe(true);
    expect(r.finalScore).toBeCloseTo(0.8, 10);
    expect(r.attempts).toEqual([{ retry: 1, scoreBefore: 0.65 }]);
  });

  it("is blocked when critique_max_retries is exhausted before min_score is reached", () => {
    const r = evaluateConfidenceGate({ shouldEvaluate: true, minScore: 0.9, maxRetries: 1 });
    expect(r.verdict.allowed).toBe(false);
    expect(r.verdict.reason).toMatch(/score \(0\.8\) below minimum threshold \(0\.9\) after 1 critique loops/);
    expect(r.attempts).toEqual([{ retry: 1, scoreBefore: 0.65 }]);
  });

  it("attaches the caller-provided injectedContext to verdict metadata", () => {
    const r = evaluateConfidenceGate({
      shouldEvaluate: true,
      minScore: 0.5,
      maxRetries: 2,
      injectedContext: "[NotebookLM Context]: example",
    });
    expect(r.verdict.metadata?.notebooklm_context).toBe("[NotebookLM Context]: example");
  });
});

describe("evaluateCostGate (fixed token counts only -- llm-node randomness is out of scope, computed by the caller)", () => {
  it("is skipped (allowed: true, shouldWarn: false) when shouldEvaluate is false", () => {
    const r = evaluateCostGate({ shouldEvaluate: false, simulatedTokens: 999999, maxTokensPerNode: 100, warnAtPercent: 80 });
    expect(r.verdict).toEqual({ gate: "cost", allowed: true, reason: undefined });
    expect(r.shouldWarn).toBe(false);
  });

  it("passes when tokens are within max_tokens_per_node", () => {
    const r = evaluateCostGate({ shouldEvaluate: true, simulatedTokens: 200, maxTokensPerNode: 8000, warnAtPercent: 80 });
    expect(r.verdict.allowed).toBe(true);
    expect(r.shouldWarn).toBe(false);
  });

  it("blocks when tokens exceed max_tokens_per_node", () => {
    const r = evaluateCostGate({ shouldEvaluate: true, simulatedTokens: 200, maxTokensPerNode: 100, warnAtPercent: 80 });
    expect(r.verdict.allowed).toBe(false);
    expect(r.verdict.reason).toMatch(/used 200 tokens, exceeding max limit 100/);
    expect(r.shouldWarn).toBe(false);
  });

  it("sets shouldWarn when tokens exceed warn_at_percent but not the hard limit", () => {
    const r = evaluateCostGate({ shouldEvaluate: true, simulatedTokens: 90, maxTokensPerNode: 100, warnAtPercent: 80 });
    expect(r.verdict.allowed).toBe(true);
    expect(r.shouldWarn).toBe(true);
  });
});

describe("verdict shape", () => {
  it("every gate returns a GateVerdict with 'gate' and 'allowed' at minimum", () => {
    const results = [
      evaluateSafetyGate("benign", []),
      evaluatePolicyGate({ nodeType: "action", nodeContent: "", safetyPassed: true, allowedCapabilities: [], denyPatterns: [] }),
      evaluateConfidenceGate({ shouldEvaluate: false, minScore: 0.7, maxRetries: 2 }).verdict,
      evaluateCostGate({ shouldEvaluate: false, simulatedTokens: 0, maxTokensPerNode: 8000, warnAtPercent: 80 }).verdict,
    ];
    for (const v of results) {
      expect(typeof v.gate).toBe("string");
      expect(typeof v.allowed).toBe("boolean");
    }
  });
});

// ---------------------------------------------------------------------------
// Not tested here, by design (matches the characterization suite's own
// documented gaps -- see main.characterization.test.ts):
// - Math.random()-driven LLM-node token cost and "question" node branch
//   selection are computed in main.ts, not in this package, and stay
//   uncharacterized.
// - gates.safety.require_human_approval is not read by evaluateSafetyGate
//   or anywhere else in this package -- it was never enforced in the
//   original code either. Not implemented here, per Slice 3's explicit
//   non-goals.
// ---------------------------------------------------------------------------
