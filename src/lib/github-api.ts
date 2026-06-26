import { resolveWorkerUrl } from "./worker-url";
import { getAccessToken } from "./auth";

function headers(token?: string) {
  const t = token || getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

export interface CreateRepoResponse {
  success: boolean;
  repoUrl: string;
  fullName: string;
  cloneUrl: string;
}

/**
 * Initiates the GitHub OAuth flow by redirecting to the authorize endpoint.
 */
export function authorizeGithub(appwriteJwt: string, popup: boolean = false): void {
  const baseUrl = resolveWorkerUrl();
  const authUrl = `${baseUrl}/v1/github/oauth/authorize?token=${encodeURIComponent(appwriteJwt)}&popup=${popup}`;
  window.location.href = authUrl;
}

/**
 * Creates a new GitHub repository on behalf of the user.
 */
export async function createGithubRepo(repoName: string, isPrivate: boolean = true): Promise<CreateRepoResponse> {
  const baseUrl = resolveWorkerUrl();
  const response = await fetch(`${baseUrl}/v1/github/create-repo`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: repoName,
      private: isPrivate,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub repo creation failed: ${errorText}`);
  }

  return response.json() as Promise<CreateRepoResponse>;
}
