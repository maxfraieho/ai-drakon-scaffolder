import { resolveWorkerUrl } from "@/lib/worker-url";
import { getAccessToken } from "@/lib/auth";
import type { Project } from "@/context/ProjectContext";
import type { AppSettings } from "@/types/settings";
import { readSettings } from "@/lib/settings-storage";

export const SYNC_LOCAL_STORAGE_KEYS = [
  "drakon_agent_base_url",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "default_model",
  "enable_auto_retry",
  "debug_mode",
  "docs_repo_path",
  "docs_repo_name",
  "drakon_llm_protocol", "drakon_llm_base_url", "drakon_llm_api_key", "drakon_llm_model", "drakon_llm_max_tokens",
  "architect_llm_protocol", "architect_llm_base_url", "architect_llm_api_key", "architect_llm_model", "architect_llm_max_tokens",
  "docs_llm_protocol", "docs_llm_base_url", "docs_llm_api_key", "docs_llm_model", "docs_llm_max_tokens",
  "agent_llm_protocol", "agent_llm_base_url", "agent_llm_api_key", "agent_llm_model", "agent_llm_max_tokens",
  "notebooklm_id",
  "daviaSettings"
];

export function readExtraSettings(): Record<string, string> {
  const res: Record<string, string> = {};
  if (typeof window === "undefined") return res;
  SYNC_LOCAL_STORAGE_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) {
      res[key] = val;
    }
  });
  return res;
}

export function writeExtraSettings(extraSettings: Record<string, string>): void {
  if (typeof window === "undefined") return;
  Object.entries(extraSettings).forEach(([key, val]) => {
    if (val !== null && val !== undefined) {
      localStorage.setItem(key, val);
    }
  });
}

export interface UserConfig {
  localProjects?: Project[];
  activeProjectSlug?: string | null;
  settings?: AppSettings;
  extraSettings?: Record<string, string>;
}

function authHeader(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function configUrl(): string {
  return `${resolveWorkerUrl().replace(/\/+$/, "")}/v1/user/config`;
}

export async function loadUserConfig(): Promise<UserConfig | null> {
  if (typeof window === "undefined" || !getAccessToken()) return null;
  try {
    const res = await fetch(configUrl(), { headers: authHeader(), signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json() as { success: boolean; config: UserConfig | null };
    return data.success ? data.config : null;
  } catch {
    return null;
  }
}

export async function saveUserConfig(config: UserConfig): Promise<void> {
  if (typeof window === "undefined" || !getAccessToken()) return;
  const configWithExtras = {
    ...config,
    extraSettings: config.extraSettings || readExtraSettings()
  };
  try {
    await fetch(configUrl(), {
      method: "PUT",
      headers: authHeader(),
      body: JSON.stringify(configWithExtras),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // silent — localStorage is the source of truth, MinIO is a backup
  }
}

export async function syncUserConfigToCloud(): Promise<void> {
  if (typeof window === "undefined" || !getAccessToken()) return;
  try {
    const token = getAccessToken();
    let userId = "anon";
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payload && typeof payload.sub === "string") {
            userId = payload.sub;
          }
        }
      } catch {}
    }

    const localProjectsRaw = localStorage.getItem(`ai_drakon_local_projects_${userId}`);
    const localProjects = localProjectsRaw ? JSON.parse(localProjectsRaw) : [];
    const activeProjectSlug = localStorage.getItem(`ai_drakon_active_project_${userId}`) || null;

    const config: UserConfig = {
      localProjects: localProjects.filter((x: any) => !x.exists || x.github),
      activeProjectSlug,
      settings: readSettings(),
      extraSettings: readExtraSettings()
    };

    await saveUserConfig(config);
  } catch (err) {
    console.error("Failed to sync user config:", err);
  }
}
