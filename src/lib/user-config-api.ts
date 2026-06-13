import { resolveWorkerUrl } from "@/lib/worker-url";
import { getAccessToken } from "@/lib/auth";
import type { Project } from "@/context/ProjectContext";

export interface UserConfig {
  localProjects?: Project[];
  activeProjectSlug?: string | null;
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
  try {
    await fetch(configUrl(), {
      method: "PUT",
      headers: authHeader(),
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // silent — localStorage is the source of truth, MinIO is a backup
  }
}
