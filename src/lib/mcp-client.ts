export const AGENT_BASE_URL_STORAGE_KEY = "drakon_agent_base_url";
export const DEFAULT_AGENT_BASE_URL = "http://192.168.3.184";

export type AgentKind = "drakon" | "architect" | "docs";

const AGENT_PORTS: Record<AgentKind, string> = {
  drakon: "8765",
  architect: "8766",
  docs: "8767",
};

const AGENT_PATHS: Record<AgentKind, string> = {
  drakon: "/analyze",
  architect: "/chat",
  docs: "/chat",
};

export function getAgentBaseUrl(): string {
  if (typeof window === "undefined") {
    return DEFAULT_AGENT_BASE_URL;
  }

  return localStorage.getItem(AGENT_BASE_URL_STORAGE_KEY) || DEFAULT_AGENT_BASE_URL;
}

export async function mcpCall(agent: AgentKind, message: string): Promise<unknown> {
  const baseUrl = getAgentBaseUrl().replace(/\/$/, "");
  const port = AGENT_PORTS[agent];
  const path = AGENT_PATHS[agent];

  const url = `${baseUrl}:${port}${path}`;
  const body =
    agent === "drakon"
      ? { code: message, message }
      : { message, query: message, prompt: message };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export function extractAgentText(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return "No response body.";
  }

  const data = payload as Record<string, unknown>;
  const commonFields = ["message", "response", "answer", "content", "text", "result"];

  for (const field of commonFields) {
    const value = data[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return JSON.stringify(payload, null, 2);
}