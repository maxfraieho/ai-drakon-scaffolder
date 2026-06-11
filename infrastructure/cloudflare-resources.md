# Cloudflare ресурси AI-DRAKON SaaS

> Створено 2026-06-12 (Sprint 2). Токен доступу — у `~/.env` на dev-сервері
> (192.168.3.184), НЕ в репозиторії.

| Ресурс | Значення |
|---|---|
| Account ID | `c354ea45a11a1e1c14f1f41fe780cb34` |
| D1 database | `ai-drakon-saas` / `743d5bb0-d09d-4dcc-8329-8ebae8d533f4` (EEUR) |
| KV namespace | `SESSION_KV` / `11ed74326f2c431496c2b3dc38ef0208` |
| Схема D1 | `infrastructure/d1/schema.sql` (5 таблиць, застосована 2026-06-12) |

## Сніпет для wrangler.toml воркера

```toml
[[d1_databases]]
binding = "DB"
database_name = "ai-drakon-saas"
database_id = "743d5bb0-d09d-4dcc-8329-8ebae8d533f4"

[[kv_namespaces]]
binding = "SESSION_KV"
id = "11ed74326f2c431496c2b3dc38ef0208"
```

## Корисні команди (з кореня репо на dev-сервері)

```bash
set -a; . ~/.env; set +a   # підтягнути CLOUDFLARE_API_TOKEN
npx wrangler d1 execute ai-drakon-saas --remote --command "SELECT ..." -y
npx wrangler d1 execute ai-drakon-saas --remote --file=infrastructure/d1/schema.sql -y
```
