#!/usr/bin/env node
/**
 * scripts/seed-harness-specs.ts — Slice 3.4a One-time D1 Seed Script.
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
 *   npx tsx scripts/seed-harness-specs.ts [--sql] [--tenant=<tenant_id>]
 */

import { createDefaultSpec, type DrakonHarnessSpec } from '../packages/harness-contract/src/index';

export const KNOWN_AGENT_NAMES: readonly string[] = [
  'architect',
  'drakon',
  'docs',
  'sonate-solidaire',
  'architect-a',
  'architect-b',
  'drakon-analyze',
  'docs-chat',
] as const;

export interface HarnessSpecSeedEntry {
  id: string;
  tenant_id: string;
  agent_name: string;
  version: string;
  spec: DrakonHarnessSpec;
  spec_json: string;
}

export function generateSeedEntries(tenantId = 'default'): HarnessSpecSeedEntry[] {
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

export function generateSeedSql(tenantId = 'default'): string {
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

if (process.argv[1] && process.argv[1].endsWith('seed-harness-specs.ts')) {
  const tenantArg = process.argv.find((a) => a.startsWith('--tenant='));
  const tenantId = tenantArg ? tenantArg.split('=')[1] : 'default';
  const sql = generateSeedSql(tenantId);
  console.log(sql);
}
