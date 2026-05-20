import { useEffect, useState } from "react";
import { GitBranch, RefreshCw, Loader2, FileCode2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface DrakonIrPanelProps {
  onSelectDiagram: (name: string, diagram: object) => void;
  selectedName: string | null;
}

export function DrakonIrPanel({ onSelectDiagram, selectedName }: DrakonIrPanelProps) {
  const [diagrams, setDiagrams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listDrakonIr();
      setDiagrams(data.diagrams ?? []);
    } catch {
      setError("Не вдалося завантажити список");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSelect = async (name: string) => {
    if (loadingItem) return;
    setLoadingItem(name);
    try {
      const data = await api.getDrakonIr(name);
      if (data.success && data.diagram) {
        onSelectDiagram(name, data.diagram);
      }
    } catch { /* ignore */ } finally {
      setLoadingItem(null);
    }
  };

  const filtered = diagrams.filter(
    (d) => !search.trim() || d.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-[var(--bg-surface)]">
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-2.5">
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3 w-3 text-[var(--accent-amber)]" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">DRAKON IR</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--accent-amber)] opacity-80 animate-pulse" />
          <button onClick={load} disabled={loading} className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-40">
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </button>
        </div>
      </div>
      <div className="shrink-0 border-b border-[var(--border-subtle)] px-2 py-1.5">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Фільтр..." className="w-full rounded-sm bg-[var(--bg-base)] px-2 py-1 font-mono text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border border-transparent focus:border-[var(--accent-amber)]/40" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-mono text-[10px]">Завантаження...</span>
          </div>
        ) : error ? (
          <div className="px-3 py-4 font-mono text-[10px] text-red-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-[var(--text-muted)]">
            <FileCode2 className="h-5 w-5" />
            <span className="font-mono text-[10px]">Немає схем</span>
          </div>
        ) : (
          <ul className="py-1">
            {filtered.map((name) => (
              <li key={name}>
                <button onClick={() => handleSelect(name)} disabled={!!loadingItem}
                  className={cn("group flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--bg-elevated)]",
                    selectedName === name && "bg-[var(--bg-elevated)] border-l-2 border-[var(--accent-amber)]")}>
                  <div className="flex min-w-0 items-center gap-1.5">
                    {loadingItem === name
                      ? <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--accent-amber)]" />
                      : <FileCode2 className={cn("h-3 w-3 shrink-0", selectedName === name ? "text-[var(--accent-amber)]" : "text-[var(--text-muted)]")} />}
                    <span className={cn("truncate font-mono text-[10px]", selectedName === name ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>{name}</span>
                  </div>
                  <Download className="h-3 w-3 shrink-0 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {diagrams.length > 0 && !loading && (
        <div className="shrink-0 border-t border-[var(--border-subtle)] px-2.5 py-1">
          <span className="font-mono text-[9px] text-[var(--text-muted)]">{diagrams.length} схем · клік = відкрити</span>
        </div>
      )}
    </aside>
  );
}
