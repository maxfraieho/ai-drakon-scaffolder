// packages/storage/src/__tests__/storage.test.ts
//
// Contract tests for both BlobStore adapters. MemoryBlobStoreAdapter is
// tested against real behavior (no mocks needed). S3BlobStoreAdapter is
// tested against a mocked fetch, verifying request shape (method, URL,
// SigV4 Authorization header presence) and the new list() pagination loop
// that fixes the pre-existing 1000-key truncation in the Worker's
// original listMinioKeys.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryBlobStoreAdapter } from "../memory-adapter.js";
import { S3BlobStoreAdapter } from "../s3-adapter.js";
import type { BlobStore } from "../types.js";

describe("MemoryBlobStoreAdapter", () => {
  let store: BlobStore;

  beforeEach(() => {
    store = new MemoryBlobStoreAdapter();
  });

  it("returns null for a missing key", async () => {
    expect(await store.get("nope")).toBeNull();
  });

  it("round-trips a put then get", async () => {
    await store.put("diagrams/default/d1.json", '{"foo":"bar"}');
    expect(await store.get("diagrams/default/d1.json")).toBe('{"foo":"bar"}');
  });

  it("accepts Uint8Array input and returns it as text", async () => {
    const bytes = new TextEncoder().encode('{"binary":true}');
    await store.put("k", bytes);
    expect(await store.get("k")).toBe('{"binary":true}');
  });

  it("put overwrites an existing key", async () => {
    await store.put("k", "first");
    await store.put("k", "second");
    expect(await store.get("k")).toBe("second");
  });

  it("delete removes a key", async () => {
    await store.put("k", "v");
    await store.delete("k");
    expect(await store.get("k")).toBeNull();
  });

  it("delete is idempotent on a missing key (does not throw)", async () => {
    await expect(store.delete("never-existed")).resolves.toBeUndefined();
  });

  it("list returns only keys matching the prefix, sorted", async () => {
    await store.put("users/a/config.json", "1");
    await store.put("users/b/config.json", "2");
    await store.put("diagrams/x/d1.json", "3");
    const keys = await store.list("users/");
    expect(keys).toEqual(["users/a/config.json", "users/b/config.json"]);
  });

  it("list on an empty prefix with no matches returns an empty array", async () => {
    expect(await store.list("nothing/")).toEqual([]);
  });
});

describe("S3BlobStoreAdapter", () => {
  const config = {
    endpoint: "https://s3.example.com",
    bucket: "test-bucket",
    accessKeyId: "AKIAEXAMPLE",
    secretAccessKey: "secret-example",
  };

  let store: S3BlobStoreAdapter;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = new S3BlobStoreAdapter(config);
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it("get() issues a signed GET to the correct object URL", async () => {
    fetchMock.mockResolvedValue(new Response("hello", { status: 200 }));
    const result = await store.get("users/u1/config.json");

    expect(result).toBe("hello");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://s3.example.com/test-bucket/users/u1/config.json");
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE\//);
  });

  it("get() returns null on 404", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    expect(await store.get("missing")).toBeNull();
  });

  it("get() throws on a non-404 error status", async () => {
    fetchMock.mockResolvedValue(new Response("server error", { status: 500 }));
    await expect(store.get("k")).rejects.toThrow(/S3 GET failed: 500/);
  });

  it("put() issues a signed PUT with the payload as the body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await store.put("diagrams/default/d1.json", '{"x":1}', "application/json");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://s3.example.com/test-bucket/diagrams/default/d1.json");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe('{"x":1}');
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("delete() issues a signed DELETE and treats 404 as success", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(store.delete("k")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });

  it("list() parses <Key> entries from a single-page ListObjectsV2 response", async () => {
    const xml = `<?xml version="1.0"?><ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>a/1.json</Key></Contents><Contents><Key>a/2.json</Key></Contents></ListBucketResult>`;
    fetchMock.mockResolvedValue(new Response(xml, { status: 200 }));
    expect(await store.list("a/")).toEqual(["a/1.json", "a/2.json"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("list() paginates across multiple pages using NextContinuationToken (fixes the 1000-key truncation bug)", async () => {
    const page1 = `<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>tok-2</NextContinuationToken><Contents><Key>a/1.json</Key></Contents></ListBucketResult>`;
    const page2 = `<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>a/2.json</Key></Contents></ListBucketResult>`;
    fetchMock.mockResolvedValueOnce(new Response(page1, { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(page2, { status: 200 }));

    const keys = await store.list("a/");

    expect(keys).toEqual(["a/1.json", "a/2.json"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallUrl = fetchMock.mock.calls[1][0] as string;
    expect(secondCallUrl).toContain("continuation-token=tok-2");
  });

  it("list() throws on a non-ok response", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    await expect(store.list("a/")).rejects.toThrow(/S3 LIST failed: 500/);
  });
});
