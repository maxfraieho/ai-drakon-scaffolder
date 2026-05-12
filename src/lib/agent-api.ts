import type { AgentId } from "@/types/agent-chat";

const AGENT_LABELS: Record<AgentId, string> = {
  drakon: "DRAKON",
  architect: "Architect",
  docs: "Docs",
};

// Default tunnel URLs (HTTPS via cloudflared)
const AGENT_TUNNEL_URLS: Record<AgentId, string> = {
  drakon: "https://drakon-agent.exodus.pp.ua",
  architect: "https://architect-agent.exodus.pp.ua",
  docs: "https://docs-agent.exodus.pp.ua",
};

// Per-agent localStorage override keys (e.g. "drakon_agent_url_drakon")
const STORAGE_KEY_PREFIX = "drakon_agent_url_";
// Legacy single base URL key (still supported for backward compat)
const LEGACY_KEY = "drakon_agent_base_url";

const AGENT_PORTS: Record<AgentId, number> = {
  drakon: 8765,
  architect: 8766,
  docs: 8767,
};

export function getAgentUrl(agentId: AgentId): string {
  try {
    if (typeof localStorage !== "undefined") {
      // Per-agent override
      const perAgent = localStorage.getItem(`${STORAGE_KEY_PREFIX}${agentId}`);
      if (perAgent) return perAgent.replace(/\/+$/, "");
      // Legacy single base URL
      const base = localStorage.getItem(LEGACY_KEY);
      if (base) return `${base.replace(/\/+$/, "")}:${AGENT_PORTS[agentId]}`;
    }
  } catch {
    // ignore SSR / storage errors
  }
  return AGENT_TUNNEL_URLS[agentId];
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
