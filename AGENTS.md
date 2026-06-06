# AI-DRAKON Scaffolder — Agent Rules

## GitNexus: MANDATORY before coding

GitNexus is the code knowledge graph for this repo. You MUST query it before:
- Writing or modifying any component
- Deleting any file or function
- Planning new features

**URLs:**
- Network (AGY3): `https://gitnexus.exodus.pp.ua/api/mcp`
- Local (dev server): `http://192.168.3.184:4747/api/mcp`

### Quick usage (JSON-RPC 2.0)

```bash
# Find where a symbol is used:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"repo":"ai-drakon-scaffolder","q":"SYMBOL_OR_COMPONENT_NAME"}}}'

# Get file context before editing:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"context","arguments":{"repo":"ai-drakon-scaffolder","path":"src/components/SomeFile.tsx"}}}'

# API route map:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"route_map","arguments":{"repo":"ai-drakon-scaffolder"}}}'

# Impact analysis before deletion:
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"impact","arguments":{"repo":"ai-drakon-scaffolder","symbol":"functionOrClassName"}}}'
```

**Rule:** If impact shows 3+ dependents — STOP and check with Claude before proceeding.

Full guide: `~/workspace/exodus-infra/agents/ogy3-tablet/gitnexus-usage.md` (on AGY3)
Or on dev server: `/home/vokov/projects/exodus-infra/agents/ogy3-tablet/gitnexus-usage.md`

---

## Lovable sync rule

After any change in `src/` → always sync:
```bash
cp -r src/ .lovable/src/
```
Cloudflare Pages builds from `.lovable/`, not `src/`.

---

## OpenDesign (UI generation)

Server: `http://192.168.3.184:7460` (no auth needed, nginx auto-injects token)
Plugin: `ai-drakon-mobile`, Agent: `antigravity`

```bash
curl -s -X POST http://192.168.3.184:7460/api/runs \
  -H "Content-Type: application/json" \
  -d '{"message":"Describe component here","pluginId":"ai-drakon-mobile","agentId":"antigravity"}'
```

Full guide: `~/workspace/exodus-infra/agents/ogy3-tablet/opendesign.md`

---

## Dev server SSH

```
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
```

Services restart: `echo '805235io.' | sudo -S rc-service SERVICE restart`
