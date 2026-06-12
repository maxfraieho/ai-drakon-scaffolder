import * as acorn from 'acorn';
import { GitHubAPI } from '../lib/github-api.js';
import { llmComplete } from '../lib/llm-client.js';
import { getJobDO, updateJobDO } from '../lib/job-store.js';

async function runNode(nodeName: string, state: any, env: any): Promise<any> {
  switch (nodeName) {
    case 'measure_cc': {
      const { calculateCC } = await import('../lib/cc-calculator.js');
      const cc = calculateCC(state.source_code || '', state.file_path || 'module.js');
      return { cyclomatic_complexity: cc };
    }
    case 'classify': {
      const cc = state.cyclomatic_complexity || 1;
      const treeLevel = cc <= 10 ? 'primitive' : cc <= 20 ? 'silhouette' : cc <= 50 ? 'branch' : 'deep';
      return { tree_level: treeLevel, drakon_type: treeLevel === 'primitive' ? 'Primitive' : 'Silhouette' };
    }
    case 'ast_translate': {
      const { JSAnalyzer } = await import('../lib/ast-analyzer.js');
      const analyzer = new JSAnalyzer();
      const ir = analyzer.analyze(state.source_code || '', state.file_path || 'module.js');
      return { drakon_ir: ir };
    }
    case 'yaml_gen': {
      const ext = (state.file_path || '').split('.').pop() || '';
      const prompt = `Analyze the following code and produce a C4-Behavioral YAML describing its logical flow, actors, actions, and decision points.
Output ONLY the YAML block in a \`\`\`yaml ... \`\`\` fence.

File: ${state.file_path || 'module.js'}
Complexity level: ${state.tree_level} (CC=${state.cyclomatic_complexity})

\`\`\`${ext}
${(state.source_code || '').substring(0, 4000)}
\`\`\`
`;
      const content = await llmComplete([
        { role: 'system', content: 'You are a software architect. Produce concise C4-Behavioral YAML.' },
        { role: 'user', content: prompt }
      ], env.PROXY_MODEL || 'gemini-2.5-flash', 0.1, env.CUSTOM_API_KEY || env.PROXY_TOKEN, env.PROXY_URL, env);
      return { behavioral_yaml: content };
    }
    case 'ir_gen': {
      const prevErrors = state.validation_errors || [];
      let errorHint = '';
      if (prevErrors.length > 0) {
        errorHint = "\n\nPrevious attempt had validation errors:\n" + prevErrors.slice(0, 5).join('\n');
      }

      const prompt = `Convert the following C4-Behavioral YAML and source code into a DRAKON IR JSON array.
Each element represents one function/method. Required schema per element:
{"name": "func_name", "params": "a, b", "items": {"b0": {"type":"branch","branchId":0,"one":"n1"}, "n1": {"type":"action","content":"...","one":"end"}, "end": {"type":"end"}}}
Rules: single end node, b0 mandatory with branchId:0, question nodes need one (yes) and two (no).
Output ONLY a \`\`\`json [...] \`\`\` block.
${errorHint}

YAML:
${(state.behavioral_yaml || '').substring(0, 2000)}

Source:
\`\`\`
${(state.source_code || '').substring(0, 3000)}
\`\`\`
`;
      const reply = await llmComplete([
        { role: 'system', content: 'You are a DRAKON diagram expert. Output valid DRAKON IR JSON only.' },
        { role: 'user', content: prompt }
      ], env.PROXY_MODEL || 'gemini-2.5-flash', 0.1, env.CUSTOM_API_KEY || env.PROXY_TOKEN, env.PROXY_URL, env);
      
      const match = reply.match(/```json\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          const irs = Array.isArray(parsed) ? parsed : [parsed];
          return { drakon_ir: irs, iteration_count: (state.iteration_count || 0) + 1 };
        } catch (e) {}
      }
      return { drakon_ir: [], iteration_count: (state.iteration_count || 0) + 1 };
    }
    case 'validate': {
      const { validateIr } = await import('../lib/ir-validator.js');
      const errors: string[] = [];
      const diagrams = state.drakon_ir || [];
      for (const ir of diagrams) {
        const res = validateIr(ir);
        if (!res.valid) {
          errors.push(...res.errors.map(e => `${ir.name || '?'}: ${e}`));
        }
      }
      return { validation_errors: errors };
    }
    case 'code_gen': {
      const prevErrors = state.syntax_errors || [];
      let errorHint = '';
      if (prevErrors.length > 0) {
        errorHint = "\n\nPrevious attempt had syntax errors:\n" + prevErrors.slice(0, 3).join('\n');
      }

      const irStr = JSON.stringify(state.drakon_ir || [], null, 2);
      const prompt = `Convert the following DRAKON IR diagram into ${state.language || 'javascript'} code.
Description: ${state.description || ''}
Output ONLY the code in a code fence, no explanations.
${errorHint}

DRAKON IR:
\`\`\`json
${irStr.substring(0, 3000)}
\`\`\`
`;
      const content = await llmComplete([
        { role: 'system', content: `You are a ${state.language || 'javascript'} expert. Convert DRAKON IR to clean code.` },
        { role: 'user', content: prompt }
      ], env.PROXY_MODEL || 'gemini-2.5-flash', 0.1, env.CUSTOM_API_KEY || env.PROXY_TOKEN, env.PROXY_URL, env);

      const match = content.match(/```(?:\w+)?\s*([\s\S]*?)```/);
      const code = match ? match[1].trim() : content.trim();
      return { generated_code: code, iteration_count: (state.iteration_count || 0) + 1 };
    }
    case 'check_syntax': {
      const lang = (state.language || '').toLowerCase();
      const code = state.generated_code || '';
      if (['js', 'javascript', 'ts', 'typescript', 'tsx', 'jsx'].includes(lang)) {
        try {
          let processed = code;
          if (lang.includes('ts')) {
            processed = code.replace(/:\s*(?:string|number|boolean|any|void|string\[\]|Record<[^>]+>)/g, '')
                            .replace(/import\s+type\s+[^;]+;/g, '')
                            .replace(/(\)\s*:\s*[A-Za-z0-9_<>\[\]|&\s{}]+)(?=\s*\{)/g, '');
          }
          acorn.parse(processed, { ecmaVersion: 2022, sourceType: 'module' });
          return { syntax_errors: [] };
        } catch (e: any) {
          return { syntax_errors: [`SyntaxError: ${e.message}`] };
        }
      }
      if (['python', 'py'].includes(lang)) {
        const prompt = `Check if this Python code is syntactically valid.
If it has syntax errors, list them clearly. If it is fully valid, respond with "VALID".
Do NOT write any explanation other than the errors or "VALID".

Code:
\`\`\`python
${code}
\`\`\`
`;
        const reply = await llmComplete([
          { role: 'system', content: 'You are a Python compiler syntax check helper.' },
          { role: 'user', content: prompt }
        ], env.PROXY_MODEL || 'gemini-2.5-flash', 0.0, env.CUSTOM_API_KEY || env.PROXY_TOKEN, env.PROXY_URL, env);

        if (reply.trim().toUpperCase() === 'VALID') {
          return { syntax_errors: [] };
        }
        return { syntax_errors: [reply.trim()] };
      }
      return { syntax_errors: [] };
    }
    case 'drakon_load_kb': {
      const rules = `
- b0: {type:"branch",branchId:0,one:"<перший_вузол>"} — ОБОВ'ЯЗКОВО
- end: {type:"end"} — ОБОВ'ЯЗКОВО
- action: {type:"action",content:"<текст>",one:"<далі>"}
- question: {type:"question",content:"<умова>?",one:"<так>",two:"<ні>"}
  one=ТАК (вниз), two=НІ (вправо)
- params — завжди рядок, ніколи масив
      `;
      return { kb_context: rules };
    }
    case 'drakon_format_prompt': {
      const code = state.source_code || state.message || '';
      const kb = state.kb_context || '';
      const prompt = `KB:\n${kb.substring(0, 1500)}\n\nЗгенеруй DRAKON IR JSON для функції:\n\`\`\`python\n${code.substring(0, 3000)}\n\`\`\`\nВиведи тільки JSON масив у \`\`\`json ... \`\`\` блоці.`;
      return { llm_prompt: prompt };
    }
    case 'drakon_parse_result': {
      const reply = state.llm_reply || '';
      const match = reply.match(/```json\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          return { drakon_ir: Array.isArray(parsed) ? parsed : [parsed], parse_ok: true };
        } catch (e) {}
      }
      return { drakon_ir: [], parse_ok: false };
    }
    case 'docs_load_kb': {
      return { kb_context: 'Documentation context placeholder.' };
    }
    case 'docs_format_prompt': {
      const query = state.message || '';
      const kb = state.kb_context || '';
      const prompt = `Документація проекту:\n${kb.substring(0, 2000)}\n\nПитання: ${query}\n\nВідповідай українською, посилайся на [[wiki-links]] де доречно.`;
      return { llm_prompt: prompt };
    }
    case 'llm_call': {
      const prompt = state.llm_prompt || '';
      const reply = await llmComplete([{ role: 'user', content: prompt }], env.PROXY_MODEL || 'gemini-2.5-flash', 0.1, env.CUSTOM_API_KEY || env.PROXY_TOKEN, env.PROXY_URL, env);
      return { llm_reply: reply };
    }
    case 'llm_call_with_system': {
      const system = state.ss_system || '';
      const prompt = state.llm_prompt || '';
      const messages = [];
      if (system) messages.push({ role: 'system', content: system });
      messages.push({ role: 'user', content: prompt });
      const reply = await llmComplete(messages, env.PROXY_MODEL || 'gemini-2.5-flash', 0.2, env.CUSTOM_API_KEY || env.PROXY_TOKEN, env.PROXY_URL, env);
      return { llm_reply: reply };
    }
    
    // Sonate Solidaire Nodes
    case 'ss_detect_audience': {
      const msg = (state.message || '').toLowerCase();
      const keywords: Record<string, string[]> = {
        events: ['concert', 'booking', 'заход', 'konzert', 'tarif', 'замовити', 'виступ', 'organisation', 'réservation', 'spectacle', 'engager', 'programme', 'soirée', 'event'],
        musicians: ['musicien', 'музикант', 'instrument', 'jouer', 'грати', 'виступати', 'intégrer', 'інтеграція', 'audition', 'rejoindre', 'participer', 'приєднатися', 'заявка', 'колектив', 'mitmachen', 'beitreten', 'candidature', 'postuler'],
        partners: ['volunteer', 'волонтер', 'partner', 'don', 'financement', 'association', 'bénévole', 'soutenir', 'subvention', 'loterie', 'підтримати', 'партнер', 'фінансування']
      };
      
      let detected = 'general';
      for (const [audience, kws] of Object.entries(keywords)) {
        if (kws.some(kw => msg.includes(kw))) {
          detected = audience;
          break;
        }
      }
      return { ss_audience: detected };
    }
    case 'ss_load_kb': {
      const audience = state.ss_audience || 'general';
      const url = `https://sonate-solidaire.me/kb/kb-${audience}.md`;
      let text = '';
      try {
        const res = await fetch(url);
        if (res.ok) text = await res.text();
      } catch (e) {}
      
      if (!text) {
        text = `Default fallback KB for audience: ${audience}`;
      }
      return { kb_context: text };
    }
    case 'ss_format_prompt': {
      const msg = state.message || '';
      const kb = state.kb_context || '';
      const audience = state.ss_audience || 'general';

      const msgLower = msg.toLowerCase();
      let langHint = 'Réponds en français.';
      if (/[абвгдеєжзиіїйклмнопрстуфхцчшщьюя]/.test(msgLower)) {
        langHint = 'Respond in Ukrainian (Українська).';
      } else if (/[üöäß]/.test(msgLower) || ['ich', 'sie', 'das', 'und', 'bitte'].some(w => msgLower.includes(w))) {
        langHint = 'Antworte auf Deutsch.';
      }

      const system = `Tu es l'assistant de l'association Sonate Solidaire. Tu réponds aux questions sur l'association, ses activités et ses services. Audience détectée: ${audience}. ${langHint} Sois concis, chaleureux et professionnel. Si tu ne sais pas, dirige vers contact@sonate-solidaire.me.`;
      const prompt = `Contexte:\n${kb.substring(0, 2000)}\n\nQuestion: ${msg}`;
      return { llm_prompt: prompt, ss_system: system };
    }
    case 'ss_format_response': {
      const reply = state.llm_reply || '';
      const audience = state.ss_audience || 'general';
      const ctas: Record<string, string> = {
        events: '\n\n→ [Formulaire de contact](https://sonate-solidaire.me/contact)',
        musicians: '\n\n→ [Chemin d\'intégration](https://sonate-solidaire.me/integration-path)',
        partners: '\n\n→ [Soutenir l\'association](https://sonate-solidaire.me/support)',
        general: '\n\n→ [sonate-solidaire.me](https://sonate-solidaire.me)'
      };
      return { llm_reply: reply + (ctas[audience] || ctas.general) };
    }
    case 'ss_log_analytics': {
      return {};
    }
    
    default:
      return {};
  }
}

export async function executePipelineGraph(ir: any, initialState: any, env: any, onStep: (event: any) => void): Promise<any> {
  const items = ir.items;
  if (!items) throw new Error("Invalid pipeline: items missing");

  const state = { ...initialState };
  
  let currentId: string | undefined;
  for (const [id, item] of Object.entries(items)) {
    if ((item as any).type === 'header' || (item as any).type === 'branch') {
      currentId = id;
      break;
    }
  }

  if (!currentId) {
    if (items.b0) currentId = 'b0';
  }

  if (!currentId) {
    throw new Error("Pipeline entry node not found");
  }

  const visited = new Set<string>();

  while (currentId && currentId !== 'end') {
    if (visited.has(currentId)) {
      throw new Error(`Infinite loop detected at node: ${currentId}`);
    }
    visited.add(currentId);

    const node = items[currentId] as any;
    if (!node) break;

    if (node.type === 'branch' || node.type === 'header') {
      currentId = node.one;
      continue;
    }

    if (node.type === 'action') {
      const nodeName = node.content;
      onStep({ event: 'node_start', node: nodeName, state: { ...state } });
      
      const updates = await runNode(nodeName, state, env);
      Object.assign(state, updates);
      
      onStep({ event: 'node_done', node: nodeName, state: { ...state } });
      
      currentId = node.one;
      continue;
    }

    if (node.type === 'question') {
      const condition = node.content;
      let answer = false;
      
      if (condition === 'route_by_complexity') {
        answer = state.tree_level === 'primitive';
      } else if (condition === 'route_after_validate') {
        answer = !state.validation_errors || state.validation_errors.length === 0;
      } else if (condition === 'route_after_syntax') {
        answer = !state.syntax_errors || state.syntax_errors.length === 0;
      } else {
        answer = !!state[condition];
      }

      currentId = answer ? node.one : node.two;
      continue;
    }
  }

  onStep({ event: 'done', state });
  return state;
}

export async function listPipelines(env: any): Promise<any[]> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || env.GITHUB_REPO_NAME || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);
  
  try {
    const files = await api.listDir('services/architect-agent-flue/pipelines');
    const result = [];
    for (const f of files) {
      if (f.name.endsWith('.drakon.json')) {
        const name = f.name.replace('.drakon.json', '');
        result.push({ name, display_name: name });
      }
    }
    return result;
  } catch (e) {
    // Try legacy location
    try {
      const files = await api.listDir('services/architect-agent/pipelines');
      const result = [];
      for (const f of files) {
        if (f.name.endsWith('.drakon.json')) {
          const name = f.name.replace('.drakon.json', '');
          result.push({ name, display_name: name });
        }
      }
      return result;
    } catch (err) {
      return [];
    }
  }
}

export async function getPipeline(name: string, env: any): Promise<any> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);
  
  try {
    const file = await api.getFile(`services/architect-agent-flue/pipelines/${name}.drakon.json`);
    return JSON.parse(file.content);
  } catch (e) {
    const file = await api.getFile(`services/architect-agent/pipelines/${name}.drakon.json`);
    return JSON.parse(file.content);
  }
}

export async function updatePipeline(name: string, ir: any, env: any): Promise<boolean> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);
  
  const path = `services/architect-agent-flue/pipelines/${name}.drakon.json`;
  const content = JSON.stringify(ir, null, 2);

  let sha: string | undefined;
  try {
    const existing = await api.getFile(path);
    sha = existing.sha;
  } catch (e) {}

  await api.putFile(path, content, `feat(drakon): update ${name} pipeline`, sha);
  return true;
}

export async function executePipelineSSE(name: string, jobId: string, env: any): Promise<Response> {
  const ghToken = env.GITHUB_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || '';
  const ghBranch = env.GITHUB_BRANCH || 'main';
  const api = new GitHubAPI(ghToken, ghRepo, ghBranch);
  const irPath = `services/architect-agent-flue/pipelines/${name}.drakon.json`;
  
  let ir: any;
  try {
    const file = await api.getFile(irPath);
    ir = JSON.parse(file.content);
  } catch (e) {
    try {
      const localFile = await api.getFile(`services/architect-agent/pipelines/${name}.drakon.json`);
      ir = JSON.parse(localFile.content);
    } catch (err) {
      return new Response(JSON.stringify({ error: `Pipeline ${name} not found: ${err}` }), { status: 404 });
    }
  }

  const job = await getJobDO(env, jobId);
  if (!job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      await updateJobDO(env, jobId, 'running');
      
      const onStep = async (event: any) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const finalState = await executePipelineGraph(ir, job.result || {}, env, onStep);
      await updateJobDO(env, jobId, 'done', finalState);
    } catch (e: any) {
      await updateJobDO(env, jobId, 'error', null, e.message);
      await writer.write(encoder.encode(`data: ${JSON.stringify({ event: 'error', error: e.message })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
