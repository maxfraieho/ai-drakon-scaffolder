/**
 * @ai-drakon/policy-engine
 *
 * Pure evaluation logic for the deterministic-engine's 4-Gate Control
 * Plane, extracted from services/deterministic-engine/src/main.ts
 * (Phase 2 Slice 3). This is a boundary extraction, not a policy
 * redesign -- every function here reproduces the exact current behavior
 * bit-for-bit, including known quirks:
 *   - gate order is always safety -> policy -> confidence -> cost
 *   - a gate that is skipped (its `shouldEvaluate` precondition is false)
 *     reports `allowed: true` with no reason/score/metadata, exactly as
 *     the original inline code did by leaving its local `xPassed`
 *     variable at its default `true`
 *   - `gates.safety.require_human_approval` is intentionally NOT read
 *     anywhere in this package (it isn't read in the original code
 *     either) -- this is a known, preserved gap, not an oversight
 *   - LLM-node token cost and "question" node branch selection are
 *     Math.random()-driven and stay in main.ts; this package never calls
 *     Math.random() itself
 *
 * No React, Vite, Worker APIs, Appwrite SDKs, NotebookLM, network, or
 * filesystem access. Every function is a plain, synchronous, side-effect
 * free computation over its arguments. Logging and the NotebookLM
 * "context injection" mock (which itself only ever produces a static
 * string) remain in main.ts and are passed into evaluateConfidenceGate
 * as an already-computed `injectedContext` value.
 */

import type { GateVerdict } from '@ai-drakon/harness-contract';

// ── Capability wildcard matching ────────────────────────────────────────────
// Moved verbatim from main.ts. Used by evaluatePolicyGate; also exported
// standalone since it is a general-purpose primitive.
export function capabilityMatches(granted: string, requested: string): boolean {
  if (granted === '*' || granted === requested) return true;
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -2);
    return requested === prefix || requested.startsWith(prefix + '.');
  }
  return false;
}

// ── 1. Safety gate ───────────────────────────────────────────────────────
// `safetyRegexes` must already be compiled by the caller (main.ts compiles
// them once per execution, outside the per-node loop, and logs+skips any
// pattern that fails to compile as a RegExp -- that setup step is
// orchestration/logging and stays in main.ts).
export function evaluateSafetyGate(nodeContent: string, safetyRegexes: RegExp[]): GateVerdict {
  for (const regex of safetyRegexes) {
    if (regex.test(nodeContent)) {
      return {
        gate: 'safety',
        allowed: false,
        reason: `Safety check failed: node content matched blocked pattern ${regex.source}`,
      };
    }
  }
  return { gate: 'safety', allowed: true, reason: undefined };
}

// ── 2. Policy / capability gate ─────────────────────────────────────────
export interface PolicyGateInput {
  nodeType: string;
  nodeKind?: string;
  /** node.content, NOT the safety gate's content+secondary concatenation. */
  nodeContent: string;
  safetyPassed: boolean;
  allowedCapabilities: string[];
  denyPatterns: string[];
}

export function evaluatePolicyGate(input: PolicyGateInput): GateVerdict {
  const { nodeType, nodeKind, nodeContent, safetyPassed, allowedCapabilities, denyPatterns } = input;

  if (safetyPassed && (nodeType === 'action' || nodeType === 'process')) {
    const isTool = nodeKind === 'tool' || /tool|mcp/i.test(nodeContent || '');
    if (isTool) {
      let requestedCap = 'tool.invoke.unknown';
      const content = (nodeContent || '').trim();

      if (/gitnexus/i.test(content)) {
        requestedCap = 'tool.invoke.gitnexus.query';
        if (/impact/i.test(content)) requestedCap = 'tool.invoke.gitnexus.impact';
      } else if (/notebooklm/i.test(content)) {
        requestedCap = 'tool.invoke.notebooklm.chat_ask';
      } else if (/github/i.test(content)) {
        requestedCap = 'github.repo.commit';
      }

      const isAllowed = (allowedCapabilities || []).some((pattern) => capabilityMatches(pattern, requestedCap));
      const isDenied = (denyPatterns || []).some((pattern) => capabilityMatches(pattern, requestedCap));

      if (!isAllowed || isDenied) {
        return {
          gate: 'policy',
          allowed: false,
          reason: `Policy check failed: capability '${requestedCap}' is not allowed or explicitly denied.`,
        };
      }
    }
  }

  return { gate: 'policy', allowed: true, reason: undefined };
}

// ── 3. Confidence gate ───────────────────────────────────────────────────
// Retry math only. The NotebookLM "context injection" mock and its two
// context.log calls stay in main.ts (they are orchestration/logging, and
// the mock never actually depends on anything computed here) -- main.ts
// computes `injectedContext` first and passes it in as an opaque string
// for the verdict's `metadata`. The per-retry log line
// ("Confidence score (X) below threshold (Y). Triggering critique retry
// N/M...") also stays in main.ts; this function returns an `attempts`
// trace with the exact (retry, scoreBefore) pairs so main.ts can replay
// that log line unchanged, in order, without duplicating the retry math.
export interface ConfidenceGateInput {
  /** = safetyPassed && policyPassed && node.nodeKind === 'llm', decided by the caller. */
  shouldEvaluate: boolean;
  minScore: number;
  maxRetries: number;
  injectedContext?: string;
}

export interface ConfidenceAttempt {
  retry: number;
  scoreBefore: number;
}

export interface ConfidenceGateResult {
  verdict: GateVerdict;
  finalScore: number;
  attempts: ConfidenceAttempt[];
}

export function evaluateConfidenceGate(input: ConfidenceGateInput): ConfidenceGateResult {
  const { shouldEvaluate, minScore, maxRetries, injectedContext } = input;

  if (!shouldEvaluate) {
    return {
      verdict: { gate: 'confidence', allowed: true, score: undefined, reason: undefined, metadata: undefined },
      finalScore: 1.0,
      attempts: [],
    };
  }

  // Simulating LLM confidence score. Deterministic-mocked: normally passes
  // (0.65 -> 0.80 after one retry against the default min_score 0.7), but
  // if retry is exhausted before min_score is reached the gate blocks.
  let score = 0.65; // start low to simulate a critique-correction loop
  let retries = 0;
  const attempts: ConfidenceAttempt[] = [];

  while (score < minScore && retries < maxRetries) {
    retries++;
    attempts.push({ retry: retries, scoreBefore: score });
    score += 0.15; // simulate correction improvement
  }

  const finalScore = score;
  const passed = finalScore >= minScore;

  return {
    verdict: {
      gate: 'confidence',
      allowed: passed,
      score: finalScore,
      reason: passed
        ? undefined
        : `Confidence check failed: score (${finalScore}) below minimum threshold (${minScore}) after ${retries} critique loops.`,
      metadata: injectedContext ? { notebooklm_context: injectedContext } : undefined,
    },
    finalScore,
    attempts,
  };
}

// ── 4. Cost / quota gate ─────────────────────────────────────────────────
// `simulatedTokens` must already be computed by the caller (main.ts still
// owns the Math.random() token-cost simulation for llm nodes and the
// fixed-200 cost for tool nodes -- neither belongs in a "pure, testable
// without external dependencies" package given the former's randomness).
// This function only evaluates whether that already-known token count is
// within the configured limit.
export interface CostGateInput {
  /** = safetyPassed && policyPassed && confidencePassed, decided by the caller. */
  shouldEvaluate: boolean;
  simulatedTokens: number;
  maxTokensPerNode: number;
  warnAtPercent: number;
}

export interface CostGateResult {
  verdict: GateVerdict;
  /** Mirrors the original's `else if` -- only ever true when not blocked. */
  shouldWarn: boolean;
}

export function evaluateCostGate(input: CostGateInput): CostGateResult {
  const { shouldEvaluate, simulatedTokens, maxTokensPerNode, warnAtPercent } = input;

  if (!shouldEvaluate) {
    return { verdict: { gate: 'cost', allowed: true, reason: undefined }, shouldWarn: false };
  }

  if (simulatedTokens > maxTokensPerNode) {
    return {
      verdict: {
        gate: 'cost',
        allowed: false,
        reason: `Cost check failed: node used ${simulatedTokens} tokens, exceeding max limit ${maxTokensPerNode}`,
      },
      shouldWarn: false,
    };
  }

  const shouldWarn = simulatedTokens > (maxTokensPerNode * warnAtPercent) / 100;
  return { verdict: { gate: 'cost', allowed: true, reason: undefined }, shouldWarn };
}
