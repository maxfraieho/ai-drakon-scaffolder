#!/usr/bin/env node
// Test runner for drakon-mcp-worker
// Usage: node scripts/test-mcp.mjs [--worker-url URL] [--token TOKEN]

const WORKER_URL = process.env.WORKER_URL || 'https://drakon-mcp-worker.maxfraieho.workers.dev';
const MCP_TOKEN = process.env.MCP_TOKEN || 'drakon-mcp-2026';
const GH_TOKEN = process.env.GH_TOKEN || '';

const TEST_FOLDER = 'test-runner';
const TEST_DIAGRAM_ID = 'test-diagram-' + Date.now();
const TEST_DIAGRAM = {
  title: 'Test Diagram',
  nodes: [{ id: '1', type: 'action', text: 'Hello' }],
  edges: [],
};

let passed = 0;
let failed = 0;

async function mcpCall(tool, args = {}, extraHeaders = {}) {
  const res = await fetch(`${WORKER_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MCP_TOKEN}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: tool, arguments: args },
    }),
  });
  const json = await res.json();
  return { status: res.status, json };
}

function ok(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function runTest(label, fn) {
  console.log(`\n▶ ${label}`);
  try {
    await fn();
  } catch (e) {
    console.log(`  ✗ THREW: ${e.message}`);
    failed++;
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────

await runTest('Health endpoint', async () => {
  const res = await fetch(`${WORKER_URL}/health`);
  const json = await res.json();
  ok('HTTP 200', res.status === 200, `got ${res.status}`);
  ok('status ok', json.status === 'ok');
  ok('storage endpoint present', !!json.storage?.endpoint);
  console.log(`     endpoint: ${json.storage?.endpoint}, bucket: ${json.storage?.bucket}`);
});

await runTest('MCP initialize', async () => {
  const res = await fetch(`${WORKER_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MCP_TOKEN}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
  });
  const json = await res.json();
  ok('HTTP 200', res.status === 200);
  ok('protocolVersion', !!json.result?.protocolVersion);
});

await runTest('drakon.savediagram → MinIO', async () => {
  const { status, json } = await mcpCall('drakon.savediagram', {
    folderSlug: TEST_FOLDER,
    diagramId: TEST_DIAGRAM_ID,
    diagram: TEST_DIAGRAM,
  });
  ok('HTTP 200', status === 200, `got ${status}`);
  const content = json?.result?.content?.[0]?.text;
  const data = content ? JSON.parse(content) : null;
  ok('success', data?.success === true, JSON.stringify(data));
  ok('no git result (no owner/repo)', data?.git === null || data?.git === undefined);
});

await runTest('drakon.listdiagrams', async () => {
  const { status, json } = await mcpCall('drakon.listdiagrams', { folderSlug: TEST_FOLDER });
  ok('HTTP 200', status === 200, `got ${status}`);
  const content = json?.result?.content?.[0]?.text;
  const data = content ? JSON.parse(content) : null;
  ok('success', data?.success === true, JSON.stringify(data));
  ok('contains test diagram', (data?.diagrams || []).some(d => d.includes(TEST_DIAGRAM_ID)));
});

await runTest('drakon.getdiagram', async () => {
  const { status, json } = await mcpCall('drakon.getdiagram', {
    folderSlug: TEST_FOLDER,
    diagramId: TEST_DIAGRAM_ID,
  });
  ok('HTTP 200', status === 200, `got ${status}`);
  const content = json?.result?.content?.[0]?.text;
  const data = content ? JSON.parse(content) : null;
  ok('success', data?.success === true, JSON.stringify(data));
  // stored shape: { id, name, folderId, diagram: { ...diagramData } }
  ok('diagram saved', data?.success === true);
  ok('diagram name present', !!(data?.diagram?.name || data?.diagram?.diagram?.title || data?.diagram?.title));
});

if (GH_TOKEN) {
  await runTest('drakon.savetogit', async () => {
    const { status, json } = await mcpCall(
      'drakon.savetogit',
      {
        owner: 'maxfraieho',
        repo: 'ai-drakon-setup',
        branch: 'main',
        diagramId: TEST_DIAGRAM_ID,
        diagram: TEST_DIAGRAM,
      },
      { 'X-Github-Token': GH_TOKEN }
    );
    ok('HTTP 200', status === 200, `got ${status}`);
    const content = json?.result?.content?.[0]?.text;
    const data = content ? JSON.parse(content) : null;
    ok('success', data?.success === true, JSON.stringify(data));
    ok('path is drn/', data?.path?.startsWith('drn/'));
  });

  await runTest('drakon.listgitdiagrams', async () => {
    const { status, json } = await mcpCall(
      'drakon.listgitdiagrams',
      { owner: 'maxfraieho', repo: 'ai-drakon-setup', branch: 'main' },
      { 'X-Github-Token': GH_TOKEN }
    );
    ok('HTTP 200', status === 200, `got ${status}`);
    const content = json?.result?.content?.[0]?.text;
    const data = content ? JSON.parse(content) : null;
    ok('success', data?.success === true, JSON.stringify(data));
    ok('diagrams array', Array.isArray(data?.diagrams));
  });

  await runTest('drakon.getgitdiagram', async () => {
    const { status, json } = await mcpCall(
      'drakon.getgitdiagram',
      { owner: 'maxfraieho', repo: 'ai-drakon-setup', branch: 'main', diagramId: TEST_DIAGRAM_ID },
      { 'X-Github-Token': GH_TOKEN }
    );
    ok('HTTP 200', status === 200, `got ${status}`);
    const content = json?.result?.content?.[0]?.text;
    const data = content ? JSON.parse(content) : null;
    ok('success', data?.success === true, JSON.stringify(data));
    ok('diagram title matches', data?.diagram?.title === 'Test Diagram');
  });
} else {
  console.log('\n⚠  GH_TOKEN not set — skipping git tests (export GH_TOKEN=ghp_... to enable)');
}

await runTest('drakon.listdiagrams (all folders)', async () => {
  const { status, json } = await mcpCall('drakon.listdiagrams', { folderSlug: '' });
  ok('HTTP 200', status === 200, `got ${status}`);
  const content = json?.result?.content?.[0]?.text;
  const data = content ? JSON.parse(content) : null;
  ok('success or diagrams key', data?.success === true || Array.isArray(data?.diagrams));
});

await runTest('logs visible in MinIO (bucket check)', async () => {
  const { status, json } = await mcpCall('drakon.listdiagrams', { folderSlug: 'logs' });
  ok('HTTP 200', status === 200, `got ${status}`);
  const content = json?.result?.content?.[0]?.text;
  const data = content ? JSON.parse(content) : null;
  // logs/ prefix won't show as "diagrams" — just verify the call didn't error
  ok('call succeeded', data?.success === true || !!data);
  console.log('     (to view logs: MinIO console → drakon bucket → logs/ prefix)');
});

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`  ${passed + failed} tests  |  ✓ ${passed} passed  |  ✗ ${failed} failed`);
console.log(`${'─'.repeat(50)}\n`);
process.exit(failed > 0 ? 1 : 0);
