import { llmComplete } from '../lib/llm-client.js';

export interface RibosomeInput {
  pseudocode: string;
  nodes?: Array<{
    label: string;
    type: string;
    is_llm?: boolean;
    is_deterministic?: boolean;
    description?: string;
  }>;
  pipelineName: string;
  target?: string; // v1: only "flue"
  llmConfig?: {
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    protocol?: string;
  };
  kbContext?: string;
}

export interface RibosomeOutput {
  code: string;
  target: string;
  pipelineName: string;
}

const RIBOSOME_SYSTEM = `Ти — рибосома-компілятор DRAKON-псевдокоду у TypeScript Cloudflare Worker workflow.

Правила трансляції (ARCHITECTURE-CORE §1.3):
- вузол :: tool :: → await runNode(name, state, env)  (детермінований крок)
- вузол :: llm ::  → await llmComplete([...messages], env.PROXY_MODEL || 'gemini-2.5-flash', 0.2, undefined, undefined, env)
  МОДЕЛЬ ЗАВЖДИ env.PROXY_MODEL — НІКОЛИ не хардкодь назву моделі ('gpt-4o', 'claude-*', тощо).
- QUESTION/розгалуження ТАК(one)/НІ(two) → if/else
- (one) → наступна гілка; (two) → else-гілка

Генеруй ПОВНИЙ файл workflows/{name}.ts:
  export async function run{Name}(initialState: Record<string, any>, env: any): Promise<Record<string, any>>

Імпорти:
  import { llmComplete } from '../lib/llm-client.js';

Функція runNode — заглушка для детермінованих кроків (якщо немає конкретного інструменту):
  async function runNode(name: string, state: Record<string, any>, env: any): Promise<Record<string, any>> {
    // TODO: implement tool "\${name}"
    return state;
  }

Правила:
- БЕЗ вигаданих залежностей (тільки '../lib/llm-client.js' для LLM)
- Для кожного :: tool :: вузла — окремий виклик runNode або конкретної функції якщо ім'я відомо
- Для кожного :: llm :: вузла — виклик llmComplete з відповідним промптом
- state передається між кроками і оновлюється через spread: state = { ...state, key: value }
- Згенерований код НЕ містить хардкод-назв моделей. Модель — ТІЛЬКИ env.PROXY_MODEL.
- Відповідь — ТІЛЬКИ TypeScript код у \`\`\`typescript блоці. Нічого більше.`;

/**
 * Build a semantics table from node definitions.
 * Returns a markdown table string describing each node's type and description.
 */
function buildSemanticsTable(
  nodes: RibosomeInput['nodes']
): string {
  if (!nodes || nodes.length === 0) return '';

  const rows = nodes.map((n) => {
    const tag = n.is_llm ? ':: llm ::' : ':: tool ::';
    const desc = n.description ? ` — ${n.description}` : '';
    return `- ${n.label} → ${tag}${desc}`;
  });

  return `\nТаблиця семантики вузлів:\n${rows.join('\n')}`;
}

/**
 * Extract TypeScript code from a markdown code block.
 * Supports ```typescript and ``` blocks.
 */
function extractCode(raw: string): string {
  // Try ```typescript block first
  const tsMatch = raw.match(/```typescript\s*([\s\S]*?)```/i);
  if (tsMatch) return tsMatch[1].trim();

  // Fallback: any ``` block
  const genericMatch = raw.match(/```(?:\w+)?\s*([\s\S]*?)```/);
  if (genericMatch) return genericMatch[1].trim();

  // No block found — return raw text
  return raw.trim();
}

/**
 * Ribosome v1 — translates DRAKON pseudocode + node semantics
 * into a TypeScript Cloudflare Worker workflow file.
 */
export async function compilePseudocode(
  input: RibosomeInput,
  env: any,
  llmCfg?: RibosomeInput['llmConfig']
): Promise<RibosomeOutput> {
  const { pseudocode, nodes, pipelineName, target = 'flue' } = input;
  const cfg = llmCfg || input.llmConfig;

  const semanticsTable = buildSemanticsTable(nodes);

  let userPrompt =
    `Назва пайплайну: ${pipelineName}\n\n` +
    `Псевдокод:\n${pseudocode}` +
    semanticsTable;

  if (input.kbContext) {
    userPrompt += `\n\nЗнання цільового фреймворку (використовуй для точності):\n${input.kbContext}`;
  }

  // Resolve LLM params — only apply apiKey/baseUrl when protocol is openai-compatible or absent
  const useCustom =
    cfg && (!cfg.protocol || cfg.protocol === 'openai');

  const model =
    (useCustom && cfg?.model) ||
    env?.PROXY_MODEL ||
    'gemini-2.5-flash';

  const apiKey = useCustom ? cfg?.apiKey : undefined;
  const proxyUrl = useCustom ? cfg?.baseUrl : undefined;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: RIBOSOME_SYSTEM },
    { role: 'user', content: userPrompt },
  ];

  const rawResponse = await llmComplete(
    messages,
    model,
    0.1,
    apiKey,
    proxyUrl,
    env
  );

  const code = extractCode(rawResponse);

  return { code, target, pipelineName };
}
