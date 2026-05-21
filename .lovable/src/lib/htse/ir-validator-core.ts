import type { IrDiagram, IrItemType } from "./ir-types";

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

export const VALID_IR_ITEM_TYPES = new Set<IrItemType>([
"action",
"question",
"select",
"case",
"header",
"end",
"address",
"branch",
"insertion",
"input",
"output",
"shelf",
"process",
"timer",
"duration",
]);

export function isObject(value: unknown): value is Record<string, unknown> {
return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeIr(ir: unknown): IrDiagram {
const normalizedItems: IrDiagram["items"] = {};
const src = isObject(ir) ? ir : {};
const items = isObject(src.items) ? src.items : {};

for (const [id, item] of Object.entries(items)) {
if (!isObject(item)) continue;

normalizedItems[String(id)] = {
type: String(item.type || "").trim() as IrItemType,
content: String(item.content || "").trim(),
secondary: item.secondary === undefined ? undefined : String(item.secondary).trim(),
one: item.one === undefined ? undefined : String(item.one).trim(),
two: item.two === undefined ? undefined : String(item.two).trim(),
side: item.side === undefined ? undefined : String(item.side).trim(),
flag1: item.flag1 === undefined ? undefined : Boolean(item.flag1),
branchId: item.branchId === undefined ? undefined : String(item.branchId).trim(),
style: isObject(item.style) ? item.style : undefined,
};
}

return {
name: String(src.name || "").trim(),
access: String(src.access || "private").trim() as IrDiagram["access"],
params: Array.isArray(src.params) ? src.params.map((p) => String(p).trim()).filter(Boolean) : [],
items: normalizedItems,
};
}

export function validateIrDeterministic(irPayload: unknown): ValidationResult {
const issues: ValidationIssue[] = [];
const autofixes: ValidationAutofix[] = [];
const normalizedIr = normalizeIr(irPayload);

if (!normalizedIr.name) {
issues.push({
code: "SCHEMA_REQUIRED_FIELD",
severity: "error",
message: 'Field "name" is required.',
});
}

if (!isObject(normalizedIr.items) || Object.keys(normalizedIr.items).length === 0) {
issues.push({
code: "SCHEMA_REQUIRED_FIELD",
severity: "error",
message: 'Field "items" is required and must be a non-empty object.',
});
}

const itemIds = Object.keys(normalizedIr.items);
const itemIdSet = new Set(itemIds);

for (const [nodeId, item] of Object.entries(normalizedIr.items)) {
if (!VALID_IR_ITEM_TYPES.has(item.type)) {
issues.push({
code: "INVALID_ITEM_TYPE",
severity: "error",
message: Node has invalid type: ${item.type || "(empty)"},
nodeId,
});
}
}

const terminalCandidates: string[] = [];
for (const [nodeId, item] of Object.entries(normalizedIr.items)) {
if (item.type !== "end" && !item.one) {
terminalCandidates.push(nodeId);
issues.push({
code: "MULTIPLE_TERMINAL_CANDIDATE",
severity: "warning",
message: "Non-end node has no main vector (one) and should be merged into a single terminal
end.",
nodeId,
autofix: "merge_terminals",
});
}
}

if (terminalCandidates.length > 0) {
autofixes.push({
type: "merge_terminals",
description: "Merge all terminal candidates into one shared end node.",
safeToApply: true,
});
}

for (const [nodeId, item] of Object.entries(normalizedIr.items)) {
for (const pointerName of ["one", "two"] as const) {
const target = item[pointerName];
if (target && !itemIdSet.has(target)) {
issues.push({
code: "DANGLING_POINTER",
severity: "error",
message: Node ${pointerName} points to missing node id: ${target},
nodeId,
});
}
}
}

const hasBranch = Object.values(normalizedIr.items).some((item) => item.type === "branch");
const hasHeader = Object.values(normalizedIr.items).some((item) => item.type === "header");
if (hasBranch && !hasHeader) {
issues.push({
code: "MISSING_HEADER",
severity: "warning",
message: "Silhouette-like diagram with branches should include at least one header node.",
});
}

if (itemIds.length > 0) {
const startId = itemIds[0];
const visited = new Set<string>();
const queue: string[] = [startId];

while (queue.length > 0) {
const currentId = queue.shift();
if (!currentId || visited.has(currentId)) continue;
visited.add(currentId);

const current = normalizedIr.items[currentId];
if (!current) continue;

const nextIds = [current.one, current.two].filter((id): id is string => Boolean(id));
for (const nextId of nextIds) {
if (itemIdSet.has(nextId) && !visited.has(nextId)) {
queue.push(nextId);
}
}
}

const orphans = itemIds.filter((id) => !visited.has(id));
for (const nodeId of orphans) {
issues.push({
code: "ORPHAN_NODE",
severity: "warning",
message: "Node is unreachable from the start node.",
nodeId,
autofix: "remove_orphan",
});
}

if (orphans.length > 0) {
autofixes.push({
type: "remove_orphan",
description: "Remove nodes unreachable from BFS traversal start node.",
safeToApply: true,
});
}
}

for (const [nodeId, item] of Object.entries(normalizedIr.items)) {
if ((item.type === "question" || item.type === "case") && item.one && !item.two) {
issues.push({
code: "MISSING_ALT_VECTOR",
severity: "warning",
message: "Question/case node has main path but misses alternate vector (two).",
nodeId,
});
}
}

const valid = !issues.some((issue) => issue.severity === "error");
const response: ValidationResult = {
success: true,
valid,
issues,
autofixes,
};

if (Object.keys(normalizedIr.items).length > 0) {
response.normalizedIr = normalizedIr;
}

return response;
}

