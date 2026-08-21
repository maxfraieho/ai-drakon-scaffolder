import { describe, expect, it } from "vitest";

import { compareValidationResults } from "../validator-compatibility";
import type { ValidationResult } from "../ir-validator-core";

function result(overrides: Partial<ValidationResult>): ValidationResult {
  return {
    success: true,
    valid: true,
    issues: [],
    autofixes: [],
    ...overrides,
  };
}

describe("compareValidationResults", () => {
  it("TEST 1 — both valid, no issues → compatible", () => {
    const canonical = result({ valid: true, issues: [] });
    const worker = result({ valid: true, issues: [] });

    const out = compareValidationResults(canonical, worker);

    expect(out.state).toBe("compatible");
    expect(out.onlyInCanonical).toHaveLength(0);
    expect(out.onlyInWorker).toHaveLength(0);
  });

  it("TEST 2 — both invalid with identical error issues → compatible", () => {
    const issue = { code: "DANGLING_POINTER", severity: "error" as const, message: "x", nodeId: "n1" };
    const canonical = result({ valid: false, issues: [issue] });
    const worker = result({ valid: false, issues: [{ ...issue }] });

    const out = compareValidationResults(canonical, worker);

    expect(out.state).toBe("compatible");
  });

  it("TEST 3 — worker missing a warning-level issue canonical has → adapted", () => {
    const warn = { code: "MISSING_ALT_VECTOR", severity: "warning" as const, message: "x", nodeId: "n1" };
    const canonical = result({ valid: true, issues: [warn] });
    const worker = result({ valid: true, issues: [] });

    const out = compareValidationResults(canonical, worker);

    expect(out.state).toBe("adapted");
    expect(out.onlyInCanonical).toEqual([{ code: "MISSING_ALT_VECTOR", nodeId: "n1" }]);
    expect(out.onlyInWorker).toHaveLength(0);
  });

  it("TEST 4 — worker has an error canonical lacks → divergent", () => {
    const errIssue = { code: "DANGLING_POINTER", severity: "error" as const, message: "x", nodeId: "n1" };
    const canonical = result({ valid: true, issues: [] });
    const worker = result({ valid: false, issues: [errIssue] });

    const out = compareValidationResults(canonical, worker);

    expect(out.state).toBe("divergent");
    expect(out.onlyInWorker).toEqual([{ code: "DANGLING_POINTER", nodeId: "n1" }]);
  });

  it("TEST 5 — canonical valid, worker invalid (valid flag disagrees) → divergent", () => {
    const canonical = result({ valid: true, issues: [] });
    const worker = result({ valid: false, issues: [{ code: "SCHEMA_REQUIRED_FIELD", severity: "error" as const, message: "x" }] });

    const out = compareValidationResults(canonical, worker);

    expect(out.state).toBe("divergent");
  });

  it("TEST 6 — empty issue arrays on both sides, both valid → compatible", () => {
    const canonical = result({ valid: true, issues: [], autofixes: [] });
    const worker = result({ valid: true, issues: [], autofixes: [] });

    const out = compareValidationResults(canonical, worker);

    expect(out.state).toBe("compatible");
    expect(out.onlyInCanonical).toHaveLength(0);
    expect(out.onlyInWorker).toHaveLength(0);
  });

  it("TEST 7 — same error code but different nodeId → divergent (keyed by code+nodeId, not code alone)", () => {
    const canonical = result({
      valid: false,
      issues: [{ code: "DANGLING_POINTER", severity: "error" as const, message: "x", nodeId: "n1" }],
    });
    const worker = result({
      valid: false,
      issues: [{ code: "DANGLING_POINTER", severity: "error" as const, message: "x", nodeId: "n2" }],
    });

    const out = compareValidationResults(canonical, worker);

    expect(out.state).toBe("divergent");
    expect(out.onlyInCanonical).toEqual([{ code: "DANGLING_POINTER", nodeId: "n1" }]);
    expect(out.onlyInWorker).toEqual([{ code: "DANGLING_POINTER", nodeId: "n2" }]);
  });

  it("TEST 8 — both sides agree valid=false with same errors, canonical has an extra warning → adapted, not divergent", () => {
    const err = { code: "DANGLING_POINTER", severity: "error" as const, message: "x", nodeId: "n1" };
    const warn = { code: "MISSING_HEADER", severity: "warning" as const, message: "x" };
    const canonical = result({ valid: false, issues: [err, warn] });
    const worker = result({ valid: false, issues: [{ ...err }] });

    const out = compareValidationResults(canonical, worker);

    expect(out.state).toBe("adapted");
  });
});
