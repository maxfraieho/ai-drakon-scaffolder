#!/usr/bin/env node
/**
 * scripts/seed-harness-specs.mjs — Slice 3.4a One-time D1 Seed Script (ESM).
 *
 * Populates initial harness_specs rows in D1 for all known agent_names in the codebase,
 * capturing createDefaultSpec(agentName) output verbatim.
 *
 * Discovered agent names (via GitNexus & codebase analysis):
 *  - Core Agents: 'architect', 'drakon', 'docs', 'sonate-solidaire'
 *    (source: VALID_AGENT_IDS in cloudflare-worker/worker-mcp-drakon.js, AgentId in src/lib/agent-studio-data.ts)
 *  - Defined Pipelines: 'architect-a', 'architect-b', 'drakon-analyze', 'docs-chat'
 *    (source: PIPELINES in src/lib/agent-studio-data.ts)
 *
 * Usage:
 *   node scripts/seed-harness-specs.mjs [--sql] [--tenant=<tenant_id>]
 */

export const KNOWN_AGENT_NAMES = [
  'architect',
  'drakon',
  'docs',
  'sonate-solidaire',
  'architect-a',
  'architect-b',
  'drakon-analyze',
  'docs-chat',
];

export const EXTERNAL_DEFAULT_TOOLS = [
  'mcp.gitnexus.query',
  'mcp.notebooklm.chat_ask',
];

export const AGENT_ALLOWED_TOOLS = {
  architect: [
    ...EXTERNAL_DEFAULT_TOOLS,
    'drakon.listdiagrams',
    'drakon.getdiagram',
    'drakon.savediagram',
    'drakon.deletediagram',
    'drakon.validateir',
    'drakon.analyzecodebase',
    'drakon.getanalysissummary',
    'drakon.mutatediagram',
    'drakon.diffcodevsdiagram',
    'drakon.savetogit',
    'drakon.listgitdiagrams',
    'drakon.getgitdiagram',
    'github.listtree',
    'github.getfile',
    'github.commitfile',
    'github.listbranches',
    'docs.chat',
    'docs.query',
    'docs.wikilink',
    'docs.backlinks',
    'architect.chat',
    'architect.analyze',
    'architect.jobstatus',
    'drakon.agentchat',
  ],
  drakon: [
    ...EXTERNAL_DEFAULT_TOOLS,
    'drakon.listdiagrams',
    'drakon.getdiagram',
    'drakon.savediagram',
    'drakon.deletediagram',
    'drakon.validateir',
    'drakon.analyzecodebase',
    'drakon.getanalysissummary',
    'drakon.mutatediagram',
    'drakon.diffcodevsdiagram',
    'drakon.savetogit',
    'drakon.listgitdiagrams',
    'drakon.getgitdiagram',
    'drakon.agentchat',
    'github.listtree',
    'github.getfile',
    'github.listbranches',
    'architect.chat',
  ],
  docs: [
    ...EXTERNAL_DEFAULT_TOOLS,
    'docs.chat',
    'docs.query',
    'docs.wikilink',
    'docs.backlinks',
    'github.listtree',
    'github.getfile',
    'github.listbranches',
    'drakon.listdiagrams',
    'drakon.getdiagram',
  ],
  'sonate-solidaire': [
    ...EXTERNAL_DEFAULT_TOOLS,
    'docs.chat',
    'docs.query',
    'docs.wikilink',
    'docs.backlinks',
    'architect.chat',
    'github.listtree',
    'github.getfile',
    'drakon.listdiagrams',
    'drakon.getdiagram',
  ],
  'architect-a': [
    ...EXTERNAL_DEFAULT_TOOLS,
    'drakon.listdiagrams',
    'drakon.getdiagram',
    'drakon.savediagram',
    'drakon.validateir',
    'drakon.analyzecodebase',
    'drakon.getanalysissummary',
    'architect.analyze',
    'architect.jobstatus',
    'architect.chat',
    'github.listtree',
    'github.getfile',
  ],
  'architect-b': [
    ...EXTERNAL_DEFAULT_TOOLS,
    'drakon.listdiagrams',
    'drakon.getdiagram',
    'drakon.validateir',
    'github.listtree',
    'github.getfile',
    'github.listbranches',
    'github.commitfile',
    'architect.chat',
  ],
  'drakon-analyze': [
    ...EXTERNAL_DEFAULT_TOOLS,
    'drakon.validateir',
    'drakon.analyzecodebase',
    'drakon.getanalysissummary',
    'drakon.getdiagram',
    'drakon.savediagram',
    'drakon.agentchat',
    'github.listtree',
    'github.getfile',
  ],
  'docs-chat': [
    ...EXTERNAL_DEFAULT_TOOLS,
    'docs.chat',
    'docs.query',
    'docs.wikilink',
    'docs.backlinks',
  ],
};

export function createDefaultSpec(agentName) {
  const allowedTools = AGENT_ALLOWED_TOOLS[agentName]
    ? [...AGENT_ALLOWED_TOOLS[agentName]]
    : [...EXTERNAL_DEFAULT_TOOLS];

  return {
    $schema: "https://aidrakon.tech/schemas/harness-spec-v1.json",
    agent_name: agentName,
    version: "1.0.0",
    description: `AI-DRAKON Agent ${agentName}`,
    mcp_servers: {
      gitnexus: { endpoint: "https://gitnexus.exodus.pp.ua/api/mcp", required: false, timeout_ms: 15000 },
      notebooklm: { endpoint: "https://fra.cloud.appwrite.io/v1/functions/notebooklm", required: false, timeout_ms: 20000 }
    },
    allowed_tools: allowedTools,
    resources: {
      github: ["*"],
      appwrite: ["*"]
    },
    permissions: {
      max_tokens_per_hour: 100000,
      max_tokens_per_node: 10000,
      max_execution_time_seconds: 300,
      max_github_commits_per_day: 15
    },
    runtime: {
      entrypoint: ".drakon/main.drakon",
      execution_mode: "deterministic",
      confidence_threshold: 0.75
    },
    gates: {
      confidence: {
        min_score: 0.7,
        critique_max_retries: 2
      },
      policy: {
        allowed_capabilities: ["mcp.gitnexus.query", "mcp.notebooklm.chat_ask"],
        deny_patterns: ["mcp.gitnexus.impact"]
      },
      cost: {
        max_tokens_per_node: 8000,
        warn_at_percent: 80
      },
      safety: {
        blocked_patterns: ["rm\\s+-rf", "DROP\\s+TABLE", "DROP\\s+DATABASE", "eval\\("],
        require_human_approval: ["github.repo.*.commit"]
      }
    }
  };
}

export function generateSeedEntries(tenantId = 'default') {
  return KNOWN_AGENT_NAMES.map((agentName) => {
    const spec = createDefaultSpec(agentName);
    const version = spec.version || '1.0.0';
    const id = `spec-${agentName}`;
    const spec_json = JSON.stringify(spec);
    return {
      id,
      tenant_id: tenantId,
      agent_name: agentName,
      version,
      spec,
      spec_json,
    };
  });
}

export function generateSeedSql(tenantId = 'default') {
  const entries = generateSeedEntries(tenantId);
  const statements = entries.map((entry) => {
    const escapedJson = entry.spec_json.replace(/'/g, "''");
    return `INSERT INTO harness_specs (id, tenant_id, agent_name, version, spec_json, created_at, updated_at)
VALUES ('${entry.id}', '${entry.tenant_id}', '${entry.agent_name}', '${entry.version}', '${escapedJson}', datetime('now'), datetime('now'))
ON CONFLICT(tenant_id, agent_name, version) DO UPDATE SET
  spec_json = excluded.spec_json,
  updated_at = datetime('now');`;
  });

  return `-- AI-DRAKON SaaS — Seed harness_specs table for known agent names (Slice 3.4a)\n-- Tenant: ${tenantId}\n\n` + statements.join('\n\n') + '\n';
}

const tenantArg = process.argv.find((a) => a.startsWith('--tenant='));
const tenantId = tenantArg ? tenantArg.split('=')[1] : 'default';
const sql = generateSeedSql(tenantId);
console.log(sql);
