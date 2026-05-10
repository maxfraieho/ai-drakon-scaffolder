import { validateIrDeterministic } from '../src/lib/htse/ir-validator-core';
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function handleMcpAnalyzeCodebase(args) {
  const scope = ['overview', 'modules', 'flows', 'procedures'].includes(String(args?.scope || ''))
    ? String(args.scope)
    : 'overview';
  const filterRaw = String(args?.filter || '').trim();
  const filter = toLowerSafe(filterRaw);

  const payload = PRE_ANALYZED_ANALYSIS || {};
  const summary = payload.summary || {};
  const modules = safeArray(summary.modules).map((m) => String(m));
  const detectedFlows = safeArray(summary.detectedFlows).map((f) => String(f));
  const plannedDiagrams = safeArray(payload.plannedDiagrams);

  const filteredModules = filter
    ? modules.filter((m) => toLowerSafe(m).includes(filter))
    : modules;

  const filteredFlows = filter
    ? detectedFlows.filter((f) => toLowerSafe(f).includes(filter))
    : detectedFlows;

  const filteredPlannedDiagrams = plannedDiagrams.filter((diagram) => {
    if (!filter) return true;
    const hay = [diagram?.name, diagram?.description, diagram?.scope].map(toLowerSafe).join(' ');
    return hay.includes(filter);
  });

  const includeModules = scope === 'overview' || scope === 'modules' || scope === 'procedures';
  const includeFlows = scope === 'overview' || scope === 'flows' || scope === 'procedures';

  return {
    generatedAt: payload.generatedAt || null,
    totalFiles: Number(summary.totalFiles || 0),
    totalFunctions: Number(summary.totalFunctions || 0),
    totalComponents: Number(summary.totalComponents || 0),
    modules: includeModules ? filteredModules : [],
    detectedFlows: includeFlows ? filteredFlows : [],
    plannedDiagrams: filteredPlannedDiagrams,
    cacheAge: formatCacheAge(payload.generatedAt),
  };
}

function handleMcpGetAnalysisSummary(args) {
  const type = String(args?.type || '');
  const allowed = new Set(['functions', 'components', 'hooks', 'stores', 'apiClients', 'importGraph']);
  if (!allowed.has(type)) {
    return {
      success: false,
      error: `Unsupported summary type: ${type}`,
      allowedTypes: Array.from(allowed),
    };
  }

  const filter = toLowerSafe(String(args?.filter || '').trim());
  const summary = PRE_ANALYZED_ANALYSIS?.summary || {};
  const source = summary[type];

  if (!filter) {
    return { success: true, type, data: source ?? (type === 'importGraph' ? {} : []) };
  }

  if (type === 'importGraph') {
    const importGraph = source && typeof source === 'object' ? source : {};
    const filteredEntries = Object.entries(importGraph).filter(([from, targets]) => {
      const fromMatch = toLowerSafe(from).includes(filter);
      const targetMatch = safeArray(targets).some((target) => toLowerSafe(target).includes(filter));
      return fromMatch || targetMatch;
    });
    return { success: true, type, data: Object.fromEntries(filteredEntries) };
  }

  const arr = safeArray(source);
  const filtered = arr.filter((item) => toLowerSafe(JSON.stringify(item)).includes(filter));
  return { success: true, type, data: filtered };
}

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyDiagramMutation(items, mutation) {
  const op = String(mutation?.op || '');
  const nodeId = String(mutation?.nodeId || '').trim();

  if (!nodeId) {
    return { ok: false, reason: 'nodeId is required' };
  }

  if (op === 'insertNode') {
    if (items[nodeId]) return { ok: false, reason: `Node already exists: ${nodeId}` };
    if (!mutation.node || typeof mutation.node !== 'object' || Array.isArray(mutation.node)) {
      return { ok: false, reason: 'node must be an object for insertNode' };
    }
    items[nodeId] = cloneObject(mutation.node);
    return { ok: true };
  }

  if (!items[nodeId]) {
    return { ok: false, reason: `Node not found: ${nodeId}` };
  }

  if (op === 'updateNode') {
    if (!mutation.fields || typeof mutation.fields !== 'object' || Array.isArray(mutation.fields)) {
      return { ok: false, reason: 'fields must be an object for updateNode' };
    }
    items[nodeId] = { ...items[nodeId], ...cloneObject(mutation.fields) };
    return { ok: true };
  }

  if (op === 'deleteNode') {
    delete items[nodeId];
    for (const current of Object.values(items)) {
      if (!current || typeof current !== 'object') continue;
      if (current.one === nodeId) current.one = null;
      if (current.two === nodeId) current.two = null;
    }
    return { ok: true };
  }

  if (op === 'setOne' || op === 'setTwo') {
    const key = op === 'setOne' ? 'one' : 'two';
    const target = mutation?.targetId === null ? null : String(mutation?.targetId || '').trim();
    if (target && !items[target]) return { ok: false, reason: `Target node not found: ${target}` };
    items[nodeId][key] = target || null;
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
  working.diagram = working.diagram && typeof working.diagram === 'object' ? working.diagram : {};
  working.diagram.items = working.diagram.items && typeof working.diagram.items === 'object' ? working.diagram.items : {};

  const appliedMutations = [];
  const rejectedMutations = [];

  for (const mutation of mutations) {
    const result = applyDiagramMutation(working.diagram.items, mutation || {});
    if (!result.ok) {
      rejectedMutations.push({ mutation, reason: result.reason || 'Unknown mutation error' });
      continue;
    }
    appliedMutations.push(mutation);
  }

  const validationResult = validateIrDeterministic(working.diagram);
  if (!validationResult.valid) {
    return {
      success: false,
      appliedMutations: [],
      rejectedMutations: [
        ...rejectedMutations,
        ...mutations.map((mutation) => ({ mutation, reason: 'Rejected because resulting diagram failed validation' })),
      ],
      validationResult: {
        valid: validationResult.valid,
        issues: validationResult.issues || [],
      },
      newVersion: Number(stored?.version || stored?.diagram?.version || 0),
    };
  }

  const previousVersion = Number(stored?.version || stored?.diagram?.version || 0);
  const newVersion = previousVersion + 1;
  working.version = newVersion;
  working.updatedAt = new Date().toISOString();
  working.diagram.version = newVersion;

  await uploadToMinIO(env, key, JSON.stringify(working, null, 2));

  return {
    success: true,
    appliedMutations,
    rejectedMutations,
    validationResult: {
      valid: validationResult.valid,
      issues: validationResult.issues || [],
    },
    newVersion,
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

function getMcpTools() {
  return [
    {
      name: 'drakon.list_diagrams',
      description: 'List diagram IDs in a DRAKON folder.',
      inputSchema: {
        type: 'object',
        properties: {
          folderSlug: { type: 'string' },
        },
        required: ['folderSlug'],
      },
    },
    {
      name: 'drakon.get_diagram',
      description: 'Read one DRAKON diagram JSON by folder and id.',
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
      name: 'drakon.save_diagram',
      description: 'Create or update one DRAKON diagram JSON.',
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
      name: 'drakon.delete_diagram',
      description: 'Delete one DRAKON diagram JSON.',
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
      description: 'Run deterministic validation for Canonical IR before rendering.',
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
      description: 'Read the pre-analyzed TypeScript project snapshot generated by the local analyzer script. Returns structural summary including files, functions, components, hooks, stores, API clients and planned DRAKON diagrams.',
      inputSchema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['overview', 'modules', 'flows', 'procedures'],
            default: 'overview',
          },
          filter: { type: 'string' },
        },
      },
    },
    {
      name: 'drakon.getanalysissummary',
      description: 'Get detailed analysis data for a specific scope or module from the cached project analysis. Use after drakon.analyzecodebase to drill into specific components, functions or flows.',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['functions', 'components', 'hooks', 'stores', 'apiClients', 'importGraph'],
          },
          filter: { type: 'string' },
        },
        required: ['type'],
      },
    },
    {
      name: 'drakon.mutatediagram',
      description: 'Apply one or more granular patch mutations to an existing diagram without full JSON rewrite. Supports insert, update, delete nodes and pointer changes. Each mutation is validated before saving.',
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
                    node: { type: 'object' },
                  },
                  required: ['op', 'nodeId', 'node'],
                },
                {
                  type: 'object',
                  properties: {
                    op: { type: 'string', enum: ['updateNode'] },
                    nodeId: { type: 'string' },
                    fields: { type: 'object' },
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
              ],
            },
          },
        },
        required: ['diagramId', 'folderId', 'mutations'],
      },
    },
    {
      name: 'drakon.diffcodevsdiagram',
      description: 'Compare cached code analysis against stored diagrams to find coverage gaps. Returns matched symbols, missing diagrams and orphaned diagrams.',
      inputSchema: {
        type: 'object',
        properties: {
          diagramIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
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

    if (name === 'drakon.list_diagrams') {
      const result = await handleDrakonList(String(args.folderSlug || ''), env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(await result.json()) });
    }

    if (name === 'drakon.get_diagram') {
      const result = await handleDrakonGet(String(args.folderSlug || ''), String(args.diagramId || ''), env);
      return jsonResponse({ jsonrpc: '2.0', id, result: toolResultJson(await result.json()) });
    }

    if (name === 'drakon.save_diagram') {
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

    if (name === 'drakon.delete_diagram') {
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