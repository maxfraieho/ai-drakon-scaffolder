// cloudflare-worker/__tests__/route-contract.test.ts
//
// Slice 3.1 -- route-contract characterization harness (fetch()-level,
// not unit-level). Preserves current behavior EXACTLY, bugs included --
// this is the regression baseline Slice 3.2 diffs against, not a
// correctness suite. See docs/contracts/worker-route-auth-matrix.md and
// docs/reports/2026-08-23-openbot-verifier-final-synthesis.md for the
// investigation this characterizes.
//
// Deliberately narrow: covers the routes flagged as security-relevant
// across three independent audits this session, not all ~73 dispatch
// conditions. Extending coverage to every route is a follow-up, not
// blocked by this file's structure -- add a case, not a new harness.

import { beforeEach, describe, expect, it, vi } from "vitest";
import worker, { generateJWT } from "../worker-mcp-drakon.js";
import { JWT_SECRET, mockEnv, noopCtx } from "./helpers/mock-env.js";

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

  describe("POST /mcp -- D13: accepts role:'user', not just role:'owner'", () => {
    it("401s with no Authorization header", async () => {
      const res = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }), mockEnv(), noopCtx());
      expect(res.status).toBe(401);
    });

    it("does NOT 401 for a role:'owner' token", async () => {
      const token = await ownerToken();
      const res = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }, token), mockEnv(), noopCtx());
      expect(res.status).not.toBe(401);
    });

    it("CHARACTERIZED BUG: an Appwrite-authenticated non-owner user does NOT 401 either (D13)", async () => {
      mockNonOwnerAppwriteLookup();
      const env = mockEnv({ ownerEmails: "someone-else@example.com" });
      const res = await worker.fetch(req("/mcp", { method: "POST", body: "{}" }, APPWRITE_USER_TOKEN), env, noopCtx());
      expect(res.status).not.toBe(401);
    });
  });

  describe.each([
    ["/v1/notes/commit", "POST"],
    ["/v1/notes/delete", "DELETE"],
    ["/v1/notes/build-semantic-graph", "POST"],
  ])("%s -- corrected D14: authenticated, but NOT role-checked", (path, method) => {
    it("401s with no Authorization header", async () => {
      const res = await worker.fetch(req(path, { method, body: "{}" }), mockEnv(), noopCtx());
      expect(res.status).toBe(401);
    });

    it("CHARACTERIZED BUG: an Appwrite-authenticated non-owner user does NOT 401 either (any authenticated caller can commit/delete notes)", async () => {
      mockNonOwnerAppwriteLookup();
      const env = mockEnv({ ownerEmails: "someone-else@example.com" });
      const res = await worker.fetch(req(path, { method, body: "{}" }, APPWRITE_USER_TOKEN), env, noopCtx());
      expect(res.status).not.toBe(401);
    });
  });

  describe.each([
    ["/v1/github/tree", "GET"],
    ["/v1/pipeline/execute-deterministic", "POST"],
    ["/v1/compiler/n8n", "POST"],
  ])("%s -- owner-gated (R-3, confirmed below the L2849 explicit role==='owner' check)", (path, method) => {
    const init = (bearer?: string): RequestInit =>
      method === "GET" ? {} : { method, body: "{}" };

    it("401s with no Authorization header", async () => {
      const res = await worker.fetch(req(path, init()), mockEnv(), noopCtx());
      expect(res.status).toBe(401);
    });

    it("401s for an Appwrite-authenticated non-owner user (role:'user', truthy but not owner)", async () => {
      mockNonOwnerAppwriteLookup();
      const env = mockEnv({ ownerEmails: "someone-else@example.com" });
      const res = await worker.fetch(req(path, init(), APPWRITE_USER_TOKEN), env, noopCtx());
      expect(res.status).toBe(401);
    });

    it("does NOT 401 for a role:'owner' token", async () => {
      const token = await ownerToken();
      const res = await worker.fetch(req(path, init(), token), mockEnv(), noopCtx());
      expect(res.status).not.toBe(401);
    });
  });

  describe("N1 -- CRITICAL: /ws/room/* reaches RoomDO with ZERO auth check", () => {
    it("no Authorization header still reaches the Durable Object stub (not blocked at 401)", async () => {
      const env = mockEnv({ roomDoResponse: new Response(null, { status: 426 }) });
      const res = await worker.fetch(req("/ws/room/some-guessable-room-id"), env, noopCtx());
      // 426 = our fake DO stub's configured response, proving dispatch
      // reached RoomDO.fetch directly -- never touched an auth check.
      expect(res.status).toBe(426);
    });

    it("a garbage/invalid Authorization header does not block it either", async () => {
      const env = mockEnv({ roomDoResponse: new Response(null, { status: 426 }) });
      const res = await worker.fetch(req("/ws/room/some-guessable-room-id", {}, "garbage-not-a-real-token"), env, noopCtx());
      expect(res.status).toBe(426);
    });

    it("500s when ROOM_DO is unbound (today's accidental-only mitigation, not a real fix)", async () => {
      const env = mockEnv({ includeRoomDo: false });
      const res = await worker.fetch(req("/ws/room/some-id"), env, noopCtx());
      expect(res.status).toBe(500);
    });
  });

  describe("N1/N2 -- CRITICAL: /v1/diagram/*/sync reaches DiagramSyncDO with ZERO auth check", () => {
    it("500s when DIAGRAM_SYNC is unbound (live-matching default -- fails closed BY ACCIDENT)", async () => {
      const env = mockEnv({ includeDiagramSync: false });
      const res = await worker.fetch(req("/v1/diagram/some-diagram-id/sync", { method: "POST" }), env, noopCtx());
      expect(res.status).toBe(500);
    });

    it("N2: once DIAGRAM_SYNC IS bound, no Authorization header still reaches the stub unauthenticated", async () => {
      const env = mockEnv({ includeDiagramSync: true, diagramSyncResponse: new Response(null, { status: 426 }) });
      const res = await worker.fetch(req("/v1/diagram/some-diagram-id/sync", { method: "POST" }), env, noopCtx());
      // This is the exact trap the synthesis report flags: fixing the
      // deployment-config contradiction (binding DIAGRAM_SYNC) activates
      // this second unauthenticated surface unless Slice 3.6 ships with it.
      expect(res.status).toBe(426);
    });
  });
});
