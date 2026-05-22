import { useState, useRef } from "react";
import { FileCode, Github, Play, ArrowRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { startAnalysis, pollJob, type AnalyzeResult } from "@/lib/pipeline-api";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export default function CodePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [filePath, setFilePath] = useState("untitled.py");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const analyze = async () => {
    if (!code.trim()) { toast.error("Вставте код для аналізу"); return; }
    setAnalyzing(true);
    setResult(null);
    try {
      const { job_id } = await startAnalysis(code, filePath);
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 60) {
          clearInterval(pollRef.current!);
          setAnalyzing(false);
          toast.error("Timeout — агент не відповів");
          return;
        }
        try {
          const status = await pollJob<AnalyzeResult>(job_id);
          if (status.status === "done" && status.result) {
            clearInterval(pollRef.current!);
            setAnalyzing(false);
            setResult(status.result);
          } else if (status.status === "error") {
            clearInterval(pollRef.current!);
            setAnalyzing(false);
            toast.error(status.error ?? "Помилка аналізу");
          }
        } catch {}
      }, 1500);
    } catch {
      setAnalyzing(false);
      toast.error("Не вдалося запустити аналіз");
    }
  };

  const goToDiagram = (fn: AnalyzeResult["drakon_ir"][number]) => {
    sessionStorage.setItem("pending_ir", JSON.stringify(fn));
    navigate({ to: "/diagrams" });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-base)]">
      {/* Editor */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 px-3 h-9 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
          <FileCode className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
          <input
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            className="font-mono text-[11px] text-[var(--text-secondary)] bg-transparent outline-none flex-1 min-w-0"
            placeholder="path/to/file.py"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2"
            onClick={copyCode}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2"
          >
            <Github className="h-3 w-3" />
            GitHub
          </Button>
        </div>

        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={"# Вставте Python-код для аналізу\n\ndef my_function(x, y):\n    if x > 0:\n        return x + y\n    return y"}
          className={cn(
            "flex-1 resize-none rounded-none border-0 bg-[var(--bg-base)] font-mono text-[12px] text-[var(--text-primary)] p-4",
            "focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed",
            "placeholder:text-[var(--text-muted)] placeholder:opacity-50",
          )}
          spellCheck={false}
        />
      </div>

      {/* Right panel: Pipeline A mini */}
      <div className="w-56 shrink-0 flex flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Pipeline A
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <Button
            onClick={analyze}
            disabled={analyzing || !code.trim()}
            className="w-full h-8 font-mono text-[11px] gap-2 bg-[var(--accent-amber)] text-[#1a0a00] hover:brightness-110"
          >
            <Play className="h-3 w-3" />
            {analyzing ? "Аналізує..." : "Аналізувати"}
          </Button>

          {analyzing && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-amber)] animate-pulse" />
                <span className="font-mono text-[10px] text-[var(--text-muted)]">architect-agent</span>
              </div>
              <div className="font-mono text-[9px] text-[var(--text-muted)] pl-3.5">
                Обчислення CC...
              </div>
            </div>
          )}

          {result && result.drakon_ir.length > 0 && (
            <div className="space-y-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Функції ({result.drakon_ir.length})
              </div>
              {result.drakon_ir.map((fn) => (
                <button
                  key={fn.name}
                  type="button"
                  onClick={() => goToDiagram(fn)}
                  className="w-full text-left rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-2 hover:border-[var(--accent-amber)] hover:bg-[var(--accent-dim)] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-mono text-[10px] text-[var(--text-primary)] break-all leading-tight">
                      {fn.name.split(".").pop()}
                    </span>
                    <ArrowRight className="h-3 w-3 text-[var(--text-muted)] group-hover:text-[var(--accent-amber)] shrink-0 mt-0.5" />
                  </div>
                  {fn.cyclomatic_complexity !== undefined && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn(
                        "font-mono text-[9px] px-1 rounded",
                        fn.cyclomatic_complexity <= 10 && "bg-green-500/15 text-green-400",
                        fn.cyclomatic_complexity > 10 && fn.cyclomatic_complexity <= 20 && "bg-yellow-500/15 text-yellow-400",
                        fn.cyclomatic_complexity > 20 && "bg-red-500/15 text-red-400",
                      )}>
                        CC={fn.cyclomatic_complexity}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">
                        {result.tree_level}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
