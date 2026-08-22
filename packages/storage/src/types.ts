// packages/storage/src/types.ts
//
// Provider-neutral blob storage contract for ai-drakon-scaffolder.
//
// This interface deliberately covers exactly the four operations the
// application actually uses today (verified against
// cloudflare-worker/worker-mcp-drakon.js's MinIO call sites: uploadToMinIO,
// getFromMinIO, deleteFromMinIO, listMinioKeys) -- no HEAD, no multipart,
// no presigning, no bucket-level operations, no object metadata/tagging,
// no byte-range requests, no versioning. See docs/reports/2026-08-22-minio-storage-migration-plan.md
// for the full contract investigation this interface is derived from.

export interface BlobStore {
  /** Fetch an object's content as text, or null if the key doesn't exist. */
  get(key: string): Promise<string | null>;
  /** Store an object at the given key, overwriting any existing value. */
  put(key: string, data: string | Uint8Array, contentType?: string): Promise<void>;
  /** Delete an object. Idempotent -- does not error if the key is already absent. */
  delete(key: string): Promise<void>;
  /** List all keys starting with the given prefix. */
  list(prefix: string): Promise<string[]>;
}

/** Configuration for an S3-compatible (SigV4) backend -- MinIO, R2's S3 API, Backblaze B2, etc. */
export interface S3Config {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** SigV4 region string. MinIO/most self-hosted S3-compatible servers ignore this but still require a value; defaults to 'us-east-1' to match the value the current Worker implementation hardcodes. */
  region?: string;
}
