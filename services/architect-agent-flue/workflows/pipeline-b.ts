import * as acorn from 'acorn';
import { llmComplete } from '../lib/llm-client.js';
import { DrakonDiagram } from '../lib/ir-types.js';

export interface PipelineBResult {
  code: string;
  language: string;
  syntaxErrors: string[];
  iterations: number;
}

async function checkSyntax(code: string, language: string, env: any): Promise<string[]> {
  const lang = language.toLowerCase();
  if (['js', 'javascript', 'ts', 'typescript', 'tsx', 'jsx'].includes(lang)) {
    try {
      // Basic check: we can preprocess TS if needed, but for syntax let's try a simple acorn parse.
      // If TS fails, standard js/ts check.
      let processed = code;
      if (lang.includes('ts')) {
        // Strip basic TS types for acorn parsing
        processed = code.replace(/:\s*(?:string|number|boolean|any|void|string\[\]|Record<[^>]+>)/g, '')
                        .replace(/import\s+type\s+[^;]+;/g, '')
                        .replace(/(\)\s*:\s*[A-Za-z0-9_<>\[\]|&\s{}]+)(?=\s*\{)/g, '');
      }
      acorn.parse(processed, { ecmaVersion: 2022, sourceType: 'module' });
      return [];
    } catch (e: any) {
      return [`SyntaxError: ${e.message}`];
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
    ], env.PROXY_MODEL || 'gemini-2.5-flash', 0.0, env.CUSTOM_API_KEY || env.PROXY_TOKEN);

    if (reply.trim().toUpperCase() === 'VALID') {
      return [];
    }
    return [reply.trim()];
  }

  return [];
}

async function llmCodeGen(
  drakonIr: DrakonDiagram,
  description: string,
  language: string,
  env: any,
  previousErrors?: string[]
): Promise<string> {
  let errorHint = '';
  if (previousErrors && previousErrors.length > 0) {
    errorHint = '\n\nPrevious attempt had syntax errors:\n' + previousErrors.slice(0, 3).join('\n');
  }

  const irStr = JSON.stringify(drakonIr, null, 2);
  const prompt = `Convert the following DRAKON IR diagram into ${language} code.
Description: ${description}
Output ONLY the code in a code fence, no explanations.
${errorHint}

DRAKON IR:
\`\`\`json
${irStr.substring(0, 3000)}
\`\`\`
`;

  const content = await llmComplete([
    { role: 'system', content: `You are a ${language} expert. Convert DRAKON IR to clean code.` },
    { role: 'user', content: prompt }
  ], env.PROXY_MODEL || 'gemini-2.5-flash', 0.1, env.CUSTOM_API_KEY || env.PROXY_TOKEN);

  const match = content.match(/```(?:\w+)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : content.trim();
}

export async function runPipelineB(
  drakonIr: DrakonDiagram,
  description: string,
  language: string,
  env: any
): Promise<PipelineBResult> {
  let generatedCode = await llmCodeGen(drakonIr, description, language, env);

  let syntaxErrors = await checkSyntax(generatedCode, language, env);
  let iteration = 0;
  const MAX_ITERATIONS = 3;

  while (syntaxErrors.length > 0 && iteration < MAX_ITERATIONS) {
    generatedCode = await llmCodeGen(drakonIr, description, language, env, syntaxErrors);
    syntaxErrors = await checkSyntax(generatedCode, language, env);
    iteration++;
  }

  return { code: generatedCode, language, syntaxErrors, iterations: iteration };
}
