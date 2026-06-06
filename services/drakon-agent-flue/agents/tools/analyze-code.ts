import { Type, defineTool } from '@flue/runtime';

export const analyzeCode = defineTool({
  name: 'analyze_code',
  description: 'Analyze source code (Python, JS, TS) and generate validated and refined DRAKON IR.',
  parameters: Type.Object({
    code: Type.String({ description: 'Source code content' }),
    filename: Type.String({ description: 'Filename of the module' }),
    refine: Type.Boolean({ description: 'Enable LLM refinement' }),
  }),
  execute: async ({ code, filename, refine }) => {
    // Mock KB retrieval
    const kbContext = `DRAKON IR guidelines: Diagrams must have a single start node (action: "header"), consecutive statement nodes, and a single end node. Only standard types (Action, Choice, LoopStart, LoopEnd) are supported.`;

    const proxyUrl = 'https://agy3.exodus.pp.ua/v1/chat/completions';
    // Use wrangler secret / binding or fall back to env var
    const apiKey = typeof process !== 'undefined' ? process.env.CUSTOM_API_KEY || 'dummy' : 'dummy';

    let diagrams = [];
    try {
      const prompt = `You are the DRAKON analyzer. Analyze this code from file "${filename}":\n\n\`\`\`\n${code}\n\`\`\`\n\nKB Context:\n${kbContext}\n\nConvert the code logic into DRAKON IR format. Return ONLY a JSON array of diagram objects. Each diagram object must have "name", "params", and "nodes" (with id, type, label, yes_node, no_node, next_node). Do not include any explanation or markdown formatting outside the JSON array.`;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        })
      });

      if (!response.ok) {
        throw new Error(`LLM proxy returned status ${response.status}`);
      }

      const responseData: any = await response.json();
      const content = responseData.choices?.[0]?.message?.content || '[]';
      const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      diagrams = JSON.parse(cleanContent);
    } catch (e) {
      diagrams = [{
        name: 'fallback_diagram',
        params: '',
        nodes: [
          { id: 1, type: 'Action', label: 'Error analyzing code: ' + (e as Error).message }
        ]
      }];
    }

    const results = diagrams.map((diag: any) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      if (!diag.name) errors.push('Diagram must have a name');
      if (!diag.nodes || diag.nodes.length === 0) errors.push('Diagram must contain nodes');

      return {
        ...diag,
        _valid: errors.length === 0,
        _errors: errors.length > 0 ? errors : undefined,
        _warnings: warnings.length > 0 ? warnings : undefined,
      };
    });

    return JSON.stringify({
      filename,
      diagrams: results,
      count: results.length,
    }, null, 2);
  }
});
