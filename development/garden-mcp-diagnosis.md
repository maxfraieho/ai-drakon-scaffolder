# Garden MCP Worker 502 — Діагноз та виправлення

**Дата:** 2026-06-05
**Статус:** ВИПРАВЛЕНО ✅

## Симптом
`garden-mcp.exodus.pp.ua` повертав 502 на всі запити.

## Діагностика

| Компонент | Стан |
|-----------|------|
| Worker script `garden-mcp-server` | ✅ задеплоєно (v71, 2026-04-25) |
| KV namespace `garden-mcp-kv` | ✅ 52 ключі (zones, proposals, etc.) |
| KV binding в Worker | ✅ `KV` → `3fbc4a87aa36480cb661b2b93fe01aa5` |
| Worker secrets | ✅ JWT_SECRET, NOTEBOOKLM_BASE_URL, SESSION_SECRET |
| DNS `garden-mcp.exodus.pp.ua` | ✅ A record → Cloudflare proxy (104.21.34.159) |
| **Worker Route** | ❌ **ВІДСУТНІЙ** — root cause |

## Root Cause
Worker Route `garden-mcp.exodus.pp.ua/*` → `garden-mcp-server` не існував.
Cloudflare отримував запити але не знав куди роутити → 502.

## Виправлення
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/2b728671b7aebb5ad742bc4e5acd4a9b/workers/routes" \
  -H "Authorization: Bearer <CF_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"pattern":"garden-mcp.exodus.pp.ua/*","script":"garden-mcp-server"}'
# Route ID: 65964620bb374cf1b92a9e46bdee7291
```

## Верифікація
```
curl https://garden-mcp.exodus.pp.ua/health
# {"status":"ok","version":"3.0",...}  HTTP: 200 ✅
```
