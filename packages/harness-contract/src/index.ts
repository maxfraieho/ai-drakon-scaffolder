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

// Basic runtime validator for DrakonHarnessSpec
export function validateHarnessSpec(spec: unknown): spec is DrakonHarnessSpec {
  if (typeof spec !== 'object' || spec === null) return false;

  const s = spec as Record<string, unknown>;

  if (typeof s.agent_name !== 'string' || !s.agent_name) return false;
  if (typeof s.version !== 'string') return false;
  if (typeof s.mcp_servers !== 'object' || s.mcp_servers === null) return false;
  if (!Array.isArray(s.allowed_tools)) return false;
  if (typeof s.permissions !== 'object' || s.permissions === null) return false;
  if (typeof s.runtime !== 'object' || s.runtime === null) return false;
  if (typeof s.gates !== 'object' || s.gates === null) return false;

  return true;
}

export const EXTERNAL_DEFAULT_TOOLS: readonly string[] = [
  'mcp.gitnexus.query',
  'mcp.notebooklm.chat_ask',
] as const;

/**
 * Canonical vocabulary of allowed tools per agent / pipeline role (Slice 4.4).
 *
 * Least-privilege role scoping:
 * - 'architect': Full architect role with all Worker tools + commit file.
 * - 'drakon': Diagram authoring, mutations, IR validation, git diagram sync (no direct commitfile).
 * - 'docs': Documentation specialist (chat, queries, wiki, backlinks) + read-only repo/diagram.
 * - 'sonate-solidaire': Community solidarity proxy (docs Q&A, wiki, architect chat, read-only repo/diagram).
 * - 'architect-a': Pipeline A (Code -> DRAKON IR) analysis, IR generation & validation, saving diagrams.
 * - 'architect-b': Pipeline B (DRAKON IR -> Code) code generation, syntax checks, committing generated code.
 * - 'drakon-analyze': Deterministic AST analysis and IR topological validation.
 * - 'docs-chat': Dedicated Docs Q&A pipeline (RAG retrieval & answering).
 */
export const AGENT_ALLOWED_TOOLS: Record<string, readonly string[]> = {
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

// Generates sensible defaults for a new agent project spec
export function createDefaultSpec(agentName: string): DrakonHarnessSpec {
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
      notebooklm: { endpoint: "https://fra.cloud.appwrite.io/v1/functions/notebooklm", required: false, timeout_ms: 20000 },
    },
    allowed_tools: allowedTools,
    resources: {
      github: ["*"],
      appwrite: ["*"],
    },
    permissions: {
      max_tokens_per_hour: 100000,
      max_tokens_per_node: 10000,
      max_execution_time_seconds: 300,
      max_github_commits_per_day: 15,
    },
    runtime: {
      entrypoint: ".drakon/main.drakon",
      execution_mode: "deterministic",
      confidence_threshold: 0.75,
    },
    gates: {
      confidence: {
        min_score: 0.7,
        critique_max_retries: 2,
      },
      policy: {
        allowed_capabilities: ["mcp.gitnexus.query", "mcp.notebooklm.chat_ask"],
        deny_patterns: ["mcp.gitnexus.impact"], // block high-risk tools by default
      },
      cost: {
        max_tokens_per_node: 8000,
        warn_at_percent: 80,
      },
      safety: {
        blocked_patterns: ["rm\\s+-rf", "DROP\\s+TABLE", "DROP\\s+DATABASE", "eval\\("],
        require_human_approval: ["github.repo.*.commit"],
      },
    },
  };
}
