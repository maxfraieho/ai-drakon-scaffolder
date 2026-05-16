# Prompt 36 — Command Palette (⌘K / Ctrl+K)

## Мета
Додати глобальну command palette, що відкривається по `⌘K` / `Ctrl+K` — навігація між сторінками, toggle теми, швидкий пошук.

## Референс
Немає Stitch-файлу. Використовувати shadcn `Command` + `CommandDialog` (вже є у `src/components/ui/command.tsx`).
**Дизайн-система:** `import/stitch_agent_logic_studio/drakon_logic_system/DESIGN.md`
> Використовувати тільки Tailwind-токени. Hex не хардкодити.

---

## Новий файл: `src/components/workspace/CommandPalette.tsx`

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, GitCompare, GitBranch, Cog, Cpu, Moon, Sun, LogOut,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { label: "Схеми",   to: "/diagrams", icon: LayoutDashboard, shortcut: "G D" },
  { label: "Нотатки", to: "/docs",     icon: FileText,        shortcut: "G N" },
  { label: "Sync",    to: "/sync",     icon: GitCompare,      shortcut: "G S" },
  { label: "GitHub",  to: "/github",   icon: GitBranch,       shortcut: "G H" },
  { label: "Агенти",  to: "/agents",   icon: Cpu,             shortcut: "G A" },
  { label: "Налаштування", to: "/settings", icon: Cog,        shortcut: "G ," },
] as const;

export function CommandPalette({
  open, onOpenChange, theme, onToggleTheme, onLogout,
}: CommandPaletteProps) {
  const navigate = useNavigate();

  const runNav = (to: string) => {
    navigate({ to: to as "/diagrams" });
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Перейти до… або пошук дій"
        className="font-mono text-[12px]"
      />
      <CommandList>
        <CommandEmpty className="font-mono text-[11px] text-[var(--text-muted)] py-6 text-center">
          Нічого не знайдено
        </CommandEmpty>

        <CommandGroup heading="Навігація">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.to}
                value={item.label}
                onSelect={() => runNav(item.to)}
                className="font-mono text-[12px] gap-2"
              >
                <Icon className="h-4 w-4 text-[var(--text-muted)]" />
                <span>{item.label}</span>
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Дії">
          <CommandItem
            value="тема toggle"
            onSelect={() => { onToggleTheme(); onOpenChange(false); }}
            className="font-mono text-[12px] gap-2"
          >
            {theme === "dark"
              ? <Sun className="h-4 w-4 text-[var(--text-muted)]" />
              : <Moon className="h-4 w-4 text-[var(--text-muted)]" />
            }
            <span>{theme === "dark" ? "Увімкнути світлу тему" : "Увімкнути темну тему"}</span>
          </CommandItem>
          <CommandItem
            value="logout вийти"
            onSelect={() => { onLogout(); onOpenChange(false); }}
            className="font-mono text-[12px] gap-2 text-[#ffb4ab]"
          >
            <LogOut className="h-4 w-4" />
            <span>Вийти з системи</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

---

## Зміни у `src/components/workspace/WorkspaceShell.tsx`

### 1. Додати імпорт
```typescript
import { CommandPalette } from "@/components/workspace/CommandPalette";
```

### 2. Додати state
```typescript
const [cmdOpen, setCmdOpen] = useState(false);
```

### 3. Додати ⌘K useEffect (після існуючих useEffect)
```typescript
useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCmdOpen((v) => !v);
    }
  };
  document.addEventListener("keydown", down);
  return () => document.removeEventListener("keydown", down);
}, []);
```

### 4. Додати `<CommandPalette>` у JSX (перед закриваючим `</div>` кореневого елементу)
```tsx
<CommandPalette
  open={cmdOpen}
  onOpenChange={setCmdOpen}
  theme={theme}
  onToggleTheme={toggleTheme}
  onLogout={logout}
/>
```

### 5. Додати tooltip/shortcut hint до top-bar (опціонально але рекомендовано)
Додати маленький hint у top-bar поряд із breadcrumb — щоб користувач знав про palette:
```tsx
<button
  type="button"
  onClick={() => setCmdOpen(true)}
  className="hidden md:inline-flex items-center gap-1.5 h-5 px-2 rounded border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors ml-2"
>
  <span>⌘K</span>
</button>
```
Вставити одразу після breadcrumb `<div>` у top-bar, до `ml-auto`.

---

## Що НЕ чіпати
- `drakonwidget.js`
- Всі існуючі rail-кнопки та sheet-и
- `AgentChatPanel`

---

### make-interfaces checklist
- [ ] `CommandDialog` відкривається/закривається з анімацією (вже є в shadcn)
- [ ] `CommandItem` hover: `bg-[var(--accent-dim)]`
- [ ] `CommandShortcut` текст — tabular-nums, правий вирівн
- [ ] ⌘K hint button у top-bar `≥20px` height
- [ ] `transition-colors` на hint button

---

## ВАЖЛИВО: Sync після змін
Скопіюй `src/` до `.lovable/src/`.
