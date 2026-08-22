-- ============================================================
-- AI-DRAKON SaaS — Cloudflare D1 схема (транзакційні дані)
-- ЗАКОН: кожна таблиця має tenant_id; ЖОДЕН запит без WHERE tenant_id = ?
-- tenant_id = Appwrite teamId (персональна команда користувача)
-- Секрети тут НЕ зберігаються — лише посилання на Appwrite zone_secrets
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_profiles (
  tenant_id         TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  plan_type         TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan_type IN ('free','pro','enterprise')),
  llm_quota_monthly INTEGER NOT NULL DEFAULT 100,
  llm_consumed      INTEGER NOT NULL DEFAULT 0,
  period_start      TEXT NOT NULL DEFAULT (date('now','start of month')),
  stripe_customer_id TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_billing_user ON billing_profiles(user_id);

CREATE TABLE IF NOT EXISTS knowledge_zones (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  zone_name           TEXT NOT NULL,
  mcp_endpoint_url    TEXT NOT NULL,
  -- посилання на документ zone_secrets в Appwrite; сам токен у D1 НЕ зберігається
  mcp_auth_secret_ref TEXT,
  transport           TEXT NOT NULL DEFAULT 'streamable-http'
                      CHECK (transport IN ('streamable-http','sse')),
  enabled             INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, zone_name)
);
CREATE INDEX IF NOT EXISTS idx_zones_tenant ON knowledge_zones(tenant_id);

CREATE TABLE IF NOT EXISTS agent_configs (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL,
  agent_name     TEXT NOT NULL,
  -- серіалізований DRAKON IR; інваріант: БЕЗ X/Y координат, params — STRING
  drakon_ir_json TEXT NOT NULL,
  -- масив id з knowledge_zones, призначених цьому агенту
  zones_json     TEXT NOT NULL DEFAULT '[]',
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, agent_name)
);
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agent_configs(tenant_id);

CREATE TABLE IF NOT EXISTS diagrams (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL,
  project_slug TEXT NOT NULL,
  -- UTF-8; санітизація імені на фронтенді ДО відправки (encoding bug fix)
  name         TEXT NOT NULL,
  ir_json      TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_diagrams_tenant_project
  ON diagrams(tenant_id, project_slug);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  pipeline      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','running','done','error')),
  llm_calls     INTEGER NOT NULL DEFAULT 0,
  input_summary TEXT,
  error         TEXT,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_tenant ON pipeline_runs(tenant_id, started_at);

CREATE TABLE IF NOT EXISTS harness_specs (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL,
  agent_name   TEXT NOT NULL,
  -- дублює DrakonHarnessSpec.version (TEXT у контракті, packages/harness-contract)
  version      TEXT NOT NULL,
  -- серіалізований DrakonHarnessSpec цілком
  spec_json    TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, agent_name, version)
);
CREATE INDEX IF NOT EXISTS idx_harness_specs_tenant
  ON harness_specs(tenant_id, agent_name);
