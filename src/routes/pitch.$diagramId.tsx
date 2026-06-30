import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { fetchPipeline } from "@/lib/pipeline-config-api";
import { pipelineToIR } from "@/lib/pipeline-to-drakon";
import { PipelineDrakonView } from "@/components/pipelines/PipelineDrakonView";
import { Play, Pause, X, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pitch/$diagramId")({
  component: PitchModeRoute,
});

function PitchModeRoute() {
  const { diagramId } = Route.useParams();
  const [data, setData] = useState<{ ir: any; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Load the pipeline from server
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const config = await fetchPipeline(diagramId);
        if (config) {
          setData({ ir: pipelineToIR(config), title: config.name });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [diagramId]);

  // Handle ESC to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.history.back();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Animation and speech logic
  useEffect(() => {
    let raf: number;
    let start = Date.now();
    let currentVoiceDuration = 30000; // 30s pitch

    if (playing) {
      const loop = () => {
        const elapsed = Date.now() - start;
        const p = Math.min(elapsed / currentVoiceDuration, 1);
        setProgress(p);
        
        if (p < 1) {
          raf = requestAnimationFrame(loop);
        } else {
          setPlaying(false);
          setProgress(0);
        }
      };
      raf = requestAnimationFrame(loop);
      
      // trigger AI voice
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance("Це алгоритм " + data?.title + ". Починаємо процес.");
        utterance.lang = "uk-UA";
        speechSynthesis.speak(utterance);
      }
    } else {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
  }, [playing, data]);

  if (loading) return null;

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Диаграму не знайдено
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      {/* Header Controls */}
      <div className="absolute top-0 z-10 flex w-full items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-6 py-4 transition-opacity hover:opacity-100 opacity-0 group">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPlaying(!playing)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105"
          >
            {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
          <div>
            <h1 className="font-[Outfit] text-xl font-bold tracking-tight text-white">
              {data.title}
            </h1>
            <p className="text-sm font-medium text-indigo-300 flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5" /> AI Presentation Mode
            </p>
          </div>
        </div>
        
        <button
          onClick={() => window.history.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 z-10 h-1.5 w-full bg-slate-800">
        <div 
          className="h-full bg-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(99,102,241,0.8)]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Canvas */}
      <div className={cn("flex-1 overflow-hidden transition-transform duration-1000", playing ? "scale-[1.02]" : "scale-100")}>
        <PipelineDrakonView
          pipelineName={data.title}
          ir={data.ir}
          onSave={async () => {}}
        />
      </div>
      
      {/* Floating play hint */}
      {!playing && progress === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="animate-pulse rounded-full bg-indigo-500/20 p-8 shadow-[0_0_50px_rgba(99,102,241,0.3)]">
            <Play className="h-16 w-16 text-white opacity-80" />
          </div>
        </div>
      )}
    </div>
  );
}
