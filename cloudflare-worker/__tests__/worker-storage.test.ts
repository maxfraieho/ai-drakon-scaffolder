// cloudflare-worker/__tests__/worker-storage.test.ts
//
// Slice S2: wire the Worker's MinIO helper functions to
// @ai-drakon/storage's S3BlobStoreAdapter. These tests prove the WIRING
// (Worker function -> adapter -> HTTP request/response semantics), not
// the adapter in isolation (already covered by
// packages/storage/src/__tests__/storage.test.ts's 16 tests). Same
// direct-import-from-the-deployed-file pattern as worker-auth.test.ts,
// same "mock globalThis.fetch" pattern as storage.test.ts's
// S3BlobStoreAdapter suite.
//
// Credentials used here are synthetic and visibly fake -- never the
// real (compromised) MinIO credential.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteFromMinIO,
  getBlobStore,
  getFromMinIO,
  listMinioKeys,
  uploadToMinIO,
} from "../worker-mcp-drakon.js";

const FAKE_ENV = {
  MINIO_ENDPOINT: "https://storage.test.invalid",
  MINIO_BUCKET: "test-bucket",
  MINIO_ACCESS_KEY: "test-access-key-do-not-use",
  MINIO_SECRET_KEY: "test-secret-key-do-not-use",
};

describe("Worker storage wiring (Slice S2)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getFromMinIO returns text for an existing object", async () => {
    fetchMock.mockResolvedValue(new Response("hello", { status: 200 }));
    expect(await getFromMinIO(FAKE_ENV, "users/u1/config.json")).toBe("hello");
  });

  it("getFromMinIO returns null for a missing object (same as before wiring)", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    expect(await getFromMinIO(FAKE_ENV, "missing")).toBeNull();
  });

  it("uploadToMinIO PUTs with the default content-type and returns true", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const result = await uploadToMinIO(FAKE_ENV, "diagrams/d1.json", '{"x":1}');

    expect(result).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PUT");
    expect(init.headers["Content-Type"]).toBe("application/json; charset=utf-8");
    expect(init.body).toBe('{"x":1}');
  });

  it("uploadToMinIO coerces non-string content the same way the old implementation did (String(content))", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await uploadToMinIO(FAKE_ENV, "k", 12345, "text/plain");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe("12345");
  });

  it("deleteFromMinIO returns true for an existing object", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    expect(await deleteFromMinIO(FAKE_ENV, "k")).toBe(true);
  });

  it("deleteFromMinIO returns true (not throw) for an already-missing object", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    expect(await deleteFromMinIO(FAKE_ENV, "gone")).toBe(true);
  });

  it("listMinioKeys returns an empty array for an empty prefix", async () => {
    const xml = `<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>`;
    fetchMock.mockResolvedValue(new Response(xml, { status: 200 }));
    expect(await listMinioKeys(FAKE_ENV, "nothing/")).toEqual([]);
  });

  it("listMinioKeys returns matching keys for a normal prefix", async () => {
    const xml = `<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>a/1.json</Key></Contents><Contents><Key>a/2.json</Key></Contents></ListBucketResult>`;
    fetchMock.mockResolvedValue(new Response(xml, { status: 200 }));
    expect(await listMinioKeys(FAKE_ENV, "a/")).toEqual(["a/1.json", "a/2.json"]);
  });

  it("listMinioKeys no longer silently truncates past 1000 keys (fixes the pre-S2 bug via pagination)", async () => {
    const page1 = `<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>tok-2</NextContinuationToken><Contents><Key>a/1.json</Key></Contents></ListBucketResult>`;
    const page2 = `<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>a/2.json</Key></Contents></ListBucketResult>`;
    fetchMock.mockResolvedValueOnce(new Response(page1, { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(page2, { status: 200 }));

    expect(await listMinioKeys(FAKE_ENV, "a/")).toEqual(["a/1.json", "a/2.json"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a failed GET propagates as an Error with the pre-S2 'MinIO GET failed: ...' wording (not the adapter's 'S3 GET failed')", async () => {
    fetchMock.mockResolvedValue(new Response("server error", { status: 500 }));
    await expect(getFromMinIO(FAKE_ENV, "k")).rejects.toThrow(/^MinIO GET failed: 500/);
  });

  it("a failed PUT propagates as 'MinIO PUT failed: ...'", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    await expect(uploadToMinIO(FAKE_ENV, "k", "v")).rejects.toThrow(/^MinIO PUT failed: 500/);
  });

  it("a failed LIST propagates as 'MinIO LIST failed: ...'", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    await expect(listMinioKeys(FAKE_ENV, "a/")).rejects.toThrow(/^MinIO LIST failed: 500/);
  });

  it("missing configuration fails loudly -- an empty env throws before any request is sent, no fallback secret is ever used", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await expect(getBlobStore({}).get("k")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
