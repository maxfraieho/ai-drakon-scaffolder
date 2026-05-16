import type { Diagram } from "@/types/drakon";
import type { AnalysisJob, CodebaseAnalysisRequest } from "@/types/analysis";
import { getAccessToken } from "@/lib/auth";
import { getGithubConfig } from "@/lib/settings-storage";
import { resolveWorkerUrl } from "@/lib/worker-url";

function resolveApiBase() {
  return resolveWorkerUrl();
}

type GenerateType = "code" | "text";

type LoginResponse = {
  token?: string;
  jwt?: string;
  error?: string;
  message?: string;
};

type GenerateResponse = {
  diagram?: Diagram["diagram"];
  error?: string;
  message?: string;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

type SaveDiagramResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

type DiagramGetResponse = {
  success?: boolean;
  diagram?: Diagram;
  error?: string;
  message?: string;
};

type DiagramListResponse = {
  success?: boolean;
  folderSlug?: string;
  diagrams?: string[];
  error?: string;
  message?: string;
};

type AnalyzeCodebaseResponse = {
  jobId: string;
  status?: "pending" | "analyzing" | "completed" | "failed";
};

type GithubTreeEntry = {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
};

type GithubTreeResponse = {
  success: boolean;
  entries: GithubTreeEntry[];
};

type GithubFileResponse = {
  success: boolean;
  path: string;
  content: string;
  sha: string;
};

type GithubCommitResponse = {
  success: boolean;
  path?: string;
  commitSha?: string;
  commitUrl?: string;
};

type GithubBranchesResponse = {
  success: boolean;
  branches: string[];
};

const headers = (): HeadersInit => ({
  Authorization: `Bearer ${getAccessToken() ?? ""}`,
  "Content-Type": "application/json",
});

const githubHeaders = (token?: string): HeadersInit => {
  const cfgToken = token ?? getGithubConfig().token;
  return cfgToken.trim().length > 0 ? { "X-Github-Token": cfgToken.trim() } : {};
};

const githubRequestHeaders = (token?: string): HeadersInit => ({
  ...(headers() as Record<string, string>),
  ...(githubHeaders(token) as Record<string, string>),
});

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T;

  if (!response.ok) {
    const maybeError = data as { error?: string; message?: string };
    throw new Error(maybeError.message || maybeError.error || `HTTP ${response.status}`);
  }

  return data;
}

export const api = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${resolveApiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    return parseResponse<LoginResponse>(response);
  },

  generate: async (input: string, type: GenerateType): Promise<GenerateResponse> => {
    const response = await fetch(`${resolveApiBase()}/v1/drakon/generate`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ input, type }),
    });

    return parseResponse<GenerateResponse>(response);
  },

  commit: async (folderId: string, diagramId: string, data: Diagram): Promise<ApiResponse> => {
    const response = await fetch(`${resolveApiBase()}/v1/drakon/commit`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ folderSlug: folderId, diagramId, diagram: data }),
    });

    return parseResponse<ApiResponse>(response);
  },

  saveDiagram: async (
    folderSlug: string,
    diagramId: string,
    diagram: unknown,
  ): Promise<SaveDiagramResponse> => {
    const response = await fetch(`${resolveApiBase()}/v1/drakon/commit`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ folderSlug, diagramId, diagram }),
    });

    return parseResponse<SaveDiagramResponse>(response);
  },

  getDiagram: (folderId: string, diagramId: string): Promise<DiagramGetResponse> =>
    fetch(`${resolveApiBase()}/v1/drakon/${folderId}/${diagramId}`, {
      headers: headers(),
    }).then((r) => r.json()),

  listDiagrams: (folderId: string): Promise<DiagramListResponse> =>
    fetch(`${resolveApiBase()}/v1/drakon/${folderId}`, {
      headers: headers(),
    }).then((r) => r.json()),

  deleteDiagram: async (folderId: string, diagramId: string): Promise<ApiResponse> => {
    const response = await fetch(`${resolveApiBase()}/v1/drakon/${folderId}/${diagramId}`, {
      method: "DELETE",
      headers: headers(),
    });

    return parseResponse<ApiResponse>(response);
  },

  analyzeCodebase: async (request: CodebaseAnalysisRequest): Promise<{ jobId: string }> => {
    const response = await fetch(`${resolveApiBase()}/v1/analysis/codebase`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(request),
    });

    const data = await parseResponse<AnalyzeCodebaseResponse>(response);
    return { jobId: data.jobId };
  },

  getAnalysisJob: async (jobId: string): Promise<AnalysisJob> => {
    const response = await fetch(`${resolveApiBase()}/v1/analysis/jobs/${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: headers(),
    });

    return parseResponse<AnalysisJob>(response);
  },

  listAnalysisJobs: async (): Promise<AnalysisJob[]> => {
    const response = await fetch(`${resolveApiBase()}/v1/analysis/jobs`, {
      method: "GET",
      headers: headers(),
    });

    return parseResponse<AnalysisJob[]>(response);
  },

  githubListTree: (
    owner: string,
    repo: string,
    path = "",
    branch = "main",
    token?: string,
  ): Promise<GithubTreeResponse> =>
    fetch(
      `${resolveApiBase()}/v1/github/tree?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`,
      { headers: githubRequestHeaders(token) },
    ).then((r) => r.json()),

  githubGetFile: (
    owner: string,
    repo: string,
    path: string,
    branch = "main",
    token?: string,
  ): Promise<GithubFileResponse> =>
    fetch(
      `${resolveApiBase()}/v1/github/file?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`,
      { headers: githubRequestHeaders(token) },
    ).then((r) => r.json()),

  githubCommitFile: async (
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch = "main",
    token?: string,
  ): Promise<GithubCommitResponse> => {
    const response = await fetch(`${resolveApiBase()}/v1/github/commit`, {
      method: "POST",
      headers: githubRequestHeaders(token),
      body: JSON.stringify({ owner, repo, path, content, message, branch }),
    });

    return response.json();
  },

  githubListBranches: (owner: string, repo: string, token?: string): Promise<GithubBranchesResponse> =>
    fetch(
      `${resolveApiBase()}/v1/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
      { headers: githubRequestHeaders(token) },
    ).then((r) => r.json()),
};
