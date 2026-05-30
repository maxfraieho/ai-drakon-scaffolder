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

// Structured logger — output visible via `wrangler tail`
function log(level, msg, data = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...data }));
}

// Save a single log entry to MinIO at logs/{date}/{ts}-{tool}.json
// Never throws — logging failures are silent (to avoid infinite loops)
async function saveLogToMinio(env, entry) {
  if (!env.MINIO_SECRET_KEY || !env.MINIO_ENDPOINT) return;
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

async function generateJWT(payload, secret, ttlMs = 7 * 24 * 60 * 60 * 1000) {
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
  const canonicalRequest = [method, canonicalUri, queryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');

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
  const encodedPrefix = encodeURIComponent(prefix);
  const queryString = `delimiter=%2F&list-type=2&prefix=${encodedPrefix}`;
  const canonicalUri = `/${bucket}`;
  const payloadHash = await sha256Hex('');
  const headers = await signS3Request(env, 'GET', canonicalUri, queryString, payloadHash);

  const response = await fetch(`${endpoint}/${bucket}?delimiter=%2F&list-type=2&prefix=${encodedPrefix}`, {
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
      const fakeRequest = new Request('https://internal.local/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const result = await handleMcpMutateDiagram(args, env);
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

const VALID_AGENT_IDS = ['drakon', 'architect', 'docs'];
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

  const { message, context, agentUrl } = body;
  if (!message || typeof message !== 'string') {
    return errorResponse('message is required', 400, undefined, 'MISSING_FIELD');
  }

  // agentUrl from client (from Settings), fallback to env vars
  const defaultUrls = {
    drakon: env.DRAKON_AGENT_URL || 'https://drakon-agent.exodus.pp.ua',
    architect: env.ARCHITECT_AGENT_URL || 'https://architect-agent.exodus.pp.ua',
    docs: env.DOCS_AGENT_URL || 'https://docs-agent.exodus.pp.ua',
  };
  const targetUrl = (typeof agentUrl === 'string' && agentUrl.startsWith('https://'))
    ? agentUrl
    : defaultUrls[agentId];

  // Route: DRAKON + Python code → /analyze, otherwise → /chat
  const usesAnalyze = agentId === 'drakon' && isPythonCode(message);
  const endpoint = usesAnalyze ? '/analyze' : '/chat';
  const agentBody = usesAnalyze
    ? JSON.stringify({ code: message, refine: true })
    : JSON.stringify({ message, context: context || null });

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

      if (method === 'GET' && path === '/health') {
        return await handleHealth(env);
      }

      if (method === 'POST' && path === '/auth/login') {
        return await handleAuthLogin(request, env);
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
      // ──────────────────────────────────────────────────────────────────────

      // ─── GitHub read-only routes (no auth needed — Worker uses server-side token) ─────
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
      if (method === 'GET' && path === '/v1/github/branches') {
        const owner = url.searchParams.get('owner') || '';
        const repo = url.searchParams.get('repo') || '';
        const requestToken = request.headers.get('X-Github-Token') || '';
        return jsonResponse(await handleGithubListBranches({ owner, repo }, env, requestToken));
      }
      // ─────────────────────────────────────────────────────────────────────

      // ─── Pipeline SSE (auth via ?token= query param — EventSource не підтримує headers) ─
      const pipelineStreamMatch = path.match(/^\/v1\/pipeline\/stream\/([^\/]+)$/);
      if (method === 'GET' && pipelineStreamMatch) {
        const streamJobId = decodeURIComponent(pipelineStreamMatch[1]);
        const qToken = new URL(request.url).searchParams.get('token') || '';
        const streamPayload = await verifyJWT(qToken, env.JWT_SECRET).catch(() => null);
        if (!streamPayload) return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
        return await handlePipelineStream(streamJobId, env, ctx);
      }
      // ─────────────────────────────────────────────────────────────────────

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
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return errorResponse('Authorization required', 401);
  try {
    await verifyJWT(token, env.JWT_SECRET || env.AUTH_SECRET || '');
  } catch {
    return errorResponse('Invalid or expired token', 401);
  }

  let body;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON', 400); }

  // Lovable sends: { slug, path, content (full markdown with FM), sha, message }
  // Our format: { slug, title, content (body only), tags }
  // Handle both formats
  let slug = body.slug || '';
  let title = body.title;
  let bodyContent = body.content || '';
  let tags = body.tags || [];

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
    body: JSON.stringify({ slug, title, content: bodyContent, tags }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return errorResponse(`docs-agent /notes/write ${res.status}: ${errText}`, 502);
  }
  return jsonResponse(await res.json());
}

async function handleNotesDelete(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return errorResponse('Authorization required', 401);
  try {
    await verifyJWT(token, env.JWT_SECRET || env.AUTH_SECRET || '');
  } catch {
    return errorResponse('Invalid or expired token', 401);
  }

  let body;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON', 400); }
  const slug = body.slug || '';
  if (!slug) return errorResponse('slug required', 400);

  const res = await fetch(`${DOCS_AGENT_URL}/notes/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return errorResponse(`docs-agent /notes/delete ${res.status}`, 502);
  return jsonResponse(await res.json());
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
      // ─── Agent proxy ──────────────────────────────────────────────────
      const agentChatMatch = path.match(/^\/v1\/agents\/([^\/]+)\/chat$/);
      if (method === 'POST' && agentChatMatch) {
        return await handleAgentChat(agentChatMatch[1], request, env, ctx);
      }

      const agentHealthMatch = path.match(/^\/v1\/agents\/([^\/]+)\/health$/);
      if (method === 'GET' && agentHealthMatch) {
        return await handleAgentHealth(agentHealthMatch[1], env);
      }
      // ──────────────────────────────────────────────────────────────────

      return errorResponse('Not found', 404, { method, path }, 'NOT_FOUND');
    } catch (e) {
      return errorResponse(`Internal error: ${e.message || 'Unknown error'}`, 500, undefined, 'INTERNAL_ERROR');
    }
  },
};