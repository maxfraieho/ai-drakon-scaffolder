/**
 * @ai-drakon/tenancy — tenant-scoped D1 repositories.
 *
 * ADR-0025 §3: "All D1 access goes through tenant-scoped repositories in
 * packages/tenancy that make an unscoped query unrepresentable in the type
 * system -- the law is enforced by construction, not by developer
 * discipline." Concretely: `tenantId` is bound ONCE, in the constructor,
 * from a resolved TenantContext (see index.ts). No method on any class
 * below accepts a caller-supplied tenant_id parameter -- there is no way
 * to call `.get(id)` and have it read a different tenant's row, because
 * there is no tenantId parameter to pass one to.
 *
 * Column shapes below mirror infrastructure/d1/schema.sql exactly
 * (2026-08-23) -- keep these two files in sync if the schema changes.
 *
 * No @cloudflare/workers-types dependency exists anywhere in this repo
 * yet (the Worker itself is plain JS, untyped) -- this file defines the
 * minimal D1 surface it actually uses rather than pull in a new package
 * dependency for a handful of method signatures.
 */

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

// ── billing_profiles ─────────────────────────────────────────────────────

export interface BillingProfile {
  tenant_id: string;
  user_id: string;
  plan_type: 'free' | 'pro' | 'enterprise';
  llm_quota_monthly: number;
  llm_consumed: number;
  period_start: string;
  stripe_customer_id: string | null;
  updated_at: string;
}

export class BillingProfileRepository {
  constructor(private db: D1Database, private tenantId: string) {}

  get(): Promise<BillingProfile | null> {
    return this.db
      .prepare('SELECT * FROM billing_profiles WHERE tenant_id = ?')
      .bind(this.tenantId)
      .first<BillingProfile>();
  }

  incrementConsumed(delta: number): Promise<D1Result> {
    return this.db
      .prepare('UPDATE billing_profiles SET llm_consumed = llm_consumed + ?, updated_at = datetime(\'now\') WHERE tenant_id = ?')
      .bind(delta, this.tenantId)
      .run();
  }
}

// ── knowledge_zones ───────────────────────────────────────────────────────

export interface KnowledgeZone {
  id: string;
  tenant_id: string;
  zone_name: string;
  mcp_endpoint_url: string;
  mcp_auth_secret_ref: string | null;
  transport: 'streamable-http' | 'sse';
  enabled: number;
  created_at: string;
}

export class KnowledgeZoneRepository {
  constructor(private db: D1Database, private tenantId: string) {}

  list(): Promise<D1Result<KnowledgeZone>> {
    return this.db
      .prepare('SELECT * FROM knowledge_zones WHERE tenant_id = ? ORDER BY zone_name')
      .bind(this.tenantId)
      .all<KnowledgeZone>();
  }

  get(id: string): Promise<KnowledgeZone | null> {
    return this.db
      .prepare('SELECT * FROM knowledge_zones WHERE tenant_id = ? AND id = ?')
      .bind(this.tenantId, id)
      .first<KnowledgeZone>();
  }

  create(row: Omit<KnowledgeZone, 'tenant_id' | 'created_at'>): Promise<D1Result> {
    return this.db
      .prepare(
        'INSERT INTO knowledge_zones (id, tenant_id, zone_name, mcp_endpoint_url, mcp_auth_secret_ref, transport, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(row.id, this.tenantId, row.zone_name, row.mcp_endpoint_url, row.mcp_auth_secret_ref, row.transport, row.enabled)
      .run();
  }
}

// ── agent_configs ─────────────────────────────────────────────────────────

export interface AgentConfig {
  id: string;
  tenant_id: string;
  agent_name: string;
  drakon_ir_json: string;
  zones_json: string;
  updated_at: string;
}

export class AgentConfigRepository {
  constructor(private db: D1Database, private tenantId: string) {}

  list(): Promise<D1Result<AgentConfig>> {
    return this.db
      .prepare('SELECT * FROM agent_configs WHERE tenant_id = ? ORDER BY agent_name')
      .bind(this.tenantId)
      .all<AgentConfig>();
  }

  get(agentName: string): Promise<AgentConfig | null> {
    return this.db
      .prepare('SELECT * FROM agent_configs WHERE tenant_id = ? AND agent_name = ?')
      .bind(this.tenantId, agentName)
      .first<AgentConfig>();
  }

  upsert(row: Omit<AgentConfig, 'tenant_id' | 'updated_at'>): Promise<D1Result> {
    return this.db
      .prepare(
        `INSERT INTO agent_configs (id, tenant_id, agent_name, drakon_ir_json, zones_json, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(tenant_id, agent_name) DO UPDATE SET
           drakon_ir_json = excluded.drakon_ir_json,
           zones_json = excluded.zones_json,
           updated_at = datetime('now')`
      )
      .bind(row.id, this.tenantId, row.agent_name, row.drakon_ir_json, row.zones_json)
      .run();
  }
}

// ── diagrams ──────────────────────────────────────────────────────────────

export interface Diagram {
  id: string;
  tenant_id: string;
  project_slug: string;
  name: string;
  ir_json: string;
  created_at: string;
  updated_at: string;
}

export class DiagramRepository {
  constructor(private db: D1Database, private tenantId: string) {}

  list(projectSlug: string): Promise<D1Result<Diagram>> {
    return this.db
      .prepare('SELECT * FROM diagrams WHERE tenant_id = ? AND project_slug = ? ORDER BY name')
      .bind(this.tenantId, projectSlug)
      .all<Diagram>();
  }

  get(id: string): Promise<Diagram | null> {
    return this.db
      .prepare('SELECT * FROM diagrams WHERE tenant_id = ? AND id = ?')
      .bind(this.tenantId, id)
      .first<Diagram>();
  }

  create(row: Omit<Diagram, 'tenant_id' | 'created_at' | 'updated_at'>): Promise<D1Result> {
    return this.db
      .prepare(
        'INSERT INTO diagrams (id, tenant_id, project_slug, name, ir_json) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(row.id, this.tenantId, row.project_slug, row.name, row.ir_json)
      .run();
  }

  update(id: string, ir_json: string): Promise<D1Result> {
    return this.db
      .prepare(
        'UPDATE diagrams SET ir_json = ?, updated_at = datetime(\'now\') WHERE tenant_id = ? AND id = ?'
      )
      .bind(ir_json, this.tenantId, id)
      .run();
  }

  async upsert(row: Omit<Diagram, 'tenant_id' | 'created_at' | 'updated_at'>): Promise<D1Result> {
    const existing = await this.get(row.id);
    if (existing) {
      return this.update(row.id, row.ir_json);
    }
    return this.create(row);
  }
}

// ── pipeline_runs ─────────────────────────────────────────────────────────

export interface PipelineRun {
  id: string;
  tenant_id: string;
  pipeline: string;
  status: 'pending' | 'running' | 'done' | 'error';
  llm_calls: number;
  input_summary: string | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export class PipelineRunRepository {
  constructor(private db: D1Database, private tenantId: string) {}

  list(limit = 50): Promise<D1Result<PipelineRun>> {
    return this.db
      .prepare('SELECT * FROM pipeline_runs WHERE tenant_id = ? ORDER BY started_at DESC LIMIT ?')
      .bind(this.tenantId, limit)
      .all<PipelineRun>();
  }

  get(id: string): Promise<PipelineRun | null> {
    return this.db
      .prepare('SELECT * FROM pipeline_runs WHERE tenant_id = ? AND id = ?')
      .bind(this.tenantId, id)
      .first<PipelineRun>();
  }

  create(row: Pick<PipelineRun, 'id' | 'pipeline' | 'input_summary'>): Promise<D1Result> {
    return this.db
      .prepare('INSERT INTO pipeline_runs (id, tenant_id, pipeline, input_summary) VALUES (?, ?, ?, ?)')
      .bind(row.id, this.tenantId, row.pipeline, row.input_summary)
      .run();
  }
}

// ── harness_specs ─────────────────────────────────────────────────────────

export interface HarnessSpecRow {
  id: string;
  tenant_id: string;
  agent_name: string;
  version: string;
  spec_json: string;
  created_at: string;
  updated_at: string;
}

export class HarnessSpecRepository {
  constructor(private db: D1Database, private tenantId: string) {}

  list(agentName?: string): Promise<D1Result<HarnessSpecRow>> {
    if (agentName) {
      return this.db
        .prepare('SELECT * FROM harness_specs WHERE tenant_id = ? AND agent_name = ? ORDER BY version DESC')
        .bind(this.tenantId, agentName)
        .all<HarnessSpecRow>();
    }
    return this.db
      .prepare('SELECT * FROM harness_specs WHERE tenant_id = ? ORDER BY agent_name, version DESC')
      .bind(this.tenantId)
      .all<HarnessSpecRow>();
  }

  get(id: string): Promise<HarnessSpecRow | null> {
    return this.db
      .prepare('SELECT * FROM harness_specs WHERE tenant_id = ? AND (id = ? OR agent_name = ?) ORDER BY version DESC LIMIT 1')
      .bind(this.tenantId, id, id)
      .first<HarnessSpecRow>();
  }

  getByAgent(agentName: string, version: string): Promise<HarnessSpecRow | null> {
    return this.db
      .prepare('SELECT * FROM harness_specs WHERE tenant_id = ? AND agent_name = ? AND version = ?')
      .bind(this.tenantId, agentName, version)
      .first<HarnessSpecRow>();
  }

  create(row: Omit<HarnessSpecRow, 'tenant_id' | 'created_at' | 'updated_at'>): Promise<D1Result> {
    return this.db
      .prepare(
        'INSERT INTO harness_specs (id, tenant_id, agent_name, version, spec_json) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(row.id, this.tenantId, row.agent_name, row.version, row.spec_json)
      .run();
  }

  update(id: string, spec_json: string): Promise<D1Result> {
    return this.db
      .prepare(
        'UPDATE harness_specs SET spec_json = ?, updated_at = datetime(\'now\') WHERE tenant_id = ? AND id = ?'
      )
      .bind(spec_json, this.tenantId, id)
      .run();
  }

  async upsert(row: Omit<HarnessSpecRow, 'tenant_id' | 'created_at' | 'updated_at'>): Promise<D1Result> {
    const existing = await this.get(row.id);
    if (existing) {
      return this.update(row.id, row.spec_json);
    }
    return this.create(row);
  }
}
