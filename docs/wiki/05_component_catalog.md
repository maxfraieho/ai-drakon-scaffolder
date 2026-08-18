# 05_component_catalog.md: Каталог компонентів

## 1. Дизайн-система Astryx UI
Дизайн-система Astryx базується на React 18/19 та Tailwind CSS. Візуальна консистентність та адаптивність інтерфейсу забезпечується через використання CSS токенів у `@/styles/astryx.css`.

## 2. Навігаційні компоненти
Навігація платформи складається з компонентів відображення `AstryxHeader.tsx` (верхня панель) та `AstryxSideNav.tsx` (бічна панель).
Для дотримання принципу DRY використовується файл `src/components/astryx/astryx-nav-config.ts` як єдине джерело правди для списку пунктів меню та маршрутів (`/workspace`, `/diagrams`, `/architect`, `/notebooks`, `/pipelines`, `/agents`, `/codegen`).

## 3. Захисний SSR компонент (`ClientOnly.tsx`)
Компонент `src/components/app/ClientOnly.tsx` відіграє роль захисного механізму (SSR Hydration Guard) під час серверного рендерингу TanStack Start. Він відкладає монтування браузерних API до клієнтського етапу.

## 4. Компоненти DrakonEditor
* **Canvas & Monaco Editor**: Використовують browser APIs; `ClientOnly` застосовується там, де компонент його обгортає. Не трактувати каталог як доказ глобального SSR runtime.
* **NewDrakonDialog & FormatInspector**: Декомпозитовані модальні діалоги та тулбари, винесені у `src/components/drakon/`.
