# Lovable Handoff Context — AI-DRAKON

> Цей файл надається Lovable після того, як реальний код запушено в новий repo.
> Він пояснює архітектуру і що НЕ треба чіпати.

---

## Що це за проект

**AI-DRAKON** — IDE-подібна платформа для візуального програмування на мові DRAKON.
Основні можливості:
- Аналіз Python-коду → DRAKON IR (Pipeline A, LangGraph)
- Генерація коду з DRAKON IR → Python/TS/JS (Pipeline B, LangGraph)
- Графічний редактор DRAKON-діаграм (DrakonWidget)
- База знань (Notes, wiki-links, граф)
- GitHub Sync (pull/push діаграм з/до репозиторію)

## Стек (не змінювати без потреби)

- **Runtime:** TanStack Start + TanStack Router (file-based, `src/routes/`)
- **Стан:** TanStack Query v5 + Zustand (store/)
- **UI:** shadcn/ui + Tailwind CSS v3
- **Vite config:** `@lovable.dev/vite-tanstack-config` — нічого додаткового

## Критичні файли — НЕ чіпати

| Файл | Причина |
|------|---------|
| `vite.config.ts` | Керується Lovable через `@lovable.dev/vite-tanstack-config` |
| `src/routeTree.gen.ts` | Авто-генерується TanStack Router — не редагувати вручну |
| `src/lib/client-config.ts` | Визначає `/web/api` та `/web/ws` endpoints |
| `src/types/drakonwidget.d.ts` | Type declarations для зовнішнього DrakonWidget |
| `.github/workflows/mirror-to-ai-drakon.yml` | Mirror workflow — не видаляти |

## API контракт

Всі запити до бекенду через:
- REST: `window.location.origin + "/web/api/*"`
- WebSocket: `ws(s)://origin/web/ws`

Функції в `src/lib/api.ts` + `src/lib/http.ts` — типізований wrapper.

## Агенти (бекенд, не в цьому repo)

| Агент | Порт | Призначення |
|-------|------|-------------|
| drakon-agent | 8765 | Валідація IR, рендеринг |
| architect-agent | 8766 | Pipeline A (код→IR) та B (IR→код) |
| docs-agent | 8767 | Нотатки, граф знань |

Доступ через Cloudflare Worker (`/web/api/*`), не напряму.

## Що можна змінювати

- Компоненти в `src/components/` та `src/pages/`
- Стилі через Tailwind + CSS variables
- Нові routes в `src/routes/` (TanStack Router auto-discovers)
- i18n ключі в `src/i18n/locales/`
- Zustand store в `src/store/`

## Deploy

CF Pages будує з repo `maxfraieho/ai-drakon-setup` (repo A).
Lovable пише в `maxfraieho/drakon-flow-designer` (repo B).
GitHub Action автоматично дзеркалює B → A.
