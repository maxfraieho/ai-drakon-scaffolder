const NLM_MCP_URL = "https://notebooklm.exodus.pp.ua/mcp";

let _sessionId: string | null = null;

async function getSessionId(): Promise<string> {
  if (_sessionId) return _sessionId;

  const res = await fetch(NLM_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "ai-drakon", version: "1.0" },
      },
      id: 0,
    }),
  });

  const sid = res.headers.get("mcp-session-id");
  if (!sid) throw new Error("MCP: no session ID returned from initialize");
  _sessionId = sid;
  return sid;
}

function parseSseData(text: string): unknown {
  for (const line of text.split("\n")) {
    if (line.startsWith("data:")) {
      try { return JSON.parse(line.slice(5).trim()); } catch {}
    }
  }
  try { return JSON.parse(text); } catch {}
  return null;
}

async function mcpCall(toolName: string, args: Record<string, unknown>) {
  const sid = await getSessionId();

  const res = await fetch(NLM_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "mcp-session-id": sid,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: toolName, arguments: args },
      id: Date.now(),
    }),
  });

  if (!res.ok) {
    _sessionId = null; // invalidate on error
    throw new Error(`MCP ${toolName} error: ${res.status}`);
  }

  const text = await res.text();
  const data = parseSseData(text) as any;

  if (data?.error) throw new Error(data.error.message ?? "MCP error");

  const content = data?.result?.content?.[0]?.text ?? "";
  try { return JSON.parse(content); } catch { return content; }
}

export const nlmMcp = {
  listNotebooks: (): Promise<Array<{ id: string; title: string }>> =>
    mcpCall("notebooks_list", {}),
  chat: (notebookId: string, question: string): Promise<string> =>
    mcpCall("chat_ask", { notebook_id: notebookId, question }),
};
