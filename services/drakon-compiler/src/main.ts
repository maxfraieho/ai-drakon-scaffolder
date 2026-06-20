// Appwrite Function: drakon-compiler
// Compiles a set of .drakon diagrams to JS/Lua using drakontechgen.js (browser bundle
// run inside a Node.js vm context with a mock window).
//
// Education-plan note: Appwrite Education plan does not persist responseBody for
// executions. We emit the result as a single base64 log line:
//   DRAKON_CODE_RESULT:<base64>
// The CF Worker reconstructs the payload by polling execution logs.
//
// Payload (JSON body):
// {
//   "name": "MyProject",          // project/module name
//   "language": "JS",             // "JS" | "LUA2604" | "JS2604" etc.
//   "mainFun": "main",            // entry function name (optional)
//   "root": "diagramId",          // root handle (id of root folder or single diagram)
//   "diagrams": {                 // handle → object map
//     "diagramId": {
//       "type": "drakon",         // "drakon" or "folder"
//       "name": "diagramName",
//       "items": {...},           // drakon items
//       "params": "..."           // drakon params string
//     },
//     // For multi-file projects:
//     "folderId": {
//       "type": "folder",
//       "name": "folderName",
//       "children": ["id1", "id2"]
//     }
//   },
//   "settings": {                 // optional
//     "iife": false,
//     "unit": false,
//     "dependencies": [],
//     "outputFile": "output.js"
//   }
// }

import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

// ---------------------------------------------------------------------------
// Load browser JS bundles into a shared vm context (module-level singleton)
// ---------------------------------------------------------------------------

function createDrakonContext(): vm.Context {
  // window === ctx so that both "window.X = Y" and UMD "root.X = Y" (where root=this=ctx)
  // land on the same object. esprima/escodegen/luaparse use UMD and set on `this` (=ctx);
  // drakontechgen.js explicitly sets on `window`. With window===ctx both paths converge.
  const ctx: Record<string, unknown> = {};
  vm.createContext(ctx);
  // After createContext we can't reassign ctx, so instead we set window = ctx proxy-style
  // by running a script that points window back to the global.
  vm.runInContext("var window = this;", ctx);

  // Mock browser APIs needed by drakontechgen/drakongen
  vm.runInContext(`
    // setTimeout used in pause() inside generators
    function setTimeout(fn, delay) {
      fn();
      return 0;
    }
    function clearTimeout() {}

    // DOMParser used to parse HTML params field
    function DOMParser() {}
    DOMParser.prototype.parseFromString = function(html, type) {
      // Minimal DOM-like structure to extract list items and paragraphs
      function stripTags(s) {
        return (s || "").replace(/<[^>]+>/g, "").trim();
      }
      var textContent = stripTags(html);
      var items = [];
      var liRegex = /<li[^>]*>(.*?)<\\/li>/gi;
      var m;
      while ((m = liRegex.exec(html)) !== null) {
        items.push({ textContent: stripTags(m[1]) });
      }
      return {
        body: {
          textContent: textContent,
          querySelectorAll: function(sel) {
            if (sel === "li") return items;
            if (sel === "p") {
              var paragraphs = [];
              var pReg = /<p[^>]*>(.*?)<\\/p>/gi;
              var pm;
              while ((pm = pReg.exec(html)) !== null) {
                paragraphs.push({ textContent: stripTags(pm[1]) });
              }
              return paragraphs;
            }
            return [];
          },
          getElementsByTagName: function(tag) {
            return this.querySelectorAll(tag.toLowerCase());
          }
        }
      };
    };
  `, ctx);

  const libDir = path.join(__dirname, "..", "libs");
  const order = [
    "drakongen.js",
    "escodegen.browser.min.js",
    "esprima.js",
    "luaparse.js",
    "drakontechgen.js",
  ];

  for (const lib of order) {
    const code = fs.readFileSync(path.join(libDir, lib), "utf-8");
    vm.runInContext(code, ctx);
  }

  return ctx;
}

// Initialise once per cold start
let drakonCtx: vm.Context | null = null;

function getDrakonCtx(): vm.Context {
  if (!drakonCtx) drakonCtx = createDrakonContext();
  return drakonCtx;
}

// ---------------------------------------------------------------------------
// HTML stripping (DrakonWidget stores content as HTML; drakontechgen needs plain text)
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  if (!html || !html.includes("<")) return html;
  return html
    .replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .trim();
}

// params HTML "<p>parameters:</p><ul><li>name</li><li>age</li></ul>" → "name\nage"
function normalizeParams(html: string): string {
  if (!html || !html.includes("<")) return html;
  const items: string[] = [];
  const re = /<li[^>]*>(.*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text) items.push(text);
  }
  // Fallback: if no <li> tags, strip all tags
  return items.length > 0 ? items.join("\n") : stripHtml(html);
}

function normalizeItems(
  items: Record<string, Record<string, unknown>> | undefined
): Record<string, Record<string, unknown>> | undefined {
  if (!items) return items;
  const result: Record<string, Record<string, unknown>> = {};
  for (const [id, item] of Object.entries(items)) {
    const normalized = { ...item };
    if (typeof normalized.content === "string") {
      normalized.content = stripHtml(normalized.content);
    }
    if (typeof normalized.secondary === "string") {
      normalized.secondary = stripHtml(normalized.secondary);
    }
    result[id] = normalized;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DrakonObject {
  type: "drakon" | "folder";
  name: string;
  items?: Record<string, unknown>;
  params?: string;
  keywords?: string;
  children?: string[];
}

interface CompilePayload {
  name: string;
  language?: string;
  mainFun?: string;
  root: string;
  diagrams: Record<string, DrakonObject>;
  settings?: {
    iife?: boolean;
    unit?: boolean;
    dependencies?: string[];
    outputFile?: string;
  };
}

// ---------------------------------------------------------------------------
// Compile logic
// ---------------------------------------------------------------------------

async function compile(payload: CompilePayload): Promise<string> {
  const ctx = getDrakonCtx();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drakontechgen = ctx as Record<string, any>;

  if (!drakontechgen?.drakontechgen?.buildGenerator) {
    throw new Error("drakontechgen.buildGenerator not available in vm context");
  }

  const {
    name,
    language = "JS",
    mainFun,
    root,
    diagrams,
    settings = {},
  } = payload;

  const errors: string[] = [];
  const codeChunks: string[] = [];

  function onError(err: Error | { message: string }) {
    errors.push(err instanceof Error ? err.message : String((err as { message?: string }).message ?? err));
  }

  async function onData(chunk: string) {
    codeChunks.push(chunk);
  }

  async function getObjectByHandle(handle: string): Promise<DrakonObject | null> {
    const obj = diagrams[handle];
    if (!obj) return null;
    if (obj.type === "drakon") {
      return {
        ...obj,
        items: normalizeItems(obj.items as Record<string, Record<string, unknown>>),
        params: typeof obj.params === "string" ? normalizeParams(obj.params) : obj.params,
      };
    }
    return obj;
  }

  const generator = drakontechgen.drakontechgen.buildGenerator(
    name,
    root,
    getObjectByHandle,
    onError,
    onData,
    language,
    mainFun ?? "",
    {
      iife: settings.iife ?? false,
      unit: settings.unit ?? false,
      dependencies: settings.dependencies ?? [],
      outputFile: settings.outputFile ?? "",
    }
  );

  await generator.run();

  if (errors.length > 0 && codeChunks.length === 0) {
    throw new Error("Compilation errors:\n" + errors.join("\n"));
  }

  return codeChunks.join("\n");
}

// ---------------------------------------------------------------------------
// Appwrite Function entry point
// ---------------------------------------------------------------------------

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
      return context.res.json({ status: "drakon-compiler ok" });
    }

    let payload: CompilePayload;
    try {
      payload = JSON.parse(context.req.body);
    } catch {
      return context.res.json({ error: "Invalid JSON body" }, 400);
    }

    if (!payload.name || !payload.root || !payload.diagrams) {
      return context.res.json(
        { error: "Required fields: name, root, diagrams" },
        400
      );
    }

    context.log(`[drakon-compiler] Compiling "${payload.name}" (${payload.language ?? "JS"}) root="${payload.root}" diagrams=${Object.keys(payload.diagrams).length}`);

    const code = await compile(payload);

    context.log(`[drakon-compiler] Success, ${code.length} chars`);

    const resultBase64 = Buffer.from(
      JSON.stringify({ code, errors: [] })
    ).toString("base64");
    context.log(`DRAKON_CODE_RESULT:${resultBase64}`);

    return context.res.json({ ok: true, length: code.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    context.error(`[drakon-compiler] Error: ${message}`);

    const resultBase64 = Buffer.from(
      JSON.stringify({ code: "", errors: [message] })
    ).toString("base64");
    context.log(`DRAKON_CODE_RESULT:${resultBase64}`);

    return context.res.json({ ok: false, error: message }, 500);
  }
}
