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

function readDavia() {
  if (typeof window === "undefined") {
    return { proxyUrl: "", apiKey: "", model: "", repoPath: "", repoName: "" };
  }
  return {
    proxyUrl: localStorage.getItem("davia_proxy_url") || "https://openai-proxy.exodus.pp.ua/v1",
    apiKey: localStorage.getItem("davia_api_key") || "freecc",
    model: localStorage.getItem("davia_model") || "agent-proxy",
    repoPath: localStorage.getItem("davia_repo_path") || "",
    repoName: localStorage.getItem("davia_repo_name") || "ai-drakon-setup",
  };
}

export const docsApi = {
  async generate(instructions?: string): Promise<DocsGenerateResponse> {
    const base = getDocsAgentUrl();
    const davia = readDavia();
    const res = await fetch(`${base}/docs/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo_path: davia.repoPath,
        repo_name: davia.repoName,
        instructions: instructions || undefined,
        davia: {
          proxy_url: davia.proxyUrl,
          api_key: davia.apiKey,
          model: davia.model,
        },
      }),
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
