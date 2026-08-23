// Unit tests for verifyOwnerAuth (cloudflare-worker/worker-mcp-drakon.js),
// Phase 3 Worker security-fix bundle.
//
// Scope deliberately narrow per this slice's own reconciliation decision:
// zero test coverage existed for Worker auth before this change, and the
// Worker is a 4,800+ line monolith with no route-dispatch export surface —
// a full Miniflare integration suite covering every route is a follow-up
// slice, not this one. This file covers only the highest-risk logic that
// changed: verifyOwnerAuth's three credential branches, including the new
// allowlist behavior and its explicit fail-safe-visible fallback.
//
// `verifyOwnerAuth` and `generateJWT` are imported directly from the
// deployed worker file (via minimal `export` additions to their
// declarations, same pattern already used for `validateIrDeterministic`
// in worker-ir-validator.test.ts) so these tests exercise the exact code
// that ships, not a copy.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateJWT, verifyOwnerAuth } from "../worker-mcp-drakon.js";

const JWT_SECRET = "test-jwt-secret-do-not-use-in-prod";

function requestWithBearer(token) {
  return new Request("https://example.com/mcp", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("verifyOwnerAuth", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns null when no Authorization header is present", async () => {
    const env = { JWT_SECRET };
    const result = await verifyOwnerAuth(requestWithBearer(undefined), env);
    expect(result).toBeNull();
  });

  it("returns null when the Authorization header isn't a Bearer token", async () => {
    const env = { JWT_SECRET };
    const request = new Request("https://example.com/mcp", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    const result = await verifyOwnerAuth(request, env);
    expect(result).toBeNull();
  });

  it("grants owner for a valid static MCP_API_KEY", async () => {
    const env = { JWT_SECRET, MCP_API_KEY: "the-shared-mcp-key" };
    const result = await verifyOwnerAuth(requestWithBearer("the-shared-mcp-key"), env);
    expect(result).toEqual({ role: "owner", sub: "mcp-agent" });
  });

  it("does not fall through to owner for a wrong MCP_API_KEY (with no other credential match)", async () => {
    const env = { JWT_SECRET, MCP_API_KEY: "the-shared-mcp-key" };
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    const result = await verifyOwnerAuth(requestWithBearer("wrong-key"), env);
    expect(result).toBeNull();
  });

  it("grants owner for a valid Worker-issued JWT with role:'owner'", async () => {
    const env = { JWT_SECRET };
    const token = await generateJWT({ role: "owner", sub: "the-owner" }, JWT_SECRET);
    const result = await verifyOwnerAuth(requestWithBearer(token), env);
    expect(result).toMatchObject({ role: "owner", sub: "the-owner" });
  });

  it("does not grant owner for a Worker-issued JWT without role:'owner'", async () => {
    const env = { JWT_SECRET };
    const token = await generateJWT({ role: "user", sub: "someone" }, JWT_SECRET);
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    const result = await verifyOwnerAuth(requestWithBearer(token), env);
    expect(result).toBeNull();
  });

  it("returns { role: 'user', sub, email } for a valid Appwrite JWT (OWNER_EMAILS/owner-label retired per ADR-0025)", async () => {
    const env = { JWT_SECRET };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ $id: "user-123", email: "user@example.com" }), { status: 200 })
    );
    const result = await verifyOwnerAuth(requestWithBearer("some-appwrite-jwt"), env);
    expect(result).toEqual({ role: "user", sub: "user-123", email: "user@example.com" });
  });

  it("does not grant role:'owner' even if user has 'owner' label or OWNER_EMAILS is provided (both retired)", async () => {
    const env = { JWT_SECRET, OWNER_EMAILS: "labelled@example.com" };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ $id: "user-789", email: "labelled@example.com", labels: ["owner"] }), { status: 200 })
    );
    const result = await verifyOwnerAuth(requestWithBearer("some-appwrite-jwt"), env);
    expect(result).toEqual({ role: "user", sub: "user-789", email: "labelled@example.com" });
  });

  it("does not emit warning or grant role:'owner' when OWNER_EMAILS is unset", async () => {
    const env = { JWT_SECRET };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ $id: "user-999", email: "anyone@example.com" }), { status: 200 })
    );
    const result = await verifyOwnerAuth(requestWithBearer("some-appwrite-jwt"), env);
    expect(result).toEqual({ role: "user", sub: "user-999", email: "anyone@example.com" });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns null when the Appwrite account lookup fails (invalid/expired token)", async () => {
    const env = { JWT_SECRET };
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    const result = await verifyOwnerAuth(requestWithBearer("garbage-token"), env);
    expect(result).toBeNull();
  });
});
