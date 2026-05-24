import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileCode2, FileDown, FileJson2, FileText, Folder, Github, Search, Sparkles } from
"lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import {
Drawer,
DrawerContent,
DrawerDescription,
DrawerFooter,
DrawerHeader,
DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
ResizableHandle,
ResizablePanel,
ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { readFoldersFromStorage } from "@/lib/folder-storage";
import { hasClientJwt } from "@/lib/route-auth";
import { readSettings } from "@/lib/settings-storage";
import { useProject } from "@/context/ProjectContext";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DrakonDiagram } from "@/types/drakon";

type GithubTreeEntry = {
name: string;
path: string;
type: "file" | "dir";
size: number;
};

type FilePreview = {
path: string;
name: string;
size: number;
content: string;
kind: "code" | "json" | "text";
canImportDrakon: boolean;
parsedDiagram?: DrakonDiagram;
};

type ContextActionTarget = { path: string; type: "file" | "dir"; name: string };

export const Route = createFileRoute("/github")({
component: GitHubRoute,
});

function getParentPath(path: string) {
const parts = path.split("/").filter(Boolean);
if (parts.length <= 1) return "";
return parts.slice(0, -1).join("/");
}
function getBreadcrumbs(path: string): Array<{ name: string; path: string }> {
const parts = path.split("/").filter(Boolean);
const crumbs = [{ name: " ", path: "" }];
let acc = "";
for (const part of parts) {
acc = acc ? `${acc}/${part}` : part;
crumbs.push({ name: part, path: acc });
}
return crumbs;
}

function formatSize(size: number) {
if (size < 1024) return `${size} B`;
if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string) {
if (/\.(ts|tsx|js|jsx)$/i.test(name)) return <FileCode2 className="h-4 w-4" />;
if (/\.json$/i.test(name)) return <FileJson2 className="h-4 w-4" />;
return <FileText className="h-4 w-4" />;
}

function isDrakonDiagram(value: unknown): value is DrakonDiagram {
if (!value || typeof value !== "object") return false;
const maybe = value as Partial<DrakonDiagram>;
return typeof maybe.name === "string" && typeof maybe.items === "object" && maybe.items
!== null;
}

function trimLines(content: string, count: number) {
return content.split("\n").slice(0, count).join("\n");
}

function GitHubRoute() {
const navigate = useNavigate();
const isMobile = useIsMobile();
const holdTimerRef = useRef<number | null>(null);

const githubDefaults = readSettings().github;
const { activeProject } = useProject();
const ghSource = activeProject?.github ?? null;
const owner = ghSource?.owner ?? githubDefaults.owner;
const repo = ghSource?.repo ?? githubDefaults.repo;
const [branch, setBranch] = useState(ghSource?.branch ?? githubDefaults.branch ?? "main");
const token = githubDefaults.token || "";

const [branches, setBranches] = useState<string[]>([githubDefaults.branch || "main"]);
const [isLoadingBranches, setIsLoadingBranches] = useState(false);

const [currentPath, setCurrentPath] = useState("");
const [cache, setCache] = useState<Record<string, GithubTreeEntry[]>>({});
const [entries, setEntries] = useState<GithubTreeEntry[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [query, setQuery] = useState("");

const [preview, setPreview] = useState<FilePreview | null>(null);
const [loadingPreview, setLoadingPreview] = useState(false);
const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

const [contextTarget, setContextTarget] = useState<ContextActionTarget | null>(null);
const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
const [importFolderSlug, setImportFolderSlug] = useState(readFoldersFromStorage()[0]?.slug ??
"general");

const canLoad = owner.trim().length > 0 && repo.trim().length > 0;
const breadcrumbs = useMemo(() => getBreadcrumbs(currentPath), [currentPath]);

const filteredEntries = useMemo(() => {
const term = query.trim().toLowerCase();
if (!term) return entries;
return entries.filter((entry) => entry.name.toLowerCase().includes(term));
}, [entries, query]);

const loadPath = async (path: string) => {
if (!canLoad) return;
setLoading(true);
setError(null);

try {
const response = await api.githubListTree(owner.trim(), repo.trim(), path, branch, token.trim() ||
undefined);
if (!response.success) {
throw new Error("Не вдалося завантажити дерево");
}

const sorted = [...response.entries].sort((a, b) => {
if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
return a.name.localeCompare(b.name);
});

setEntries(sorted);
setCurrentPath(path);
setCache((prev) => ({ ...prev, [path]: sorted }));
} catch (e) {
setError(e instanceof Error ? e.message : "Помилка GitHub API");
} finally {
setLoading(false);
}
};

const loadBranches = async () => {
if (!canLoad) return;
setIsLoadingBranches(true);

try {
const response = await api.githubListBranches(owner.trim(), repo.trim(), token.trim() ||
undefined);
if (!response.success) {
throw new Error("Не вдалося завантажити гілки");
}

const next = response.branches.length ? response.branches : ["main"];
setBranches(next);
if (!next.includes(branch)) {
setBranch(next[0]);
}
} catch {
setBranches(["main"]);
if (branch !== "main") setBranch("main");
} finally {
setIsLoadingBranches(false);
}
};

useEffect(() => {
void loadBranches();
}, [owner, repo, token]);

useEffect(() => {
setCache({});
setPreview(null);
setCurrentPath("");
if (canLoad) {
void loadPath("");
}
}, [owner, repo, branch, token, activeProject?.slug]);

const openFile = async (entry: GithubTreeEntry) => {
setLoadingPreview(true);
try {
const response = await api.githubGetFile(owner.trim(), repo.trim(), entry.path, branch,
token.trim() || undefined);
if (!response.success) {
throw new Error("Не вдалося завантажити файл");
}

const raw = response.content || "";
const isCode = /\.(ts|tsx|js|jsx)$/i.test(entry.name);
const isJson = /\.json$/i.test(entry.name);
const previewText = isCode ? trimLines(raw, 80) : trimLines(raw, 50);

let parsedDiagram: DrakonDiagram | undefined;
if (isJson) {
try {
const parsed = JSON.parse(raw) as unknown;
if (isDrakonDiagram(parsed)) {
parsedDiagram = parsed;
}
} catch {
parsedDiagram = undefined;
}
}

setPreview({
path: entry.path,
name: entry.name,
size: entry.size,
content: previewText,
kind: isCode ? "code" : isJson ? "json" : "text",
canImportDrakon: Boolean(parsedDiagram),
parsedDiagram,
});

if (isMobile) {
setIsMobilePreviewOpen(true);
}
} catch (e) {
toast.error(e instanceof Error ? e.message : "Помилка preview");
} finally {
setLoadingPreview(false);
}
};

const analyzePath = (path: string) => {
const cleaned = path || currentPath || "src";
toast.message("Запускаю аналіз структури", { description: `/${cleaned}` });
navigate({
to: "/diagrams",
search: {
autoAnalyze: "true",
analyzePath: cleaned,
analyzeRepo: `${owner.trim()}/${repo.trim()}`,
analyzeBranch: branch,
},
});
};

const exportFolderAsDrakonSet = (path: string) => {
const cleaned = path || currentPath || "src";
toast.message("Експортую папку в набір DRAKON", { description: `/${cleaned}` });
navigate({
to: "/diagrams",
search: {
autoAnalyze: "true",
analyzePath: cleaned,
analyzeRepo: `${owner.trim()}/${repo.trim()}`,
analyzeBranch: branch,
exportDrakonSet: "true",
},
});
};

const copyPath = async (path: string) => {
try {
await navigator.clipboard.writeText(path || "/");
toast.success("Шлях скопійовано");
} catch {
toast.error("Не вдалося скопіювати шлях");
}
};

const importDiagram = async () => {
if (!preview?.parsedDiagram) return;

try {
const id = crypto.randomUUID();
await api.saveDiagram(importFolderSlug, id, preview.parsedDiagram);
toast.success("Схему імпортовано");
setIsImportDialogOpen(false);
navigate({ to: "/diagrams" });
} catch {
toast.error("Не вдалося імпортувати схему");
}
};

const handleEntryClick = (entry: GithubTreeEntry) => {
if (entry.type === "dir") {
void loadPath(entry.path);
return;
}

void openFile(entry);
};

const startHold = (entry: GithubTreeEntry) => {
if (entry.type !== "dir") return;
if (holdTimerRef.current) {
window.clearTimeout(holdTimerRef.current);
}

holdTimerRef.current = window.setTimeout(() => {
setContextTarget({ path: entry.path, type: entry.type, name: entry.name });
}, 450);
};

const cancelHold = () => {
if (holdTimerRef.current) {
window.clearTimeout(holdTimerRef.current);
holdTimerRef.current = null;
}
};

const listView = (
<div className="space-y-3">
<div className="relative">
<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
<Input
value={query}
onChange={(event) => setQuery(event.target.value)}
className="pl-9"
placeholder="Пошук у поточній папці..."
/>
</div>

{loading ? (
<div className="space-y-2">
<div className="h-11 animate-pulse rounded-md bg-muted" />
<div className="h-11 animate-pulse rounded-md bg-muted" />
<div className="h-11 animate-pulse rounded-md bg-muted" />
</div>
) : null}

{error ? <p className="text-sm text-destructive">{error}</p> : null}
{!loading && !error ? (
<ul className="space-y-1">
{filteredEntries.map((entry) => {
const dirCount = cache[entry.path]?.length;
const isDir = entry.type === "dir";
const infoText = isDir
? typeof dirCount === "number"
? `Елементів: ${dirCount}`
: "Папка"
: formatSize(entry.size);

return (
<li key={entry.path}>
<div className="flex w-full items-stretch gap-1 rounded-md border border-border hover:bg-accent/40">
<button
type="button"
className="flex min-w-0 flex-1 items-center gap-3 rounded-l-md px-3 py-2 text-left"
onClick={() => handleEntryClick(entry)}
onContextMenu={(event) => {
if (!isDir) return;
event.preventDefault();
setContextTarget({ path: entry.path, type: entry.type, name: entry.name });
}}
onTouchStart={() => startHold(entry)}
onTouchEnd={cancelHold}
onTouchCancel={cancelHold}
>
<span className="text-muted-foreground">
{isDir ? <Folder className="h-4 w-4" /> : fileIcon(entry.name)}
</span>

<span className="min-w-0 flex-1">
<span className="block truncate text-sm font-medium">{entry.name}</span>
<span className="block text-xs text-muted-foreground">
{infoText}
</span>
</span>
</button>

{isDir ? (
<div className="flex shrink-0 items-center gap-0.5 pr-1">
<button
type="button"
title="Аналізувати структуру папки"
aria-label="Аналізувати структуру папки"
className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
onClick={(e) => {
e.stopPropagation();
analyzePath(entry.path);
}}
>
<Sparkles className="h-4 w-4" />
</button>
<button
type="button"
title="Експортувати папку в набір DRAKON схем"
aria-label="Експорт у набір DRAKON"
className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
onClick={(e) => {
e.stopPropagation();
exportFolderAsDrakonSet(entry.path);
}}
>
<FileDown className="h-4 w-4" />
</button>
</div>
):(
<span className="flex w-3 items-center pr-2 text-sm text-muted-foreground">›</span>
)}
</div>
</li>
);
})}

{filteredEntries.length === 0 ? (
<li className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
Нічого не знайдено
</li>
) : null}
</ul>
) : null}
</div>
);

const previewView = preview ? (
<div className="space-y-3">
<div className="flex items-center justify-between gap-2">
<div>
<h3 className="text-base font-semibold">{preview.name}</h3>
<p className="text-xs text-muted-foreground">{preview.path}</p>
</div>
<Badge variant="outline">{formatSize(preview.size)}</Badge>
</div>

<div className="flex flex-wrap gap-2">
<Button variant="outline" size="sm" onClick={() => analyzePath(preview.path)}>
     Аналізувати файл
</Button>
<Button variant="outline" size="sm" onClick={() => void copyPath(preview.path)}>
     Копіювати шлях
</Button>
{preview.canImportDrakon ? (
<Button size="sm" onClick={() => setIsImportDialogOpen(true)}>
     Імпортувати як схему DRAKON
</Button>
) : null}
</div>

<pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs leading-5">
{preview.content || "(Порожній файл)"}
</pre>
</div>
):(
<div className="flex h-full min-h-[320px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
{loadingPreview ? "Завантаження preview..." : "Оберіть файл для preview"}
</div>
);

if (!hasClientJwt()) {
return <Navigate to="/login" replace />;
}

return (
<div className="min-h-screen bg-background px-3 pb-6 pt-3 text-foreground md:px-6">
<header className="mb-3 flex items-center justify-between gap-2">
<div className="flex min-w-0 items-center gap-2">
<Github className="h-4 w-4 text-muted-foreground" />
<p className="truncate text-sm font-medium md:text-base">{owner}/{repo}</p>
{activeProject?.github && (
<span className="rounded px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/30 font-mono text-[10px] text-amber-400 whitespace-nowrap">
{activeProject.name}
</span>
)}
</div>

<div className="flex items-center gap-2">
<Select value={branch} onValueChange={setBranch}>
<SelectTrigger className="h-9 w-[120px]">
<SelectValue placeholder={isLoadingBranches ? "..." : "branch"} />
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
</header>

{isMobile ? (
<div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
<Button
variant="ghost"
size="sm"
onClick={() => {
if (currentPath) {
void loadPath(getParentPath(currentPath));
} else {
navigate({ to: "/diagrams" });
}
}}
>
← Назад
</Button>
<p className="truncate text-sm text-muted-foreground">/{currentPath || ""}</p>
<span className="w-[60px]" />
</div>
) : null}

<div className="mb-3 flex flex-wrap items-center gap-1 text-sm">
{breadcrumbs.map((crumb, index) => (
<button
key={`${crumb.path}-${index}`}
type="button"
className="rounded px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
onClick={() => void loadPath(crumb.path)}
>
{crumb.name}
</button>
))}
</div>

{isMobile ? (
<div className="space-y-3">{listView}</div>
):(
<div className="flex h-[calc(100vh-190px)] min-h-[520px] gap-3">
<div className="h-full w-[280px] min-w-[240px] max-w-[420px] shrink-0 overflow-auto rounded-md border border-border p-3">
{listView}
</div>
<div className="h-full min-w-0 flex-1 overflow-auto rounded-md border border-border p-3">
{previewView}
</div>
</div>
)}

<Drawer open={isMobilePreviewOpen} onOpenChange={setIsMobilePreviewOpen}>
<DrawerContent>
<DrawerHeader>
<DrawerTitle>Preview файлу</DrawerTitle>
<DrawerDescription>{preview?.path}</DrawerDescription>
</DrawerHeader>
<div className="max-h-[65vh] overflow-auto px-4 pb-2">{previewView}</div>
<DrawerFooter>
<Button variant="outline" onClick={() => setIsMobilePreviewOpen(false)}>
Закрити
</Button>
</DrawerFooter>
</DrawerContent>
</Drawer>

<Dialog open={Boolean(contextTarget)} onOpenChange={(open) => !open &&
setContextTarget(null)}>
<DialogContent>
<DialogHeader>
<DialogTitle>{contextTarget?.name}</DialogTitle>
<DialogDescription>Дії для папки</DialogDescription>
</DialogHeader>
<div className="flex flex-col gap-2">
<Button
type="button"
variant="outline"
onClick={() => {
if (!contextTarget) return;
analyzePath(contextTarget.path);
setContextTarget(null);
}}
>
    Аналізувати папку
</Button>
<Button
type="button"
variant="outline"
onClick={() => {
if (!contextTarget) return;
void copyPath(contextTarget.path);
setContextTarget(null);
}}
>
    Копіювати шлях
</Button>
</div>
</DialogContent>
</Dialog>

<Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
<DialogContent>
<DialogHeader>
<DialogTitle>Імпортувати як схему DRAKON</DialogTitle>
<DialogDescription>Оберіть папку, куди зберегти схему</DialogDescription>
</DialogHeader>

<div className="space-y-2">
<Label htmlFor="import-folder">Папка</Label>
<Select value={importFolderSlug} onValueChange={setImportFolderSlug}>
<SelectTrigger id="import-folder">
<SelectValue placeholder="Оберіть папку" />
</SelectTrigger>
<SelectContent>
{readFoldersFromStorage().map((folder) => (
<SelectItem key={folder.id} value={folder.slug}>
{folder.name}
</SelectItem>
))}
</SelectContent>
</Select>
</div>

<DialogFooter>
<Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
Скасувати
</Button>
<Button onClick={() => void importDiagram()}>Імпортувати</Button>
</DialogFooter>
</DialogContent>
</Dialog>
</div>
);
}

