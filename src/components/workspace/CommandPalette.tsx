import { useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, FileCode, Cog, Cpu, Moon, Sun, LogOut, Activity, GitBranch, Layers, Workflow,
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
  { label: "Pipelines", to: "/pipelines", icon: Workflow, shortcut: "G P" },
  { label: "Схеми", to: "/diagrams", icon: LayoutDashboard, shortcut: "G D" },
  { label: "Документація", to: "/docs", icon: FileText, shortcut: "G N" },
  { label: "Код", to: "/code", icon: FileCode, shortcut: "G C" },
  { label: "Architect", to: "/architect", icon: Layers, shortcut: "G R" },
  { label: "GitHub", to: "/github", icon: GitBranch, shortcut: "G H" },
  { label: "Observability", to: "/observability", icon: Activity, shortcut: "G O" },
  { label: "Sync", to: "/sync", icon: Activity, shortcut: "G Y" },
  { label: "Workspace", to: "/workspace", icon: Layers, shortcut: "G W" },
  { label: "Агенти", to: "/agents", icon: Cpu, shortcut: "G A" },
  { label: "Налаштування", to: "/settings", icon: Cog, shortcut: "G ," },
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
className="font-mono text-[12px] gap-2 text-[var(--accent-red,#ffb4ab)]"
>
<LogOut className="h-4 w-4" />
<span>Вийти з системи</span>
</CommandItem>
</CommandGroup>
</CommandList>
</CommandDialog>
);
}

