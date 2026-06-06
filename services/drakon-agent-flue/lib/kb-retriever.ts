import * as fs from 'fs';
import * as path from 'path';

class BM25 {
  private documents: any[] = [];
  private docLengths: number[] = [];
  private avgDocLength = 0;
  private df: Record<string, number> = {};
  private idf: Record<string, number> = {};
  private k1 = 1.5;
  private b = 0.75;

  constructor(documents: any[]) {
    this.documents = documents;
    const N = documents.length;
    if (N === 0) return;

    let totalLength = 0;
    for (const doc of documents) {
      const tokens = doc.tokens;
      this.docLengths.push(tokens.length);
      totalLength += tokens.length;

      const uniqueTokens = new Set<string>(tokens);
      for (const token of uniqueTokens) {
        this.df[token] = (this.df[token] || 0) + 1;
      }
    }
    this.avgDocLength = totalLength / N;

    for (const [token, count] of Object.entries(this.df)) {
      this.idf[token] = Math.log((N - count + 0.5) / (count + 0.5) + 1);
    }
  }

  getScores(queryTokens: string[]): number[] {
    const scores: number[] = new Array(this.documents.length).fill(0);
    for (let i = 0; i < this.documents.length; i++) {
      const doc = this.documents[i];
      const tokens = doc.tokens;
      const docLen = this.docLengths[i];

      const tf: Record<string, number> = {};
      for (const t of tokens) {
        tf[t] = (tf[t] || 0) + 1;
      }

      let score = 0;
      for (const q of queryTokens) {
        if (!tf[q]) continue;
        const idfVal = this.idf[q] || 0;
        const tfVal = tf[q];
        const numerator = tfVal * (this.k1 + 1);
        const denominator = tfVal + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
        score += idfVal * (numerator / denominator);
      }
      scores[i] = score;
    }
    return scores;
  }
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-zA-Z0-9_]+/g) || [];
}

export function splitSections(text: string): Array<{ heading: string; text: string }> {
  const sections: Array<{ heading: string; text: string }> = [];
  let currentHeading = 'intro';
  let currentLines: string[] = [];

  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      if (currentLines.length > 0) {
        sections.push({
          heading: currentHeading,
          text: currentLines.join('\n').trim(),
        });
      }
      currentHeading = line.substring(3).trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({
      heading: currentHeading,
      text: currentLines.join('\n').trim(),
    });
  }

  return sections.filter(s => s.text);
}

export async function loadKB(env?: any): Promise<any[]> {
  const docs: any[] = [];

  // 1. Try to load from Cloudflare KV Namespace
  if (env?.KNOWLEDGE_BASE) {
    try {
      const list = await env.KNOWLEDGE_BASE.list();
      for (const key of list.keys) {
        const text = await env.KNOWLEDGE_BASE.get(key.name);
        if (text) {
          const sections = splitSections(text);
          for (const section of sections) {
            docs.push({
              source: key.name,
              heading: section.heading,
              text: section.text,
              tokens: tokenize(section.heading + ' ' + section.text),
            });
          }
        }
      }
    } catch (e) {
      console.error('Error loading from KV:', e);
    }
  }

  // 2. Fall back to local filesystem if running in Node (where process and fs are available)
  if (docs.length === 0 && typeof process !== 'undefined') {
    try {
      const possiblePaths = [
        path.join(process.cwd(), 'services', 'drakon-agent', 'knowledge'),
        path.join(process.cwd(), '..', 'drakon-agent', 'knowledge'),
        path.join(process.cwd(), 'knowledge'),
        '/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/services/drakon-agent/knowledge'
      ];

      let kbDir = '';
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          kbDir = p;
          break;
        }
      }

      if (kbDir) {
        const files = fs.readdirSync(kbDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const text = fs.readFileSync(path.join(kbDir, file), 'utf-8');
            const sections = splitSections(text);
            for (const section of sections) {
              docs.push({
                source: file,
                heading: section.heading,
                text: section.text,
                tokens: tokenize(section.heading + ' ' + section.text),
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Error loading from filesystem:', e);
    }
  }

  // 3. Absolute fallback rules if no other source is available
  if (docs.length === 0) {
    const defaultRules = `
## DRAKON Rules
- Every diagram MUST have a "b0" node: {"type":"branch","branchId":0,"one":"<first_node>"}
- Every diagram MUST have an "end" node: {"type":"end"}
- "action" nodes: {"type":"action","content":"<text>","one":"<next>"}
- "question" nodes: {"type":"question","content":"<condition>?","one":"<yes>","two":"<no>"}
- question content MUST end with "?"
`;
    const sections = splitSections(defaultRules);
    for (const section of sections) {
      docs.push({
        source: 'default-rules.md',
        heading: section.heading,
        text: section.text,
        tokens: tokenize(section.heading + ' ' + section.text),
      });
    }
  }

  return docs;
}

export async function retrieveKB(query: string, env?: any, topK = 3): Promise<string> {
  const docs = await loadKB(env);
  if (docs.length === 0) return '';

  const bm25 = new BM25(docs);
  const queryTokens = tokenize(query);
  const scores = bm25.getScores(queryTokens);

  const ranked = docs
    .map((doc, idx) => ({ doc, score: scores[idx] }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (ranked.length === 0) return '';

  return ranked
    .map(item => `### ${item.doc.heading}\n${item.doc.text}`)
    .join('\n\n---\n\n');
}
