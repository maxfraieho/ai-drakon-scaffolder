# Lovable Prompt 44 — Fix GitHub Tab Project Binding (Directive 3)

## Мета
Виправити ізоляцію стану компонента браузера репозиторіїв (`/github`), щоб він реагував на зміну активного проєкту.

## Контекст
Є `ProjectContext` з хуком `useProject()`, який повертає `activeProject` типу:
```ts
interface Project {
  slug: string;
  name: string;
  github?: { owner: string; repo: string; branch: string };
  exists: boolean;
}
```

Проблема: `src/routes/github.tsx` ігнорує `activeProject` і використовує `readSettings().github` (hardcoded owner/repo).

## Зміна в `src/routes/github.tsx`

**Лише 4 точкові правки — НЕ переписувати весь файл:**

### 1. Додати імпорт (після існуючих імпортів)
```ts
import { useProject } from "@/context/ProjectContext";
```

### 2. В тілі `GitHubRoute()` — замінити рядки що читають settings:
```ts
// БУЛО:
const githubDefaults = readSettings().github;
const owner = githubDefaults.owner;
const repo = githubDefaults.repo;
const [branch, setBranch] = useState(githubDefaults.branch || "main");

// СТАЛО:
const githubDefaults = readSettings().github;
const { activeProject } = useProject();
const ghSource = activeProject?.github ?? null;
const owner = ghSource?.owner ?? githubDefaults.owner;
const repo = ghSource?.repo ?? githubDefaults.repo;
const [branch, setBranch] = useState(ghSource?.branch ?? githubDefaults.branch ?? "main");
```

### 3. useEffect що скидає cache — додати `activeProject?.slug` в deps array:
```ts
// БУЛО:
}, [owner, repo, branch, token]);

// СТАЛО:
}, [owner, repo, branch, token, activeProject?.slug]);
```

### 4. В заголовку сторінки — після `<p className="truncate ...">` додати chip:
```tsx
{activeProject?.github && (
  <span className="ml-2 rounded px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/30 font-mono text-[10px] text-amber-400 whitespace-nowrap">
    {activeProject.name}
  </span>
)}
```

## Результат
При перемиканні проєкту в сайдбарі — GitHub вкладка автоматично показує репозиторій обраного проєкту.
