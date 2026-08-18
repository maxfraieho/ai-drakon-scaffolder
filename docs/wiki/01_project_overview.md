# 01_project_overview.md: AI-DRAKON Scaffolder

## 1. Опис призначення проекту

**AI-DRAKON Scaffolder** — це веб-застосунок візуального редактора логіки та блок-схем на базі алгоритмічної мови ДРАКОН. Проект призначений для розгортання на платформі Cloudflare Pages із використанням Cloudflare Worker Proxy та сервісів Appwrite. Він поєднує інструменти для побудови візуальної логіки, керування інфраструктурою та генерації коду з використанням дизайн-системи Astryx.

## 2. Бізнес-домен та ключові фічі

Проект охоплює домен розробки програмного забезпечення, візуального програмування та архітектурного планування. Основні функціональні можливості включають:
* **Візуальний редактор ДРАКОН**: Потужний редактор `DrakonEditor.tsx`, що використовує HTML5 Canvas для рендерингу логічних схем та палітри елементів.
* **Колаборація в реальному часі**: Синхронізація стану та спільна робота користувачів за допомогою Yjs та WebRTC.
* **Інтегроване середовище розробки**: Вбудований редактор коду Monaco Editor для написання або перегляду згенерованого коду.
* **Багатомодульна робоча область**: Підтримка різних маршрутів та інструментів: робочі простори (`/workspace`), діаграми (`/diagrams`), архітектурні інструменти (`/architect`), блокноти (`/notebooks`), пайплайни (`/pipelines`), агенти (`/agents`) та кодогенерація (`/codegen`).

## 3. Технологічний стек

Проект побудований на сучасному стеку технологій, що забезпечує високу продуктивність, SSR (серверний рендеринг) та безпеку:
* **Frontend**: React 18/19.
* **Роутинг**: TanStack Router; committed frontend contract не підтверджує TanStack Start SSR як runtime.
* **UI Framework**: Дизайн-система Astryx Design System у поєднанні з Tailwind CSS.
* **Backend та Авторизація**: Appwrite Cloud (Auth/Functions).
* **API Gateway / Proxy**: Cloudflare Worker (компонент `drakon-antigravity-worker`).
* **Управління станом та синхронізація**: Yjs (WebRTC).
* **Хостинг та збірка**: Cloudflare Pages (збірка через `npm --prefix .lovable run build`).

## 4. Архітектурні принципи та правила безпеки

* **SSR Hydration Guard (ClientOnly)**: Для компоненти, що звертаються до `window`, `document` або DOM Canvas API (Monaco Editor, Yjs, DrakonEditor), використовується компонент захисту SSR-потоку `ClientOnly.tsx` (`src/components/app/ClientOnly.tsx`).
* **Синхронізація Staging-середовища (`.lovable/src/`)**: Cloudflare Pages налаштовано на збірку з `.lovable/`. Будь-які зміни в `src/` або `package.json` синхронізуються через `rsync -av --delete src/ .lovable/src/` перед комітом.
* **Централізація Навігації**: Навігація централізована у `src/components/astryx/astryx-nav-config.ts` (DRY принцип для `AstryxHeader` та `AstryxSideNav`).
