// Reconciliation tests for the worker's inline IR validator
// (cloudflare-worker/worker-mcp-drakon.js), Phase 2 Slice 4.
//
// This mirrors src/lib/htse/__tests__/ir-validator.test.ts's fixtures
// exactly, to prove the worker's validator now produces the same rule
// results as the canonical implementation it was reconciled against --
// plus one test for the single deliberate deviation (the `success` field).
//
// `validateIrDeterministic` is imported directly from the deployed worker
// file itself (via a minimal `export` added to that function declaration,
// Phase 2 Slice 4) rather than a copy, so these tests exercise the exact
// code that ships.

import { describe, expect, it } from "vitest";
import { validateIrDeterministic } from "../worker-mcp-drakon.js";

describe("worker validateIrDeterministic (reconciled with ir-validator-core)", () => {
  it("TEST 1 — valid simple diagram", () => {
    const input = {
      name: "test",
      items: {
        n1: { type: "action", content: "A", one: "n2" },
        n2: { type: "end", content: "End" },
      },
    };

    const result = validateIrDeterministic(input);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('TEST 2 — dangling pointer on "one" (code is now DANGLING_POINTER, was DANGLING_REFERENCE)', () => {
    const input = {
      name: "test",
      items: {
        n1: { type: "action", content: "A", one: "n999" },
        n2: { type: "end", content: "End" },
      },
    };

    const result = validateIrDeterministic(input);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DANGLING_POINTER", nodeId: "n1" }),
      ]),
    );
  });

  it('TEST 3 — dangling pointer on "two"', () => {
    const input = {
      name: "test",
      items: {
        n1: { type: "question", content: "Q", one: "n2", two: "ghost" },
        n2: { type: "end", content: "End" },
      },
    };

    const result = validateIrDeterministic(input);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DANGLING_POINTER", nodeId: "n1" }),
      ]),
    );
  });

  it("TEST 4 — orphan node via BFS reachability (NEW: worker had no orphan detection before this slice)", () => {
    const input = {
      name: "test",
      items: {
        n1: { type: "action", content: "A", one: "n2" },
        n2: { type: "end", content: "End" },
        n3: { type: "action", content: "Orphan" },
      },
    };

    const result = validateIrDeterministic(input);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ORPHAN_NODE", nodeId: "n3" }),
      ]),
    );
    expect(result.autofixes).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "remove_orphan" })]),
    );
  });

  it("TEST 5 — multiple terminal candidates (NEW: worker had no autofixes before this slice)", () => {
    const input = {
      name: "test",
      items: {
        n1: { type: "action", content: "A", one: "n2" },
        n2: { type: "action", content: "B" },
        n3: { type: "action", content: "C" },
      },
    };

    const result = validateIrDeterministic(input);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MULTIPLE_TERMINAL_CANDIDATE", nodeId: expect.stringMatching(/^n[23]$/) }),
      ]),
    );
    expect(result.autofixes).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "merge_terminals" })]),
    );
  });

  it("TEST 6 — question without two (NEW rule, worker never had this check)", () => {
    const input = {
      name: "test",
      items: {
        n1: { type: "question", content: "Check?", one: "n2" },
        n2: { type: "end", content: "End" },
      },
    };

    const result = validateIrDeterministic(input);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_ALT_VECTOR", nodeId: "n1" }),
      ]),
    );
  });

  it('TEST 7 — missing "name" field', () => {
    const input = {
      items: { n1: { type: "end" } },
    };

    const result = validateIrDeterministic(input);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "SCHEMA_REQUIRED_FIELD" })]),
    );
  });

  it("TEST 8 — branch without header (NEW rule, worker never had this check)", () => {
    const input = {
      name: "test",
      items: {
        n1: { type: "branch", content: "B", one: "n2" },
        n2: { type: "end", content: "End" },
      },
    };

    const result = validateIrDeterministic(input);

    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "MISSING_HEADER" })]),
    );
  });

  it("TEST 9 — deliberate deviation from canonical: success reflects valid, not hardcoded true", () => {
    // ir-validator-core.ts's `success` field is hardcoded `true` regardless
    // of validity (a canonical quirk, confirmed unread anywhere in the
    // repo). This worker function is exposed directly as an HTTP response
    // body and as the drakon.validateir MCP tool result -- both externally
    // visible -- so `success` here is deliberately kept meaningful.
    const invalidInput = { items: { n1: { type: "end" } } }; // missing name -> invalid
    const result = validateIrDeterministic(invalidInput);

    expect(result.valid).toBe(false);
    expect(result.success).toBe(false); // NOT true -- this is the intentional divergence

    const validInput = {
      name: "test",
      items: {
        n1: { type: "action", content: "A", one: "n2" },
        n2: { type: "end", content: "End" },
      },
    };
    const validResult = validateIrDeterministic(validInput);
    expect(validResult.valid).toBe(true);
    expect(validResult.success).toBe(true);
  });
});
