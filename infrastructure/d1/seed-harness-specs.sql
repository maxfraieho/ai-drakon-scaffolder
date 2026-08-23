-- AI-DRAKON SaaS — Seed harness_specs table for known agent names (Slice 3.4a)
-- Captures createDefaultSpec(agentName) output verbatim for all discovered agent_names.

INSERT INTO harness_specs (id, tenant_id, agent_name, version, spec_json, created_at, updated_at)
VALUES (
  'spec-architect',
  'default',
  'architect',
  '1.0.0',
  '{"$schema":"https://aidrakon.tech/schemas/harness-spec-v1.json","agent_name":"architect","version":"1.0.0","description":"AI-DRAKON Agent architect","mcp_servers":{"gitnexus":{"endpoint":"https://gitnexus.exodus.pp.ua/api/mcp","required":false,"timeout_ms":15000},"notebooklm":{"endpoint":"https://fra.cloud.appwrite.io/v1/functions/notebooklm","required":false,"timeout_ms":20000}},"allowed_tools":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"resources":{"github":["*"],"appwrite":["*"]},"permissions":{"max_tokens_per_hour":100000,"max_tokens_per_node":10000,"max_execution_time_seconds":300,"max_github_commits_per_day":15},"runtime":{"entrypoint":".drakon/main.drakon","execution_mode":"deterministic","confidence_threshold":0.75},"gates":{"confidence":{"min_score":0.7,"critique_max_retries":2},"policy":{"allowed_capabilities":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"deny_patterns":["mcp.gitnexus.impact"]},"cost":{"max_tokens_per_node":8000,"warn_at_percent":80},"safety":{"blocked_patterns":["rm\\s+-rf","DROP\\s+TABLE","DROP\\s+DATABASE","eval\\("],"require_human_approval":["github.repo.*.commit"]}}}',
  datetime('now'),
  datetime('now')
)
ON CONFLICT(tenant_id, agent_name, version) DO UPDATE SET
  spec_json = excluded.spec_json,
  updated_at = datetime('now');

INSERT INTO harness_specs (id, tenant_id, agent_name, version, spec_json, created_at, updated_at)
VALUES (
  'spec-drakon',
  'default',
  'drakon',
  '1.0.0',
  '{"$schema":"https://aidrakon.tech/schemas/harness-spec-v1.json","agent_name":"drakon","version":"1.0.0","description":"AI-DRAKON Agent drakon","mcp_servers":{"gitnexus":{"endpoint":"https://gitnexus.exodus.pp.ua/api/mcp","required":false,"timeout_ms":15000},"notebooklm":{"endpoint":"https://fra.cloud.appwrite.io/v1/functions/notebooklm","required":false,"timeout_ms":20000}},"allowed_tools":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"resources":{"github":["*"],"appwrite":["*"]},"permissions":{"max_tokens_per_hour":100000,"max_tokens_per_node":10000,"max_execution_time_seconds":300,"max_github_commits_per_day":15},"runtime":{"entrypoint":".drakon/main.drakon","execution_mode":"deterministic","confidence_threshold":0.75},"gates":{"confidence":{"min_score":0.7,"critique_max_retries":2},"policy":{"allowed_capabilities":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"deny_patterns":["mcp.gitnexus.impact"]},"cost":{"max_tokens_per_node":8000,"warn_at_percent":80},"safety":{"blocked_patterns":["rm\\s+-rf","DROP\\s+TABLE","DROP\\s+DATABASE","eval\\("],"require_human_approval":["github.repo.*.commit"]}}}',
  datetime('now'),
  datetime('now')
)
ON CONFLICT(tenant_id, agent_name, version) DO UPDATE SET
  spec_json = excluded.spec_json,
  updated_at = datetime('now');

INSERT INTO harness_specs (id, tenant_id, agent_name, version, spec_json, created_at, updated_at)
VALUES (
  'spec-docs',
  'default',
  'docs',
  '1.0.0',
  '{"$schema":"https://aidrakon.tech/schemas/harness-spec-v1.json","agent_name":"docs","version":"1.0.0","description":"AI-DRAKON Agent docs","mcp_servers":{"gitnexus":{"endpoint":"https://gitnexus.exodus.pp.ua/api/mcp","required":false,"timeout_ms":15000},"notebooklm":{"endpoint":"https://fra.cloud.appwrite.io/v1/functions/notebooklm","required":false,"timeout_ms":20000}},"allowed_tools":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"resources":{"github":["*"],"appwrite":["*"]},"permissions":{"max_tokens_per_hour":100000,"max_tokens_per_node":10000,"max_execution_time_seconds":300,"max_github_commits_per_day":15},"runtime":{"entrypoint":".drakon/main.drakon","execution_mode":"deterministic","confidence_threshold":0.75},"gates":{"confidence":{"min_score":0.7,"critique_max_retries":2},"policy":{"allowed_capabilities":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"deny_patterns":["mcp.gitnexus.impact"]},"cost":{"max_tokens_per_node":8000,"warn_at_percent":80},"safety":{"blocked_patterns":["rm\\s+-rf","DROP\\s+TABLE","DROP\\s+DATABASE","eval\\("],"require_human_approval":["github.repo.*.commit"]}}}',
  datetime('now'),
  datetime('now')
)
ON CONFLICT(tenant_id, agent_name, version) DO UPDATE SET
  spec_json = excluded.spec_json,
  updated_at = datetime('now');

INSERT INTO harness_specs (id, tenant_id, agent_name, version, spec_json, created_at, updated_at)
VALUES (
  'spec-sonate-solidaire',
  'default',
  'sonate-solidaire',
  '1.0.0',
  '{"$schema":"https://aidrakon.tech/schemas/harness-spec-v1.json","agent_name":"sonate-solidaire","version":"1.0.0","description":"AI-DRAKON Agent sonate-solidaire","mcp_servers":{"gitnexus":{"endpoint":"https://gitnexus.exodus.pp.ua/api/mcp","required":false,"timeout_ms":15000},"notebooklm":{"endpoint":"https://fra.cloud.appwrite.io/v1/functions/notebooklm","required":false,"timeout_ms":20000}},"allowed_tools":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"resources":{"github":["*"],"appwrite":["*"]},"permissions":{"max_tokens_per_hour":100000,"max_tokens_per_node":10000,"max_execution_time_seconds":300,"max_github_commits_per_day":15},"runtime":{"entrypoint":".drakon/main.drakon","execution_mode":"deterministic","confidence_threshold":0.75},"gates":{"confidence":{"min_score":0.7,"critique_max_retries":2},"policy":{"allowed_capabilities":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"deny_patterns":["mcp.gitnexus.impact"]},"cost":{"max_tokens_per_node":8000,"warn_at_percent":80},"safety":{"blocked_patterns":["rm\\s+-rf","DROP\\s+TABLE","DROP\\s+DATABASE","eval\\("],"require_human_approval":["github.repo.*.commit"]}}}',
  datetime('now'),
  datetime('now')
)
ON CONFLICT(tenant_id, agent_name, version) DO UPDATE SET
  spec_json = excluded.spec_json,
  updated_at = datetime('now');

INSERT INTO harness_specs (id, tenant_id, agent_name, version, spec_json, created_at, updated_at)
VALUES (
  'spec-architect-a',
  'default',
  'architect-a',
  '1.0.0',
  '{"$schema":"https://aidrakon.tech/schemas/harness-spec-v1.json","agent_name":"architect-a","version":"1.0.0","description":"AI-DRAKON Agent architect-a","mcp_servers":{"gitnexus":{"endpoint":"https://gitnexus.exodus.pp.ua/api/mcp","required":false,"timeout_ms":15000},"notebooklm":{"endpoint":"https://fra.cloud.appwrite.io/v1/functions/notebooklm","required":false,"timeout_ms":20000}},"allowed_tools":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"resources":{"github":["*"],"appwrite":["*"]},"permissions":{"max_tokens_per_hour":100000,"max_tokens_per_node":10000,"max_execution_time_seconds":300,"max_github_commits_per_day":15},"runtime":{"entrypoint":".drakon/main.drakon","execution_mode":"deterministic","confidence_threshold":0.75},"gates":{"confidence":{"min_score":0.7,"critique_max_retries":2},"policy":{"allowed_capabilities":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"deny_patterns":["mcp.gitnexus.impact"]},"cost":{"max_tokens_per_node":8000,"warn_at_percent":80},"safety":{"blocked_patterns":["rm\\s+-rf","DROP\\s+TABLE","DROP\\s+DATABASE","eval\\("],"require_human_approval":["github.repo.*.commit"]}}}',
  datetime('now'),
  datetime('now')
)
ON CONFLICT(tenant_id, agent_name, version) DO UPDATE SET
  spec_json = excluded.spec_json,
  updated_at = datetime('now');

INSERT INTO harness_specs (id, tenant_id, agent_name, version, spec_json, created_at, updated_at)
VALUES (
  'spec-architect-b',
  'default',
  'architect-b',
  '1.0.0',
  '{"$schema":"https://aidrakon.tech/schemas/harness-spec-v1.json","agent_name":"architect-b","version":"1.0.0","description":"AI-DRAKON Agent architect-b","mcp_servers":{"gitnexus":{"endpoint":"https://gitnexus.exodus.pp.ua/api/mcp","required":false,"timeout_ms":15000},"notebooklm":{"endpoint":"https://fra.cloud.appwrite.io/v1/functions/notebooklm","required":false,"timeout_ms":20000}},"allowed_tools":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"resources":{"github":["*"],"appwrite":["*"]},"permissions":{"max_tokens_per_hour":100000,"max_tokens_per_node":10000,"max_execution_time_seconds":300,"max_github_commits_per_day":15},"runtime":{"entrypoint":".drakon/main.drakon","execution_mode":"deterministic","confidence_threshold":0.75},"gates":{"confidence":{"min_score":0.7,"critique_max_retries":2},"policy":{"allowed_capabilities":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"deny_patterns":["mcp.gitnexus.impact"]},"cost":{"max_tokens_per_node":8000,"warn_at_percent":80},"safety":{"blocked_patterns":["rm\\s+-rf","DROP\\s+TABLE","DROP\\s+DATABASE","eval\\("],"require_human_approval":["github.repo.*.commit"]}}}',
  datetime('now'),
  datetime('now')
)
ON CONFLICT(tenant_id, agent_name, version) DO UPDATE SET
  spec_json = excluded.spec_json,
  updated_at = datetime('now');

INSERT INTO harness_specs (id, tenant_id, agent_name, version, spec_json, created_at, updated_at)
VALUES (
  'spec-drakon-analyze',
  'default',
  'drakon-analyze',
  '1.0.0',
  '{"$schema":"https://aidrakon.tech/schemas/harness-spec-v1.json","agent_name":"drakon-analyze","version":"1.0.0","description":"AI-DRAKON Agent drakon-analyze","mcp_servers":{"gitnexus":{"endpoint":"https://gitnexus.exodus.pp.ua/api/mcp","required":false,"timeout_ms":15000},"notebooklm":{"endpoint":"https://fra.cloud.appwrite.io/v1/functions/notebooklm","required":false,"timeout_ms":20000}},"allowed_tools":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"resources":{"github":["*"],"appwrite":["*"]},"permissions":{"max_tokens_per_hour":100000,"max_tokens_per_node":10000,"max_execution_time_seconds":300,"max_github_commits_per_day":15},"runtime":{"entrypoint":".drakon/main.drakon","execution_mode":"deterministic","confidence_threshold":0.75},"gates":{"confidence":{"min_score":0.7,"critique_max_retries":2},"policy":{"allowed_capabilities":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"deny_patterns":["mcp.gitnexus.impact"]},"cost":{"max_tokens_per_node":8000,"warn_at_percent":80},"safety":{"blocked_patterns":["rm\\s+-rf","DROP\\s+TABLE","DROP\\s+DATABASE","eval\\("],"require_human_approval":["github.repo.*.commit"]}}}',
  datetime('now'),
  datetime('now')
)
ON CONFLICT(tenant_id, agent_name, version) DO UPDATE SET
  spec_json = excluded.spec_json,
  updated_at = datetime('now');

INSERT INTO harness_specs (id, tenant_id, agent_name, version, spec_json, created_at, updated_at)
VALUES (
  'spec-docs-chat',
  'default',
  'docs-chat',
  '1.0.0',
  '{"$schema":"https://aidrakon.tech/schemas/harness-spec-v1.json","agent_name":"docs-chat","version":"1.0.0","description":"AI-DRAKON Agent docs-chat","mcp_servers":{"gitnexus":{"endpoint":"https://gitnexus.exodus.pp.ua/api/mcp","required":false,"timeout_ms":15000},"notebooklm":{"endpoint":"https://fra.cloud.appwrite.io/v1/functions/notebooklm","required":false,"timeout_ms":20000}},"allowed_tools":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"resources":{"github":["*"],"appwrite":["*"]},"permissions":{"max_tokens_per_hour":100000,"max_tokens_per_node":10000,"max_execution_time_seconds":300,"max_github_commits_per_day":15},"runtime":{"entrypoint":".drakon/main.drakon","execution_mode":"deterministic","confidence_threshold":0.75},"gates":{"confidence":{"min_score":0.7,"critique_max_retries":2},"policy":{"allowed_capabilities":["mcp.gitnexus.query","mcp.notebooklm.chat_ask"],"deny_patterns":["mcp.gitnexus.impact"]},"cost":{"max_tokens_per_node":8000,"warn_at_percent":80},"safety":{"blocked_patterns":["rm\\s+-rf","DROP\\s+TABLE","DROP\\s+DATABASE","eval\\("],"require_human_approval":["github.repo.*.commit"]}}}',
  datetime('now'),
  datetime('now')
)
ON CONFLICT(tenant_id, agent_name, version) DO UPDATE SET
  spec_json = excluded.spec_json,
  updated_at = datetime('now');
