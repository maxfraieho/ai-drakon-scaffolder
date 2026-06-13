import { Client, Databases } from 'node-appwrite';

async function callMCP(
  mcpUrl: string,
  method: string,
  params: any,
  token?: string,
  sessionId?: string
): Promise<{ result: any; sessionId: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  const res = await fetch(mcpUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP Call Failed: ${res.status} ${res.statusText}. Details: ${text}`);
  }

  const newSessionId = res.headers.get('mcp-session-id') || sessionId || '';
  const bodyText = await res.text();

  let result: any = {};
  const lines = bodyText.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('data:')) {
      try {
        result = JSON.parse(line.trim().substring(5).trim());
      } catch (e) {}
    }
  }

  if (Object.keys(result).length === 0 && bodyText.trim().startsWith('{')) {
    try {
      result = JSON.parse(bodyText);
    } catch (e) {}
  }

  return { result, sessionId: newSessionId };
}

function extractTextFromMCPResponse(result: any): string {
  const content = result?.result?.content || result?.content || [];
  if (Array.isArray(content)) {
    return content.map((c: any) => c.text || '').join('\n');
  }
  if (typeof content === 'string') {
    return content;
  }
  return JSON.stringify(result);
}

export async function fetchZoneContext(
  env: any,
  zoneId: string,
  query: string
): Promise<string> {
  if (!env.KB_DB) {
    throw new Error('Database binding KB_DB is missing');
  }

  // 1. Fetch zone configuration from D1 database
  const zone: any = await env.KB_DB.prepare(
    'SELECT mcp_endpoint_url, mcp_auth_secret_ref, transport FROM knowledge_zones WHERE id = ? AND enabled = 1'
  )
    .bind(zoneId)
    .first();

  if (!zone) {
    throw new Error(`Knowledge zone not found or disabled: ${zoneId}`);
  }

  // 2. Fetch zone secret token from Appwrite (encrypted)
  let token: string | undefined;
  if (zone.mcp_auth_secret_ref) {
    try {
      const client = new Client()
        .setEndpoint(env.APPWRITE_ENDPOINT)
        .setProject(env.APPWRITE_PROJECT_ID)
        .setKey(env.APPWRITE_API_KEY);
      const databases = new Databases(client);
      const doc: any = await databases.getDocument(
        'ai-drakon',
        'zone_secrets',
        zone.mcp_auth_secret_ref
      );
      token = doc.mcpAuthToken;
    } catch (e: any) {
      console.error('Failed to fetch zone secret from Appwrite:', e);
    }
  }

  // 3. Perform MCP call sequence
  // 3.1. Initialize MCP Session
  const initRes = await callMCP(zone.mcp_endpoint_url, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'architect-agent', version: '1.0' }
  }, token);

  const sessionId = initRes.sessionId;

  // 3.2. List available tools to choose the appropriate query tool
  const listRes = await callMCP(zone.mcp_endpoint_url, 'tools/list', {}, token, sessionId);
  const tools = listRes.result?.tools || [];

  const hasTool = (name: string) => tools.some((t: any) => t.name === name);

  let responseText = '';

  if (hasTool('chat_ask')) {
    // NotebookLM MCP server
    const notebookId = env.AWESOME_ARCH_NOTEBOOK_ID || '';
    const callRes = await callMCP(zone.mcp_endpoint_url, 'tools/call', {
      name: 'chat_ask',
      arguments: { question: query, notebook_id: notebookId }
    }, token, sessionId);
    responseText = extractTextFromMCPResponse(callRes.result);
  } else if (hasTool('query')) {
    // GitNexus or generic query tool
    const callRes = await callMCP(zone.mcp_endpoint_url, 'tools/call', {
      name: 'query',
      arguments: { query }
    }, token, sessionId);
    responseText = extractTextFromMCPResponse(callRes.result);
  } else if (tools.length > 0) {
    // Fallback: call first tool and guess parameter name
    const firstTool = tools[0];
    const args: any = {};
    const properties = firstTool.inputSchema?.properties || {};
    const queryKey = Object.keys(properties).find(
      (k) =>
        k.includes('query') ||
        k.includes('question') ||
        k.includes('text') ||
        k.includes('message')
    ) || Object.keys(properties)[0];

    if (queryKey) {
      args[queryKey] = query;
    }

    const callRes = await callMCP(zone.mcp_endpoint_url, 'tools/call', {
      name: firstTool.name,
      arguments: args
    }, token, sessionId);
    responseText = extractTextFromMCPResponse(callRes.result);
  } else {
    throw new Error('No tools found on the MCP server');
  }

  return responseText;
}
