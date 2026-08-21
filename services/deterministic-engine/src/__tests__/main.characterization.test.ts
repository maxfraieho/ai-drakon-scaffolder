// Characterization tests for services/deterministic-engine/src/main.ts.
//
// These tests describe the CURRENT observed behavior of the 4-Gate Control
// Plane as implemented today. They intentionally do NOT encode desired
// future behavior (e.g. server-resident specs, enforced human approval) --
// see docs/plans/phase2-boundary-inventory.md and ADR-0020/ADR-0025 for the
// target design. Any behavior captured here that looks wrong is a known,
// documented gap, not something these tests should "fix" by asserting a
// different outcome.
//
// SURPRISING REAL BEHAVIOR (found by running these tests, not assumed):
// `response.success` is computed as `!executionError`, and `executionError`
// is ONLY set for "node not found in diagram" and "max loop count reached".
// A gate block (`blocked = true` -> push gate_blocked + error events ->
// break) does NOT set `executionError`. So a gate-blocked execution today
// reports `success: true` at the top level -- the ONLY reliable signal that
// a gate blocked execution is the presence of a `gate_blocked` event in
// `events`, not `response.success`. Every "gate blocks X" test below
// asserts `success: true` for exactly this reason -- that is the real,
// current, verified behavior, not a mistake in the test.
//
// Non-determinism note: `main.ts` uses Math.random() in exactly two places
// -- "question" node branch selection (line ~349) and LLM-node token-cost
// simulation (line ~289). Both are deliberately avoided in every fixture
// below (no "question" nodes; only "action"/"process"/"tool"/"llm" nodes on
// a single linear path) so every test here is fully deterministic. The
// random paths themselves are NOT characterized -- see the "Integration
// gaps" section at the bottom.

import { describe, it, expect } from "vitest";
import main, { type PipelineEvent, type GateVerdict } from "../main";

interface HarnessSpecFixture {
  agent_name: string;
  version: string;
  gates: {
    confidence: { min_score: number; critique_max_retries: number };
    policy: { allowed_capabilities: string[]; deny_patterns: string[] };
    cost: { max_tokens_per_node: number; warn_at_percent: number };
    safety: { blocked_patterns: string[]; require_human_approval: string[] };
  };
  allowed_tools?: string[];
}

function defaultSpec(overrides?: Partial<HarnessSpecFixture["gates"]>): HarnessSpecFixture {
  return {
    agent_name: "test-agent",
    version: "1.0.0",
    allowed_tools: [],
    gates: {
      confidence: { min_score: 0.7, critique_max_retries: 2 },
      policy: { allowed_capabilities: [], deny_patterns: [] },
      cost: { max_tokens_per_node: 8000, warn_at_percent: 80 },
      safety: { blocked_patterns: [], require_human_approval: [] },
      ...overrides,
    },
  };
}

function runEngine(drakon_ir: unknown, harness_spec: unknown, breakpoints: string[] = []) {
  const calls: { data: unknown; statusCode?: number }[] = [];
  const logs: string[] = [];
  const errors: string[] = [];
  const context = {
    req: {
      body: JSON.stringify({ drakon_ir, harness_spec, breakpoints }),
      headers: {},
      method: "POST",
    },
    res: {
      json: (data: unknown, statusCode?: number) => {
        calls.push({ data, statusCode });
      },
      send: () => {},
    },
    log: (msg: string) => logs.push(msg),
    error: (msg: string) => errors.push(msg),
  };
  return main(context as any).then(() => ({
    response: calls[0]?.data as { success: boolean; events: PipelineEvent[] } | undefined,
    statusCode: calls[0]?.statusCode,
    logs,
    errors,
  }));
}

function verdictFor(events: PipelineEvent[], nodeId: string, gate: GateVerdict["gate"]) {
  const done = events.find(
    (e): e is Extract<PipelineEvent, { event: "node_done" }> => e.event === "node_done" && e.node_id === nodeId
  );
  return done?.gate_verdicts.find((v) => v.gate === gate);
}

describe("deterministic-engine main() -- characterization of current behavior", () => {
  describe("input validation (malformed/minimal input)", () => {
    it("GET requests return a plain ok status without touching the body", async () => {
      const calls: unknown[] = [];
      const context = {
        req: { body: "", headers: {}, method: "GET" },
        res: { json: (d: unknown) => calls.push(d), send: () => {} },
        log: () => {},
        error: () => {},
      };
      await main(context as any);
      expect(calls[0]).toEqual({ status: "deterministic-engine ok" });
    });

    it("invalid JSON body returns 400 with 'Invalid JSON body'", async () => {
      const calls: { data: unknown; statusCode?: number }[] = [];
      const context = {
        req: { body: "{not json", headers: {}, method: "POST" },
        res: { json: (d: unknown, s?: number) => calls.push({ data: d, statusCode: s }), send: () => {} },
        log: () => {},
        error: () => {},
      };
      await main(context as any);
      expect(calls[0]).toEqual({ data: { error: "Invalid JSON body" }, statusCode: 400 });
    });

    it("missing drakon_ir.items returns 400 'drakon_ir with items is required'", async () => {
      const { response, statusCode } = await runEngine({}, defaultSpec());
      expect(statusCode).toBe(400);
      expect(response).toEqual({ error: "drakon_ir with items is required" } as any);
    });

    it("missing harness_spec.gates returns 400 'harness_spec with gates configuration is required'", async () => {
      const { response, statusCode } = await runEngine({ items: { "1": { type: "end" } } }, {});
      expect(statusCode).toBe(400);
      expect(response).toEqual({ error: "harness_spec with gates configuration is required" } as any);
    });

    it("a diagram entry node ('2') that does not exist produces an execution error, not a crash", async () => {
      const { response, statusCode } = await runEngine({ items: { "1": { type: "end" } } }, defaultSpec());
      expect(statusCode).toBeUndefined(); // res.json(response) called with no explicit code -> 200 default
      expect(response!.success).toBe(false);
      expect(response!.events.at(-1)).toEqual({
        event: "error",
        message: "Node '2' not found in diagram.",
      });
    });
  });

  describe("happy path -- all four gates pass", () => {
    it("a single benign action node reaches 'done' with all gates allowed", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", content: "do something benign", one: "1" },
          "1": { type: "end" },
        },
      };
      const { response } = await runEngine(drakon_ir, defaultSpec());
      expect(response!.success).toBe(true);
      expect(response!.events.map((e) => e.event)).toEqual([
        "node_start",
        "node_done",
        "node_start",
        "node_done",
        "done",
      ]);
      const gates = verdictFor(response!.events, "2", "safety")!;
      expect(gates.allowed).toBe(true);
      for (const g of ["safety", "policy", "confidence", "cost"] as const) {
        expect(verdictFor(response!.events, "2", g)?.allowed).toBe(true);
      }
      const done = response!.events.find((e) => e.event === "done") as Extract<PipelineEvent, { event: "done" }>;
      expect(done.nodes_executed).toBe(1);
    });
  });

  describe("safety gate", () => {
    it("blocks a node whose content matches a blocked_patterns regex, and halts execution immediately", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", content: "rm -rf /", one: "1" },
          "1": { type: "end" },
        },
      };
      const spec = defaultSpec({
        confidence: { min_score: 0.7, critique_max_retries: 2 },
        policy: { allowed_capabilities: [], deny_patterns: [] },
        cost: { max_tokens_per_node: 8000, warn_at_percent: 80 },
        safety: { blocked_patterns: ["rm\\s+-rf"], require_human_approval: [] },
      });
      const { response } = await runEngine(drakon_ir, spec);
      // See file header: gate blocks do NOT set executionError, so
      // success stays true even though the safety gate blocked node "2".
      expect(response!.success).toBe(true);
      expect(response!.events.map((e) => e.event)).toEqual(["node_start", "gate_blocked", "error"]);
      const blocked = response!.events[1] as Extract<PipelineEvent, { event: "gate_blocked" }>;
      expect(blocked.gate).toBe("safety");
      expect(blocked.reason).toMatch(/Safety check failed/);
    });
  });

  describe("policy/capability gate", () => {
    it("allows a tool capability matched by an exact allowed_capabilities entry", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", nodeKind: "tool", content: "commit via github", one: "1" },
          "1": { type: "end" },
        },
      };
      const spec = defaultSpec({
        confidence: { min_score: 0.7, critique_max_retries: 2 },
        policy: { allowed_capabilities: ["github.repo.commit"], deny_patterns: [] },
        cost: { max_tokens_per_node: 8000, warn_at_percent: 80 },
        safety: { blocked_patterns: [], require_human_approval: [] },
      });
      const { response } = await runEngine(drakon_ir, spec);
      expect(response!.success).toBe(true);
      expect(verdictFor(response!.events, "2", "policy")?.allowed).toBe(true);
    });

    it("allows a tool capability matched via wildcard allowed_capabilities (e.g. 'tool.invoke.gitnexus.*')", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", nodeKind: "tool", content: "query gitnexus for context", one: "1" },
          "1": { type: "end" },
        },
      };
      const spec = defaultSpec({
        confidence: { min_score: 0.7, critique_max_retries: 2 },
        policy: { allowed_capabilities: ["tool.invoke.gitnexus.*"], deny_patterns: [] },
        cost: { max_tokens_per_node: 8000, warn_at_percent: 80 },
        safety: { blocked_patterns: [], require_human_approval: [] },
      });
      const { response } = await runEngine(drakon_ir, spec);
      expect(response!.success).toBe(true);
      expect(verdictFor(response!.events, "2", "policy")?.allowed).toBe(true);
    });

    it("blocks a capability that is not in allowed_capabilities", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", nodeKind: "tool", content: "commit via github", one: "1" },
          "1": { type: "end" },
        },
      };
      const spec = defaultSpec({
        confidence: { min_score: 0.7, critique_max_retries: 2 },
        policy: { allowed_capabilities: [], deny_patterns: [] },
        cost: { max_tokens_per_node: 8000, warn_at_percent: 80 },
        safety: { blocked_patterns: [], require_human_approval: [] },
      });
      const { response } = await runEngine(drakon_ir, spec);
      // See file header: gate blocks do not set executionError.
      expect(response!.success).toBe(true);
      const blocked = response!.events[1] as Extract<PipelineEvent, { event: "gate_blocked" }>;
      expect(blocked.gate).toBe("policy");
    });

    it("deny_patterns overrides an otherwise-allowed capability, including via wildcard", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", nodeKind: "tool", content: "query gitnexus for impact analysis", one: "1" },
          "1": { type: "end" },
        },
      };
      const spec = defaultSpec({
        confidence: { min_score: 0.7, critique_max_retries: 2 },
        policy: { allowed_capabilities: ["tool.invoke.gitnexus.*"], deny_patterns: ["tool.invoke.gitnexus.impact"] },
        cost: { max_tokens_per_node: 8000, warn_at_percent: 80 },
        safety: { blocked_patterns: [], require_human_approval: [] },
      });
      const { response } = await runEngine(drakon_ir, spec);
      // See file header: gate blocks do not set executionError. Also, a
      // block means no node_done is pushed for this node -- the verdict is
      // only observable via the gate_blocked event, not verdictFor().
      expect(response!.success).toBe(true);
      const blocked = response!.events[1] as Extract<PipelineEvent, { event: "gate_blocked" }>;
      expect(blocked.gate).toBe("policy");
    });
  });

  describe("confidence gate (deterministic: score starts at 0.65, +0.15 per retry, no randomness)", () => {
    it("passes without any retry when min_score is already <= 0.65", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", nodeKind: "llm", content: "generate text", one: "1" },
          "1": { type: "end" },
        },
      };
      const spec = defaultSpec({
        confidence: { min_score: 0.5, critique_max_retries: 2 },
        policy: { allowed_capabilities: [], deny_patterns: [] },
        cost: { max_tokens_per_node: 8000, warn_at_percent: 80 },
        safety: { blocked_patterns: [], require_human_approval: [] },
      });
      const { response, logs } = await runEngine(drakon_ir, spec);
      expect(response!.success).toBe(true);
      expect(verdictFor(response!.events, "2", "confidence")?.score).toBe(0.65);
      expect(logs.some((l) => l.includes("Triggering critique retry"))).toBe(false);
    });

    it("passes after exactly one retry when min_score is between 0.65 and 0.80 (default spec: min_score 0.7)", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", nodeKind: "llm", content: "generate text", one: "1" },
          "1": { type: "end" },
        },
      };
      const { response, logs } = await runEngine(drakon_ir, defaultSpec());
      expect(response!.success).toBe(true);
      const v = verdictFor(response!.events, "2", "confidence")!;
      expect(v.score).toBeCloseTo(0.8, 10);
      expect(logs.filter((l) => l.includes("Triggering critique retry")).length).toBe(1);
    });

    it("is blocked when critique_max_retries is exhausted before min_score is reached", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", nodeKind: "llm", content: "generate text", one: "1" },
          "1": { type: "end" },
        },
      };
      const spec = defaultSpec({
        confidence: { min_score: 0.9, critique_max_retries: 1 },
        policy: { allowed_capabilities: [], deny_patterns: [] },
        cost: { max_tokens_per_node: 8000, warn_at_percent: 80 },
        safety: { blocked_patterns: [], require_human_approval: [] },
      });
      const { response } = await runEngine(drakon_ir, spec);
      // See file header: gate blocks do not set executionError.
      expect(response!.success).toBe(true);
      const blocked = response!.events[1] as Extract<PipelineEvent, { event: "gate_blocked" }>;
      expect(blocked.gate).toBe("confidence");
      expect(blocked.reason).toMatch(/score \(0\.8\) below minimum threshold \(0\.9\) after 1 critique loops/);
    });

    it("attaches a mocked notebooklm_context to the verdict metadata for llm nodes (no real network call is made)", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", nodeKind: "llm", content: "generate text", one: "1" },
          "1": { type: "end" },
        },
      };
      const { response } = await runEngine(drakon_ir, defaultSpec());
      const v = verdictFor(response!.events, "2", "confidence")!;
      expect(v.metadata?.notebooklm_context).toMatch(/NotebookLM Context/);
    });
  });

  describe("cost/quota gate (tool nodes cost a fixed, deterministic 200 simulated tokens)", () => {
    it("passes when the tool node's fixed 200-token cost is within max_tokens_per_node", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", nodeKind: "tool", content: "call a tool", one: "1" },
          "1": { type: "end" },
        },
      };
      const spec = defaultSpec({
        confidence: { min_score: 0.7, critique_max_retries: 2 },
        // allowed_capabilities must permit this node's deduced capability
        // ("tool.invoke.unknown" -- content matches none of the
        // gitnexus/notebooklm/github patterns) or the POLICY gate blocks
        // first and the cost gate is never reached.
        policy: { allowed_capabilities: ["tool.invoke.unknown"], deny_patterns: [] },
        cost: { max_tokens_per_node: 8000, warn_at_percent: 80 },
        safety: { blocked_patterns: [], require_human_approval: [] },
      });
      const { response } = await runEngine(drakon_ir, spec);
      expect(response!.success).toBe(true);
      expect(verdictFor(response!.events, "2", "cost")?.allowed).toBe(true);
    });

    it("blocks the tool node when max_tokens_per_node is below its fixed 200-token cost", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", nodeKind: "tool", content: "call a tool", one: "1" },
          "1": { type: "end" },
        },
      };
      const spec = defaultSpec({
        confidence: { min_score: 0.7, critique_max_retries: 2 },
        policy: { allowed_capabilities: ["tool.invoke.unknown"], deny_patterns: [] },
        cost: { max_tokens_per_node: 100, warn_at_percent: 80 },
        safety: { blocked_patterns: [], require_human_approval: [] },
      });
      const { response } = await runEngine(drakon_ir, spec);
      // See file header: gate blocks do not set executionError.
      expect(response!.success).toBe(true);
      const blocked = response!.events[1] as Extract<PipelineEvent, { event: "gate_blocked" }>;
      expect(blocked.gate).toBe("cost");
      expect(blocked.reason).toMatch(/used 200 tokens, exceeding max limit 100/);
    });
  });

  describe("human-approval requirement (documented gap: declared, never enforced)", () => {
    it("does NOT pause or require approval even when the node's capability matches require_human_approval", async () => {
      // harness_spec.gates.safety.require_human_approval is part of the type
      // and is populated in createDefaultSpec() (src/lib/harness/harness-spec.ts),
      // but main.ts never reads this field anywhere in the gate pipeline.
      // This test characterizes that current gap: a "github.repo.*.commit"
      // action runs straight through with no approval event of any kind.
      const drakon_ir = {
        items: {
          "2": { type: "action", nodeKind: "tool", content: "commit via github", one: "1" },
          "1": { type: "end" },
        },
      };
      const spec = defaultSpec({
        confidence: { min_score: 0.7, critique_max_retries: 2 },
        policy: { allowed_capabilities: ["github.repo.commit"], deny_patterns: [] },
        cost: { max_tokens_per_node: 8000, warn_at_percent: 80 },
        safety: { blocked_patterns: [], require_human_approval: ["github.repo.*.commit"] },
      });
      const { response } = await runEngine(drakon_ir, spec);
      expect(response!.success).toBe(true);
      // No "breakpoint" event, no approval-specific event or gate exists today.
      expect(response!.events.some((e) => e.event === "breakpoint")).toBe(false);
      expect(response!.events.map((e) => e.event)).not.toContain("gate_blocked");
    });
  });

  describe("explicit breakpoints", () => {
    it("halts before executing a node listed in the breakpoints array", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", content: "benign", one: "1" },
          "1": { type: "end" },
        },
      };
      const { response } = await runEngine(drakon_ir, defaultSpec(), ["2"]);
      expect(response!.success).toBe(true); // no executionError set; loop just breaks
      expect(response!.events).toEqual([{ event: "breakpoint", node_id: "2" }]);
    });
  });

  describe("verdict shape", () => {
    it("every GateVerdict has 'gate' and 'allowed'; 'score'/'metadata' are only set for confidence on llm nodes", async () => {
      const drakon_ir = {
        items: {
          "2": { type: "action", content: "benign", one: "1" },
          "1": { type: "end" },
        },
      };
      const { response } = await runEngine(drakon_ir, defaultSpec());
      const done = response!.events.find(
        (e): e is Extract<PipelineEvent, { event: "node_done" }> => e.event === "node_done" && e.node_id === "2"
      )!;
      expect(done.gate_verdicts).toHaveLength(4);
      for (const v of done.gate_verdicts) {
        expect(typeof v.gate).toBe("string");
        expect(typeof v.allowed).toBe("boolean");
      }
      const confidenceVerdict = done.gate_verdicts.find((v) => v.gate === "confidence")!;
      expect(confidenceVerdict.score).toBeUndefined(); // non-llm node -> score left undefined
    });
  });
});

// ---------------------------------------------------------------------------
// Integration-test gaps (NOT characterized here, per task instructions --
// these are not faked as passing, they are explicitly named as gaps):
//
// 1. "question" node branch selection uses Math.random() (line ~349) with no
//    seeding hook. Which of node.one/node.two gets taken cannot be
//    characterized deterministically as a unit test.
// 2. LLM-node token cost simulation uses Math.random() (line ~289,
//    `1000 + Math.random() * 4000`). The exact token count on an llm node,
//    and therefore cost-gate pass/fail for llm nodes specifically, cannot be
//    characterized deterministically -- only the tool-node fixed-200-token
//    path is characterized above.
// 3. This engine is invoked in production as an Appwrite Function behind
//    the Cloudflare Worker; the request/response transport, Appwrite
//    execution environment, and the base64 DETERMINISTIC_ENGINE_RESULT log
//    fallback (Education-plan workaround, lines 5-8/390-392) are not
//    exercised here -- these tests call main() directly with an in-memory
//    context double.
// ---------------------------------------------------------------------------
