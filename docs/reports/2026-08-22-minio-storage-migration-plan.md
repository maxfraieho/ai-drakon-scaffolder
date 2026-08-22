# MinIO Storage Migration — Investigation & Recommendation

**Date:** 2026-08-22
**Repo:** `ai-drakon-scaffolder`, branch `phase0-stabilize`
**Mode:** Fleet-coordinated investigation. No source edited, no provisioning, no credential rotation, no deployment, no commit, no push.

---

## Root cause of the outage

`exodus-infra/services/cloudflared/config.yml:19-23` routes `apiminio.exodus.pp.ua`/`minio.exodus.pp.ua` to `192.168.3.161:9100`/`:9001` (the OrangePi PC2). Nothing listens there (verified: `ss -tlnp` empty, no MinIO Docker container present or past). **Q confirmed directly**: MinIO's real last location was the Oracle Cloud VM (100.66.97.93). The cloudflared config is stale — left over from before/after a topology change, never updated when MinIO moved to (or was set up fresh on) Oracle.

## Fleet roles used

- **Agent A (coordinator):** Oracle Claude via `edgee launch claude --model opus`, two rounds — reconciliation/verification pass, then final synthesis.
- **Agent B (storage contract investigator):** AGY on `.234`, read-only source analysis.
- **Agent C (hosting-options researcher):** `agy.exe` on `.30`.
- **Agent M (memory bootstrap):** performed directly by the orchestrator.

## Memory bootstrap

AI_MEMORY: zero hits for `MinIO` or `Oracle`. MD_MEMORY: one relevant self-authored note from earlier in this session (MinIO down, Oracle-hosted, credential-reuse finding). No prior-session memory existed for this topic before today.

---

## Storage contract (Agent B, verified independently by Agent A)

**100% generic S3 — zero MinIO-specific lock-in.** Only four operations used anywhere in the codebase: `PUT`/`GET`/`DELETE`/`ListObjectsV2` `LIST`, all hand-signed with AWS SigV4 (`signS3Request`, `cloudflare-worker/worker-mcp-drakon.js:480-529`, hardcoded region `us-east-1`). Confirmed NOT used: HEAD requests, multipart uploads, presigned URLs, bucket-level operations, object metadata/tagging, byte-range requests, versioning/object-lock, the MinIO admin API. No MinIO client SDK anywhere — all raw `fetch()`.

**Strictly server-only.** Every storage call originates inside the Worker. The browser never touches S3/MinIO directly, never receives a presigned URL, never holds a credential. (`src/lib/settings-storage.ts:23-27`'s client-side `minio` struct is dead legacy, wired to nothing.)

**Zero non-Worker consumers.** A repo-wide grep across `yml/yaml/sh/py/toml/env` found no external tooling that talks to MinIO directly — closing what both delegate reports had flagged as an open unknown.

**Consumers and key schema** (unchanged by this migration): diagrams `${folderSlug}/${diagramId}.json`, user config `users/${userId}/config.json`, operational logs `logs/${date}/${timestamp}-${tool}.json`.

**Minimal `BlobStore` interface, cross-checked against the real Cloudflare R2 binding API by Agent A — no gap found:**

```typescript
export interface BlobStore {
  get(key: string): Promise<string | null>;
  put(key: string, data: string | Uint8Array, contentType?: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}
```

One nuance found during the cross-check: R2's native `list()` caps at 1000 keys/call and returns a `cursor`/`truncated` pair; the current MinIO `listMinioKeys` (`worker-mcp-drakon.js:602-631`) has the *same* undocumented 1000-key cap with no continuation-token loop — a pre-existing latent bug, not something the migration introduces. Fix: the R2 adapter paginates internally on `cursor`, keeping the `list(): Promise<string[]>` signature unchanged for callers.

**Already exists in the repo, but is a dead scaffold, not prior design:** `packages/storage/src/index.ts` is an empty `export {};`; its `README.md` cites "ADR-0018" and `docs/plans/phase2-boundary-inventory.md` as prior BlobStore design references — **both pointers are dangling**. ADR-0018 is actually the Appwrite/Cloudflare responsibility split (unrelated), and the phase-2 boundary inventory contains zero storage/BlobStore content. Treat the scaffold as a name reservation only. Also not registered in `pnpm-workspace.yaml` — the Worker has never imported a workspace package, so the first migration slice must prove the build actually resolves the import before any behavior changes ride on it.

## Hardcoded credentials — confirmed compromised, not just "rotatable"

`getMinioVar` (`worker-mcp-drakon.js:293-300`) contains a **literal secret value as a code fallback**, not a placeholder — committed in `69c7976f`. Same values plaintext again in `wrangler-antigravity.jsonc:11-13`. This session independently confirmed the secret is reused as an SSH password elsewhere in this infrastructure. **Verdict: treat as permanently disclosed. Rotation alone is insufficient — retire the identity, don't reissue it.** New credentials for whatever provider is chosen must be new key *names* and new *values*, Wrangler-secret-managed, with no code-level fallback of any kind (today's silent-fallback pattern is itself part of the problem — a missing secret should fail loudly, not silently degrade to a hardcoded value). Note also: `saveLogToMinio` (`worker-mcp-drakon.js:302-313`) swallows every error, so a credential failure today produces no signal at all.

## Hosting options (Agent C)

**Oracle Cloud Always Free under a new account (Q's son's identity): investigated, explicitly rejected.** Oracle requires a bank-issued (non-virtual, non-prepaid) payment card matching the registrant's name/address for identity verification, and runs aggressive automated fraud correlation on shared IP/address/device across accounts — a household signup risks **the existing Oracle account being banned too**, the same one currently hosting this Worker and this investigation's own Oracle Claude VM. Asymmetric downside (lose a working account) for no gain over the alternatives below.

**Managed S3-compatible options compared:** Cloudflare R2 (10GB free/mo, 1M Class A + 10M Class B ops, $0 egress, native Worker binding), Backblaze B2 (10GB free, 30GB/mo egress, no card required for private buckets), Filebase, AWS S3 free tier, Scaleway, IDrive e2. Self-hosting alternatives (GCP e2-micro, AWS EC2 free tier, Render, Fly.io) were all found unsuitable for a persistent storage server — ephemeral disks, 1GB RAM OOM risk, or free tiers that expire/auto-bill.

**Agent A's own verification note on Agent C's research:** two of Agent C's specific figures were flagged as likely stale (Oracle A1 "downsized to 2 OCPU/12GB" conflicts with the long-standing 4 OCPU/24GB allocation; AWS S3's cited "5GB/20K-GET/2K-PUT" tier is the legacy pre-2025 plan, since replaced by a credit-based free plan) — **neither affects the decision**, since the Oracle path is rejected regardless and AWS S3 was never the leading candidate. R2's own cited figures were cross-checked against Agent A's independent knowledge and held.

---

## Recommendation

```text
Storage decision:
CLOUDFLARE_R2

Primary recommendation:
Provision an R2 bucket in the existing Cloudflare account (c354ea45a11a1e1c14f1f41fe780cb34,
already hosting drakon-antigravity-worker). Bind it in the AUTHORITATIVE config —
cloudflare-worker/worker-wrangler.toml (the same file already carrying the D1_DB, service,
and Durable Object bindings from this session's earlier Slice 3.0b — NOT
wrangler-antigravity.jsonc, which is a confirmed-unreferenced legacy/draft config per the
earlier Deployment Binding Audit) — as r2_buckets [{ binding: "STORAGE", bucket_name: ... }].
Route all storage through a populated @ai-drakon/storage BlobStore package with an R2 adapter.
Delete the custom SigV4 signer (worker-mcp-drakon.js:464-631, ~170 lines) after cutover.
Preserve the existing key schema verbatim.
Gate: confirm the Cloudflare account has a payment method enabled — R2 requires one even at
free tier. One dashboard check, do it before anything else.

Fallback:
Backblaze B2 via an S3 SigV4 adapter (no card needed for private buckets, 10GB free, egress
3x stored). Same BlobStore interface, different adapter, zero call-site change once the
abstraction exists. Choose only if R2 cannot be enabled on the existing account.
Explicitly rejected: standing up MinIO under a new Oracle account in a family member's name.

Why:
Contract is 100% generic S3 (GET/PUT/DELETE/ListObjectsV2 only), server-only, zero external
consumers outside the Worker. Root cause was tunnel-topology drift (DNS pointed at the wrong
host); R2 removes the VM + Docker + cert renewal + cloudflared hop entirely, so this specific
failure class cannot recur. R2's native binding maps cleanly onto all four operations the code
actually uses, with one adapter-internal fix (list-cursor pagination) that also closes a
pre-existing 1000-key truncation bug in the current MinIO implementation.

Credential status:
COMPROMISED — treat as permanently disclosed (committed to git, reused as an SSH password
elsewhere), not merely due for rotation. Retire the identity; new provider gets a fresh
identity with no fallback default in code.

Immediate next storage slice:
S0 — read-only incident record and data rescue, before any provisioning. Bring MinIO back up
on the Oracle VM bound to LOOPBACK ONLY (no tunnel, no public port, no DNS change), inventory
and export the `drakon` bucket to a local archive outside the repo, record object count and
total bytes. This is the only time-sensitive step (a closing window against disk loss) and
resolves the one unknown both delegate reports flagged as unverifiable from the repo alone.

Phase 3 relationship:
Parallel, not blocking — corrected from the coordinator's own first-pass finding: the D1
binding this session's Slice 3.0b added IS present and confirmed in
cloudflare-worker/worker-wrangler.toml (Agent A's grep for it used a pattern too narrow to
match a file in a subdirectory — a tooling false negative, not a real gap; re-verified
directly by the orchestrator). Because the D1 binding already lives in the correct,
authoritative config file, adding r2_buckets to that same file is a clean addition, not a
collision to reconcile.

Do not:
- Reuse the disclosed access key or secret value on any new provider, under any name.
- Open the MinIO port publicly or repoint cloudflared during S0 — loopback only.
- Delete, wipe, or reprovision the Oracle VM disk or the old bucket until an exported copy is
  verified restorable at the new provider.
- Create an Oracle account under a family member's identity.
- Populate packages/storage against the ADR-0018 / phase2-boundary-inventory references in
  its own README — both point at unrelated/empty documents; write real provenance instead.
- Change key schema, delimiter semantics, or saveLogToMinio's silent-failure contract during
  cutover. One variable at a time.
- Rewrite git history to purge the secret without a separate, explicit decision — treat the
  credential as burned instead; history rewrite has its own blast radius.
- Bind r2_buckets into wrangler-antigravity.jsonc — that file is not the deployed config.
```

## Migration slices

| Slice | Changes | Untouched | Gate/Note |
|---|---|---|---|
| **S0 — Incident record + data rescue** | New incident note; local export archive (outside repo) | All code, all config, cloudflared, DNS | Only time-sensitive slice — do first |
| **S1 — Populate the BlobStore scaffold** | `packages/storage/src/index.ts` (interface + MemoryAdapter + S3Adapter lifted from `worker-mcp-drakon.js:464-631`), fix the README's dangling doc pointers, add `packages/storage` to `pnpm-workspace.yaml` (currently absent) | Worker call sites, wrangler configs, live endpoint | Prove `wrangler deploy --dry-run` resolves the workspace import first — the Worker has never done this |
| **S2 — Route Worker through BlobStore, still on S3 adapter** | The four wrappers become adapter calls; `getMinioVar` loses its hardcoded fallback, fails loudly on missing config | Key schema, HTTP routes, frontend, provider | Pure refactor — verify against S0's exported data in a local/dev bucket |
| **S3 — Provision R2 + adapter + data copy** | R2 bucket created; `cloudflare-worker/worker-wrangler.toml` gains `r2_buckets`; `R2BlobStoreAdapter` added; S0 archive uploaded with exact keys preserved | Worker call sites (already abstracted in S2), frontend, old MinIO | Gated on the payment-method check; falls back to B2 (same slice shape, adapter already exists from S1) if blocked |
| **S4 — Cutover** | Adapter selection flips to R2; old `MINIO_*` vars removed; `handleHealth` reports new backend | Old MinIO data (left intact as rollback) | Verify save/load/delete/list + user config + a log write; rollback = flip adapter back |
| **S5 — Retirement + cleanup** | Delete `signS3Request`/`s3UriEncode`/`encodeS3KeyForPath`/`ensureMinioConfig` + the four fetch wrappers (~170 lines); drop the dead client-side `minio` settings struct; fix the stale cloudflared entry; decommission the MinIO container | Keep the S3 adapter in `packages/storage` — it's the B2 escape hatch | Only after S4 is stable. Optional follow-up (not part of retirement): add conditional-put/etag to close a pre-existing read-modify-write race in `handleMcpMutateDiagram` |

## Corrections made during reconciliation

1. **Agent A's Phase 2 draft claimed no `d1_databases` binding exists in either wrangler file** — this was a false negative from an overly narrow `grep` pattern that didn't match a config file in a subdirectory. **Verified directly by the orchestrator: the binding is present and correct in `cloudflare-worker/worker-wrangler.toml`**, exactly as this session's own Slice 3.0b left it. The "Phase 3 relationship" section above is corrected accordingly — no reconciliation needed, R2 should simply be added to the same, already-correct file.
2. **Agent A's Phase 2 draft recommended adding the R2 binding to `wrangler-antigravity.jsonc`** — corrected to `cloudflare-worker/worker-wrangler.toml`, per this session's own earlier Deployment Binding Audit finding that `wrangler-antigravity.jsonc` is a confirmed-unreferenced legacy/draft config, never the one actually deployed.

## Evidence limitations

- Whether the Cloudflare account has a payment method enabled (the gating fact for R2) was not checked live in this investigation — flagged as the first concrete action item.
- Actual data volume in the old MinIO bucket is unknown from the repository alone; S0 is designed specifically to answer this before anything else happens.
- Whether MinIO on the Oracle VM still has its underlying disk/volume intact (vs. having been torn down) was not verified — S0 will surface this immediately.

---

**No production code was changed. No configuration was changed. No credentials were rotated. No deployment was performed. No data was copied or deleted. No commit was created. No push was performed.**
