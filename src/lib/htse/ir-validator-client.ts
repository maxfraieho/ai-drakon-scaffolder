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
Authorization: Bearer ${getAccessToken() ?? ""},
"Content-Type": "application/json",
};
}

export async function validateIrRemote(ir: IrDiagram): Promise<ValidationResult> {
const response = await fetch(${BASE}/v1/drakon/validate-ir, {
method: "POST",
headers: headers(),
body: JSON.stringify({ ir }),
});

const data = (await response.json()) as ValidationResult & { error?: string; message?: string };

if (!response.ok) {
throw new Error(data.message || data.error || HTTP ${response.status});
}

return data;
}
---
### lib/htse/ir-examples.ts
**Розмір:** 1,606 байт


import type { IrDiagram } from "./ir-types";

export const simpleSequence: IrDiagram = {
name: "Simple Sequence",
access: "private",
params: ["input"],
items: {
"node-1": {
type: "action",
content: "Start processing",
one: "node-2",
},
"node-2": {
type: "action",
content: "Execute main step",
one: "node-3",
},
"node-3": {
type: "end",
content: "Done",
},
},
};

export const withBranch: IrDiagram = {
name: "Branch Flow",
access: "private",
params: ["request", "context"],
items: {
"node-1": {
type: "action",
content: "Validate request",
one: "node-2",
},
"node-2": {
type: "question",
content: "Is request valid?",
one: "node-3",
two: "node-4",
},
"node-3": {
type: "action",
content: "Process request",
one: "node-5",
},
"node-4": {
type: "action",
content: "Return validation error",
one: "node-5",
},
"node-5": {
type: "end",
content: "Finish",
},
},
};

export const withLoop: IrDiagram = {
name: "Loop Flow",
access: "private",
params: ["items"],
items: {
"node-1": {
type: "action",
content: "Initialize iterator",
one: "node-2",
},
"node-2": {
type: "question",
content: "Has next item?",
one: "node-3",
two: "node-4",
},
"node-3": {
type: "action",
content: "Process item",
one: "node-2",
},
"node-4": {
type: "end",
content: "All items processed",
},
},
};

