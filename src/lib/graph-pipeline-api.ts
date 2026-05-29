/**
 * graph-pipeline-api.ts
 * Client for /graph-pipelines REST + SSE API on architect-agent (port 8766).
 * URL resolution mirrors agent-api.ts: reads drakon_agent_base_url from localStorage,
 * falls back to http://192.168.3.184, then appends architect port 8766.
 */

import type { IrDiagram } from "@/lib/htse/ir-types";

export interface PipelineInfo {
  name: string;
  display_name: string;
}

export type { IrDiagram };

export interface ExecutionEvent {
  event: "node_done" | "breakpoint" | "done" | "error";
  node: string | null;
  state?: Record<string, unknown>;
  error?: string;
}

function getArchitectBase(): string {
  if (typeof window === "undefined") return "http://192.168.3.184:8766";
  const base = localStorage.getItem("drakon_agent_base_url")?.trim() || "http://192.168.3.184";
  return `${base.replace(/\/+$/, "")}:8766`;
}

export async function listPipelines(): Promise<PipelineInfo[]> {
  const r = await fetch(`${getArchitectBase()}/graph-pipelines`);
  if (!r.ok) throw new Error(`listPipelines: ${r.status}`);
  const data = await r.json();
  return data.pipelines ?? [];
}

export async function getPipeline(name: string): Promise<IrDiagram> {
  const r = await fetch(`${getArchitectBase()}/graph-pipelines/${name}`);
  if (!r.ok) throw new Error(`getPipeline(${name}): ${r.status}`);
  return r.json();
}

export async function savePipeline(name: string, ir: IrDiagram): Promise<void> {
  const r = await fetch(`${getArchitectBase()}/graph-pipelines/${name}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ir),
  });
  if (!r.ok) throw new Error(`savePipeline: ${r.status}`);
}

export async function createPipeline(name: string): Promise<PipelineInfo> {
  const postResp = await fetch(`${getArchitectBase()}/graph-pipelines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, display_name: name }),
  }).catch(() => null);

  if (postResp?.ok) {
    return postResp.json() as Promise<PipelineInfo>;
  }

  const skeleton: IrDiagram = {
    name,
    access: "private",
    params: [],
    items: {
      h0: { type: "header", content: name },
      e0: { type: "end", content: "" },
    },
  };
  await savePipeline(name, skeleton);
  return { name, display_name: name };
}

export async function startExecution(
  name: string,
  initialState: Record<string, unknown> = {},
  breakpoints: string[] = [],
): Promise<string> {
  const r = await fetch(`${getArchitectBase()}/graph-pipelines/${name}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initial_state: initialState, breakpoints }),
  });
  if (!r.ok) throw new Error(`startExecution: ${r.status}`);
  const data = await r.json();
  return data.job_id as string;
}

export function streamExecution(
  name: string,
  jobId: string,
  onEvent: (ev: ExecutionEvent) => void,
  signal?: AbortSignal,
): void {
  const url = `${getArchitectBase()}/graph-pipelines/${name}/execute/${jobId}/stream`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try {
      const ev: ExecutionEvent = JSON.parse(e.data);
      onEvent(ev);
      if (ev.event === "done" || ev.event === "error") es.close();
    } catch {
      /* skip malformed chunk */
    }
  };
  es.onerror = () => es.close();
  signal?.addEventListener("abort", () => es.close(), { once: true });
}

export async function resumeExecution(
  name: string,
  jobId: string,
  stateOverride: Record<string, unknown> = {},
): Promise<void> {
  const r = await fetch(
    `${getArchitectBase()}/graph-pipelines/${name}/execute/${jobId}/resume`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state_override: stateOverride }),
    },
  );
  if (!r.ok) throw new Error(`resumeExecution: ${r.status}`);
}

// ---- Per-project agent pipeline API ----

export async function listProjectAgents(slug: string): Promise<{name: string, has_pipeline: boolean, kb_docs: number}[]> {
  const base = getArchitectBase();
  const resp = await fetch(`${base}/projects/${slug}/agents`);
  const data = await resp.json();
  return data.agents || [];
}

export async function getProjectPipeline(slug: string, agent: string): Promise<object | null> {
  const base = getArchitectBase();
  const resp = await fetch(`${base}/projects/${slug}/agents/${agent}/pipeline`);
  if (!resp.ok) return null;
  return resp.json();
}

export async function saveProjectPipeline(slug: string, agent: string, ir: object): Promise<boolean> {
  const base = getArchitectBase();
  const resp = await fetch(`${base}/projects/${slug}/agents/${agent}/pipeline`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ir}),
  });
  return resp.ok;
}

export function streamProjectExecution(slug: string, agent: string, input: string): EventSource {
  const base = getArchitectBase();
  return new EventSource(`${base}/projects/${slug}/agents/${agent}/execute?input=${encodeURIComponent(input)}`);
}

