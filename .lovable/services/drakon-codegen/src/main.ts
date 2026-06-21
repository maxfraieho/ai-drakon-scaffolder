// Appwrite Function: drakon-codegen
// Generates a valid .drakon JSON from a natural-language function description
// via an LLM (NVIDIA NIM or the llm-gateway fallback).
//
// Education-plan note: Appwrite never persists responseBody for executions on
// the Education plan, so we ALSO emit the result into the logs as a single
// base64 line ("DRAKON_JSON_RESULT:<base64>"). The CF Worker reconstructs the
// payload from that log line in handleCodegenStatus().

interface LLMMessage {
  role: string;
  content: string;
}

async function callLLM(
  messages: LLMMessage[],
  gatewayUrl: string,
  authToken: string,
  model: string
): Promise<string> {
  const resp = await fetch(`${gatewayUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      model: model || "auto",
      messages,
      max_tokens: 2000,
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`LLM Gateway error: status ${resp.status}. Details: ${errText}`);
  }

  const data = (await resp.json()) as any;
  return data.choices?.[0]?.message?.content || "";
}

// Extract the first balanced JSON object from a possibly markdown-wrapped LLM response.
function extractJsonObject(text: string): any {
  // Try fenced block first (```json ... ``` or ``` ... ```)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    return JSON.parse(fenced[1].trim());
  }
  // Walk character-by-character tracking nesting depth to find first balanced {}.
  // This avoids the lastIndexOf bug where trailing text with } chars causes an overrun.
  let depth = 0;
  let inString = false;
  let escape = false;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === "\"") { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }
  }
  // Fallback: try the whole thing
  return JSON.parse(text.trim());
}

// Minimal structural validation / normalisation of a .drakon document.
function validateDrakon(doc: any, params: string): any {
  if (!doc || typeof doc !== "object") {
    throw new Error("LLM did not return a JSON object");
  }
  if (doc.type !== "drakon") doc.type = "drakon";
  if (!doc.items || typeof doc.items !== "object") {
    throw new Error("drakon JSON missing 'items' object");
  }
  // Node "1" must always be the end node.
  if (!doc.items["1"] || doc.items["1"].type !== "end") {
    doc.items["1"] = { type: "end" };
  }
  // Node "2" must always be the entry branch.
  if (!doc.items["2"] || doc.items["2"].type !== "branch") {
    throw new Error("drakon JSON missing entry branch node '2'");
  }
  doc.items["2"].branchId = 0;
  if (!doc.keywords || typeof doc.keywords !== "object") {
    doc.keywords = { function: false, machine: false, async: false, export: true };
  }
  if (typeof doc.params !== "string") {
    doc.params = params || "";
  }
  return doc;
}

// Check structural correctness and reachability in a .drakon items diagram
function validateDrakonFlow(items: any): string[] {
  const errors: string[] = [];
  const visited = new Set<string>();

  if (!items) {
    errors.push("Missing diagram items");
    return errors;
  }
  
  if (!items["2"]) {
    errors.push("Missing entry branch node '2'");
    return errors;
  }
  
  if (!items["1"] || items["1"].type !== "end") {
    errors.push("Missing end node '1' of type 'end'");
  }

  // Check structure and transitions
  const keys = Object.keys(items);
  for (const id of keys) {
    const node = items[id];
    if (!node || typeof node !== "object") {
      errors.push(`Node '${id}' is not an object`);
      continue;
    }
    if (!node.type) {
      errors.push(`Node '${id}' is missing a 'type' field`);
      continue;
    }

    if (node.type === "action" || node.type === "branch") {
      if (!node.one) {
        errors.push(`Node '${id}' of type '${node.type}' is missing transition link 'one'`);
      } else if (!items[node.one]) {
        errors.push(`Node '${id}' points to non-existent node '${node.one}' via 'one'`);
      }
    } else if (node.type === "question") {
      if (!node.one) {
        errors.push(`Node '${id}' of type 'question' is missing transition link 'one'`);
      } else if (!items[node.one]) {
        errors.push(`Node '${id}' points to non-existent node '${node.one}' via 'one'`);
      }
      if (!node.two) {
        errors.push(`Node '${id}' of type 'question' is missing transition link 'two'`);
      } else if (!items[node.two]) {
        errors.push(`Node '${id}' points to non-existent node '${node.two}' via 'two'`);
      }
    }
  }

  // Reachability search from '2'
  const stack: string[] = ["2"];
  const reached = new Set<string>();
  
  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (reached.has(currentId)) continue;
    reached.add(currentId);
    
    const node = items[currentId];
    if (node) {
      if (node.one && items[node.one]) {
        stack.push(node.one);
      }
      if (node.two && items[node.two]) {
        stack.push(node.two);
      }
    }
  }

  if (!reached.has("1")) {
    errors.push("End node '1' is not reachable from entry branch '2'");
  }

  return errors;
}

const handler = async (context: any) => {
  const { req, res, log, error } = context;

  const env = process.env as Record<string, string | undefined>;
  // Use NVIDIA NIM directly if a key is set (bypasses the gateway function).
  const nimKey = env.NIM_API_KEY;
  const gatewayUrl = nimKey
    ? "https://integrate.api.nvidia.com"
    : env.LLM_GATEWAY_URL || "https://6a3200cd0006b155c099.fra.appwrite.run";
  const gatewayToken = nimKey || env.LLM_GATEWAY_TOKEN || "freecc";

  if (req.method === "GET" && req.path === "/health") {
    return res.json({ status: "ok", service: "drakon-codegen" });
  }

  try {
    let body: any = {};
    if (req.body) {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }

    const description: string = (body.description || "").trim();
    const language: string = body.language || "JS2604";
    const functionName: string = (body.functionName || "myFunction").trim();
    const params: string = (body.params || "").trim();
    const model: string = body.model || (nimKey ? "nvidia/llama-3.3-nemotron-super-49b-v1" : "auto");

    if (!description) {
      return res.json({ success: false, error: "description is required" }, 400);
    }

    log(`Generating .drakon for "${functionName}" (lang: ${language}, model: ${model})...`);

    const systemPrompt = "You are a DRAKON flowchart expert. Return ONLY valid JSON, no markdown, no explanation.";
    const userPrompt = `Generate a valid .drakon JSON for this function.

Function name: ${functionName}
Parameters: ${params || "none"}
Description: ${description}

DRAKON JSON format (STRICT):
{
  "type": "drakon",
  "items": {
    "1": {"type": "end"},
    "2": {"type": "branch", "branchId": 0, "one": "3"},
    "3": {"type": "action", "one": "1", "content": "first step description"}
  },
  "keywords": {"function": false, "machine": false, "async": false, "export": true},
  "params": "${params || ""}"
}

Rules:
- Node "1" is ALWAYS end
- Node "2" is ALWAYS the entry branch (branchId: 0)
- Action nodes: {"type":"action","one":"NEXT_ID","content":"description"}
- Linear flow: 2 -> 3 -> 4 -> ... -> 1 (end)
- Content should be pseudocode or natural language, NOT exact code
- Use 3-8 action steps for a typical function
- For conditionals: {"type":"question","one":"YES_ID","two":"NO_ID","content":"condition?"}
- Return ONLY valid JSON, no markdown, no explanation.`;

    let messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    let drakonJson: any = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      log(`Calling LLM Gateway at ${gatewayUrl} (attempt ${attempts}/${maxAttempts})...`);
      const llmResponse = await callLLM(messages, gatewayUrl, gatewayToken, model);

      try {
        log("Extracting and parsing .drakon JSON from LLM response...");
        const parsed = extractJsonObject(llmResponse);
        const normalized = validateDrakon(parsed, params);
        
        // Detailed structural/flow validation
        const flowErrors = validateDrakonFlow(normalized.items);
        if (flowErrors.length > 0) {
          throw new Error("Validation errors: " + flowErrors.join("; "));
        }
        
        drakonJson = normalized;
        break; // Success!
      } catch (err: any) {
        log(`Validation failed on attempt ${attempts}: ${err.message}`);
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to generate a valid DRAKON diagram after ${maxAttempts} attempts. Last error: ${err.message}`);
        }
        
        // Add LLM's response and errors to messages context for correction
        messages.push({ role: "assistant", content: llmResponse });
        messages.push({
          role: "user",
          content: `Your previous response had the following validation errors:\n${err.message}\n\nPlease correct the errors and return ONLY the corrected valid DRAKON JSON.`
        });
      }
    }

    const nodeCount = Object.keys(drakonJson.items || {}).length;
    const result = {
      success: true,
      drakon_json: drakonJson,
      language,
      functionName,
    };

    // Emit the result into the logs so the CF Worker can reconstruct it even
    // when responseBody is dropped (Appwrite Education plan).
    const encoded = Buffer.from(JSON.stringify(result), "utf-8").toString("base64");
    log(`DRAKON_JSON_RESULT:${encoded}`);
    log(`Done. drakon_json generated (${nodeCount} nodes).`);

    return res.json(result);
  } catch (err: any) {
    error(`Error in drakon-codegen function: ${err.message || err}`);
    return res.json({ success: false, error: err.message || "Internal Server Error" }, 500);
  }
};

export default handler;
module.exports = handler;
