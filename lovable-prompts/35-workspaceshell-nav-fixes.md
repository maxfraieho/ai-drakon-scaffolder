# Prompt 35 — WorkspaceShell: навігаційні виправлення (P0 + breadcrumb + /agents)

## Мета
Виправити 6 UX-проблем навігації у `WorkspaceShell.tsx`: правильні назви та іконки, розведення двох "агентів", підтвердження логауту, клікабельний breadcrumb, та додати `/agents` до rail.

## Референс
Немає нового Stitch-файлу. Всі зміни — виключно в межах поточного дизайн-токена.
**Дизайн-система:** `import/stitch_agent_logic_studio/drakon_logic_system/DESIGN.md`
> Використовувати тільки Tailwind-токени. Hex не хардкодити.

---

## Файл для зміни
`src/components/workspace/WorkspaceShell.tsx`

---

## Зміни — точний список

### 1. Оновити імпорти lucide-react
```typescript
import {
  Bot,
  Cog,
  Cpu,           // ← НОВИЙ (для /agents)
  FileText,
  GitBranch,
  GitCompare,    // ← ЗАМІНЮЄ GitMerge (точніше для Code↔Diagram Sync)
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  Terminal,
} from "lucide-react";
```
Видалити `GitMerge` з імпортів.

### 2. Додати імпорт AlertDialog
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
```

### 3. Оновити тип RailItem
```typescript
type RailItem = {
  to: "/diagrams" | "/docs" | "/sync" | "/github" | "/settings" | "/agents";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
```

### 4. Оновити RAIL_TOP
```typescript
const RAIL_TOP: RailItem[] = [
  { to: "/diagrams", label: "Схеми",   icon: LayoutDashboard },
  { to: "/docs",     label: "Нотатки", icon: FileText },
  { to: "/sync",     label: "Sync",    icon: GitCompare },   // було: "Граф" + GitMerge
  { to: "/github",   label: "GitHub",  icon: GitBranch },
  { to: "/agents",   label: "Агенти",  icon: Cpu },          // НОВИЙ
];
```

### 5. Оновити getBreadcrumb — додати sectionPath
```typescript
function getBreadcrumb(pathname: string): {
  section: string;
  sectionPath: string;
  sub?: string;
} {
  if (pathname.startsWith("/diagram/editor"))
    return { section: "Diagrams", sectionPath: "/diagrams", sub: "Editor" };
  if (pathname.startsWith("/diagrams"))
    return { section: "Diagrams", sectionPath: "/diagrams" };
  if (pathname.startsWith("/docs"))
    return { section: "Нотатки", sectionPath: "/docs" };
  if (pathname.startsWith("/sync"))
    return { section: "Sync", sectionPath: "/sync" };
  if (pathname.startsWith("/github"))
    return { section: "GitHub", sectionPath: "/github" };
  if (pathname.startsWith("/settings"))
    return { section: "Settings", sectionPath: "/settings" };
  if (pathname.startsWith("/agents"))
    return { section: "Агенти", sectionPath: "/agents" };
  return { section: "Workspace", sectionPath: "/" };
}
```

### 6. Breadcrumb — зробити клікабельним
Замінити поточний статичний breadcrumb:
```tsx
{/* БУЛО: */}
<span className="text-[var(--text-secondary)]">{crumb.section}</span>

{/* СТАЛО: */}
<Link
  to={crumb.sectionPath}
  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
>
  {crumb.section}
</Link>
```
Підрядок `sub` (наприклад "Editor") лишити статичним текстом — він без посилання.

### 7. Tooltip для Bot-кнопки — уточнити
Tooltip тексту змінити: `"AI-агенти"` → `"Чат з агентом"`:
```tsx
<TooltipContent side="bottom" className="font-mono text-[11px]">
  Чат з агентом
</TooltipContent>
```
`aria-label` кнопки: `"Чат з агентом"`

### 8. Logout — AlertDialog з підтвердженням
Замінити `<button onClick={logout}>` на AlertDialog:
```tsx
<AlertDialog>
  <Tooltip delayDuration={300}>
    <TooltipTrigger asChild>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label="Вийти"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </AlertDialogTrigger>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="font-mono text-[11px]">
      Вийти
    </TooltipContent>
  </Tooltip>
  <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] font-mono">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-[var(--text-primary)] font-mono text-[13px] font-semibold uppercase tracking-wider">
        Вийти з системи?
      </AlertDialogTitle>
      <AlertDialogDescription className="text-[var(--text-muted)] text-[12px]">
        JWT-токен буде видалено. Потрібно буде увійти знову.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel className="font-mono text-[11px] uppercase tracking-wider bg-transparent border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5">
        Скасувати
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={logout}
        className="font-mono text-[11px] uppercase tracking-wider bg-[var(--color-primary-container,#f59e0b)] text-[#2a1700] hover:brightness-110"
      >
        Вийти
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Що НЕ чіпати
- `drakonwidget.js`
- `AgentChatPanel` — Sheet з чатом лишається незмінним
- `AgentStudioPage` та всі компоненти в `components/agents/`
- RAIL_BOTTOM (`/settings`) — лишити як є
- Mobile Sheet nav — вже ітерує `[...RAIL_TOP, ...RAIL_BOTTOM]`, автоматично підхопить зміни

---

### make-interfaces checklist
- [ ] `active:scale-[0.96] transition-transform duration-75` на кнопці Logout у AlertDialog
- [ ] Amber bar (`h-5 w-[2px]`) відображається для `/agents` та `Sync` в rail
- [ ] Tooltip `side="right"` для rail-кнопок, `side="bottom"` для top-bar кнопок
- [ ] Link breadcrumb має `transition-colors duration-150`
- [ ] Hit area кнопки Logout ≥ 24px (вже є `h-6 w-6`)

---

## ВАЖЛИВО: Sync після змін
Після всіх змін скопіюй `src/` до `.lovable/src/` — вони мають бути ідентичні.
CF Pages будує з `.lovable/src/`.
