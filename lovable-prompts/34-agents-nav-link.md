# Prompt 34 — Додати навігаційний лінк на Agent Logic Studio (/agents) у WorkspaceShell

## Мета
Додати `/agents` до лівого icon rail та мобільного меню у `WorkspaceShell.tsx`, щоб сторінка "Agent Logic Studio" була доступна з основної навігації.

## Референс
Немає прямого Stitch-референсу для навігаційного елементу. Базуватись на поточній структурі RAIL_TOP у `src/components/workspace/WorkspaceShell.tsx` — додати новий елемент за тим самим патерном що і "Схеми", "Нотатки", "Граф", "GitHub".

**Дизайн-система:** `import/stitch_agent_logic_studio/drakon_logic_system/DESIGN.md`
> Використовувати тільки Tailwind-токени з DESIGN.md. Hex не хардкодити.

> Hover/анімації — зберегти ті самі що в існуючих RAIL_TOP кнопках:
> - Active: `text-[var(--accent-amber)] bg-[var(--accent-dim)]` + amber 2px left bar
> - Hover: `hover:text-[var(--text-secondary)] hover:bg-white/5`
> - Tooltip: `side="right"`, `font-mono text-[11px]`

---

## Файл для зміни
`src/components/workspace/WorkspaceShell.tsx`

---

## Зміни

### 1. Оновити тип RailItem

Поточний тип:
```typescript
type RailItem = {
  to: "/diagrams" | "/docs" | "/sync" | "/github" | "/settings";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
```

Замінити на:
```typescript
type RailItem = {
  to: "/diagrams" | "/docs" | "/sync" | "/github" | "/settings" | "/agents";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
```

### 2. Додати імпорт іконки

До існуючих lucide-react імпортів додати `Cpu`:
```typescript
import {
  Bot,
  Cog,
  Cpu,           // ← нова іконка для /agents
  FileText,
  GitBranch,
  GitMerge,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  Terminal,
} from "lucide-react";
```

### 3. Додати `/agents` до RAIL_TOP

```typescript
const RAIL_TOP: RailItem[] = [
  { to: "/diagrams", label: "Схеми", icon: LayoutDashboard },
  { to: "/docs", label: "Нотатки", icon: FileText },
  { to: "/sync", label: "Граф", icon: GitMerge },
  { to: "/github", label: "GitHub", icon: GitBranch },
  { to: "/agents", label: "Агенти", icon: Cpu },   // ← нова кнопка
];
```

### 4. Оновити getBreadcrumb

```typescript
function getBreadcrumb(pathname: string): { section: string; sub?: string } {
  if (pathname.startsWith("/diagrams")) return { section: "Diagrams" };
  if (pathname.startsWith("/diagram/editor")) return { section: "Diagrams", sub: "Editor" };
  if (pathname.startsWith("/docs")) return { section: "Docs" };
  if (pathname.startsWith("/sync")) return { section: "Sync" };
  if (pathname.startsWith("/github")) return { section: "GitHub" };
  if (pathname.startsWith("/settings")) return { section: "Settings" };
  if (pathname.startsWith("/agents")) return { section: "Agent Logic Studio" };  // ← нова
  return { section: "Workspace" };
}
```

### 5. Мобільне меню — без змін
Мобільне меню вже ітерує `[...RAIL_TOP, ...RAIL_BOTTOM]`, тому новий елемент `/agents` автоматично з'явиться в мобільному Sheet.

---

## Що НЕ чіпати
- Кнопка Bot (AI-агенти) у top bar — залишити як є (відкриває чат-панель)
- `drakonwidget.js`
- `AgentChatPanel`, `AgentStudioPage` та всі компоненти в `components/agents/`
- Логіка теми, логауту
- Всі інші роути та сторінки

---

### make-interfaces checklist (перевір перед фінішем)
- [ ] `active:scale-[0.96] transition-transform duration-75` на новій кнопці Rail
- [ ] Amber active indicator (2px left bar) відображається для `/agents` так само як для інших RAIL_TOP
- [ ] Tooltip `side="right"` з текстом "Агенти"
- [ ] Мобільне меню показує "Агенти" з іконкою Cpu
- [ ] `transition-colors` на hover стані

---

## ВАЖЛИВО: Sync після змін
Після всіх змін скопіюй `src/` до `.lovable/src/` — вони мають бути ідентичні.
CF Pages будує з `.lovable/src/`.
