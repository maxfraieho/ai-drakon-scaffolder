import type { AgentId } from "@/types/agent-chat";
import { readSettings } from "@/lib/settings-storage";
import { getAccessToken } from "@/lib/auth";

const AGENT_LABELS: Record<AgentId, string> = {
drakon: "DRAKON",
architect: "Architect",
docs: "Docs",
};

export function getAgentLabel(agentId: AgentId): string {
return AGENT_LABELS[agentId];
}

function getWorkerUrl(): string {
return readSettings().app.workerUrl.replace(/\/+$/, "");
}

const AGENT_PORTS: Record<AgentId, number> = {
drakon: 8765,
architect: 8766,
docs: 8767,
};

function readAgentBaseUrl(): string {
if (typeof window === "undefined") return "http://192.168.3.184";
return localStorage.getItem("drakon_agent_base_url")?.trim() || "http://192.168.3.184";
}

function getAgentUrlFor(agentId: AgentId): string {
const fromBase = readAgentBaseUrl().replace(/\/+$/, "");
if (fromBase) {
return  `${fromBase}:${AGENT_PORTS[agentId]}`;
}
const a = readSettings().agents;
return agentId === "drakon" ? a.drakonUrl : agentId === "architect" ? a.architectUrl : a.docsUrl;
}

export async function checkAgentHealth(agentId: AgentId): Promise<boolean> {
// Try Worker proxy first
try {
const resp = await fetch( `${getWorkerUrl()}/v1/agents/${agentId}/health`, {
signal: AbortSignal.timeout(4000),
});
if (resp.ok) return true;
} catch {
// fall through
}
// Fallback: ping agent directly
try {
const direct = getAgentUrlFor(agentId).replace(/\/+$/, "");
const resp = await fetch( `${direct}/health`, {
signal: AbortSignal.timeout(4000),
mode: "cors",
});
return resp.ok;
} catch {
return false;
}
}

export interface AgentReply {
reply: string;
diagrams?: Array<{ name: string; items: Record<string, unknown> }>;
}

function getLlmConfig(agentId: AgentId): Record<string, unknown> | null {
if (typeof window === "undefined") return null;
const protocol =
localStorage.getItem(`${agentId}_llm_protocol`) ||
localStorage.getItem("agent_llm_protocol") ||
null;
const baseUrl =
localStorage.getItem(`${agentId}_llm_base_url`) ||
localStorage.getItem("agent_llm_base_url") ||
null;
const apiKey =
localStorage.getItem(`${agentId}_llm_api_key`) ||
localStorage.getItem("agent_llm_api_key") ||
null;
const model =
localStorage.getItem(`${agentId}_llm_model`) ||
localStorage.getItem("agent_llm_model") ||
null;
const maxTokensRaw = localStorage.getItem(`${agentId}_llm_max_tokens`);
const maxTokens = maxTokensRaw ? parseInt(maxTokensRaw, 10) : null;
if (!protocol && !baseUrl && !apiKey && !model) return null;
return {
protocol: protocol ?? "openai",
baseUrl,
apiKey,
model,
...(maxTokens ? { maxTokens } : {}),
};
}

export async function sendToAgent(
agentId: AgentId,
message: string,
context?: Record<string, unknown>,
): Promise<AgentReply> {
const workerUrl = getWorkerUrl();
const agentUrl = getAgentUrlFor(agentId);
const token = getAccessToken();

const resp = await fetch( `${workerUrl}/v1/agents/${agentId}/chat`, {
method: "POST",
headers: {
"Content-Type": "application/json",
...(token ? { Authorization: `Bearer ${token}` } : {}),
},
body: JSON.stringify({
message,
context,
agentUrl,
llmConfig: getLlmConfig(agentId),
}),
});

if (!resp.ok) {
throw new Error(`${AGENT_LABELS[agentId]} agent error: ${resp.status}`);
}
const data = await resp.json();
return {
reply: data.reply ?? data.message ?? JSON.stringify(data),
diagrams: data.diagrams,
};
}

export async function sendFeedback(
agentId: AgentId,
diagramName: string,
feedback: string,
correctedIr?: Record<string, unknown>,
): Promise<void> {
const workerUrl = getWorkerUrl();
const token = getAccessToken();
await fetch( `${workerUrl}/v1/agents/${agentId}/feedback`, {
method: "POST",
headers: {
"Content-Type": "application/json",
...(token ? { Authorization: `Bearer ${token}` } : {}),
},
body: JSON.stringify({
agentUrl: getAgentUrlFor(agentId),
diagram_name: diagramName,
feedback,
corrected_ir: correctedIr ?? null,
}),
});
}

interface CliApiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function sendToCliAgent(
  url: string,
  messages: CliApiMessage[],
  apiKey?: string,
): Promise<string> {
  const base = url.replace(/\/+$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const resp = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: "Claude", messages, stream: false }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText);
    throw new Error(`CLI Agent ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("CLI Agent: unexpected response format");
  return content;
}

