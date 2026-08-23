// cloudflare-worker/__tests__/helpers/mock-env.ts
//
// Slice 3.1: minimal fake `env` for fetch()-level route-contract tests.
// Provides just enough bindings for the Worker's entry `fetch()` to run
// past its early checks without crashing on missing config, while
// leaving auth/route behavior exactly as shipped (nothing here changes
// or stubs verifyOwnerAuth itself -- these are the real function's
// real decisions, driven by real env values).

import { vi } from "vitest";

export const JWT_SECRET = "test-jwt-secret-do-not-use-in-prod";
export const MCP_API_KEY = "test-mcp-key-do-not-use-in-prod";

/** A fake Durable Object stub whose fetch() always returns the given response. */
function fakeDoStub(response: Response) {
  return { fetch: async () => response };
}

/** A fake DurableObjectNamespace binding: idFromName is identity, get() returns a fixed stub. */
export function fakeDoNamespace(response: Response, onIdFromName?: (name: string) => void) {
  return {
    idFromName: (name: string) => {
      onIdFromName?.(name);
      return name;
    },
    get: (_id: string) => fakeDoStub(response),
  };
}

export interface MockEnvOptions {
  ownerEmails?: string;
  mcpApiKey?: string;
  roomDoResponse?: Response;
  diagramSyncResponse?: Response;
  includeRoomDo?: boolean;
  includeDiagramSync?: boolean;
  onRoomDoIdFromName?: (name: string) => void;
  onDiagramSyncIdFromName?: (name: string) => void;
  d1Db?: unknown;
}

export function mockEnv(opts: MockEnvOptions = {}): Record<string, unknown> {
  const env: Record<string, unknown> = {
    JWT_SECRET,
    MINIO_ENDPOINT: "https://storage.test.invalid",
    MINIO_BUCKET: "test-bucket",
    MINIO_ACCESS_KEY: "test-access-key-do-not-use",
    MINIO_SECRET_KEY: "test-secret-key-do-not-use",
  };
  if (opts.mcpApiKey !== undefined) env.MCP_API_KEY = opts.mcpApiKey;
  if (opts.ownerEmails !== undefined) env.OWNER_EMAILS = opts.ownerEmails;
  if (opts.includeRoomDo !== false) {
    env.ROOM_DO = fakeDoNamespace(opts.roomDoResponse ?? new Response(null, { status: 426 }), opts.onRoomDoIdFromName);
  }
  if (opts.includeDiagramSync) {
    env.DIAGRAM_SYNC = fakeDoNamespace(opts.diagramSyncResponse ?? new Response(null, { status: 426 }), opts.onDiagramSyncIdFromName);
  }
  if (opts.d1Db !== undefined) {
    env.D1_DB = opts.d1Db;
  }
  return env;
}

export function mockAppwriteTenantSession(opts: {
  userId?: string;
  email?: string;
  teamId?: string;
  teamName?: string;
} = {}) {
  const userId = opts.userId ?? "test-user-id";
  const email = opts.email ?? "test-user@example.com";
  const teamId = opts.teamId ?? "team-personal-123";
  const teamName = opts.teamName ?? "Personal";

  globalThis.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    const urlStr = String(url);
    if (urlStr.includes("/v1/account")) {
      return Promise.resolve(new Response(JSON.stringify({ $id: userId, email }), { status: 200 }));
    }
    if (urlStr.includes("/v1/teams")) {
      if (init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ $id: teamId, name: teamName }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ teams: [{ $id: teamId, name: teamName }] }), { status: 200 }));
    }
    if (urlStr.includes("/v1/databases/")) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }
    return Promise.resolve(new Response(null, { status: 200 }));
  }) as unknown as typeof fetch;
}

export function noopCtx() {
  return { waitUntil: (_p: Promise<unknown>) => {} };
}
