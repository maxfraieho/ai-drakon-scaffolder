import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { useDiagramStore } from "@/store/useDiagramStore";
import { cn } from "@/lib/utils";

export function MutationLogPanel({ className }: { className?: string }) {
const mutationLog = useDiagramStore((s) => s.mutationLog);
const isProcessingMutation = useDiagramStore((s) => s.isProcessingMutation);
const mutationQueue = useDiagramStore((s) => s.mutationQueue);
const [expanded, setExpanded] = useState(true);

return (
<div className={cn("flex min-h-0 flex-col border-t border-[var(--border-subtle)]",
className)}>
<button
type="button"
onClick={() => setExpanded((v) => !v)}
aria-expanded={expanded}
aria-label="Toggle mutation log"
className="flex items-center justify-between px-3 py-2 transition-colors duration-150 hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
>
<div className="flex items-center gap-2">
<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
Mutation Log
</span>

{isProcessingMutation && (
<span
className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-amber-400"
aria-label="Processing mutation"
role="status"
/>
)}

{mutationQueue.length > 0 && (
<span
className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]"
aria-label={${mutationQueue.length} mutations queued}
data-numeric="true"
>
+{mutationQueue.length}
</span>
)}
</div>

<ChevronDown
className={cn(
"h-3 w-3 text-[var(--text-muted)] transition-transform duration-150",
expanded && "rotate-180",
)}
aria-hidden="true"
/>
</button>

{expanded && (
<div
className="max-h-48 space-y-0.5 overflow-y-auto px-3 py-2"
aria-live="polite"
aria-label="Mutation log entries"
>
{mutationLog.length === 0 && (
<p className="py-2 text-center font-mono text-[11px] text-[var(--text-muted)]">
No mutations yet
</p>
)}

{mutationLog.slice(0, 10).map((entry, i) => (
<div
key={${entry.timestamp}-${i}}
className="flex items-start gap-2 border-b border-[var(--border-subtle)] py-1.5 font-mono text-[11px] last:border-0"
>
<span
className={cn(
"mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full",
entry.status === "applied" ? "bg-green-500" : "bg-red-500",
)}
aria-label={entry.status === "applied" ? "Applied" : "Rejected"}
role="status"
/>

<span className="flex-shrink-0 tabular-nums text-[var(--text-muted)]">
{entry.op}
</span>

{entry.nodeId && (
<span className="truncate font-mono tabular-nums text-[var(--text-secondary)]">
{String(entry.nodeId).slice(0, 12)}
</span>
)}

{entry.reason && (
<span className="min-w-0 flex-1 truncate text-red-400" title={entry.reason}>
{entry.reason}
</span>
)}
</div>
))}
</div>
)}
</div>
);
}
---
### components/github/GitHubFileTree.tsx
**Розмір:** 5,484 байт


import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type GitHubEntry = {
name: string;
path: string;
type: "file" | "dir";
size: number;
};

type GitHubFileTreeProps = {
owner: string;
repo: string;
branch?: string;
onSelectPath: (path: string, type: "file" | "dir") => void;
onAnalyzeFolder: (path: string) => void;
};

function iconForFile(name: string) {
if (name.endsWith(".tsx")) return "⚛️";
if (name.endsWith(".ts")) return " ";
if (name.endsWith(".js") || name.endsWith(".jsx")) return " ";
if (name.endsWith(".json")) return " ";
return " ";
}

export function GitHubFileTree({ owner, repo, branch = "main", onSelectPath, onAnalyzeFolder
}: GitHubFileTreeProps) {
const [expanded, setExpanded] = useState<Record<string, boolean>>({});
const [nodesByPath, setNodesByPath] = useState<Record<string, GitHubEntry[]>>({});
const [loadingPaths, setLoadingPaths] = useState<Record<string, boolean>>({});
const [error, setError] = useState<string | null>(null);

const normalizedOwner = owner.trim();
const normalizedRepo = repo.trim();

const canLoad = useMemo(() => normalizedOwner.length > 0 && normalizedRepo.length > 0,
[normalizedOwner, normalizedRepo]);

const loadPath = async (path: string) => {
if (!canLoad || loadingPaths[path]) return;

setLoadingPaths((prev) => ({ ...prev, [path]: true }));
setError(null);
try {
const response = await api.githubListTree(normalizedOwner, normalizedRepo, path, branch);
if (!response.success) {
throw new Error("Не вдалося завантажити дерево GitHub");
}

const sorted = [...(response.entries || [])].sort((a, b) => {
if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
return a.name.localeCompare(b.name);
});

setNodesByPath((prev) => ({ ...prev, [path]: sorted }));
} catch (e) {
const message = e instanceof Error ? e.message : "Помилка GitHub API";
setError(
message.includes("GITHUB_TOKEN")
? "GITHUB_TOKEN не налаштований у Worker. Додай secret і повтори спробу."
: message,
);
} finally {
setLoadingPaths((prev) => ({ ...prev, [path]: false }));
}
};

useEffect(() => {
setExpanded({});
setNodesByPath({});
setError(null);
if (canLoad) {
void loadPath("");
}
}, [canLoad, normalizedOwner, normalizedRepo, branch]);

const toggleDir = (path: string) => {
const nextExpanded = !expanded[path];
setExpanded((prev) => ({ ...prev, [path]: nextExpanded }));
if (nextExpanded && !nodesByPath[path]) {
void loadPath(path);
}
onSelectPath(path, "dir");
};

const renderEntries = (path: string, depth: number) => {
const entries = nodesByPath[path] || [];

return entries.map((entry) => {
const isDir = entry.type === "dir";
const isOpen = expanded[entry.path];

return (
<div key={entry.path} className="space-y-1">
<div className="flex items-center gap-2" style={{ paddingLeft: ${depth * 14}px }}>
<button
type="button"
className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-foreground"
onClick={() => {
if (isDir) {
toggleDir(entry.path);
} else {
onSelectPath(entry.path, "file");
}
}}
>
<span>{isDir ? " " : iconForFile(entry.name)}</span>
<span className="truncate">{entry.name}</span>
</button>

{isDir ? (
<>
<Button
type="button"
size="sm"
variant="outline"
className="h-7 px-2 text-xs"
onClick={() => onAnalyzeFolder(entry.path)}
>
     Аналізувати
</Button>
<span className="text-xs text-muted-foreground">{isOpen ? "▾" : "▸"}</span>
</>
) : null}
</div>

{isDir && isOpen ? (
<div>
{loadingPaths[entry.path] ? (
<div className="space-y-1 pl-8">
<div className="h-4 w-40 animate-pulse rounded bg-muted" />
<div className="h-4 w-32 animate-pulse rounded bg-muted" />
</div>
):(
renderEntries(entry.path, depth + 1)
)}
</div>
) : null}
</div>
);
});
};

if (!canLoad) {
return <p className="text-sm text-muted-foreground">Вкажіть owner/repo для
завантаження дерева.</p>;
}

if (loadingPaths[""] && !nodesByPath[""]) {
return (
<div className="space-y-2">
<div className="h-4 w-48 animate-pulse rounded bg-muted" />
<div className="h-4 w-40 animate-pulse rounded bg-muted" />
<div className="h-4 w-56 animate-pulse rounded bg-muted" />
</div>
);
}

return (
<div className="space-y-3">
{error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
<div className="space-y-1">{renderEntries("", 0)}</div>
</div>
);
}

