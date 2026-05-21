// src/lib/pipeline-to-drakon.ts
import type { DrakonDiagram, DrakonItem } from "@/types/drakonwidget"; // ← widget format
import type { NodeConfig, EdgeConfig, PipelineConfig } from "./pipeline-config-api";

// ── PipelineConfig (nodes+edges) → DrakonDiagram ────────────────────────────

export function pipelineToIR(config: PipelineConfig): DrakonDiagram {
const items: Record<string, DrakonItem> = {};
const nodeToItem = new Map<string, string>();
let counter = 0;

// Assign stable item IDs per node
for (const node of config.nodes) {
const prefix = node.type === "decision" ? "q" : "n";
nodeToItem.set(node.id, `${prefix}${counter++}`);
}
nodeToItem.set("__end__", "end");

// Find the first node reachable from __start__
const startEdge = config.edges.find((e) => e.from_node === "__start__");
const firstItemId = startEdge ? (nodeToItem.get(startEdge.to_node) ?? "end") : "end";

// Entry branch — type "branch", branchId NUMBER 0
items["b0"] = { type: "branch", branchId: 0, one: firstItemId };
// Nodes → action / question items
for (const node of config.nodes) {
const itemId = nodeToItem.get(node.id)!;
items[itemId] = {
type: node.type === "decision" ? "question" : "action",
content: node.label,
};
}

items["end"] = { type: "end" };

// Wire edges: condition "no" → two, everything else → one
for (const edge of config.edges) {
if (edge.from_node === "__start__") continue;
const fromId = nodeToItem.get(edge.from_node);
if (!fromId || !items[fromId]) continue;
const toId = edge.to_node === "__end__" ? "end" : nodeToItem.get(edge.to_node);
if (!toId) continue;
if (edge.condition === "no") {
items[fromId] = { ...items[fromId], two: toId };
} else {
items[fromId] = { ...items[fromId], one: toId };
}
}

return { name: config.name, access: "write", items };
}

// ── DrakonDiagram → PipelineConfig (full BFS traversal) ─────────────────────

export function irToPipeline(
diagram: DrakonDiagram,
original: PipelineConfig,
): PipelineConfig {
const byLabel = new Map<string, NodeConfig>(original.nodes.map((n) => [n.label, n]));
const itemToNodeId = new Map<string, string>();
const nodes: NodeConfig[] = [];
const edges: EdgeConfig[] = [];

// BFS from b0 entry to discover all reachable items
const b0 = diagram.items["b0"];
const queue: string[] = b0?.one ? [b0.one] : [];
const visited = new Set<string>("b0");

while (queue.length > 0) {
const itemId = queue.shift()!;
if (visited.has(itemId) || itemId === "end" || !diagram.items[itemId]) continue;
visited.add(itemId);

const item = diagram.items[itemId];

if (item.type === "action" || item.type === "question") {
const label = item.content ?? itemId;
const orig = byLabel.get(label);
const nodeId = orig?.id ?? slugify(label);
itemToNodeId.set(itemId, nodeId);

nodes.push({
id: nodeId,
label,
type: item.type === "question" ? "decision" : "action",
is_llm: orig?.is_llm ?? false,
is_deterministic: orig?.is_deterministic ?? true,
prompt_key: orig?.prompt_key ?? null,
description: orig?.description ?? "",
});
}

// Enqueue successors
if (item.one) queue.push(item.one);
if (item.two) queue.push(item.two);
}

// __start__ edge to first content node
if (b0?.one && b0.one !== "end") {
const first = itemToNodeId.get(b0.one);
if (first) edges.push({ from_node: "__start__", to_node: first });
}

// Rebuild edges from BFS-discovered items
for (const itemId of visited) {
if (itemId === "b0") continue;
const item = diagram.items[itemId];
if (!item) continue;
const from = itemToNodeId.get(itemId);
if (!from) continue;
const isQ = item.type === "question";

if (item.one) {
const to = item.one === "end" ? "__end__" : itemToNodeId.get(item.one);
if (to) {
edges.push({
from_node: from,
to_node: to,
...(isQ ? { condition: "yes" as const, label: "yes" } : {}),
});
}
}
if (item.two) {
const to = item.two === "end" ? "__end__" : itemToNodeId.get(item.two);
if (to) {
edges.push({ from_node: from, to_node: to, condition: "no" as const, label: "no" });
}
}
}

return { ...original, nodes, edges };
}

function slugify(text: string): string {
return (text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
---
### lib/http.ts
**Розмір:** 685 байт


export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpRequestOptions = {
method?: HttpMethod;
headers?: HeadersInit;
body?: unknown;
};

export async function httpRequest<TResponse>(
input: string,
options: HttpRequestOptions = {},
): Promise<TResponse> {
const { method = "GET", headers, body } = options;

const response = await fetch(input, {
method,
headers: {
"Content-Type": "application/json",
...headers,
},
body: body ? JSON.stringify(body) : undefined,
});

if (!response.ok) {
throw new Error(HTTP request failed: ${response.status});
}

return (await response.json()) as TResponse;
}

