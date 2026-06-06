import { GitHubAPI } from '../lib/github-api.js';
import { DrakonDiagram } from '../lib/ir-types.js';

export interface PatternSuggestion {
  name: string;
  rationale: string;
  tradeoffs: string;
  examples: string;
}

async function callMCP(
  mcpUrl: string,
  method: string,
  params: any,
  sessionId?: string
): Promise<{ result: any; sessionId: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  };
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

  // Parse SSE data
  let result: any = {};
  const lines = bodyText.split('\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      try {
        result = JSON.parse(line.substring(5).trim());
      } catch (e) {}
    }
  }

  // If not SSE, try parsing as JSON
  if (Object.keys(result).length === 0 && bodyText.trim().startsWith('{')) {
    try {
      result = JSON.parse(bodyText);
    } catch (e) {}
  }

  return { result, sessionId: newSessionId };
}

export function parsePatternSuggestions(text: string): PatternSuggestion[] {
  const suggestions: PatternSuggestion[] = [];
  
  const sections = text.split(/(?=###|\b\d+\.\s+Pattern|\bPattern\s+\d+:)/gi);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    const nameMatch = section.match(/(?:###|\d+\.\s+)?\s*(?:Pattern Name|Name|Pattern)?\s*:\s*\*\*?([^*:\n]+)\*\*?/i) || 
                      section.match(/(?:###|\d+\.\s+)?\s*\*\*?([^*:\n]+)\*\*?/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    if (name.toLowerCase().includes("given this project") || name.length > 100) continue;
    
    const rationaleMatch = section.match(/(?:Why it fits|Rationale|Fits|Reason)\s*:\s*([^#\n]+)/i) ||
                           section.match(/(?:Why it fits|Rationale|Fits|Reason)\s*\n\s*([^#\n]+)/i);
    const rationale = rationaleMatch ? rationaleMatch[1].trim() : section.substring(0, 300).trim();

    const tradeoffsMatch = section.match(/(?:Trade-offs|Tradeoffs|Key trade-offs)\s*:\s*([^#\n]+)/i);
    const tradeoffs = tradeoffsMatch ? tradeoffsMatch[1].trim() : "None specified";

    const examplesMatch = section.match(/(?:Examples|Systems|Which systems)\s*:\s*([^#\n]+)/i);
    const examples = examplesMatch ? examplesMatch[1].trim() : "Not specified";

    suggestions.push({
      name,
      rationale,
      tradeoffs,
      examples
    });
  }
  
  if (suggestions.length === 0) {
    const lines = text.split('\n');
    let current: Partial<PatternSuggestion> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\./.test(trimmed)) {
        if (current.name) {
          suggestions.push(current as PatternSuggestion);
        }
        current = {
          name: trimmed.replace(/^[\s\d.*-]+\s*/, '').replace(/:.*$/, ''),
          rationale: trimmed,
          tradeoffs: 'See description',
          examples: 'Various systems'
        };
      }
    }
    if (current.name) {
      suggestions.push(current as PatternSuggestion);
    }
  }

  return suggestions.slice(0, 5);
}

export async function suggestPatterns(
  projectDocs: string,
  chatContext: string,
  requirements: string,
  env: any
): Promise<PatternSuggestion[]> {
  const notebookId = env.AWESOME_ARCH_NOTEBOOK_ID || 'c21dd88b-79cd-47db-bb72-a52730218eb9';
  const mcpUrl = env.NOTEBOOKLM_MCP || 'http://192.168.3.234:8002/mcp';

  const query = `Given this project context:
${projectDocs}

Chat context: ${chatContext}
Requirements: ${requirements}

What architectural patterns from AwesomeArchitecture would best fit this project?
Recommend 3-5 patterns with specific rationale for each. For each pattern explain:
1. Pattern name
2. Why it fits this project specifically
3. Key trade-offs to consider
4. Which systems use this pattern (examples)`;

  try {
    // 1. Initialize session
    const initRes = await callMCP(mcpUrl, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'architect-agent', version: '1.0' }
    });

    // 2. Call chat_ask tool
    const callRes = await callMCP(mcpUrl, 'tools/call', {
      name: 'chat_ask',
      arguments: { notebook_id: notebookId, question: query }
    }, initRes.sessionId);

    // Parse text contents
    const content = callRes.result?.result?.content || callRes.result?.content || [];
    const text = content.map((c: any) => c.text || '').join('\n');
    
    return parsePatternSuggestions(text);
  } catch (e: any) {
    // Graceful fallback with dummy mock recommendations based on requirements keywords
    const lowerReq = requirements.toLowerCase();
    const suggestions: PatternSuggestion[] = [];

    if (lowerReq.includes('microservice') || lowerReq.includes('distributed')) {
      suggestions.push({
        name: 'Microservices',
        rationale: 'Requirements indicate decoupled service components and independent scaling.',
        tradeoffs: 'High operational complexity, network latency.',
        examples: 'Netflix, Amazon, Uber'
      });
    }
    if (lowerReq.includes('event') || lowerReq.includes('stream') || lowerReq.includes('async')) {
      suggestions.push({
        name: 'Event-Driven Architecture',
        rationale: 'Requirements need real-time data handling and loose coupling between sub-systems.',
        tradeoffs: 'Event ordering complexity, eventual consistency.',
        examples: 'LinkedIn (Kafka), modern financial systems'
      });
    }
    if (lowerReq.includes('rag') || lowerReq.includes('ai') || lowerReq.includes('llm') || lowerReq.includes('agent')) {
      suggestions.push({
        name: 'RAG Knowledge Base',
        rationale: 'Project utilizes AI querying of internal documents.',
        tradeoffs: 'Vector indexing overhead, LLM hallucination limits.',
        examples: 'Vercel AI SDK, NotebookLM'
      });
      suggestions.push({
        name: 'AI Agent / Workflow',
        rationale: 'Allows executing complex agentic pipelines with multi-step validation.',
        tradeoffs: 'Higher cost, unpredictable execution paths.',
        examples: 'Flue agent frameworks, LangGraph systems'
      });
    }

    // Default general recommendation if list is too small
    if (suggestions.length < 3) {
      suggestions.push({
        name: 'Layered Architecture',
        rationale: 'Provides a clean separation of concerns suitable for standard web endpoints.',
        tradeoffs: 'Tight coupling of adjacent layers, layer dependency overhead.',
        examples: 'Standard Spring, Django, and NestJS applications'
      });
    }

    return suggestions;
  }
}

export async function createPipelineFromPatterns(
  patterns: PatternSuggestion[],
  projectSlug: string,
  agentName: string,
  env: any
): Promise<DrakonDiagram> {
  const items: Record<string, any> = {};
  
  items['b0'] = {
    type: 'branch',
    branchId: 0,
    one: patterns.length > 0 ? 'n1' : 'end'
  };

  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i];
    const nodeId = `n${i + 1}`;
    const nextNodeId = i === patterns.length - 1 ? 'end' : `n${i + 2}`;
    
    items[nodeId] = {
      type: 'action',
      content: `Pattern: ${p.name}\nRationale: ${p.rationale}`,
      one: nextNodeId
    };
  }

  items['end'] = {
    type: 'end'
  };

  const drakonIr: DrakonDiagram = {
    name: `${agentName}-pipeline`,
    params: '',
    items
  };

  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  
  if (ghToken && ghRepo) {
    const api = new GitHubAPI(ghToken, ghRepo, ghBranch);
    const path = `projects/${projectSlug}/agents/${agentName}/pipeline.drakon.json`;
    const content = JSON.stringify(drakonIr, null, 2);
    
    let sha: string | undefined;
    try {
      const existing = await api.getFile(path);
      sha = existing.sha;
    } catch (e) {}

    await api.putFile(path, content, `feat(drakon): initialize pipeline from patterns for ${agentName}`, sha);
  }

  return drakonIr;
}
