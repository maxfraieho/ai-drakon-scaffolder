import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw, Network, List, Columns, X, Loader2, AlertCircle,
  Search, FileText, ChevronRight, ChevronDown,
} from "lucide-react";
import { ExecutionGraph } from "@/components/docs/garden/ExecutionGraph";
import { NoteRenderer } from "@/components/docs/garden/NoteRenderer";
import { fetchNotesList, fetchNote } from "@/lib/garden/notesApi";
import { getRootFolder } from "@/lib/garden/graphTypes";
import type { GraphNode, GraphEdge, NoteListItem } from "@/lib/garden/graphTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ViewMode = "graph" | "list" | "split";

const WIKI_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

function extractWikilinks(content: string): string[] {
  const links: string[] = [];
  let m;
  while ((m = WIKI_RE.exec(content)) !== null) links.push(m[1].trim());
  WIKI_RE.lastIndex = 0;
  return links;
}

function buildBaseGraph(notes: NoteListItem[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const slugSet = new Set(notes.map((n) => n.slug));
  const nodes: GraphNode[] = notes.map((n) => ({
    slug: n.slug,
    title: n.title ?? n.slug.split("/").pop() ?? n.slug,
    exists: true,
  }));

  // Folder-based star topology — connects siblings within same root folder
  const byFolder = new Map<string, string[]>();
  for (const n of notes) {
    const f = getRootFolder(n.slug);
    if (!byFolder.has(f)) byFolder.set(f, []);
    byFolder.get(f)!.push(n.slug);
  }

  const edges: GraphEdge[] = [];
  for (const [, slugs] of byFolder) {
    if (slugs.length < 2) continue;
    // Connect first note in folder to all others (hub spoke)
    for (let i = 1; i < slugs.length; i++) {
      edges.push({ source: slugs[0], target: slugs[i], type: "structural" });
    }
    // Deeper connections within folder
    for (let i = 1; i + 1 < slugs.length; i++) {
      if (i % 3 === 0) {
        edges.push({ source: slugs[i], target: slugs[i + 1], type: "navigational" });
      }
    }
  }

  void slugSet; // used implicitly in edge building
  return { nodes, edges };
}

function enrichWithWikilinks(
  base: { nodes: GraphNode[]; edges: GraphEdge[] },
  slug: string,
  links: string[],
  allSlugs: Set<string>,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const extraEdges: GraphEdge[] = [];
  const extraNodes: GraphNode[] = [];
  for (const target of links) {
    const exists = allSlugs.has(target);
    if (!base.nodes.find((n) => n.slug === target)) {
      extraNodes.push({ slug: target, title: target.split("/").pop() ?? target, exists });
    }
    if (!base.edges.find((e) => e.source === slug && e.target === target)) {
      extraEdges.push({ source: slug, target, type: "semantic" });
    }
  }
  return {
    nodes: [...base.nodes, ...extraNodes],
    edges: [...base.edges, ...extraEdges],
  };
}

interface NoteTreeItem {
  slug: string;
  title: string;
  folder: string;
}

function groupByFolder(notes: NoteListItem[]): Map<string, NoteTreeItem[]> {
  const map = new Map<string, NoteTreeItem[]>();
  for (const n of notes) {
    const f = getRootFolder(n.slug);
    if (!map.has(f)) map.set(f, []);
    map.get(f)!.push({ slug: n.slug, title: n.title ?? n.slug, folder: f });
  }
  return map;
}

export function GardenPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchNotesList();
      setNotes(list);
      setGraph(buildBaseGraph(list));
      const folders = new Set(list.map((n) => getRootFolder(n.slug)));
      setExpandedFolders(folders);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Помилка завантаження";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNotes(); }, [loadNotes]);

  const openNote = useCallback(async (slug: string) => {
    setSelectedSlug(slug);
    setNoteLoading(true);
    try {
      const note = await fetchNote(slug);
      if (!note) { setNoteContent(""); return; }
      setNoteContent(note.content);
      // Enrich graph with wikilinks from this note
      const links = extractWikilinks(note.content);
      if (links.length > 0) {
        const allSlugs = new Set(notes.map((n) => n.slug));
        setGraph((g) => enrichWithWikilinks(g, slug, links, allSlugs));
      }
    } catch {
      toast.error("Не вдалося завантажити нотатку");
    } finally {
      setNoteLoading(false);
    }
  }, [notes]);

  const allSlugs = useMemo(() => new Set(notes.map((n) => n.slug)), [notes]);

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter((n) =>
      n.slug.toLowerCase().includes(q) || (n.title ?? "").toLowerCase().includes(q)
    );
  }, [notes, search]);

  const grouped = useMemo(() => groupByFolder(filteredNotes), [filteredNotes]);
  const sortedFolders = useMemo(() => [...grouped.keys()].sort(), [grouped]);

  const toggleFolder = (f: string) =>
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });

  const showGraph = viewMode === "graph" || viewMode === "split";
  const showList = viewMode === "list" || viewMode === "split";

  return (
    <div className="flex h-full flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* TOP BAR */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Garden
        </span>
        <span className="h-3 w-px bg-[var(--border-subtle)]" />
        <div className="flex items-center gap-0.5">
          {(["list", "split", "graph"] as ViewMode[]).map((m) => {
            const Icon = m === "list" ? List : m === "graph" ? Network : Columns;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] transition-colors",
                  viewMode === m
                    ? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
                    : "hover:bg-white/5 hover:text-[var(--text-secondary)]",
                )}
                title={m}
              >
                <Icon className="h-3 w-3" />
              </button>
            );
          })}
        </div>
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          {notes.length} нотаток
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => void loadNotes()}
            disabled={loading}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* BODY */}
      {error ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="font-mono text-[12px]">{error}</span>
          <Button size="sm" variant="outline" onClick={() => void loadNotes()} className="ml-2 h-6 text-[11px]">
            Повторити
          </Button>
        </div>
      ) : loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-mono text-[11px]">Завантаження графу…</span>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* NOTE LIST */}
          {showList && (
            <div className={cn(
              "flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]",
              viewMode === "list" ? "flex-1" : "w-56 shrink-0",
            )}>
              <div className="p-2 border-b border-[var(--border-subtle)]">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-muted)]" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Пошук…"
                    className="h-6 pl-6 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-1">
                  {sortedFolders.map((folder) => {
                    const items = grouped.get(folder) ?? [];
                    const isExpanded = expandedFolders.has(folder);
                    return (
                      <div key={folder}>
                        <button
                          type="button"
                          onClick={() => toggleFolder(folder)}
                          className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:bg-white/5"
                        >
                          {isExpanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                          {folder === "_root" ? "root" : folder}
                          <span className="ml-auto text-[9px] opacity-50">{items.length}</span>
                        </button>
                        {isExpanded && items.map((item) => (
                          <button
                            key={item.slug}
                            type="button"
                            onClick={() => void openNote(item.slug)}
                            className={cn(
                              "flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-left font-mono text-[11px] truncate transition-colors",
                              selectedSlug === item.slug
                                ? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
                                : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
                            )}
                          >
                            <FileText className="h-3 w-3 shrink-0 opacity-50" />
                            <span className="truncate">{item.title}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* GRAPH */}
          {showGraph && (
            <div className={cn(
              "relative min-h-0 bg-zinc-950",
              viewMode === "graph" ? "flex-1" : "flex-1",
            )}>
              {graph.nodes.length > 0 ? (
                <ExecutionGraph
                  nodes={graph.nodes}
                  edges={graph.edges}
                  onNodeClick={(slug) => void openNote(slug)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
                  <span className="font-mono text-[11px]">Немає нотаток</span>
                </div>
              )}
            </div>
          )}

          {/* NOTE PANEL */}
          {selectedSlug && (
            <div className="flex w-[400px] shrink-0 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="flex h-9 items-center justify-between border-b border-[var(--border-subtle)] px-3">
                <span className="font-mono text-[10px] text-[var(--text-muted)] truncate flex-1">
                  {selectedSlug}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSlug(null)}
                  className="ml-2 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <ScrollArea className="flex-1">
                {noteLoading ? (
                  <div className="flex h-32 items-center justify-center gap-2 text-[var(--text-muted)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="font-mono text-[11px]">Завантаження…</span>
                  </div>
                ) : noteContent ? (
                  <div className="p-4 prose prose-sm prose-invert max-w-none">
                    <NoteRenderer
                      content={noteContent}
                      onNavigate={(slug) => {
                        if (allSlugs.has(slug)) void openNote(slug);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-[var(--text-muted)]">
                    <span className="font-mono text-[11px]">Нотатка порожня</span>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
