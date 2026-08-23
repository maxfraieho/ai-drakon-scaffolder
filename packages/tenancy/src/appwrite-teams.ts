/**
 * @ai-drakon/tenancy — Appwrite Teams resolution + auto-provisioning.
 *
 * Owner decision (2026-08-23, superseding an earlier "tenant of one /
 * tenantId = userId" draft that was flagged and correctly rejected):
 * tenant_id IS the Appwrite teamId, per ADR-0025 §Decision-1, verbatim.
 * "Tenant of one" means a real Appwrite Team with exactly one member, not
 * a synthetic tenant identity that bypasses Appwrite Teams entirely --
 * the latter would leave `Role.team(teamId)` document-security
 * (infrastructure/appwrite/schema.ts) permanently dead, since it would
 * never correspond to a real Team.
 *
 * All calls go through the same raw REST pattern already used by
 * verifyAppwriteJwt() in cloudflare-worker/worker-mcp-drakon.js (lines
 * ~417-433) rather than the node-appwrite SDK -- Workers runtime has no
 * Node APIs, and the existing code already established this convention.
 * Endpoint/project ID are passed in, not hardcoded, so this package has
 * no Worker-specific global state.
 */

export interface AppwriteConfig {
  endpoint: string; // e.g. "https://auth.aidrakon.tech"
  projectId: string; // e.g. "6a23420a003a04b4997b"
}

export interface AppwriteTeam {
  $id: string;
  name: string;
}

export interface AppwriteTeamMembership {
  teamId: string;
  roles: string[]; // Appwrite's own team roles, typically ["owner"] or ["member"]
}

async function appwriteFetch(
  config: AppwriteConfig,
  jwt: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${config.endpoint}${path}`, {
    ...init,
    headers: {
      'X-Appwrite-Project': config.projectId,
      'X-Appwrite-JWT': jwt,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(5000),
  });
}

/** GET /v1/teams -- teams the JWT's owning session is a member of. */
export async function listTeams(config: AppwriteConfig, jwt: string): Promise<AppwriteTeam[]> {
  const resp = await appwriteFetch(config, jwt, '/v1/teams');
  if (!resp.ok) return [];
  const body = (await resp.json()) as { teams?: AppwriteTeam[] };
  return body.teams || [];
}

/**
 * POST /v1/teams -- Appwrite grants team creation to any authenticated
 * session, auto-assigning the creator as owner. No admin API key needed.
 */
export async function createPersonalTeam(
  config: AppwriteConfig,
  jwt: string,
  userId: string
): Promise<AppwriteTeam | null> {
  const resp = await appwriteFetch(config, jwt, '/v1/teams', {
    method: 'POST',
    body: JSON.stringify({
      teamId: 'unique()',
      name: `personal-${userId}`,
    }),
  });
  if (!resp.ok) return null;
  return (await resp.json()) as AppwriteTeam;
}

/**
 * PATCH the caller's user_profiles document, setting teamId.
 *
 * ASSUMPTION FLAGGED, NOT VERIFIED: this assumes the user_profiles
 * document ID equals the Appwrite account $id (userId) -- a common
 * Appwrite convention (one profile doc per user, keyed by their own
 * account ID) but not confirmed against the live Appwrite console for
 * this project. If profile documents use a different ID scheme (a
 * separate generated $id with userId as just a field), this call will
 * 404 and needs to become a query-then-update instead. Verify before
 * this code is wired into anything live.
 */
export async function persistTeamIdOnProfile(
  config: AppwriteConfig,
  jwt: string,
  userId: string,
  teamId: string
): Promise<boolean> {
  const resp = await appwriteFetch(
    config,
    jwt,
    `/v1/databases/ai-drakon/collections/user_profiles/documents/${userId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ data: { teamId } }),
    }
  );
  return resp.ok;
}

/**
 * Resolve the caller's tenant (personal Appwrite Team), auto-provisioning
 * one on first use. Handles the race where two concurrent first-requests
 * both see zero teams and both attempt to create one: on a 409-shaped
 * failure (or any create failure), re-list teams once before giving up --
 * whichever request's create actually landed becomes visible to the
 * loser's retry. This is a best-effort retry appropriate at "a few known
 * accounts, not a registration flood" scale (per owner decision), not a
 * distributed-lock-grade guarantee.
 */
export async function resolveOrCreateTeam(
  config: AppwriteConfig,
  jwt: string,
  userId: string
): Promise<AppwriteTeam> {
  const existing = await listTeams(config, jwt);
  if (existing.length > 0) return existing[0];

  const created = await createPersonalTeam(config, jwt, userId);
  if (created) {
    await persistTeamIdOnProfile(config, jwt, userId, created.$id);
    return created;
  }

  // Create failed -- likely a concurrent first-request already created one.
  // Re-list once; if still empty, this is a real failure, not a race.
  const retry = await listTeams(config, jwt);
  if (retry.length > 0) return retry[0];

  throw new Error(`resolveOrCreateTeam: no team found and create failed for user ${userId}`);
}
