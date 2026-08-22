# Phase 2 Boundary Extraction Inventory

**Target Branch:** `phase0-stabilize` (commit `6757b7b8`)  
**Scope:** Verified line-cited inventory for Phase 2 ("Boundary extraction").  
**Status:** Read-only verification completed; no application code moved or altered.

---

## 1. `GateVerdict` Duplication

### Locations & Line Ranges
- [src/lib/harness/pipeline-client.ts](file:///home/vokov/agy-work/ai-drakon-scaffolder/src/lib/harness/pipeline-client.ts#L16-L22) (lines 16–22)
- [services/deterministic-engine/src/main.ts](file:///home/vokov/agy-work/ai-drakon-scaffolder/services/deterministic-engine/src/main.ts#L12-L18) (lines 12–18)

*(Note: The accompanying `PipelineEvent` discriminated union is also duplicated between [pipeline-client.ts:8-14](file:///home/vokov/agy-work/ai-drakon-scaffolder/src/lib/harness/pipeline-client.ts#L8-L14) and [main.ts:20-26](file:///home/vokov/agy-work/ai-drakon-scaffolder/services/deterministic-engine/src/main.ts#L20-L26)).*

### Quoted Bodies

**1. `src/lib/harness/pipeline-client.ts` (lines 16–22):**
```typescript
export interface GateVerdict {
  gate: 'confidence' | 'policy' | 'cost' | 'safety';
  allowed: boolean;
  score?: number;
  reason?: string;
  metadata?: Record<string, any>;
}
```

**2. `services/deterministic-engine/src/main.ts` (lines 12–18):**
```typescript
export interface GateVerdict {
  gate: "confidence" | "policy" | "cost" | "safety";
  allowed: boolean;
  score?: number;
  reason?: string;
  metadata?: Record<string, any>;
}
```

### Shape Comparison & Field Diff
| Field | `src/lib/harness/pipeline-client.ts` | `services/deterministic-engine/src/main.ts` | Status |
| :--- | :--- | :--- | :--- |
| `gate` | `'confidence' \| 'policy' \| 'cost' \| 'safety'` | `"confidence" \| "policy" \| "cost" \| "safety"` | Identical (single vs double quote) |
| `allowed` | `boolean` | `boolean` | Identical |
| `score?` | `number` | `number` | Identical |
| `reason?` | `string` | `string` | Identical |
| `metadata?` | `Record<string, any>` | `Record<string, any>` | Identical |

### Verdict
**compatible but not identical -- quotes formatting only (`'` vs `"`), structurally identical field-by-field.**

---

## 2. `HarnessSpec` / `DrakonHarnessSpec` Duplication

### Locations & Line Ranges
- [src/lib/harness/harness-spec.ts](file:///home/vokov/agy-work/ai-drakon-scaffolder/src/lib/harness/harness-spec.ts#L7-L36) (lines 7–36) — defined as `export interface DrakonHarnessSpec`
- [services/deterministic-engine/src/main.ts](file:///home/vokov/agy-work/ai-drakon-scaffolder/services/deterministic-engine/src/main.ts#L44-L55) (lines 44–55) — defined as unexported `interface HarnessSpec`

### Quoted Bodies

**1. `src/lib/harness/harness-spec.ts` (lines 7–36):**
```typescript
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
```

**2. `services/deterministic-engine/src/main.ts` (lines 44–55):**
```typescript
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
```

### Field-by-Field Diff
1. **Type identifier & export:** `export interface DrakonHarnessSpec` vs `interface HarnessSpec` (internal).
2. **Missing top-level fields in `HarnessSpec`:**
   - `$schema?: string` (present in `DrakonHarnessSpec`, absent in `HarnessSpec`)
   - `description?: string` (present in `DrakonHarnessSpec`, absent in `HarnessSpec`)
   - `mcp_servers: Record<string, { endpoint: string; required: boolean; timeout_ms?: number }>` (present in `DrakonHarnessSpec`, absent in `HarnessSpec`)
   - `permissions: { max_tokens_per_hour: number; max_tokens_per_node: number; max_execution_time_seconds: number; max_github_commits_per_day?: number; }` (present in `DrakonHarnessSpec`, absent in `HarnessSpec`)
   - `runtime: { entrypoint: string; execution_mode: 'deterministic' | 'hybrid'; confidence_threshold: number; }` (present in `DrakonHarnessSpec`, absent in `HarnessSpec`)
3. **Field Optionality Mismatch:**
   - `resources`: required `Record<string, string[]>` in `DrakonHarnessSpec`, but optional `resources?: Record<string, string[]>` in `HarnessSpec`.
4. **Matching Substructures:**
   - `agent_name: string` (identical)
   - `version: string` (identical)
   - `allowed_tools: string[]` (identical)
   - `gates`: sub-gate structures (`confidence`, `policy`, `cost`, `safety`) are identical.

### Verdict
**diverged -- listing all diffs: `HarnessSpec` is an unexported partial subset omitting 5 top-level fields (`$schema`, `description`, `mcp_servers`, `permissions`, `runtime`) and loosening `resources` to optional.**

---

## 3. DRAKON IR Conversion Implemented Twice

### Locations & Line Ranges

#### 1. TypeScript Module (`src/lib/htse/`)
- [src/lib/htse/diagram-to-ir.ts:106-120](file:///home/vokov/agy-work/ai-drakon-scaffolder/src/lib/htse/diagram-to-ir.ts#L106-L120): `convertDiagramToIr(diagram: DrakonDiagram): IrDiagram`
- [src/lib/htse/diagram-to-ir.ts:122-146](file:///home/vokov/agy-work/ai-drakon-scaffolder/src/lib/htse/diagram-to-ir.ts#L122-L146): `convertDiagramToIrWithValidation(diagram: DrakonDiagram)`
- [src/lib/htse/ir-to-diagram.ts:45-59](file:///home/vokov/agy-work/ai-drakon-scaffolder/src/lib/htse/ir-to-diagram.ts#L45-L59): `convertIrToDiagram(ir: IrDiagram): DrakonDiagram`
- [src/lib/htse/ir-validator-core.ts:76-222](file:///home/vokov/agy-work/ai-drakon-scaffolder/src/lib/htse/ir-validator-core.ts#L76-L222): `validateIrDeterministic(irPayload: unknown): ValidationResult`

#### 2. Inline Cloudflare Worker (`cloudflare-worker/worker-mcp-drakon.js`)
- [cloudflare-worker/worker-mcp-drakon.js:56-80](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L56-L80): `function convertDiagramToIr(diagram)`
- [cloudflare-worker/worker-mcp-drakon.js:82-104](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L82-L104): `function convertIrToDiagram(ir)`
- [cloudflare-worker/worker-mcp-drakon.js:36-54](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L36-L54): `function validateIrDeterministic(irPayload)`
- [cloudflare-worker/worker-mcp-drakon.js:573-575](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L573-L575): `function convertDiagramToIrForWorker(diagramPayload)`
- [cloudflare-worker/worker-mcp-drakon.js:577-579](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L577-L579): `function convertIrToDiagramForWorker(irPayload)`

### Quoted Bodies

**`cloudflare-worker/worker-mcp-drakon.js` (lines 56–80):**
```javascript
function convertDiagramToIr(diagram) {
  const items = {};
  for (const [id, item] of Object.entries(diagram.items || {})) {
    const style = {};
    try { const p = JSON.parse(item.style || '{}'); if (_isObject(p)) Object.assign(style, p); } catch {}
    if (item.link !== undefined) style.link = item.link;
    if (item.margin !== undefined) style.margin = item.margin;
    if (!VALID_IR_ITEM_TYPES.has(item.type)) style.originalType = item.type;
    const irItem = {
      type: VALID_IR_ITEM_TYPES.has(item.type) ? item.type : 'action',
      content: item.content ?? '',
      secondary: item.secondary,
      one: item.one,
      two: item.two,
      side: item.side,
      flag1: item.flag1 === undefined ? undefined : item.flag1 !== 0,
      branchId: item.branchId === undefined ? undefined : String(item.branchId),
    };
    if (Object.keys(style).length > 0) irItem.style = style;
    items[id] = irItem;
  }
  const acc = diagram.access === 'write' ? 'private' : 'public';
  const params = (diagram.params || '').split(',').map(p => p.trim()).filter(Boolean);
  return { name: diagram.name, access: acc, params, items };
}
```

**`src/lib/htse/diagram-to-ir.ts` (lines 106–120 + helpers L45–57, L67–95):**
```typescript
function parseItemStyle(style: string | undefined): Record<string, unknown> {
  if (!style) return {};
  try {
    const parsed = JSON.parse(style) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { rawStyle: style };
  } catch {
    return { rawStyle: style };
  }
}

function mapDiagramItemToIrItem(item: DrakonItem): IrItem {
  const style = parseItemStyle(item.style);
  if (item.link !== undefined) style.link = item.link;
  if (item.margin !== undefined) style.margin = item.margin;
  if (!IR_ITEM_TYPES.has(item.type as IrItemType)) style.originalType = item.type;

  const irItem: IrItem = {
    type: mapDrakonTypeToIrType(item.type),
    content: item.content ?? "",
    secondary: item.secondary,
    one: item.one,
    two: item.two,
    side: item.side,
    flag1: mapDiagramFlag1ToIrFlag1(item.flag1),
    branchId: mapDiagramBranchIdToIrBranchId(item.branchId),
  };

  if (Object.keys(style).length > 0) {
    irItem.style = style;
  }

  return irItem;
}

export function convertDiagramToIr(diagram: DrakonDiagram): IrDiagram {
  const items: Record<string, IrItem> = {};
  for (const [id, item] of Object.entries(diagram.items)) {
    items[id] = mapDiagramItemToIrItem(item);
  }
  return {
    name: diagram.name,
    access: mapDiagramAccessToIrAccess(diagram.access),
    params: parseDiagramParams(diagram.params),
    items,
  };
}
```

### Shape & Logic Comparison
1. **Produced IR Shape:**
   - Both implementations generate the exact same canonical IR JSON shape: `{ name: string, access: 'public' | 'private', params: string[], items: Record<string, IrItem> }`.
2. **`convertDiagramToIr` differences:**
   - **Invalid style JSON fallback:** `src/lib/htse/diagram-to-ir.ts` catches JSON parse errors / non-objects and preserves them as `{ rawStyle: style }`. The worker silently ignores invalid JSON and leaves `style` empty `{}`.
   - **`diagram.items` null guard:** The worker guards with `diagram.items || {}`, whereas `src/lib/htse/` assumes `diagram.items` is defined.
3. **`convertIrToDiagram` differences:**
   - **`branchId` parsing:** Worker uses `Number(item.branchId)` (which can produce `NaN`), whereas `src/lib/htse/ir-to-diagram.ts` checks `Number.isFinite(parsed) ? parsed : undefined`.
4. **`validateIrDeterministic` divergence:**
   - **Worker version (lines 36–54):** Only performs 4 basic checks: required non-empty `name`, required non-empty `items`, valid item type, and dangling `one`/`two` node references. Uses error code `DANGLING_REFERENCE`.
   - **`src/lib/htse/` version (lines 76–222):** Comprehensive semantic graph validator. In addition to the worker's checks, it performs BFS traversal to detect unreachable orphan nodes (`ORPHAN_NODE`), detects multiple terminal nodes (`MULTIPLE_TERMINAL_CANDIDATE`), enforces headers on silhouette diagrams (`MISSING_HEADER`), checks for missing alternate branch vectors (`MISSING_ALT_VECTOR`), uses error code `DANGLING_POINTER`, and returns actionable `autofixes` (`merge_terminals`, `remove_orphan`).

### Verdict
**diverged -- listing all diffs: basic IR conversion produces the same canonical shape with minor style fallback and branchId parsing differences, but `validateIrDeterministic` is significantly diverged (worker has a minimal 4-rule subset with different error codes, whereas `src/lib/htse` has BFS graph analysis, 5 extra validation rules, and autofixes).**

---

## 4. Dead Duplicate Routes in the Worker

### Locations & Line Ranges

#### 1. Live Public Handlers (Pre-Authentication)
- [cloudflare-worker/worker-mcp-drakon.js:2652-2659](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L2652-L2659): `GET /v1/github/tree`
- [cloudflare-worker/worker-mcp-drakon.js:2660-2667](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L2660-L2667): `GET /v1/github/file`
- [cloudflare-worker/worker-mcp-drakon.js:2668-2673](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L2668-L2673): `GET /v1/github/branches`

#### 2. Auth Boundary
- [cloudflare-worker/worker-mcp-drakon.js:2758-2761](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L2758-L2761): `verifyOwnerAuth(request, env)`

#### 3. Shadowed / Dead Duplicate Handlers (Post-Authentication)
- [cloudflare-worker/worker-mcp-drakon.js:2841-2848](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L2841-L2848): `GET /v1/github/tree` *(DEAD)*
- [cloudflare-worker/worker-mcp-drakon.js:2850-2857](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L2850-L2857): `GET /v1/github/file` *(DEAD)*
- [cloudflare-worker/worker-mcp-drakon.js:2881-2886](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L2881-L2886): `GET /v1/github/branches` *(DEAD)*

*(Note: [POST /v1/github/commit](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L2859-L2868) at lines 2859–2868 and [DELETE /v1/github/delete](file:///home/vokov/agy-work/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js#L2870-L2879) at lines 2870–2879 in this same post-auth block are active and NOT duplicated).*

### Quoted Bodies

**Pre-Auth Active Routes (lines 2652–2673):**
```javascript
      // ─── GitHub read-only routes (no auth needed — Worker uses server-side token) ─────
      if (method === 'GET' && path === '/v1/github/tree') {
        const owner = url.searchParams.get('owner') || '';
        const repo = url.searchParams.get('repo') || '';
        const treePath = url.searchParams.get('path') || '';
        const branch = url.searchParams.get('branch') || 'main';
        const requestToken = request.headers.get('X-Github-Token') || '';
        return jsonResponse(await handleGithubListTree({ owner, repo, path: treePath, branch }, env, requestToken));
      }
      if (method === 'GET' && path === '/v1/github/file') {
        const owner = url.searchParams.get('owner') || '';
        const repo = url.searchParams.get('repo') || '';
        const filePath = url.searchParams.get('path') || '';
        const branch = url.searchParams.get('branch') || 'main';
        const requestToken = request.headers.get('X-Github-Token') || '';
        return jsonResponse(await handleGithubGetFile({ owner, repo, path: filePath, branch }, env, requestToken));
      }
      if (method === 'GET' && path === '/v1/github/branches') {
        const owner = url.searchParams.get('owner') || '';
        const repo = url.searchParams.get('repo') || '';
        const requestToken = request.headers.get('X-Github-Token') || '';
        return jsonResponse(await handleGithubListBranches({ owner, repo }, env, requestToken));
      }
```

**Post-Auth Dead Duplicate Routes (lines 2841–2857 & 2881–2886):**
```javascript
      if (method === 'GET' && path === '/v1/github/tree') {
        const owner = url.searchParams.get('owner') || '';
        const repo = url.searchParams.get('repo') || '';
        const treePath = url.searchParams.get('path') || '';
        const branch = url.searchParams.get('branch') || 'main';
        const requestToken = request.headers.get('X-Github-Token') || '';
        return jsonResponse(await handleGithubListTree({ owner, repo, path: treePath, branch }, env, requestToken));
      }

      if (method === 'GET' && path === '/v1/github/file') {
        const owner = url.searchParams.get('owner') || '';
        const repo = url.searchParams.get('repo') || '';
        const filePath = url.searchParams.get('path') || '';
        const branch = url.searchParams.get('branch') || 'main';
        const requestToken = request.headers.get('X-Github-Token') || '';
        return jsonResponse(await handleGithubGetFile({ owner, repo, path: filePath, branch }, env, requestToken));
      }
      // [POST /v1/github/commit (L2859-2868) and DELETE /v1/github/delete (L2870-2879) live here]
      if (method === 'GET' && path === '/v1/github/branches') {
        const owner = url.searchParams.get('owner') || '';
        const repo = url.searchParams.get('repo') || '';
        const requestToken = request.headers.get('X-Github-Token') || '';
        return jsonResponse(await handleGithubListBranches({ owner, repo }, env, requestToken));
      }
```

### Analysis
Because Cloudflare Worker handles requests sequentially in `fetch()`, any `GET /v1/github/tree`, `GET /v1/github/file`, or `GET /v1/github/branches` matches lines 2652, 2660, or 2668 and executes `return jsonResponse(...)`. Control flow never reaches `verifyOwnerAuth` (line 2758), making lines 2841–2848, 2850–2857, and 2881–2886 unreachable dead code.

### Verdict
**byte-identical dead duplicates -- lines 2841–2848, 2850–2857, and 2881–2886 are unreachable byte-identical copies shadowed by active handlers at lines 2652–2673.**

---

## 5. `parseFrontmatter` Implementations

### Locations & Line Ranges
- **Implementation 1:** [src/lib/adr/parser.ts:38-58](file:///home/vokov/agy-work/ai-drakon-scaffolder/src/lib/adr/parser.ts#L38-L58) (lines 38–58)
- **Implementation 2:** [src/lib/garden/notesApi.ts:341-364](file:///home/vokov/agy-work/ai-drakon-scaffolder/src/lib/garden/notesApi.ts#L341-L364) (lines 341–364)
- **Additional Service Implementation:** [services/docs-agent-flue/lib/frontmatter.ts:1-57](file:///home/vokov/agy-work/ai-drakon-scaffolder/services/docs-agent-flue/lib/frontmatter.ts#L1-L57) (lines 1–57)

### Quoted Bodies

**1. `src/lib/adr/parser.ts` (lines 38–58):**
```typescript
export function parseFrontmatter(content: string): Record<string, string | null> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, string | null> = {};

  for (const line of yaml.split('\n')) {
    const kv = line.match(/^(\S+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    // Remove quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val === 'null' || val === '' ? null : val;
  }

  return result;
}
```

**2. `src/lib/garden/notesApi.ts` (lines 341–364):**
```typescript
function parseFrontmatter(raw: string): { title?: string; tags: string[]; body: string } {
  if (!raw.startsWith("---")) return { tags: [], body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { tags: [], body: raw };
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, "");
  let title: string | undefined;
  let tags: string[] = [];
  for (const line of fm.split("\n")) {
    const tm = line.match(/^title:\s*(.*)$/);
    if (tm) {
      title = tm[1].replace(/^["']|["']$/g, "").trim();
      continue;
    }
    const tagsMatch = line.match(/^tags:\s*\[(.*)\]/);
    if (tagsMatch) {
      tags = tagsMatch[1]
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
  }
  return { title, tags, body };
}
```

**3. `services/docs-agent-flue/lib/frontmatter.ts` (lines 1–25, 48–57):**
```typescript
export function parseFrontmatter(text: string): { frontmatter: Record<string, any> | null; content: string } {
  const frontmatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/;
  const match = text.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: null, content: text };
  }
  
  const fmText = match[1];
  const content = text.slice(match[0].length);
  const frontmatter: Record<string, any> = {};
  // [Parses arrays [a,b], numbers, booleans, removes comments #, handles CRLF]
  return { frontmatter, content };
}
```

### Detailed Logic & Shape Diff
| Aspect | `src/lib/adr/parser.ts` | `src/lib/garden/notesApi.ts` | `services/docs-agent-flue/lib/frontmatter.ts` |
| :--- | :--- | :--- | :--- |
| **Return Type** | `Record<string, string \| null>` | `{ title?: string; tags: string[]; body: string }` | `{ frontmatter: Record<string, any> \| null; content: string }` |
| **Scope of Keys** | Generic: parses any key `^(\S+):` | Hardcoded: only parses `title` & `tags` | Generic: parses all keys, skips comments `#` |
| **Array Parsing** | None (stores raw string like `"[a, b]"`) | Explicit bracket parsing `^tags:\s*\[(.*)\]` | Generic bracket parsing `[v1, v2]` for any field |
| **Type Coercion** | Maps `""` or `"null"` to `null` | None (returns string / string[]) | Coerces booleans (`true`/`false`), numbers (`Number`) |
| **Quote Stripping** | Slices pair if both start & end with quote | Regex `.replace(/^["']\|["']$/g, "")` | Slices pair if both start & end with quote |
| **Body Slicing** | Caller extracts body separately | Returns remaining markdown `body` | Returns remaining markdown `content` |
| **Line Ending Support** | `\n` only | `\n` only | `\r?\n` (CRLF safe) |

### Verdict
**diverged -- listing all diffs: `src/lib/adr/parser.ts` is a generic key-value parser returning string values without body or array parsing; `src/lib/garden/notesApi.ts` is a domain-specific parser hardcoded exclusively for `title` and `tags` that extracts the markdown body.**

---

## 6. Open Questions

1. **Frontmatter Consolidation Target (`packages/spec-kit` vs `packages/common`):**
   - The planned monorepo package `packages/spec-kit` is slated to house `src/lib/adr/parser.ts` and `notesApi.ts:340`. Because `notesApi.ts` relies on `{ title, tags, body }` and `adr/parser.ts` relies on `Record<string, string | null>`, the consolidated utility should return `{ frontmatter: Record<string, any>; body: string }` with helper accessors or typed schema validation (e.g. via Zod) to satisfy both call sites.
2. **GitHub Route Auth Strategy in Worker:**
   - Lines 2652–2673 expose `tree`, `file`, and `branches` publicly (using worker server-side tokens), shadowing lines 2841, 2850, and 2881. During Phase 2 dead-code removal, confirm whether read-only GitHub access is intended to remain fully unauthenticated or if tenant authentication should eventually guard these routes.
3. **`validateIrDeterministic` Convergence in Worker:**
   - Cloudflare Worker currently bundles an abbreviated 18-line version of `validateIrDeterministic` with error code `DANGLING_REFERENCE`. When migrating to `packages/drakon-ir`, the worker can import the complete canonical validator from `@ai-drakon/drakon-ir` (which uses `DANGLING_POINTER` and includes BFS orphan checks), aligning worker error reporting with the frontend HTSE test suite.
