import { readSettings } from "@/lib/settings-storage";

function getDocsAgentUrl(): string {
  const url = readSettings().agents.docsUrl?.trim();
  if (url) return url.replace(/\/+$/, "");
  return "https://docs-agent.example.com";
}

export type DocsGenerateResponse = {
  job_id: string;
  status: string;
  repo_path?: string;
  output_dir?: string;
};

export type DocsStatusResponse = {
  status: "running" | "done" | "error" | string;
  log_tail?: string[] | string;
  returncode?: number | null;
  output_dir?: string;
};

export type DocsAnalysisItem = {
  name: string;
  path: string;
  file_count: number;
  files: string[];
};

export type DocsAnalysisResponse = {
  analyses: DocsAnalysisItem[];
};

export type DocsVersionItem = {
  name: string;
  path: string;
  files: number;
  modified?: number;
};

function readDocsConfig() {
  if (typeof window === "undefined") {
    return { protocol: "anthropic", baseUrl: "", apiKey: "", model: "", repoPath: "", repoName: "" };
  }
  return {
    protocol: localStorage.getItem("agent_llm_protocol") || "anthropic",
    baseUrl: localStorage.getItem("agent_llm_base_url") || "",
    apiKey: localStorage.getItem("agent_llm_api_key") || "",
    model: localStorage.getItem("agent_llm_model") || "",
    repoPath: localStorage.getItem("docs_repo_path") || "",
    repoName: localStorage.getItem("docs_repo_name") || "ai-drakon-setup",
  };
}

export interface GenerateOverrides {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  outputVersion?: string;
  repoPath?: string;
  repoName?: string;
}

export const docsApi = {
  async generate(instructions?: string, overrides?: GenerateOverrides): Promise<DocsGenerateResponse> {
    const base = getDocsAgentUrl();
    const davia = readDavia();
    const body: Record<string, unknown> = {
      repo_path: davia.repoPath,
      repo_name: davia.repoName,
      instructions: instructions || undefined,
      davia: {
        proxy_url: overrides?.baseUrl || davia.proxyUrl,
        api_key: overrides?.apiKey || davia.apiKey,
        model: overrides?.model || davia.model,
      },
    };
    if (overrides?.baseUrl) body.base_url = overrides.baseUrl;
    if (overrides?.apiKey) body.api_key = overrides.apiKey;
    if (overrides?.model) body.model = overrides.model;
    if (overrides?.maxTokens) body.max_tokens = overrides.maxTokens;
    if (overrides?.outputVersion) body.output_version = overrides.outputVersion;

    const res = await fetch(`${base}/docs/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Docs generate failed: HTTP ${res.status}`);
    return res.json();
  },

  async status(jobId: string): Promise<DocsStatusResponse> {
    const base = getDocsAgentUrl();
    const res = await fetch(`${base}/docs/status/${encodeURIComponent(jobId)}`);
    if (!res.ok) throw new Error(`Docs status failed: HTTP ${res.status}`);
    return res.json();
  },

  async analysis(): Promise<DocsAnalysisResponse> {
    const base = getDocsAgentUrl();
    const res = await fetch(`${base}/docs/analysis`);
    if (!res.ok) throw new Error(`Docs analysis failed: HTTP ${res.status}`);
    return res.json();
  },

  async listVersions(): Promise<DocsVersionItem[]> {
    const base = getDocsAgentUrl();
    const res = await fetch(`${base}/docs/analysis`);
    if (!res.ok) throw new Error(`Docs versions failed: HTTP ${res.status}`);
    const data = (await res.json()) as { versions?: DocsVersionItem[]; analyses?: DocsAnalysisItem[] };
    if (Array.isArray(data.versions)) return data.versions;
    if (Array.isArray(data.analyses)) {
      return data.analyses.map((a) => ({
        name: a.name,
        path: a.path,
        files: a.file_count,
      }));
    }
    return [];
  },
};

export function isDocGenRequest(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("генеруй документ") ||
    lower.includes("оновити документ") ||
    lower.includes("generate doc") ||
    lower.includes("update doc")
  );
}
