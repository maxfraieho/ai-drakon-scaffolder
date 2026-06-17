import { Article } from './collect';

export interface Relationship {
  source_id: string;
  link: string;
  target_id: string;
}

export function buildExtractionPrompt(articles: Article[]): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = 
    "Ти — помічник для побудови семантичного графу. Повертай тільки валідний JSON.";

  const lines = articles.map(art => {
    const cleanSummary = art.summary.replace(/\n/g, ' ').trim();
    return `${art.slug} | ${art.folder} | ${art.title} | ${cleanSummary}`;
  });

  const userPrompt = 
    "Список статей:\n" + 
    lines.join('\n') + 
    "\n\nЗадача: знайти значущі семантичні зв'язки між статтями, відповісти JSON у форматі:\n" +
    '{"relationships":[{"source_id":"...","link":"...","target_id":"..."}]}';

  return { systemPrompt, userPrompt };
}

export async function callLLM(
  messages: Array<{ role: string; content: string }>,
  gatewayUrl: string,
  authToken: string,
  model: string = 'auto'
): Promise<string> {
  const resp = await fetch(`${gatewayUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      model: model || 'auto',
      messages,
      max_tokens: 2000,
      temperature: 0.3
    })
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`LLM Gateway error: status ${resp.status}. Details: ${errText}`);
  }

  const data = await resp.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

export function parseRelationships(llmResponse: string, articles: Article[]): Relationship[] {
  let jsonStr = '';
  const match = llmResponse.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) {
    jsonStr = match[1].trim();
  } else {
    const startIdx = llmResponse.indexOf('{');
    const endIdx = llmResponse.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      jsonStr = llmResponse.slice(startIdx, endIdx + 1).trim();
    } else {
      jsonStr = llmResponse.trim();
    }
  }

  let data: any;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return [];
  }

  const relationships = data.relationships;
  if (!Array.isArray(relationships)) {
    return [];
  }

  const artMap = new Map<string, Article>();
  for (const art of articles) {
    artMap.set(art.slug, art);
  }

  const validRels: Relationship[] = [];
  const seen = new Set<string>();

  for (const rel of relationships) {
    if (!rel || typeof rel !== 'object') continue;

    const source_id = rel.source_id;
    const target_id = rel.target_id;
    const link = rel.link || 'relates_to';

    if (typeof source_id !== 'string' || typeof target_id !== 'string') continue;
    if (source_id === target_id) continue;

    const sourceArt = artMap.get(source_id);
    const targetArt = artMap.get(target_id);

    if (!sourceArt || !targetArt) continue;

    // Reject if in the same folder
    if (sourceArt.folder === targetArt.folder) continue;

    const key = `${source_id}||${target_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const linkStr = String(link).trim().toLowerCase().replace(/\s+/g, '_');

    validRels.push({
      source_id,
      target_id,
      link: linkStr
    });
  }

  return validRels;
}
