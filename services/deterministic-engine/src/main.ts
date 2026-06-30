// Appwrite Function: deterministic-engine
// Executes a DRAKON flowchart (.drakon JSON / IR) step-by-step
// while verifying the execution against a 4-Gate Control Plane (HarnessSpec).
//
// Education-plan note: Appwrite never persists responseBody for executions on
// the Education plan. We emit the result as a single base64 log line:
//   DETERMINISTIC_ENGINE_RESULT:<base64>
// The CF Worker reconstructs the payload from that log line.

import { Buffer } from "buffer";

export interface GateVerdict {
  gate: "confidence" | "policy" | "cost" | "safety";
  allowed: boolean;
  score?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export type PipelineEvent =
  | { event: "node_start"; node_id: string; node_type: string }
  | { event: "node_done"; node_id: string; tokens: number; gate_verdicts: GateVerdict[] }
  | { event: "gate_blocked"; node_id: string; gate: string; reason: string }
  | { event: "breakpoint"; node_id: string; error?: string }
  | { event: "done"; total_tokens: number; nodes_executed: number }
  | { event: "error"; message: string };

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

interface HarnessSpec {
  agent_name: string;
  version: string;
  gates: {
    confidence: { min_score: number; critique_max_retries: number };
    policy: { allowed_capabilities: string[]; deny_patterns: string[] };
    cost: { max_tokens_per_node: number; warn_at_percent: number };
    safety: { blocked_patterns: string[]; require_human_approval: string[] };
  };
  allowed_tools: string[];
  resources?: Record<string, string[]>;
}

// Capability wildcard matching logic
function capabilityMatches(granted: string, requested: string): boolean {
  if (granted === "*" || granted === requested) return true;
  if (granted.endsWith(".*")) {
    const prefix = granted.slice(0, -2);
    return requested === prefix || requested.startsWith(prefix + ".");
  }
  return false;
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
      harness_spec?: HarnessSpec;
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
      let blockReason = "";
      let blockedGateName: "confidence" | "policy" | "cost" | "safety" | "" = "";

      // 1. SAFETY GATE
      let safetyPassed = true;
      const nodeContent = (node.content || "") + " " + (node.secondary || "");
      for (const regex of safetyRegexes) {
        if (regex.test(nodeContent)) {
          safetyPassed = false;
          blockReason = `Safety check failed: node content matched blocked pattern ${regex.source}`;
          blockedGateName = "safety";
          break;
        }
      }
      verdicts.push({
        gate: "safety",
        allowed: safetyPassed,
        reason: safetyPassed ? undefined : blockReason,
      });

      // 2. POLICY GATE (MCP Capabilities)
      let policyPassed = true;
      if (safetyPassed && (node.type === "action" || node.type === "process")) {
        const isTool = node.nodeKind === "tool" || /tool|mcp/i.test(node.content || "");
        if (isTool) {
          // Deduce requested capability, e.g., mcp.gitnexus.query
          let requestedCap = "tool.invoke.unknown";
          const content = (node.content || "").trim();
          
          // Match capability names from node content or default
          if (/gitnexus/i.test(content)) {
            requestedCap = "tool.invoke.gitnexus.query";
            if (/impact/i.test(content)) requestedCap = "tool.invoke.gitnexus.impact";
          } else if (/notebooklm/i.test(content)) {
            requestedCap = "tool.invoke.notebooklm.chat_ask";
          } else if (/github/i.test(content)) {
            requestedCap = "github.repo.commit";
          }

          // Check if capability is authorized
          const isAllowed = (harness_spec.gates.policy.allowed_capabilities || []).some((pattern) =>
            capabilityMatches(pattern, requestedCap)
          );
          const isDenied = (harness_spec.gates.policy.deny_patterns || []).some((pattern) =>
            capabilityMatches(pattern, requestedCap)
          );

          if (!isAllowed || isDenied) {
            policyPassed = false;
            blockReason = `Policy check failed: capability '${requestedCap}' is not allowed or explicitly denied.`;
            blockedGateName = "policy";
          }
        }
      }
      verdicts.push({
        gate: "policy",
        allowed: policyPassed,
        reason: policyPassed ? undefined : blockReason,
      });

      // 3. CONFIDENCE GATE (LLM Nodes)
      let confidencePassed = true;
      let finalScore = 1.0;
      let injectedContext = "";

      if (safetyPassed && policyPassed && node.nodeKind === "llm") {
        const minScore = harness_spec.gates.confidence.min_score || 0.7;
        const maxRetries = harness_spec.gates.confidence.critique_max_retries || 2;
        
        // NotebookLM Context Injection
        try {
          // Simulate NotebookLM Bridge API call
          const notebookId = context.req.headers["x-notebooklm-id"] || "default-notebook";
          context.log(`[NotebookLM Bridge] Fetching context for node ${id} from notebook ${notebookId}...`);
          
          // Here we would make a real fetch to process.env.NOTEBOOKLM_API_URL
          // For deterministic execution, we mock the retrieved context
          injectedContext = `[NotebookLM Context]: System architecture guidelines require strict type safety and pure functions.`;
          context.log(`[NotebookLM Bridge] Injected context into system prompt: ${injectedContext}`);
        } catch (err) {
          context.error(`[NotebookLM Bridge] Failed to inject context: ${err}`);
        }

        // Simulating LLM confidence score
        // We deterministic-mock it: normally passes (0.85), but if retry triggers we log it
        let score = 0.65; // start low to simulate a critique-correction loop
        let retries = 0;
        
        while (score < minScore && retries < maxRetries) {
          retries++;
          context.log(`[deterministic-engine] Confidence score (${score}) below threshold (${minScore}). Triggering critique retry ${retries}/${maxRetries}...`);
          score += 0.15; // simulate correction improvement
        }

        finalScore = score;
        if (finalScore < minScore) {
          confidencePassed = false;
          blockReason = `Confidence check failed: score (${finalScore}) below minimum threshold (${minScore}) after ${retries} critique loops.`;
          blockedGateName = "confidence";
        }
      }
      
      verdicts.push({
        gate: "confidence",
        allowed: confidencePassed,
        score: node.nodeKind === "llm" ? finalScore : undefined,
        reason: confidencePassed ? undefined : blockReason,
        metadata: injectedContext ? { notebooklm_context: injectedContext } : undefined
      });

      // 4. COST GATE (Token limit checking)
      let costPassed = true;
      let simulatedTokens = 0;
      if (safetyPassed && policyPassed && confidencePassed) {
        if (node.nodeKind === "llm") {
          simulatedTokens = Math.floor(Math.random() * 4000) + 1000; // 1000-5000 tokens
        } else if (node.nodeKind === "tool") {
          simulatedTokens = 200; // tool calls cost less
        }

        const maxTokens = harness_spec.gates.cost.max_tokens_per_node || 8000;
        const warnPercent = harness_spec.gates.cost.warn_at_percent || 80;

        if (simulatedTokens > maxTokens) {
          costPassed = false;
          blockReason = `Cost check failed: node used ${simulatedTokens} tokens, exceeding max limit ${maxTokens}`;
          blockedGateName = "cost";
        } else if (simulatedTokens > (maxTokens * warnPercent) / 100) {
          context.log(`[WARNING] Node '${currentNodeId}' used ${simulatedTokens} tokens, exceeding warning threshold (${warnPercent}% of ${maxTokens})`);
        }

        totalTokens += simulatedTokens;
      }
      verdicts.push({
        gate: "cost",
        allowed: costPassed,
        reason: costPassed ? undefined : blockReason,
      });

      // Check if any gate failed
      blocked = verdicts.some((v) => !v.allowed);

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
