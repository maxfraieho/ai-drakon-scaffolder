// packages/storage/src/s3-adapter.ts
//
// S3-compatible (SigV4) BlobStore adapter -- MinIO, Backblaze B2, R2's S3
// API, or AWS S3 itself. Ported verbatim from
// cloudflare-worker/worker-mcp-drakon.js's hand-rolled SigV4 signer
// (signS3Request, s3UriEncode, encodeS3KeyForPath, uploadToMinIO,
// getFromMinIO, deleteFromMinIO, listMinioKeys, plus the sha256Hex/
// hmacSha256* helpers they depend on) -- same request shapes, same
// header set, same region hardcode ('us-east-1', which MinIO and most
// self-hosted S3-compatible servers ignore but still require a value
// for), same 404-as-null/true semantics. The Worker's own copies of
// these functions are removed once the Worker is wired to this package
// (a later slice) -- this file is not yet imported by the Worker.
//
// One behavior change, not a regression: list() now paginates on
// NextContinuationToken internally, so it returns every matching key
// instead of silently truncating at 1000 (the ListObjectsV2 page size
// cap) the way the original listMinioKeys did. Callers still get a
// flat Promise<string[]>, no cursor to manage.

import type { BlobStore, S3Config } from "./types.js";

async function hmacSha256Raw(key: string | Uint8Array, message: string): Promise<Uint8Array> {
  const keyBuffer = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const msgBuffer = new TextEncoder().encode(message);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, msgBuffer));
}

async function hmacSha256Hex(key: string | Uint8Array, message: string): Promise<string> {
  const sig = await hmacSha256Raw(key, message);
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function s3UriEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function encodeS3KeyForPath(key: string): string {
  return String(key || "")
    .split("/")
    .map((seg) => s3UriEncode(seg))
    .join("/");
}

export class S3BlobStoreAdapter implements BlobStore {
  constructor(private config: S3Config) {}

  private async sign(
    method: string,
    canonicalUri: string,
    queryString: string,
    payloadHash: string,
    extraCanonicalHeaders: Record<string, string> = {}
  ): Promise<Record<string, string>> {
    const endpoint = this.config.endpoint.replace(/\/+$/, "");
    const host = new URL(endpoint).host;
    const date = new Date().toISOString().replace(/[-:]/g, "").substring(0, 15) + "Z";
    const dateStamp = date.substring(0, 8);
    const region = this.config.region || "us-east-1";

    const headerPairs: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": date,
      ...extraCanonicalHeaders,
    };

    const canonicalHeaderKeys = Object.keys(headerPairs)
      .map((k) => k.toLowerCase())
      .sort();

    const canonicalHeaders =
      canonicalHeaderKeys.map((k) => `${k}:${String(headerPairs[k]).trim()}`).join("\n") + "\n";

    const signedHeaders = canonicalHeaderKeys.join(";");
    const canonicalRequest = [method, canonicalUri, queryString, canonicalHeaders, signedHeaders, payloadHash].join("\n");

    const algorithm = "AWS4-HMAC-SHA256";
    const service = "s3";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [algorithm, date, credentialScope, await sha256Hex(canonicalRequest)].join("\n");

    const kDate = await hmacSha256Raw(`AWS4${this.config.secretAccessKey}`, dateStamp);
    const kRegion = await hmacSha256Raw(kDate, region);
    const kService = await hmacSha256Raw(kRegion, service);
    const kSigning = await hmacSha256Raw(kService, "aws4_request");
    const signature = await hmacSha256Hex(kSigning, stringToSign);

    const authorization = `${algorithm} Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      Authorization: authorization,
      "x-amz-date": date,
      "x-amz-content-sha256": payloadHash,
    };
    if (headerPairs["content-type"]) headers["Content-Type"] = headerPairs["content-type"];
    return headers;
  }

  async get(key: string): Promise<string | null> {
    const endpoint = this.config.endpoint.replace(/\/+$/, "");
    const encodedKey = encodeS3KeyForPath(key);
    const canonicalUri = `/${this.config.bucket}/${encodedKey}`;
    const payloadHash = await sha256Hex("");
    const headers = await this.sign("GET", canonicalUri, "", payloadHash);

    const response = await fetch(`${endpoint}/${this.config.bucket}/${encodedKey}`, { method: "GET", headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`S3 GET failed: ${response.status} ${await response.text()}`);
    return await response.text();
  }

  async put(key: string, data: string | Uint8Array, contentType = "application/json; charset=utf-8"): Promise<void> {
    const endpoint = this.config.endpoint.replace(/\/+$/, "");
    const encodedKey = encodeS3KeyForPath(key);
    const payload = typeof data === "string" ? data : new TextDecoder().decode(data);
    const payloadHash = await sha256Hex(payload);
    const canonicalUri = `/${this.config.bucket}/${encodedKey}`;
    const headers = await this.sign("PUT", canonicalUri, "", payloadHash, { "content-type": contentType });

    const response = await fetch(`${endpoint}/${this.config.bucket}/${encodedKey}`, {
      method: "PUT",
      headers,
      body: payload,
    });
    if (!response.ok) throw new Error(`S3 PUT failed: ${response.status} ${await response.text()}`);
  }

  async delete(key: string): Promise<void> {
    const endpoint = this.config.endpoint.replace(/\/+$/, "");
    const encodedKey = encodeS3KeyForPath(key);
    const canonicalUri = `/${this.config.bucket}/${encodedKey}`;
    const payloadHash = await sha256Hex("");
    const headers = await this.sign("DELETE", canonicalUri, "", payloadHash);

    const response = await fetch(`${endpoint}/${this.config.bucket}/${encodedKey}`, { method: "DELETE", headers });
    if (response.status === 404) return;
    if (!response.ok) throw new Error(`S3 DELETE failed: ${response.status} ${await response.text()}`);
  }

  async list(prefix: string): Promise<string[]> {
    const endpoint = this.config.endpoint.replace(/\/+$/, "");
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const encodedPrefix = encodeURIComponent(prefix);
      let queryString = `delimiter=%2F&list-type=2&prefix=${encodedPrefix}`;
      if (continuationToken) queryString += `&continuation-token=${encodeURIComponent(continuationToken)}`;

      const canonicalUri = `/${this.config.bucket}`;
      const payloadHash = await sha256Hex("");
      const headers = await this.sign("GET", canonicalUri, queryString, payloadHash);

      const response = await fetch(`${endpoint}/${this.config.bucket}?${queryString}`, { method: "GET", headers });
      if (!response.ok) throw new Error(`S3 LIST failed: ${response.status} ${await response.text()}`);

      const xml = await response.text();
      for (const match of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(match[1]);

      const truncatedMatch = xml.match(/<IsTruncated>([^<]+)<\/IsTruncated>/);
      const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
      continuationToken = truncatedMatch?.[1] === "true" && tokenMatch ? tokenMatch[1] : undefined;
    } while (continuationToken);

    return keys;
  }
}
