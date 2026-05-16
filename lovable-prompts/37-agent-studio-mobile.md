# Prompt 37 — Mobile-responsive layout for Agent Logic Studio (/agents)

## Мета
Зробити AgentStudioPage адаптивним: на мобільних пристроях (< md = 768px) ліва панель прихована за кнопкою-гамбургером. На десктопі поведінка не змінюється.

## Дизайн-система
`import/stitch_agent_logic_studio/drakon_logic_system/DESIGN.md` — тільки Tailwind-токени з DESIGN.md. Hex не хардкодити.

---

## Файли для зміни

### 1. `src/pages/AgentStudioPage.tsx`

#### 1а. Додати `sidebarOpen` стан:
```typescript
const [sidebarOpen, setSidebarOpen] = useState(false);
```

#### 1б. Header: додати кнопку-гамбургер (тільки mobile, `md:hidden`):

В рядку `<div className="flex h-full items-center gap-6">` ПЕРЕД `<span className="font-headline-sm ...">⚙ АГЕНТНА ЛОГІКА</span>` — вставити:
```tsx
<button
  onClick={() => setSidebarOpen((v) => !v)}
  className="flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] md:hidden"
  aria-label="Toggle sidebar"
>
  <span className="material-symbols-outlined text-[20px]">menu</span>
</button>
```

#### 1в. Body — overlay sidebar pattern:

Замінити:
```tsx
<div className="flex flex-1 overflow-hidden">
  <AgentSidebar ... />
  <main ...>
```

На:
```tsx
<div className="relative flex flex-1 overflow-hidden">
  {/* Mobile overlay backdrop */}
  {sidebarOpen && (
    <div
      className="absolute inset-0 z-30 bg-black/40 md:hidden"
      onClick={() => setSidebarOpen(false)}
    />
  )}

  <AgentSidebar
    pipelines={PIPELINES}
    kbFiles={KB_FILES}
    selectedPipeline={selectedPipeline}
    selectedNode={selectedNode}
    onSelectPipeline={handleSelectPipeline}
    onSelectNode={setSelectedNode}
    onSelectKbFile={(f) => {
      setSelectedKbFile(f);
      setKbOpen(true);
    }}
    open={sidebarOpen}
    onClose={() => setSidebarOpen(false)}
  />

  <main className="relative flex flex-1 flex-col overflow-hidden">
```

#### 1г. Передати `open` і `onClose` в AgentSidebar — оновити Props:

AgentSidebar тепер отримує два додаткових пропси:
- `open: boolean` — чи відкрита панель на мобільному
- `onClose: () => void` — закрити після вибору (UX)

### 2. `src/components/agents/AgentSidebar.tsx`

#### 2а. Оновити Props interface:
```typescript
interface Props {
  pipelines: AgentPipeline[];
  kbFiles: KbFile[];
  selectedPipeline: AgentPipeline;
  selectedNode: AgentNode | null;
  onSelectPipeline: (p: AgentPipeline) => void;
  onSelectNode: (n: AgentNode) => void;
  onSelectKbFile: (f: KbFile) => void;
  open?: boolean;      // ← нові
  onClose?: () => void; // ← нові
}
```

#### 2б. Змінити root className — мобільний overlay:

Замінити:
```tsx
<nav className="flex h-full w-[220px] shrink-0 flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface)]">
```

На:
```tsx
<nav className={cn(
  "flex h-full w-[220px] shrink-0 flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface)] transition-transform duration-200",
  // Desktop: always visible
  "md:relative md:translate-x-0",
  // Mobile: overlay, slides in/out
  "absolute inset-y-0 left-0 z-40",
  open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
)}>
```

#### 2в. Закривати при виборі пайплайну/вузла на мобільному:

В `onSelectPipeline` і `onSelectNode` кнопках — після виклику відповідного handler додати `onClose?.()`:

```tsx
// Pipeline button onClick:
onClick={() => {
  onSelectPipeline(p);
  onClose?.();
}}

// Node button onClick:
onClick={() => {
  onSelectNode(n);
  onClose?.();
}}
```

> **KB файли — не закривати** (відкривають Drawer, нехай sidebar залишається видимою доки backdrop не закрив).

---

## Що НЕ чіпати
- `PipelineGraph`, `NodeCard`, `NodeInspector`, `KbDrawer` — без змін
- Desktop layout (md+) — має виглядати ідентично поточному
- Логіку вибору агентів/вузлів/пайплайнів — не чіпати
- WorkspaceShell — не чіпати

---

## Checklist (перевір перед фінішем)
- [ ] На мобільному (viewport < 768px) sidebar прихований за замовчуванням
- [ ] Кнопка ☰ в header (тільки мобільна) — відкриває/закриває sidebar
- [ ] Backdrop (темний напівпрозорий шар) закриває sidebar при натисканні
- [ ] При виборі пайплайну або вузла — sidebar автоматично закривається
- [ ] На десктопі (md+) sidebar завжди видимий, кнопка ☰ прихована
- [ ] Transition `duration-200` плавний slide-in/out
- [ ] `z-40` sidebar > `z-30` backdrop > main content

## ВАЖЛИВО: Sync після змін
Після всіх змін скопіюй `src/` до `.lovable/src/` — вони мають бути ідентичні.
