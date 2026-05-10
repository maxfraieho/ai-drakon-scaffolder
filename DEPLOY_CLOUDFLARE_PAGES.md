# Деплой на Cloudflare Pages

## 1) Збірка (як у звичайному GitHub-проєкті)

```bash
npm run build:pages
```

Після цього готова директорія для Pages:

```text
dist
```

## 2) Деплой у Cloudflare Pages

```bash
npm run deploy:pages -- --project-name <your-project-name>
```

## 3) Налаштування Git-based деплою (Cloudflare UI)

- **Build command:** `npm run build:pages`
- **Build output directory:** `dist`
- **Functions directory:** `functions`
- **Node version:** 20+

## Примітка

- Повідомлення `npm notice operation is not supported` у логах — не критична помилка.
- Якщо `functions` не вказати, сайт може відкриватися як порожній/редіректний HTML без SSR-рендеру.