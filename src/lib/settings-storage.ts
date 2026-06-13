import type { AppSettings } from "@/types/settings";

export const SETTINGS_STORAGE_KEY = "drakon.settings";

export const DEFAULT_SETTINGS: AppSettings = {
  github: {
    owner: "maxfraieho",
    repo: "drakon-setup-hub",
    branch: "main",
    token: "",
  },
  n8n: {
    baseUrl: "",
    apiKey: "",
    webhookUrl: "",
    enabled: false,
  },
  app: {
    workerUrl: "https://garden-mcp.aidrakon.tech",
    defaultFolder: "general",
    theme: "system",
  },
  minio: {
    endpoint: "",
    bucket: "",
    accessKey: "",
  },
  agents: {
    drakonUrl: "https://drakon-agent.exodus.pp.ua",
    architectUrl: "https://architect-agent.exodus.pp.ua",
    docsUrl: "https://docs-agent.exodus.pp.ua",
  },
  cliAgents: [
    { id: "cli1", url: "https://claude.exodus.pp.ua", label: "RPi 3B", apiKey: "" },
    { id: "cli2", url: "https://claude2.exodus.pp.ua", label: "OrangePi", apiKey: "" },
    { id: "cli3", url: "https://agy.aidrakon.tech", label: "AGY (Gemini)", apiKey: "" },
  ],
};

const LEGACY_GITHUB_STORAGE_KEY = "github.lastRepo";

// workers.dev у agentUrl ламає proxy-чат — CF блокує worker-to-worker fetch через workers.dev (error 1042); тунелі exodus.pp.ua мапляться на ті ж flue workers через cloudflared.
const STALE_AGENT_HOSTS = [
  "drakon-agent-flue.maxfraieho.workers.dev",
  "architect-agent-flue.maxfraieho.workers.dev",
  "docs-agent-flue.maxfraieho.workers.dev",
  "192.168.3.184",
];

function isStaleAgentUrl(url: string): boolean {
  if (!url) return false;
  return STALE_AGENT_HOSTS.some(host => url.includes(host));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const legacyRaw = localStorage.getItem(LEGACY_GITHUB_STORAGE_KEY);
    const legacyGithub = legacyRaw ? (JSON.parse(legacyRaw) as Partial<AppSettings["github"]>) : {};
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_SETTINGS,
        github: {
          ...DEFAULT_SETTINGS.github,
          owner: typeof legacyGithub.owner === "string" ? legacyGithub.owner : DEFAULT_SETTINGS.github.owner,
          repo: typeof legacyGithub.repo === "string" ? legacyGithub.repo : DEFAULT_SETTINGS.github.repo,
          branch: typeof legacyGithub.branch === "string" ? legacyGithub.branch : DEFAULT_SETTINGS.github.branch,
        },
      };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) {
      return DEFAULT_SETTINGS;
    }

    const github = isObject(parsed.github) ? parsed.github : {};
    const n8n = isObject(parsed.n8n) ? parsed.n8n : {};
    const app = isObject(parsed.app) ? parsed.app : {};
    const minio = isObject(parsed.minio) ? parsed.minio : {};
    const agents = isObject(parsed.agents) ? parsed.agents : {};

    const rawCli = parsed.cliAgents;
    let cliAgents: AppSettings["cliAgents"];
    if (Array.isArray(rawCli)) {
      cliAgents = rawCli
        .filter((a): a is Record<string, unknown> => isObject(a))
        .map((a, index) => ({
          id: typeof a.id === "string" && a.id.trim() ? a.id : `cli${index + 1}`,
          url: typeof a.url === "string" ? a.url.replace("agy.exodus.pp.ua", "agy.aidrakon.tech") : "",
          label: typeof a.label === "string" ? a.label : "",
          apiKey: typeof a.apiKey === "string" ? a.apiKey : "",
        }));
      if (cliAgents.length === 0) cliAgents = DEFAULT_SETTINGS.cliAgents;
    } else if (isObject(rawCli)) {
      const c1 = isObject((rawCli as Record<string, unknown>).cli1)
        ? (rawCli as Record<string, Record<string, unknown>>).cli1
        : {};
      const c2 = isObject((rawCli as Record<string, unknown>).cli2)
        ? (rawCli as Record<string, Record<string, unknown>>).cli2
        : {};
      cliAgents = [
        {
          id: "cli1",
          url: typeof c1.url === "string" && c1.url ? c1.url : DEFAULT_SETTINGS.cliAgents[0]?.url ?? "",
          label:
            typeof c1.label === "string" ? c1.label : DEFAULT_SETTINGS.cliAgents[0]?.label ?? "CLI 1",
          apiKey: typeof c1.apiKey === "string" ? c1.apiKey : "",
        },
        {
          id: "cli2",
          url: typeof c2.url === "string" && c2.url ? c2.url : DEFAULT_SETTINGS.cliAgents[1]?.url ?? "",
          label:
            typeof c2.label === "string" ? c2.label : DEFAULT_SETTINGS.cliAgents[1]?.label ?? "CLI 2",
          apiKey: typeof c2.apiKey === "string" ? c2.apiKey : "",
        },
      ];
      if (cliAgents.length === 0) cliAgents = DEFAULT_SETTINGS.cliAgents;
    } else {
      cliAgents = DEFAULT_SETTINGS.cliAgents;
    }

    return {
      github: {
        owner:
          typeof github.owner === "string"
            ? github.owner
            : typeof legacyGithub.owner === "string"
              ? legacyGithub.owner
              : DEFAULT_SETTINGS.github.owner,
        repo:
          typeof github.repo === "string"
            ? github.repo
            : typeof legacyGithub.repo === "string"
              ? legacyGithub.repo
              : DEFAULT_SETTINGS.github.repo,
        branch:
          typeof github.branch === "string"
            ? github.branch
            : typeof legacyGithub.branch === "string"
              ? legacyGithub.branch
              : DEFAULT_SETTINGS.github.branch,
        token: typeof github.token === "string" ? github.token : DEFAULT_SETTINGS.github.token,
      },
      n8n: {
        baseUrl: typeof n8n.baseUrl === "string" ? n8n.baseUrl : DEFAULT_SETTINGS.n8n.baseUrl,
        apiKey: typeof n8n.apiKey === "string" ? n8n.apiKey : DEFAULT_SETTINGS.n8n.apiKey,
        webhookUrl: typeof n8n.webhookUrl === "string" ? n8n.webhookUrl : DEFAULT_SETTINGS.n8n.webhookUrl,
        enabled: typeof n8n.enabled === "boolean" ? n8n.enabled : DEFAULT_SETTINGS.n8n.enabled,
      },
      app: {
        workerUrl:
          typeof app.workerUrl === "string" && app.workerUrl.trim() && !app.workerUrl.includes("drakon-mcp-worker") ? app.workerUrl : DEFAULT_SETTINGS.app.workerUrl,
        defaultFolder:
          typeof app.defaultFolder === "string" ? app.defaultFolder : DEFAULT_SETTINGS.app.defaultFolder,
        theme:
          app.theme === "light" || app.theme === "dark" || app.theme === "system"
            ? app.theme
            : DEFAULT_SETTINGS.app.theme,
      },
      minio: {
        endpoint: typeof minio.endpoint === "string" ? minio.endpoint : DEFAULT_SETTINGS.minio.endpoint,
        bucket: typeof minio.bucket === "string" ? minio.bucket : DEFAULT_SETTINGS.minio.bucket,
        accessKey: typeof minio.accessKey === "string" ? minio.accessKey : DEFAULT_SETTINGS.minio.accessKey,
      },
      agents: {
        drakonUrl:
          typeof agents.drakonUrl === "string" &&
          agents.drakonUrl.startsWith("https://") &&
          !isStaleAgentUrl(agents.drakonUrl)
            ? agents.drakonUrl
            : DEFAULT_SETTINGS.agents.drakonUrl,
        architectUrl:
          typeof agents.architectUrl === "string" &&
          agents.architectUrl.startsWith("https://") &&
          !isStaleAgentUrl(agents.architectUrl)
            ? agents.architectUrl
            : DEFAULT_SETTINGS.agents.architectUrl,
        docsUrl:
          typeof agents.docsUrl === "string" &&
          agents.docsUrl.startsWith("https://") &&
          !isStaleAgentUrl(agents.docsUrl)
            ? agents.docsUrl
            : DEFAULT_SETTINGS.agents.docsUrl,
      },
      cliAgents,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: AppSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  localStorage.removeItem(LEGACY_GITHUB_STORAGE_KEY);
}

export function updateSettings(updater: (settings: AppSettings) => AppSettings): AppSettings {
  const next = updater(readSettings());
  writeSettings(next);
  return next;
}

export function getGithubConfig(): AppSettings["github"] {
  return readSettings().github;
}

export function getN8nConfig(): AppSettings["n8n"] {
  return readSettings().n8n;
}

export function getMinioConfig(): AppSettings["minio"] {
  return readSettings().minio;
}

export function getAgentsConfig(): AppSettings["agents"] {
  return readSettings().agents;
}

export function getCliAgentsConfig(): AppSettings["cliAgents"] {
  return readSettings().cliAgents;
}

