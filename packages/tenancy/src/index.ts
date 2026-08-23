/**
 * @ai-drakon/tenancy — resolveTenant(), the ADR-0025 replacement for
 * verifyOwnerAuth()'s instance-wide `role: 'owner'` concept.
 *
 * ADR-0025 §Decision-2: "verifyOwnerAuth is replaced by
 * resolveTenant(request) -> { tenantId, userId, roles } at all 12 call
 * sites. There is no global owner."
 *
 * This intentionally does NOT reuse the static-MCP_API_KEY-as-owner
 * branch or the OWNER_EMAILS/owner-label branch from the current
 * verifyOwnerAuth() in cloudflare-worker/worker-mcp-drakon.js -- both are
 * explicitly retired by ADR-0025 §Decision-5 (MCP_API_KEY) and the
 * broader "no global owner" mandate. Only the Appwrite-JWT verification
 * step is mirrored (same REST call shape, same header names), since that
 * part is orthogonal to the owner/tenant question -- it just proves "this
 * is a real, currently-valid Appwrite session," which resolveTenant still
 * needs before it can look up that session's team.
 */

import { resolveOrCreateTeam, type AppwriteConfig } from './appwrite-teams';

export interface TenantContext {
  tenantId: string; // Appwrite teamId
  userId: string; // Appwrite account $id
  roles: ('owner' | 'member')[];
}

interface AppwriteAccount {
  $id: string;
  email: string;
}

/**
 * Mirrors verifyAppwriteJwt() in cloudflare-worker/worker-mcp-drakon.js
 * (lines ~417-433) exactly -- same endpoint, same headers, same success
 * shape. Duplicated rather than imported because that file is plain JS
 * with no module boundary this TS package can import through; if/when
 * the Worker is wired to call into this package directly, this should
 * collapse back into one shared implementation instead of two copies.
 */
async function verifyAppwriteSession(config: AppwriteConfig, jwt: string): Promise<AppwriteAccount | null> {
  try {
    const resp = await fetch(`${config.endpoint}/v1/account`, {
      headers: {
        'X-Appwrite-Project': config.projectId,
        'X-Appwrite-JWT': jwt,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const user = (await resp.json()) as AppwriteAccount;
    return user && user.$id ? user : null;
  } catch {
    return null;
  }
}

export async function resolveTenant(request: Request, appwriteConfig: AppwriteConfig): Promise<TenantContext | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const jwt = authHeader.slice(7);

  const account = await verifyAppwriteSession(appwriteConfig, jwt);
  if (!account) return null;

  const team = await resolveOrCreateTeam(appwriteConfig, jwt, account.$id);

  return {
    tenantId: team.$id,
    userId: account.$id,
    // A freshly auto-provisioned personal team has exactly one member,
    // its creator, as owner -- resolveOrCreateTeam doesn't return
    // membership role detail today, so a personal-tenant caller is
    // always 'owner' of their own tenant. Real multi-member role
    // resolution (a caller who is a 'member', not 'owner', of a shared
    // team) needs a membership lookup this package doesn't do yet --
    // out of scope for the initial tenant-of-one rollout.
    roles: ['owner'],
  };
}

export {
  BillingProfileRepository,
  KnowledgeZoneRepository,
  AgentConfigRepository,
  DiagramRepository,
  PipelineRunRepository,
  HarnessSpecRepository,
} from './repositories';
export type {
  D1Database,
  D1PreparedStatement,
  D1Result,
  BillingProfile,
  KnowledgeZone,
  AgentConfig,
  Diagram,
  PipelineRun,
  HarnessSpecRow,
} from './repositories';
export type { AppwriteConfig, AppwriteTeam } from './appwrite-teams';
export { resolveOrCreateTeam, listTeams, createPersonalTeam } from './appwrite-teams';
