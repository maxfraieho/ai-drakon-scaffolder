import { calculateCC } from '../lib/cc-calculator.js';
import { JSAnalyzer } from '../lib/ast-analyzer.js';
import { validateIr } from '../lib/ir-validator.js';
import { llmComplete } from '../lib/llm-client.js';
import { DrakonDiagram } from '../lib/ir-types.js';

export interface PipelineAResult {
  drakonIr: DrakonDiagram[];
  treeLevel: 'primitive' | 'silhouette' | 'branch' | 'deep';
  cc: number;
  validationErrors: string[];
}

function validateIrList(diagrams: DrakonDiagram[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(diagrams)) return ['IR is not a list'];
  for (const ir of diagrams) {
    const res = validateIr(ir);
    if (!res.valid) {
      errors.push(...res.errors.map(e => `${ir.name || '?'}: ${e}`));
    }
  }
  return errors;
}

async function astTranslate(code: string, filePath: string, env: any): Promise<DrakonDiagram[]> {
  const ext = filePath.split('.').pop() || '';
  if (['js', 'ts', 'tsx', 'jsx', 'mjs'].includes(ext)) {
    const analyzer = new JSAnalyzer();
    return analyzer.analyze(code, filePath);
  }
  
  // LLM fallback for Python/other languages
  const rules = `
- b0: {type:"branch",branchId:0,one:"<перший_вузол>"} — ОБОВ'ЯЗКОВО
- end: {type:"end"} — ОБОВ'ЯЗКОВО
- action: {type:"action",content:"<текст>",one:"<далі>"}
- question: {type:"question",content:"<умова>?",one:"<так>",two:"<ні>"}
  one=ТАК (вниз), two=НІ (вправо)
- params — завжди рядок, ніколи масив
  `;
  
  const prompt = `
DRAKON rules reference:
${rules}

Згенеруй DRAKON IR JSON для функції:
\`\`\`${ext}
${code.substring(0, 3000)}
\`\`\`

Виведи тільки JSON масив у \`\`\`json ... \`\`\` блоці.
  `;
  
  const reply = await llmComplete([
    { role: 'system', content: 'You are the AI-DRAKON agent. Translate code to DRAKON IR JSON.' },
    { role: 'user', content: prompt }
  ], env.PROXY_MODEL || 'gemini-2.5-flash', 0.1, env.CUSTOM_API_KEY || env.PROXY_TOKEN, env.PROXY_URL, env);
  
  const match = reply.match(/```json\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {}
  }
  return [];
}

async function llmYamlGen(code: string, filePath: string, treeLevel: string, cc: number, env: any): Promise<string> {
  const ext = filePath.split('.').pop() || '';
  const prompt = `Analyze the following code and produce a C4-Behavioral YAML describing its logical flow, actors, actions, and decision points.
Output ONLY the YAML block in a \`\`\`yaml ... \`\`\` fence.

File: ${filePath}
Complexity level: ${treeLevel} (CC=${cc})

\`\`\`${ext}
${code.substring(0, 4000)}
\`\`\`
`;
  return await llmComplete([
    { role: 'system', content: 'You are a software architect. Produce concise C4-Behavioral YAML.' },
    { role: 'user', content: prompt }
  ], env.PROXY_MODEL || 'gemini-2.5-flash', 0.1, env.CUSTOM_API_KEY || env.PROXY_TOKEN, env.PROXY_URL, env);
}

async function llmIrGen(yaml: string | null, code: string, env: any, previousErrors?: string[]): Promise<DrakonDiagram[]> {
  let errorHint = '';
  if (previousErrors && previousErrors.length > 0) {
    errorHint = '\n\nPrevious attempt had validation errors:\n' + previousErrors.slice(0, 5).join('\n');
  }

  let prompt = `Convert the source code into a DRAKON IR JSON array.
Each element represents one function/method. Required schema per element:
{"name": "func_name", "params": "a, b", "items": {"b0": {"type":"branch","branchId":0,"one":"n1"}, "n1": {"type":"action","content":"...","one":"end"}, "end": {"type":"end"}}}
Rules: single end node, b0 mandatory with branchId:0, question nodes need one (yes) and two (no).
Output ONLY a \`\`\`json [...] \`\`\` block.
${errorHint}
`;

  if (yaml) {
    prompt += `\nC4-Behavioral YAML description:\n${yaml.substring(0, 2000)}\n`;
  }
  
  prompt += `\nSource code:\n\`\`\`\n${code.substring(0, 3000)}\n\`\`\``;

  const reply = await llmComplete([
    { role: 'system', content: 'You are a DRAKON diagram expert. Output valid DRAKON IR JSON only.' },
    { role: 'user', content: prompt }
  ], env.PROXY_MODEL || 'gemini-2.5-flash', 0.1, env.CUSTOM_API_KEY || env.PROXY_TOKEN, env.PROXY_URL, env);

  const match = reply.match(/```json\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {}
  }
  return [];
}

export async function runPipelineA(code: string, filePath: string, env: any): Promise<PipelineAResult> {
  const cc = calculateCC(code, filePath);

  const treeLevel = cc <= 10 ? 'primitive' : cc <= 20 ? 'silhouette' : cc <= 50 ? 'branch' : 'deep';

  let drakonIr: DrakonDiagram[];

  if (treeLevel === 'primitive') {
    drakonIr = await astTranslate(code, filePath, env);
  } else {
    const yaml = await llmYamlGen(code, filePath, treeLevel, cc, env);
    drakonIr = await llmIrGen(yaml, code, env);
  }

  let errors: string[] = validateIrList(drakonIr);
  let iteration = 0;
  const MAX_ITERATIONS = 3;
  while (errors.length > 0 && iteration < MAX_ITERATIONS) {
    drakonIr = await llmIrGen(null, code, env, errors);
    errors = validateIrList(drakonIr);
    iteration++;
  }

  return { drakonIr, treeLevel, cc, validationErrors: errors };
}
