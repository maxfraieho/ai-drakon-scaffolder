# Cloudflare Worker (DRAKON MCP)

Окрема папка для деплою **нового мінімального Worker** під ваш MCP DRAKON-сервіс.

## Що всередині
- `worker-mcp-drakon.js` — повний Worker з нуля (Vanilla JS):
  - owner JWT auth (`/auth/login`, `Authorization: Bearer ...`)
  - MinIO S3 SigV4 (`upload/get/list/delete`)
  - REST ендпоінти схем (`/v1/drakon/...`)
  - MCP JSON-RPC (`POST /mcp`) з tools/list + tools/call

## Ендпоінти
- `GET /health`
- `POST /auth/login`
- `POST /v1/drakon/commit`
- `GET /v1/drakon/:folderSlug/:diagramId`
- `DELETE /v1/drakon/:folderSlug/:diagramId`
- `GET /v1/drakon/:folderSlug`
- `POST /mcp`

## MCP tools
- `drakon.list_diagrams`
- `drakon.get_diagram`
- `drakon.save_diagram`
- `drakon.delete_diagram`
- `drakon.validateir`

## Обов'язкові змінні середовища
- `JWT_SECRET` (Secret)
- `OWNER_USERNAME` (Var, optional if default owner)
- `OWNER_PASSWORD_HASH` (Var)
- `MINIO_ENDPOINT`
- `MINIO_BUCKET`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MCP_API_KEY` (Secret, для Claude.ai Dashboard)

> `OWNER_PASSWORD_HASH` = SHA-256 від (`password + JWT_SECRET`) у hex.

## Як використати
1. Створи новий Worker у Cloudflare.
2. Встав код з `worker-mcp-drakon.js` як основний файл Worker.
3. Додай env vars зі списку вище.
4. Деплой Worker.
5. Надішли мені URL — я одразу підключу фронт/агенти до цього Worker.

## Setup для Claude.ai Dashboard

### 1. Задеплой Worker
`wrangler deploy`

### 2. Встанови secrets
`wrangler secret put JWT_SECRET`
`wrangler secret put ADMIN_PASSWORD`
`wrangler secret put MCP_API_KEY`

Значення MCP_API_KEY — будь-який довгий рядок (мінімум 32 символи).
Наприклад: `openssl rand -hex 32`

### 3. Задай vars у Cloudflare Dashboard
Workers → drakon-mcp-worker → Settings → Variables and Secrets:
- MINIO_ENDPOINT = https://your-minio-host
- MINIO_BUCKET = your-bucket-name
- MINIO_ACCESS_KEY = your-access-key
- MINIO_SECRET_KEY = your-secret-key (як Secret, не як var)
- MINIO_USE_SSL = true

### 4. Перевір worker
`curl https://your-worker.workers.dev/health`

### 5. Підключи до Claude.ai Dashboard
claude.ai → Settings → Integrations → Add MCP Server:
- Server URL: https://your-worker.workers.dev/mcp
- Authentication: Bearer Token
- Token: значення MCP_API_KEY яке ти задав

### 6. Перевір tools у Claude.ai
В чаті з Claude напиши: "List my available MCP tools"
Має показати 5 tools: drakon.list_diagrams, drakon.get_diagram,
drakon.save_diagram, drakon.delete_diagram, drakon.validateir

## Environment Variables Reference

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| JWT_SECRET | Secret | Yes | For frontend auth |
| ADMIN_PASSWORD | Secret | Yes | Login password |
| MCP_API_KEY | Secret | Yes | Static key for Claude.ai |
| MINIO_ENDPOINT | Var | Yes | S3/MinIO endpoint URL |
| MINIO_BUCKET | Var | Yes | Bucket name |
| MINIO_ACCESS_KEY | Var | Yes | S3 access key |
| MINIO_SECRET_KEY | Secret | Yes | S3 secret key |
| MINIO_USE_SSL | Var | No | "true" або "false" (default: "true") |
