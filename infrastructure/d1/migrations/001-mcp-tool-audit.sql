-- ============================================================
-- AI-DRAKON SaaS — Cloudflare D1 Migration 001: mcp_tool_call_audit
-- First post-initial-schema migration (Slice 4.4 groundwork).
--
-- Audit log of MCP tool invocations per tenant and harness spec.
-- Records whether each tool call was granted or denied by policy/gates.
-- ЗАКОН: кожна таблиця має tenant_id; ЖОДЕН запит без WHERE tenant_id = ?
-- ============================================================

CREATE TABLE IF NOT EXISTS mcp_tool_call_audit (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL,
  spec_id    TEXT,
  tool_name  TEXT NOT NULL,
  granted    BOOLEAN NOT NULL DEFAULT 1,
  called_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_tenant_called
  ON mcp_tool_call_audit(tenant_id, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_tenant_spec
  ON mcp_tool_call_audit(tenant_id, spec_id);
