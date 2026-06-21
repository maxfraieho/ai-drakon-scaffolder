import { useEffect, useState, useMemo } from "react";
import { Search, Layers, AlertCircle, Loader2, Brain, RefreshCw } from "lucide-react";
import type { KnowledgeGraph, GraphNode, Layer } from "@/lib/understand/types";
import { loadKnowledgeGraph } from "@/lib/understand/agent-context";
import { KnowledgeGraphRenderer } from "./KnowledgeGraphRenderer";
import { cn } from "@/lib/utils";

interface KnowledgeGraphPanelProps {
  owner: string;
  repo: string;
  branch?: string;
  token: string;
}

type LoadState = "idle" | "loading" | "loaded" | "empty" | "error";

export function KnowledgeGraphPanel({
  owner,
  repo,
  branch = "main",
  token,
}: KnowledgeGraphPanelProps) {
  const [state, setState] = useState<LoadState>("idle");
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [layersPanelOpen, setLayersPanelOpen] = useState(true);

  const canLoad = Boolean(owner && repo && token);

  async function fetchGraph() {
    if (!canLoad) {
      setState("empty");
      return;
    }
    setState("loading");
    setError("");
    try {
      const kg = await loadKnowledgeGraph(owner, repo, token, branch);
      if (kg && kg.nodes && kg.nodes.length > 0) {
        setGraph(kg);
        setState("loaded");
      } else {
        setState("empty");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setState("error");
    }
  }

  useEffect(() => {
    fetchGraph();
  }, [owner, repo, branch, token]);

  /* ── stats ── */
  const stats = useMemo(() => {
    if (!graph) return null;
    return {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      layers: graph.layers.length,
      analyzedAt: graph.project?.analyzedAt ?? "—",
    };
  }, [graph]);

  /* ── EMPTY STATE ── */
  if (!canLoad || state === "empty") {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg-base)]">
        <div className="text-center max-w-sm px-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
            <Brain className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
            Knowledge Graph
          </h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
            {!canLoad
              ? "Оберіть репозиторій та додайте GitHub Token у налаштуваннях, щоб завантажити граф знань."
              : "Файл .understand-anything/knowledge-graph.json не знайдено у репозиторії. Запустіть аналіз проекту, щоб згенерувати граф."}
          </p>
          {canLoad && (
            <button
              type="button"
              onClick={fetchGraph}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/15 text-amber-500 text-sm font-medium hover:bg-amber-500/25 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Спробувати знову
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── LOADING ── */
  if (state === "loading" || state === "idle") {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <span className="text-sm text-[var(--text-muted)] font-mono">
            Завантаження графа знань…
          </span>
        </div>
      </div>
    );
  }

  /* ── ERROR ── */
  if (state === "error") {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg-base)]">
        <div className="text-center max-w-sm px-4">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-red-400 mb-2">Помилка завантаження</h3>
          <p className="text-sm text-[var(--text-muted)] mb-1">{error}</p>
          <button
            type="button"
            onClick={fetchGraph}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 text-[var(--text-secondary)] text-xs hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Повторити
          </button>
        </div>
      </div>
    );
  }

  /* ── LOADED — render graph ── */
  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--bg-base)]">
      {/* Layers sidebar */}
      <div
        className={cn(
          "shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-[width] duration-200 overflow-hidden flex flex-col",
          layersPanelOpen ? "w-52" : "w-0 border-r-0",
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
            Layers
          </span>
          <span className="text-[9px] text-[var(--text-muted)] font-mono">
            {stats?.layers ?? 0}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5">
          {/* "All" button */}
          <button
            type="button"
            onClick={() => setSelectedLayerId(null)}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded text-[11px] font-mono transition-colors mb-0.5",
              selectedLayerId === null
                ? "bg-amber-500/15 text-amber-500"
                : "text-[var(--text-secondary)] hover:bg-white/5",
            )}
          >
            Усі ({graph!.nodes.length})
          </button>

          {graph!.layers.map((layer: Layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() =>
                setSelectedLayerId(layer.id === selectedLayerId ? null : layer.id)
              }
              className={cn(
                "w-full text-left px-2 py-1.5 rounded text-[11px] font-mono transition-colors mb-0.5",
                selectedLayerId === layer.id
                  ? "bg-amber-500/15 text-amber-500"
                  : "text-[var(--text-secondary)] hover:bg-white/5",
              )}
              title={layer.description}
            >
              <span className="truncate block">{layer.name}</span>
              <span className="text-[9px] text-[var(--text-muted)]">
                {layer.nodeIds.length} nodes
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-2 h-8 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <button
            type="button"
            onClick={() => setLayersPanelOpen((v) => !v)}
            title={layersPanelOpen ? "Сховати layers" : "Показати layers"}
            className={cn(
              "inline-flex items-center justify-center h-5 w-5 rounded transition-colors",
              layersPanelOpen
                ? "text-amber-500 bg-amber-500/10"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5",
            )}
          >
            <Layers className="h-3 w-3" />
          </button>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук по графу…"
              className="w-full h-5 pl-6 pr-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded text-[10px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="ml-auto flex items-center gap-3 font-mono text-[9px] text-[var(--text-muted)]">
            <span>{stats?.nodes} nodes</span>
            <span>{stats?.edges} edges</span>
            <span title={`Analyzed at: ${stats?.analyzedAt}`}>
              {stats?.analyzedAt !== "—"
                ? new Date(stats!.analyzedAt).toLocaleDateString("uk-UA")
                : "—"}
            </span>
            <button
              type="button"
              onClick={fetchGraph}
              title="Оновити граф"
              className="inline-flex items-center justify-center h-4 w-4 rounded hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>

        {/* Graph canvas */}
        <div className="flex-1 min-h-0">
          <KnowledgeGraphRenderer
            graph={graph!}
            searchQuery={searchQuery}
            selectedLayerId={selectedLayerId}
            onNodeClick={(node) => setSelectedNode(node)}
          />
        </div>

        {/* Selected node detail strip */}
        {selectedNode && (
          <div className="shrink-0 flex items-center gap-3 px-3 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] font-mono text-[10px]">
            <span className="text-amber-500 font-semibold">{selectedNode.name}</span>
            <span className="text-[var(--text-muted)] uppercase">{selectedNode.type}</span>
            {selectedNode.filePath && (
              <span className="text-[var(--text-muted)] truncate">📄 {selectedNode.filePath}</span>
            )}
            <span className="text-[var(--text-secondary)] ml-auto truncate max-w-[40%]">
              {selectedNode.summary}
            </span>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
