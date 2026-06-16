# Variant A — Single GitHub Config for Code + Notes

> **For Claude/AGY:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Code tab і Notes/Docs tab використовують ТІЛЬКИ глобальні GitHub Settings (`getGithubConfig()`), а не `activeProject`. `ProjectSelector` залишається для Agents/Pipeline/Diagrams.

**Architecture:** Три компоненти (CodePage, NotesTab, NotesGraphTab, DocsFilesTab) замінюють `activeProject?.slug` на `getGithubConfig().repo`. Немає змін в ProjectContext, ProjectSelector або маршрутизації.

**Tech Stack:** React/TypeScript, `src/lib/settings-storage.ts#getGithubConfig`, `.lovable/src/` (Cloudflare Pages build source — ЗАВЖДИ синхронізувати!)

**ВАЖЛИВО:** Після кожного `src/` файлу — одразу копіювати в `.lovable/src/`. Перевіряти через `diff`.

---

## Task 1: CodePage.tsx — відв'язати від activeProject

**Files:**
- Modify: `src/pages/CodePage.tsx:168-178`
- Modify: `.lovable/src/pages/CodePage.tsx:168-178`

**Step 1: Знайти поточний код**

```bash
grep -n "useProject\|activeProject\|projectGh" src/pages/CodePage.tsx | head -10
```

**Step 2: Замінити useProject на getGithubConfig**

Знайти (рядки ~168-178 в CodePage):
```tsx
const navigate = useNavigate();
const { activeProject } = useProject();
const ghCfg = getGithubConfig();
const token = ghCfg.token;
const projectGh = activeProject?.github;
const owner = projectGh?.owner || "";
const repo = projectGh?.repo || "";
const branch = projectGh?.branch || ghCfg.branch || "main";
```

Замінити на:
```tsx
const navigate = useNavigate();
const ghCfg = getGithubConfig();
const owner = ghCfg.owner || "";
const repo = ghCfg.repo || "";
const branch = ghCfg.branch || "main";
const token = ghCfg.token;
```

**Step 3: Видалити unused import**

Видалити рядок:
```tsx
import { useProject } from "@/context/ProjectContext";
```

**Step 4: Перевірити що FileTree порожній стан показує правильно**

Коли `owner` або `repo` пусті → `FileTree` покаже:
```
Налаштуйте GitHub у вкладці Налаштування
```

Замінити текст в `FileTree` (рядок ~97-100):
```tsx
<span className="font-mono text-[9px] text-[var(--text-muted)] text-center">
  Налаштуйте GitHub у вкладці Налаштування
</span>
```

**Step 5: Синхронізувати в .lovable/**
```bash
cp src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx
diff src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx && echo "SYNC OK"
```

**Step 6: Commit**
```bash
git add src/pages/CodePage.tsx .lovable/src/pages/CodePage.tsx
git commit -m "fix(code-tab): use global github settings only, remove activeProject dependency (Variant A)"
git push origin main
```

---

## Task 2: NotesTab.tsx — відв'язати від activeProject

**Files:**
- Modify: `src/components/docs/NotesTab.tsx`
- Modify: `.lovable/src/components/docs/NotesTab.tsx`

**Step 1: Знайти всі місця з activeProject**
```bash
grep -n "activeProject\|useProject" src/components/docs/NotesTab.tsx
```

Очікується (~5 місць):
- `import { useProject }` — видалити
- `const { activeProject } = useProject()` — видалити
- `useNotesEditor({ slug, project: activeProject?.slug })` — замінити
- `fetchNotesTree(activeProject?.slug)` — замінити
- `deleteNote(slug, activeProject?.slug)` — замінити (x2)

**Step 2: Додати import getGithubConfig**

Знайти рядок:
```tsx
import { useProject } from "@/context/ProjectContext";
```
Замінити на:
```tsx
import { getGithubConfig } from "@/lib/settings-storage";
```

**Step 3: Замінити activeProject на ghRepo**

Знайти в тілі функції `NotesTab`:
```tsx
const { activeProject } = useProject();
```
Замінити на:
```tsx
const ghRepo = getGithubConfig().repo || "";
```

**Step 4: Замінити всі activeProject?.slug на ghRepo**

- `useNotesEditor({ slug: editorSlug, project: activeProject?.slug })` → `project: ghRepo`
- `fetchNotesTree(activeProject?.slug)` → `fetchNotesTree(ghRepo || undefined)`
- `deleteNote(slug, activeProject?.slug)` → `deleteNote(slug, ghRepo || undefined)`
- `useEffect(..., [activeProject?.slug])` → `[ghRepo]`

**Step 5: Синхронізувати та commit**
```bash
cp src/components/docs/NotesTab.tsx .lovable/src/components/docs/NotesTab.tsx
diff src/components/docs/NotesTab.tsx .lovable/src/components/docs/NotesTab.tsx && echo "SYNC OK"
git add src/components/docs/NotesTab.tsx .lovable/src/components/docs/NotesTab.tsx
git commit -m "fix(notes-tab): use global github repo for notes project scope (Variant A)"
git push origin main
```

---

## Task 3: NotesGraphTab.tsx — відв'язати від activeProject

**Files:**
- Modify: `src/components/docs/NotesGraphTab.tsx`
- Modify: `.lovable/src/components/docs/NotesGraphTab.tsx`

**Step 1: Знайти код**
```bash
grep -n "activeProject\|useProject" src/components/docs/NotesGraphTab.tsx
```

**Step 2: Замінити**

```tsx
// ВИДАЛИТИ:
import { useProject } from "@/context/ProjectContext";
// ...
const { activeProject } = useProject();
// ...
const data = await fetchNotesGraph(activeProject?.slug);
// ...
}, [activeProject?.slug]);

// ЗАМІНИТИ НА:
import { getGithubConfig } from "@/lib/settings-storage";
// ...
const ghRepo = getGithubConfig().repo || "";
// ...
const data = await fetchNotesGraph(ghRepo || undefined);
// ...
}, [ghRepo]);
```

**Step 3: Синхронізувати та commit**
```bash
cp src/components/docs/NotesGraphTab.tsx .lovable/src/components/docs/NotesGraphTab.tsx
diff src/components/docs/NotesGraphTab.tsx .lovable/src/components/docs/NotesGraphTab.tsx && echo "SYNC OK"
git add src/components/docs/NotesGraphTab.tsx .lovable/src/components/docs/NotesGraphTab.tsx
git commit -m "fix(notes-graph): use global github repo for graph project scope (Variant A)"
git push origin main
```

---

## Task 4: DocsFilesTab.tsx — відв'язати від activeProject

**Files:**
- Modify: `src/components/docs/DocsFilesTab.tsx`
- Modify: `.lovable/src/components/docs/DocsFilesTab.tsx`

**Step 1: Знайти**
```bash
grep -n "activeProject\|useProject" src/components/docs/DocsFilesTab.tsx
```

**Step 2: Замінити (аналогічно Task 2)**

```tsx
// ВИДАЛИТИ import useProject
// ДОДАТИ import { getGithubConfig } from "@/lib/settings-storage"
// const { activeProject } = useProject() → const ghRepo = getGithubConfig().repo || ""
// activeProject?.slug → ghRepo || undefined
```

**Step 3: Синхронізувати та commit**
```bash
cp src/components/docs/DocsFilesTab.tsx .lovable/src/components/docs/DocsFilesTab.tsx
diff src/components/docs/DocsFilesTab.tsx .lovable/src/components/docs/DocsFilesTab.tsx && echo "SYNC OK"
git add src/components/docs/DocsFilesTab.tsx .lovable/src/components/docs/DocsFilesTab.tsx
git commit -m "fix(docs-files-tab): use global github repo for docs project scope (Variant A)"
git push origin main
```

---

## Task 5: Верифікація

**Step 1: Перевірити TypeScript**
```bash
cd .lovable && npx tsc --noEmit 2>&1 | head -20
```
Очікується: 0 помилок.

**Step 2: Перевірити що ProjectSelector ще рендериться**
```bash
grep -n "ProjectSelector\|useProject" src/components/workspace/WorkspaceShell.tsx | head -5
grep -n "activeProject" src/components/workspace/DevCyclePanel.tsx | head -5
grep -n "activeProject" src/components/workspace/DrakonIrPanel.tsx | head -5
```
Очікується: ProjectSelector залишився, DevCyclePanel і DrakonIrPanel ще використовують activeProject (це правильно).

**Step 3: Перевірити що CodePage більше не імпортує useProject**
```bash
grep "useProject" src/pages/CodePage.tsx && echo "BUG: still imports useProject" || echo "OK: no useProject"
grep "useProject" src/components/docs/NotesTab.tsx && echo "BUG" || echo "OK"
grep "useProject" src/components/docs/NotesGraphTab.tsx && echo "BUG" || echo "OK"
grep "useProject" src/components/docs/DocsFilesTab.tsx && echo "BUG" || echo "OK"
```

**Step 4: Final commit TASKS.md**
```bash
cd ~/workspace/ai-drakon-scaffolder
python3 -c "
t=open('development/TASKS.md').read()
t=t.replace('[ ] pending\n**Виконавець:** AGY3 (Variant A)', '[x] done')
open('development/TASKS.md','w').write(t)"
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-57 done — Variant A single github config"
git push origin main
python3 -m mempalace diary write --agent agt-ogy3 "SESSION:2026-05-29|TASK-57:variant-a-single-github-config|DONE|4-files+sync|★★★"
```

---

## Результат

Після виконання:
- **Code tab** показує файли repo з `Settings → GitHub → owner/repo/branch`
- **Notes tab** показує документи з `docs/{Settings.github.repo}/` (наприклад `docs/uav-watcher/`)
- **Agents/Pipeline/Diagrams** — проектний dropdown залишився без змін
- Якщо Settings пусті → Code показує "Налаштуйте GitHub у вкладці Налаштування"
- Якщо `docs/{repo}/` не існує → Notes порожні (очікувана поведінка)

## Семантичні зв'язки
**Цей документ є частиною:** [[plans/_INDEX]]

**Цей документ пов'язаний з:**
- [[plans/2026-05-30-ai-drakon-issues-from-uav-analysis]] — наступний розділ (2026 05 30 ai drakon issues from uav analysis)