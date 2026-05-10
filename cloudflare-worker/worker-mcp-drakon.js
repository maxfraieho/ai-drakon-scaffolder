import { validateIrDeterministic } from '../src/lib/htse/ir-validator-core';
import { convertDiagramToIr } from '../src/lib/htse/diagram-to-ir';
import { convertIrToDiagram } from '../src/lib/htse/ir-to-diagram';
import { PRE_ANALYZED_ANALYSIS } from './generated-analysis-cache';

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

async function generateJWT(payload, secret, ttlMs = 24 * 60 * 60 * 1000) {
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

async function verifyOwnerAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  // Статичний MCP API key (для Claude.ai Dashboard та інших MCP клієнтів)
  if (env.MCP_API_KEY && token === env.MCP_API_KEY) {
    return { role: 'owner', sub: 'mcp-agent' };
  }

  // JWT (для фронтенду)
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'owner') return null;

  return payload;
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
  const endpoint = String(env.MINIO_ENDPOINT || '').replace(/\/+$/, '');
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
  const canonicalRequest = [method, canonicalUri, queryString, canonicalHeaders, '', signedHeaders, payloadHash].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const region = 'us-east-1';
  const service = 's3';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [algorithm, date, credentialScope, await sha256Hex(canonicalRequest)].join('\n');

  const kDate = await hmacSha256Raw(`AWS4${env.MINIO_SECRET_KEY}`, dateStamp);
  const kRegion = await hmacSha256Raw(kDate, region);
  const kService = await hmacSha256Raw(kRegion, service);
  const kSigning = await hmacSha256Raw(kService, 'aws4_request');
  const signature = await hmacSha256Hex(kSigning, stringToSign);

  const authorization = `${algorithm} Credential=${env.MINIO_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

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
  const required = ['MINIO_ENDPOINT', 'MINIO_BUCKET', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing MinIO vars: ${missing.join(', ')}`);
  }
}

async function uploadToMinIO(env, key, content, contentType = 'application/json; charset=utf-8') {
  ensureMinioConfig(env);

  const endpoint = String(env.MINIO_ENDPOINT).replace(/\/+$/, '');
  const bucket = env.MINIO_BUCKET;
  const encodedKey = encodeS3KeyForPath(key);
  const payload = String(content);
  const payloadHash = await sha256Hex(payload);
  const canonicalUri = `/${bucket}/${encodedKey}`;
  const headers = await signS3Request(env, 'PUT', canonicalUri, '', payloadHash, {
    'content-type': contentType,
  });

  const response = await fetch(`${endpoint}/${bucket}/${encodedKey}`, {
    method: 'PUT',
    headers,
    body: payload,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MinIO PUT failed: ${response.status} ${text}`);
  }

  return true;
}

async function getFromMinIO(env, key) {
  ensureMinioConfig(env);

  const endpoint = String(env.MINIO_ENDPOINT).replace(/\/+$/, '');
  const bucket = env.MINIO_BUCKET;
  const encodedKey = encodeS3KeyForPath(key);
  const canonicalUri = `/${bucket}/${encodedKey}`;
  const payloadHash = await sha256Hex('');
  const headers = await signS3Request(env, 'GET', canonicalUri, '', payloadHash);

  const response = await fetch(`${endpoint}/${bucket}/${encodedKey}`, { method: 'GET', headers });
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MinIO GET failed: ${response.status} ${text}`);
  }

  return await response.text();
}

async function deleteFromMinIO(env, key) {
  ensureMinioConfig(env);

  const endpoint = String(env.MINIO_ENDPOINT).replace(/\/+$/, '');
  const bucket = env.MINIO_BUCKET;
  const encodedKey = encodeS3KeyForPath(key);
  const canonicalUri = `/${bucket}/${encodedKey}`;
  const payloadHash = await sha256Hex('');
  const headers = await signS3Request(env, 'DELETE', canonicalUri, '', payloadHash);

  const response = await fetch(`${endpoint}/${bucket}/${encodedKey}`, { method: 'DELETE', headers });
  if (response.status === 404) return true;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MinIO DELETE failed: ${response.status} ${text}`);
  }

  return true;
}

async function listMinioKeys(env, prefix) {
  ensureMinioConfig(env);

  const endpoint = String(env.MINIO_ENDPOINT).replace(/\/+$/, '');
  const bucket = env.MINIO_BUCKET;
  const queryString = `delimiter=%2F&list-type=2&prefix=${encodeURIComponent(prefix)}`;
  const canonicalUri = `/${bucket}`;
  const payloadHash = await sha256Hex('');
  const headers = await signS3Request(env, 'GET', canonicalUri, queryString, payloadHash);

  const response = await fetch(`${endpoint}/${bucket}?list-type=2&prefix=${encodeURIComponent(prefix)}&delimiter=/`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MinIO LIST failed: ${response.status} ${text}`);
  }

  const xml = await response.text();
  const keys = [];
  const matches = xml.matchAll(/<Key>([^<]+)<\/Key>/g);
  for (const match of matches) {
    keys.push(match[1]);
  }

  return keys;
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

function handleMcpAnalyzeCodebase(args) {
  const repositoryPath = String(args?.repositoryPath || '').trim();
  if (!repositoryPath) {
    return { error: 'repositoryPath is required' };
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

async function handleMcpMutateDiagram(args, env) {
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

  const key = `drakon/${folderId}/${diagramId}.json`;
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
  if (!ownerPasswordHash) {
    return errorResponse('OWNER_PASSWORD_HASH is not configured', 500, undefined, 'SERVER_CONFIG_ERROR');
  }

  const hashHex = await hashPassword(password, env.JWT_SECRET);
  if (username !== ownerUsername || hashHex !== ownerPasswordHash) {
    return errorResponse('Invalid credentials', 401, undefined, 'INVALID_CREDENTIALS');
  }

  const token = await generateJWT({ role: 'owner', sub: ownerUsername }, env.JWT_SECRET, 24 * 60 * 60 * 1000);
  return jsonResponse({ success: true, token, jwt: token, expiresInMs: 24 * 60 * 60 * 1000 });
}

async function handleDrakonCommit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400, undefined, 'INVALID_JSON');
  }

  const folderSlug = String(body?.folderSlug || '').trim();
  const diagramId = String(body?.diagramId || '').trim();
  if (!folderSlug || !diagramId) {
    return errorResponse('folderSlug and diagramId are required', 400, undefined, 'BAD_REQUEST');
  }

  const normalized = normalizeDiagramPayload(body.diagram || body, folderSlug, diagramId);
  const key = `drakon/${folderSlug}/${diagramId}.json`;
  await uploadToMinIO(env, key, JSON.stringify(normalized, null, 2));

  return jsonResponse({ success: true, folderSlug, diagramId, diagram: normalized });
}

async function handleDrakonGet(folderSlug, diagramId, env) {
  const key = `drakon/${folderSlug}/${diagramId}.json`;
  const content = await getFromMinIO(env, key);
  if (!content) return errorResponse('Diagram not found', 404, { folderSlug, diagramId }, 'NOT_FOUND');

  return jsonResponse({ success: true, diagram: JSON.parse(content) });
}

async function handleDrakonDelete(folderSlug, diagramId, env) {
  const key = `drakon/${folderSlug}/${diagramId}.json`;
  await deleteFromMinIO(env, key);
  return jsonResponse({ success: true, folderSlug, diagramId });
}

async function handleDrakonList(folderSlug, env) {
  const prefix = `drakon/${folderSlug}/`;
  const keys = await listMinioKeys(env, prefix);
  const diagrams = keys
    .filter((k) => k.endsWith('.json') && !k.endsWith('meta.json'))
    .map((k) => k.split('/').pop().replace('.json', ''));

  return jsonResponse({ success: true, folderSlug, diagrams });
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
  const content = data.encoding === 'base64' ? atob((data.content || '').replace(/\n/g, '')) : String(data.content || '');

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
        },
        required: ['repositoryPath'],
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
  ];
}

function toolResultJson(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
  };
}

async function handleMcp(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON-RPC payload', 400, undefined, 'INVALID_JSON');
  }

  const id = body?.id ?? null;
  const method = body?.method;
  const params = body?.params || {};

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

    if (name === 'drakon.listdiagrams') {
      const result = await handleDrakonList(String(args.folderSlug || ''), env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(await result.json()) });
    }

    if (name === 'drakon.getdiagram') {
      const result = await handleDrakonGet(String(args.folderSlug || ''), String(args.diagramId || ''), env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(await result.json()) });
    }

    if (name === 'drakon.savediagram') {
      const fakeRequest = new Request('https://internal.local/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderSlug: String(args.folderSlug || ''),
          diagramId: String(args.diagramId || ''),
          diagram: args.diagram || {},
        }),
      });
      const result = await handleDrakonCommit(fakeRequest, env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(await result.json()) });
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
      const result = handleMcpAnalyzeCodebase(args);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'drakon.getanalysissummary') {
      const result = handleMcpGetAnalysisSummary(args);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'drakon.mutatediagram') {
      const result = await handleMcpMutateDiagram(args, env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(result) });
    }

    if (name === 'drakon.diffcodevsdiagram') {
      const result = handleMcpDiffCodeVsDiagram(args);
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

    return jsonResponse({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } }, 404);
  }

  return jsonResponse({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } }, 404);
}

async function handleHealth() {
  return jsonResponse({
    success: true,
    status: 'ok',
    service: 'drakon-mcp-worker',
    timestamp: new Date().toISOString(),
    features: ['auth', 'minio-s3', 'drakon-rest', 'mcp-jsonrpc'],
  });
}

export default {
  async fetch(request, env) {
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

      if (method === 'GET' && path === '/health') {
        return await handleHealth();
      }

      if (method === 'POST' && path === '/auth/login') {
        return await handleAuthLogin(request, env);
      }

      if (method === 'POST' && path === '/mcp') {
        const owner = await verifyOwnerAuth(request, env);
        if (!owner) return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
        return await handleMcp(request, env);
      }

      const ownerPayload = await verifyOwnerAuth(request, env);
      if (!ownerPayload) {
        return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
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

      return errorResponse('Not found', 404, { method, path }, 'NOT_FOUND');
    } catch (e) {
      return errorResponse(`Internal error: ${e.message || 'Unknown error'}`, 500, undefined, 'INTERNAL_ERROR');
    }
  },
};