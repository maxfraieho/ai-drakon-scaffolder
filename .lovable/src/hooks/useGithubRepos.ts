import { useEffect, useState } from "react";

export interface GithubRepoItem {
full_name: string;
name: string;
owner: string;
private: boolean;
updated_at: string;
}

export const KNOWN_REPOS: GithubRepoItem[] = [
{ full_name: "maxfraieho/ai-drakon-setup", name: "ai-drakon-setup", owner: "maxfraieho",
private: false, updated_at: "" },
{ full_name: "maxfraieho/drakon-setup-hub", name: "drakon-setup-hub", owner: "maxfraieho",
private: false, updated_at: "" },
{ full_name: "maxfraieho/free-claude-code-alpine", name: "free-claude-code-alpine", owner:
"maxfraieho", private: false, updated_at: "" },
];

export function mergeWithKnown(repos: GithubRepoItem[]): GithubRepoItem[] {
return [...repos, ...KNOWN_REPOS.filter((k) => !repos.find((r) => r.full_name ===
k.full_name))];
}

export function useGithubRepos(owner: string, token?: string) {
const [repos, setRepos] = useState<GithubRepoItem[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
if (!owner.trim()) return;
let cancelled = false;
setLoading(true);

const headers: Record<string, string> = {};
if (token?.trim()) headers["Authorization"] = token ${token.trim()};

const url = token?.trim()
? https://api.github.com/user/repos?per_page=100&sort=updated&type=owner
: https://api.github.com/users/${encodeURIComponent(owner.trim())}/repos?per_page
=100&sort=updated;

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
.catch(() => {})
.finally(() => {
if (!cancelled) setLoading(false);
});

return () => {
cancelled = true;
};
}, [owner, token]);

return { repos, loading };
}

