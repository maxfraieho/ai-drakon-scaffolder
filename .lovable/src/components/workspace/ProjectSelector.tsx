import { useState } from "react";
import { ChevronDown, Loader2, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from
"@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from
"@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";

export function ProjectSelector() {
const { projects, activeProject, setActiveProject, loadProjects, loading } = useProject();
const [managerOpen, setManagerOpen] = useState(false);
const [addOpen, setAddOpen] = useState(false);
const [githubOpen, setGithubOpen] = useState(false);
const [deleting, setDeleting] = useState<string | null>(null);
const [adding, setAdding] = useState(false);
const [form, setForm] = useState({
slug: "", name: "", path: "", description: "",
ghOwner: "", ghRepo: "", ghBranch: "main",
});

const handleAdd = async () => {
if (!form.slug || !form.name || !form.path) {
toast.error("Заповніть slug, name та path");
return;
}
setAdding(true);
try {
const github = form.ghOwner && form.ghRepo
? { owner: form.ghOwner, repo: form.ghRepo, branch: form.ghBranch || "main" }
: undefined;
await api.addProject({ slug: form.slug, name: form.name, path: form.path, description:
form.description, github });
await loadProjects();
setAddOpen(false);
setManagerOpen(false);
setGithubOpen(false);
setForm({ slug: "", name: "", path: "", description: "", ghOwner: "", ghRepo: "", ghBranch: "main"
});
toast.success(Проект "${form.name}" додано);
} catch {
toast.error("Помилка додавання проекту");
} finally {
setAdding(false);
}
};

const handleDelete = async (slug: string) => {
setDeleting(slug);
try {
await api.deleteProject(slug);
await loadProjects();
toast.success("Проект видалено");
} catch {
toast.error("Помилка видалення");
} finally {
setDeleting(null);
}
};

return (
<>
<div className="h-14 px-2 py-1.5">
<p className="font-mono text-[10px] uppercase tracking-[0.14em]
text-[var(--text-muted)]">ACTIVE PROJECT</p>
<div className="mt-1 flex items-center gap-1.5">
<div className="flex-1 min-w-0">
{loading && projects.length === 0 ? (
<div className="flex h-8 items-center gap-2 rounded-[var(--radius-sm)] border
border-[var(--border-subtle)] bg-[var(--bg-base)] px-2">
<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-amber)]" />
<span className="font-mono text-[11px] text-[var(--accent-amber)]">Select project</span>
<Loader2 className="ml-auto h-3 w-3 animate-spin text-[var(--text-muted)]" />
</div>
):(
<Select
value={activeProject?.slug ?? ""}
onValueChange={(slug) => {
const project = projects.find((item) => item.slug === slug);
if (project) setActiveProject(project);
}}
>
<SelectTrigger className="h-8 border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 font-mono
text-[11px] text-[var(--accent-amber)]">
<SelectValue placeholder="Select project" />
</SelectTrigger>
<SelectContent className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
{projects.map((project) => (
<SelectItem key={project.slug} value={project.slug} className="font-mono text-[11px]
text-[var(--text-primary)]">
{project.name}
</SelectItem>
))}
</SelectContent>
</Select>
)}
</div>

<Button
type="button"
size="icon"
variant="outline"
onClick={() => setManagerOpen(true)}
className="h-8 w-8 border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-muted)]
hover:text-[var(--text-primary)]"
aria-label="Управління проектами"
>
<Settings2 className="h-3.5 w-3.5" />
</Button>
</div>
</div>

<Dialog open={managerOpen} onOpenChange={setManagerOpen}>
<DialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] max-w-lg
font-mono">
<DialogHeader>
<DialogTitle className="text-[13px] uppercase tracking-wider text-[var(--text-primary)]">
Управління проектами
</DialogTitle>
<DialogDescription className="text-[11px] text-[var(--text-muted)]">
Оберіть активний проект або видаліть непотрібні
</DialogDescription>
</DialogHeader>

<div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
{projects.map((p) => (
<div
key={p.slug}
className={cn(
"flex items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-2 cursor-pointer
transition-colors",
p.slug === activeProject?.slug
? "border-[var(--accent-amber)]/50 bg-[var(--accent-dim)]"
: "border-[var(--border-subtle)] bg-[var(--bg-base)] hover:bg-white/5"
)}
onClick={() => setActiveProject(p)}
>
<div className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--accent-amber)]/35
bg-[var(--accent-dim)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--accent-amber)]">
{p.slug}
</div>
<p className="flex-1 truncate text-[10px] text-[var(--text-muted)]">{p.path ?? p.description ??
"—"}</p>
<button
type="button"
disabled={deleting === p.slug}
onClick={(e) => { e.stopPropagation(); void handleDelete(p.slug); }}
className="shrink-0 flex items-center justify-center h-6 w-6 rounded text-[var(--text-muted)]
hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
title="Видалити проект"
>
{deleting === p.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2
className="h-3.5 w-3.5" />}
</button>
</div>
))}
</div>

<button
type="button"
onClick={() => { setManagerOpen(false); setAddOpen(true); }}
className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-dashed
border-[var(--border-subtle)] px-3 py-2 text-[11px] text-[var(--text-muted)]
hover:border-[var(--accent-amber)]/40 hover:text-[var(--text-secondary)] transition-colors w-full"
>
<Plus className="h-3.5 w-3.5" />
Додати новий проект
</button>
</DialogContent>
</Dialog>

<Dialog open={addOpen} onOpenChange={setAddOpen}>
<DialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] max-w-md
font-mono">
<DialogHeader>
<DialogTitle className="text-[13px] uppercase tracking-wider text-[var(--text-primary)]">
Новий проект
</DialogTitle>
</DialogHeader>

<div className="flex flex-col gap-3">
<div className="grid grid-cols-2 gap-2">
<div>
<Label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1
block">Slug *</Label>
<Input
value={form.slug}
onChange={(e) => setForm(f => ({...f, slug: e.target.value}))}
placeholder="my-project"
className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
/>
</div>
<div>
<Label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1
block">Назва *</Label>
<Input
value={form.name}
onChange={(e) => setForm(f => ({...f, name: e.target.value}))}
placeholder="My Project"
className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
/>
</div>
</div>

<div>
<Label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1
block">Шлях на сервері *</Label>
<Input
value={form.path}
onChange={(e) => setForm(f => ({...f, path: e.target.value}))}
placeholder="/home/vokov/workspace/my-project"
className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
/>
</div>

<div>
<Label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1
block">Опис</Label>
<Input
value={form.description}
onChange={(e) => setForm(f => ({...f, description: e.target.value}))}
placeholder="Короткий опис проекту"
className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
/>
</div>

<Collapsible open={githubOpen} onOpenChange={setGithubOpen}>
<div className="border-t border-[var(--border-subtle)] pt-2">
<CollapsibleTrigger asChild>
<button
type="button"
className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-1 py-1
text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--bg-base)]"
>
GitHub (необов'язково)
<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", githubOpen &&
"rotate-180")} />
</button>
</CollapsibleTrigger>
<CollapsibleContent className="mt-2 space-y-2">
<div className="grid grid-cols-2 gap-2">
<Input
value={form.ghOwner}
onChange={(e) => setForm(f => ({...f, ghOwner: e.target.value}))}
placeholder="maxfraieho"
className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
/>
<Input
value={form.ghRepo}
onChange={(e) => setForm(f => ({...f, ghRepo: e.target.value}))}
placeholder="Sharon"
className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
/>
</div>
<Input
value={form.ghBranch}
onChange={(e) => setForm(f => ({...f, ghBranch: e.target.value}))}
placeholder="main"
className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
/>
</CollapsibleContent>
</div>
</Collapsible>
</div>

<div className="flex justify-end gap-2 mt-2">
<Button
variant="outline"
size="sm"
onClick={() => setAddOpen(false)}
className="font-mono text-[11px] uppercase tracking-wider"
>
Скасувати
</Button>
<Button
size="sm"
disabled={adding}
onClick={() => void handleAdd()}
className="font-mono text-[11px] uppercase tracking-wider"
>
{adding ? "Додаю…" : "Додати"}
</Button>
</div>
</DialogContent>
</Dialog>
</>
);
}

