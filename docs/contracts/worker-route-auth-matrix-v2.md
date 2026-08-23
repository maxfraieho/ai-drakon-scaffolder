# Worker Route/Auth Contract Matrix v2

## Overview & Metadata

- **Audited File**: `cloudflare-worker/worker-mcp-drakon.js`
- **Total Lines in File**: `4830`
- **`fetch()` Handler Bounds**: Line `2632` (`async fetch(request, env, ctx) {`) to Line `4223` (`};`)
- **Global Owner Gate Location**: Lines `2866–2869`
  ```javascript
  const ownerPayload = await verifyOwnerAuth(request, env);
  if (!ownerPayload || ownerPayload.role !== 'owner') {
    return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
  }
  ```

---

## Architectural Analysis & Specific Findings

### A. Pre-Gate vs. Post-Gate Routing Partition
1. **Pre-Gate Routes (Lines 2632–2865, Routes #1–29)**:
   - These routes are dispatched **before** the global owner gate.
   - They **never pass through** the global owner gate.
   - Any authentication enforcement on these routes depends entirely on local checks performed within the `fetch()` route branch or inside the delegated handler functions.
   - Routes lacking local checks (e.g., public endpoints `#4–8`, `#10–15`, `#19`, `#21`, `#23`, `#25–27`) execute completely unauthenticated (`auth: none`).
   - Routes with incomplete local checks (e.g., `#9` `POST /mcp`, `#16–18` `/v1/notes/*`, `#20` `/v1/codegen`, `#22` `/v1/compile`) check `if (!payload)` but do **not** check `payload.role === 'owner'`. Because `verifyOwnerAuth()` returns a truthy `{ role: 'user', sub: ... }` object for non-owner Appwrite JWTs, any authenticated Appwrite user bypasses the intended owner check (`auth: weak`).
   - Durable Object endpoints (`#2` `/ws/room/*` and `#3` `/v1/diagram/:diagramId/sync`) enforce explicit local owner checks (`if (!ownerPayload || ownerPayload.role !== 'owner') return 401;`) at lines 2661–2664 and 2679–2682.
   - User config endpoints (`#28–29` `/v1/user/config`) enforce authentication (`if (!payload) return 401;`) but are self-scoped to `users/${userId}/config.json` by design (`auth: authenticated`).

2. **Post-Gate Routes (Lines 2870–4223, Routes #30–68)**:
   - Execution only reaches line 2870 after successfully passing the global owner gate at lines 2866–2869.
   - Every route in this block is strictly gated to callers with `role === 'owner'` (`auth: owner`), including wildcard proxies and internal compilers.
   - Any unmatched path reaching line 4218 returns `404 Not Found` to authenticated owners, whereas unauthenticated callers receive `401 Unauthorized` at line 2868.

---

### B. Duplicate, Shadowed, and Dual-Path Routes
1. **GitHub OAuth Start**:
   - `GET /auth/github/start` (Line `2697`, Route `#6`) is **public (`none`)**, located before the gate.
   - `GET /v1/github/oauth/authorize` (Line `4150`, Route `#64`) is positioned **after the global owner gate (`owner`)**.
   - Both call `handleGithubAuthStart(request, env)`. The `/v1/` variant requires an owner JWT, whereas `/auth/github/start` is accessible to any caller holding an Appwrite token in `?token=`.
2. **GitHub OAuth Callback**:
   - `GET /auth/github/callback` (Line `2701`, Route `#7`) is **public (`none`)**, located before the gate, and functions as the live browser OAuth redirect target.
   - `GET /v1/github/oauth/callback` (Line `4154`, Route `#65`) sits **after the global owner gate (`owner`)**. Because standard browser redirects do not send an `Authorization: Bearer` header, any browser hitting this `/v1/` callback route receives a `401 Unauthorized` error from the global gate.
3. **Agent Chat Dispatch Shadowing**:
   - `POST /v1/agents/sonate-solidaire/chat` (Line `2794`, Route `#25`) is matched before the owner gate with no auth (`none`).
   - `POST /v1/agents/:agentId/chat` (Line `4210`, Route `#67`) is matched after the owner gate (`owner`).
   - For `agentId === 'sonate-solidaire'`, requests are unconditionally intercepted at Line 2794; the generic handler at Line 4210 is shadowed and unreachable for Sonate Solidaire.
4. **Architect Agent Wildcard Shadowing**:
   - `POST /v1/architect/compile-eve` (Line `4046`, Route `#58`) and `POST /v1/architect/compile-eve/zip` (Line `4058`, Route `#59`) match exact paths and execute local in-worker compilation.
   - `ANY /v1/architect/*` (Line `4093`, Route `#61`) is a wildcard proxy to `https://architect-agent.exodus.pp.ua`. The specific compilation routes intercept POSTs before the wildcard proxy can forward them.

---

### C. Nuanced and Flagged Auth Classifications
1. **Appwrite Truthy Non-Owner Bypass (`auth: weak`)**:
   - `verifyOwnerAuth()` (lines 436–478) returns `{ role: 'user', sub: appwriteUser.$id, email: appwriteUser.email }` when a caller presents a valid Appwrite JWT for an email not listed in `OWNER_EMAILS`.
   - Routes `#9` (`POST /mcp`), `#16` (`POST /v1/notes/commit`), `#17` (`DELETE /v1/notes/delete`), `#18` (`POST /v1/notes/build-semantic-graph`), `#20` (`POST /v1/codegen`), and `#22` (`POST /v1/compile`) check `if (!payload)` or `if (!owner)`. Because `{ role: 'user' }` is truthy, non-owner users bypass the auth check entirely.
2. **Caller-Scoped Config (`auth: authenticated`)**:
   - Routes `#28` (`GET /v1/user/config`) and `#29` (`PUT /v1/user/config`) use `verifyOwnerAuth()` to verify token validity, but scope data storage strictly to `users/${userId}/config.json` where `userId = payload.sub || payload.email`. They do not require owner role and are correctly categorized as `authenticated`.
3. **Query Parameter Token Auth (`auth: weak`)**:
   - Route `#24` (`GET /v1/pipeline/stream/:jobId`) extracts `?token=` and calls `verifyJWT(token, env.JWT_SECRET)`. It accepts any valid token signed by `JWT_SECRET` without checking role or job tenant ownership, and does not accept Appwrite JWTs.

---

## Complete Route Inventory & Auth Matrix

| # | Method | Path | Line | Current auth level | Confidence | Notes |
|---|---|---|---|---|---|---|
| 1 | OPTIONS | `*` | 2637–2639 | none | high | Preflight CORS handler for all routes; returns 204 No Content with CORS headers. Positioned before any configuration or auth checks. |
| 2 | ANY | `/ws/room/*` | 2654–2669 | owner | high | Positioned before global owner gate. Enforces local `verifyOwnerAuth` + `role === 'owner'` check (lines 2661–2664) with 401 early return. Proxies to `RoomDO` Durable Object stub. Room IDs are not tenant-isolated. |
| 3 | ANY | `/v1/diagram/:diagramId/sync` | 2671–2687 | owner | high | Positioned before global owner gate. Enforces local `verifyOwnerAuth` + `role === 'owner'` check (lines 2679–2682) with 401 early return. Proxies to `DiagramSyncDO` Durable Object stub. |
| 4 | GET | `/health` | 2689–2691 | none | high | Public service health, version, and MinIO storage configuration status check. Calls `handleHealth(env)`. |
| 5 | POST | `/auth/login` | 2693–2695 | none | high | Public owner login endpoint; verifies password against `OWNER_PASSWORD_HASH` / `ADMIN_PASSWORD` and returns Worker JWT with `role: 'owner'`. |
| 6 | GET | `/auth/github/start` | 2697–2699 | none | high | Public OAuth entrypoint; validates caller's Appwrite JWT from `?token=` query param to create signed state JWT, redirects to GitHub OAuth authorize URL. Duplicate of route #64. |
| 7 | GET | `/auth/github/callback` | 2701–2703 | none | high | Public OAuth callback endpoint for GitHub OAuth redirection; exchanges code for access token and updates Appwrite `user_profiles`. Duplicate of route #65. |
| 8 | GET | `/mcp` | 2705–2713 | none | high | MCP Streamable HTTP compliance check; returns 405 Method Not Allowed with `Allow: POST` header. |
| 9 | POST | `/mcp` | 2715–2735 | weak | high | Calls `verifyOwnerAuth(request, env)` on line 2716 but checks `if (!owner) return 401` without checking `owner.role === 'owner'`. Valid Appwrite users (`role: 'user'`) evaluate truthy and gain access to all 24 MCP tools. |
| 10 | GET | `/v1/drakon-ir/list` | 2738–2740 | none | high | Public read-only route; proxies to docs-agent at `DOCS_AGENT_URL + '/drakon-ir/list'`. |
| 11 | GET | `/v1/drakon-ir/:name` | 2741–2744 | none | high | Public read-only route; matched via regex `^\/v1\/drakon-ir\/([^/]+)$`. Proxies to docs-agent at `/drakon-ir/get?name=...`. |
| 12 | GET | `/v1/notes/list` | 2746–2748 | none | high | Public read-only route; proxies to docs-agent at `/notes/list?flat=...&project=...`. |
| 13 | GET | `/v1/notes/get` | 2749–2751 | none | high | Public read-only route; handled in combined `if (path === '/v1/notes/get' \|\| path === '/v1/notes/read')` branch. Proxies to docs-agent at `/notes/read?slug=...`. |
| 14 | GET | `/v1/notes/read` | 2749–2751 | none | high | Public read-only route; handled in combined `if (path === '/v1/notes/get' \|\| path === '/v1/notes/read')` branch. Proxies to docs-agent at `/notes/read?slug=...`. |
| 15 | GET | `/v1/notes/graph` | 2752–2754 | none | high | Public read-only route; proxies to docs-agent at `/notes/graph?project=...`. |
| 16 | POST | `/v1/notes/commit` | 2755–2757 | weak | high | Dispatches to `handleNotesCommit` (line 3550) which checks `if (!authPayload) return 401` after `verifyOwnerAuth` without checking `authPayload.role === 'owner'`. Non-owner Appwrite users can commit notes. |
| 17 | DELETE | `/v1/notes/delete` | 2758–2760 | weak | high | Dispatches to `handleNotesDelete` (line 3599) which checks `if (!authPayload) return 401` after `verifyOwnerAuth` without checking `authPayload.role === 'owner'`. Non-owner Appwrite users can delete notes. |
| 18 | POST | `/v1/notes/build-semantic-graph` | 2761–2763 | weak | high | Dispatches to `handleNotesBuildSemanticGraph` (line 3619) which checks `if (!payload) return 401` after `verifyOwnerAuth` without checking `payload.role === 'owner'`. Triggers Appwrite function execution for any logged-in user. |
| 19 | GET | `/v1/notes/semantic-graph-status` | 2764–2766 | none | high | Dispatches to `handleSemanticGraphStatus` (line 3679) which performs NO auth check and queries Appwrite function execution status/logs directly for any given `execution_id`. |
| 20 | POST | `/v1/codegen` | 2767–2769 | weak | high | Dispatches to `handleDrakonCodegen` (line 3740) which checks `if (!payload) return 401` after `verifyOwnerAuth` without checking `payload.role === 'owner'`. Triggers LLM codegen Appwrite function for non-owner users. |
| 21 | GET | `/v1/codegen-status` | 2770–2772 | none | high | Dispatches to `handleCodegenStatus` (line 3801) which performs NO auth check and returns Appwrite execution status and decoded logs for any `execution_id`. |
| 22 | POST | `/v1/compile` | 2773–2775 | weak | high | Dispatches to `handleDrakonCompile` (line 3865) which checks `if (!payload) return 401` after `verifyOwnerAuth` without checking `payload.role === 'owner'`. Triggers drakon-compiler Appwrite function for non-owner users. |
| 23 | GET | `/v1/compile-status` | 2776–2778 | none | high | Dispatches to `handleCompileStatus` (line 3931) which performs NO auth check and returns compiler execution status and logs for any `execution_id`. |
| 24 | GET | `/v1/pipeline/stream/:jobId` | 2785–2792 | weak | high | Matched via regex `^\/v1\/pipeline\/stream\/([^\/]+)$`. Verifies `?token=` query param using `verifyJWT(qToken, env.JWT_SECRET)`. Accepts any Worker-signed JWT regardless of role or job ownership; rejects Appwrite JWTs. |
| 25 | POST | `/v1/agents/sonate-solidaire/chat` | 2794–2797 | none | high | Matched via regex `^\/v1\/agents\/(sonate-solidaire)\/chat$`. Explicitly unauthenticated public chat endpoint for Sonate Solidaire. Shadows route #67 for this agent ID. |
| 26 | GET | `/v1/agents/:agentId/health` | 2801–2804 | none | high | Matched via regex `^\/v1\/agents\/([^\/]+)\/health$`. Public health check proxy for any agent ID (`drakon`, `architect`, `docs`, `sonate-solidaire`). |
| 27 | GET | `/v1/understand/status` | 2806–2858 | none | high | Public endpoint querying GitHub API for `.understand-anything/knowledge-graph.json` existence. Uses caller's `X-Github-Token` header if present, else fallback `env.GITHUB_TOKEN`. |
| 28 | GET | `/v1/user/config` | 2861–2864 | authenticated | high | Positioned before global owner gate. Dispatches to `handleUserConfigGet` (line 2346) which verifies JWT (`if (!payload) return 401`) and reads `users/${userId}/config.json` from MinIO. Self-scoped to caller ID by design. |
| 29 | PUT | `/v1/user/config` | 2861–2864 | authenticated | high | Positioned before global owner gate. Dispatches to `handleUserConfigPut` (line 2360) which verifies JWT (`if (!payload) return 401`) and writes `users/${userId}/config.json` to MinIO. Self-scoped to caller ID by design. |
| — | — | **GLOBAL OWNER GATE** | **2866–2869** | **owner** | **high** | **Enforces `verifyOwnerAuth` + `ownerPayload.role === 'owner'` with 401 early return. All routes below require owner role.** |
| 30 | ANY | `/v1/docs/*` | 2872–2888 | owner | high | Positioned after global owner gate (`path.startsWith('/v1/docs/')`). Proxies all methods (GET, POST, DELETE, etc.) to docs-agent at `https://docs-agent.exodus.pp.ua`. |
| 31 | ANY | `/v1/projects*` | 2891–2907 | owner | high | Positioned after global owner gate (`path.startsWith('/v1/projects')`). Proxies all methods for `/v1/projects` and `/v1/projects/*` to docs-agent. |
| 32 | ANY | `/v1/graph-pipelines*` | 2910–2926 | owner | high | Positioned after global owner gate (`path.startsWith('/v1/graph-pipelines')`). Proxies all methods to architect-agent at `https://architect-agent.exodus.pp.ua`. |
| 33 | POST | `/v1/drakon/commit` | 2928–2930 | owner | high | Positioned after global owner gate. Dispatches to `handleDrakonCommit` (line 1175) to upload diagram IR to MinIO storage. |
| 34 | POST | `/v1/drakon/validate-ir` | 2932–2934 | owner | high | Positioned after global owner gate. Dispatches to `handleDrakonValidateIr` to validate IR schema and return issue list + autofixes. |
| 35 | POST | `/v1/analysis/codebase` | 2936–2938 | owner | high | Positioned after global owner gate. Dispatches to `handleAnalysisCodebase` to create and launch codebase analysis job. |
| 36 | GET | `/v1/analysis/jobs/:jobId` | 2940–2943 | owner | high | Positioned after global owner gate. Matched via regex `^\/v1\/analysis\/jobs\/([^\/]+)$`. Retrieves analysis job details from in-memory map. |
| 37 | GET | `/v1/analysis/jobs` | 2945–2947 | owner | high | Positioned after global owner gate. Lists all active/stored analysis jobs. |
| 38 | GET | `/v1/github/tree` | 2949–2956 | owner | high | Positioned after global owner gate. Fetches recursive Git tree via GitHub REST API using `X-Github-Token` or server token. |
| 39 | GET | `/v1/github/file` | 2958–2965 | owner | high | Positioned after global owner gate. Fetches single file contents via GitHub REST API. |
| 40 | POST | `/v1/github/commit` | 2967–2976 | owner | high | Positioned after global owner gate. Commits/updates file on GitHub repo. |
| 41 | DELETE | `/v1/github/delete` | 2978–2987 | owner | high | Positioned after global owner gate. Deletes file on GitHub repo. |
| 42 | GET | `/v1/github/branches` | 2989–2994 | owner | high | Positioned after global owner gate. Lists branches for target GitHub repository. |
| 43 | GET | `/v1/drakon/:folder/:name` | 2996–3003 | owner | high | Positioned after global owner gate. Matched via regex `^\/v1\/drakon\/([^\/]+)\/([^\/]+)$`. Retrieves diagram JSON from MinIO. |
| 44 | DELETE | `/v1/drakon/:folder/:name` | 3005–3012 | owner | high | Positioned after global owner gate. Matched via regex `^\/v1\/drakon\/([^\/]+)\/([^\/]+)$`. Deletes diagram from MinIO. |
| 45 | GET | `/v1/drakon/:folder` | 3014–3020 | owner | high | Positioned after global owner gate. Matched via regex `^\/v1\/drakon\/([^\/]+)$`. Lists diagram keys in folder from MinIO. |
| 46 | ANY | `/v1/agents/pipeline*` | 3992–4001 | owner | high | Positioned after global owner gate (`path.startsWith('/v1/agents/pipeline')`). Proxies all methods to architect-agent pipeline registry. |
| 47 | POST | `/v1/pipeline/execute-deterministic` | 4004–4006 | owner | high | Positioned after global owner gate. Dispatches to `handleDrakonExecuteDeterministic` (line 4642) to trigger deterministic engine Appwrite function. |
| 48 | GET | `/v1/pipeline/execute-deterministic/status` | 4007–4009 | owner | high | Positioned after global owner gate. Dispatches to `handleDrakonExecuteDeterministicStatus` (line 4687) to check deterministic execution status. |
| 49 | POST | `/v1/pipeline/analyze` | 4010–4012 | owner | high | Positioned after global owner gate. Proxies analysis request to architect-agent `/pipeline/analyze`. |
| 50 | POST | `/v1/pipeline/generate` | 4013–4015 | owner | high | Positioned after global owner gate. Proxies generation request to architect-agent `/pipeline/generate`. |
| 51 | GET | `/v1/pipeline/status/:jobId` | 4016–4019 | owner | high | Positioned after global owner gate. Matched via regex `^\/v1\/pipeline\/status\/([^\/]+)$`. Proxies status check to architect-agent. |
| 52 | POST | `/v1/kb/index` | 4024–4026 | owner | high | Positioned after global owner gate. Dispatches to `handleKbIndex` (line 3136) to embed notes via Workers AI and save to Appwrite `kb_embeddings`. |
| 53 | POST | `/v1/kb/search` | 4027–4029 | owner | high | Positioned after global owner gate. Dispatches to `handleKbSearch` (line 3306) to execute vector similarity + graph centrality search over embeddings. |
| 54 | POST | `/v1/kb/contribute` | 4031–4033 | owner | high | Positioned after global owner gate. Proxies KB contribution to architect-agent `/kb/contribute`. |
| 55 | GET | `/v1/kb/list` | 4034–4036 | owner | high | Positioned after global owner gate. Proxies KB listing to architect-agent `/kb/list`. |
| 56 | GET | `/v1/kb/get/:id` | 4037–4040 | owner | high | Positioned after global owner gate. Matched via regex `^\/v1\/kb\/get\/([^\/]+)$`. Proxies KB note retrieval to architect-agent `/kb/get/:id`. |
| 57 | DELETE | `/v1/kb/delete/:id` | 4041–4044 | owner | high | Positioned after global owner gate. Matched via regex `^\/v1\/kb\/delete\/([^\/]+)$`. Proxies deletion to architect-agent `/kb/delete/:id`. |
| 58 | POST | `/v1/architect/compile-eve` | 4046–4056 | owner | high | Positioned after global owner gate. Compiles DRAKON IR diagram into EVE agent bundle JSON inline via `ribosomeEVEInline`. Matched before wildcard proxy #61. |
| 59 | POST | `/v1/architect/compile-eve/zip` | 4058–4074 | owner | high | Positioned after global owner gate. Compiles DRAKON IR diagram into EVE agent ZIP archive inline via `createZip`. Matched before wildcard proxy #61. |
| 60 | ANY | `/v1/playpipe/*` | 4077–4090 | owner | high | Positioned after global owner gate (`path.startsWith('/v1/playpipe/')`). Proxies build control and SSE stream to architect-agent rewritten as `/architect/playpipe/...`. |
| 61 | ANY | `/v1/architect/*` | 4093–4103 | owner | high | Positioned after global owner gate (`path.startsWith('/v1/architect/')`). Wildcard proxy to architect-agent for general endpoints (e.g. `/architect/decompose`). |
| 62 | POST | `/v1/compiler/n8n` | 4106–4115 | owner | high | Positioned after global owner gate. Compiles DRAKON IR diagram into n8n workflow JSON inline via `ribosomeN8NInline`. |
| 63 | POST | `/v1/compiler/n8n/push` | 4118–4147 | owner | high | Positioned after global owner gate. Compiles IR diagram into n8n workflow and pushes to external n8n instance via `n8nUrl` and `n8nApiKey`. |
| 64 | GET | `/v1/github/oauth/authorize` | 4150–4152 | owner | high | Positioned after global owner gate. Dispatches to `handleGithubAuthStart(request, env)`. Requires owner authentication because it sits below line 2866 (unlike public route #6). |
| 65 | GET | `/v1/github/oauth/callback` | 4154–4156 | owner | high | Positioned after global owner gate. Dispatches to `handleGithubAuthCallback(request, env)`. Because it is post-gate, browser OAuth redirects without Bearer headers fail with 401 (use route #7 instead). |
| 66 | POST | `/v1/github/create-repo` | 4158–4207 | owner | high | Positioned after global owner gate. Retrieves user's GitHub token from Appwrite profile and creates repo via GitHub API. |
| 67 | POST | `/v1/agents/:agentId/chat` | 4210–4213 | owner | high | Positioned after global owner gate. Matched via regex `^\/v1\/agents\/([^\/]+)\/chat$`. Proxies chat requests for `drakon`, `architect`, `docs`. Note: `sonate-solidaire` is handled by route #25. |
| 68 | ANY | `*` | 4218 | owner | high | Fallback 404 handler (`errorResponse('Not found', 404, ...)`). Unauthenticated requests for unmatched routes are blocked at line 2868 with 401 Unauthorized before reaching this response. |
