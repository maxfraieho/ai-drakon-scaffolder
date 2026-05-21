import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  nodeName: string;
  state: Record<string, unknown>;
  onResume: (stateOverride: Record<string, unknown>) => void;
  className?: string;
}

export function NodeStateInspector({ nodeName, state, onResume, className }: Props) {
  const [stateJson, setStateJson] = useState(() => JSON.stringify(state, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleResumeWithChanges = () => {
    try {
      const override = JSON.parse(stateJson);
      setJsonError(null);
      onResume(override);
    } catch (e: unknown) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]",
        className,
      )}
    >
      <div className="px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-yellow-500">
          BREAKPOINT
        </span>
        <div className="font-mono text-[11px] text-[var(--text-primary)] mt-0.5">
          @ {nodeName}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-3 gap-2 min-h-0">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] shrink-0">
          State (редагується)
        </span>
        <Textarea
          value={stateJson}
          onChange={(e) => setStateJson(e.target.value)}
          className="flex-1 resize-none font-mono text-[10px] bg-[var(--bg-base)] border-[var(--border-subtle)] min-h-0"
          spellCheck={false}
        />
        {jsonError && (
          <div className="flex items-center gap-1 text-red-400 text-[10px] font-mono shrink-0">
            <AlertTriangle className="h-3 w-3" /> {jsonError}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-[var(--border-subtle)] flex flex-col gap-1.5 shrink-0">
        <Button
          onClick={handleResumeWithChanges}
          className="w-full h-7 bg-[var(--accent-amber)] text-black text-[11px] font-mono hover:brightness-110"
        >
          <Play className="h-3 w-3 mr-1" /> Продовжити зі змінами
        </Button>
        <Button
          onClick={() => onResume({})}
          variant="outline"
          className="w-full h-7 text-[11px] font-mono border-[var(--border-subtle)]"
        >
          Продовжити без змін
        </Button>
      </div>
    </div>
  );
}
