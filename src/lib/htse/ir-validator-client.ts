import type { IrDiagram } from "./ir-types";
import { getAccessToken } from "@/lib/auth";

const BASE = import.meta.env.VITE_WORKER_URL;

export type ValidationIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  nodeId?: string;
  autofix?: string;
};

export type ValidationAutofix = {
  type: string;
  description: string;
  safeToApply: boolean;
};

export type ValidationResult = {
  success: boolean;
  valid: boolean;
  normalizedIr?: IrDiagram;
  issues: ValidationIssue[];
  autofixes: ValidationAutofix[];
};

function headers() {
  return {
    Authorization: `Bearer ${getAccessToken() ?? ""}`,
    "Content-Type": "application/json",
  };
}

export async function validateIrRemote(ir: IrDiagram): Promise<ValidationResult> {
  const response = await fetch(`${BASE}/v1/drakon/validate-ir`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ ir }),
  });

  const data = (await response.json()) as ValidationResult & { error?: string; message?: string };

  if (!response.ok) {
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }

  return data;
}
