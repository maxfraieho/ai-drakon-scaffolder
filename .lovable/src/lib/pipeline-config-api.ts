import { getAccessToken } from "@/lib/auth";
import { resolveWorkerUrl } from "@/lib/worker-url";

export type NodeType = "action" | "decision" | "terminator" | "loop_start" | "loop_end";
export type AgentId = "architect" | "drakon" | "docs";

export interface NodeConfig {
id: string;
label: string;
type: NodeType;
is_llm: boolean;
is_deterministic: boolean;
prompt_key?: string | null;
description: string;
}

export interface EdgeConfig {
from_node: string;
to_node: string;
label?: string;
condition?: "yes" | "no";
}

export interface PipelineConfig {
id: string;
agent_id: AgentId;
name: string;
description: string;
nodes: NodeConfig[];
edges: EdgeConfig[];
max_iterations: number;
version: number;
}

export interface ValidationResult {
valid: boolean;
errors: string[];
}

const worker = () =>
resolveWorkerUrl();

function authHeaders(): HeadersInit {
const jwt = getAccessToken() ?? "";
return {
"Content-Type": "application/json",
...(jwt ? { Authorization: Bearer ${jwt} } : {}),
};
}

export async function fetchPipelines(agentId?: AgentId): Promise<PipelineConfig[]> {
const url = new URL(${worker()}/v1/agents/pipeline);
if (agentId) url.searchParams.set("agent_id", agentId);
const r = await fetch(url.toString(), { headers: authHeaders() });
if (!r.ok) throw new Error(fetchPipelines: ${r.status});
return r.json() as Promise<PipelineConfig[]>;
}

export async function fetchPipeline(id: string): Promise<PipelineConfig> {
const r = await fetch(${worker()}/v1/agents/pipeline/${id}, { headers: authHeaders() });
if (!r.ok) throw new Error(Pipeline not found: ${id});
return r.json() as Promise<PipelineConfig>;
}

export async function savePipeline(
config: PipelineConfig,
): Promise<{ ok: boolean; version: number }> {
const r = await fetch(${worker()}/v1/agents/pipeline/${config.id}, {
method: "PATCH",
headers: authHeaders(),
body: JSON.stringify(config),
});
if (!r.ok) {
const err = await r.json().catch(() => ({})) as { topology_errors?: string[] };
throw new Error(err.topology_errors?.join("; ") ?? Save failed: ${r.status});
}
return r.json() as Promise<{ ok: boolean; version: number }>;
}

export async function validatePipeline(id: string): Promise<ValidationResult> {
const r = await fetch(${worker()}/v1/agents/pipeline/${id}/validate, {
method: "POST",
headers: authHeaders(),
});
return r.json() as Promise<ValidationResult>;
}

