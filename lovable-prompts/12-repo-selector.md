# Prompt 12 — GitHub Repository Dropdown Selector

## Goal

Replace all manual `owner` + `repo` text inputs with a smart combobox that fetches the user's repos from GitHub API and shows them as a searchable dropdown. Affects two places: `GitHubPanel` and `ProjectFolderSection`.

---

## Shared hook: `src/hooks/useGithubRepos.ts`

Create this hook:

```ts
import { useEffect, useState } from "react";

export interface GithubRepoItem {
  full_name: string; // "owner/repo"
  name: string;
  owner: string;
  private: boolean;
  updated_at: string;
}

export function useGithubRepos(owner: string, token?: string) {
  const [repos, setRepos] = useState<GithubRepoItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!owner.trim()) return;
    let cancelled = false;
    setLoading(true);

    const headers: Record<string, string> = {};
    if (token?.trim()) headers["Authorization"] = `token ${token.trim()}`;

    // With token: fetch authenticated user's repos (includes private)
    // Without token: fetch public repos for given owner
    const url = token?.trim()
      ? `https://api.github.com/user/repos?per_page=100&sort=updated&type=owner`
      : `https://api.github.com/users/${encodeURIComponent(owner.trim())}/repos?per_page=100&sort=updated`;

    fetch(url, { headers })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(data)) return;
        const items: GithubRepoItem[] = data.map((r: Record<string, unknown>) => ({
          full_name: String(r.full_name || ""),
          name: String(r.name || ""),
          owner: String((r.owner as Record<string, unknown>)?.login || owner),
          private: Boolean(r.private),
          updated_at: String(r.updated_at || ""),
        }));
        setRepos(items);
      })
      .catch(() => {/* silently ignore */})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [owner, token]);

  return { repos, loading };
}
```

---

## Change 1: `src/components/github/GitHubPanel.tsx`

**Current layout:** Two separate `<Input>` fields for `owner` and `repo` (plain text), then a branch `<Select>`.

**New layout:**

```
[Owner input — plain text, same as before]
[Repository — combobox dropdown that lists repos for this owner]
[Branch — Select, same as before]
```

### Implementation:

1. Import `useGithubRepos` hook
2. Get token from `sessionStorage.getItem("drakon_gh_write_token") || ""`
3. Call `const { repos, loading } = useGithubRepos(owner, token)`
4. Replace the plain `<Input value={repo} ...>` with a **combobox**:
   - It is a `<div className="relative">` wrapping:
     - `<Input>` that shows current `repo` value, editable (typing filters the list)
     - A dropdown `<div>` below it that appears on focus, lists repos filtered by input text
     - Each row: `<button onClick={() => { setRepo(item.name); setOwner(item.owner); }}>item.full_name</button>`
     - If `loading`: show "Loading…" row
     - If no repos and not loading: show "Type to search or enter manually"
   - Dropdown closes on blur (use `onMouseDown` on options to prevent blur-before-click)
   - Style: `position: absolute, z-50, w-full, max-h-48, overflow-y-auto, bg-card border border-border rounded-md shadow-md`
   - Each option: `px-3 py-1.5 text-sm cursor-pointer hover:bg-accent`
   - Filter: `repos.filter(r => r.name.toLowerCase().includes(repo.toLowerCase()) || r.full_name.toLowerCase().includes(repo.toLowerCase()))`

5. When user selects a repo from dropdown: set `repo = item.name` AND `owner = item.owner` (so owner auto-updates if repos are from token-based `/user/repos`)

6. Keep `owner` input as plain text — changing it re-fetches repos

**Example combobox structure:**
```tsx
const [repoInputOpen, setRepoInputOpen] = useState(false);
const filteredRepos = repos.filter(r =>
  r.full_name.toLowerCase().includes(repo.toLowerCase())
);

<div className="relative">
  <Input
    value={repo}
    onChange={e => setRepo(e.target.value)}
    onFocus={() => setRepoInputOpen(true)}
    onBlur={() => setTimeout(() => setRepoInputOpen(false), 150)}
    placeholder="repo-name"
  />
  {repoInputOpen && (
    <div className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto
                    bg-card border border-border rounded-md shadow-md">
      {loading && (
        <div className="px-3 py-2 text-sm text-muted-foreground">Loading repos…</div>
      )}
      {!loading && filteredRepos.length === 0 && (
        <div className="px-3 py-2 text-sm text-muted-foreground">No repos found — type to enter manually</div>
      )}
      {filteredRepos.map(r => (
        <button
          key={r.full_name}
          type="button"
          onMouseDown={() => { setRepo(r.name); setOwner(r.owner); setRepoInputOpen(false); }}
          className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
        >
          <span className="font-medium">{r.name}</span>
          {r.private && <span className="ml-2 text-[10px] text-muted-foreground">private</span>}
        </button>
      ))}
    </div>
  )}
</div>
```

---

## Change 2: `src/components/drakon/ProjectFolderSection.tsx`

**Current:** "GitHub repo" field is a plain `<Input id="pf-repo" value={value.repo} onChange={...} placeholder="owner/repo">`.

**New:** Replace it with the same combobox pattern.

Here the token is available as `value.githubToken`. Parse owner from `value.repo` (split on `/`, take first part).

```ts
const repoOwner = value.repo.includes("/") ? value.repo.split("/")[0] : "maxfraieho";
const { repos, loading } = useGithubRepos(repoOwner, value.githubToken);
```

On dropdown select: set `value.repo = item.full_name` (full `owner/repo` string since the field holds `owner/repo` format).

```tsx
onMouseDown={() => set("repo", r.full_name)}
```

Filter: match against `r.full_name` which already contains `owner/repo`.

Add a `[repoOpen, setRepoOpen]` state for the dropdown visibility. Same open/close logic as GitHubPanel.

---

## Hardcoded fallback

If GitHub API returns no repos (network error, rate limit, no token, rate-limited), prepopulate with these known repos so the dropdown isn't empty:

```ts
const KNOWN_REPOS: GithubRepoItem[] = [
  { full_name: "maxfraieho/ai-drakon-setup", name: "ai-drakon-setup", owner: "maxfraieho", private: false, updated_at: "" },
  { full_name: "maxfraieho/drakon-setup-hub", name: "drakon-setup-hub", owner: "maxfraieho", private: false, updated_at: "" },
  { full_name: "maxfraieho/free-claude-code-alpine", name: "free-claude-code-alpine", owner: "maxfraieho", private: false, updated_at: "" },
];
```

In `useGithubRepos`, initialize state with `KNOWN_REPOS` and merge API results on top (API results first, then known repos not already in results).

OR: simpler — just export `KNOWN_REPOS` from the hook and use it in the components as a merge fallback:

```ts
// in hook:
export const KNOWN_REPOS = [...];

// display: [...repos, ...KNOWN_REPOS.filter(k => !repos.find(r => r.full_name === k.full_name))]
```

---

## Persistence

- `GitHubPanel`: already saves `{ owner, repo, branch }` to `localStorage["github.lastRepo"]` — no change needed
- `ProjectFolderSection`: already saves `repo` to `localStorage["drakon_last_repo"]` — no change needed

---

## Design rules

- Dropdown: `bg-card border border-border rounded-md shadow-md` — matches existing dark theme
- Loading spinner: `<Loader2 className="h-3 w-3 animate-spin inline mr-1">` before "Loading repos…"
- No new dependencies — use only existing Shadcn/UI components + Tailwind classes
- TypeScript strict — no `any`, type the GitHub API response items properly
- Keep all existing functionality (manual typing still works — it's a combobox, not a forced select)
