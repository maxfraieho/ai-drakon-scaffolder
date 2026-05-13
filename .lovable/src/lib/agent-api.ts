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

function getAgentUrlFor(agentId: AgentId): string {
  const a = readSettings().agents;
  return agentId === "drakon" ? a.drakonUrl : agentId === "architect" ? a.architectUrl : a.docsUrl;
}

export async function checkAgentHealth(agentId: AgentId): Promise<boolean> {
  try {
    const resp = await fetch(`${getWorkerUrl()}/v1/agents/${agentId}/health`, {
      signal: AbortSignal.timeout(4000),
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

export async function sendToAgent(
  agentId: AgentId,
  message: string,
  context?: Record<string, unknown>,
): Promise<AgentReply> {
  const workerUrl = getWorkerUrl();
  const agentUrl = getAgentUrlFor(agentId);
  const token = getAccessToken();

  const resp = await fetch(`${workerUrl}/v1/agents/${agentId}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, context, agentUrl }),
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
  await fetch(`${workerUrl}/v1/agents/${agentId}/feedback`, {
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
