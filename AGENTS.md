# AI-DRAKON Scaffolder — Agent Rules

## GitNexus: MANDATORY FIRST STEP FOR EVERY TASK

**GitNexus** = knowledge graph of this repo. Accessible at: `https://gitnexus.exodus.pp.ua`

**BEFORE writing, editing, or deleting anything** — query GitNexus. This replaces reading 50+ files manually.

### Repos indexed in GitNexus

| Name | What it contains |
|------|-----------------|
| `ai-drakon-scaffolder` | Frontend (Vite + React + TanStack Router) |
| `exodus-infra` | All protocols, agent rules, scripts |
| `agent-onboarding-kit` | Agent bootstrap templates |
| `garden-seedling-stage` | Garden/GARDEN project |
| `uav-watcher` | Sharon/UAV monitoring |
| `sonate-solidsite` | Sonate Solidaire site |

### Correct GitNexus query (SSE format — REQUIRED headers)

```bash
# Helper function — add to ~/.bashrc:
gn_query() {
  local QUERY="$1"
  local REPO="${2:-ai-drakon-scaffolder}"
  curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"query\",\"arguments\":{\"query\":\"$QUERY\",\"repo\":\"$REPO\"}}}" \
    | grep '^data:' | python3 -c "
import sys,json
for line in sys.stdin:
    d=json.loads(line[5:].strip())
    c=d.get('result',{}).get('content',[{}])
    if c: print(c[0].get('text','')[:3000])
"
}

# Usage examples:
gn_query "AppLayout sidebar navigation"
gn_query "ObservabilityPage SSE logs"
gn_query "AGY3 delegation SSH protocol" "exodus-infra"
gn_query "OpenDesign od-generate form bypass" "exodus-infra"
```

### All GitNexus tool calls

```bash
GN="https://gitnexus.exodus.pp.ua/api/mcp"
GN_HDR='-H "Content-Type: application/json" -H "Accept: application/json, text/event-stream"'

# Parse SSE helper:
gn_parse() { grep '^data:' | python3 -c "import sys,json; [print(json.loads(l[5:]).get('result',{}).get('content',[{}])[0].get('text','')[:3000]) for l in sys.stdin]"; }

# Query (find how something works):
curl -s -X POST $GN -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"query":"SEARCH TERM","repo":"ai-drakon-scaffolder"}}}' | gn_parse

# Context (360-view: who calls, what it calls):
curl -s -X POST $GN -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"context","arguments":{"symbol":"ComponentName","repo":"ai-drakon-scaffolder"}}}' | gn_parse

# Impact before deletion (WHO depends on this?):
curl -s -X POST $GN -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"impact","arguments":{"symbol":"functionName","repo":"ai-drakon-scaffolder"}}}' | gn_parse

# Route map (all page/API routes):
curl -s -X POST $GN -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"route_map","arguments":{"repo":"ai-drakon-scaffolder"}}}' | gn_parse
```

**Rule:** If impact shows 3+ dependents — STOP and check with Claude before proceeding.

Full protocol guide: `exodus-infra/agents/ogy3-tablet/gitnexus-usage.md`

---

## Lovable sync rule

After ANY change in `src/` → always sync:
```bash
cp -r src/ .lovable/src/
```
Cloudflare Pages builds from `.lovable/`, not `src/`. **Missing this = deploy doesn't update.**

For single file:
```bash
cp src/pages/ObservabilityPage.tsx .lovable/src/pages/ObservabilityPage.tsx
```

---

## OpenDesign (UI generation via od-generate.sh)

**Always generate via dev server** — AGY3 doesn't have Docker:

```bash
# Generate component:
ssh vokov@192.168.3.184 "bash ~/bin/od-generate.sh 'COMPONENT DESCRIPTION' /tmp/od-Result.tsx"
# Copy result:
scp vokov@192.168.3.184:/tmp/od-Result.tsx src/components/CATEGORY/Result.tsx
```

Full protocol: `exodus-infra/agents/ogy3-tablet/opendesign.md`

---

## Dev server SSH

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
```

Services restart: `echo '805235io.' | sudo -S rc-service SERVICE restart`

---

## Self-Reflection Rule

AFTER completing a task where you found something NOT in protocols:
1. Query GitNexus: `gn_query "TOPIC" "exodus-infra"` — is it documented?
2. If NOT found: run self-reflect script:
   ```bash
   bash ~/workspace/exodus-infra/agents/ogy3-tablet/self-reflect.sh "topic" "what learned"
   ```

Full protocol: `exodus-infra/workflows/agent-self-reflection.md`

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ai-drakon-scaffolder** (10621 symbols, 14703 relationships, 273 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ai-drakon-scaffolder/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ai-drakon-scaffolder/clusters` | All functional areas |
| `gitnexus://repo/ai-drakon-scaffolder/processes` | All execution flows |
| `gitnexus://repo/ai-drakon-scaffolder/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
