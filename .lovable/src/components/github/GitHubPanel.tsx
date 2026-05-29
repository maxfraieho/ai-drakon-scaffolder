import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { GitHubFileTree } from "@/components/github/GitHubFileTree";
import { Input } from "@/components/ui/input";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useGithubRepos, mergeWithKnown } from "@/hooks/useGithubRepos";
import { useProject } from "@/context/ProjectContext";

type GitHubPanelProps = {
onSelectPath: (path: string, type: "file" | "dir") => void;
onAnalyzeFolder: (path: string) => void;
};

type SavedRepo = {
owner: string;
repo: string;
branch: string;
};

const STORAGE_KEY = "github.lastRepo";

function readSavedRepo(): SavedRepo {
if (typeof window === "undefined") {
return { owner: "maxfraieho", repo: "drakon-setup-hub", branch: "main" };
}

try {
const raw = localStorage.getItem(STORAGE_KEY);
if (!raw) {
return { owner: "maxfraieho", repo: "drakon-setup-hub", branch: "main" };
}

const parsed = JSON.parse(raw) as Partial<SavedRepo>;
return {
owner: parsed.owner || "maxfraieho",
repo: parsed.repo || "drakon-setup-hub",
branch: parsed.branch || "main",
};
} catch {
return { owner: "maxfraieho", repo: "drakon-setup-hub", branch: "main" };
}
}

export function GitHubPanel({ onSelectPath, onAnalyzeFolder }: GitHubPanelProps) {
  const { activeProject } = useProject();
  const [owner, setOwner] = useState(() => activeProject?.github?.owner ?? readSavedRepo().owner);
  const [repo, setRepo] = useState(() => activeProject?.github?.repo ?? readSavedRepo().repo);
  const [branch, setBranch] = useState(() => activeProject?.github?.branch ?? readSavedRepo().branch);

  useEffect(() => {
    if (activeProject?.github) {
      setOwner(activeProject.github.owner);
      setRepo(activeProject.github.repo);
      setBranch(activeProject.github.branch);
    } else {
      const saved = readSavedRepo();
      setOwner(saved.owner);
      setRepo(saved.repo);
      setBranch(saved.branch);
    }
  }, [activeProject?.slug]);

const [branches, setBranches] = useState<string[]>(["main"]);
const [repoOpen, setRepoOpen] = useState(false);

const token =
typeof window !== "undefined" ? sessionStorage.getItem("drakon_gh_write_token") || "" : "";
const { repos, loading } = useGithubRepos(owner, token);
const allRepos = mergeWithKnown(repos);
const repoQuery = repo.toLowerCase().trim();
const repoExactMatch = allRepos.some(
(r) => r.name.toLowerCase() === repoQuery || r.full_name.toLowerCase() === repoQuery,
);
const filteredRepos = !repoQuery || repoExactMatch
? allRepos
: allRepos.filter(
(r) =>
r.name.toLowerCase().includes(repoQuery) ||
r.full_name.toLowerCase().includes(repoQuery),
);

useEffect(() => {
localStorage.setItem(STORAGE_KEY, JSON.stringify({ owner, repo, branch }));
}, [owner, repo, branch]);

useEffect(() => {
const trimmedOwner = owner.trim();
const trimmedRepo = repo.trim();
if (!trimmedOwner || !trimmedRepo) return;

void (async () => {
try {
const response = await api.githubListBranches(trimmedOwner, trimmedRepo);
if (response.success && response.branches.length > 0) {
setBranches(response.branches);
if (!response.branches.includes(branch)) {
setBranch(response.branches[0]);
}
}
} catch {
setBranches(["main"]);
}
})();
}, [owner, repo]);

return (
<div className="space-y-4 rounded-md border border-border bg-card p-3">
<div className="grid grid-cols-1 gap-2">
<Input value={owner} onChange={(event) => setOwner(event.target.value)}
placeholder="owner" />

<div className="relative">
<Input
value={repo}
onChange={(e) => setRepo(e.target.value)}
onFocus={() => setRepoOpen(true)}
onBlur={() => setTimeout(() => setRepoOpen(false), 150)}
placeholder="repo-name"
/>
{repoOpen && (
<div className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto bg-card border border-border rounded-md shadow-md">
{loading && (
<div className="px-3 py-2 text-sm text-muted-foreground flex items-center">
<Loader2 className="h-3 w-3 animate-spin inline mr-1" />
Loading repos…
</div>
)}
{!loading && filteredRepos.length === 0 && (
<div className="px-3 py-2 text-sm text-muted-foreground">
No repos found — type to enter manually
</div>
)}
{filteredRepos.map((r) => (
<button
key={r.full_name}
type="button"
onMouseDown={() => {
setRepo(r.name);
setOwner(r.owner);
setRepoOpen(false);
}}
className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
>
<span className="font-medium">{r.name}</span>
{r.private && (
<span className="ml-2 text-[10px] text-muted-foreground">private</span>
)}
<span className="ml-2 text-[10px] text-muted-foreground">{r.owner}</span>
</button>
))}
</div>
)}
</div>

<Select value={branch} onValueChange={setBranch}>
<SelectTrigger>
<SelectValue placeholder="branch" />
</SelectTrigger>
<SelectContent>
{branches.map((item) => (
<SelectItem key={item} value={item}>
{item}
</SelectItem>
))}
</SelectContent>
</Select>
</div>
<GitHubFileTree
owner={owner}
repo={repo}
branch={branch}
onSelectPath={onSelectPath}
onAnalyzeFolder={onAnalyzeFolder}
/>
</div>
);
}

