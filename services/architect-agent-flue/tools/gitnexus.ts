import { getJobDO, updateJobDO, createJobDO } from '../lib/job-store.js';

async function callGitNexusMCP(
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
    throw new Error(`GitNexus MCP Call Failed: ${res.status} ${res.statusText}. Details: ${text}`);
  }

  const newSessionId = res.headers.get('mcp-session-id') || sessionId || '';
  const bodyText = await res.text();

  let result: any = {};
  const lines = bodyText.split('\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      try {
        result = JSON.parse(line.substring(5).trim());
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

function sanitizeName(s: string): string {
  let res = s.replace(/[^a-zA-Z0-9_]/g, '_');
  if (res && /^\d/.test(res)) {
    res = '_' + res;
  }
  return res || 'flow';
}

function flowsToPython(repo: string, concept: string, flowsData: any): string {
  const lines = [`"""GitNexus flow: ${concept} in ${repo}"""`, ''];
  const processes = flowsData.processes || flowsData.flows || [];
  
  if (!processes || processes.length === 0) {
    const raw = String(flowsData.raw || JSON.stringify(flowsData)).substring(0, 2000);
    for (const line of raw.split('\n')) {
      lines.push(`# ${line}`);
    }
    lines.push('');
    const funcName = sanitizeName(concept);
    lines.push(`def ${funcName}_flow():`);
    lines.push('    pass');
    return lines.join('\n');
  }

  for (let i = 0; i < Math.min(processes.length, 5); i++) {
    const proc = processes[i];
    const rawName = proc.name || proc.id || `flow_${i}`;
    const name = sanitizeName(rawName);
    const steps = proc.steps || proc.calls || proc.nodes || [];
    
    lines.push(`def ${name}():`);
    if (steps.length === 0) {
      lines.push('    pass');
    }
    for (let j = 0; j < Math.min(steps.length, 15); j++) {
      const step = steps[j];
      let fn = step.name || step.symbol || step.id || 'step';
      fn = sanitizeName(fn.split(':').pop() || 'step');
      lines.push(`    ${fn}()`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export async function gitNexusAnalyze(repo: string, concept: string, env: any): Promise<string> {
  const jobId = await createJobDO(env);

  (async () => {
    try {
      await updateJobDO(env, jobId, 'running');

      const mcpUrl = env.GITNEXUS_MCP || 'https://gitnexus.exodus.pp.ua/api/mcp';
      const initRes = await callGitNexusMCP(mcpUrl, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'architect-agent', version: '1.0' }
      });
      const sessionId = initRes.sessionId;

      const queryRes = await callGitNexusMCP(mcpUrl, 'tools/call', {
        name: 'query',
        arguments: { query: concept, repo }
      }, sessionId);

      // Extract content from mcp response
      let contentText = '';
      if (queryRes.result?.result?.content?.[0]?.text) {
        contentText = queryRes.result.result.content[0].text;
      } else if (queryRes.result?.content?.[0]?.text) {
        contentText = queryRes.result.content[0].text;
      } else {
        contentText = JSON.stringify(queryRes.result);
      }

      let flows: any = {};
      try {
        flows = JSON.parse(contentText);
      } catch (e) {
        flows = { raw: contentText };
      }

      let contextData = {};
      const procs = flows.processes || flows.flows || [];
      if (procs.length > 0) {
        const top = procs[0];
        const sym = top.name || top.id || '';
        if (sym) {
          try {
            const contextRes = await callGitNexusMCP(mcpUrl, 'tools/call', {
              name: 'context',
              arguments: { name: sym, repo }
            }, sessionId);
            
            if (contextRes.result?.result?.content?.[0]?.text) {
              contextData = JSON.parse(contextRes.result.result.content[0].text);
            } else if (contextRes.result?.content?.[0]?.text) {
              contextData = JSON.parse(contextRes.result.content[0].text);
            } else {
              contextData = contextRes.result;
            }
          } catch (e) {}
        }
      }

      const sourceCode = flowsToPython(repo, concept, flows);

      const { runPipelineA } = await import('../workflows/pipeline-a.js');
      const pipelineRes = await runPipelineA(sourceCode, `${repo}/${concept.replace(/\s+/g, '_')}.py`, env);

      await updateJobDO(env, jobId, 'done', {
        drakon_ir: pipelineRes.drakonIr,
        tree_level: pipelineRes.treeLevel,
        cyclomatic_complexity: pipelineRes.cc,
        validation_errors: pipelineRes.validationErrors,
        gitnexus_flows: procs.length,
        source_code: sourceCode,
        repo,
        concept,
        context: contextData
      });
    } catch (e: any) {
      await updateJobDO(env, jobId, 'error', null, e.message);
    }
  })();

  return jobId;
}

export async function listGitNexusRepos(env: any): Promise<any> {
  const mcpUrl = env.GITNEXUS_MCP || 'https://gitnexus.exodus.pp.ua/api/mcp';
  const initRes = await callGitNexusMCP(mcpUrl, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'architect-agent', version: '1.0' }
  });
  const res = await callGitNexusMCP(mcpUrl, 'tools/call', {
    name: 'list_repos',
    arguments: {}
  }, initRes.sessionId);

  let text = '';
  if (res.result?.result?.content?.[0]?.text) {
    text = res.result.result.content[0].text;
  } else if (res.result?.content?.[0]?.text) {
    text = res.result.content[0].text;
  } else {
    return res.result;
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    return { raw: text };
  }
}

export async function gitNexusImpact(repo: string, symbol: string, env: any): Promise<any> {
  const mcpUrl = env.GITNEXUS_MCP || 'https://gitnexus.exodus.pp.ua/api/mcp';
  const initRes = await callGitNexusMCP(mcpUrl, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'architect-agent', version: '1.0' }
  });
  const res = await callGitNexusMCP(mcpUrl, 'tools/call', {
    name: 'impact',
    arguments: { target: symbol, repo }
  }, initRes.sessionId);

  let text = '';
  if (res.result?.result?.content?.[0]?.text) {
    text = res.result.result.content[0].text;
  } else if (res.result?.content?.[0]?.text) {
    text = res.result.content[0].text;
  } else {
    return res.result;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return { raw: text };
  }
}
