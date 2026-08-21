import type { ValidationIssue, ValidationResult } from "./ir-validator-core";

export type CompatibilityState = "compatible" | "adapted" | "divergent";

export type CompatibilityIssueRef = {
  code: string;
  nodeId?: string;
};

export type CompatibilityResult = {
  state: CompatibilityState;
  onlyInCanonical: CompatibilityIssueRef[];
  onlyInWorker: CompatibilityIssueRef[];
};

function issueKey(issue: ValidationIssue): string {
  return `${issue.code}::${issue.nodeId ?? ""}`;
}

function toKeySet(issues: ValidationIssue[]): Set<string> {
  return new Set(issues.map(issueKey));
}

function diffByKey(
  a: ValidationIssue[],
  bKeys: Set<string>,
): CompatibilityIssueRef[] {
  return a
    .filter((issue) => !bKeys.has(issueKey(issue)))
    .map((issue) => ({ code: issue.code, nodeId: issue.nodeId }));
}

/**
 * Compares a canonical and a worker/runtime ValidationResult for the same IR
 * and classifies their relationship. Pure, side-effect-free: does not
 * mutate either input and performs no I/O.
 */
export function compareValidationResults(
  canonical: ValidationResult,
  worker: ValidationResult,
): CompatibilityResult {
  const canonicalKeys = toKeySet(canonical.issues);
  const workerKeys = toKeySet(worker.issues);

  const onlyInCanonical = diffByKey(canonical.issues, workerKeys);
  const onlyInWorker = diffByKey(worker.issues, canonicalKeys);

  const canonicalErrorKeys = toKeySet(
    canonical.issues.filter((issue) => issue.severity === "error"),
  );
  const workerErrorKeys = toKeySet(
    worker.issues.filter((issue) => issue.severity === "error"),
  );

  const errorKeysDiffer =
    canonicalErrorKeys.size !== workerErrorKeys.size ||
    [...canonicalErrorKeys].some((key) => !workerErrorKeys.has(key));

  let state: CompatibilityState;
  if (canonical.valid !== worker.valid || errorKeysDiffer) {
    state = "divergent";
  } else if (onlyInCanonical.length === 0 && onlyInWorker.length === 0) {
    state = "compatible";
  } else {
    state = "adapted";
  }

  return { state, onlyInCanonical, onlyInWorker };
}
