import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSharedDiagram } from "@/lib/share-api";
import { PipelineDrakonView } from "@/components/pipelines/PipelineDrakonView";
import { Loader2, Share2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/s/$slug")({
  component: SharedDiagramRoute,
});

function SharedDiagramRoute() {
  const { slug } = Route.useParams();
  const [data, setData] = useState<{ ir: any; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getSharedDiagram(slug);
        if (result) {
          setData(result);
        } else {
          setError("Diagram not found or link has expired.");
        }
      } catch (err) {
        setError("Failed to load the shared diagram.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <p className="mt-4 font-mono text-sm text-slate-400">Loading shared diagram...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-slate-100">
        <AlertTriangle className="h-12 w-12 text-rose-500" />
        <h2 className="mt-4 font-[Outfit] text-2xl">Not Found</h2>
        <p className="mt-2 text-sm text-slate-400">{error || "Diagram not found"}</p>
        <button
          onClick={() => window.location.href = "/"}
          className="mt-6 rounded border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[var(--bg-base)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
            <Share2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-[Outfit] text-lg font-semibold text-[var(--text-main)]">
              {data.title || "Shared Diagram"}
            </h1>
            <p className="text-xs text-[var(--text-muted)]">Read-only view • Shared via DRAKON</p>
          </div>
        </div>
        <button
          onClick={() => window.location.href = "/"}
          className="rounded border border-[var(--border-subtle)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-main)]"
        >
          Create your own
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <PipelineDrakonView
          pipelineName={slug}
          ir={data.ir}
          onSave={async () => {}}
        />
      </div>
    </div>
  );
}
