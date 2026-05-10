# DRAKON Editor export for Lovable

Цей пакет містить готовий редактор DRAKON на `drakonwidget.js` + переглядач + псевдокод-експорт через `drakongen.js`.

## Що всередині

- `src/components/DrakonEditor.tsx` — повний редактор
- `src/components/DrakonViewer.tsx` — read-only viewer
- `src/components/FormatInspector.tsx` — форматування вузлів
- `src/lib/drakon/*` — адаптер/теми/i18n/pseudocode/types
- `src/hooks/useDrakonDiagram.ts` — читання/збереження схем
- `src/types/drakonwidget.d.ts` — TS-типи API віджета
- `src/assets/drakon/*` — іконки DRAKON
- `public/libs/drakonwidget.js` — бібліотека редактора
- `public/libs/drakongen.js` — генерація псевдокоду
- `src/styles/drakon.css` — обов'язкова CSS-ізоляція контейнера

## Кроки інтеграції в Lovable

### 1) Скопіюй файли

Скопіюй в цільовий проект:
- `export/drakonred/src/**` -> `src/**`
- `export/drakonred/public/libs/**` -> `public/libs/**`

> Важливо: шляхи `'/libs/drakonwidget.js'` і `'/libs/drakongen.js'` мають існувати в `public/libs/`.

### 2) Додай CSS для контейнера

Імпортуй `src/styles/drakon.css` у свій глобальний CSS або встав блок у `src/index.css`.

### 3) Перевір залежності

Якщо у проекті їх нема, додай (Bun):

```bash
bun add @tanstack/react-query lucide-react clsx tailwind-merge
```

UI-компоненти (`button`, `dialog`, `tooltip`, `scroll-area`, `switch`, `collapsible`, `select`, `input`, `label`, `badge`) мають бути у `src/components/ui/*` (shadcn).

### 4) Підключи сторінку редактора

Мінімальний приклад:

```tsx
import { DrakonEditor } from '@/components/DrakonEditor';

export default function DrakonRoute() {
  return (
    <div className="p-4">
      <DrakonEditor
        diagramId="my-diagram"
        folderSlug="my-folder"
        isNew={false}
        height={640}
      />
    </div>
  );
}
```

### 5) Налаштуй збереження (важливо)

`useDrakonDiagram.ts` зараз використовує проектний MCP-клієнт:
- `commitDrakonDiagram`
- `deleteDrakonDiagram`

Якщо в новому проекті інший бекенд, заміни ці виклики у `src/hooks/useDrakonDiagram.ts` на свій API.

## Типові проблеми

- **Білий екран у редакторі**: перевір, що `public/libs/drakonwidget.js` існує.
- **Не працює псевдокод-експорт**: перевір `public/libs/drakongen.js`.
- **Зламані стилі віджета**: перевір, що підключено `drakon.css`.
- **Не зберігає схеми**: адаптуй `useDrakonDiagram.ts` під свій API.

## Швидка перевірка після переносу

1. Відкрий сторінку редактора
2. Додай `action`-вузол
3. Натисни Save
4. Експортуй JSON + PNG + Pseudocode

Якщо всі 4 кроки працюють — інтеграція завершена.
