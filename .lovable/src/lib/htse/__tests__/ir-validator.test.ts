import { describe, expect, it } from "vitest";

import { validateIrDeterministic } from "../ir-validator-core";

describe("validateIrDeterministic", () => {
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

  it('TEST 2 — dangling pointer on "one"', () => {
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

  it("TEST 4 — orphan node (недосяжний через BFS)", () => {
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
      expect.arrayContaining([
        expect.objectContaining({ type: "remove_orphan" }),
      ]),
    );
  });

  it("TEST 5 — multiple terminal candidates (два non-end без one)", () => {
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
      expect.arrayContaining([
        expect.objectContaining({ type: "merge_terminals" }),
      ]),
    );
  });

  it("TEST 6 — question без two", () => {
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
      items: {
        n1: { type: "end" },
      },
    };

    const result = validateIrDeterministic(input);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "SCHEMA_REQUIRED_FIELD" }),
      ]),
    );
  });
});
