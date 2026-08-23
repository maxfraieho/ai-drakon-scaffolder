// ── Inlined htse lib (ir-types, ir-validator-core, diagram-to-ir, ir-to-diagram) ──

import { S3BlobStoreAdapter } from '@ai-drakon/storage';
import { resolveTenant, DiagramRepository } from '@ai-drakon/tenancy';

const VALID_IR_ITEM_TYPES = new Set([
  'action','question','select','case','header','end','address',
  'branch','insertion','input','output','shelf','process','timer','duration',
]);

function _isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

function _normalizeIr(ir) {
  const src = _isObject(ir) ? ir : {};
  const items = _isObject(src.items) ? src.items : {};
  const normalizedItems = {};
  for (const [id, item] of Object.entries(items)) {
    if (!_isObject(item)) continue;
    normalizedItems[String(id)] = {
      type: String(item.type || '').trim(),
      content: String(item.content || '').trim(),
      secondary: item.secondary === undefined ? undefined : String(item.secondary).trim(),
      one: item.one === undefined ? undefined : String(item.one).trim(),
      two: item.two === undefined ? undefined : String(item.two).trim(),
      side: item.side === undefined ? undefined : String(item.side).trim(),
      flag1: item.flag1 === undefined ? undefined : Boolean(item.flag1),
      branchId: item.branchId === undefined ? undefined : String(item.branchId).trim(),
      style: _isObject(item.style) ? item.style : undefined,
    };
  }
  return {
    name: String(src.name || '').trim(),
    access: String(src.access || 'private').trim(),
    params: Array.isArray(src.params) ? src.params.map(p => String(p).trim()).filter(Boolean) : [],
    items: normalizedItems,
  };
}

// Reconciled with src/lib/htse/ir-validator-core.ts (Phase 2 Slice 4). This
// used to be a 4-rule subset (SCHEMA_REQUIRED_FIELD x2, INVALID_ITEM_TYPE,
// DANGLING_REFERENCE) missing MULTIPLE_TERMINAL_CANDIDATE, MISSING_HEADER,
// ORPHAN_NODE (BFS reachability) and MISSING_ALT_VECTOR entirely, and always
// returned an empty `autofixes` array. It now runs the exact same rule set,
// in the exact same order, as the canonical validator -- this is the single
// source of truth for IR validation logic.
//
// Real, user-visible consequences of this reconciliation (named explicitly,
// not hidden): src/components/htse/ValidationPanel.tsx already has UI code
// for previewing/applying `autofixes` (Preview fixes button, autofix list)
// that has been dead since it shipped, because the remote validator (this
// function, via POST /v1/drakon/validate-ir) never populated that array --
// only local/canonical validation did. That UI will start working for the
// first time once this ships. Also, `issue.code` is rendered directly in
// that panel, so the DANGLING_REFERENCE -> DANGLING_POINTER rename below is
// a visible label change, not just an internal one.
//
// One intentional, narrow deviation from canonical: canonical's `success`
// field is hardcoded `true` regardless of validity. Confirmed via direct
// grep across the whole repo (worker call sites, src/lib/htse/diagram-to-ir.ts,
// src/store/useDiagramStore.ts, src/components/htse/ValidationPanel.tsx, and
// every existing test) that nothing anywhere reads `.success` from this
// function's result -- only `.valid`, `.issues`, `.autofixes` and
// `.normalizedIr` are ever consulted. This function's result is exposed
// directly as an HTTP response body (POST .../validate-ir) and as the
// `drakon.validateir` MCP tool result, both externally visible to callers
// outside this repo, so `success` is deliberately kept meaningful (`= valid`)
// here rather than adopting canonical's always-true quirk, to avoid a silent
// external contract change for anything that might reasonably check it.
export function validateIrDeterministic(irPayload) {
  const issues = [];
  const autofixes = [];
  const normalizedIr = _normalizeIr(irPayload);

  if (!normalizedIr.name) {
    issues.push({ code: 'SCHEMA_REQUIRED_FIELD', severity: 'error', message: 'Field "name" is required.' });
  }

  if (!_isObject(normalizedIr.items) || Object.keys(normalizedIr.items).length === 0) {
    issues.push({ code: 'SCHEMA_REQUIRED_FIELD', severity: 'error', message: 'Field "items" is required and must be a non-empty object.' });
  }

  const itemIds = Object.keys(normalizedIr.items);
  const itemIdSet = new Set(itemIds);

  for (const [nodeId, item] of Object.entries(normalizedIr.items)) {
    if (!VALID_IR_ITEM_TYPES.has(item.type)) {
      issues.push({ code: 'INVALID_ITEM_TYPE', severity: 'error', message: `Node has invalid type: ${item.type || '(empty)'}`, nodeId });
    }
  }

  const terminalCandidates = [];
  for (const [nodeId, item] of Object.entries(normalizedIr.items)) {
    if (item.type !== 'end' && !item.one) {
      terminalCandidates.push(nodeId);
      issues.push({
        code: 'MULTIPLE_TERMINAL_CANDIDATE',
        severity: 'warning',
        message: 'Non-end node has no main vector (one) and should be merged into a single terminal end.',
        nodeId,
        autofix: 'merge_terminals',
      });
    }
  }

  if (terminalCandidates.length > 0) {
    autofixes.push({
      type: 'merge_terminals',
      description: 'Merge all terminal candidates into one shared end node.',
      safeToApply: true,
    });
  }

  for (const [nodeId, item] of Object.entries(normalizedIr.items)) {
    for (const pointerName of ['one', 'two']) {
      const target = item[pointerName];
      if (target && !itemIdSet.has(target)) {
        issues.push({
          code: 'DANGLING_POINTER',
          severity: 'error',
          message: `Node ${pointerName} points to missing node id: ${target}`,
          nodeId,
        });
      }
    }
  }

  const hasBranch = Object.values(normalizedIr.items).some((item) => item.type === 'branch');
  const hasHeader = Object.values(normalizedIr.items).some((item) => item.type === 'header');
  if (hasBranch && !hasHeader) {
    issues.push({
      code: 'MISSING_HEADER',
      severity: 'warning',
      message: 'Silhouette-like diagram with branches should include at least one header node.',
    });
  }

  if (itemIds.length > 0) {
    const startId = itemIds[0];
    const visited = new Set();
    const queue = [startId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) continue;
      visited.add(currentId);

      const current = normalizedIr.items[currentId];
      if (!current) continue;

      const nextIds = [current.one, current.two].filter((id) => Boolean(id));
      for (const nextId of nextIds) {
        if (itemIdSet.has(nextId) && !visited.has(nextId)) {
          queue.push(nextId);
        }
      }
    }

    const orphans = itemIds.filter((id) => !visited.has(id));
    for (const nodeId of orphans) {
      issues.push({
        code: 'ORPHAN_NODE',
        severity: 'warning',
        message: 'Node is unreachable from the start node.',
        nodeId,
        autofix: 'remove_orphan',
      });
    }

    if (orphans.length > 0) {
      autofixes.push({
        type: 'remove_orphan',
        description: 'Remove nodes unreachable from BFS traversal start node.',
        safeToApply: true,
      });
    }
  }

  for (const [nodeId, item] of Object.entries(normalizedIr.items)) {
    if ((item.type === 'question' || item.type === 'case') && item.one && !item.two) {
      issues.push({
        code: 'MISSING_ALT_VECTOR',
        severity: 'warning',
        message: 'Question/case node has main path but misses alternate vector (two).',
        nodeId,
      });
    }
  }

  const valid = !issues.some((issue) => issue.severity === 'error');

  return { success: valid, valid, normalizedIr, issues, autofixes };
}

function convertDiagramToIr(diagram) {
  const items = {};
  for (const [id, item] of Object.entries(diagram.items || {})) {
    const style = {};
    try { const p = JSON.parse(item.style || '{}'); if (_isObject(p)) Object.assign(style, p); } catch {}
    if (item.link !== undefined) style.link = item.link;
    if (item.margin !== undefined) style.margin = item.margin;
    if (!VALID_IR_ITEM_TYPES.has(item.type)) style.originalType = item.type;
    const irItem = {
      type: VALID_IR_ITEM_TYPES.has(item.type) ? item.type : 'action',
      content: item.content ?? '',
      secondary: item.secondary,
      one: item.one,
      two: item.two,
      side: item.side,
      flag1: item.flag1 === undefined ? undefined : item.flag1 !== 0,
      branchId: item.branchId === undefined ? undefined : String(item.branchId),
    };
    if (Object.keys(style).length > 0) irItem.style = style;
    items[id] = irItem;
  }
  const acc = diagram.access === 'write' ? 'private' : 'public';
  const params = (diagram.params || '').split(',').map(p => p.trim()).filter(Boolean);
  return { name: diagram.name, access: acc, params, items };
}

function convertIrToDiagram(ir) {
  const items = {};
  for (const [id, item] of Object.entries(ir.items || {})) {
    const d = {
      type: item.type,
      content: item.content,
      secondary: item.secondary,
      one: item.one,
      two: item.two,
      side: item.side,
      flag1: item.flag1 === undefined ? undefined : (item.flag1 ? 1 : 0),
      branchId: item.branchId === undefined ? undefined : Number(item.branchId),
    };
    if (item.style && Object.keys(item.style).length > 0) d.style = JSON.stringify(item.style);
    items[id] = d;
  }
  return {
    name: ir.name,
    access: ir.access === 'private' ? 'write' : 'read',
    params: (ir.params ?? []).join(', '),
    items,
  };
}

// PRE_ANALYZED_ANALYSIS — inlined as empty stub (generated at build time)
const PRE_ANALYZED_ANALYSIS = { summary: {}, plannedDiagrams: [] };



// ============================================
// DRAKON MCP Worker v1.0
// Vanilla Cloudflare Worker (ES2022), no external deps
// Focus: auth + MinIO(S3) + MCP tools for DRAKON diagrams
// ============================================

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Github-Token',
      ...extraHeaders,
    },
  });
}

function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Github-Token',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function errorResponse(message, status = 400, details = undefined, code = undefined) {
  const payload = { success: false, error: message };
  if (code) payload.errorCode = code;
  if (details !== undefined) payload.errorDetails = details;
  return jsonResponse(payload, status);
}

const analysisJobs = new Map();

// Structured logger — output visible via `wrangler tail`
function log(level, msg, data = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...data }));
}

// Save a single log entry to MinIO at logs/{date}/{ts}-{tool}.json
// Never throws — logging failures are silent (to avoid infinite loops)
function getMinioVar(env, key) {
  if (env && env[key]) return env[key];
  return '';
}

async function saveLogToMinio(env, entry) {
  if (!getMinioVar(env, 'MINIO_SECRET_KEY') || !getMinioVar(env, 'MINIO_ENDPOINT')) return;
  try {
    const date = (entry.ts || new Date().toISOString()).slice(0, 10);
    const safeTs = (entry.ts || new Date().toISOString()).replace(/[:.]/g, '-');
    const safeTool = (entry.tool || entry.msg || 'req').replace(/[^a-z0-9._-]/gi, '-').slice(0, 30);
    const key = `logs/${date}/${safeTs}-${safeTool}.json`;
    await uploadToMinIO(env, key, JSON.stringify(entry));
  } catch (_) {
    // silent — don't recurse
  }
}

function githubHeaders(env, requestToken = '') {
  const token = String(requestToken || env.GITHUB_TOKEN || '').trim();
  if (!token) {
    throw new Error('GITHUB_TOKEN is not configured');
  }

  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'drakon-mcp-worker',
  };
}

async function githubFetch(env, path, options = {}, requestToken = '') {
  const base = 'https://api.github.com';
  const resp = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...githubHeaders(env, requestToken), ...(options.headers || {}) },
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GitHub API ${resp.status}: ${err.slice(0, 200)}`);
  }

  return resp.json();
}

function b64urlEncodeJson(obj) {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecodeJson(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

async function hmacSha256Raw(key, message) {
  const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const msgBuffer = new TextEncoder().encode(message);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer));
}

async function hmacSha256Hex(key, message) {
  const sig = await hmacSha256Raw(key, message);
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, secret) {
  const data = new TextEncoder().encode(String(password) + String(secret));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function generateJWT(payload, secret, ttlMs = 7 * 24 * 60 * 60 * 1000) {
  const now = Date.now();
  const fullPayload = { ...payload, iat: now, exp: now + ttlMs };
  const header = b64urlEncodeJson({ alg: 'HS256', typ: 'JWT' });
  const body = b64urlEncodeJson(fullPayload);

  const signature = await hmacSha256Raw(secret, `${header}.${body}`);
  const signatureB64 = btoa(String.fromCharCode(...signature))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${header}.${body}.${signatureB64}`;
}

async function verifyJWT(token, secret) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expected = await hmacSha256Raw(secret, `${header}.${body}`);
    const providedBytes = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );

    if (expected.length !== providedBytes.length) return null;
    for (let i = 0; i < expected.length; i += 1) {
      if (expected[i] !== providedBytes[i]) return null;
    }

    const payload = b64urlDecodeJson(body);
    if (!payload || typeof payload !== 'object') return null;
    if (Number(payload.exp || 0) < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

async function verifyAppwriteJwt(token) {
  try {
    const resp = await fetch('https://auth.aidrakon.tech/v1/account', {
      headers: {
        'X-Appwrite-Project': '6a23420a003a04b4997b',
        'X-Appwrite-JWT': token,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    return user && user.$id ? user : null;
  } catch {
    return null;
  }
}

export async function verifyOwnerAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  // Статичний MCP API key (для Claude.ai Dashboard та інших MCP клієнтів)
  if (env.MCP_API_KEY && token === env.MCP_API_KEY) {
    return { role: 'owner', sub: 'mcp-agent' };
  }

  // Worker JWT (для owner login через /auth/login)
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (payload && payload.role === 'owner') return payload;
  } catch (_) {}

  // Appwrite JWT (для email-авторизованих користувачів)
  const appwriteUser = await verifyAppwriteJwt(token);
  if (appwriteUser) {
    return { role: 'user', sub: appwriteUser.$id, email: appwriteUser.email };
  }

  return null;
}

// Slice 3.2: declarative route-auth table, consulted once before any
// route-specific dispatch in fetch(). Derived from the exhaustive audit in
// docs/contracts/worker-route-auth-matrix-v2.md (2026-08-23). Replaces the
// old positional gate (routes textually before it got no owner check,
// routes after it always did) and closes two bug classes found by that
// audit:
//   - "weak": routes that called verifyOwnerAuth() but checked only
//     truthiness (`if (!payload)`), not `payload.role === 'owner'` -- any
//     non-owner Appwrite-authenticated user passed. Marked below with
//     "was weak".
//   - zero-auth status routes that leaked Appwrite execution logs to any
//     caller who could guess/enumerate an execution_id. Marked below with
//     "was none".
// Entries are evaluated in the SAME order the old fetch() dispatch used
// to match them, first match wins. Anything unmatched (all 39 routes that
// used to sit after the old positional gate, plus the 404 fallback)
// defaults to 'owner' -- deny by default.
const ROUTE_AUTH_TABLE = [
  { method: 'ANY', test: (m, p) => p.startsWith('/ws/room/'), auth: 'owner' },
  { method: 'ANY', test: (m, p) => p.startsWith('/v1/diagram/') && p.endsWith('/sync'), auth: 'owner' },
  { method: 'GET', test: (m, p) => p === '/health', auth: 'none' },
  { method: 'POST', test: (m, p) => p === '/auth/login', auth: 'none' },
  { method: 'GET', test: (m, p) => p === '/auth/github/start', auth: 'none' },
  { method: 'GET', test: (m, p) => p === '/auth/github/callback', auth: 'none' },
  { method: 'GET', test: (m, p) => p === '/mcp', auth: 'none' },
  { method: 'POST', test: (m, p) => p === '/mcp', auth: 'owner' }, // was weak
  { method: 'GET', test: (m, p) => p === '/v1/drakon-ir/list', auth: 'none' },
  { method: 'GET', test: (m, p) => /^\/v1\/drakon-ir\/([^/]+)$/.test(p), auth: 'none' },
  { method: 'GET', test: (m, p) => p === '/v1/notes/list', auth: 'none' },
  { method: 'GET', test: (m, p) => p === '/v1/notes/get' || p === '/v1/notes/read', auth: 'none' },
  { method: 'GET', test: (m, p) => p === '/v1/notes/graph', auth: 'none' },
  { method: 'POST', test: (m, p) => p === '/v1/notes/commit', auth: 'owner' }, // was weak
  { method: 'DELETE', test: (m, p) => p === '/v1/notes/delete', auth: 'owner' }, // was weak
  { method: 'POST', test: (m, p) => p === '/v1/notes/build-semantic-graph', auth: 'owner' }, // was weak
  { method: 'GET', test: (m, p) => p === '/v1/notes/semantic-graph-status', auth: 'owner' }, // was none
  { method: 'POST', test: (m, p) => p === '/v1/codegen', auth: 'owner' }, // was weak
  { method: 'GET', test: (m, p) => p === '/v1/codegen-status', auth: 'owner' }, // was none
  { method: 'POST', test: (m, p) => p === '/v1/compile', auth: 'owner' }, // was weak
  { method: 'GET', test: (m, p) => p === '/v1/compile-status', auth: 'owner' }, // was none
  { method: 'GET', test: (m, p) => /^\/v1\/pipeline\/stream\/([^\/]+)$/.test(p), auth: 'owner' }, // was weak
  { method: 'POST', test: (m, p) => /^\/v1\/agents\/(sonate-solidaire)\/chat$/.test(p), auth: 'none' },
  { method: 'GET', test: (m, p) => /^\/v1\/agents\/([^\/]+)\/health$/.test(p), auth: 'none' },
  { method: 'GET', test: (m, p) => p === '/v1/understand/status', auth: 'none' },
  { method: 'ANY', test: (m, p) => p === '/v1/user/config', auth: 'authenticated' },
];

function resolveRouteAuth(method, pathname) {
  for (const route of ROUTE_AUTH_TABLE) {
    if (route.method !== 'ANY' && route.method !== method) continue;
    if (route.test(method, pathname)) return route.auth;
  }
  return 'owner';
}

function s3UriEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

function encodeS3KeyForPath(key) {
  return String(key || '')
    .split('/')
    .map((seg) => s3UriEncode(seg))
    .join('/');
}

async function signS3Request(env, method, canonicalUri, queryString, payloadHash, extraCanonicalHeaders = {}) {
  const endpoint = String(getMinioVar(env, 'MINIO_ENDPOINT') || '').replace(/\/+$/, '');
  const host = new URL(endpoint).host;
  const date = new Date().toISOString().replace(/[-:]/g, '').substring(0, 15) + 'Z';
  const dateStamp = date.substring(0, 8);

  const headerPairs = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': date,
    ...extraCanonicalHeaders,
  };

  const canonicalHeaderKeys = Object.keys(headerPairs)
    .map((k) => k.toLowerCase())
    .sort();

  const canonicalHeaders = canonicalHeaderKeys
    .map((k) => `${k}:${String(headerPairs[k]).trim()}`)
    .join('\n') + '\n';

  const signedHeaders = canonicalHeaderKeys.join(';');
  const canonicalRequest = [method, canonicalUri, queryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const region = 'us-east-1';
  const service = 's3';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [algorithm, date, credentialScope, await sha256Hex(canonicalRequest)].join('\n');

  const kDate = await hmacSha256Raw(`AWS4${getMinioVar(env, 'MINIO_SECRET_KEY')}`, dateStamp);
  const kRegion = await hmacSha256Raw(kDate, region);
  const kService = await hmacSha256Raw(kRegion, service);
  const kSigning = await hmacSha256Raw(kService, 'aws4_request');
  const signature = await hmacSha256Hex(kSigning, stringToSign);

  const authorization = `${algorithm} Credential=${getMinioVar(env, 'MINIO_ACCESS_KEY')}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = {
    Authorization: authorization,
    'x-amz-date': date,
    'x-amz-content-sha256': payloadHash,
  };

  if (headerPairs['content-type']) {
    headers['Content-Type'] = headerPairs['content-type'];
  }

  return headers;
}

function ensureMinioConfig(env) {
  // Always valid since we have getMinioVar fallback
}

// S2: thin wrappers over @ai-drakon/storage's S3BlobStoreAdapter (Slice S1).
// Behavior-preserving: same env var names, same return semantics (null on
// missing GET, true on successful/already-absent PUT/DELETE), same error
// text (adapter throws "S3 X failed: ..."; rewrapped to "MinIO X failed: ..."
// to match every existing caller/log line that expects the old wording).
// The old signS3Request/encodeS3KeyForPath/sha256Hex/hmacSha256* helpers
// below are left in place, unused by these four functions now, until a
// later slice proves it's safe to remove them.
export function getBlobStore(env) {
  return new S3BlobStoreAdapter({
    endpoint: getMinioVar(env, 'MINIO_ENDPOINT'),
    bucket: getMinioVar(env, 'MINIO_BUCKET'),
    accessKeyId: getMinioVar(env, 'MINIO_ACCESS_KEY'),
    secretAccessKey: getMinioVar(env, 'MINIO_SECRET_KEY'),
  });
}

function rewrapMinioError(err) {
  return new Error(String(err && err.message).replace(/^S3 /, 'MinIO '));
}

export async function uploadToMinIO(env, key, content, contentType = 'application/json; charset=utf-8') {
  ensureMinioConfig(env);
  try {
    await getBlobStore(env).put(key, String(content), contentType);
    return true;
  } catch (err) {
    throw rewrapMinioError(err);
  }
}

export async function getFromMinIO(env, key) {
  ensureMinioConfig(env);
  try {
    return await getBlobStore(env).get(key);
  } catch (err) {
    throw rewrapMinioError(err);
  }
}

export async function deleteFromMinIO(env, key) {
  ensureMinioConfig(env);
  try {
    await getBlobStore(env).delete(key);
    return true;
  } catch (err) {
    throw rewrapMinioError(err);
  }
}

export async function listMinioKeys(env, prefix) {
  ensureMinioConfig(env);
  try {
    return await getBlobStore(env).list(prefix);
  } catch (err) {
    throw rewrapMinioError(err);
  }
}

async function handleDrakonValidateIr(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400, undefined, 'INVALID_JSON');
  }

  if (!isObject(body) || !isObject(body.ir)) {
    return errorResponse('Body must be an object with field "ir".', 400, undefined, 'BAD_REQUEST');
  }

  return jsonResponse(validateIrDeterministic(body.ir));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const IR_ITEM_TYPES = new Set([
  'action',
  'question',
  'select',
  'case',
  'header',
  'end',
  'address',
  'branch',
  'insertion',
  'input',
  'output',
  'shelf',
  'process',
  'timer',
  'duration',
]);

function buildAnalysisSummary(requestBody) {
  const preAnalyzed = PRE_ANALYZED_ANALYSIS?.summary || {};
  const requestedModules = [
    ...safeArray(requestBody?.entryPaths),
    ...safeArray(requestBody?.includeGlobs),
  ].filter(Boolean);

  const mergedModules = [...new Set([...(preAnalyzed.modules || []), ...requestedModules.map((m) => String(m))])];

  return {
    ...preAnalyzed,
    modules: mergedModules,
  };
}

function toLowerSafe(value) {
  return String(value || '').toLowerCase();
}

function formatCacheAge(generatedAtIso) {
  if (!generatedAtIso) return 'unknown';
  const generatedAtMs = Date.parse(String(generatedAtIso));
  if (!Number.isFinite(generatedAtMs)) return 'unknown';

  const diffMs = Math.max(0, Date.now() - generatedAtMs);
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function convertDiagramToIrForWorker(diagramPayload) {
  return convertDiagramToIr(isObject(diagramPayload) ? diagramPayload : { name: 'Untitled', access: 'read', params: '', items: {} });
}

function convertIrToDiagramForWorker(irPayload) {
  return convertIrToDiagram(isObject(irPayload) ? irPayload : { name: 'Untitled', access: 'public', params: [], items: {} });
}


async function analyzeGithubRepo(owner, repo, branch, env) {
  const ghToken = String(env.GITHUB_TOKEN || '').trim();
  const branchRef = branch || 'main';
  const ghHdrs = { 'User-Agent': 'drakon-mcp-worker', 'Accept': 'application/vnd.github+json' };
  if (ghToken) ghHdrs['Authorization'] = 'Bearer ' + ghToken;

  // 1. Resolve branch → tree SHA
  const branchR = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branchRef}`, { headers: ghHdrs });
  if (!branchR.ok) return { error: 'branch API: ' + branchR.status };
  const branchD = await branchR.json();
  const sha = branchD?.commit?.commit?.tree?.sha;
  if (!sha) return { error: 'no tree sha in branch response' };

  // 2. Recursive tree — all files at once
  const treeR = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`, { headers: ghHdrs });
  if (!treeR.ok) return { error: 'tree API: ' + treeR.status };
  const treeD = await treeR.json();

  const pyFiles = [], tsFiles = [];
  for (const item of (treeD.tree || [])) {
    if (item.type !== 'blob') continue;
    if (/\.py$/i.test(item.path)) {
      pyFiles.push(item.path);
      if (pyFiles.length >= 30) break;
    } else if (/\.(ts|tsx|js|jsx)$/i.test(item.path)) {
      tsFiles.push(item.path);
    }
  }

  const summary = {
    totalFiles: pyFiles.length + tsFiles.length,
    totalFunctions: 0,
    totalComponents: 0,
    pythonFiles: pyFiles.length,
    tsFiles: tsFiles.length,
    modules: [],
    detectedFlows: [],
    functions: [],
    components: [],
    diagrams: [],
    _debug: { hasToken: !!ghToken, treeSize: (treeD.tree || []).length, sha, truncated: !!treeD.truncated },
  };

  // 3. Fetch Python files and call AST analyzer microservice
  if (pyFiles.length > 0) {
    const filesToAnalyze = [];
    for (const path of pyFiles.slice(0, 15)) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branchRef}/${path}`;
      const rawR = await fetch(rawUrl, { headers: { 'User-Agent': 'drakon-mcp-worker' } });
      if (!rawR.ok) continue;
      const source = await rawR.text();
      filesToAnalyze.push({ path, source });
    }

    if (filesToAnalyze.length > 0) {
      try {
        const astR = await fetch('https://research.exodus.pp.ua/analyze-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: filesToAnalyze }),
        });
        if (astR.ok) {
          const astData = await astR.json();
          for (const fileResult of (astData.files || [])) {
            for (const diagram of (fileResult.diagrams || [])) {
              if (!diagram.error) {
                summary.diagrams.push({
                  name: diagram.name,
                  filePath: fileResult.path,
                  nodes: Object.keys(diagram.items || {}).length,
                  complexity: diagram.complexity || 1,
                  ir: diagram,
                });
                summary.totalFunctions += 1;
              }
            }
          }
        } else {
          const errText = await astR.text().catch(() => '');
          summary._astError = `AST analyzer HTTP ${astR.status}: ${errText.slice(0, 150)}`;
        }
      } catch (e) {
        summary._astError = e.message;
      }
    }
  }

  // 4. Quick TS/JS regex scan (existing approach)
  for (const path of tsFiles.slice(0, 10)) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branchRef}/${path}`;
    const rawR = await fetch(rawUrl, { headers: { 'User-Agent': 'drakon-mcp-worker' } });
    if (!rawR.ok) continue;
    const c = await rawR.text();
    const funcMatches = c.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\()/g) || [];
    summary.totalFunctions += funcMatches.length;
    const compMatches = c.match(/(?:export\s+(?:default\s+)?function\s+[A-Z]\w+|const\s+[A-Z]\w+\s*=)/g) || [];
    summary.totalComponents += compMatches.length;
    compMatches.forEach(m => {
      const name = (m.match(/[A-Z]\w+/) || [])[0];
      if (name) summary.components.push({ name, filePath: path });
    });
    if (c.includes('useEffect') || c.includes('useState')) {
      const routeName = path.split('/').pop().replace(/\.[^.]+$/, '');
      if (routeName) summary.detectedFlows.push(routeName + '-flow');
    }
  }

  summary.modules = [...new Set([...pyFiles, ...tsFiles].map(f => f.split('/')[0]))];

  const plannedDiagrams = summary.diagrams.slice(0, 8).map(d => ({
    name: d.name,
    description: `DRAKON diagram for ${d.name} (${d.nodes} nodes, complexity ${d.complexity})`,
    scope: 'function',
    estimatedComplexity: d.complexity > 5 ? 'high' : d.complexity > 2 ? 'medium' : 'low',
    ir: d.ir,
  }));

  return {
    generatedAt: new Date().toISOString(),
    summary,
    plannedDiagrams,
    sourceRepo: owner + '/' + repo,
  };
}

async function handleMcpAnalyzeCodebase(args, env) {
  const repositoryPath = String(args?.repositoryPath || '').trim();
  const owner = String(args?.owner || '').trim();
  const repo = String(args?.repo || '').trim();
  const branch = String(args?.branch || 'main').trim();

  // Real GitHub analysis mode
  if (owner && repo) {
    const ghResult = await analyzeGithubRepo(owner, repo, branch, env);
    if (ghResult.error) {
      return { error: ghResult.error };
    }
    const jobId = 'analysis-' + Date.now();
    const job = {
      jobId,
      status: 'completed',
      projectName: owner + '/' + repo,
      createdAt: new Date().toISOString(),
      summary: ghResult.summary,
      plannedDiagrams: ghResult.plannedDiagrams,
      sourceRepo: ghResult.sourceRepo,
    };
    analysisJobs.set(jobId, job);
    return { jobId, status: 'completed', summary: ghResult.summary, plannedDiagrams: ghResult.plannedDiagrams };
  }

  if (!repositoryPath) {
    return { error: 'repositoryPath or (owner + repo) is required' };
  }

  const language = ['typescript', 'javascript', 'auto'].includes(String(args?.language || ''))
    ? String(args.language)
    : 'auto';

  const scope = ['overview', 'modules', 'flows', 'procedures'].includes(String(args?.scope || ''))
    ? String(args.scope)
    : 'overview';

  const requestBody = {
    entryPaths: safeArray(args?.entryPaths).length > 0 ? safeArray(args.entryPaths) : ['src/'],
    includeGlobs: safeArray(args?.includeGlobs),
    excludeGlobs: safeArray(args?.excludeGlobs),
  };

  const summary = buildAnalysisSummary(requestBody);
  const jobId = `analysis-${Date.now()}`;
  const job = {
    jobId,
    status: 'completed',
    projectName: repositoryPath,
    createdAt: new Date().toISOString(),
    summary,
    plannedDiagrams: PRE_ANALYZED_ANALYSIS?.plannedDiagrams || [],
    request: {
      repositoryPath,
      language,
      scope,
      entryPaths: requestBody.entryPaths,
      includeGlobs: requestBody.includeGlobs,
      excludeGlobs: requestBody.excludeGlobs,
    },
  };
  analysisJobs.set(jobId, job);

  return {
    jobId,
    status: 'completed',
    summary,
  };
}

function handleMcpGetAnalysisSummary(args) {
  const jobId = String(args?.jobId || '').trim();
  if (!jobId) {
    return { error: 'jobId is required' };
  }

  const job = analysisJobs.get(jobId);
  if (!job) {
    return { error: 'not_found' };
  }

  return { job };
}

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeIrItem(input) {
  const item = isObject(input) ? input : {};
  const rawType = String(item.type || '').trim();

  return {
    type: IR_ITEM_TYPES.has(rawType) ? rawType : 'action',
    content: String(item.content || ''),
    secondary: item.secondary === undefined ? undefined : String(item.secondary),
    one: item.one === undefined || item.one === null ? undefined : String(item.one),
    two: item.two === undefined || item.two === null ? undefined : String(item.two),
    side: item.side === undefined ? undefined : String(item.side),
    flag1: item.flag1 === undefined ? undefined : Boolean(item.flag1),
    branchId: item.branchId === undefined ? undefined : String(item.branchId),
    style: isObject(item.style) ? item.style : undefined,
  };
}

function applyMutationOnIr(workingIr, mutation) {
  const op = String(mutation?.op || '').trim();
  const items = workingIr.items;

  if (op === 'renameDiagram') {
    const newName = String(mutation?.newName || '').trim();
    if (!newName) return { ok: false, reason: 'newName is required for renameDiagram' };
    workingIr.name = newName;
    return { ok: true };
  }

  const nodeId = String(mutation?.nodeId || '').trim();
  if (!nodeId) return { ok: false, reason: 'nodeId is required' };

  if (op === 'insertNode') {
    if (items[nodeId]) return { ok: false, reason: `Node already exists: ${nodeId}` };
    if (!isObject(mutation?.node)) return { ok: false, reason: 'node must be an object for insertNode' };
    items[nodeId] = sanitizeIrItem(mutation.node);
    return { ok: true };
  }

  if (!items[nodeId]) return { ok: false, reason: `Node not found: ${nodeId}` };

  if (op === 'updateNode') {
    if (!isObject(mutation?.fields)) return { ok: false, reason: 'fields must be an object for updateNode' };
    items[nodeId] = sanitizeIrItem({ ...items[nodeId], ...mutation.fields });
    return { ok: true };
  }

  if (op === 'deleteNode') {
    delete items[nodeId];
    for (const current of Object.values(items)) {
      if (!isObject(current)) continue;
      if (current.one === nodeId) delete current.one;
      if (current.two === nodeId) delete current.two;
    }
    return { ok: true };
  }

  if (op === 'setOne' || op === 'setTwo') {
    const key = op === 'setOne' ? 'one' : 'two';
    const targetId = mutation?.targetId === null ? null : String(mutation?.targetId || '').trim();
    if (targetId && !items[targetId]) {
      return { ok: false, reason: `Target node not found: ${targetId}` };
    }
    if (targetId === null || targetId === '') {
      delete items[nodeId][key];
    } else {
      items[nodeId][key] = targetId;
    }
    return { ok: true };
  }

  return { ok: false, reason: `Unsupported mutation op: ${op}` };
}

async function handleMcpMutateDiagram(args, env, request) {
  const diagramId = String(args?.diagramId || '').trim();
  const folderId = String(args?.folderId || '').trim();
  const mutations = safeArray(args?.mutations);

  if (!diagramId || !folderId) {
    return {
      success: false,
      error: 'diagramId and folderId are required',
      appliedMutations: [],
      rejectedMutations: mutations.map((m) => ({ mutation: m, reason: 'Missing required fields' })),
    };
  }

  const key = `${folderId}/${diagramId}.json`;
  const content = await getFromMinIO(env, key);
  if (!content) {
    return {
      success: false,
      error: 'Diagram not found',
      appliedMutations: [],
      rejectedMutations: mutations.map((m) => ({ mutation: m, reason: 'Diagram not found' })),
    };
  }

  const stored = JSON.parse(content);
  const working = cloneObject(stored);
  working.diagram = isObject(working.diagram) ? working.diagram : {};
  working.diagram.items = isObject(working.diagram.items) ? working.diagram.items : {};

  const ir = convertDiagramToIrForWorker(working.diagram);

  const appliedMutations = [];
  const rejectedMutations = [];

  for (const mutation of mutations) {
    const snapshot = cloneObject(ir);
    const result = applyMutationOnIr(ir, mutation || {});
    if (!result.ok) {
      rejectedMutations.push({ op: mutation, reason: result.reason || 'Unknown mutation error' });
      continue;
    }

    const validationAfterMutation = validateIrDeterministic(ir);
    if (!validationAfterMutation.valid) {
      ir.name = snapshot.name;
      ir.access = snapshot.access;
      ir.params = snapshot.params;
      ir.items = snapshot.items;
      const firstIssue = safeArray(validationAfterMutation.issues)[0];
      rejectedMutations.push({
        op: mutation,
        reason: `Mutation rejected because diagram became invalid: ${firstIssue?.message || 'validation failed'}`,
      });
      continue;
    }

    appliedMutations.push(mutation);
  }

  const validationResult = validateIrDeterministic(ir);

  const previousVersion = Number(stored?.version || stored?.diagram?.version || 0);
  const updatedVersion = appliedMutations.length > 0 ? previousVersion + 1 : previousVersion;
  working.version = updatedVersion;
  working.updatedAt = new Date().toISOString();
  working.diagram = convertIrToDiagramForWorker(ir);
  working.diagram.version = updatedVersion;

  if (appliedMutations.length > 0) {
    await uploadToMinIO(env, key, JSON.stringify(working, null, 2));

    if (env.D1_DB && request) {
      const ownerPayload = await verifyOwnerAuth(request, env);
      const appwriteConfig = {
        endpoint: (env.APPWRITE_ENDPOINT || 'https://auth.aidrakon.tech').replace(/\/v1\/?$/, ''),
        projectId: env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b',
      };
      const tenantContext = await resolveTenant(request, appwriteConfig);
      const tenantId = tenantContext?.tenantId || ownerPayload?.tenant_id || ownerPayload?.sub;

      if (tenantId) {
        const repo = new DiagramRepository(env.D1_DB, tenantId);
        const irJson = JSON.stringify(working.diagram || ir || {});
        const diagramName = String(working.diagram?.name || working.name || diagramId || 'Untitled');
        await repo.upsert({
          id: diagramId,
          project_slug: folderId,
          name: diagramName,
          ir_json: irJson,
        });
      }
    }
  }

  return {
    updatedVersion,
    appliedMutations,
    rejectedMutations,
    validationResult: {
      valid: validationResult.valid,
      issues: validationResult.issues || [],
    },
  };
}

function handleMcpDiffCodeVsDiagram() {
  return {
    status: 'not_implemented',
    plannedFor: 'step-9',
  };
}

async function handleAnalysisCodebase(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400, undefined, 'INVALID_JSON');
  }

  if (!body || typeof body !== 'object') {
    return errorResponse('Body is required', 400, undefined, 'BAD_REQUEST');
  }

  const projectName = String(body.projectName || 'Project Analysis');
  const summary = buildAnalysisSummary(body);
  const jobId = `analysis-${Date.now()}`;

  analysisJobs.set(jobId, {
    jobId,
    status: 'completed',
    projectName,
    createdAt: new Date().toISOString(),
    summary,
    plannedDiagrams: PRE_ANALYZED_ANALYSIS?.plannedDiagrams || [],
  });

  return jsonResponse({
    jobId,
    status: 'completed',
  });
}

async function handleAnalysisGetJob(jobId) {
  const job = analysisJobs.get(jobId);
  if (!job) {
    return errorResponse('Analysis job not found', 404, { jobId }, 'NOT_FOUND');
  }

  return jsonResponse(job);
}

async function handleAnalysisListJobs() {
  return jsonResponse(Array.from(analysisJobs.values()));
}

function normalizeDiagramPayload(body, folderSlug, diagramId) {
  const now = new Date().toISOString();
  const diagramData = body?.diagram || {};
  const name = String(diagramData.name || body?.name || diagramId || 'Untitled');
  const items = diagramData.items && typeof diagramData.items === 'object' ? diagramData.items : {};

  return {
    id: diagramId,
    name,
    folderId: folderSlug,
    createdAt: body?.createdAt || now,
    updatedAt: now,
    diagram: {
      ...diagramData,
      name,
      items,
    },
  };
}

async function handleAuthLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400, undefined, 'INVALID_JSON');
  }

  const username = String(body?.username || body?.email || '').trim();
  const password = String(body?.password || '');

  if (!username || !password) {
    return errorResponse('username/email and password are required', 400, undefined, 'BAD_REQUEST');
  }

  const ownerUsername = String(env.OWNER_USERNAME || 'owner');
  const ownerPasswordHash = String(env.OWNER_PASSWORD_HASH || '');
  const adminPassword = String(env.ADMIN_PASSWORD || '');

  let authenticated = false;
  if (adminPassword && password === adminPassword) {
    authenticated = true;
  } else if (ownerPasswordHash) {
    const hashHex = await hashPassword(password, env.JWT_SECRET);
    if (hashHex === ownerPasswordHash) {
      authenticated = true;
    }
  } else {
    return errorResponse('Authentication is not configured (neither OWNER_PASSWORD_HASH nor ADMIN_PASSWORD set)', 500, undefined, 'SERVER_CONFIG_ERROR');
  }

  if (username !== ownerUsername || !authenticated) {
    return errorResponse('Invalid credentials', 401, undefined, 'INVALID_CREDENTIALS');
  }

  const token = await generateJWT({ role: 'owner', sub: ownerUsername }, env.JWT_SECRET, 7 * 24 * 60 * 60 * 1000);
  return jsonResponse({ success: true, token, jwt: token, expiresInMs: 7 * 24 * 60 * 60 * 1000 });
}

async function handleDrakonCommit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400, undefined, 'INVALID_JSON');
  }

  const folderSlug = String(body?.folderSlug || body?.folder || '').trim();
  const diagramId = String(body?.diagramId || body?.name || '').trim();
  if (!folderSlug || !diagramId) {
    return errorResponse('folderSlug and diagramId are required', 400, undefined, 'BAD_REQUEST');
  }

  const normalized = normalizeDiagramPayload(body, folderSlug, diagramId);
  const key = `${folderSlug}/${diagramId}.json`;
  await uploadToMinIO(env, key, JSON.stringify(normalized, null, 2));

  if (env.D1_DB) {
    const ownerPayload = await verifyOwnerAuth(request, env);
    const appwriteConfig = {
      endpoint: (env.APPWRITE_ENDPOINT || 'https://auth.aidrakon.tech').replace(/\/v1\/?$/, ''),
      projectId: env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b',
    };
    const tenantContext = await resolveTenant(request, appwriteConfig);
    const tenantId = tenantContext?.tenantId || ownerPayload?.tenant_id || ownerPayload?.sub;

    if (tenantId) {
      const repo = new DiagramRepository(env.D1_DB, tenantId);
      const irJson = JSON.stringify(normalized.diagram || normalized);
      await repo.upsert({
        id: diagramId,
        project_slug: folderSlug,
        name: normalized.name,
        ir_json: irJson,
      });
    }
  }

  return jsonResponse({ success: true, folderSlug, diagramId, diagram: normalized });
}

async function handleDrakonGet(folderSlug, diagramId, env) {
  const key = `${folderSlug}/${diagramId}.json`;
  const content = await getFromMinIO(env, key);
  if (!content) return errorResponse('Diagram not found', 404, { folderSlug, diagramId }, 'NOT_FOUND');

  return jsonResponse({ success: true, diagram: JSON.parse(content) });
}

async function handleDrakonDelete(folderSlug, diagramId, env) {
  const key = `${folderSlug}/${diagramId}.json`;
  await deleteFromMinIO(env, key);
  return jsonResponse({ success: true, folderSlug, diagramId });
}

async function handleDrakonList(folderSlug, env) {
  const prefix = folderSlug ? `${folderSlug}/` : '';
  const keys = await listMinioKeys(env, prefix);
  const diagrams = keys
    .filter((k) => k.endsWith('.json') && !k.endsWith('meta.json'))
    .map((k) => k.split('/').pop().replace('.json', ''));

  return jsonResponse({ success: true, folderSlug, diagrams });
}

// ─── Git drn/ folder helpers ─────────────────────────────────────────────────

async function gitGetFileSha(env, owner, repo, path, branch, requestToken) {
  try {
    const data = await githubFetch(env, `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`, {}, requestToken);
    return data.sha || null;
  } catch (_) {
    return null;
  }
}

async function handleSaveDiagramToGit(args, env, requestToken) {
  const owner = String(args.owner || '').trim();
  const repo = String(args.repo || '').trim();
  const branch = String(args.branch || 'main').trim();
  const diagramId = String(args.diagramId || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 80);
  const diagram = args.diagram || {};

  if (!owner || !repo || !diagramId) {
    return { success: false, error: 'owner, repo, diagramId are required' };
  }

  const path = `drn/${diagramId}.json`;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(diagram, null, 2))));
  const sha = await gitGetFileSha(env, owner, repo, path, branch, requestToken);

  const body = {
    message: `drakon: save diagram ${diagramId}`,
    content,
    branch,
  };
  if (sha) body.sha = sha;

  await githubFetch(env, `/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, requestToken);

  return { success: true, owner, repo, branch, path, diagramId };
}

async function handleListGitDiagrams(args, env, requestToken) {
  const owner = String(args.owner || '').trim();
  const repo = String(args.repo || '').trim();
  const branch = String(args.branch || 'main').trim();

  if (!owner || !repo) return { success: false, error: 'owner, repo required' };

  let items = [];
  try {
    const data = await githubFetch(env, `/repos/${owner}/${repo}/contents/drn?ref=${encodeURIComponent(branch)}`, {}, requestToken);
    items = Array.isArray(data) ? data : [data];
  } catch (_) {
    return { success: true, owner, repo, branch, diagrams: [] };
  }

  const diagrams = items
    .filter((f) => f.type === 'file' && f.name.endsWith('.json'))
    .map((f) => f.name.replace('.json', ''));

  return { success: true, owner, repo, branch, diagrams };
}

async function handleGetGitDiagram(args, env, requestToken) {
  const owner = String(args.owner || '').trim();
  const repo = String(args.repo || '').trim();
  const branch = String(args.branch || 'main').trim();
  const diagramId = String(args.diagramId || '').trim();

  if (!owner || !repo || !diagramId) return { success: false, error: 'owner, repo, diagramId required' };

  const path = `drn/${diagramId}.json`;
  const data = await githubFetch(env, `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`, {}, requestToken);
  const content = JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))));
  return { success: true, owner, repo, branch, diagramId, diagram: content };
}

async function handleGithubListTree(args, env, requestToken = '') {
  const owner = String(args?.owner || '').trim();
  const repo = String(args?.repo || '').trim();
  const path = String(args?.path || '').trim();
  const branch = String(args?.branch || 'main').trim();

  if (!owner || !repo) {
    return { success: false, error: 'owner and repo required' };
  }

  const data = await githubFetch(
    env,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    {},
    requestToken,
  );
  const entries = Array.isArray(data) ? data : [data];

  return {
    success: true,
    owner,
    repo,
    path,
    branch,
    entries: entries.map((entry) => ({
      name: entry.name,
      path: entry.path,
      type: entry.type === 'dir' ? 'dir' : 'file',
      size: entry.size || 0,
      downloadUrl: entry.download_url || null,
    })),
  };
}

async function handleGithubGetFile(args, env, requestToken = '') {
  const owner = String(args?.owner || '').trim();
  const repo = String(args?.repo || '').trim();
  const path = String(args?.path || '').trim();
  const branch = String(args?.branch || 'main').trim();

  if (!owner || !repo || !path) {
    return { success: false, error: 'owner, repo, path required' };
  }

  const data = await githubFetch(
    env,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    {},
    requestToken,
  );
  const content = data.encoding === 'base64'
    ? new TextDecoder('utf-8').decode(Uint8Array.from(atob((data.content || '').replace(/\n/g, '')), c => c.charCodeAt(0)))
    : String(data.content || '');

  return {
    success: true,
    path: data.path,
    name: data.name,
    size: data.size,
    sha: data.sha,
    content,
    encoding: 'utf-8',
  };
}

async function handleGithubCommitFile(args, env, requestToken = '') {
  const owner = String(args?.owner || '').trim();
  const repo = String(args?.repo || '').trim();
  const path = String(args?.path || '').trim();
  const content = String(args?.content || '');
  const message = String(args?.message || 'Update via DRAKON MCP').trim();
  const branch = String(args?.branch || 'main').trim();

  if (!owner || !repo || !path) {
    return { success: false, error: 'owner, repo, path required' };
  }

  let sha;
  try {
    const existing = await githubFetch(
      env,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`,
      {},
      requestToken,
    );
    sha = existing.sha;
  } catch {
    sha = undefined;
  }

  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
    ...(sha ? { sha } : {}),
  };

  const result = await githubFetch(
    env,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
    { method: 'PUT', body: JSON.stringify(body) },
    requestToken,
  );

  return {
    success: true,
    path: result.content?.path,
    sha: result.content?.sha,
    commitSha: result.commit?.sha,
    commitUrl: result.commit?.html_url,
  };
}

async function handleGithubDeleteFile(args, env, requestToken = '') {
  const owner = String(args?.owner || '').trim();
  const repo = String(args?.repo || '').trim();
  const path = String(args?.path || '').trim();
  const branch = String(args?.branch || 'main').trim();

  if (!owner || !repo || !path) {
    return { success: false, error: 'owner, repo, path required' };
  }

  let sha;
  try {
    const existing = await githubFetch(
      env,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`,
      {},
      requestToken,
    );
    sha = existing.sha;
  } catch (err) {
    return { success: false, error: 'File not found on GitHub: ' + err.message };
  }

  const body = {
    message: `delete(${path.split('/').pop()}): delete via Garden`,
    branch,
    sha,
  };

  const result = await githubFetch(
    env,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
    { method: 'DELETE', body: JSON.stringify(body) },
    requestToken,
  );

  return {
    success: true,
    commitSha: result.commit?.sha,
  };
}

async function handleGithubListBranches(args, env, requestToken = '') {
  const owner = String(args?.owner || '').trim();
  const repo = String(args?.repo || '').trim();

  if (!owner || !repo) {
    return { success: false, error: 'owner and repo required' };
  }

  const data = await githubFetch(
    env,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`,
    {},
    requestToken,
  );

  return {
    success: true,
    branches: Array.isArray(data) ? data.map((branch) => branch.name) : [],
  };
}

// ─── Agent MCP helpers ────────────────────────────────────────────────────────
async function mcpCallAgent(agentId, message, context, env, ctx) {
  const defaultUrls = {
    drakon: env.DRAKON_AGENT_URL || 'https://drakon-agent.exodus.pp.ua',
    architect: env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua',
    docs: env.DOCS_AGENT_URL || 'https://docs-agent.exodus.pp.ua',
  };
  const targetUrl = defaultUrls[agentId];
  const usesAnalyze = agentId === 'drakon' && isPythonCode(message);
  const endpoint = usesAnalyze ? '/analyze' : '/chat';
  const agentBody = usesAnalyze
    ? JSON.stringify({ code: message, refine: true })
    : JSON.stringify({ message, context: context || null });
  try {
    const agentResp = await fetch(targetUrl + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: agentBody,
      signal: AbortSignal.timeout(90_000),
    });
    const rawText = await agentResp.text();
    let data;
    try { data = JSON.parse(rawText); } catch {
      return { error: 'Agent non-JSON (HTTP ' + agentResp.status + '): ' + rawText.slice(0, 200) };
    }
    if (!agentResp.ok) {
      return { error: data.detail || data.error || ('Agent HTTP ' + agentResp.status), ...data };
    }
    return data;
  } catch (e) {
    return { error: 'Agent unreachable: ' + e.message };
  }
}

async function mcpCallPipeline(endpoint, body, env) {
  const architectUrl = env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua';
  try {
    const resp = await fetch(architectUrl + '/pipeline/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const rawText = await resp.text();
    try { return JSON.parse(rawText); } catch {
      return { error: 'Pipeline non-JSON: ' + rawText.slice(0, 200) };
    }
  } catch (e) {
    return { error: 'Pipeline unreachable: ' + e.message };
  }
}

async function mcpGetPipelineStatus(jobId, env) {
  const architectUrl = env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua';
  try {
    const resp = await fetch(architectUrl + '/pipeline/status/' + encodeURIComponent(jobId), {
      signal: AbortSignal.timeout(15_000),
    });
    const rawText = await resp.text();
    try { return JSON.parse(rawText); } catch {
      return { error: 'Status non-JSON: ' + rawText.slice(0, 100) };
    }
  } catch (e) {
    return { error: 'Pipeline unreachable: ' + e.message };
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// Dataview / docs knowledge base tools

const DOCS_AGENT_BASE = 'https://docs-agent.exodus.pp.ua';

async function handleDocsDataviewQuery(query, env) {
  try {
    const resp = await fetch(`${DOCS_AGENT_BASE}/docs/dataview/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const rawText = await resp.text();
    let data;
    try { data = JSON.parse(rawText); } catch { return { error: `docs-agent parse error: ${rawText.slice(0, 200)}` }; }
    if (!resp.ok) return { error: `docs-agent HTTP ${resp.status}`, detail: data };
    return data;
  } catch (e) {
    return { error: 'docs-agent unreachable: ' + e.message };
  }
}

async function handleDocsWikilink(link, env) {
  try {
    const url = `${DOCS_AGENT_BASE}/docs/wikilink?link=${encodeURIComponent(link)}`;
    const resp = await fetch(url);
    const rawText = await resp.text();
    let data;
    try { data = JSON.parse(rawText); } catch { return { error: `docs-agent parse error: ${rawText.slice(0, 200)}` }; }
    if (!resp.ok) return { error: `docs-agent HTTP ${resp.status}`, detail: data };
    return data;
  } catch (e) {
    return { error: 'docs-agent unreachable: ' + e.message };
  }
}

async function handleDocsBacklinks(link, env) {
  try {
    const url = `${DOCS_AGENT_BASE}/docs/backlinks?link=${encodeURIComponent(link)}`;
    const resp = await fetch(url);
    const rawText = await resp.text();
    let data;
    try { data = JSON.parse(rawText); } catch { return { error: `docs-agent parse error: ${rawText.slice(0, 200)}` }; }
    if (!resp.ok) return { error: `docs-agent HTTP ${resp.status}`, detail: data };
    return data;
  } catch (e) {
    return { error: 'docs-agent unreachable: ' + e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function getMcpTools() {
  return [
    {
      name: 'drakon.listdiagrams',
      description: 'List all available DRAKON diagram identifiers inside a specific folder namespace in storage so agents can discover existing assets before reading, mutating, validating, diffing, or saving any diagram content.',
      inputSchema: {
        type: 'object',
        properties: {
          folderSlug: { type: 'string' },
        },
        required: ['folderSlug'],
      },
    },
    {
      name: 'drakon.getdiagram',
      description: 'Load one stored DRAKON diagram JSON document by folder and diagram id, returning the canonical persisted structure needed for editor hydration, validation checks, mutation planning, and downstream analysis workflows.',
      inputSchema: {
        type: 'object',
        properties: {
          folderSlug: { type: 'string' },
          diagramId: { type: 'string' },
        },
        required: ['folderSlug', 'diagramId'],
      },
    },
    {
      name: 'drakon.savediagram',
      description: 'Create or update a full DRAKON diagram JSON payload in storage when a client wants authoritative persistence after edits, preserving compatibility with current diagram CRUD flows and existing integrations.',
      inputSchema: {
        type: 'object',
        properties: {
          folderSlug: { type: 'string' },
          diagramId: { type: 'string' },
          diagram: { type: 'object' },
        },
        required: ['folderSlug', 'diagramId', 'diagram'],
      },
    },
    {
      name: 'drakon.deletediagram',
      description: 'Delete one DRAKON diagram JSON object from storage by folder and diagram id, allowing cleanup of obsolete assets while keeping the existing diagram lifecycle API unchanged for current clients.',
      inputSchema: {
        type: 'object',
        properties: {
          folderSlug: { type: 'string' },
          diagramId: { type: 'string' },
        },
        required: ['folderSlug', 'diagramId'],
      },
    },
    {
      name: 'drakon.validateir',
      description: 'Run deterministic canonical IR validation before rendering or persistence to detect structural issues like dangling pointers, invalid node types, orphan nodes, and malformed transition vectors in AI-generated graphs.',
      inputSchema: {
        type: 'object',
        properties: {
          ir: { type: 'object' },
        },
        required: ['ir'],
      },
    },
    {
      name: 'drakon.analyzecodebase',
      description: 'Analyze a TypeScript or JavaScript project request context and return a structural summary plus planned DRAKON diagrams, including job tracking metadata that can drive AI planning, orchestration, and staged generation flows.',
      inputSchema: {
        type: 'object',
        properties: {
          repositoryPath: { type: 'string' },
          language: {
            type: 'string',
            enum: ['typescript', 'javascript', 'auto'],
            default: 'auto',
          },
          scope: {
            type: 'string',
            enum: ['overview', 'modules', 'flows', 'procedures'],
            default: 'overview',
          },
          entryPaths: {
            type: 'array',
            items: { type: 'string' },
            default: ['src/'],
          },
          includeGlobs: {
            type: 'array',
            items: { type: 'string' },
          },
          excludeGlobs: {
            type: 'array',
            items: { type: 'string' },
          },
          owner: { type: 'string', description: 'GitHub owner for live repo analysis' },
          repo: { type: 'string', description: 'GitHub repo name for live analysis' },
          branch: { type: 'string', default: 'main' },
        },
        required: [],
      },
    },
    {
      name: 'drakon.getanalysissummary',
      description: 'Get the result payload of a previously started analysis job by job identifier, returning full job metadata and summary content or an explicit not_found error for missing analysis records.',
      inputSchema: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
        },
        required: ['jobId'],
      },
    },
    {
      name: 'drakon.mutatediagram',
      description: 'Apply FIFO granular patch mutations to an existing diagram using IR conversion and deterministic validation after each step, persisting only accepted operations while returning detailed applied and rejected mutation diagnostics.',
      inputSchema: {
        type: 'object',
        properties: {
          diagramId: { type: 'string' },
          folderId: { type: 'string' },
          mutations: {
            type: 'array',
            items: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    op: { type: 'string', enum: ['insertNode'] },
                    nodeId: { type: 'string' },
                    node: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: Array.from(IR_ITEM_TYPES) },
                        content: { type: 'string' },
                        secondary: { type: 'string' },
                        one: { type: 'string' },
                        two: { type: 'string' },
                        side: { type: 'string' },
                        flag1: { type: 'boolean' },
                        branchId: { type: 'string' },
                        style: { type: 'object' },
                      },
                      required: ['type', 'content'],
                    },
                  },
                  required: ['op', 'nodeId', 'node'],
                },
                {
                  type: 'object',
                  properties: {
                    op: { type: 'string', enum: ['updateNode'] },
                    nodeId: { type: 'string' },
                    fields: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: Array.from(IR_ITEM_TYPES) },
                        content: { type: 'string' },
                        secondary: { type: 'string' },
                        one: { type: 'string' },
                        two: { type: 'string' },
                        side: { type: 'string' },
                        flag1: { type: 'boolean' },
                        branchId: { type: 'string' },
                        style: { type: 'object' },
                      },
                    },
                  },
                  required: ['op', 'nodeId', 'fields'],
                },
                {
                  type: 'object',
                  properties: {
                    op: { type: 'string', enum: ['deleteNode'] },
                    nodeId: { type: 'string' },
                  },
                  required: ['op', 'nodeId'],
                },
                {
                  type: 'object',
                  properties: {
                    op: { type: 'string', enum: ['setOne', 'setTwo'] },
                    nodeId: { type: 'string' },
                    targetId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  },
                  required: ['op', 'nodeId', 'targetId'],
                },
                {
                  type: 'object',
                  properties: {
                    op: { type: 'string', enum: ['renameDiagram'] },
                    newName: { type: 'string' },
                  },
                  required: ['op', 'newName'],
                },
              ],
            },
          },
        },
        required: ['diagramId', 'folderId', 'mutations'],
      },
    },
    {
      name: 'drakon.diffcodevsdiagram',
      description: 'Compare a completed code analysis job summary with selected existing diagrams to identify coverage gaps and mismatches; currently returns a not_implemented stub reserved for the planned step-9 implementation.',
      inputSchema: {
        type: 'object',
        properties: {
          analysisJobId: { type: 'string' },
          diagramIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['analysisJobId', 'diagramIds'],
      },
    },
    {
      name: 'drakon.savetogit',
      description: 'Save a DRAKON diagram JSON to the drn/ folder in a GitHub repository (creates or updates drn/{diagramId}.json). Requires a GitHub token with write access passed via X-Github-Token header or env.',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' },
          branch: { type: 'string', default: 'main' },
          diagramId: { type: 'string' },
          diagram: { type: 'object' },
        },
        required: ['owner', 'repo', 'diagramId', 'diagram'],
      },
    },
    {
      name: 'drakon.listgitdiagrams',
      description: 'List DRAKON diagrams saved in the drn/ folder of a GitHub repository.',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' },
          branch: { type: 'string', default: 'main' },
        },
        required: ['owner', 'repo'],
      },
    },
    {
      name: 'drakon.getgitdiagram',
      description: 'Fetch a single DRAKON diagram from drn/{diagramId}.json in a GitHub repository.',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' },
          branch: { type: 'string', default: 'main' },
          diagramId: { type: 'string' },
        },
        required: ['owner', 'repo', 'diagramId'],
      },
    },
    {
      name: 'github.listtree',
      description: 'List files and directories for a GitHub repository path so an agent can explore project structure before analysis, select target modules safely, and receive normalized entries with path, type, size, and optional download URL.',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' },
          path: { type: 'string', default: '' },
          branch: { type: 'string', default: 'main' },
        },
        required: ['owner', 'repo'],
      },
    },
    {
      name: 'github.getfile',
      description: 'Read one specific file from a GitHub repository and return decoded UTF-8 text content with metadata, which should be used when the model needs to inspect implementation details before generating diagrams or analysis artifacts.',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' },
          path: { type: 'string' },
          branch: { type: 'string', default: 'main' },
        },
        required: ['owner', 'repo', 'path'],
      },
    },
    {
      name: 'github.commitfile',
      description: 'Create or update a repository file in GitHub by committing plain-text content to a branch, useful for writing generated DRAKON outputs or analysis reports back into version control with commit metadata returned.',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' },
          path: { type: 'string' },
          content: { type: 'string' },
          message: { type: 'string' },
          branch: { type: 'string', default: 'main' },
        },
        required: ['owner', 'repo', 'path', 'content', 'message'],
      },
    },
    {
      name: 'github.listbranches',
      description: 'List all branch names in a GitHub repository so a user or agent can choose the correct branch context for browsing files, reading code, committing outputs, and running branch-specific analysis workflows.',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' },
        },
        required: ['owner', 'repo'],
      },
    },
    {
      name: 'docs.chat',
      description: 'Send a message to the documentation agent (Документознавець) to get structured Markdown documentation for code modules, functions, or architecture. Responds in Ukrainian. Use before creating DRAKON diagrams to build project context.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Question or code to document' },
          context: { type: 'object', description: 'Optional: { currentDoc, fileTree }' },
        },
        required: ['message'],
      },
    },
    {
      name: 'architect.chat',
      description: 'Send a message to the architect agent to get structural analysis, module relationship mapping, or architecture planning. Returns analysis with file-tree context and diagram recommendations.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          context: { type: 'object', description: 'Optional: { fileTree, currentDiagram }' },
        },
        required: ['message'],
      },
    },
    {
      name: 'architect.analyze',
      description: 'Submit Python source code to the architect LangGraph pipeline for deep structural analysis. Async — returns job_id immediately. Pipeline: cyclomatic complexity → call graph → behavioral YAML → DRAKON IR. Poll with architect.jobstatus.',
      inputSchema: {
        type: 'object',
        properties: {
          source_code: { type: 'string', description: 'Python source code to analyze' },
          file_path: { type: 'string', description: 'File path hint (e.g. "bot/handlers.py")', default: 'module.py' },
        },
        required: ['source_code'],
      },
    },
    {
      name: 'architect.jobstatus',
      description: 'Poll the status of an architect.analyze job. Returns status (running|done|error) and when done: drakon_ir array ready to pass to drakon.savediagram.',
      inputSchema: {
        type: 'object',
        properties: {
          job_id: { type: 'string' },
        },
        required: ['job_id'],
      },
    },
    {
      name: 'drakon.agentchat',
      description: 'Send a message or Python code to the drakon-agent. Python code is auto-detected and sent to /analyze which returns DRAKON IR diagrams. Other messages go to /chat for diagram questions and feedback.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message text or Python source code' },
          context: { type: 'object' },
        },
        required: ['message'],
      },
    },
    {
      name: 'docs.query',
      description: 'Execute a DQL (Dataview Query Language) query against the project knowledge base. Supports LIST/TABLE with FROM (tag/folder/field), WHERE, SORT, LIMIT. Examples: "LIST FROM #architecture", "TABLE title, status FROM type = \\"plan\\" WHERE status = \\"active\\"", "LIST WHERE contains(tags, \\"pipeline\\") SORT file.mtime DESC LIMIT 5"',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'DQL query string' },
        },
        required: ['query'],
      },
    },
    {
      name: 'docs.wikilink',
      description: 'Read the full content of a project document by wiki-link. Returns frontmatter metadata + document body. Use after docs.query to read specific documents.',
      inputSchema: {
        type: 'object',
        properties: {
          link: { type: 'string', description: 'Wiki link target, e.g. "concept/03-architecture" or "plans/2026-05-15-pipeline"' },
        },
        required: ['link'],
      },
    },
    {
      name: 'docs.backlinks',
      description: 'Find all project documents that link to the specified document via [[wiki-links]]. Useful for understanding dependencies and document relationships.',
      inputSchema: {
        type: 'object',
        properties: {
          link: { type: 'string', description: 'Wiki link target to find backlinks for' },
        },
        required: ['link'],
      },
    },
  ];
}

function toolResultJson(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
  };
}

async function handleMcp(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON-RPC payload', 400, undefined, 'INVALID_JSON');
  }

  const id = body?.id ?? null;
  const method = body?.method;
  const params = body?.params || {};

  if (method === 'notifications/initialized' || (method && method.startsWith('notifications/'))) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Github-Token',
      }
    });
  }

  if (method === 'initialize') {
    return jsonResponse({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'drakon-mcp-service',
          version: '1.0.0',
        },
        capabilities: {
          tools: {},
        },
      },
    });
  }

  if (method === 'tools/list') {
    return jsonResponse({ jsonrpc: '2.0', id, result: { tools: getMcpTools() } });
  }

  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};
    const requestToken = request.headers.get('X-Github-Token') || '';
    const t0 = Date.now();
    log('info', 'tool.call', { tool: name, hasGhToken: !!requestToken, folderSlug: args.folderSlug, diagramId: args.diagramId, owner: args.owner, repo: args.repo });
    try {

    if (name === 'drakon.listdiagrams') {
      const result = await handleDrakonList(String(args.folderSlug || ''), env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(await result.json()) });
    }

    if (name === 'drakon.getdiagram') {
      const result = await handleDrakonGet(String(args.folderSlug || ''), String(args.diagramId || ''), env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(await result.json()) });
    }

    if (name === 'drakon.savediagram') {
      const authHeader = request.headers.get('Authorization');
      const fakeHeaders = { 'Content-Type': 'application/json' };
      if (authHeader) fakeHeaders['Authorization'] = authHeader;
      const fakeRequest = new Request('https://internal.local/commit', {
        method: 'POST',
        headers: fakeHeaders,
        body: JSON.stringify({
          folderSlug: String(args.folderSlug || ''),
          diagramId: String(args.diagramId || ''),
          diagram: args.diagram || {},
        }),
      });
      const minioResult = await handleDrakonCommit(fakeRequest, env);
      const minioData = await minioResult.json();
      // Also save to git drn/ if owner+repo provided
      let gitResult = null;
      if (args.owner && args.repo) {
        gitResult = await handleSaveDiagramToGit({
          owner: args.owner,
          repo: args.repo,
          branch: args.branch || 'main',
          diagramId: String(args.diagramId || ''),
          diagram: args.diagram || {},
        }, env, requestToken);
      }
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson({ ...minioData, git: gitResult }) });
    }

    if (name === 'drakon.deletediagram') {
      const result = await handleDrakonDelete(String(args.folderSlug || ''), String(args.diagramId || ''), env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(await result.json()) });
    }

    if (name === 'drakon.validateir') {
      const result = validateIrDeterministic(args.ir || {});
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'drakon.analyzecodebase') {
      const result = await handleMcpAnalyzeCodebase(args, env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'drakon.getanalysissummary') {
      const result = handleMcpGetAnalysisSummary(args);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'drakon.mutatediagram') {
      const result = await handleMcpMutateDiagram(args, env, request);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'drakon.diffcodevsdiagram') {
      const result = handleMcpDiffCodeVsDiagram(args);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'drakon.savetogit') {
      const result = await handleSaveDiagramToGit(args, env, requestToken);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'drakon.listgitdiagrams') {
      const result = await handleListGitDiagrams(args, env, requestToken);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'drakon.getgitdiagram') {
      const result = await handleGetGitDiagram(args, env, requestToken);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'github.listtree') {
      const result = await handleGithubListTree(args, env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'github.getfile') {
      const result = await handleGithubGetFile(args, env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'github.commitfile') {
      const result = await handleGithubCommitFile(args, env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'github.listbranches') {
      const result = await handleGithubListBranches(args, env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'docs.chat') {
      const result = await mcpCallAgent('docs', String(args.message || ''), args.context || null, env, ctx);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'architect.chat') {
      const result = await mcpCallAgent('architect', String(args.message || ''), args.context || null, env, ctx);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'architect.analyze') {
      const result = await mcpCallPipeline('analyze', {
        source_code: String(args.source_code || ''),
        file_path: String(args.file_path || 'module.py'),
      }, env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'architect.jobstatus') {
      const result = await mcpGetPipelineStatus(String(args.job_id || ''), env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'drakon.agentchat') {
      const result = await mcpCallAgent('drakon', String(args.message || ''), args.context || null, env, ctx);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'docs.query') {
      const result = await handleDocsDataviewQuery(String(args.query || ''), env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'docs.wikilink') {
      const result = await handleDocsWikilink(String(args.link || ''), env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'docs.backlinks') {
      const result = await handleDocsBacklinks(String(args.link || ''), env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    log('warn', 'tool.unknown', { tool: name, ms: Date.now() - t0 });
    return jsonResponse({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } }, 404);

    } catch (err) {
      const entry = { ts: new Date().toISOString(), level: 'error', tool: name, ms: Date.now() - t0, error: err.message, stack: (err.stack || '').slice(0, 400) };
      log('error', 'tool.error', entry);
      if (ctx) ctx.waitUntil(saveLogToMinio(env, entry));
      return jsonResponse({ jsonrpc: '2.0', id, error: { code: -32603, message: err.message } }, 500);
    }
  }

  return jsonResponse({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } }, 404);
}

async function handleHealth(env) {
  return jsonResponse({
    success: true,
    status: 'ok',
    service: 'drakon-mcp-worker',
    timestamp: new Date().toISOString(),
    features: ['auth', 'minio-s3', 'drakon-rest', 'mcp-jsonrpc'],
    storage: {
      endpoint: env && env.MINIO_ENDPOINT ? env.MINIO_ENDPOINT : 'not configured',
      bucket: env && env.MINIO_BUCKET ? env.MINIO_BUCKET : 'not configured',
      ssl: env && env.MINIO_USE_SSL ? env.MINIO_USE_SSL : 'true',
    },
  });
}

// ============================================
// AGENT PROXY — /v1/agents/:agentId/chat
// Proxies chat requests to the configured agent URL.
// Logs each request to MinIO (agent, ms, status).
// ============================================

const VALID_AGENT_IDS = ['drakon', 'architect', 'docs', 'sonate-solidaire'];
const DOCS_AGENT_URL = 'https://docs-agent.exodus.pp.ua';

function isPythonCode(msg) {
  return /\bdef\s+\w+\s*\(|class\s+\w+[\s:(]|^import\s+\w+|^from\s+\w+\s+import|async\s+def\s+\w+/m.test(msg);
}

async function handleAgentChat(agentId, request, env, ctx) {
  if (!VALID_AGENT_IDS.includes(agentId)) {
    return errorResponse('Unknown agent: ' + agentId, 404, undefined, 'NOT_FOUND');
  }

  let body;
  try { body = await request.json(); } catch {
    return errorResponse('Invalid JSON', 400, undefined, 'INVALID_JSON');
  }

  const { message, context, agentUrl, llmConfig } = body;
  if (!message || typeof message !== 'string') {
    return errorResponse('message is required', 400, undefined, 'MISSING_FIELD');
  }

  // agentUrl from client (from Settings), fallback to env vars
  const architectUrl = env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua';
  const defaultUrls = {
    drakon: env.DRAKON_AGENT_URL || 'https://drakon-agent.exodus.pp.ua',
    architect: architectUrl,
    docs: env.DOCS_AGENT_URL || 'https://docs-agent.exodus.pp.ua',
    'sonate-solidaire': architectUrl,
  };
  const targetUrl = (typeof agentUrl === 'string' && agentUrl.startsWith('https://'))
    ? agentUrl
    : defaultUrls[agentId];

  // Route: DRAKON + Python → /analyze; multi-agent IDs → /agents/{id}/chat; else → /chat
  const usesAnalyze = agentId === 'drakon' && isPythonCode(message);
  const usesAgentRoute = ['sonate-solidaire'].includes(agentId);
  const endpoint = usesAnalyze ? '/analyze' : usesAgentRoute ? `/agents/${agentId}/chat` : '/chat';
  const agentBody = usesAnalyze
    ? JSON.stringify({ code: message, refine: true, llmConfig: llmConfig || null })
    : JSON.stringify({ message, context: context || null, llmConfig: llmConfig || null });

  const t0 = Date.now();
  let agentResp;
  try {
    agentResp = await fetch(targetUrl + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: agentBody,
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    ctx.waitUntil(saveLogToMinio(env, {
      ts: new Date().toISOString(), level: 'error',
      tool: 'agent.' + agentId + '.chat',
      agentUrl: targetUrl, endpoint, error: String(e.message),
    }));
    return errorResponse('Agent unreachable: ' + e.message, 502, undefined, 'AGENT_UNREACHABLE');
  }

  const ms = Date.now() - t0;
  let data;
  let rawText = '';
  try {
    rawText = await agentResp.text();
    data = JSON.parse(rawText);
  } catch {
    return errorResponse(
      'Agent error (HTTP ' + agentResp.status + '): ' + rawText.slice(0, 200),
      502,
      undefined,
      'AGENT_BAD_RESPONSE'
    );
  }

  ctx.waitUntil(saveLogToMinio(env, {
    ts: new Date().toISOString(),
    level: agentResp.ok ? 'info' : 'warn',
    tool: 'agent.' + agentId + '.chat',
    agentUrl: targetUrl, endpoint,
    httpStatus: agentResp.status, ms,
    replyLen: typeof data.reply === 'string' ? data.reply.length : 0,
    hasDiagrams: Array.isArray(data.diagrams) && data.diagrams.length > 0,
  }));

  return jsonResponse(data, agentResp.status);
}

async function handleAgentHealth(agentId, env) {
  if (!VALID_AGENT_IDS.includes(agentId)) {
    return errorResponse('Unknown agent: ' + agentId, 404, undefined, 'NOT_FOUND');
  }
  const defaultUrls = {
    drakon: env.DRAKON_AGENT_URL || 'https://drakon-agent.exodus.pp.ua',
    architect: env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua',
    docs: env.DOCS_AGENT_URL || 'https://docs-agent.exodus.pp.ua',
  };
  try {
    const resp = await fetch(defaultUrls[agentId] + '/health', {
      signal: AbortSignal.timeout(5_000),
    });
    const data = await resp.json().catch(() => ({}));
    return jsonResponse({ ok: resp.ok, status: resp.status, agent: agentId, ...data });
  } catch (e) {
    return jsonResponse({ ok: false, agent: agentId, error: e.message }, 503);
  }
}



// User config handlers
async function handleUserConfigGet(request, env) {
  const payload = await verifyOwnerAuth(request, env);
  if (!payload) return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
  const userId = (payload.sub || payload.email || 'default').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `users/${userId}/config.json`;
  try {
    const data = await getFromMinIO(env, key);
    if (!data) return jsonResponse({ success: true, config: null });
    return jsonResponse({ success: true, config: JSON.parse(data) });
  } catch (_) {
    return jsonResponse({ success: true, config: null });
  }
}

async function handleUserConfigPut(request, env) {
  const payload = await verifyOwnerAuth(request, env);
  if (!payload) return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
  const userId = (payload.sub || payload.email || 'default').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `users/${userId}/config.json`;
  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON', 400); }
  await uploadToMinIO(env, key, JSON.stringify(body));
  return jsonResponse({ success: true });
}

async function handleGithubAuthStart(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return errorResponse('Missing Appwrite JWT token', 400);
  }

  // Verify the Appwrite token to get the user ID
  const appwriteUser = await verifyAppwriteJwt(token);
  if (!appwriteUser || !appwriteUser.$id) {
    return errorResponse('Invalid Appwrite token', 401);
  }

  const userId = appwriteUser.$id;

  // Determine redirect URL after callback is finished
  let redirectUrl = 'https://aidrakon.tech/settings';
  const referer = request.headers.get('Referer');
  if (referer) {
    try {
      const refUrl = new URL(referer);
      if (refUrl.hostname === 'localhost' || refUrl.hostname.endsWith('aidrakon.tech') || refUrl.hostname.endsWith('pages.dev')) {
        refUrl.pathname = '/settings';
        refUrl.search = '';
        redirectUrl = refUrl.toString();
      }
    } catch (_) {}
  }

  const popup = url.searchParams.get('popup') === 'true';

  // Generate state token
  const statePayload = {
    userId,
    userAppwriteJwt: token,
    redirectUrl,
    popup
  };

  const state = await generateJWT(statePayload, env.JWT_SECRET, 10 * 60 * 1000); // 10 min TTL

  const clientId = env.GITHUB_APP_CLIENT_ID;
  if (!clientId) {
    return errorResponse('GITHUB_APP_CLIENT_ID is not configured on the server', 500);
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&state=${encodeURIComponent(state)}`;

  return new Response(null, {
    status: 302,
    headers: {
      'Location': githubAuthUrl,
      'Access-Control-Allow-Origin': '*',
    }
  });
}

async function handleGithubAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return errorResponse('Missing code or state', 400);
  }

  // Verify state
  let statePayload;
  try {
    statePayload = await verifyJWT(state, env.JWT_SECRET);
  } catch (_) {
    return errorResponse('State verification failed', 400);
  }

  if (!statePayload || !statePayload.userId) {
    return errorResponse('Invalid or expired state payload', 400);
  }

  const { userId, userAppwriteJwt, redirectUrl, popup } = statePayload;

  // Exchange code for access token
  let tokenData;
  try {
    tokenData = await exchangeGithubCode(env, code);
  } catch (err) {
    return errorResponse(err.message, 400);
  }

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return errorResponse('OAuth token exchange did not return an access token', 400);
  }

  // Fetch GitHub login info
  let githubLogin = '';
  try {
    const userProfile = await fetchGithubUser(accessToken);
    githubLogin = userProfile.login;
  } catch (err) {
    console.error('Failed to fetch github user login:', err);
  }

  // Save to Appwrite user_profiles
  const appwriteEndpoint = env.APPWRITE_ENDPOINT || 'https://auth.aidrakon.tech/v1';
  const appwriteProjectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const appwriteApiKey = env.APPWRITE_API_KEY;

  const docUrl = `${appwriteEndpoint}/databases/ai-drakon/collections/user_profiles/documents/${userId}`;

  const headers = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': appwriteProjectId,
  };
  if (appwriteApiKey) {
    headers['X-Appwrite-Key'] = appwriteApiKey;
  } else if (userAppwriteJwt) {
    headers['X-Appwrite-JWT'] = userAppwriteJwt;
  }

  try {
    const patchResp = await fetch(docUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        data: {
          githubLogin: githubLogin || '',
          githubToken: accessToken
        }
      })
    });

    if (patchResp.status === 404) {
      // Document doesn't exist, create it (POST)
      const createUrl = `${appwriteEndpoint}/databases/ai-drakon/collections/user_profiles/documents`;
      const postResp = await fetch(createUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          documentId: userId,
          "$permissions": ["read(\"user:" + userId + "\")", "update(\"user:" + userId + "\")"],
          data: {
            userId: userId,
            teamId: userId,
            displayName: githubLogin || 'User',
            githubLogin: githubLogin || '',
            githubToken: accessToken,
            locale: 'en',
            createdAt: new Date().toISOString()
          }
        })
      });
      if (!postResp.ok) {
        const errText = await postResp.text();
        console.error(`Failed to create user_profile in Appwrite (status ${postResp.status}):`, errText);
      }
    } else if (!patchResp.ok) {
      const errText = await patchResp.text();
      console.error(`Failed to patch user_profile in Appwrite (status ${patchResp.status}):`, errText);
    }
  } catch (err) {
    console.error('Failed to write GitHub token to Appwrite:', err);
  }

  if (popup) {
    return new Response(
      `<html>
        <head><title>GitHub Connected</title></head>
        <body>
          <p>Connecting...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: "GITHUB_CONNECTED", success: true }, "*");
            }
            window.close();
          </script>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  // Redirect user back to /settings
  return new Response(null, {
    status: 302,
    headers: {
      'Location': (redirectUrl || 'https://aidrakon.tech/settings') + '?connected=1',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

async function exchangeGithubCode(env, code) {
  const clientId = env.GITHUB_APP_CLIENT_ID;
  const clientSecret = env.GITHUB_APP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_APP_CLIENT_ID or GITHUB_APP_CLIENT_SECRET is not configured on the server');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'drakon-mcp-worker'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub token exchange failed (HTTP ${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data;
}

async function fetchGithubUser(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'drakon-mcp-worker',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub user fetch failed (HTTP ${response.status}): ${text.slice(0, 200)}`);
  }

  return response.json();
}

function cleanProxyHeaders(request) {
  const headers = new Headers();
  const auth = request.headers.get('Authorization');
  if (auth) headers.set('Authorization', auth);
  const ct = request.headers.get('Content-Type');
  if (ct) headers.set('Content-Type', ct);
  const ghToken = request.headers.get('X-Github-Token');
  if (ghToken) headers.set('X-Github-Token', ghToken);
  return headers;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return corsResponse();
    }

    try {
      if (!env.JWT_SECRET) {
        return errorResponse('JWT_SECRET is not configured', 500, undefined, 'SERVER_CONFIG_ERROR');
      }

      // Slice 3.2: central declarative auth gate, consulted before any
      // route-specific dispatch below. See ROUTE_AUTH_TABLE and
      // docs/contracts/worker-route-auth-matrix-v2.md.
      // Slice 3.3 (ADR-0025): 'owner'-level routes pass for either
      // legacy role === 'owner' (MCP_API_KEY or Worker-JWT owner) OR
      // a successfully resolved Appwrite tenant via resolveTenant().
      {
        const requiredAuth = resolveRouteAuth(method, path);
        if (requiredAuth !== 'none') {
          const gateAuthPayload = await verifyOwnerAuth(request, env);
          if (requiredAuth === 'owner') {
            const isLegacyOwner = Boolean(gateAuthPayload && gateAuthPayload.role === 'owner');
            let hasTenant = false;
            if (!isLegacyOwner) {
              const appwriteConfig = {
                endpoint: (env.APPWRITE_ENDPOINT || 'https://auth.aidrakon.tech').replace(/\/v1\/?$/, ''),
                projectId: env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b',
              };
              const tenantContext = await resolveTenant(request, appwriteConfig);
              hasTenant = Boolean(tenantContext);
            }
            if (!isLegacyOwner && !hasTenant) {
              return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
            }
          }
          if (requiredAuth === 'authenticated' && !gateAuthPayload) {
            return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
          }
        }
      }

      // Slice 3.6: these two Durable Object paths used to dispatch before
      // this point -- before JWT_SECRET was even checked, before any auth
      // call. Moved inside the auth boundary and given the same
      // verifyOwnerAuth + role==='owner' check every other authenticated
      // route uses.
      //
      // Slice 3.4: room/diagram tenant ownership. Durable Object IDs are
      // derived from `${tenantId}:${roomId}` and `${tenantId}:${diagramId}` so
      // tenants cannot cross-talk. Diagram sync also performs an explicit D1
      // DiagramRepository ownership check before reaching DiagramSyncDO.
      if (path.startsWith('/ws/room/')) {
        if (!env.ROOM_DO) {
          return errorResponse('ROOM_DO binding missing', 500);
        }
        const roomId = path.split('/')[3];
        if (!roomId) return errorResponse('Missing room ID', 400);

        const ownerPayload = await verifyOwnerAuth(request, env);
        const appwriteConfig = {
          endpoint: (env.APPWRITE_ENDPOINT || 'https://auth.aidrakon.tech').replace(/\/v1\/?$/, ''),
          projectId: env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b',
        };
        const tenantContext = await resolveTenant(request, appwriteConfig);
        const isLegacyOwner = Boolean(ownerPayload && ownerPayload.role === 'owner');
        if (!isLegacyOwner && !tenantContext) {
          return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
        }
        const tenantId = tenantContext?.tenantId || ownerPayload?.tenant_id || ownerPayload?.sub;

        const id = env.ROOM_DO.idFromName(`${tenantId}:${roomId}`);
        const stub = env.ROOM_DO.get(id);
        return stub.fetch(request);
      }

      if (path.startsWith('/v1/diagram/') && path.endsWith('/sync')) {
        if (!env.DIAGRAM_SYNC) {
          return errorResponse('DIAGRAM_SYNC binding missing', 500);
        }
        const parts = path.split('/');
        const diagramId = parts[3];
        if (!diagramId) return errorResponse('Missing diagram ID', 400);

        const ownerPayload = await verifyOwnerAuth(request, env);
        const appwriteConfig = {
          endpoint: (env.APPWRITE_ENDPOINT || 'https://auth.aidrakon.tech').replace(/\/v1\/?$/, ''),
          projectId: env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b',
        };
        const tenantContext = await resolveTenant(request, appwriteConfig);
        const isLegacyOwner = Boolean(ownerPayload && ownerPayload.role === 'owner');
        if (!isLegacyOwner && !tenantContext) {
          return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
        }
        const tenantId = tenantContext?.tenantId || ownerPayload?.tenant_id || ownerPayload?.sub;

        if (env.D1_DB) {
          const repo = new DiagramRepository(env.D1_DB, tenantId);
          const diagram = await repo.get(diagramId);
          if (!diagram) {
            return errorResponse('Forbidden', 403, undefined, 'FORBIDDEN');
          }
        }

        const id = env.DIAGRAM_SYNC.idFromName(`${tenantId}:${diagramId}`);
        const stub = env.DIAGRAM_SYNC.get(id);
        return stub.fetch(request);
      }

      if (method === 'GET' && path === '/health') {
        return await handleHealth(env);
      }

      if (method === 'POST' && path === '/auth/login') {
        return await handleAuthLogin(request, env);
      }

      if (method === 'GET' && path === '/auth/github/start') {
        return await handleGithubAuthStart(request, env);
      }

      if (method === 'GET' && path === '/auth/github/callback') {
        return await handleGithubAuthCallback(request, env);
      }

      if (method === 'GET' && path === '/mcp') {
        // MCP Streamable HTTP: GET returns 405 to signal POST-only mode
        return new Response(null, { status: 405, headers: {
          'Allow': 'POST',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        } });
      }

      if (method === 'POST' && path === '/mcp') {
        const owner = await verifyOwnerAuth(request, env);
        if (!owner) return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
        // Clone to read tool name without consuming the body
        let toolName = 'unknown';
        try {
          const cloned = await request.clone().json();
          if (cloned?.method === 'tools/call') toolName = cloned?.params?.name || 'unknown';
          else toolName = cloned?.method || 'unknown';
        } catch (_) {}
        const t0mcp = Date.now();
        const resp = await handleMcp(request, env, ctx);
        ctx.waitUntil(saveLogToMinio(env, {
          ts: new Date().toISOString(),
          level: resp.status < 400 ? 'info' : 'error',
          tool: toolName,
          httpStatus: resp.status,
          ms: Date.now() - t0mcp,
        }));
        return resp;
      }

      // ─── DRAKON IR routes (read-only, no auth needed) ─────────────────────
      if (method === 'GET' && path === '/v1/drakon-ir/list') {
        return await handleDrakonIrList();
      }
      const drakonIrGetMatch = path.match(/^\/v1\/drakon-ir\/([^/]+)$/);
      if (method === 'GET' && drakonIrGetMatch) {
        return await handleDrakonIrGet(decodeURIComponent(drakonIrGetMatch[1]));
      }
      // ─── Public Notes routes (no auth needed for reads) ─────────────────
      if (method === 'GET' && path === '/v1/notes/list') {
        return await handleNotesList(request);
      }
      if (method === 'GET' && (path === '/v1/notes/get' || path === '/v1/notes/read')) {
        return await handleNotesGet(request);
      }
      if (method === 'GET' && path === '/v1/notes/graph') {
        return await handleNotesGraph(request);
      }
      if (method === 'POST' && path === '/v1/notes/commit') {
        return await handleNotesCommit(request, env);
      }
      if (method === 'DELETE' && path === '/v1/notes/delete') {
        return await handleNotesDelete(request, env);
      }
      if (method === 'POST' && path === '/v1/notes/build-semantic-graph') {
        return await handleNotesBuildSemanticGraph(request, env);
      }
      if (method === 'GET' && path === '/v1/notes/semantic-graph-status') {
        return await handleSemanticGraphStatus(request, env);
      }
      if (method === 'POST' && path === '/v1/codegen') {
        return await handleDrakonCodegen(request, env);
      }
      if (method === 'GET' && path === '/v1/codegen-status') {
        return await handleCodegenStatus(request, env);
      }
      if (method === 'POST' && path === '/v1/compile') {
        return await handleDrakonCompile(request, env);
      }
      if (method === 'GET' && path === '/v1/compile-status') {
        return await handleCompileStatus(request, env);
      }
      // ──────────────────────────────────────────────────────────────────────

      // (Unauthenticated GitHub read routes removed — the authenticated versions
      // below the global auth gate now serve /v1/github/{tree,file,branches})

      // ─── Pipeline SSE (auth via ?token= query param — EventSource не підтримує headers) ─
      const pipelineStreamMatch = path.match(/^\/v1\/pipeline\/stream\/([^\/]+)$/);
      if (method === 'GET' && pipelineStreamMatch) {
        const streamJobId = decodeURIComponent(pipelineStreamMatch[1]);
        const qToken = new URL(request.url).searchParams.get('token') || '';
        const streamPayload = await verifyJWT(qToken, env.JWT_SECRET).catch(() => null);
        if (!streamPayload) return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
        return await handlePipelineStream(streamJobId, env, ctx);
      }
      // ─── Sonate Solidaire public chat (no auth required) ─────────────────
      const ssChatMatch = path.match(/^\/v1\/agents\/(sonate-solidaire)\/chat$/);
      if (method === 'POST' && ssChatMatch) {
        return await handleAgentChat(ssChatMatch[1], request, env, ctx);
      }
      // ─────────────────────────────────────────────────────────────────────

      // ─── Public health checks & understand status (no auth required) ─────
      const agentHealthMatch = path.match(/^\/v1\/agents\/([^\/]+)\/health$/);
      if (method === 'GET' && agentHealthMatch) {
        return await handleAgentHealth(agentHealthMatch[1], env);
      }

      if (method === 'GET' && path === '/v1/understand/status') {
        const owner = url.searchParams.get('owner') || '';
        const repo = url.searchParams.get('repo') || '';
        const requestToken = request.headers.get('X-Github-Token') || '';
        if (!owner || !repo) {
          return jsonResponse({ error: 'owner and repo required' }, 400);
        }

        try {
          const token = String(requestToken || env.GITHUB_TOKEN || '').trim();
          const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ai-drakon-worker',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const kgPath = '.understand-anything/knowledge-graph.json';
          const ghRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${kgPath}`,
            { headers }
          );
          const exists = ghRes.ok;
          let meta = null;
          if (exists) {
            const rawHeaders = {
              'Accept': 'application/vnd.github.raw+json',
              'User-Agent': 'ai-drakon-worker',
            };
            if (token) {
              rawHeaders['Authorization'] = `Bearer ${token}`;
            }
            const raw = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${kgPath}`,
              { headers: rawHeaders }
            );
            if (raw.ok) {
              const graph = await raw.json();
              meta = {
                version: graph.version,
                nodeCount: graph.nodes?.length ?? 0,
                edgeCount: graph.edges?.length ?? 0,
                layerCount: graph.layers?.length ?? 0,
                project: graph.project,
              };
            }
          }
          return jsonResponse({ exists, meta });
        } catch (err) {
          return jsonResponse({ error: err.message }, 500);
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      if (path === '/v1/user/config') {
        if (method === 'GET') return await handleUserConfigGet(request, env);
        if (method === 'PUT') return await handleUserConfigPut(request, env);
      }

      // Slice 3.2: the positional owner gate that used to sit here was
      // removed -- every route reaching this point already required
      // 'owner' via the central ROUTE_AUTH_TABLE gate above (any route
      // not explicitly listed there defaults to 'owner'). Keeping a
      // second verifyOwnerAuth() call here would just double the
      // Appwrite round-trip for no additional enforcement.

      // ─── Docs-agent proxy (/v1/docs/* → docs-agent) ───────────────────────────
      if (path.startsWith('/v1/docs/')) {
        const agentPath = path.slice(3); // strip /v1
        const targetUrl = 'https://docs-agent.exodus.pp.ua' + agentPath + (url.search || '');
        const proxied = new Request(targetUrl, {
          method: request.method,
          headers: cleanProxyHeaders(request),
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        });
        const response = env.DOCS_AGENT 
          ? await env.DOCS_AGENT.fetch(proxied)
          : await fetch(proxied);
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Github-Token');
        return newResponse;
      }

      // ─── Docs-agent projects proxy (/v1/projects/* → docs-agent) ───
      if (path.startsWith('/v1/projects')) {
        const agentPath = path.slice(3); // strip /v1
        const targetUrl = 'https://docs-agent.exodus.pp.ua' + agentPath + (url.search || '');
        const proxied = new Request(targetUrl, {
          method: request.method,
          headers: cleanProxyHeaders(request),
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        });
        const response = env.DOCS_AGENT 
          ? await env.DOCS_AGENT.fetch(proxied)
          : await fetch(proxied);
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Github-Token');
        return newResponse;
      }

      // ─── Architect-agent graph-pipelines proxy (/v1/graph-pipelines/* → architect-agent) ───
      if (path.startsWith('/v1/graph-pipelines')) {
        const agentPath = path.slice(3); // strip /v1
        const targetUrl = 'https://architect-agent.exodus.pp.ua' + agentPath + (url.search || '');
        const proxied = new Request(targetUrl, {
          method: request.method,
          headers: cleanProxyHeaders(request),
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        });
        const response = env.ARCHITECT_AGENT 
          ? await env.ARCHITECT_AGENT.fetch(proxied)
          : await fetch(proxied);
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Github-Token');
        return newResponse;
      }

      if (method === 'POST' && path === '/v1/drakon/commit') {
        return await handleDrakonCommit(request, env);
      }

      if (method === 'POST' && path === '/v1/drakon/validate-ir') {
        return await handleDrakonValidateIr(request);
      }

      if (method === 'POST' && path === '/v1/analysis/codebase') {
        return await handleAnalysisCodebase(request);
      }

      const analysisJobMatch = path.match(/^\/v1\/analysis\/jobs\/([^\/]+)$/);
      if (method === 'GET' && analysisJobMatch) {
        return await handleAnalysisGetJob(decodeURIComponent(analysisJobMatch[1]));
      }

      if (method === 'GET' && path === '/v1/analysis/jobs') {
        return await handleAnalysisListJobs();
      }

      if (method === 'GET' && path === '/v1/github/tree') {
        const owner = url.searchParams.get('owner') || '';
        const repo = url.searchParams.get('repo') || '';
        const treePath = url.searchParams.get('path') || '';
        const branch = url.searchParams.get('branch') || 'main';
        const requestToken = request.headers.get('X-Github-Token') || '';
        return jsonResponse(await handleGithubListTree({ owner, repo, path: treePath, branch }, env, requestToken));
      }

      if (method === 'GET' && path === '/v1/github/file') {
        const owner = url.searchParams.get('owner') || '';
        const repo = url.searchParams.get('repo') || '';
        const filePath = url.searchParams.get('path') || '';
        const branch = url.searchParams.get('branch') || 'main';
        const requestToken = request.headers.get('X-Github-Token') || '';
        return jsonResponse(await handleGithubGetFile({ owner, repo, path: filePath, branch }, env, requestToken));
      }

      if (method === 'POST' && path === '/v1/github/commit') {
        const requestToken = request.headers.get('X-Github-Token') || '';
        let body;
        try {
          body = await request.json();
        } catch {
          return errorResponse('Invalid JSON', 400, undefined, 'INVALID_JSON');
        }
        return jsonResponse(await handleGithubCommitFile(body, env, requestToken));
      }

      if (method === 'DELETE' && path === '/v1/github/delete') {
        const requestToken = request.headers.get('X-Github-Token') || '';
        let body;
        try {
          body = await request.json();
        } catch {
          return errorResponse('Invalid JSON', 400, undefined, 'INVALID_JSON');
        }
        return jsonResponse(await handleGithubDeleteFile(body, env, requestToken));
      }

      if (method === 'GET' && path === '/v1/github/branches') {
        const owner = url.searchParams.get('owner') || '';
        const repo = url.searchParams.get('repo') || '';
        const requestToken = request.headers.get('X-Github-Token') || '';
        return jsonResponse(await handleGithubListBranches({ owner, repo }, env, requestToken));
      }

      const drakonGetMatch = path.match(/^\/v1\/drakon\/([^\/]+)\/([^\/]+)$/);
      if (method === 'GET' && drakonGetMatch) {
        return await handleDrakonGet(
          decodeURIComponent(drakonGetMatch[1]),
          decodeURIComponent(drakonGetMatch[2]),
          env
        );
      }

      const drakonDeleteMatch = path.match(/^\/v1\/drakon\/([^\/]+)\/([^\/]+)$/);
      if (method === 'DELETE' && drakonDeleteMatch) {
        return await handleDrakonDelete(
          decodeURIComponent(drakonDeleteMatch[1]),
          decodeURIComponent(drakonDeleteMatch[2]),
          env
        );
      }

      const drakonListMatch = path.match(/^\/v1\/drakon\/([^\/]+)$/);
      if (method === 'GET' && drakonListMatch) {
        return await handleDrakonList(
          decodeURIComponent(drakonListMatch[1]),
          env
        );
      }




// ── Pipeline SSE stream (architect-agent polling → browser EventSource) ──────
async function handlePipelineStream(jobId, env, ctx) {
  const architectUrl = env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua';
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  ctx.waitUntil((async () => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'pending', job_id: jobId })}

`));
      const deadline = Date.now() + 85_000;
      while (Date.now() < deadline) {
        let resp;
        try {
          resp = await fetch(`${architectUrl}/pipeline/status/${jobId}`, {
            signal: AbortSignal.timeout(8_000),
          });
        } catch (fetchErr) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'error', error: String(fetchErr.message) })}

`));
          break;
        }
        if (resp.status === 404) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'error', error: 'Сервіс перезапустився. Спробуйте ще раз.' })}

`));
          break;
        }
        if (!resp.ok) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'error', error: `Agent HTTP ${resp.status}` })}

`));
          break;
        }
        let data;
        try { data = await resp.json(); } catch {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'error', error: 'Bad JSON from agent' })}

`));
          break;
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}

`));
        if (data.status === 'done' || data.status === 'error') break;
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (e) {
      try { await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'error', error: String(e.message) })}

`)); } catch { /* closed */ }
    } finally {
      try { await writer.close(); } catch { /* ignore */ }
    }
  })());

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    },
  });
}
// ─────────────────────────────────────────────────────────────────────────────
// ── Pipeline proxy (architect-agent LangGraph endpoints) ─────────────────────
async function handleKb(kbPath, request, env) {
  const architectUrl = env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua';
  const targetUrl = architectUrl + '/kb/' + kbPath;
  const url = new URL(request.url);
  const fullTarget = targetUrl + url.search;

  const init = {
    method: request.method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    init.body = await request.text();
  }

  const resp = await fetch(fullTarget, init);
  const data = await resp.json().catch(() => ({}));
  return new Response(JSON.stringify(data), {
    status: resp.status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function md5Hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function cosineSimilarity(a, b) {
  const fa = new Float32Array(a);
  const fb = new Float32Array(b);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < fa.length; i++) {
    dot += fa[i] * fb[i];
    normA += fa[i] * fa[i];
    normB += fb[i] * fb[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

async function handleKbIndex(request, env) {
  // Auth: JWT check (як в інших handlers)
  const payload = await verifyOwnerAuth(request, env);
  if (!payload) {
    return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
  }

  const url = new URL(request.url);
  const project = url.searchParams.get('project') || '';
  if (!project) {
    return errorResponse('project parameter is required', 400);
  }

  // 1. Fetch article list from docs-agent
  //    GET DOCS_AGENT_URL/notes/list?project=X&flat=true
  const listUrl = `${DOCS_AGENT_URL}/notes/list?flat=true&project=${encodeURIComponent(project)}`;
  const listRes = await fetch(listUrl, { signal: AbortSignal.timeout(15_000) });
  if (!listRes.ok) {
    return errorResponse(`docs-agent /notes/list failed with status ${listRes.status}`, 502);
  }
  const notes = await listRes.json();
  if (!Array.isArray(notes)) {
    return errorResponse('Invalid notes response format from docs-agent', 502);
  }

  // Appwrite Config
  const appwriteEndpoint = env.APPWRITE_ENDPOINT || 'https://auth.aidrakon.tech/v1';
  const appwriteProjectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const appwriteApiKey = env.APPWRITE_API_KEY;
  if (!appwriteApiKey) return errorResponse('APPWRITE_API_KEY secret not configured', 500);
  const dbId = env.APPWRITE_DATABASE_ID || 'ai-drakon';
  const collectionId = env.APPWRITE_KB_COLLECTION_ID || 'kb_embeddings';

  const headers = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': appwriteProjectId,
    'X-Appwrite-Key': appwriteApiKey
  };

  let indexedCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (const note of notes) {
    const slug = note.slug;
    const title = note.title || '';
    if (!slug) continue;

    try {
      // 2. Fetch content via DOCS_AGENT_URL/notes/read?slug=X&project=Y
      const readUrl = `${DOCS_AGENT_URL}/notes/read?slug=${encodeURIComponent(slug)}&project=${encodeURIComponent(project)}`;
      const readRes = await fetch(readUrl, { signal: AbortSignal.timeout(10_000) });
      if (!readRes.ok) {
        errors.push({ slug, error: `Failed to fetch note content: ${readRes.status}` });
        continue;
      }
      const noteData = await readRes.json();
      const content = noteData.content || '';

      // 3. Compute content_hash = MD5(content)
      const contentHash = await md5Hex(content);

      // Deterministic document ID: 'k_' + MD5(project + ':' + slug)
      const docIdSeed = `${project}:${slug}`;
      const docId = `k_${await md5Hex(docIdSeed)}`;

      // 4. Check if hash changed vs Appwrite (skip if same)
      const docUrl = `${appwriteEndpoint}/databases/${dbId}/collections/${collectionId}/documents/${docId}`;
      const checkRes = await fetch(docUrl, { method: 'GET', headers });
      
      let existingDoc = null;
      if (checkRes.ok) {
        existingDoc = await checkRes.json();
      }

      if (existingDoc && existingDoc.content_hash === contentHash) {
        skippedCount++;
        continue;
      }

      // 5. Build text for embedding: title + "\n" + first 1000 chars of body
      const first1000 = content.slice(0, 1000);
      const textToEmbed = `${title}\n${first1000}`;

      // 6. Call Cloudflare Workers AI
      if (!env.AI) {
        throw new Error('Workers AI binding (env.AI) is not configured');
      }
      const aiResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: textToEmbed });
      
      let embeddingArr = null;
      if (aiResult && aiResult.data && Array.isArray(aiResult.data[0])) {
        embeddingArr = aiResult.data[0];
      } else if (aiResult && Array.isArray(aiResult.data)) {
        embeddingArr = aiResult.data;
      } else if (aiResult && Array.isArray(aiResult)) {
        embeddingArr = aiResult;
      }
      if (!embeddingArr) {
        throw new Error(`Failed to extract embedding data from AI response: ${JSON.stringify(aiResult)}`);
      }
      const embeddingStr = JSON.stringify(embeddingArr);

      // 7. Extract graph_neighbors from "## Семантичні зв'язки" section (parse [[slug|title]] links)
      const neighbors = [];
      const secIdx = content.indexOf("## Семантичні зв'язки");
      if (secIdx !== -1) {
        const sectionText = content.slice(secIdx);
        const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
        let match;
        while ((match = wikiLinkRegex.exec(sectionText)) !== null) {
          const neighborSlug = match[1].trim();
          if (neighborSlug && !neighbors.includes(neighborSlug)) {
            neighbors.push(neighborSlug);
          }
        }
      }
      const graphNeighborsStr = JSON.stringify(neighbors);

      // 8. Upsert to Appwrite: POST/PATCH kb_embeddings
      const dataPayload = {
        project,
        slug,
        content_hash: contentHash,
        title,
        graph_neighbors: graphNeighborsStr,
        embedding: embeddingStr,
        updated_at: new Date().toISOString()
      };

      if (existingDoc) {
        // PATCH
        const patchRes = await fetch(docUrl, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ data: dataPayload })
        });
        if (!patchRes.ok) {
          throw new Error(`Appwrite PATCH failed: ${patchRes.status} ${await patchRes.text()}`);
        }
      } else {
        // POST
        const createUrl = `${appwriteEndpoint}/databases/${dbId}/collections/${collectionId}/documents`;
        const postRes = await fetch(createUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            documentId: docId,
            data: dataPayload
          })
        });
        if (!postRes.ok) {
          throw new Error(`Appwrite POST failed: ${postRes.status} ${await postRes.text()}`);
        }
      }

      indexedCount++;
    } catch (err) {
      errors.push({ slug, error: err.message });
    }
  }

  return jsonResponse({
    success: errors.length === 0,
    indexed: indexedCount,
    skipped: skippedCount,
    errors
  });
}

async function handleKbSearch(request, env) {
  const url = new URL(request.url);
  const project = url.searchParams.get('project') || '';
  if (!project) {
    return errorResponse('project parameter is required', 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  const query = body.query;
  const top_k = body.top_k !== undefined ? Number(body.top_k) : 5;
  if (!query) {
    return errorResponse('query is required', 400);
  }

  // 1. Embed query via env.AI.run('@cf/baai/bge-base-en-v1.5', { text: query })
  if (!env.AI) {
    return errorResponse('Workers AI binding (env.AI) is not configured', 503);
  }
  const aiResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: query });
  
  let queryEmbedding = null;
  if (aiResult && aiResult.data && Array.isArray(aiResult.data[0])) {
    queryEmbedding = aiResult.data[0];
  } else if (aiResult && Array.isArray(aiResult.data)) {
    queryEmbedding = aiResult.data;
  } else if (aiResult && Array.isArray(aiResult)) {
    queryEmbedding = aiResult;
  }
  if (!queryEmbedding) {
    return errorResponse('Failed to generate query embedding', 500);
  }

  // 2. Fetch all embeddings for project from Appwrite kb_embeddings
  const appwriteEndpoint = env.APPWRITE_ENDPOINT || 'https://auth.aidrakon.tech/v1';
  const appwriteProjectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const appwriteApiKey = env.APPWRITE_API_KEY;
  if (!appwriteApiKey) return errorResponse('APPWRITE_API_KEY secret not configured', 500);
  const dbId = env.APPWRITE_DATABASE_ID || 'ai-drakon';
  const collectionId = env.APPWRITE_KB_COLLECTION_ID || 'kb_embeddings';

  const headers = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': appwriteProjectId,
    'X-Appwrite-Key': appwriteApiKey
  };

  const allDocuments = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const queryStr = `equal("project", "${project}")`;
    const docListUrl = `${appwriteEndpoint}/databases/${dbId}/collections/${collectionId}/documents?queries[]=${encodeURIComponent(queryStr)}&limit=${limit}&offset=${offset}`;
    const docListRes = await fetch(docListUrl, { method: 'GET', headers });
    if (!docListRes.ok) {
      return errorResponse(`Failed to fetch documents from Appwrite: ${docListRes.status}`, 502);
    }
    const docListJson = await docListRes.json();
    const documents = docListJson.documents || [];
    allDocuments.push(...documents);
    if (documents.length < limit) {
      break;
    }
    offset += limit;
  }

  // 3. Cosine similarity: Float32Array dot products
  const candidates = [];
  for (const doc of allDocuments) {
    if (!doc.embedding) continue;
    let docEmbedding;
    try {
      docEmbedding = JSON.parse(doc.embedding);
    } catch (_) {
      continue;
    }
    if (!Array.isArray(docEmbedding)) continue;
    const score = cosineSimilarity(queryEmbedding, docEmbedding);
    
    let graphNeighbors = [];
    if (doc.graph_neighbors) {
      try {
        graphNeighbors = JSON.parse(doc.graph_neighbors);
      } catch (_) {}
    }

    candidates.push({
      slug: doc.slug,
      title: doc.title || '',
      project: doc.project,
      vectorScore: score,
      graphNeighbors: graphNeighbors
    });
  }

  // 4. Take top-20 by vector score
  candidates.sort((a, b) => b.vectorScore - a.vectorScore);
  const top20 = candidates.slice(0, 20);

  // 5. Graph expansion: for each top-20 doc, fetch graph_neighbors slugs
  //    Add neighbors to candidate set (if not already there)
  const allCandidatesMap = new Map();
  for (const c of candidates) {
    allCandidatesMap.set(c.slug, c);
  }

  const candidateSet = new Set(top20.map(c => c.slug));
  for (const c of top20) {
    for (const neighborSlug of c.graphNeighbors) {
      if (allCandidatesMap.has(neighborSlug)) {
        candidateSet.add(neighborSlug);
      }
    }
  }

  // 6. Re-rank candidates:
  //    score = 0.6 * vectorScore + 0.4 * linkCentrality
  //    linkCentrality = count of times this slug appears as neighbor in top-20 results
  const finalCandidates = [];
  for (const slug of candidateSet) {
    const cand = allCandidatesMap.get(slug);
    const inTop20 = top20.some(t => t.slug === slug);
    
    let linkCentrality = 0;
    for (const t of top20) {
      if (t.graphNeighbors.includes(slug)) {
        linkCentrality++;
      }
    }

    const score = 0.6 * cand.vectorScore + 0.4 * linkCentrality;

    finalCandidates.push({
      slug: cand.slug,
      title: cand.title,
      project: cand.project,
      score: score,
      via: inTop20 ? 'vector' : 'graph'
    });
  }

  // 7. Return top_k results: [{ slug, title, project, score, via: 'vector'|'graph' }]
  finalCandidates.sort((a, b) => b.score - a.score);
  const results = finalCandidates.slice(0, top_k);
  return jsonResponse(results);
}

async function handlePipeline(pipelinePath, request, env, ctx) {
  const architectUrl = env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua';
  const targetUrl = architectUrl + '/pipeline/' + pipelinePath;

  const init = {
    method: request.method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120_000),
  };
  if (request.method === 'POST') {
    let body;
    try { body = await request.text(); } catch { body = '{}'; }
    init.body = body;
  }

  let agentResp;
  try {
    agentResp = await fetch(targetUrl, init);
  } catch (e) {
    ctx.waitUntil(saveLogToMinio(env, {
      ts: new Date().toISOString(), level: 'error',
      tool: 'pipeline.' + pipelinePath,
      agentUrl: targetUrl, error: String(e.message),
    }));
    return errorResponse('Pipeline agent unreachable: ' + e.message, 502, undefined, 'AGENT_UNREACHABLE');
  }

  const ms = Date.now();
  let data;
  try { data = await agentResp.json(); } catch {
    return errorResponse('Pipeline agent returned non-JSON', 502, undefined, 'AGENT_BAD_RESPONSE');
  }

  ctx.waitUntil(saveLogToMinio(env, {
    ts: new Date().toISOString(),
    level: agentResp.ok ? 'info' : 'warn',
    tool: 'pipeline.' + pipelinePath,
    agentUrl: targetUrl, httpStatus: agentResp.status,
  }));

  return jsonResponse(data, agentResp.status);
}
// ─────────────────────────────────────────────────────────────────────────────
// ── Notes API (docs-agent proxy) ─────────────────────────────────────────────

async function handleDrakonIrList() {
  const res = await fetch(DOCS_AGENT_URL + '/drakon-ir/list', { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return errorResponse('docs-agent /drakon-ir/list ' + res.status, 502);
  return jsonResponse(await res.json());
}

async function handleDrakonIrGet(name) {
  const res = await fetch(DOCS_AGENT_URL + '/drakon-ir/get?name=' + encodeURIComponent(name), { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return errorResponse('docs-agent /drakon-ir/get ' + res.status, 502);
  return jsonResponse(await res.json());
}

async function handleNotesList(request) {
  const url = new URL(request.url);
  const flat = url.searchParams.get('flat') ?? 'true';
  const project = url.searchParams.get('project') || '';
  const projectQs = project ? `&project=${encodeURIComponent(project)}` : '';
  const res = await fetch(`${DOCS_AGENT_URL}/notes/list?flat=${flat}${projectQs}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return errorResponse(`docs-agent /notes/list ${res.status}`, 502);
  return jsonResponse(await res.json());
}

async function handleNotesGet(request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';
  const project = url.searchParams.get('project') || '';
  if (!slug) return errorResponse('slug required', 400);
  const projectQs = project ? `&project=${encodeURIComponent(project)}` : '';
  const res = await fetch(`${DOCS_AGENT_URL}/notes/read?slug=${encodeURIComponent(slug)}${projectQs}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return errorResponse(`Note not found: ${slug}`, 404);
  if (!res.ok) return errorResponse(`docs-agent /notes/read ${res.status}`, 502);
  return jsonResponse(await res.json());
}

async function handleNotesGraph(request) {
  const project = new URL(request.url).searchParams.get('project') || '';
  const projectQs = project ? `?project=${encodeURIComponent(project)}` : '';
  const res = await fetch(`${DOCS_AGENT_URL}/notes/graph${projectQs}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return errorResponse(`docs-agent /notes/graph ${res.status}`, 502);
  return jsonResponse(await res.json());
}

async function handleNotesCommit(request, env) {
  const authPayload = await verifyOwnerAuth(request, env);
  if (!authPayload) return errorResponse('Invalid or expired token', 401);

  let body;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON', 400); }

  // Lovable sends: { slug, path, content (full markdown with FM), sha, message, project }
  // Our format: { slug, title, content (body only), tags, project }
  // Handle both formats
  let slug = body.slug || '';
  let title = body.title;
  let bodyContent = body.content || '';
  let tags = body.tags || [];
  let project = body.project || '';

  if (!title && bodyContent.startsWith('---')) {
    // Parse frontmatter from content
    const end = bodyContent.indexOf('\n---', 3);
    if (end !== -1) {
      const fm = bodyContent.slice(3, end).trim();
      bodyContent = bodyContent.slice(end + 4).replace(/^\n/, '');
      for (const line of fm.split('\n')) {
        const tm = line.match(/^title:\s*(.*)$/);
        if (tm) title = tm[1].replace(/^["']|["']$/g, '').trim();
        const tagsMatch = line.match(/^tags:\s*\[(.*)\]/);
        if (tagsMatch) {
          tags = tagsMatch[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        }
      }
    }
  }

  if (!slug) return errorResponse('slug required', 400);
  if (!title) title = slug.split('/').pop() || slug;

  const res = await fetch(`${DOCS_AGENT_URL}/notes/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, title, content: bodyContent, tags, project }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return errorResponse(`docs-agent /notes/write ${res.status}: ${errText}`, 502);
  }
  return jsonResponse(await res.json());
}

async function handleNotesDelete(request, env) {
  const authPayload = await verifyOwnerAuth(request, env);
  if (!authPayload) return errorResponse('Invalid or expired token', 401);

  let body;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON', 400); }
  const slug = body.slug || '';
  const project = body.project || '';
  if (!slug) return errorResponse('slug required', 400);

  const res = await fetch(`${DOCS_AGENT_URL}/notes/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, project }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return errorResponse(`docs-agent /notes/delete ${res.status}`, 502);
  return jsonResponse(await res.json());
}

async function handleNotesBuildSemanticGraph(request, env) {
  // Accept BOTH the worker-signed owner JWT AND the Appwrite JWT (email-logged-in
  // users send the Appwrite JWT, which is NOT HMAC-signed by JWT_SECRET).
  // verifyOwnerAuth() mirrors handleKbIndex and falls through to verifyAppwriteJwt.
  const payload = await verifyOwnerAuth(request, env);
  if (!payload) {
    return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
  }

  const url = new URL(request.url);
  const project = url.searchParams.get('project') || '';
  const apply = url.searchParams.get('apply') || 'true';
  const model = url.searchParams.get('model') || '';
  const github_owner = url.searchParams.get('github_owner') || '';
  const github_repo = url.searchParams.get('github_repo') || '';
  const github_branch = url.searchParams.get('github_branch') || '';
  const github_token = url.searchParams.get('github_token') || '';

  const functionId = env.SEMANTIC_GRAPH_FUNCTION_ID;
  const projectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const apiKey = env.APPWRITE_API_KEY;

  if (!functionId || !apiKey) {
    return errorResponse('SEMANTIC_GRAPH_FUNCTION_ID or APPWRITE_API_KEY not configured', 503);
  }

  const graphBody = { project, apply: apply === 'true', model };
  if (github_owner) graphBody.github_owner = github_owner;
  if (github_repo) graphBody.github_repo = github_repo;
  if (github_branch) graphBody.github_branch = github_branch;
  if (github_token) graphBody.github_token = github_token;

  const execRes = await fetch(
    `https://auth.aidrakon.tech/v1/functions/${functionId}/executions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
      body: JSON.stringify({
        async: true,
        body: JSON.stringify(graphBody),
      }),
    }
  );

  if (!execRes.ok) {
    const errText = await execRes.text().catch(() => '');
    return errorResponse(`Appwrite execution failed: ${execRes.status} ${errText}`, 502);
  }

  const execData = await execRes.json();
  return jsonResponse({
    execution_id: execData.$id,
    status: 'accepted',
  });
}

async function handleSemanticGraphStatus(request, env) {
  const url = new URL(request.url);
  const executionId = url.searchParams.get('execution_id');
  if (!executionId) return errorResponse('execution_id required', 400);

  const functionId = env.SEMANTIC_GRAPH_FUNCTION_ID;
  const projectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const apiKey = env.APPWRITE_API_KEY;

  if (!functionId || !apiKey) return errorResponse('not configured', 503);

  const res = await fetch(
    `https://auth.aidrakon.tech/v1/functions/${functionId}/executions/${executionId}`,
    {
      headers: {
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
    }
  );

  if (!res.ok) return errorResponse(`Appwrite status check failed: ${res.status}`, 502);
  const data = await res.json();

  // Appwrite Education plan never persists responseBody.
  // Parse logs instead: function emits "Changed: N, applied: M".
  let output = undefined;
  if (data.status === 'completed') {
    if (data.responseBody) {
      try { output = JSON.parse(data.responseBody); } catch (_) {}
    }
    if (!output || typeof output.success !== 'boolean') {
      const logs = data.logs || '';
      const changedM = logs.match(/Changed: (\d+), applied: (\d+)/);
      const notesM   = logs.match(/Collected (\d+) articles/);
      const relsM    = logs.match(/Found (\d+) raw relationships/);
      const isOk     = data.responseStatusCode === 200;
      output = {
        success: isOk,
        proposed: [],
        stats: {
          notes:   notesM   ? parseInt(notesM[1])   : 0,
          links:   relsM    ? parseInt(relsM[1])    : 0,
          changed: changedM ? parseInt(changedM[1]) : 0,
        },
        git_status: 'dry-run',
      };
    }
  }
  return jsonResponse({
    execution_id: data.$id,
    status: data.status,
    duration: data.duration,
    output,
    error: data.status === 'failed' ? (data.errors || 'Function failed') : undefined,
  });
}

// ─── DRAKON code generation (LLM → .drakon JSON) ─────────────────────────────
// Triggers the "drakon-codegen" Appwrite Function asynchronously and returns an
// execution_id; the frontend polls /v1/codegen-status.
async function handleDrakonCodegen(request, env) {
  const payload = await verifyOwnerAuth(request, env);
  if (!payload) {
    return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
  }

  let body = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch (_) {
    return errorResponse('Invalid JSON body', 400);
  }

  const description = String(body.description || '').trim();
  if (!description) return errorResponse('description is required', 400);

  const codegenBody = {
    description,
    language: body.language || 'JS2604',
    functionName: body.functionName || 'myFunction',
    params: body.params || '',
  };
  if (body.model) codegenBody.model = body.model;

  const functionId = env.DRAKON_CODEGEN_FUNCTION_ID;
  const projectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const apiKey = env.APPWRITE_API_KEY;

  if (!functionId || !apiKey) {
    return errorResponse('DRAKON_CODEGEN_FUNCTION_ID or APPWRITE_API_KEY not configured', 503);
  }

  const execRes = await fetch(
    `https://auth.aidrakon.tech/v1/functions/${functionId}/executions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
      body: JSON.stringify({
        async: true,
        body: JSON.stringify(codegenBody),
      }),
    }
  );

  if (!execRes.ok) {
    const errText = await execRes.text().catch(() => '');
    return errorResponse(`Appwrite execution failed: ${execRes.status} ${errText}`, 502);
  }

  const execData = await execRes.json();
  return jsonResponse({
    execution_id: execData.$id,
    status: 'accepted',
  });
}

async function handleCodegenStatus(request, env) {
  const url = new URL(request.url);
  const executionId = url.searchParams.get('execution_id');
  if (!executionId) return errorResponse('execution_id required', 400);

  const functionId = env.DRAKON_CODEGEN_FUNCTION_ID;
  const projectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const apiKey = env.APPWRITE_API_KEY;

  if (!functionId || !apiKey) return errorResponse('not configured', 503);

  const res = await fetch(
    `https://auth.aidrakon.tech/v1/functions/${functionId}/executions/${executionId}`,
    {
      headers: {
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
    }
  );

  if (!res.ok) return errorResponse(`Appwrite status check failed: ${res.status}`, 502);
  const data = await res.json();

  // Appwrite Education plan never persists responseBody. The function logs the
  // full result as "DRAKON_JSON_RESULT:<base64>"; reconstruct from there.
  let output = undefined;
  if (data.status === 'completed') {
    if (data.responseBody) {
      try { output = JSON.parse(data.responseBody); } catch (_) {}
    }
    if (!output || typeof output.success !== 'boolean') {
      const logs = data.logs || '';
      const m = logs.match(/DRAKON_JSON_RESULT:([A-Za-z0-9+/=]+)/);
      if (m) {
        try {
          const decoded = atob(m[1]);
          output = JSON.parse(decoded);
        } catch (_) {
          output = undefined;
        }
      }
      if (!output) {
        const isOk = data.responseStatusCode === 200;
        output = {
          success: isOk,
          error: isOk ? undefined : 'Could not recover drakon_json from logs',
        };
      }
    }
  }

  return jsonResponse({
    execution_id: data.$id,
    status: data.status,
    duration: data.duration,
    output,
    error: data.status === 'failed' ? (data.errors || 'Function failed') : undefined,
  });
}

// ─── DRAKON code compilation (Drakon JSON → JS/Lua) ─────────────────────────
// Triggers the "drakon-compiler" Appwrite Function asynchronously and returns an
// execution_id; the frontend polls /v1/compile-status.
async function handleDrakonCompile(request, env) {
  const payload = await verifyOwnerAuth(request, env);
  if (!payload) {
    return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
  }

  let body = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch (_) {
    return errorResponse('Invalid JSON body', 400);
  }

  const name = body.name;
  const root = body.root;
  const diagrams = body.diagrams;
  if (!name || !root || !diagrams) {
    return errorResponse('name, root, and diagrams are required', 400);
  }

  const compileBody = {
    name,
    root,
    diagrams,
    language: body.language || 'JS',
    mainFun: body.mainFun || '',
    settings: body.settings || {},
  };

  const functionId = env.DRAKON_COMPILER_FUNCTION_ID;
  const projectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const apiKey = env.APPWRITE_API_KEY;

  if (!functionId || !apiKey) {
    return errorResponse('DRAKON_COMPILER_FUNCTION_ID or APPWRITE_API_KEY not configured', 503);
  }

  const execRes = await fetch(
    `https://auth.aidrakon.tech/v1/functions/${functionId}/executions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
      body: JSON.stringify({
        async: true,
        body: JSON.stringify(compileBody),
      }),
    }
  );

  if (!execRes.ok) {
    const errText = await execRes.text().catch(() => '');
    return errorResponse(`Appwrite execution failed: ${execRes.status} ${errText}`, 502);
  }

  const execData = await execRes.json();
  return jsonResponse({
    execution_id: execData.$id,
    status: 'accepted',
  });
}

async function handleCompileStatus(request, env) {
  const url = new URL(request.url);
  const executionId = url.searchParams.get('execution_id');
  if (!executionId) return errorResponse('execution_id required', 400);

  const functionId = env.DRAKON_COMPILER_FUNCTION_ID;
  const projectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const apiKey = env.APPWRITE_API_KEY;

  if (!functionId || !apiKey) return errorResponse('not configured', 503);

  const res = await fetch(
    `https://auth.aidrakon.tech/v1/functions/${functionId}/executions/${executionId}`,
    {
      headers: {
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
    }
  );

  if (!res.ok) return errorResponse(`Appwrite status check failed: ${res.status}`, 502);
  const data = await res.json();

  let output = undefined;
  if (data.status === 'completed') {
    if (data.responseBody) {
      try { output = JSON.parse(data.responseBody); } catch (_) {}
    }
    if (!output || typeof output.ok !== 'boolean') {
      const logs = data.logs || '';
      const m = logs.match(/DRAKON_CODE_RESULT:([A-Za-z0-9+/=]+)/);
      if (m) {
        try {
          const decoded = atob(m[1]);
          output = JSON.parse(decoded);
        } catch (_) {
          output = undefined;
        }
      }
      if (!output) {
        const isOk = data.responseStatusCode === 200;
        output = {
          ok: isOk,
          error: isOk ? undefined : 'Could not recover drakon_code from logs',
        };
      }
    }
  }

  return jsonResponse({
    execution_id: data.$id,
    status: data.status,
    duration: data.duration,
    output,
    error: data.status === 'failed' ? (data.errors || 'Function failed') : undefined,
  });
}
// ─────────────────────────────────────────────────────────────────────────────

      // ─── Pipeline config registry (/v1/agents/pipeline* → architect-agent) ───
      if (path.startsWith('/v1/agents/pipeline')) {
        const architectUrl = env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua';
        const targetUrl = architectUrl + path + (url.search || '');
        const proxied = new Request(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        });
        return fetch(proxied);
      }

      // ─── Pipeline proxy (/v1/pipeline/* → architect-agent) ─────────────
      if (method === 'POST' && path === '/v1/pipeline/execute-deterministic') {
        return await handleDrakonExecuteDeterministic(request, env);
      }
      if (method === 'GET' && path === '/v1/pipeline/execute-deterministic/status') {
        return await handleDrakonExecuteDeterministicStatus(request, env);
      }
      if (method === 'POST' && path === '/v1/pipeline/analyze') {
        return await handlePipeline('analyze', request, env, ctx);
      }
      if (method === 'POST' && path === '/v1/pipeline/generate') {
        return await handlePipeline('generate', request, env, ctx);
      }
      const pipelineStatusMatch = path.match(/^\/v1\/pipeline\/status\/([^\/]+)$/);
      if (method === 'GET' && pipelineStatusMatch) {
        return await handlePipeline('status/' + decodeURIComponent(pipelineStatusMatch[1]), request, env, ctx);
      }
      // ─────────────────────────────────────────────────────────────────────


      // ─── KB proxy ─────────────────────────────────────────────────────────
      if (method === 'POST' && path === '/v1/kb/index') {
        return await handleKbIndex(request, env);
      }
      if (method === 'POST' && path === '/v1/kb/search') {
        return await handleKbSearch(request, env);
      }

      if (method === 'POST' && path === '/v1/kb/contribute') {
        return await handleKb('contribute', request, env);
      }
      if (method === 'GET' && path === '/v1/kb/list') {
        return await handleKb('list', request, env);
      }
      const kbGetMatch = path.match(/^\/v1\/kb\/get\/([^\/]+)$/);
      if (method === 'GET' && kbGetMatch) {
        return await handleKb('get/' + decodeURIComponent(kbGetMatch[1]), request, env);
      }
      const kbDeleteMatch = path.match(/^\/v1\/kb\/delete\/([^\/]+)$/);
      if (method === 'DELETE' && kbDeleteMatch) {
        return await handleKb('delete/' + decodeURIComponent(kbDeleteMatch[1]), request, env);
      }
      // ─── EVE compiler endpoints ──────────────────────────────────────────
      if (method === 'POST' && path === '/v1/architect/compile-eve') {
        try {
          const { schema, projectName, projectSlug } = await request.json();
          const name = projectName || projectSlug || 'eve-agent';
          if (!schema) return errorResponse('Missing schema');
          const bundle = ribosomeEVEInline(schema, name);
          return jsonResponse({ success: true, bundle });
        } catch (e) {
          return errorResponse(`EVE compilation failed: ${e.message}`, 500);
        }
      }

      if (method === 'POST' && path === '/v1/architect/compile-eve/zip') {
        try {
          const { schema, projectName, projectSlug } = await request.json();
          const name = projectName || projectSlug || 'eve-agent';
          if (!schema) return errorResponse('Missing schema');
          const bundle = ribosomeEVEInline(schema, name);
          const zipData = createZip(bundle.files);
          return new Response(zipData, {
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-eve-agent.zip"`,
            },
          });
        } catch (e) {
          return new Response(`EVE compilation failed: ${e.message}`, { status: 500 });
        }
      }

      // ─── PlayPipe build control & SSE (/v1/playpipe/* → architect-agent) ─────────
      if (path.startsWith('/v1/playpipe/')) {
        const architectUrl = env.ARCHITECT_AGENT_URL ||
          'https://architect-agent.exodus.pp.ua'; // fallback лише для dev
        // Rewrite: /v1/playpipe/build/abc/stream → /architect/playpipe/build/abc/stream
        const agentPath = '/architect' + path.slice(4); // /v1 → strip → /playpipe/...
        const targetUrl = architectUrl + agentPath + (url.search || '');
        const proxied = new Request(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        });
        // SSE requires streaming — не буферизувати
        return fetch(proxied);
      }

      // ─── Architect-agent general proxy (/v1/architect/* → architect-agent) ───
      if (path.startsWith('/v1/architect/')) {
        const architectUrl = env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua';
        const agentPath = path.slice(3); // strip /v1 -> /architect/decompose
        const targetUrl = architectUrl + agentPath + (url.search || '');
        const proxied = new Request(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        });
        return fetch(proxied);
      }

      // ─── N8N compiler endpoint ──────────────────────────────────────────
      if (method === 'POST' && path === '/v1/compiler/n8n') {
        try {
          const { schema, name } = await request.json();
          if (!schema || !name) return errorResponse('Missing schema or name');
          const workflow = ribosomeN8NInline(schema, name);
          return jsonResponse({ success: true, workflow });
        } catch (e) {
          return errorResponse(`N8N compilation failed: ${e.message}`, 500);
        }
      }

      // ─── N8N push: compile + import to n8n server ───────────────────────────────
      if (method === 'POST' && path === '/v1/compiler/n8n/push') {
        try {
          const { schema, name, n8nUrl, n8nApiKey } = await request.json();
          if (!n8nUrl?.trim() || !n8nApiKey?.trim()) {
            return errorResponse('n8nUrl and n8nApiKey are required', 400);
          }
          if (!schema || !name) return errorResponse('Missing schema or name', 400);
          // Step 1: compile locally (ribosomeN8NInline вже є в цьому файлі)
          const workflow = ribosomeN8NInline(schema, name);
          // Step 2: import to n8n REST API
          const n8nBase = n8nUrl.replace(/\/+$/, '');
          const pushResp = await fetch(`${n8nBase}/api/v1/workflows`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': n8nApiKey,
            },
            body: JSON.stringify(workflow),
            signal: AbortSignal.timeout(15_000),
          });
          if (!pushResp.ok) {
            const errText = await pushResp.text().catch(() => '');
            return errorResponse(`n8n rejected: ${errText}`, pushResp.status);
          }
          const result = await pushResp.json();
          return jsonResponse({ success: true, workflowId: result.id, workflowName: result.name });
        } catch (e) {
          return errorResponse(`n8n push failed: ${e.message}`, 500);
        }
      }

      // ─── GitHub OAuth & repository endpoints ────────────────────────────
      if (method === 'GET' && path === '/v1/github/oauth/authorize') {
        return await handleGithubAuthStart(request, env);
      }

      if (method === 'GET' && path === '/v1/github/oauth/callback') {
        return await handleGithubAuthCallback(request, env);
      }

      if (method === 'POST' && path === '/v1/github/create-repo') {
        try {
          const authPayload = await verifyOwnerAuth(request, env);
          if (!authPayload) return errorResponse('Unauthorized', 401);

          const { name, private: isPrivate } = await request.json();
          if (!name) return errorResponse('Missing repo name', 400);

          const userId = authPayload.sub;
          const authHeader = request.headers.get('Authorization');
          const token = authHeader.slice(7);

          let githubToken;
          try {
            githubToken = await getGithubTokenForUser(userId, token, env);
          } catch (err) {
            return errorResponse(`Could not retrieve GitHub token: ${err.message}`, 400);
          }

          const createRepoResp = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Content-Type': 'application/json',
              'User-Agent': 'ai-drakon-scaffolder-worker',
              'Accept': 'application/vnd.github+json',
            },
            body: JSON.stringify({
              name,
              private: isPrivate ?? true,
              auto_init: true,
            }),
          });

          if (!createRepoResp.ok) {
            const errText = await createRepoResp.text();
            return errorResponse(`GitHub API error: ${errText}`, createRepoResp.status);
          }

          const repoData = await createRepoResp.json();
          return jsonResponse({
            success: true,
            repoUrl: repoData.html_url,
            fullName: repoData.full_name,
            cloneUrl: repoData.clone_url,
          });
        } catch (e) {
          return errorResponse(`Create repo failed: ${e.message}`, 500);
        }
      }

      // ─── Agent proxy ──────────────────────────────────────────────────
      const agentChatMatch = path.match(/^\/v1\/agents\/([^\/]+)\/chat$/);
      if (method === 'POST' && agentChatMatch) {
        return await handleAgentChat(agentChatMatch[1], request, env, ctx);
      }


      // ──────────────────────────────────────────────────────────────────

      return errorResponse('Not found', 404, { method, path }, 'NOT_FOUND');
    } catch (e) {
      return errorResponse(`Internal error: ${e.message || 'Unknown error'}`, 500, undefined, 'INTERNAL_ERROR');
    }
  },
};

function ribosomeN8NInline(ir, workflowName) {
  if (!ir || typeof ir !== 'object') {
    throw new Error('Invalid IR diagram');
  }

  if (!ir.items || Object.keys(ir.items).length === 0) {
    return {
      name: workflowName,
      nodes: [],
      connections: {},
      active: false,
      settings: { executionOrder: 'v1' },
    };
  }

  const nodes = [];
  const connections = {};
  const nameMap = new Map();
  const usedNames = new Set();

  const getUniqueName = (content, type, id) => {
    let name = content.replace(/^::\s*n8n\s*::\s*/i, '').trim();
    if (!name) {
      name = type;
    }
    name = name.replace(/[^a-zA-Z0-9 _-]/g, '');
    if (!name) name = 'node';

    let uniqueName = name;
    let counter = 1;
    while (usedNames.has(uniqueName)) {
      uniqueName = `${name} ${counter}`;
      counter++;
    }
    usedNames.add(uniqueName);
    return uniqueName;
  };

  const itemEntries = Object.entries(ir.items);

  // Pass 1: Nodes
  itemEntries.forEach(([itemId, item], index) => {
    let nodeType = 'n8n-nodes-base.noOp';
    let typeVersion = 1;

    if (item.meta && item.meta.n8nNodeType) {
      nodeType = item.meta.n8nNodeType;
      typeVersion = item.meta.n8nTypeVersion || 1;
    } else if (item.content && item.content.startsWith(':: n8n ::')) {
      const parts = item.content.split('::');
      const service = parts[2] ? parts[2].trim() : '';
      if (service === 'Webhook') {
        nodeType = 'n8n-nodes-base.webhook';
        typeVersion = 2;
      } else if (service === 'HTTP Request') {
        nodeType = 'n8n-nodes-base.httpRequest';
        typeVersion = 3;
      } else if (service === 'Telegram') {
        nodeType = 'n8n-nodes-base.telegram';
        typeVersion = 1;
      } else if (service === 'Code') {
        nodeType = 'n8n-nodes-base.code';
        typeVersion = 2;
      }
    } else if (item.type === 'question') {
      nodeType = 'n8n-nodes-base.if';
      typeVersion = 2;
    }

    const nodeName = getUniqueName(item.content || '', item.type, itemId);
    nameMap.set(itemId, nodeName);

    const parameters = { ...(item.meta && item.meta.n8nParams || {}) };

    const node = {
      id: itemId,
      name: nodeName,
      type: nodeType,
      typeVersion,
      position: [index * 220, 300],
      parameters,
    };

    if (item.meta && item.meta.credentialName) {
      let credType = 'httpHeaderAuth';
      if (nodeType.includes('telegram')) credType = 'telegramApi';
      else if (nodeType.includes('httpRequest')) credType = 'httpHeaderAuth';

      node.credentials = {
        [credType]: {
          id: '',
          name: item.meta.credentialName,
        },
      };
    }

    nodes.push(node);
  });

  // Pass 2: Connections
  itemEntries.forEach(([itemId, item]) => {
    const sourceName = nameMap.get(itemId);
    if (!sourceName) return;

    const mainConnections = [];

    // Output 0 (one)
    if (item.one && nameMap.has(item.one)) {
      mainConnections[0] = [
        {
          node: nameMap.get(item.one),
          type: 'main',
          index: 0,
        },
      ];
    } else {
      mainConnections[0] = [];
    }

    // Output 1 (two) - question
    if (item.type === 'question') {
      if (item.two && nameMap.has(item.two)) {
        mainConnections[1] = [
          {
            node: nameMap.get(item.two),
            type: 'main',
            index: 0,
          },
        ];
      } else {
        mainConnections[1] = [];
      }
    }

    if (mainConnections[0].length > 0 || (mainConnections[1] && mainConnections[1].length > 0)) {
      connections[sourceName] = { main: mainConnections };
    }
  });

  return {
    name: workflowName,
    nodes,
    connections,
    active: false,
    settings: { executionOrder: 'v1' },
  };
}

function ribosomeEVEInline(ir, projectName) {
  if (!ir || typeof ir !== 'object') {
    throw new Error('Invalid IR diagram');
  }

  const files = {};
  let instructions = '';
  const tools = [];
  let requiresVercelConnect = false;

  const itemEntries = Object.entries(ir.items || {});

  const sanitizeName = (name) => {
    return name.replace(/[^a-zA-Z0-9]/g, '');
  };

  const cleanContent = (content, prefix) => {
    return content.replace(prefix, '').trim();
  };

  let firstActionForInstructions = '';
  const llmBehaviors = [];

  itemEntries.forEach(([itemId, item]) => {
    if (item.meta && (item.meta.nodeKind === 'github' || item.meta.nodeKind === 'tool')) {
      requiresVercelConnect = true;
    }

    const content = item.content || '';
    if (item.type === 'action') {
      if (content.startsWith(':: tool ::')) {
        const fullToolName = cleanContent(content, ':: tool ::');
        const toolNameClean = sanitizeName(fullToolName);
        if (toolNameClean) {
          tools.push({
            name: toolNameClean,
            content: fullToolName
          });
        }
      } else if (content.startsWith(':: llm ::')) {
        llmBehaviors.push(cleanContent(content, ':: llm ::'));
      } else {
        if (!firstActionForInstructions) {
          firstActionForInstructions = content;
        } else {
          instructions += `- ${content}\n`;
        }
      }
    } else if (item.type === 'question') {
      instructions += `- Decision: ${content}\n`;
    }
  });

  // Prepare instructions.md
  let instructionsFileContent = `# Agent Instructions: ${projectName}\n\n`;
  if (firstActionForInstructions) {
    instructionsFileContent += `## Overview\n${firstActionForInstructions}\n\n`;
  }
  if (instructions) {
    instructionsFileContent += `## Workflow rules\n${instructions}\n`;
  }
  if (llmBehaviors.length > 0) {
    instructionsFileContent += `## LLM Behaviors\n`;
    llmBehaviors.forEach(behavior => {
      instructionsFileContent += `- ${behavior}\n`;
    });
  }

  files['agent/instructions.md'] = instructionsFileContent;

  // Prepare tools
  let toolsExports = '';
  tools.forEach(tool => {
    const toolFileName = `agent/tools/${tool.name}.ts`;
    const toolContent = `import { defineTool } from 'eve/tools';
import { z } from 'zod';

export default defineTool({
  name: '${tool.name}',
  description: '${tool.content.replace(/'/g, "\\'")}',
  inputSchema: z.object({ input: z.string() }),
  execute: async ({ input }) => {
    // TODO: implement
    return { result: input };
  }
});
`;
    files[toolFileName] = toolContent;
    toolsExports += `export { default as ${tool.name} } from './tools/${tool.name}';\n`;
  });

  files['agent/tools/index.ts'] = toolsExports;

  // agent.ts
  files['agent/agent.ts'] = `import { defineAgent } from 'eve';
import * as tools from './tools';

export default defineAgent({
  model: 'anthropic/claude-sonnet-4-6',
  tools: Object.values(tools),
});
`;

  // package.json
  files['package.json'] = JSON.stringify({
    name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: '0.1.0',
    dependencies: {
      eve: '0.1.x'
    }
  }, null, 2) + '\n';

  return {
    files,
    deployCommand: 'eve deploy',
    requiresVercelConnect
  };
}

function createZip(files) {
  const encoder = new TextEncoder();
  const fileList = [];
  let currentOffset = 0;
  const chunks = [];

  const makeCrcTable = () => {
    let c;
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
      }
      crcTable[n] = c;
    }
    return crcTable;
  };
  const crcTable = makeCrcTable();

  const crc32 = (data) => {
    let crc = 0 ^ (-1);
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  };

  const writeUint16 = (buf, offset, val) => {
    buf[offset] = val & 0xff;
    buf[offset + 1] = (val >>> 8) & 0xff;
  };
  const writeUint32 = (buf, offset, val) => {
    buf[offset] = val & 0xff;
    buf[offset + 1] = (val >>> 8) & 0xff;
    buf[offset + 2] = (val >>> 16) & 0xff;
    buf[offset + 3] = (val >>> 24) & 0xff;
  };

  for (const [filename, content] of Object.entries(files)) {
    const filenameBytes = encoder.encode(filename);
    const contentBytes = encoder.encode(content);
    const crc = crc32(contentBytes);

    const localHeader = new Uint8Array(30 + filenameBytes.length);
    localHeader.set([0x50, 0x4b, 0x03, 0x04]);
    writeUint16(localHeader, 4, 10);
    writeUint16(localHeader, 6, 0);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, 0);
    writeUint16(localHeader, 12, 0);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, contentBytes.length);
    writeUint32(localHeader, 22, contentBytes.length);
    writeUint16(localHeader, 26, filenameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(filenameBytes, 30);

    chunks.push(localHeader);
    chunks.push(contentBytes);

    fileList.push({
      filenameBytes,
      crc,
      length: contentBytes.length,
      offset: currentOffset
    });

    currentOffset += localHeader.length + contentBytes.length;
  }

  const centralDirectoryOffset = currentOffset;
  let centralDirectorySize = 0;

  for (const file of fileList) {
    const cdHeader = new Uint8Array(46 + file.filenameBytes.length);
    cdHeader.set([0x50, 0x4b, 0x01, 0x02]);
    writeUint16(cdHeader, 4, 20);
    writeUint16(cdHeader, 6, 10);
    writeUint16(cdHeader, 8, 0);
    writeUint16(cdHeader, 10, 0);
    writeUint16(cdHeader, 12, 0);
    writeUint16(cdHeader, 14, 0);
    writeUint32(cdHeader, 16, file.crc);
    writeUint32(cdHeader, 20, file.length);
    writeUint32(cdHeader, 24, file.length);
    writeUint16(cdHeader, 28, file.filenameBytes.length);
    writeUint16(cdHeader, 30, 0);
    writeUint16(cdHeader, 32, 0);
    writeUint16(cdHeader, 34, 0);
    writeUint16(cdHeader, 36, 0);
    writeUint32(cdHeader, 38, 0);
    writeUint32(cdHeader, 42, file.offset);
    cdHeader.set(file.filenameBytes, 46);

    chunks.push(cdHeader);
    centralDirectorySize += cdHeader.length;
  }

  const eocd = new Uint8Array(22);
  eocd.set([0x50, 0x4b, 0x05, 0x06]);
  writeUint16(eocd, 4, 0);
  writeUint16(eocd, 6, 0);
  writeUint16(eocd, 8, fileList.length);
  writeUint16(eocd, 10, fileList.length);
  writeUint32(eocd, 12, centralDirectorySize);
  writeUint32(eocd, 16, centralDirectoryOffset);
  writeUint16(eocd, 20, 0);

  chunks.push(eocd);

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
}

async function getGithubTokenForUser(userId, userJwt, env) {
  const appwriteEndpoint = env.APPWRITE_ENDPOINT || 'https://auth.aidrakon.tech/v1';
  const appwriteProjectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const appwriteApiKey = env.APPWRITE_API_KEY;

  const docUrl = `${appwriteEndpoint}/databases/ai-drakon/collections/user_profiles/documents/${userId}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': appwriteProjectId,
  };
  if (appwriteApiKey) {
    headers['X-Appwrite-Key'] = appwriteApiKey;
  } else if (userJwt) {
    headers['X-Appwrite-JWT'] = userJwt;
  }

  const resp = await fetch(docUrl, { headers });
  if (!resp.ok) {
    throw new Error(`Failed to fetch user profile from Appwrite: status ${resp.status}`);
  }
  const doc = await resp.json();
  const githubToken = doc.githubToken || (doc.data && doc.data.githubToken);
  if (!githubToken) {
    throw new Error('GitHub token not found in user profile');
  }
  return githubToken;
}

async function handleDrakonExecuteDeterministic(request, env) {
  const payload = await verifyOwnerAuth(request, env);
  if (!payload) return errorResponse('Unauthorized', 401);
  
  let body = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch (_) {
    return errorResponse('Invalid JSON body', 400);
  }
  
  const functionId = env.DETERMINISTIC_ENGINE_FUNCTION_ID || '6a33b6050037a2fff34f';
  const projectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const apiKey = env.APPWRITE_API_KEY;
  
  if (!functionId || !apiKey) {
    return errorResponse('DETERMINISTIC_ENGINE_FUNCTION_ID or APPWRITE_API_KEY not configured', 503);
  }
  
  const execRes = await fetch(
    `https://auth.aidrakon.tech/v1/functions/${functionId}/executions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
      body: JSON.stringify({
        async: true,
        body: JSON.stringify(body),
      }),
    }
  );
  
  if (!execRes.ok) {
    const errText = await execRes.text().catch(() => '');
    return errorResponse(`Appwrite execution failed: ${execRes.status} ${errText}`, 502);
  }
  
  const execData = await execRes.json();
  return jsonResponse({ execution_id: execData.$id, status: 'accepted' });
}

async function handleDrakonExecuteDeterministicStatus(request, env) {
  const authPayload = await verifyOwnerAuth(request, env);
  if (!authPayload || authPayload.role !== 'owner') return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');

  const url = new URL(request.url);
  const executionId = url.searchParams.get('execution_id');
  if (!executionId) return errorResponse('execution_id required', 400);

  const functionId = env.DETERMINISTIC_ENGINE_FUNCTION_ID || '6a33b6050037a2fff34f';
  const projectId = env.APPWRITE_PROJECT_ID || '6a23420a003a04b4997b';
  const apiKey = env.APPWRITE_API_KEY;
  
  if (!functionId || !apiKey) return errorResponse('not configured', 503);
  
  const res = await fetch(
    `https://auth.aidrakon.tech/v1/functions/${functionId}/executions/${executionId}`,
    {
      headers: {
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
    }
  );
  
  if (!res.ok) return errorResponse(`Appwrite status check failed: ${res.status}`, 502);
  const data = await res.json();
  
  let output = undefined;
  if (data.status === 'completed') {
    if (data.responseBody) {
      try { output = JSON.parse(data.responseBody); } catch (_) {}
    }
    if (!output || !Array.isArray(output.events)) {
      const logs = data.logs || '';
      const m = logs.match(/DETERMINISTIC_ENGINE_RESULT:([A-Za-z0-9+/=]+)/);
      if (m) {
        try {
          const decoded = atob(m[1]);
          output = JSON.parse(decoded);
        } catch (_) {
          output = undefined;
        }
      }
    }
  }
  
  return jsonResponse({
    execution_id: data.$id,
    status: data.status,
    events: output ? output.events : [],
    error: data.status === 'failed' ? (data.errors || 'Function failed') : undefined,
  });
}

export class RoomDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // Set of active WebSockets
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  handleSession(webSocket) {
    webSocket.accept();
    this.sessions.set(webSocket, true);

    webSocket.addEventListener('message', (event) => {
      // Broadcast to all other sessions
      for (const session of this.sessions.keys()) {
        if (session !== webSocket) {
          try {
            session.send(event.data);
          } catch (e) {
            this.sessions.delete(session);
          }
        }
      }
    });

    webSocket.addEventListener('close', () => {
      this.sessions.delete(webSocket);
    });
    
    webSocket.addEventListener('error', () => {
      this.sessions.delete(webSocket);
    });
  }
}
export class DiagramSyncDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    server.accept();
    this.sessions.add(server);

    server.addEventListener('message', (event) => {
      // Broadcast to all other sessions (Yjs update relay)
      for (const session of this.sessions) {
        if (session !== server) {
          try {
            session.send(event.data);
          } catch (e) {
            this.sessions.delete(session);
          }
        }
      }
    });

    server.addEventListener('close', () => this.sessions.delete(server));
    server.addEventListener('error', () => this.sessions.delete(server));

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}
