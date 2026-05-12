import type { AgentId } from "@/types/agent-chat";

const AGENT_LABELS: Record<AgentId, string> = {
  drakon: "DRAKON",
  architect: "Architect",
  docs: "Docs",
};

const AGENT_PORTS: Record<AgentId, number> = {
  drakon: 8765,
  architect: 8766,
  docs: 8767,
};

const DEFAULT_BASE = "http://192.168.3.184";
const STORAGE_KEY = "drakon_agent_base_url";

function getBaseUrl(): string {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored.replace(/\/+$/, "");
    }
  } catch {
    // ignore
  }
  return DEFAULT_BASE;
}

export function getAgentUrl(agentId: AgentId): string {
  return `${getBaseUrl()}:${AGENT_PORTS[agentId]}`;
}

export function getAgentLabel(agentId: AgentId): string {
  return AGENT_LABELS[agentId];
}

export async function checkAgentHealth(agentId: AgentId): Promise<boolean> {
  try {
    const resp = await fetch(`${getAgentUrl(agentId)}/health`, {
      signal: AbortSignal.timeout(3000),
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
  const url = getAgentUrl(agentId);

  if (agentId === "drakon") {
    const resp = await fetch(`${url}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: message, refine: true }),
    });
    if (!resp.ok) throw new Error(`DRAKON agent error: ${resp.status}`);
    const data = await resp.json();
    const diagrams: Array<{ name: string; items: Record<string, unknown> }> =
      data.diagrams ?? [];
    const names = diagrams.map((d) => d.name).join(", ");
    return {
      reply: diagrams.length
        ? `Generated ${diagrams.length} diagram(s): **${names}**`
        : "No diagrams generated. Is the code a valid Python function?",
      diagrams,
    };
  }

  const resp = await fetch(`${url}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context }),
  });
  if (!resp.ok) {
    throw new Error(`${AGENT_LABELS[agentId]} agent error: ${resp.status}`);
  }
  const data = await resp.json();
  return { reply: data.reply ?? data.message ?? JSON.stringify(data) };
}

export async function sendFeedback(
  agentId: AgentId,
  diagramName: string,
  feedback: string,
  correctedIr?: Record<string, unknown>,
): Promise<void> {
  await fetch(`${getAgentUrl(agentId)}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      diagram_name: diagramName,
      feedback,
      corrected_ir: correctedIr ?? null,
    }),
  });
}
