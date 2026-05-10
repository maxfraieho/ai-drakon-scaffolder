# Деплой на Cloudflare Pages

## 1) Підготувати збірку

```bash
npm run build:pages
```

Після цього статичний білд буде в:

```text
.lovable/dist/client
```

## 2) Задеплоїти правильно (SSR через Cloudflare Worker)

```bash
npm run deploy:pages -- --project-name <your-pages-project>
```

Приклад:

```bash
npm run deploy:pages
```

> Якщо ще не залогінені у Cloudflare, спочатку виконайте `npx wrangler login`.

## 3) Чому був 404 на pages.dev

У цього проєкту TanStack Start SSR, і в `.lovable/dist/client` **немає `index.html`** (тільки assets).  
Тому деплой як суто статичного Pages-сайту (`wrangler pages deploy .lovable/dist/client`) успішно заливає файли, але на `/` дає 404.

Правильний сценарій: деплоїти згенерований Worker-конфіг з `dist/server/wrangler.json`, який підхоплює і SSR, і assets.

## 4) Якщо потрібен саме Git-based деплой у Pages UI

- Для цього проєкту не рекомендується, бо він SSR.
- Краще деплоїти через CLI команду `npm run deploy:pages` (вона вже налаштована правильно).

## Важливо

- `cloudflare-worker/worker-mcp-drakon.js` лишається окремим воркером і не ламається цим сценарієм.