---
tags:
  - domain:kb
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "Промпт ініціалізації проекту Lovable"
lang: uk
---

# Lovable Init Prompt — AI-DRAKON

> Використовується при створенні нового Lovable-проекту з нуля (до підключення GitHub з реальним кодом).
> Мета: отримати scaffold максимально сумісний з існуючою кодовою базою.

---

Створи стартовий scaffold для проєкту **AI-DRAKON** (без бізнес-логіки, лише загальна структура і пусті шаблони), з такими вимогами:

## Ціль
Підготувати "чистий" каркас, максимально сумісний з існуючим проєктом, щоб потім підв'язати GitHub і запушити актуальний код.

## Стек
- React 18 + Vite 5 + TypeScript
- Tailwind CSS v3
- shadcn/ui (Radix UI)
- TanStack Router v1 + TanStack Query v5
- TanStack Start (SSR wrapper, `@lovable.dev/vite-tanstack-config`)
- react-i18next з локалями uk / en / fr

## Обов'язковий контракт
- `client-config.ts` резолвить: `apiBaseUrl = origin + "/web/api"`, `websocketUrl = origin + "/web/ws"`
- Router: TanStack Router (file-based routes у `src/routes/`)
- **НЕ** додавати `base: "/web/"` у `vite.config.ts` — Lovable керує цим через `@lovable.dev/vite-tanstack-config`
- API/WS заглушки орієнтовані на `/web/api/*` та `/web/ws`

## Що створити (пусті шаблони/каркас)

### `src/routes/` (TanStack Router file-based)
- `__root.tsx` — кореневий layout з `<Outlet />`
- `login.tsx` → LoginPage
- `index.tsx` + `index.index.tsx` → OverviewPage
- `diagrams.tsx` → DiagramsPage (список DRAKON-діаграм)
- `diagram.editor.tsx` → DiagramEditorPage (canvas заглушка)
- `docs.tsx` → DocsPage (нотатки / база знань)
- `settings.tsx` → SettingsPage
- `sync.tsx` → SyncPage (GitHub sync)

### `src/pages/` (компоненти сторінок, імпортуються з routes)
- `LoginPage.tsx`
- `OverviewPage.tsx`
- `DiagramsPage.tsx`
- `DiagramEditorPage.tsx`
- `DocsPage.tsx`
- `SettingsPage.tsx`
- `SyncPage.tsx`
- `NotFound.tsx`

### `src/components/app/`
- `AppLayout.tsx` — sidebar + header + `<Outlet />`
- `InlineError.tsx` — inline error display
- `PageSkeleton.tsx` — loading skeleton
- `LanguageSwitcher.tsx` — uk/en/fr switcher

### `src/context/`
- `AuthContext.tsx` — мінімальний каркас: `isAuthenticated`, `isLoading`, `login()`, `logout()`

### `src/hooks/`
- `use-require-auth.tsx` — redirect до `/login` якщо не авторизований
- `useLocale.ts` — wrapper для react-i18next

### `src/lib/`
- `client-config.ts` — `resolveClientEndpoints(origin)` → `{ apiBaseUrl, websocketUrl }`
- `http.ts` — `httpRequest<TResponse>(url, options)` typed wrapper над fetch
- `api.ts` — typed placeholder функції: `analyzeCode()`, `generateCode()`, `listDiagrams()`, `getDiagram()`, `saveDiagram()`
- `auth.ts` — `getToken()`, `setToken()`, `clearToken()` через localStorage
- `diagram-storage.ts` — заглушка: `loadDiagram(id)`, `saveDiagram(id, ir)`

### `src/types/`
- `api.ts` — базові інтерфейси: `DrakonIR`, `AnalyzeRequest`, `AnalyzeResult`, `GenerateRequest`, `GenerateResult`, `DiagramMeta`
- `drakon.ts` — DRAKON-специфічні типи: `DrakonNode`, `DrakonItem`, `NodeType`

### `src/i18n/locales/`
- `uk.json` — мінімальні ключі (app.title, nav.*, common.*)
- `en.json` — те саме англійською
- `fr.json` — те саме французькою

## Мінімальні i18n ключі (у кожній локалі)
```json
{
  "app.title": "AI-DRAKON",
  "nav.overview": "Огляд",
  "nav.diagrams": "Діаграми",
  "nav.docs": "Нотатки",
  "nav.settings": "Налаштування",
  "nav.sync": "GitHub Sync",
  "common.loading": "Завантаження...",
  "common.error": "Помилка",
  "common.save": "Зберегти",
  "common.cancel": "Скасувати",
  "login.title": "Вхід до AI-DRAKON",
  "login.submit": "Увійти"
}
```

## Важливо
- **Не** додавати бізнес-логіку DRAKON (аналіз коду, IR, агенти)
- **Не** змінювати `index.html`
- **Не** хардкодити кольори — використовувати CSS-змінні shadcn/ui (`hsl(var(--primary))` тощо)
- `vite.config.ts` — лише `@lovable.dev/vite-tanstack-config` без зайвих плагінів
- Все має збиратись як порожній робочий шаблон з маршрутизацією і базовим layout

## Результат
Покажи список створених файлів і коротко підтвердь, що scaffold:
1. Використовує TanStack Router (не react-router-dom)
2. `client-config.ts` резолвить `/web/api` та `/web/ws`
3. Всі routes відповідають файлам у `src/routes/`
4. Проект збирається без помилок TypeScript

---

## Семантичні зв'язки

**Цей документ є частиною:** [[templates/_INDEX]]
**Цей документ пов'язаний з:**
- [[templates/lovable-migration/README]] — Інструкція з міграції Lovable
- [[templates/lovable-migration/lovable-prompts/00-safe-migration-init]] — Промпт ініціалізації безпечної міграції Lovable
**Читати далі:** [[templates/lovable-migration/lovable-prompts/00-handoff]]
