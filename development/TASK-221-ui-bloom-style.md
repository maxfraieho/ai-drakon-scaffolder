# TASK-221: UI Polish — привести DRAKON workspace до Bloom-стилю

**Run locally on AGY3 (Termux). Repo: `/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/`**

---

## Контекст

Bloom (bloom.aidrakon.tech) має чистий, просторий UI:
- Великі заголовки з описом під ними (16-18px sans-serif)
- Картки з `rounded-2xl`, padding, teal border on focus
- Sidebar читабельний, не IDE-clone

AI-DRAKON зараз — IDE-clone стиль:
- Весь sidebar: `font-mono text-[10px]` / `text-[11px]` / `text-[9px]` — надто дрібно
- Фон: `#111318` — мертво чорний
- Сторінки: немає proper page header з title+description
- Діалоги: мінімалістичні без spacing

**Ціль**: зберегти DRAKON функціонал, але зробити UI теплішим і читабельнішим як у Bloom.

---

## Частина 1: `src/components/workspace/WorkspaceShell.tsx`

### 1a. Nav items (L112-134) — збільш шрифт, прибери mono

Замінити клас nav items:
```
БУЛО: "flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 font-mono text-[11px] transition-colors"
СТАЛО: "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors"
```

### 1b. Nav dividers (L137-144) — трохи більший шрифт

```
БУЛО: "font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60"
СТАЛО: "text-[10px] uppercase tracking-widest text-[var(--text-muted)] opacity-50 font-medium"
```

### 1c. Header top bar (L208-209) — збільш висоту та логотип

```
БУЛО: <header className="flex h-8 shrink-0 items-center ...">
СТАЛО: <header className="flex h-10 shrink-0 items-center ...">
```

Logo text (L246):
```
БУЛО: "flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]"
СТАЛО: "flex items-center gap-2 font-semibold text-[13px] text-[var(--text-primary)] tracking-wide"
```

### 1d. Sidebar width (L498) — трохи ширше для читабельності

```
БУЛО: navCollapsed ? "w-0 border-r-0" : "w-60"
СТАЛО: navCollapsed ? "w-0 border-r-0" : "w-64"
```

### 1e. AlertDialog (logout) — Bloom-стиль

Замінити весь AlertDialogContent блок (L421-441):
```tsx
<AlertDialogContent className="bg-[var(--bg-surface)] border border-white/10 rounded-2xl font-sans shadow-2xl">
  <AlertDialogHeader>
    <AlertDialogTitle className="text-[var(--text-primary)] text-base font-semibold">
      Вийти з системи?
    </AlertDialogTitle>
    <AlertDialogDescription className="text-[var(--text-muted)] text-sm">
      JWT-токен буде видалено. Потрібно буде увійти знову.
    </AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogCancel className="text-sm bg-transparent border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 rounded-xl">
      Скасувати
    </AlertDialogCancel>
    <AlertDialogAction
      onClick={logout}
      className="text-sm bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl"
    >
      Вийти
    </AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
```

---

## Частина 2: `src/styles.css` — теплі фони з teal відтінком

Знайти і замінити фонові кольори (приблизно L121-124):
```css
/* БУЛО */
--bg-base: #111318;
--bg-surface: #1a1b21;
--bg-elevated: #282a2f;
--bg-overlay: #33353a;

/* СТАЛО — slight teal tint */
--bg-base: #0f1419;
--bg-surface: #161e23;
--bg-elevated: #1e282d;
--bg-overlay: #263036;
```

---

## Частина 3: Page headers — Bloom-стиль для ключових сторінок

### 3a. `src/pages/DiagramsPage.tsx`

Прочитай файл спочатку. Знайди return ( і одразу після відкриваючого <div> додай page header:

```tsx
{/* Page Header */}
<div className="border-b border-white/5 px-6 py-5">
  <div className="flex items-center gap-3 mb-1">
    <LayoutDashboard className="h-5 w-5 text-teal-400" />
    <h1 className="text-lg font-semibold text-white">Схеми</h1>
  </div>
  <p className="text-sm text-gray-400">DRAKON-схеми та алгоритмічні потоки вашого проекту</p>
</div>
```

Імпорт добавити: `import { LayoutDashboard } from "lucide-react";` якщо немає.

### 3b. `src/pages/NotebookLMPage.tsx`

Прочитай файл спочатку. Додай аналогічний header:

```tsx
{/* Page Header */}
<div className="border-b border-white/5 px-6 py-5">
  <div className="flex items-center gap-3 mb-1">
    <BookOpen className="h-5 w-5 text-teal-400" />
    <h1 className="text-lg font-semibold text-white">Knowledge Agents</h1>
  </div>
  <p className="text-sm text-gray-400">Archivist AI агенти — чат з базами знань ваших зон</p>
</div>
```

### 3c. `src/pages/KnowledgePage.tsx`

Прочитай файл (L7-38). Додай header якщо його немає:

```tsx
{/* Page Header */}
<div className="border-b border-white/5 px-6 py-5">
  <div className="flex items-center gap-3 mb-1">
    <Brain className="h-5 w-5 text-teal-400" />
    <h1 className="text-lg font-semibold text-white">Знання</h1>
  </div>
  <p className="text-sm text-gray-400">Knowledge zones з Garden Bloom — джерела знань для ваших агентів</p>
</div>
```

---

## Частина 4: Workspace dialog — "Додати репозиторій"

Знайти файл через GitNexus або grep:
```bash
grep -rn "ДОДАТИ РЕПОЗИТОРІЙ\|Додати репозиторій\|owner/repo\|open-add-repo" src/components/ --include="*.tsx" -l
```

Відкрий знайдений файл. Знайди Input для "owner/repo" і додай Bloom-стиль:
- Input: `className="... border-white/10 bg-white/5 focus:border-teal-400/50 focus:ring-teal-400/20 rounded-xl h-11"`
- Button "Знайти": `className="... bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl"`
- Dialog container: додай `rounded-2xl` замість поточного `rounded`

---

## Частина 5: Sync + Verify

```bash
# Sync до .lovable/
cp src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx
cp src/styles.css .lovable/src/styles.css
# + будь-які змінені pages

# TypeScript check
npx tsc --noEmit 2>&1 | head -20

# Commit + push
git add src/components/workspace/WorkspaceShell.tsx src/styles.css \
  src/pages/DiagramsPage.tsx src/pages/NotebookLMPage.tsx src/pages/KnowledgePage.tsx \
  .lovable/src/components/workspace/WorkspaceShell.tsx .lovable/src/styles.css \
  .lovable/src/pages/DiagramsPage.tsx .lovable/src/pages/NotebookLMPage.tsx \
  .lovable/src/pages/KnowledgePage.tsx \
  development/TASKS.md
git commit -m "feat(ui): Bloom-style polish — sidebar readability, teal backgrounds, page headers"
git push origin main
```

---

## Verification

Після деплою на aidrakon.tech:
- [ ] Sidebar nav items: 13px, readable, не mono
- [ ] Background: трохи теплішого тону, не pitch black
- [ ] DiagramsPage, KnowledgePage, NotebookLMPage: мають page header
- [ ] Logout dialog: Bloom-стиль з teal кнопкою
- [ ] TypeScript: 0 errors

---

## Diary

```
SESSION:2026-06-13|TASK-221:bloom-ui-polish|sidebar+bg+headers|commit:<hash>|★★★
```
