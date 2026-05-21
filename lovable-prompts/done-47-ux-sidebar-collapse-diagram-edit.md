# Lovable Prompt 47 — UX: Collapsible Sidebar + Diagram Edit Button + Fix Red Screen

## Проблеми які вирішуємо

1. Лівий сайдбар (RAIL з іконками) не має collapse — завжди видимий
2. На DiagramsPage — вибрана схема показується але немає кнопки "Редагувати" прямо на канвасі
3. Деякі схеми відкриваються з червоним екраном (помилка DrakonViewer)
4. Вкладки "Explorer / History" в режимі діаграм зайві

---

## Крок 1: Collapsible лівий сайдбар в `WorkspaceShell.tsx`

Додай стан `sidebarOpen` (default: `true`) і кнопку-тогл.

В компоненті WorkspaceShell знайди RAIL (лівий стовпчик з іконками навігації) і обгорни всю ліву панель:

```tsx
const [sidebarOpen, setSidebarOpen] = useState(true);
```

Кнопка тоглу — прибита до верхнього лівого краю, завжди видима:
```tsx
<button
  type="button"
  onClick={() => setSidebarOpen(v => !v)}
  className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex h-8 w-5 items-center justify-center rounded-r-sm border border-l-0 border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--accent-amber)] transition-colors"
  title={sidebarOpen ? 'Згорнути панель' : 'Розгорнути панель'}
>
  {sidebarOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
</button>
```

Лівий RAIL:
```tsx
<aside className={cn(
  "flex flex-col shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all duration-200 overflow-hidden",
  sidebarOpen ? "w-[40px]" : "w-0 border-0"
)}>
  {/* існуючий вміст RAIL */}
</aside>
```

Додай імпорти: `ChevronLeft`, `ChevronRight` з `lucide-react`.

---

## Крок 2: Кнопка "Редагувати" прямо на канвасі в `DiagramsPage.tsx`

В місці де рендериться `<DrakonViewer>` — додай overlay кнопку зверху праворуч:

```tsx
{selectedDiagram ? (
  <div className="relative h-full">
    <DrakonViewer
      key={selectedDiagram.id}
      diagram={selectedDiagram.diagram as unknown as import("@/types/drakonwidget").DrakonDiagram}
      diagramId={selectedDiagram.id}
      height={9999}
      className="h-full"
    />
    {/* Edit overlay button */}
    {!currentDiagramIsIr && (
      <button
        type="button"
        onClick={() => openInEditor(selectedDiagram)}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-sm bg-[var(--accent-amber)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-black hover:brightness-110 transition-all shadow-lg"
      >
        <Pencil className="h-3 w-3" /> Редагувати
      </button>
    )}
  </div>
) : (
  /* existing empty state */
)}
```

Додай імпорт `Pencil` з `lucide-react`.

---

## Крок 3: Error boundary для DrakonViewer (червоний екран)

В `src/pages/DiagramsPage.tsx` або окремому файлі — обгорни `<DrakonViewer>` в ErrorBoundary:

```tsx
import { Component, type ReactNode } from 'react';

class DiagramErrorBoundary extends Component<
  { children: ReactNode; diagramId: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; diagramId: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--bg-base)] font-mono">
          <div className="text-red-400 text-[11px] uppercase tracking-wider">⚠ Помилка рендерингу схеми</div>
          <div className="text-[var(--text-muted)] text-[10px] max-w-xs text-center">
            {this.state.error?.message || 'Невідома помилка'}
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 rounded-sm border border-[var(--border-subtle)] px-3 py-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Спробувати знову
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Використання:
```tsx
<DiagramErrorBoundary diagramId={selectedDiagram.id}>
  <DrakonViewer ... />
</DiagramErrorBoundary>
```

---

## Крок 4: Прибрати зайві вкладки Explorer/History з DiagramsPage

В `DiagramsLeftPanel.tsx` або в `DiagramsPage.tsx` — знайди tabs/вкладки "Explorer" і "History" і видали їх повністю. Залиш тільки список папок і схем.

---

## Важливо
- Не чіпати `DrakonViewer`, `CodeAnalysisPanel`, `CodeGenerationPanel`
- Не змінювати `client-config.ts`, `routeTree.gen.ts`
- `currentDiagramIsIr` — вже є в DiagramsPage як булева змінна
- `openInEditor(d)` — вже існує як функція в DiagramsPage
