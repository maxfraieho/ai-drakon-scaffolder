// MCP JSON-RPC client for the drakon worker.
// Talks to {workerUrl}/mcp using `tools/call`. Auth: Bearer JWT.
// Optional X-Github-Token header for tools that write to git.

import { readSettings } from "@/lib/settings-storage";

function resolveWorkerUrl(): string {
  if (typeof window !== "undefined") {
    const override = readSettings().app.workerUrl.trim();
    if (override) return override;
  }
  return (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_WORKER_URL) ||
    "https://drakon-mcp-worker.maxfraieho.workers.dev"
  );
}

export interface McpCallOptions {
  githubToken?: string;
  signal?: AbortSignal;
}

interface JsonRpcEnvelope<T = unknown> {
  jsonrpc: "2.0";
  id: number;
  result?: {
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: T;
    isError?: boolean;
  };
  error?: { code: number; message: string };
}

let nextId = 1;

export async function mcpCall<T = unknown>(
  toolName: string,
  args: Record<string, unknown>,
  opts: McpCallOptions = {},
): Promise<T> {
  const url = `${resolveWorkerUrl().replace(/\/$/, "")}/mcp`;
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (opts.githubToken && opts.githubToken.trim()) {
    headers["X-Github-Token"] = opts.githubToken.trim();
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    signal: opts.signal,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: nextId++,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MCP ${toolName} HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const env = (await res.json()) as JsonRpcEnvelope<T>;
  if (env.error) throw new Error(`MCP ${toolName}: ${env.error.message}`);
  if (env.result?.isError) {
    const msg = env.result.content?.[0]?.text || "tool reported an error";
    throw new Error(`MCP ${toolName}: ${msg}`);
  }

  if (env.result?.structuredContent !== undefined) {
    return env.result.structuredContent as T;
  }
  const text = env.result?.content?.[0]?.text;
  if (text) {
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }
  return undefined as unknown as T;
}
