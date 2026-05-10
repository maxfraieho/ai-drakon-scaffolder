# Деплой на Cloudflare Pages

## 1) Підготувати збірку

```bash
npm run build:pages
```

Після цього статичний білд буде в:

```text
.lovable/dist/client
```

## 2) Задеплоїти в Cloudflare Pages

```bash
npm run deploy:pages -- --project-name <your-pages-project>
```

Приклад:

```bash
npm run deploy:pages -- --project-name drakon-ui
```

> Якщо ще не залогінені у Cloudflare, спочатку виконайте `npx wrangler login`.

## 3) Налаштування в Cloudflare Pages (якщо деплоїте через Git інтеграцію)

- **Framework preset:** None
- **Build command:** `npm run build:pages`
- **Build output directory:** `.lovable/dist/client`
- **Node version:** 20+

## Важливо

- Це деплой саме фронтенду (статичний output) на Pages.
- Worker-файл `cloudflare-worker/worker-mcp-drakon.js` лишається окремим воркером і не ламається цим сценарієм.