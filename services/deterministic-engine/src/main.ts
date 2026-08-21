// Appwrite Function: deterministic-engine
// Executes a DRAKON flowchart (.drakon JSON / IR) step-by-step
// while verifying the execution against a 4-Gate Control Plane (HarnessSpec).
//
// Education-plan note: Appwrite never persists responseBody for executions on
// the Education plan. We emit the result as a single base64 log line:
//   DETERMINISTIC_ENGINE_RESULT:<base64>
// The CF Worker reconstructs the payload from that log line.

import { Buffer } from "buffer";

// GateVerdict, PipelineEvent and the harness spec shape moved to
// @ai-drakon/harness-contract (Phase 2 Slice 2). This engine previously
// declared a narrower local `HarnessSpec` interface (missing $schema,
// description, mcp_servers, permissions, runtime, and with `resources`
// optional rather than required); it now imports the canonical, richer
// `DrakonHarnessSpec` instead. This is a compile-time-only change: nothing
// in this file constructs a HarnessSpec object literal that the stricter
// shape would reject, and no runtime behavior depends on which fields are
// declared required vs optional here. Fields not read by this file's
// runtime logic today (require_human_approval, $schema, description,
// mcp_servers, permissions, runtime, allowed_tools) remain unread -- this
// change does not wire any of them in.
import type { GateVerdict, PipelineEvent, DrakonHarnessSpec } from "@ai-drakon/harness-contract";
export type { GateVerdict, PipelineEvent } from "@ai-drakon/harness-contract";

// Pure 4-gate evaluation logic moved to @ai-drakon/policy-engine (Phase 2
// Slice 3). Orchestration -- logging, event sequencing, the NotebookLM
// context-injection mock, and the Math.random()-driven token/branch
// simulation -- stays here unchanged. See that package's header comment
// for the exact split rationale.
import {
  evaluateSafetyGate,
  evaluatePolicyGate,
  evaluateConfidenceGate,
  evaluateCostGate,
} from "@ai-drakon/policy-engine";

interface DrakonNode {
  type: string;
  one?: string;
  two?: string;
  side?: string;
  content?: string;
  secondary?: string;
  nodeKind?: "llm" | "tool" | "n8n" | string;
  [key: string]: any;
}

interface DrakonIr {
  items: Record<string, DrakonNode>;
  [key: string]: any;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function main(context: {
  req: {
    body: string;
    headers: Record<string, string>;
    method: string;
  };
  res: {
    json: (data: unknown, statusCode?: number) => void;
    send: (body: string, statusCode?: number, headers?: Record<string, string>) => void;
  };
  log: (msg: string) => void;
  error: (msg: string) => void;
}) {
  try {
    if (context.req.method === "GET") {
      return context.res.json({ status: "deterministic-engine ok" });
    }

    let payload: {
      drakon_ir?: DrakonIr;
      harness_spec?: DrakonHarnessSpec;
      breakpoints?: string[];
    };

    try {
      payload = JSON.parse(context.req.body);
    } catch {
      return context.res.json({ error: "Invalid JSON body" }, 400);
    }

    const { drakon_ir, harness_spec, breakpoints = [] } = payload;

    if (!drakon_ir || !drakon_ir.items) {
      return context.res.json({ error: "drakon_ir with items is required" }, 400);
    }

    if (!harness_spec || !harness_spec.gates) {
      return context.res.json({ error: "harness_spec with gates configuration is required" }, 400);
    }

    context.log(`[deterministic-engine] Starting execution of "${harness_spec.agent_name || "Agent"}"`);
    context.log(`[deterministic-engine] Total nodes: ${Object.keys(drakon_ir.items).length}, Breakpoints: [${breakpoints.join(", ")}]`);

    const events: PipelineEvent[] = [];
    let currentNodeId = "2"; // Entry node is traditionally '2' (branch node)
    let totalTokens = 0;
    let nodesExecuted = 0;
    let executionError: string | null = null;
    const visited = new Set<string>();

    const maxLoops = 200; // prevent infinite loops
    let loopCount = 0;

    // Safety regex patterns compiled
    const safetyRegexes = (harness_spec.gates.safety.blocked_patterns || []).map((p) => {
      try {
        return new RegExp(p, "i");
      } catch (e) {
        context.error(`Invalid safety pattern regex: ${p}`);
        return null;
      }
    }).filter(Boolean) as RegExp[];

    while (currentNodeId && loopCount < maxLoops) {
      loopCount++;
      const node = drakon_ir.items[currentNodeId];

      if (!node) {
        executionError = `Node '${currentNodeId}' not found in diagram.`;
        break;
      }

      // Check terminal node
      if (node.type === "end" || currentNodeId === "1") {
        events.push({ event: "node_start", node_id: currentNodeId, node_type: "end" });
        events.push({
          event: "node_done",
          node_id: currentNodeId,
          tokens: 0,
          gate_verdicts: [
            { gate: "confidence", allowed: true },
            { gate: "policy", allowed: true },
            { gate: "cost", allowed: true },
            { gate: "safety", allowed: true },
          ],
        });
        currentNodeId = "";
        break;
      }

      // Check breakpoints
      if (breakpoints.includes(currentNodeId)) {
        context.log(`[deterministic-engine] Hit breakpoint at node '${currentNodeId}'`);
        events.push({ event: "breakpoint", node_id: currentNodeId });
        break;
      }

      context.log(`[deterministic-engine] Executing node '${currentNodeId}' (type: ${node.type})`);
      events.push({ event: "node_start", node_id: currentNodeId, node_type: node.type });

      // Run 4-Gate Control Plane checks
      const verdicts: GateVerdict[] = [];
      let blocked = false;
      let blockedGateName: "confidence" | "policy" | "cost" | "safety" | "" = "";

      // 1. SAFETY GATE
      const safetyVerdict = evaluateSafetyGate((node.content || "") + " " + (node.secondary || ""), safetyRegexes);
      const safetyPassed = safetyVerdict.allowed;
      if (!safetyPassed) blockedGateName = "safety";
      verdicts.push(safetyVerdict);

      // 2. POLICY GATE (MCP Capabilities)
      const policyVerdict = evaluatePolicyGate({
        nodeType: node.type,
        nodeKind: node.nodeKind,
        nodeContent: node.content || "",
        safetyPassed,
        allowedCapabilities: harness_spec.gates.policy.allowed_capabilities,
        denyPatterns: harness_spec.gates.policy.deny_patterns,
      });
      const policyPassed = policyVerdict.allowed;
      if (!policyPassed) blockedGateName = "policy";
      verdicts.push(policyVerdict);

      // 3. CONFIDENCE GATE (LLM Nodes)
      let injectedContext = "";
      if (safetyPassed && policyPassed && node.nodeKind === "llm") {
        // NotebookLM Context Injection
        try {
          // Simulate NotebookLM Bridge API call
          const notebookId = context.req.headers["x-notebooklm-id"] || "default-notebook";
          context.log(`[NotebookLM Bridge] Fetching context for node ${currentNodeId} from notebook ${notebookId}...`);

          // Here we would make a real fetch to process.env.NOTEBOOKLM_API_URL
          // For deterministic execution, we mock the retrieved context
          injectedContext = `[NotebookLM Context]: System architecture guidelines require strict type safety and pure functions.`;
          context.log(`[NotebookLM Bridge] Injected context into system prompt: ${injectedContext}`);
        } catch (err) {
          context.error(`[NotebookLM Bridge] Failed to inject context: ${err}`);
        }
      }

      const minScore = harness_spec.gates.confidence.min_score || 0.7;
      const maxRetries = harness_spec.gates.confidence.critique_max_retries || 2;
      const confidenceResult = evaluateConfidenceGate({
        shouldEvaluate: safetyPassed && policyPassed && node.nodeKind === "llm",
        minScore,
        maxRetries,
        injectedContext: injectedContext || undefined,
      });
      for (const attempt of confidenceResult.attempts) {
        context.log(`[deterministic-engine] Confidence score (${attempt.scoreBefore}) below threshold (${minScore}). Triggering critique retry ${attempt.retry}/${maxRetries}...`);
      }
      const confidencePassed = confidenceResult.verdict.allowed;
      if (!confidencePassed) blockedGateName = "confidence";
      verdicts.push(confidenceResult.verdict);

      // 4. COST GATE (Token limit checking)
      let simulatedTokens = 0;
      if (safetyPassed && policyPassed && confidencePassed) {
        if (node.nodeKind === "llm") {
          simulatedTokens = Math.floor(Math.random() * 4000) + 1000; // 1000-5000 tokens
        } else if (node.nodeKind === "tool") {
          simulatedTokens = 200; // tool calls cost less
        }
      }

      const maxTokens = harness_spec.gates.cost.max_tokens_per_node || 8000;
      const warnPercent = harness_spec.gates.cost.warn_at_percent || 80;
      const costResult = evaluateCostGate({
        shouldEvaluate: safetyPassed && policyPassed && confidencePassed,
        simulatedTokens,
        maxTokensPerNode: maxTokens,
        warnAtPercent: warnPercent,
      });
      if (costResult.shouldWarn) {
        context.log(`[WARNING] Node '${currentNodeId}' used ${simulatedTokens} tokens, exceeding warning threshold (${warnPercent}% of ${maxTokens})`);
      }
      if (safetyPassed && policyPassed && confidencePassed) {
        totalTokens += simulatedTokens;
      }
      const costPassed = costResult.verdict.allowed;
      if (!costPassed) blockedGateName = "cost";
      verdicts.push(costResult.verdict);

      // Check if any gate failed
      blocked = verdicts.some((v) => !v.allowed);
      const blockReason = verdicts.find((v) => !v.allowed)?.reason || "";

      if (blocked) {
        context.log(`[deterministic-engine] Execution blocked at node '${currentNodeId}' by ${blockedGateName} gate. Reason: ${blockReason}`);
        events.push({
          event: "gate_blocked",
          node_id: currentNodeId,
          gate: blockedGateName,
          reason: blockReason,
        });
        events.push({
          event: "error",
          message: `Execution blocked at node '${currentNodeId}' by ${blockedGateName} gate.`,
        });
        break;
      }

      // Simulate node execution latency
      await sleep(150);

      events.push({
        event: "node_done",
        node_id: currentNodeId,
        tokens: simulatedTokens,
        gate_verdicts: verdicts,
      });

      nodesExecuted++;

      // Transition logic
      let nextNodeId = "";
      if (node.type === "question") {
        // Evaluate condition: simulate randomly or default to true
        // Polarities: flag1 === true (invert): one=NO (false), two=YES (true)
        //             flag1 === false/undefined: one=YES (true), two=NO (false)
        const conditionResult = Math.random() > 0.3; // 70% chance condition is true
        const isFlag1 = node.flag1 === true;

        if (conditionResult) {
          nextNodeId = isFlag1 ? (node.two || "") : (node.one || "");
          context.log(`[deterministic-engine] Question node condition evaluates to TRUE. flag1=${isFlag1} -> Next node: ${nextNodeId}`);
        } else {
          nextNodeId = isFlag1 ? (node.one || "") : (node.two || "");
          context.log(`[deterministic-engine] Question node condition evaluates to FALSE. flag1=${isFlag1} -> Next node: ${nextNodeId}`);
        }
      } else if (node.type === "select") {
        // Select node: 'one' links to the first case node
        nextNodeId = node.one || "";
      } else if (node.type === "address") {
        // GOTO silhouette branch
        nextNodeId = node.one || "";
        context.log(`[deterministic-engine] GOTO Address transition -> Next node: ${nextNodeId}`);
      } else {
        nextNodeId = node.one || "";
      }

      currentNodeId = nextNodeId;
    }

    if (loopCount >= maxLoops) {
      executionError = `Execution aborted: reached maximum safety limit of ${maxLoops} nodes execution loop.`;
    }

    if (executionError) {
      context.error(`[deterministic-engine] Execution failed: ${executionError}`);
      events.push({ event: "error", message: executionError });
    } else if (!currentNodeId && !executionError) {
      context.log(`[deterministic-engine] Execution completed successfully. Total nodes: ${nodesExecuted}, total tokens: ${totalTokens}`);
      events.push({ event: "done", total_tokens: totalTokens, nodes_executed: nodesExecuted });
    }

    const response = {
      success: !executionError,
      events,
    };

    // Encode for Education plan logs fallback
    const resultBase64 = Buffer.from(JSON.stringify(response)).toString("base64");
    context.log(`DETERMINISTIC_ENGINE_RESULT:${resultBase64}`);

    return context.res.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    context.error(`[deterministic-engine] Critical error: ${msg}`);

    const response = {
      success: false,
      events: [{ event: "error", message: msg } as PipelineEvent],
    };

    const resultBase64 = Buffer.from(JSON.stringify(response)).toString("base64");
    context.log(`DETERMINISTIC_ENGINE_RESULT:${resultBase64}`);

    return context.res.json(response, 500);
  }
}
