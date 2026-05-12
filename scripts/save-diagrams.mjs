#!/usr/bin/env node
// Save DRAKON diagrams for the free-claude-code (OpenAI proxy) project
// Diagrams describe: request pipeline, SlotRouter, score_candidate, provider resolution
//
// Usage: node scripts/save-diagrams.mjs
// Requires: DRAKON MCP worker running at WORKER_URL with MCP_TOKEN
//           GH_TOKEN with write access to OWNER/REPO
//
// Correct widget format: branch-based (type:'branch', branchId:0 as entry point)
// NOT IR format (type:'input') -- widget requires 'branch' to render flowchart body

// Resave DRAKON diagrams in correct widget format (branch-based, not IR-input-based)

const WORKER_URL = 'https://drakon-mcp-worker.maxfraieho.workers.dev';
const MCP_TOKEN = 'drakon-mcp-2026';
const GH_TOKEN = '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';
const FOLDER = 'free-claude-code';
const OWNER = 'maxfraieho';
const REPO = 'free-claude-code-alpine';
const BRANCH_NAME = 'main';

async function saveDiagram(diagramId, diagram) {
  const res = await fetch(`${WORKER_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MCP_TOKEN}`,
      'X-Github-Token': GH_TOKEN,
    },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: {
        name: 'drakon.savediagram',
        arguments: { folderSlug: FOLDER, diagramId, diagram, owner: OWNER, repo: REPO, branch: BRANCH_NAME },
      },
    }),
  });
  const json = await res.json();
  const content = json?.result?.content?.[0]?.text;
  const data = content ? JSON.parse(content) : json;
  const status = data?.success ? '✓' : `✗ ${data?.error}`;
  console.log(`  ${diagramId}: ${status}`);
  return data?.success;
}

// Diagram 1: OpenAI Proxy request pipeline
// Format: branch(branchId:0) → actions/questions → end
const requestPipeline = {
  name: 'OpenAI Proxy — Chat Completion Request',
  params: 'POST /v1/chat/completions, model, messages',
  items: {
    'end':  { type: 'end' },
    'b0':   { type: 'branch', branchId: 0, one: 'n1' },
    'n1':   { type: 'action',   content: 'Receive POST /v1/chat/completions\nmodel, messages, stream?', one: 'n2' },
    'n2':   { type: 'action',   content: 'Extract x-api-key / Authorization header', one: 'n3' },
    'n3':   { type: 'question', content: 'Token matches\nproxy token?', one: 'n4', two: 'n3e' },
    'n3e':  { type: 'action',   content: 'HTTP 401 Unauthorized', one: 'end' },
    'n4':   { type: 'action',   content: 'SlotRouter.resolve_slot(model)\nNormalize alias → slot_id', one: 'n5' },
    'n5':   { type: 'question', content: 'Slot found\nand not disabled?', one: 'n6', two: 'n5e' },
    'n5e':  { type: 'action',   content: 'HTTP 404 model_not_found', one: 'end' },
    'n6':   { type: 'action',   content: 'get_task_type(messages)\nSlotRouter.get_candidates(slot, task_type)', one: 'n7' },
    'n7':   { type: 'question', content: 'Has available\ncandidates?', one: 'n8', two: 'n7e' },
    'n7e':  { type: 'action',   content: 'HTTP 503 no_available_backend', one: 'end' },
    'n8':   { type: 'action',   content: 'Pick first candidate (provider, model)\nBuild AsyncOpenAI client', one: 'n9' },
    'n9':   { type: 'action',   content: 'Call provider.chat.completions.create()\nstream=True/False', one: 'n10' },
    'n10':  { type: 'question', content: 'Provider returned\nsuccessful response?', one: 'n11', two: 'n10f' },
    'n10f': { type: 'action',   content: 'Mark provider degraded\nPop candidate from list', one: 'n7' },
    'n11':  { type: 'question', content: 'stream requested?', one: 'n12', two: 'n13' },
    'n12':  { type: 'action',   content: 'StreamingResponse\nSSE chunks: data: {...}\\n\\n', one: 'end' },
    'n13':  { type: 'action',   content: 'JSONResponse\n{ choices, usage, model }', one: 'end' },
  },
};

// Diagram 2: SlotRouter.resolve_slot
const resolveSlot = {
  name: 'SlotRouter — resolve_slot(model_name)',
  params: 'model_name: str',
  items: {
    'end':  { type: 'end' },
    'b0':   { type: 'branch', branchId: 0, one: 'n1' },
    'n1':   { type: 'action',   content: 'normalized = model_name.strip()', one: 'n2' },
    'n2':   { type: 'question', content: '"/" in normalized?', one: 'n2a', two: 'n3' },
    'n2a':  { type: 'action',   content: 'normalized = suffix after last "/"', one: 'n3' },
    'n3':   { type: 'action',   content: 'normalized = ALIASES.get(normalized, normalized)', one: 'n4' },
    'n4':   { type: 'action',   content: 'Iterate slots from slots_loader()', one: 'n5' },
    'n5':   { type: 'question', content: 'slot.slot_id\n== normalized?', one: 'n6', two: 'n8' },
    'n6':   { type: 'question', content: 'slot.mode\n== "disabled"?', one: 'n6a', two: 'n6b' },
    'n6a':  { type: 'action',   content: 'return None\n(slot disabled)', one: 'end' },
    'n6b':  { type: 'action',   content: 'return slot: ProxySlotConfig', one: 'end' },
    'n8':   { type: 'question', content: 'More slots?', one: 'n4', two: 'n9' },
    'n9':   { type: 'action',   content: 'return None\n(no matching slot)', one: 'end' },
  },
};

// Diagram 3: SlotRouter.score_candidate
const scoreCandidate = {
  name: 'SlotRouter — score_candidate(candidate, health, task_type)',
  params: 'candidate: ProxyCandidate, health: BackendHealth, task_type: str | None',
  items: {
    'end':  { type: 'end' },
    'b0':   { type: 'branch', branchId: 0, one: 'n1' },
    'n1':   { type: 'action',   content: 'capability_score = 1.0 if "chat" in capabilities\n+ 0.2 if "streaming" in capabilities', one: 'n2' },
    'n2':   { type: 'question', content: 'health.state?', one: 'n2ok', two: 'n2bad' },
    'n2ok': { type: 'action',   content: 'health_score = 1.0\n(healthy)', one: 'n4' },
    'n2bad':{ type: 'question', content: 'state ==\ndegraded?', one: 'n2d', two: 'n2c' },
    'n2d':  { type: 'action',   content: 'health_score = 0.4', one: 'n4' },
    'n2c':  { type: 'question', content: 'state ==\ncooling_down?', one: 'n2cd', two: 'n2u' },
    'n2cd': { type: 'action',   content: 'health_score = -2.0', one: 'n4' },
    'n2u':  { type: 'action',   content: 'health_score = -4.0\n(unavailable)', one: 'n4' },
    'n4':   { type: 'action',   content: 'specialization_score = 1.0\nif task_type in specializations\nelse 0.0', one: 'n5' },
    'n5':   { type: 'question', content: 'latency_ms_p50 > 0?', one: 'n5a', two: 'n5b' },
    'n5a':  { type: 'action',   content: 'latency_bonus = max(0, 1000-p50) / 1000', one: 'n6' },
    'n5b':  { type: 'action',   content: 'latency_bonus = 0.0', one: 'n6' },
    'n6':   { type: 'question', content: 'ROUTER_SMART_ENABLED\n== "1" and analysis?', one: 'n6a', two: 'n6b' },
    'n6a':  { type: 'action',   content: 'analysis_bonus = calc_analysis_bonus(slot_id, analysis)', one: 'n7' },
    'n6b':  { type: 'action',   content: 'analysis_bonus = 0.0', one: 'n7' },
    'n7':   { type: 'action',   content: 'score = capability*100 + health*50\n+ specialization*40 + analysis*25\n+ latency*10 + weight*5', one: 'end' },
  },
};

// Diagram 4: Provider client resolution
const providerClientResolution = {
  name: 'Provider — get_client_for_provider(provider_name, settings)',
  params: 'provider_name: str, settings: Settings',
  items: {
    'end':  { type: 'end' },
    'b0':   { type: 'branch', branchId: 0, one: 'n1' },
    'n1':   { type: 'action',   content: 'descriptor = PROVIDER_DESCRIPTORS.get(provider_name)', one: 'n2' },
    'n2':   { type: 'question', content: 'descriptor\nfound?', one: 'n3', two: 'n8' },
    'n3':   { type: 'question', content: 'credential_attr\nset?', one: 'n3a', two: 'n3b' },
    'n3a':  { type: 'action',   content: 'api_key = getattr(settings, credential_attr)\nor "none"', one: 'n5' },
    'n3b':  { type: 'question', content: 'static_credential\nset?', one: 'n3c', two: 'n3d' },
    'n3c':  { type: 'action',   content: 'api_key = descriptor.static_credential', one: 'n5' },
    'n3d':  { type: 'action',   content: 'api_key = "none"', one: 'n5' },
    'n5':   { type: 'question', content: 'base_url_attr\nset?', one: 'n5a', two: 'n5b' },
    'n5a':  { type: 'action',   content: 'base_url = getattr(settings, base_url_attr)\nor descriptor.default_base_url', one: 'n6' },
    'n5b':  { type: 'action',   content: 'base_url = descriptor.default_base_url', one: 'n6' },
    'n6':   { type: 'question', content: 'provider == "ollama"\nand url not ending /v1?', one: 'n6a', two: 'n7' },
    'n6a':  { type: 'action',   content: 'base_url = base_url.rstrip("/") + "/v1"', one: 'n7' },
    'n7':   { type: 'action',   content: 'return AsyncOpenAI(\n  api_key=api_key,\n  base_url=base_url,\n  timeout=25.0\n)', one: 'end' },
    'n8':   { type: 'action',   content: 'Try custom_provider_store.find_by_provider(name)', one: 'n9' },
    'n9':   { type: 'question', content: 'Custom entry\nfound?', one: 'n10', two: 'n11' },
    'n10':  { type: 'action',   content: 'return AsyncOpenAI(\n  api_key=entry.api_key,\n  base_url=entry.base_url\n)', one: 'end' },
    'n11':  { type: 'action',   content: 'return None\n(unknown provider)', one: 'end' },
  },
};

console.log('Resaving diagrams in correct DRAKON widget format (branch-based)...\n');

const diagrams = [
  ['openai-proxy-request-pipeline', requestPipeline],
  ['slot-router-resolve-slot',      resolveSlot],
  ['slot-router-score-candidate',   scoreCandidate],
  ['provider-client-resolution',    providerClientResolution],
];

let ok = 0, fail = 0;
for (const [id, diagram] of diagrams) {
  const saved = await saveDiagram(id, diagram);
  if (saved) ok++; else fail++;
}

console.log(`\n${ok} saved, ${fail} failed`);
