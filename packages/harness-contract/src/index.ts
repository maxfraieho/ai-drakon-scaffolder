/**
 * @ai-drakon/harness-contract
 *
 * Canonical shared types for the harness spec and the 4-Gate Control Plane
 * verdict/event contract. This package holds TYPES ONLY (plus, later, pure
 * structural helpers) -- no runtime policy logic. The gate evaluation loop
 * itself stays in services/deterministic-engine/src/main.ts for now; see
 * docs/plans/phase2-boundary-inventory.md for the planned
 * packages/policy-engine extraction (a later slice).
 *
 * `DrakonHarnessSpec` is adopted here as-is from src/lib/harness/harness-spec.ts
 * (the richer of the two previously-duplicated shapes) without modification.
 * Fields declared here but not currently read by
 * services/deterministic-engine/src/main.ts's runtime logic are preserved
 * exactly as declared -- this package does not change, enforce, or "clean
 * up" which fields are load-bearing. In particular:
 *   - `gates.safety.require_human_approval` is declared but not read
 *     anywhere at runtime (characterized in
 *     services/deterministic-engine/src/__tests__/main.characterization.test.ts).
 *   - `$schema`, `description`, `mcp_servers`, `permissions`, `runtime`,
 *     and `allowed_tools` are declared but not read by the engine either.
 * These are known, pre-existing gaps -- not introduced or fixed by this
 * package.
 */

export interface DrakonHarnessSpec {
  $schema?: string;
  agent_name: string;
  version: string;
  description?: string;
  mcp_servers: Record<string, {
    endpoint: string;
    required: boolean;
    timeout_ms?: number;
  }>;
  allowed_tools: string[];              // capability strings
  resources: Record<string, string[]>;  // resource scope per domain
  permissions: {
    max_tokens_per_hour: number;
    max_tokens_per_node: number;
    max_execution_time_seconds: number;
    max_github_commits_per_day?: number;
  };
  runtime: {
    entrypoint: string;                 // path to .drakon file
    execution_mode: 'deterministic' | 'hybrid';
    confidence_threshold: number;       // 0-1, default 0.75
  };
  gates: {
    confidence: { min_score: number; critique_max_retries: number };
    policy: { allowed_capabilities: string[]; deny_patterns: string[] };
    cost: { max_tokens_per_node: number; warn_at_percent: number };
    safety: { blocked_patterns: string[]; require_human_approval: string[] };
  };
}

export interface GateVerdict {
  gate: 'confidence' | 'policy' | 'cost' | 'safety';
  allowed: boolean;
  score?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export type PipelineEvent =
  | { event: 'node_start'; node_id: string; node_type: string }
  | { event: 'node_done'; node_id: string; tokens: number; gate_verdicts: GateVerdict[] }
  | { event: 'gate_blocked'; node_id: string; gate: string; reason: string }
  | { event: 'breakpoint'; node_id: string; error?: string }
  | { event: 'done'; total_tokens: number; nodes_executed: number }
  | { event: 'error'; message: string };
