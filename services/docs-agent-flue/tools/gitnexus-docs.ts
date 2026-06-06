import { Type, defineTool } from '@flue/runtime';

const GITNEXUS_URL = 'https://gitnexus.exodus.pp.ua/api/mcp';

async function mcpCall(method: string, params: any, sid?: string): Promise<{ result: any; sid: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  };
  if (sid) {
    headers['mcp-session-id'] = sid;
  }

  const res = await fetch(GITNEXUS_URL, {
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
    const text = await res.text().catch(() => '');
    throw new Error(`GitNexus MCP call failed: status ${res.status}. Details: ${text}`);
  }

  const newSid = res.headers.get('mcp-session-id') || '';
  const rawText = await res.text();
  
  let result: any = {};
  const lines = rawText.split('\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      try {
        result = JSON.parse(line.slice(5).trim());
        break;
      } catch (e) {}
    }
  }

  return { result, sid: newSid };
}

async function initSession(): Promise<string> {
  const { sid } = await mcpCall('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'docs-agent', version: '1.0' }
  });
  return sid;
}

async function callTool(name: string, args: any, sid: string): Promise<any> {
  const { result } = await mcpCall('tools/call', { name, arguments: args }, sid);
  const content = result.result?.content || [];
  if (content.length > 0 && content[0].type === 'text') {
    try {
      return JSON.parse(content[0].text);
    } catch (e) {
      return { raw: content[0].text };
    }
  }
  return {};
}

export const gitnexusDocs = defineTool({
  name: 'gitnexus_docs',
  description: 'GitNexus documentation pipeline helper.',
  parameters: Type.Object({
    operation: Type.Union([
      Type.Literal('generate_docs'),
      Type.Literal('api_docs'),
      Type.Literal('what_changed'),
      Type.Literal('repos')
    ], { description: 'Operation to perform' }),
    repo: Type.Optional(Type.String({ description: 'Repository name' })),
    concept: Type.Optional(Type.String({ description: 'Flow query or concept' })),
    route: Type.Optional(Type.String({ description: 'Route name (for api_docs)' })),
    symbol: Type.Optional(Type.String({ description: 'Symbol to analyze (for what_changed)' }))
  }),
  execute: async ({ operation, repo, concept, route, symbol }) => {
    try {
      const sid = await initSession();
      
      if (operation === 'repos') {
        const reposData = await callTool('list_repos', {}, sid);
        return JSON.stringify(reposData, null, 2);
      }
      
      if (!repo) {
        throw new Error('repo is required for this operation');
      }
      
      if (operation === 'generate_docs') {
        if (!concept) throw new Error('concept is required for generate_docs');
        
        const flows = await callTool('query', { query: concept, repo }, sid);
        let routes: any = {};
        try {
          routes = await callTool('route_map', { repo }, sid);
        } catch (e) {}
        
        const procs = flows.processes || flows.flows || [];
        const docLines = [
          `# ${concept.charAt(0).toUpperCase() + concept.slice(1)} — ${repo}`,
          '',
          '## Overview',
          `GitNexus identified ${procs.length} execution flows related to \`${concept}\`.`,
          '',
          '## Execution Flows'
        ];
        
        for (const proc of procs.slice(0, 5)) {
          const name = proc.name || proc.id || 'flow';
          const steps = proc.steps || proc.calls || [];
          docLines.push(`\n### \`${name}\``);
          for (const step of steps.slice(0, 10)) {
            const fn = step.name || step.symbol || step.id || '?';
            docLines.push(`- \`${fn}\``);
          }
        }
        
        if (routes && routes.routes) {
          docLines.push('', '## API Routes', '');
          const routeList = routes.routes || [];
          for (const r of routeList.slice(0, 10)) {
            const path = r.path || r.route || '?';
            const handlers = r.handlers || r.consumers || [];
            docLines.push(`- \`${path}\` → ${handlers.slice(0, 3).map((h: any) => String(h)).join(', ')}`);
          }
        }
        
        return JSON.stringify({
          repo,
          concept,
          documentation: docLines.join('\n'),
          flows_count: procs.length
        }, null, 2);
      }
      
      if (operation === 'api_docs') {
        const args: any = { repo };
        if (route) {
          args.route = route;
        }
        const data = await callTool('route_map', args, sid);
        return JSON.stringify({ repo, api_map: data }, null, 2);
      }
      
      if (operation === 'what_changed') {
        if (!symbol) throw new Error('symbol is required for what_changed');
        
        const impact = await callTool('impact', { target: symbol, repo }, sid);
        const affected = impact.affected || impact.symbols || [];
        const doc = [
          `# Impact Analysis: \`${symbol}\` in \`${repo}\``,
          '',
          `**${affected.length} symbols affected** if \`${symbol}\` changes:`,
          ''
        ];
        
        for (const item of affected.slice(0, 20)) {
          const name = item.name || item.symbol || String(item);
          const depth = item.depth !== undefined ? item.depth : '?';
          doc.push(`- \`${name}\` (depth ${depth})`);
        }
        
        return JSON.stringify({
          symbol,
          repo,
          documentation: doc.join('\n'),
          affected_count: affected.length
        }, null, 2);
      }
      
      throw new Error(`Unsupported operation: ${operation}`);
    } catch (e: any) {
      return JSON.stringify({ error: e.message }, null, 2);
    }
  }
});
