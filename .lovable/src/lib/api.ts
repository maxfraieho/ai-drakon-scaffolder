import type { Diagram } from "@/types/drakon";
import type { AnalysisJob, CodebaseAnalysisRequest } from "@/types/analysis";
import { getAccessToken } from "@/lib/auth";
import { getGithubConfig, readSettings } from "@/lib/settings-storage";
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

type ProjectActionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

// Knowledge Zone Types
export type KnowledgeZone = {
  id: string;
  name: string;
  description?: string;
  expiresAt?: string; // ISO date string
  noteCount: number;
  notebookLmStatus: "queued" | "pending" | "running" | "completed" | "failed" | "none";
  accessType: "web" | "mcp" | "both";
  notebookLmId?: string;
  notebookLmTitle?: string;
  folders?: string[];
  accessCode?: string;
  webUrl?: string;
  mcpUrl?: string;
  createdAt?: string;
};

export type ListKnowledgeZonesResponse = {
  success: boolean;
  zones: KnowledgeZone[];
  error?: string;
  message?: string;
};

export type CreateKnowledgeZoneRequest = {
  name: string;
  description?: string;
  ttlMinutes?: number; // minutes: 60=1h, 1440=24h, 10080=7d
  accessType: "web" | "mcp" | "both";
  createNotebookLm?: boolean;
  notebookLmTitle?: string;
  shareEmails?: string[];
  folders?: string[];
  noteCount?: number;
};

export type CreateKnowledgeZoneResponse = {
  success: boolean;
  zone?: KnowledgeZone;
  error?: string;
  message?: string;
};

export type DeleteKnowledgeZoneResponse = {
  success: boolean;
  error?: string;
  message?: string;
};

export type ZoneHealth = "ready" | "pending" | "failed";

const headers = (): HeadersInit => ({
  Authorization: `Bearer ${getAccessToken() ?? ""}`,
  "Content-Type": "application/json",
});

const githubHeaders = (owner?: string, token?: string): HeadersInit => {
  const ghCfg = getGithubConfig();
  const cfgToken = token !== undefined
    ? token
    : (owner && owner.trim().toLowerCase() === ghCfg.owner.trim().toLowerCase() ? ghCfg.token : "");
  return cfgToken.trim().length > 0 ? { "X-Github-Token": cfgToken.trim() } : {};
};

const githubRequestHeaders = (owner?: string, token?: string): HeadersInit => ({
  ...(headers() as Record<string, string>),
  ...(githubHeaders(owner, token) as Record<string, string>),
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
    const response = await
    fetch(`${resolveApiBase()}/v1/analysis/jobs/${encodeURIComponent(jobId)}`, {
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

  listProjects: (): Promise<{ success: boolean; projects: unknown[] }> =>
    fetch(`${resolveApiBase()}/v1/projects/list`, { headers: headers() }).then((r) => r.json()),

  listDrakonIr: (project?: string): Promise<{ success: boolean; diagrams: string[]; count: number
  }> => {
    const qs = project ? `?project=${encodeURIComponent(project)}` : "";
    return fetch(`${resolveApiBase()}/v1/drakon-ir/list${qs}`, { headers: headers() }).then((r) => r.json());
  },

  getDrakonIr: (name: string, project?: string): Promise<{ success: boolean; name: string;
  diagram: object }> => {
    const proj = project ? `&project=${encodeURIComponent(project)}` : "";
    return fetch(`${resolveApiBase()}/v1/drakon-ir/${encodeURIComponent(name)}?_=1${proj}`, { headers: headers() }).then((r) => r.json());
  },

  addProject: (data: {
    slug: string; name: string; path: string; description?: string;
    hasDrakonIr?: boolean; hasDocs?: boolean;
    github?: { owner: string; repo: string; branch: string };
  }): Promise<{ success: boolean; project: unknown }> =>
    fetch(`${resolveApiBase()}/v1/projects/add`, {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  deleteProject: (slug: string): Promise<{ success: boolean; deleted: string }> =>
    fetch(`${resolveApiBase()}/v1/projects/${encodeURIComponent(slug)}`, {
      method: "DELETE",
      headers: headers(),
    }).then((r) => r.json()),

  runArchitectAnalyze: async (project: string): Promise<ProjectActionResponse> => {
    const response = await fetch(`${resolveApiBase()}/v1/architect/analyze`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ project }),
    });
    return parseResponse<ProjectActionResponse>(response);
  },

  runDrakonGenerate: async (project: string): Promise<ProjectActionResponse> => {
    const response = await fetch(`${resolveApiBase()}/v1/drakon/generate`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ project }),
    });
    return parseResponse<ProjectActionResponse>(response);
  },

  runDocsDocument: async (project: string, instructions = ""): Promise<ProjectActionResponse> => {
    const response = await fetch(`${resolveApiBase()}/v1/docs/document`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ project, instructions }),
    });
    return parseResponse<ProjectActionResponse>(response);
  },

  // Knowledge Zone API
  listKnowledgeZones: async (): Promise<ListKnowledgeZonesResponse> => {
    const response = await fetch(`/api/knowledge/zones`, {
      headers: headers(),
    });
    return parseResponse<ListKnowledgeZonesResponse>(response);
  },

  createKnowledgeZone: async (
    data: CreateKnowledgeZoneRequest,
  ): Promise<CreateKnowledgeZoneResponse> => {
    const response = await fetch(`/api/knowledge/zones`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(data),
    });
    return parseResponse<CreateKnowledgeZoneResponse>(response);
  },

  deleteKnowledgeZone: async (zoneId: string): Promise<DeleteKnowledgeZoneResponse> => {
    const response = await fetch(`/api/knowledge/zones/${zoneId}`, {
      method: "DELETE",
      headers: headers(),
    });
    return parseResponse<DeleteKnowledgeZoneResponse>(response);
  },

  checkZoneHealth: async (zoneId: string): Promise<"ready" | "pending" | "failed"> => {
    try {
      const response = await fetch(`/api/knowledge/zones/${zoneId}/health`, {
        headers: headers(),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const data: { status?: string } = await response.json().catch(() => ({}));
        const status = (data?.status ?? "").toLowerCase();
        if (status === "pending" || status === "warming") return "pending";
        return "ready";
      }
      if (response.status === 503 || response.status === 202) return "pending";
      return "failed";
    } catch {
      return "failed";
    }
  },

  notebooklmChat: async (data: {
    notebookId: string;
    question: string;
  }): Promise<{
    success: boolean;
    answer: string;
    citations?: any[];
    message?: string;
    error?: string;
  }> => {
    const response = await fetch(`/api/notebooklm/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseResponse(response);
  },

  listNotebooks: async (): Promise<{
    success: boolean;
    notebooks: Array<{ id: string; title: string }>;
    error?: string;
  }> => {
    const response = await fetch(`/api/notebooklm/notebooks`);
    return parseResponse(response);
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
      { headers: githubRequestHeaders(owner, token) },
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
      { headers: githubRequestHeaders(owner, token) },
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
      headers: githubRequestHeaders(owner, token),
      body: JSON.stringify({ owner, repo, path, content, message, branch }),
    });

    return response.json();
  },

  githubDeleteFile: async (
    owner: string,
    repo: string,
    path: string,
    branch = "main",
    token?: string,
  ): Promise<ApiResponse> => {
    const response = await fetch(`${resolveApiBase()}/v1/github/delete`, {
      method: "DELETE",
      headers: githubRequestHeaders(owner, token),
      body: JSON.stringify({ owner, repo, path, branch }),
    });

    return response.json();
  },

  githubListBranches: (owner: string, repo: string, token?: string):
  Promise<GithubBranchesResponse> =>
    fetch(
      `${resolveApiBase()}/v1/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
      { headers: githubRequestHeaders(owner, token) },
    ).then((r) => r.json()),
};
