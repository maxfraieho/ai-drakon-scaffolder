import type { AppSettings } from "@/types/settings";

export const SETTINGS_STORAGE_KEY = "drakon.settings";

export const DEFAULT_SETTINGS: AppSettings = {
  github: {
    owner: "maxfraieho",
    repo: "ai-drakon-setup",
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
    workerUrl: "https://drakon-mcp-worker.maxfraieho.workers.dev",
    defaultFolder: "general",
    theme: "system",
  },
  minio: {
    endpoint: "",
    bucket: "",
    accessKey: "",
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) {
      return DEFAULT_SETTINGS;
    }

    const github = isObject(parsed.github) ? parsed.github : {};
    const n8n = isObject(parsed.n8n) ? parsed.n8n : {};
    const app = isObject(parsed.app) ? parsed.app : {};

    return {
      github: {
        owner: typeof github.owner === "string" ? github.owner : DEFAULT_SETTINGS.github.owner,
        repo: typeof github.repo === "string" ? github.repo : DEFAULT_SETTINGS.github.repo,
        branch: typeof github.branch === "string" ? github.branch : DEFAULT_SETTINGS.github.branch,
        token: typeof github.token === "string" ? github.token : DEFAULT_SETTINGS.github.token,
      },
      n8n: {
        baseUrl: typeof n8n.baseUrl === "string" ? n8n.baseUrl : DEFAULT_SETTINGS.n8n.baseUrl,
        apiKey: typeof n8n.apiKey === "string" ? n8n.apiKey : DEFAULT_SETTINGS.n8n.apiKey,
        webhookUrl:
          typeof n8n.webhookUrl === "string"
            ? n8n.webhookUrl
            : DEFAULT_SETTINGS.n8n.webhookUrl,
        enabled: typeof n8n.enabled === "boolean" ? n8n.enabled : DEFAULT_SETTINGS.n8n.enabled,
      },
      app: {
        workerUrl:
          typeof app.workerUrl === "string" && app.workerUrl.trim()
            ? app.workerUrl
            : DEFAULT_SETTINGS.app.workerUrl,
        defaultFolder:
          typeof app.defaultFolder === "string"
            ? app.defaultFolder
            : DEFAULT_SETTINGS.app.defaultFolder,
        theme:
          app.theme === "light" || app.theme === "dark" || app.theme === "system"
            ? app.theme
            : DEFAULT_SETTINGS.app.theme,
      },
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
