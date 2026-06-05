const NLM_MCP_URL = "https://notebooklm.exodus.pp.ua/mcp";

async function mcpCall(toolName: string, args: Record<string, unknown>) {
  const res = await fetch(NLM_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: toolName, arguments: args },
      id: Date.now(),
    }),
  });
  if (!res.ok) throw new Error(`MCP ${toolName} error: ${res.status}`);
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message ?? "MCP error");
  const text: string = data?.result?.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}

export const nlmMcp = {
  listNotebooks: (): Promise<Array<{ id: string; title: string }>> =>
    mcpCall("notebooks_list", {}),
  chat: (notebookId: string, question: string): Promise<string> =>
    mcpCall("chat_ask", { notebook_id: notebookId, question }),
};
