// cloudflare-worker/__tests__/route-contract.test.ts
//
// Slice 3.1 -- route-contract characterization harness (fetch()-level,
// not unit-level). Preserves current behavior EXACTLY, bugs included --
// this is the regression baseline Slice 3.2 diffs against, not a
// correctness suite. See docs/contracts/worker-route-auth-matrix.md and
// docs/reports/2026-08-23-openbot-verifier-final-synthesis.md for the
// investigation this characterizes.
//
// Slice 3.6 (same file, later commit): the /ws/room/* and
// /v1/diagram/*/sync sections below were updated in place to assert the
// FIXED behavior once the WebSocket/Durable-Object auth gap (N1/N2) was
// closed -- they are no longer "characterized bugs", they are the new
// regression baseline for that fix.
//
// Deliberately narrow: covers the routes flagged as security-relevant
// across three independent audits this session, not all ~73 dispatch
// conditions. Extending coverage to every route is a follow-up, not
// blocked by this file's structure -- add a case, not a new harness.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiagramRepository, HarnessSpecRepository, type D1Database } from "@ai-drakon/tenancy";
import { createDefaultSpec } from "@ai-drakon/harness-contract";
import worker, { generateJWT } from "../worker-mcp-drakon.js";
import { JWT_SECRET, MCP_API_KEY, mockAppwriteTenantSession, mockEnv, noopCtx } from "./helpers/mock-env.js";

async function ownerToken() {
  return generateJWT({ role: "owner", sub: "test-owner" }, JWT_SECRET);
}

// NOTE: a Worker-issued JWT with role:'user' correctly returns null from
// verifyOwnerAuth (confirmed by worker-auth.test.ts) -- that path is NOT
// the bug. The real bug (D13/D14) is the Appwrite-JWT path: any
// Appwrite-authenticated user whose email is not in OWNER_EMAILS still
// gets a truthy `{role:'user', sub, email}` back, which passes `if
// (!owner)` checks that only test for null. Simulate that path here by
// mocking the Appwrite account lookup, matching worker-auth.test.ts's own
// "demotes an Appwrite JWT" case exactly.
const APPWRITE_USER_TOKEN = "fake-appwrite-jwt-for-a-non-owner-user";
function mockNonOwnerAppwriteLookup() {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ $id: "test-user-id", email: "not-an-owner@example.com" }), { status: 200 })
  );
}

function req(path: string, init: RequestInit = {}, bearer?: string) {
  const headers = new Headers(init.headers);
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  return new Request(`https://example.com${path}`, { ...init, headers });
}

describe("Route-contract characterization (Slice 3.1)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Any downstream fetch() this test doesn't care about (Appwrite, docs-agent,
    // etc.) fails closed rather than hanging or hitting the network.
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 502 }));
  });

  it("GET /health requires no auth", async () => {
    const res = await worker.fetch(req("/health"), mockEnv(), noopCtx());
    expect(res.status).not.toBe(401);
  });

  describe("POST /mcp -- (Slice 3.2 & Slice 3.3): owner-gated via tenant or legacy owner", () => {
    it("401s with no Authorization header", async () => {
      const res = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }), mockEnv(), noopCtx());
      expect(res.status).toBe(401);
    });

    it("does NOT 401 for a role:'owner' token", async () => {
      const token = await ownerToken();
      const res = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }, token), mockEnv(), noopCtx());
      expect(res.status).not.toBe(401);
    });

    it("does NOT 401 for a valid static MCP_API_KEY", async () => {
      const env = mockEnv({ mcpApiKey: MCP_API_KEY });
      const res = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }, MCP_API_KEY), env, noopCtx());
      expect(res.status).not.toBe(401);
    });

    it("passes for an Appwrite-JWT user via resolveTenant()", async () => {
      mockAppwriteTenantSession();
      const res = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }, APPWRITE_USER_TOKEN), mockEnv(), noopCtx());
      expect(res.status).not.toBe(401);
    });

    it("401s for an Appwrite-JWT user when resolveTenant() fails", async () => {
      mockNonOwnerAppwriteLookup();
      const res = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }, APPWRITE_USER_TOKEN), mockEnv(), noopCtx());
      expect(res.status).toBe(401);
    });
  });

  describe.each([
    ["/v1/notes/commit", "POST"],
    ["/v1/notes/delete", "DELETE"],
    ["/v1/notes/build-semantic-graph", "POST"],
  ])("%s -- owner-gated (Slice 3.2 & 3.3)", (path, method) => {
    it("401s with no Authorization header", async () => {
      const res = await worker.fetch(req(path, { method, body: "{}" }), mockEnv(), noopCtx());
      expect(res.status).toBe(401);
    });

    it("does NOT 401 for a role:'owner' token", async () => {
      const token = await ownerToken();
      const res = await worker.fetch(req(path, { method, body: "{}" }, token), mockEnv(), noopCtx());
      expect(res.status).not.toBe(401);
    });

    it("does NOT 401 for a valid static MCP_API_KEY", async () => {
      const env = mockEnv({ mcpApiKey: MCP_API_KEY });
      const res = await worker.fetch(req(path, { method, body: "{}" }, MCP_API_KEY), env, noopCtx());
      expect(res.status).not.toBe(401);
    });

    it("passes for an Appwrite-JWT user via resolveTenant()", async () => {
      mockAppwriteTenantSession();
      const res = await worker.fetch(req(path, { method, body: "{}" }, APPWRITE_USER_TOKEN), mockEnv(), noopCtx());
      expect(res.status).not.toBe(401);
    });

    it("401s when resolveTenant() fails", async () => {
      mockNonOwnerAppwriteLookup();
      const res = await worker.fetch(req(path, { method, body: "{}" }, APPWRITE_USER_TOKEN), mockEnv(), noopCtx());
      expect(res.status).toBe(401);
    });
  });

  describe.each([
    ["/v1/github/tree", "GET"],
    ["/v1/pipeline/execute-deterministic", "POST"],
    ["/v1/compiler/n8n", "POST"],
  ])("%s -- owner-gated (R-3, confirmed below the L2849 explicit role==='owner' check)", (path, method) => {
    const init = (): RequestInit => (method === "GET" ? {} : { method, body: "{}" });

    it("401s with no Authorization header", async () => {
      const res = await worker.fetch(req(path, init()), mockEnv(), noopCtx());
      expect(res.status).toBe(401);
    });

    it("401s when resolveTenant() fails", async () => {
      mockNonOwnerAppwriteLookup();
      const res = await worker.fetch(req(path, init(), APPWRITE_USER_TOKEN), mockEnv(), noopCtx());
      expect(res.status).toBe(401);
    });

    it("passes for an Appwrite-JWT user via resolveTenant()", async () => {
      mockAppwriteTenantSession();
      const res = await worker.fetch(req(path, init(), APPWRITE_USER_TOKEN), mockEnv(), noopCtx());
      expect(res.status).not.toBe(401);
    });

    it("does NOT 401 for a role:'owner' token", async () => {
      const token = await ownerToken();
      const res = await worker.fetch(req(path, init(), token), mockEnv(), noopCtx());
      expect(res.status).not.toBe(401);
    });

    it("does NOT 401 for a valid static MCP_API_KEY", async () => {
      const env = mockEnv({ mcpApiKey: MCP_API_KEY });
      const res = await worker.fetch(req(path, init(), MCP_API_KEY), env, noopCtx());
      expect(res.status).not.toBe(401);
    });
  });

  describe("N1 -- FIXED (Slice 3.6): /ws/room/* now requires owner auth before reaching RoomDO", () => {
    it("401s with no Authorization header (previously reached the DO stub unauthenticated)", async () => {
      const env = mockEnv({ roomDoResponse: new Response(null, { status: 426 }) });
      const res = await worker.fetch(req("/ws/room/some-guessable-room-id"), env, noopCtx());
      expect(res.status).toBe(401);
    });

    it("401s for a garbage/invalid Authorization header", async () => {
      const env = mockEnv({ roomDoResponse: new Response(null, { status: 426 }) });
      const res = await worker.fetch(req("/ws/room/some-guessable-room-id", {}, "garbage-not-a-real-token"), env, noopCtx());
      expect(res.status).toBe(401);
    });

    it("401s when resolveTenant() fails", async () => {
      mockNonOwnerAppwriteLookup();
      const env = mockEnv({ roomDoResponse: new Response(null, { status: 426 }) });
      const res = await worker.fetch(req("/ws/room/some-guessable-room-id", {}, APPWRITE_USER_TOKEN), env, noopCtx());
      expect(res.status).toBe(401);
    });

    it("a role:'owner' token reaches the Durable Object stub", async () => {
      const token = await ownerToken();
      const env = mockEnv({ roomDoResponse: new Response(null, { status: 426 }) });
      const res = await worker.fetch(req("/ws/room/some-guessable-room-id", {}, token), env, noopCtx());
      // 426 = our fake DO stub's configured response, proving dispatch
      // reached RoomDO.fetch only after clearing the owner check.
      expect(res.status).toBe(426);
    });

    it("a valid static MCP_API_KEY reaches the Durable Object stub", async () => {
      const env = mockEnv({ mcpApiKey: MCP_API_KEY, roomDoResponse: new Response(null, { status: 426 }) });
      const res = await worker.fetch(req("/ws/room/some-guessable-room-id", {}, MCP_API_KEY), env, noopCtx());
      expect(res.status).toBe(426);
    });

    it("an Appwrite-JWT user with resolved tenant reaches the Durable Object stub", async () => {
      mockAppwriteTenantSession({ teamId: "team-room-xyz" });
      let capturedDoId = "";
      const env = mockEnv({
        roomDoResponse: new Response(null, { status: 426 }),
        onRoomDoIdFromName: (name) => {
          capturedDoId = name;
        },
      });
      const res = await worker.fetch(req("/ws/room/some-guessable-room-id", {}, APPWRITE_USER_TOKEN), env, noopCtx());
      expect(res.status).toBe(426);
      expect(capturedDoId).toBe("team-room-xyz:some-guessable-room-id");
    });

    it("401s when ROOM_DO is unbound and caller is unauthenticated (Slice 3.2: central gate now runs before the binding-existence check, so an unauthenticated caller can no longer even learn ROOM_DO is unbound)", async () => {
      const env = mockEnv({ includeRoomDo: false });
      const res = await worker.fetch(req("/ws/room/some-id"), env, noopCtx());
      expect(res.status).toBe(401);
    });

    it("500s when ROOM_DO is unbound but caller IS an authenticated owner (config error surfaces once auth passes)", async () => {
      const token = await ownerToken();
      const env = mockEnv({ includeRoomDo: false });
      const res = await worker.fetch(req("/ws/room/some-id", {}, token), env, noopCtx());
      expect(res.status).toBe(500);
    });
  });

  describe("N1/N2 -- FIXED (Slice 3.6): /v1/diagram/*/sync now requires owner auth before reaching DiagramSyncDO", () => {
    it("401s when DIAGRAM_SYNC is unbound and caller is unauthenticated (Slice 3.2: central gate now runs before the binding-existence check)", async () => {
      const env = mockEnv({ includeDiagramSync: false });
      const res = await worker.fetch(req("/v1/diagram/some-diagram-id/sync", { method: "POST" }), env, noopCtx());
      expect(res.status).toBe(401);
    });

    it("500s when DIAGRAM_SYNC is unbound but caller IS an authenticated owner (config error surfaces once auth passes)", async () => {
      const token = await ownerToken();
      const env = mockEnv({ includeDiagramSync: false });
      const res = await worker.fetch(req("/v1/diagram/some-diagram-id/sync", { method: "POST" }, token), env, noopCtx());
      expect(res.status).toBe(500);
    });

    it("N2 CLOSED: once DIAGRAM_SYNC is bound, an unauthenticated request now 401s instead of reaching the stub", async () => {
      const env = mockEnv({ includeDiagramSync: true, diagramSyncResponse: new Response(null, { status: 426 }) });
      const res = await worker.fetch(req("/v1/diagram/some-diagram-id/sync", { method: "POST" }), env, noopCtx());
      // Before Slice 3.6, this reached the stub directly (426). The
      // deployment-config fix (Slice 3.0c) can now safely bind
      // DIAGRAM_SYNC without reopening the second half of N1.
      expect(res.status).toBe(401);
    });

    it("a role:'owner' token reaches the Durable Object stub once DIAGRAM_SYNC is bound", async () => {
      const token = await ownerToken();
      const env = mockEnv({ includeDiagramSync: true, diagramSyncResponse: new Response(null, { status: 426 }) });
      const res = await worker.fetch(req("/v1/diagram/some-diagram-id/sync", { method: "POST" }, token), env, noopCtx());
      expect(res.status).toBe(426);
    });

    it("a valid static MCP_API_KEY reaches the Durable Object stub once DIAGRAM_SYNC is bound", async () => {
      const env = mockEnv({
        mcpApiKey: MCP_API_KEY,
        includeDiagramSync: true,
        diagramSyncResponse: new Response(null, { status: 426 }),
      });
      const res = await worker.fetch(req("/v1/diagram/some-diagram-id/sync", { method: "POST" }, MCP_API_KEY), env, noopCtx());
      expect(res.status).toBe(426);
    });
  });

  describe("Slice 3.4: Room and Diagram tenant isolation (tenant-prefixed DO keys + D1 ownership)", () => {
    function fakeD1Database(diagrams: Array<{ id: string; tenant_id: string; [k: string]: unknown }>) {
      return {
        prepare: vi.fn((_query: string) => ({
          bind: vi.fn((...args: unknown[]) => ({
            first: vi.fn(async () => {
              const [tenantId, id] = args as [string, string];
              return diagrams.find((d) => d.tenant_id === tenantId && d.id === id) ?? null;
            }),
          })),
        })),
      };
    }

    it("derives RoomDO identity from ${tenantId}:${roomId}", async () => {
      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      let capturedDoId = "";
      const env = mockEnv({
        onRoomDoIdFromName: (name) => {
          capturedDoId = name;
        },
      });

      const res = await worker.fetch(req("/ws/room/collab-room-1", {}, token), env, noopCtx());
      expect(res.status).toBe(426);
      expect(capturedDoId).toBe("tenant-alpha:collab-room-1");
    });

    it("isolates two tenants using the same roomId into distinct RoomDO instances", async () => {
      const tokenA = await generateJWT({ role: "owner", sub: "tenant-a" }, JWT_SECRET);
      const tokenB = await generateJWT({ role: "owner", sub: "tenant-b" }, JWT_SECRET);

      const capturedIds: string[] = [];
      const env = mockEnv({
        onRoomDoIdFromName: (name) => {
          capturedIds.push(name);
        },
      });

      await worker.fetch(req("/ws/room/shared-room-name", {}, tokenA), env, noopCtx());
      await worker.fetch(req("/ws/room/shared-room-name", {}, tokenB), env, noopCtx());

      expect(capturedIds).toEqual(["tenant-a:shared-room-name", "tenant-b:shared-room-name"]);
    });

    it("derives DiagramSyncDO identity from ${tenantId}:${diagramId} and allows sync when caller owns diagram in D1", async () => {
      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      let capturedDoId = "";
      const d1 = fakeD1Database([
        { id: "diag-100", tenant_id: "tenant-alpha", name: "Alpha Diagram" },
      ]);
      const env = mockEnv({
        includeDiagramSync: true,
        diagramSyncResponse: new Response(null, { status: 426 }),
        onDiagramSyncIdFromName: (name) => {
          capturedDoId = name;
        },
        d1Db: d1,
      });

      const res = await worker.fetch(req("/v1/diagram/diag-100/sync", { method: "POST" }, token), env, noopCtx());
      expect(res.status).toBe(426);
      expect(capturedDoId).toBe("tenant-alpha:diag-100");
    });

    it("rejects sync with 403 Forbidden when diagram belongs to a different tenant in D1", async () => {
      const token = await generateJWT({ role: "owner", sub: "tenant-beta" }, JWT_SECRET);
      let doCalled = false;
      const d1 = fakeD1Database([
        { id: "diag-100", tenant_id: "tenant-alpha", name: "Alpha Diagram" },
      ]);
      const env = mockEnv({
        includeDiagramSync: true,
        diagramSyncResponse: new Response(null, { status: 426 }),
        onDiagramSyncIdFromName: () => {
          doCalled = true;
        },
        d1Db: d1,
      });

      const res = await worker.fetch(req("/v1/diagram/diag-100/sync", { method: "POST" }, token), env, noopCtx());
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toMatchObject({ success: false, error: "Forbidden", errorCode: "FORBIDDEN" });
      expect(doCalled).toBe(false);
    });

    it("rejects sync with 403 Forbidden when diagram does not exist in D1", async () => {
      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      let doCalled = false;
      const d1 = fakeD1Database([]);
      const env = mockEnv({
        includeDiagramSync: true,
        diagramSyncResponse: new Response(null, { status: 426 }),
        onDiagramSyncIdFromName: () => {
          doCalled = true;
        },
        d1Db: d1,
      });

      const res = await worker.fetch(req("/v1/diagram/non-existent-diag/sync", { method: "POST" }, token), env, noopCtx());
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toMatchObject({ success: false, error: "Forbidden", errorCode: "FORBIDDEN" });
      expect(doCalled).toBe(false);
    });
  });

  describe("Slice 3.3: Diagram write path D1 synchronization", () => {
    function createMutableD1(
      initialRows: Array<{
        id: string;
        tenant_id: string;
        project_slug: string;
        name: string;
        ir_json: string;
        created_at: string;
        updated_at: string;
      }> = [],
      initialSpecs: Array<{
        id: string;
        tenant_id: string;
        agent_name: string;
        version: string;
        spec_json: string;
        created_at?: string;
        updated_at?: string;
      }> = []
    ) {
      const table = [...initialRows];
      const specTable = [...initialSpecs.map((s) => ({
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...s,
      }))];
      const db: D1Database = {
        prepare: vi.fn((query: string) => ({
          bind: vi.fn((...args: unknown[]) => ({
            first: vi.fn(async () => {
              if (query.includes("FROM diagrams") || (!query.includes("FROM harness_specs") && query.includes("WHERE tenant_id = ? AND id = ?"))) {
                const [tenantId, id] = args as [string, string];
                const row = table.find((r) => r.tenant_id === tenantId && r.id === id);
                return row ? { ...row } : null;
              }
              if (query.includes("FROM harness_specs")) {
                const [tenantId, id] = args as [string, string, string?];
                const row = specTable.find((r) => r.tenant_id === tenantId && (r.id === id || r.agent_name === id));
                return row ? { ...row } : null;
              }
              return null;
            }),
            all: vi.fn(async () => {
              if (query.includes("FROM diagrams") || (!query.includes("FROM harness_specs") && query.includes("WHERE tenant_id = ? AND project_slug = ?"))) {
                const [tenantId, projectSlug] = args as [string, string];
                const rows = table.filter((r) => r.tenant_id === tenantId && r.project_slug === projectSlug);
                return { results: rows.map((r) => ({ ...r })), success: true };
              }
              if (query.includes("FROM harness_specs")) {
                const [tenantId, agentName] = args as [string, string?];
                const rows = specTable.filter((r) => r.tenant_id === tenantId && (!agentName || r.agent_name === agentName));
                return { results: rows.map((r) => ({ ...r })), success: true };
              }
              return { results: [], success: true };
            }),
            run: vi.fn(async () => {
              if (query.includes("INSERT INTO diagrams")) {
                const [id, tenantId, project_slug, name, ir_json] = args as [string, string, string, string, string];
                table.push({
                  id,
                  tenant_id: tenantId,
                  project_slug,
                  name,
                  ir_json,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
                return { results: [], success: true };
              }
              if (query.includes("UPDATE diagrams SET ir_json = ?")) {
                const [ir_json, tenantId, id] = args as [string, string, string];
                const row = table.find((r) => r.tenant_id === tenantId && r.id === id);
                if (row) {
                  row.ir_json = ir_json;
                  row.updated_at = new Date().toISOString();
                }
                return { results: [], success: true };
              }
              if (query.includes("INSERT INTO harness_specs")) {
                const [id, tenantId, agent_name, version, spec_json] = args as [string, string, string, string, string];
                specTable.push({
                  id,
                  tenant_id: tenantId,
                  agent_name,
                  version,
                  spec_json,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
                return { results: [], success: true };
              }
              if (query.includes("UPDATE harness_specs SET spec_json = ?")) {
                const [spec_json, tenantId, id] = args as [string, string, string];
                const row = specTable.find((r) => r.tenant_id === tenantId && (r.id === id || r.agent_name === id));
                if (row) {
                  row.spec_json = spec_json;
                  row.updated_at = new Date().toISOString();
                }
                return { results: [], success: true };
              }
              return { results: [], success: true };
            }),
          })),
        })),
      };
      return { db, table, specTable };
    }

    it("POST /v1/drakon/commit writes diagram to D1, and DiagramRepository.get(id) finds it for the same tenant", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      const { db } = createMutableD1();
      const env = mockEnv({ d1Db: db });

      const commitBody = {
        folderSlug: "my-project",
        diagramId: "diag-42",
        diagram: {
          name: "Flow 42",
          items: {
            "1": { type: "action", content: "Init system" },
          },
        },
      };

      const res = await worker.fetch(
        req("/v1/drakon/commit", { method: "POST", body: JSON.stringify(commitBody) }, token),
        env,
        noopCtx()
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ success: true, folderSlug: "my-project", diagramId: "diag-42" });

      // Directly verify row via DiagramRepository.get(id) for saving tenant
      const repoAlpha = new DiagramRepository(db, "tenant-alpha");
      const saved = await repoAlpha.get("diag-42");
      expect(saved).not.toBeNull();
      expect(saved?.id).toBe("diag-42");
      expect(saved?.tenant_id).toBe("tenant-alpha");
      expect(saved?.project_slug).toBe("my-project");
      expect(saved?.name).toBe("Flow 42");
      expect(JSON.parse(saved!.ir_json).items["1"].content).toBe("Init system");

      // Tenant isolation: a different tenant CANNOT read the row
      const repoBeta = new DiagramRepository(db, "tenant-beta");
      const savedBeta = await repoBeta.get("diag-42");
      expect(savedBeta).toBeNull();
    });

    it("saved diagram passes the subsequent /v1/diagram/:diagramId/sync ownership check for owner and 403s for other tenants", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      const tokenAlpha = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      const tokenBeta = await generateJWT({ role: "owner", sub: "tenant-beta" }, JWT_SECRET);
      const { db } = createMutableD1();
      let syncDoId = "";
      const env = mockEnv({
        d1Db: db,
        includeDiagramSync: true,
        diagramSyncResponse: new Response(null, { status: 426 }),
        onDiagramSyncIdFromName: (name) => {
          syncDoId = name;
        },
      });

      // 1. Save diagram as tenant-alpha
      const commitRes = await worker.fetch(
        req(
          "/v1/drakon/commit",
          {
            method: "POST",
            body: JSON.stringify({
              folderSlug: "proj-1",
              diagramId: "diag-sync-test",
              diagram: { name: "Sync Flow", items: {} },
            }),
          },
          tokenAlpha
        ),
        env,
        noopCtx()
      );
      expect(commitRes.status).toBe(200);

      // 2. tenant-alpha attempts sync -> passes ownership check and reaches DO
      const syncResAlpha = await worker.fetch(
        req("/v1/diagram/diag-sync-test/sync", { method: "POST" }, tokenAlpha),
        env,
        noopCtx()
      );
      expect(syncResAlpha.status).toBe(426);
      expect(syncDoId).toBe("tenant-alpha:diag-sync-test");

      // 3. tenant-beta attempts sync on same diagram -> rejected with 403 Forbidden
      const syncResBeta = await worker.fetch(
        req("/v1/diagram/diag-sync-test/sync", { method: "POST" }, tokenBeta),
        env,
        noopCtx()
      );
      expect(syncResBeta.status).toBe(403);
      const jsonBeta = await syncResBeta.json();
      expect(jsonBeta).toMatchObject({ success: false, error: "Forbidden", errorCode: "FORBIDDEN" });
    });

    it("updating an existing diagram with POST /v1/drakon/commit updates the D1 row", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      const { db } = createMutableD1();
      const env = mockEnv({ d1Db: db });

      // First save (create)
      await worker.fetch(
        req(
          "/v1/drakon/commit",
          {
            method: "POST",
            body: JSON.stringify({
              folderSlug: "proj-1",
              diagramId: "diag-update-test",
              diagram: { name: "V1", items: { "1": { type: "action", content: "Original" } } },
            }),
          },
          token
        ),
        env,
        noopCtx()
      );

      const repo = new DiagramRepository(db, "tenant-alpha");
      const v1 = await repo.get("diag-update-test");
      expect(JSON.parse(v1!.ir_json).items["1"].content).toBe("Original");

      // Second save (update)
      await worker.fetch(
        req(
          "/v1/drakon/commit",
          {
            method: "POST",
            body: JSON.stringify({
              folderSlug: "proj-1",
              diagramId: "diag-update-test",
              diagram: { name: "V1", items: { "1": { type: "action", content: "Modified" } } },
            }),
          },
          token
        ),
        env,
        noopCtx()
      );

      const v2 = await repo.get("diag-update-test");
      expect(JSON.parse(v2!.ir_json).items["1"].content).toBe("Modified");
    });

    it("resolves Appwrite tenant context when saving a diagram", async () => {
      const mockFetch = vi.fn((url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("/v1/account")) {
          return Promise.resolve(new Response(JSON.stringify({ $id: "user-123", email: "user@example.com" }), { status: 200 }));
        }
        if (urlStr.includes("/v1/teams")) {
          return Promise.resolve(
            new Response(JSON.stringify({ teams: [{ $id: "team-personal-123", name: "Personal" }] }), { status: 200 })
          );
        }
        // MinIO PUT
        return Promise.resolve(new Response(null, { status: 200 }));
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const { db } = createMutableD1();
      const env = mockEnv({ d1Db: db });

      const res = await worker.fetch(
        req(
          "/v1/drakon/commit",
          {
            method: "POST",
            body: JSON.stringify({
              folderSlug: "appwrite-proj",
              diagramId: "appwrite-diag",
              diagram: { name: "Appwrite Flow", items: {} },
            }),
          },
          APPWRITE_USER_TOKEN
        ),
        env,
        noopCtx()
      );
      expect(res.status).toBe(200);

      // The diagram is saved under team-personal-123 (the resolved tenant)
      const repoTeam = new DiagramRepository(db, "team-personal-123");
      const saved = await repoTeam.get("appwrite-diag");
      expect(saved).not.toBeNull();
      expect(saved?.tenant_id).toBe("team-personal-123");
    });

    it("MCP tool drakon.savediagram writes diagram to D1", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      const token = await generateJWT({ role: "owner", sub: "tenant-mcp" }, JWT_SECRET);
      const { db } = createMutableD1();
      const env = mockEnv({ d1Db: db });

      const mcpPayload = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "drakon.savediagram",
          arguments: {
            folderSlug: "mcp-project",
            diagramId: "mcp-diag-1",
            diagram: {
              name: "MCP Diagram",
              items: { "1": { type: "action", content: "From MCP" } },
            },
          },
        },
      };

      const res = await worker.fetch(
        req("/mcp", { method: "POST", body: JSON.stringify(mcpPayload) }, token),
        env,
        noopCtx()
      );
      expect(res.status).toBe(200);

      const repo = new DiagramRepository(db, "tenant-mcp");
      const saved = await repo.get("mcp-diag-1");
      expect(saved).not.toBeNull();
      expect(saved?.tenant_id).toBe("tenant-mcp");
      expect(saved?.project_slug).toBe("mcp-project");
      expect(saved?.name).toBe("MCP Diagram");
    });

    it("MCP tool drakon.mutatediagram updates diagram in D1", async () => {
      const existingDiagram = {
        id: "mut-diag-1",
        name: "Mutated Diagram",
        folderId: "mut-folder",
        version: 1,
        diagram: {
          name: "Mutated Diagram",
          access: "read",
          params: "",
          items: {
            "1": { type: "action", content: "Original node", one: "2" },
            "2": { type: "end", content: "Done" },
          },
        },
      };

      const mockFetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
        if (init?.method === "PUT") {
          return Promise.resolve(new Response(null, { status: 200 }));
        }
        // GET from MinIO
        return Promise.resolve(new Response(JSON.stringify(existingDiagram), { status: 200 }));
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const token = await generateJWT({ role: "owner", sub: "tenant-mut" }, JWT_SECRET);
      const { db } = createMutableD1([
        {
          id: "mut-diag-1",
          tenant_id: "tenant-mut",
          project_slug: "mut-folder",
          name: "Mutated Diagram",
          ir_json: JSON.stringify(existingDiagram.diagram),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      const env = mockEnv({ d1Db: db });

      const mcpPayload = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "drakon.mutatediagram",
          arguments: {
            folderId: "mut-folder",
            diagramId: "mut-diag-1",
            mutations: [
              {
                op: "updateNode",
                nodeId: "1",
                fields: { content: "Updated node via mutation" },
              },
            ],
          },
        },
      };

      const res = await worker.fetch(
        req("/mcp", { method: "POST", body: JSON.stringify(mcpPayload) }, token),
        env,
        noopCtx()
      );
      expect(res.status).toBe(200);

      const repo = new DiagramRepository(db, "tenant-mut");
      const updated = await repo.get("mut-diag-1");
      expect(updated).not.toBeNull();
      expect(updated?.ir_json).toContain("Updated node via mutation");
    });

    it("POST /v1/drakon/commit succeeds when D1_DB is not bound (defensive fallback)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      const env = mockEnv(); // no d1Db

      const res = await worker.fetch(
        req(
          "/v1/drakon/commit",
          {
            method: "POST",
            body: JSON.stringify({
              folderSlug: "no-d1-proj",
              diagramId: "no-d1-diag",
              diagram: { name: "No D1", items: {} },
            }),
          },
          token
        ),
        env,
        noopCtx()
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ success: true, folderSlug: "no-d1-proj", diagramId: "no-d1-diag" });
    });
  });

  describe("Slice 3.3 Step 7: Tenancy migration & OWNER_EMAILS retirement (ADR-0025)", () => {
    it("Appwrite-JWT-only user passes owner-level routes via resolveTenant()", async () => {
      mockAppwriteTenantSession({ userId: "appwrite-u1", teamId: "team-alpha" });
      const env = mockEnv();

      const mcpRes = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }, APPWRITE_USER_TOKEN), env, noopCtx());
      expect(mcpRes.status).not.toBe(401);

      const notesRes = await worker.fetch(
        req("/v1/notes/commit", { method: "POST", body: JSON.stringify({ slug: "test-note", title: "Note" }) }, APPWRITE_USER_TOKEN),
        env,
        noopCtx()
      );
      expect(notesRes.status).not.toBe(401);

      const semRes = await worker.fetch(
        req("/v1/notes/build-semantic-graph", { method: "POST", body: "{}" }, APPWRITE_USER_TOKEN),
        env,
        noopCtx()
      );
      expect(semRes.status).not.toBe(401);

      const semStatusRes = await worker.fetch(
        req("/v1/notes/semantic-graph-status?execution_id=exec-1", {}, APPWRITE_USER_TOKEN),
        env,
        noopCtx()
      );
      expect(semStatusRes.status).not.toBe(401);

      const codegenStatusRes = await worker.fetch(
        req("/v1/codegen-status?execution_id=exec-2", {}, APPWRITE_USER_TOKEN),
        env,
        noopCtx()
      );
      expect(codegenStatusRes.status).not.toBe(401);

      const compileStatusRes = await worker.fetch(
        req("/v1/compile-status?execution_id=exec-3", {}, APPWRITE_USER_TOKEN),
        env,
        noopCtx()
      );
      expect(compileStatusRes.status).not.toBe(401);
    });

    it("MCP_API_KEY path still works unchanged across owner routes", async () => {
      const env = mockEnv({ mcpApiKey: MCP_API_KEY });

      const mcpRes = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }, MCP_API_KEY), env, noopCtx());
      expect(mcpRes.status).not.toBe(401);

      const notesRes = await worker.fetch(
        req("/v1/notes/commit", { method: "POST", body: JSON.stringify({ slug: "test-note", title: "Note" }) }, MCP_API_KEY),
        env,
        noopCtx()
      );
      expect(notesRes.status).not.toBe(401);
    });

    it("Worker-JWT owner path still works unchanged across owner routes", async () => {
      const token = await ownerToken();
      const env = mockEnv();

      const mcpRes = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }, token), env, noopCtx());
      expect(mcpRes.status).not.toBe(401);

      const notesRes = await worker.fetch(
        req("/v1/notes/commit", { method: "POST", body: JSON.stringify({ slug: "test-note", title: "Note" }) }, token),
        env,
        noopCtx()
      );
      expect(notesRes.status).not.toBe(401);
    });

    it("unauthenticated request 401s on owner routes", async () => {
      const env = mockEnv();

      const mcpRes = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }), env, noopCtx());
      expect(mcpRes.status).toBe(401);

      const notesRes = await worker.fetch(
        req("/v1/notes/commit", { method: "POST", body: JSON.stringify({ slug: "test-note", title: "Note" }) }),
        env,
        noopCtx()
      );
      expect(notesRes.status).toBe(401);
    });
  });

  describe("Slice 3.4a: POST /v1/pipeline/execute-deterministic -- spec resolution & validation", () => {
    function createSpecD1(initialSpecs: Array<{
      id: string;
      tenant_id: string;
      agent_name: string;
      version: string;
      spec_json: string;
    }> = []) {
      const specTable = [...initialSpecs.map(s => ({
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...s,
      }))];
      const db: D1Database = {
        prepare: vi.fn((query: string) => ({
          bind: vi.fn((...args: unknown[]) => ({
            first: vi.fn(async () => {
              if (query.includes("FROM harness_specs")) {
                const [tenantId, id] = args as [string, string, string?];
                const row = specTable.find((r) => r.tenant_id === tenantId && (r.id === id || r.agent_name === id));
                return row ? { ...row } : null;
              }
              return null;
            }),
            all: vi.fn(async () => {
              if (query.includes("FROM harness_specs")) {
                const [tenantId, agentName] = args as [string, string?];
                const rows = specTable.filter((r) => r.tenant_id === tenantId && (!agentName || r.agent_name === agentName));
                return { results: rows.map((r) => ({ ...r })), success: true };
              }
              return { results: [], success: true };
            }),
            run: vi.fn(async () => {
              if (query.includes("INSERT INTO harness_specs")) {
                const [id, tenantId, agentName, version, specJson] = args as [string, string, string, string, string];
                specTable.push({
                  id,
                  tenant_id: tenantId,
                  agent_name: agentName,
                  version,
                  spec_json: specJson,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              } else if (query.includes("UPDATE harness_specs")) {
                const [specJson, tenantId, id] = args as [string, string, string];
                const row = specTable.find((r) => r.tenant_id === tenantId && r.id === id);
                if (row) {
                  row.spec_json = specJson;
                  row.updated_at = new Date().toISOString();
                }
              }
              return { results: [], success: true };
            }),
          })),
        })),
      };
      return { db, specTable };
    }

    it("resolve-by-specId happy path (server resolves from D1 and validates correctly)", async () => {
      const architectSpec = createDefaultSpec("architect");
      const { db } = createSpecD1([
        {
          id: "spec-architect",
          tenant_id: "tenant-alpha",
          agent_name: "architect",
          version: "1.0.0",
          spec_json: JSON.stringify(architectSpec),
        },
      ]);
      const env = mockEnv({
        d1Db: db,
      });
      (env as any).APPWRITE_API_KEY = "test-key";
      (env as any).APPWRITE_PROJECT_ID = "test-project";
      (env as any).DETERMINISTIC_ENGINE_FUNCTION_ID = "func-123";

      let forwardedPayload: any = null;
      globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes("/v1/functions/func-123/executions")) {
          const body = JSON.parse(init?.body as string);
          forwardedPayload = JSON.parse(body.body);
          return new Response(JSON.stringify({ $id: "exec-123", status: "accepted" }), { status: 200 });
        }
        return new Response(null, { status: 502 });
      });

      const testIr = { schema_version: "1.0.0", items: [{ id: "node-1", type: "action", text: "Start" }] };
      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      const res = await worker.fetch(
        req(
          "/v1/pipeline/execute-deterministic",
          {
            method: "POST",
            body: JSON.stringify({
              drakon_ir: testIr,
              specId: "spec-architect",
              breakpoints: ["node-1"],
            }),
          },
          token
        ),
        env,
        noopCtx()
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ execution_id: "exec-123", status: "accepted" });
      expect(forwardedPayload).not.toBeNull();
      expect(forwardedPayload.drakon_ir).toEqual(testIr);
      expect(forwardedPayload.harness_spec).toMatchObject({
        agent_name: "architect",
        version: "1.0.0",
      });
      expect(forwardedPayload.breakpoints).toEqual(["node-1"]);
    });

    it("missing specId in D1 self-heals via createDefaultSpec, persists to D1, and succeeds with 200", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { db, specTable } = createSpecD1([]); // D1 is completely empty
      const env = mockEnv({ d1Db: db });
      (env as any).APPWRITE_API_KEY = "test-key";
      (env as any).APPWRITE_PROJECT_ID = "test-project";
      (env as any).DETERMINISTIC_ENGINE_FUNCTION_ID = "func-123";

      let forwardedPayload: any = null;
      globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes("/v1/functions/func-123/executions")) {
          const body = JSON.parse(init?.body as string);
          forwardedPayload = JSON.parse(body.body);
          return new Response(JSON.stringify({ $id: "exec-selfheal-1", status: "accepted" }), { status: 200 });
        }
        return new Response(null, { status: 502 });
      });

      const expectedSpec = createDefaultSpec("nonexistent-spec");
      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      const res = await worker.fetch(
        req(
          "/v1/pipeline/execute-deterministic",
          {
            method: "POST",
            body: JSON.stringify({
              specId: "nonexistent-spec",
            }),
          },
          token
        ),
        env,
        noopCtx()
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ execution_id: "exec-selfheal-1", status: "accepted" });

      // Check forwarded spec matches createDefaultSpec output
      expect(forwardedPayload).not.toBeNull();
      expect(forwardedPayload.harness_spec).toEqual(expectedSpec);

      // Check warning was logged
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[HarnessSpec] No spec found for specId=nonexistent-spec tenant=tenant-alpha, self-healing with createDefaultSpec()")
      );

      // Check row was persisted in mock D1
      const persisted = specTable.find((r) => r.tenant_id === "tenant-alpha" && r.id === "nonexistent-spec");
      expect(persisted).toBeDefined();
      expect(persisted!.agent_name).toBe("nonexistent-spec");
      expect(persisted!.version).toBe(expectedSpec.version);
      expect(JSON.parse(persisted!.spec_json)).toEqual(expectedSpec);

      warnSpy.mockRestore();
    });

    it("subsequent request for same specId resolves directly from D1 without calling createDefaultSpec again", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { db, specTable } = createSpecD1([]); // D1 initially empty
      const env = mockEnv({ d1Db: db });
      (env as any).APPWRITE_API_KEY = "test-key";
      (env as any).APPWRITE_PROJECT_ID = "test-project";
      (env as any).DETERMINISTIC_ENGINE_FUNCTION_ID = "func-123";

      let forwardedPayloads: any[] = [];
      globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes("/v1/functions/func-123/executions")) {
          const body = JSON.parse(init?.body as string);
          forwardedPayloads.push(JSON.parse(body.body));
          return new Response(JSON.stringify({ $id: `exec-${forwardedPayloads.length}`, status: "accepted" }), { status: 200 });
        }
        return new Response(null, { status: 502 });
      });

      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);

      // Request 1: triggers self-healing
      const res1 = await worker.fetch(
        req(
          "/v1/pipeline/execute-deterministic",
          {
            method: "POST",
            body: JSON.stringify({
              specId: "auto-spec",
            }),
          },
          token
        ),
        env,
        noopCtx()
      );
      expect(res1.status).toBe(200);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(specTable.length).toBe(1);

      // Mutate the persisted row in D1 to prove request 2 loads from D1, not freshly generated
      const persisted = specTable.find((r) => r.tenant_id === "tenant-alpha" && r.id === "auto-spec")!;
      const mutatedSpec = JSON.parse(persisted.spec_json);
      mutatedSpec.description = "Updated persisted spec in D1";
      persisted.spec_json = JSON.stringify(mutatedSpec);

      warnSpy.mockClear();

      // Request 2: resolves from D1 directly
      const res2 = await worker.fetch(
        req(
          "/v1/pipeline/execute-deterministic",
          {
            method: "POST",
            body: JSON.stringify({
              specId: "auto-spec",
            }),
          },
          token
        ),
        env,
        noopCtx()
      );
      expect(res2.status).toBe(200);
      // Warning was NOT logged on the second request because it resolved from D1
      expect(warnSpy).not.toHaveBeenCalled();
      // No new row created in D1
      expect(specTable.length).toBe(1);
      // Payload has the updated description from D1
      expect(forwardedPayloads[1].harness_spec.description).toBe("Updated persisted spec in D1");

      warnSpy.mockRestore();
    });

    it("dual-accept deprecation warning fires when legacy harness_spec body is sent", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const architectSpec = createDefaultSpec("architect");
      const { db } = createSpecD1([
        {
          id: "spec-architect",
          tenant_id: "tenant-alpha",
          agent_name: "architect",
          version: "1.0.0",
          spec_json: JSON.stringify(architectSpec),
        },
      ]);
      const env = mockEnv({ d1Db: db });
      (env as any).APPWRITE_API_KEY = "test-key";
      (env as any).APPWRITE_PROJECT_ID = "test-project";
      (env as any).DETERMINISTIC_ENGINE_FUNCTION_ID = "func-123";

      globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("/v1/functions/func-123/executions")) {
          return new Response(JSON.stringify({ $id: "exec-legacy-1", status: "accepted" }), { status: 200 });
        }
        return new Response(null, { status: 502 });
      });

      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      const res = await worker.fetch(
        req(
          "/v1/pipeline/execute-deterministic",
          {
            method: "POST",
            body: JSON.stringify({
              harness_spec: architectSpec,
            }),
          },
          token
        ),
        env,
        noopCtx()
      );

      expect(res.status).toBe(200);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[DEPRECATION] Client-supplied harness_spec is deprecated")
      );
      warnSpy.mockRestore();
    });

    it("forged/altered gates value in a legacy-format request body has NO effect once resolution is server-side (defect D20 closed)", async () => {
      const authoritativeSpec = createDefaultSpec("architect");
      authoritativeSpec.gates.confidence.min_score = 0.95; // Authoritative strict gate in D1
      authoritativeSpec.gates.safety.blocked_patterns = ["rm\\s+-rf", "DROP\\s+TABLE"];

      const { db } = createSpecD1([
        {
          id: "spec-architect",
          tenant_id: "tenant-alpha",
          agent_name: "architect",
          version: "1.0.0",
          spec_json: JSON.stringify(authoritativeSpec),
        },
      ]);
      const env = mockEnv({ d1Db: db });
      (env as any).APPWRITE_API_KEY = "test-key";
      (env as any).APPWRITE_PROJECT_ID = "test-project";
      (env as any).DETERMINISTIC_ENGINE_FUNCTION_ID = "func-123";

      let forwardedPayload: any = null;
      globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes("/v1/functions/func-123/executions")) {
          const body = JSON.parse(init?.body as string);
          forwardedPayload = JSON.parse(body.body);
          return new Response(JSON.stringify({ $id: "exec-d20", status: "accepted" }), { status: 200 });
        }
        return new Response(null, { status: 502 });
      });

      // Attacker tries to bypass gates by sending forged gates with min_score: 0.01 and empty safety patterns
      const forgedSpec = createDefaultSpec("architect");
      forgedSpec.gates.confidence.min_score = 0.01;
      forgedSpec.gates.safety.blocked_patterns = [];

      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      const res = await worker.fetch(
        req(
          "/v1/pipeline/execute-deterministic",
          {
            method: "POST",
            body: JSON.stringify({
              harness_spec: forgedSpec,
            }),
          },
          token
        ),
        env,
        noopCtx()
      );

      expect(res.status).toBe(200);
      expect(forwardedPayload).not.toBeNull();
      // Proves authoritative D1 spec was used and forged gates were ignored!
      expect(forwardedPayload.harness_spec.gates.confidence.min_score).toBe(0.95);
      expect(forwardedPayload.harness_spec.gates.safety.blocked_patterns).toContain("rm\\s+-rf");
    });

    it("two-tenant test: tenant A cannot resolve tenant B's specId (ADR-0025 decision #4)", async () => {
      const betaSpec = createDefaultSpec("architect");
      betaSpec.gates.confidence.min_score = 0.99; // Tenant B custom gate
      const { db, specTable } = createSpecD1([
        {
          id: "secret-spec-beta",
          tenant_id: "tenant-beta", // Belongs ONLY to tenant-beta
          agent_name: "architect",
          version: "1.0.0",
          spec_json: JSON.stringify(betaSpec),
        },
      ]);
      const env = mockEnv({ d1Db: db });
      (env as any).APPWRITE_API_KEY = "test-key";
      (env as any).APPWRITE_PROJECT_ID = "test-project";
      (env as any).DETERMINISTIC_ENGINE_FUNCTION_ID = "func-123";

      let forwardedPayload: any = null;
      globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes("/v1/functions/func-123/executions")) {
          const body = JSON.parse(init?.body as string);
          forwardedPayload = JSON.parse(body.body);
          return new Response(JSON.stringify({ $id: "exec-123", status: "accepted" }), { status: 200 });
        }
        return new Response(null, { status: 502 });
      });

      // Tenant A tries to execute using Tenant B's specId:
      // Tenant A cannot read Tenant B's spec; Tenant A's D1 lookup returns null and self-heals
      // a fresh default spec for tenant-alpha instead of leaking tenant-beta's custom spec.
      const tokenAlpha = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      const res = await worker.fetch(
        req(
          "/v1/pipeline/execute-deterministic",
          {
            method: "POST",
            body: JSON.stringify({
              specId: "secret-spec-beta",
            }),
          },
          tokenAlpha
        ),
        env,
        noopCtx()
      );

      expect(res.status).toBe(200);
      expect(forwardedPayload).not.toBeNull();
      // Verifies Tenant A received the default spec (min_score 0.7), NOT Tenant B's custom spec (0.99)
      expect(forwardedPayload.harness_spec.gates.confidence.min_score).toBe(0.7);
      expect(forwardedPayload.harness_spec.agent_name).toBe("secret-spec-beta");

      // Verifies Tenant B's row in D1 is preserved unmodified
      const tenantBRow = specTable.find((r) => r.tenant_id === "tenant-beta" && r.id === "secret-spec-beta");
      expect(tenantBRow).toBeDefined();
      expect(JSON.parse(tenantBRow!.spec_json).gates.confidence.min_score).toBe(0.99);

      // Verifies Tenant A now has its own self-healed row
      const tenantARow = specTable.find((r) => r.tenant_id === "tenant-alpha" && r.id === "secret-spec-beta");
      expect(tenantARow).toBeDefined();
      expect(tenantARow!.agent_name).toBe("secret-spec-beta");
    });

    it("invalid harness spec fails validation and returns 400", async () => {
      const { db } = createSpecD1([
        {
          id: "invalid-spec",
          tenant_id: "tenant-alpha",
          agent_name: "invalid",
          version: "1.0.0",
          spec_json: JSON.stringify({ invalid_shape: true }), // Missing required fields
        },
      ]);
      const env = mockEnv({ d1Db: db });
      (env as any).APPWRITE_API_KEY = "test-key";
      (env as any).APPWRITE_PROJECT_ID = "test-project";
      (env as any).DETERMINISTIC_ENGINE_FUNCTION_ID = "func-123";

      const token = await generateJWT({ role: "owner", sub: "tenant-alpha" }, JWT_SECRET);
      const res = await worker.fetch(
        req(
          "/v1/pipeline/execute-deterministic",
          {
            method: "POST",
            body: JSON.stringify({
              specId: "invalid-spec",
            }),
          },
          token
        ),
        env,
        noopCtx()
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toMatchObject({ success: false, error: "Invalid harness spec: failed validation" });
    });
  });
});
