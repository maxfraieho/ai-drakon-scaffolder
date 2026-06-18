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

// Extract the first JSON object from a possibly markdown-wrapped LLM response.
function extractJsonObject(text: string): any {
  let jsonStr = "";
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (fenced) {
    jsonStr = fenced[1].trim();
  } else {
    const startIdx = text.indexOf("{");
    const endIdx = text.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      jsonStr = text.slice(startIdx, endIdx + 1).trim();
    } else {
      jsonStr = text.trim();
    }
  }
  return JSON.parse(jsonStr);
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

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    log(`Calling LLM Gateway at ${gatewayUrl}...`);
    const llmResponse = await callLLM(messages, gatewayUrl, gatewayToken, model);

    log("Parsing .drakon JSON from LLM response...");
    const drakonJson = validateDrakon(extractJsonObject(llmResponse), params);

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
