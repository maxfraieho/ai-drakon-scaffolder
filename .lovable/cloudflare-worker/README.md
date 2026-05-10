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

## Обов'язкові змінні середовища
- `JWT_SECRET`
- `OWNER_USERNAME`
- `OWNER_PASSWORD_HASH`
- `MINIO_ENDPOINT`
- `MINIO_BUCKET`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`

> `OWNER_PASSWORD_HASH` = SHA-256 від (`password + JWT_SECRET`) у hex.

## Як використати
1. Створи новий Worker у Cloudflare.
2. Встав код з `worker-mcp-drakon.js` як основний файл Worker.
3. Додай env vars зі списку вище.
4. Деплой Worker.
5. Надішли мені URL — я одразу підключу фронт/агенти до цього Worker.
