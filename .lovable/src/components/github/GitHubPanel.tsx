import { useEffect, useState } from "react";

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
  const [owner, setOwner] = useState(() => readSavedRepo().owner);
  const [repo, setRepo] = useState(() => readSavedRepo().repo);
  const [branch, setBranch] = useState(() => readSavedRepo().branch);
  const [branches, setBranches] = useState<string[]>(["main"]);

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
        <Input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="owner" />
        <Input value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="repo" />
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