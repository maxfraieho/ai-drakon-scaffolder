import { Type, defineTool } from '@flue/runtime';
import { JSAnalyzer } from '../../lib/ast-analyzer.js';
import { validateIr } from '../../lib/ir-validator.js';
import { retrieveKB } from '../../lib/kb-retriever.js';
import { llmComplete } from '../../lib/llm-client.js';
import { SYSTEM_PROMPT, buildRefinePrompt } from '../../lib/prompts.js';

export const analyzeCode = defineTool({
  name: 'analyze_code',
  description: 'Analyze source code (Python, JS, TS) and generate validated and refined DRAKON IR.',
  parameters: Type.Object({
    code: Type.String({ description: 'Source code content' }),
    filename: Type.String({ description: 'Filename of the module' }),
    refine: Type.Boolean({ description: 'Enable LLM refinement' }),
  }),
  execute: async ({ code, filename, refine }, context: any) => {
    const ext = (filename || 'module.js').split('.').pop()?.toLowerCase();
    const isJS = ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx' || ext === 'mjs' || ext === 'cjs';
    const apiKey = context?.env?.CUSTOM_API_KEY || (typeof process !== 'undefined' ? process.env.CUSTOM_API_KEY : '') || 'dummy';

    let rawDiagrams: any[] = [];

    if (isJS) {
      // 1. JS/TS AST parsing using acorn
      rawDiagrams = new JSAnalyzer().analyze(code, filename);
    } else {
      // 2. Python/other: LLM-only analysis (no real AST in worker)
      try {
        const prompt = `You are a DRAKON diagram expert. Analyze this Python code:
\`\`\`python
${code}
\`\`\`
Convert the code logic into DRAKON IR format.
Return ONLY a JSON array of diagram objects. Each diagram object must match the DRAKON IR schema:
{
  "name": "<function_name>",
  "params": "<parameter_list_string>",
  "items": {
    "b0": {"type": "branch", "branchId": 0, "one": "<first_node_id>"},
    "end": {"type": "end"},
    "<node_id>": {"type": "action", "content": "<action_description>", "one": "<next_node_id>"},
    "<question_node_id>": {"type": "question", "content": "<condition_ends_with_question_mark>?", "one": "<yes_node_id>", "two": "<no_node_id>"}
  }
}
Provide valid JSON without markdown formatting. Do not wrap in markdown fences.`;

        const res = await llmComplete(
          [{ role: 'user', content: prompt }],
          'gemini-2.5-flash',
          0.1,
          apiKey
        );

        let cleanContent = res.trim();
        if (cleanContent.startsWith('```')) {
          const lines = cleanContent.split('\n');
          cleanContent = lines.filter(l => !l.startsWith('```')).join('\n').trim();
        }

        rawDiagrams = JSON.parse(cleanContent);
        if (!Array.isArray(rawDiagrams)) {
          rawDiagrams = [rawDiagrams];
        }
      } catch (e: any) {
        rawDiagrams = [{
          name: 'error_diagram',
          params: '',
          items: {
            b0: { type: 'branch', branchId: 0, one: 'n1' },
            n1: { type: 'action', content: `LLM Parsing Error: ${e.message}`, one: 'end' },
            end: { type: 'end' }
          },
          _valid: false,
          _errors: [e.message]
        }];
      }
    }

    const results: any[] = [];
    for (const diagram of rawDiagrams) {
      if (diagram._errors && diagram.name === 'error_diagram') {
        results.push(diagram);
        continue;
      }

      // 3. Retrieve KB context
      const query = `${diagram.name || ''} ${diagram.params || ''}`;
      let kbCtx = '';
      try {
        kbCtx = await retrieveKB(query, context?.env);
      } catch (e) {
        console.error('KB retrieval failed:', e);
      }

      // 4. AI refinement
      let refined = diagram;
      if (refine) {
        try {
          const refinePrompt = buildRefinePrompt(diagram, kbCtx);
          const llmRes = await llmComplete(
            [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: refinePrompt }
            ],
            'gemini-2.5-flash',
            0.0,
            apiKey
          );

          let cleanContent = llmRes.trim();
          if (cleanContent.startsWith('```')) {
            const lines = cleanContent.split('\n');
            cleanContent = lines.filter(l => !l.startsWith('```')).join('\n').trim();
          }

          refined = JSON.parse(cleanContent);
        } catch (e: any) {
          refined = {
            ...diagram,
            _refine_error: e.message
          };
        }
      }

      // 5. Validation
      const validation = validateIr(refined);
      refined._valid = validation.valid;
      if (validation.errors.length > 0) {
        refined._errors = validation.errors;
      }
      if (validation.warnings.length > 0) {
        refined._warnings = validation.warnings;
      }

      results.push(refined);
    }

    return JSON.stringify({
      filename,
      diagrams: results,
      count: results.length,
    }, null, 2);
  }
});
