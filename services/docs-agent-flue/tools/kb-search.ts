import { ToolContext } from '../src/types.js';

export async function kbSearch(
  query: string,
  project: string,
  topK: number = 5,
  ctx: ToolContext
): Promise<{ slug: string; title: string; score: number; via: string }[]> {
  const workerUrl = ctx.env?.WORKER_URL || 'https://drakon-antigravity-worker.maxfraieho.workers.dev';
  const res = await fetch(`${workerUrl}/v1/kb/search?project=${encodeURIComponent(project)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ctx.env?.AUTH_TOKEN || ''}`,
    },
    body: JSON.stringify({ query, top_k: topK }),
  });
  if (!res.ok) throw new Error(`kb/search failed: ${res.status}`);
  const data = await res.json() as any;
  return data.results || [];
}

export async function kbIndex(
  project: string,
  ctx: ToolContext
): Promise<{ success: boolean; message?: string }> {
  const workerUrl = ctx.env?.WORKER_URL || 'https://drakon-antigravity-worker.maxfraieho.workers.dev';
  const res = await fetch(`${workerUrl}/v1/kb/index?project=${encodeURIComponent(project)}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ctx.env?.AUTH_TOKEN || ''}`,
    },
  });
  if (!res.ok) throw new Error(`kb/index failed: ${res.status}`);
  const data = await res.json() as any;
  return data;
}
