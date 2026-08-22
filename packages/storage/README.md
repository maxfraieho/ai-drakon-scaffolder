# @ai-drakon/storage

Provider-neutral `BlobStore` interface (`get`/`put`/`delete`/`list`) plus two adapters:

- **`MemoryBlobStoreAdapter`** — in-memory, for unit tests and local dev. Not persisted.
- **`S3BlobStoreAdapter`** — SigV4-signed, works against any S3-compatible endpoint (MinIO, Backblaze B2, R2's S3 API, AWS S3). Ported verbatim from `cloudflare-worker/worker-mcp-drakon.js`'s hand-rolled signer, with one improvement: `list()` now paginates internally on `NextContinuationToken` instead of silently truncating at 1000 keys.

## Status

Populated in Phase 3's MinIO Slice S1 (2026-08-22). The Worker itself (`cloudflare-worker/worker-mcp-drakon.js`) still uses its own inline copy of this logic — wiring the Worker's call sites to this package is Slice S2, not done yet. An `R2BlobStoreAdapter` (native Cloudflare Workers R2 binding) is deferred to Slice S3, once the R2 bucket itself is provisioned.

See `docs/reports/2026-08-22-minio-storage-migration-plan.md` for the full storage-contract investigation and provider decision (Cloudflare R2 primary, Backblaze B2 fallback) this package's interface is derived from, and `docs/reports/2026-08-22-security-fix-and-minio-s1-coordination-report.md` for this specific slice's scope and validation.

## Usage

```ts
import type { BlobStore } from "@ai-drakon/storage";
import { S3BlobStoreAdapter, MemoryBlobStoreAdapter } from "@ai-drakon/storage";

// Production / any S3-compatible endpoint:
const store: BlobStore = new S3BlobStoreAdapter({
  endpoint: env.MINIO_ENDPOINT,
  bucket: env.MINIO_BUCKET,
  accessKeyId: env.MINIO_ACCESS_KEY,
  secretAccessKey: env.MINIO_SECRET_KEY,
});

// Tests:
const store: BlobStore = new MemoryBlobStoreAdapter();
```

Key schema is unchanged from the current Worker implementation — this package does not alter it:
- Diagrams: `${folderSlug}/${diagramId}.json`
- User config: `users/${userId}/config.json`
- Operational logs: `logs/${date}/${timestamp}-${tool}.json`
