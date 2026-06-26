import { Bot, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type BuildComponentStatus = "pending" | "connecting" | "building" | "done" | "error";

export type BuildComponentNode = {
  id: string;
  name: string;
  description: string;
  status: BuildComponentStatus;
  errorMessage?: string;
  startedAt?: number;
  outputUrl?: string;
  agentId?: string;
};

type ComponentBuildCardProps = {
  component: BuildComponentNode;
  nowTs: number;
  onRetry: (componentId: string) => void;
  retryPending?: boolean;
};

const statusMeta: Record<
  BuildComponentStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "Pending",
    className: "border-slate-400/25 bg-slate-400/10 text-slate-200",
    icon: Loader2,
  },
  connecting: {
    label: "Connecting",
    className: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
    icon: Loader2,
  },
  building: {
    label: "Building",
    className: "border-amber-400/35 bg-amber-500/15 text-amber-200",
    icon: Loader2,
  },
  done: {
    label: "Done",
    className: "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
    icon: CheckCircle2,
  },
  error: {
    label: "Error",
    className: "border-rose-400/35 bg-rose-500/15 text-rose-200",
    icon: XCircle,
  },
};

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ComponentBuildCard({ component, nowTs, onRetry, retryPending = false }: ComponentBuildCardProps) {
  const meta = statusMeta[component.status];
  const StatusIcon = meta.icon;
  const elapsedMs = component.startedAt ? nowTs - component.startedAt : 0;

  return (
    <Card className="h-full border-white/10 bg-slate-900/45 backdrop-blur-xl">
      <CardHeader className="space-y-3 p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-100">{component.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-slate-300">{component.description}</p>
          </div>
          <Badge className={cn("shrink-0 gap-1 font-normal", meta.className)}>
            <StatusIcon className={cn("h-3.5 w-3.5", component.status === "building" || component.status === "connecting" ? "animate-spin" : "")} />
            {meta.label}
          </Badge>
        </div>

        {component.agentId ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-md border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
            <Bot className="h-3.5 w-3.5" />
            {component.agentId}
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3 p-4 pt-0">
        {component.status === "building" ? (
          <>
            <div className="h-1.5 overflow-hidden rounded bg-white/10">
              <div className="h-full w-1/3 animate-[pulse_1.1s_ease-in-out_infinite] rounded bg-indigo-400" />
            </div>
            <p className="text-xs text-amber-200">Elapsed {formatElapsed(elapsedMs)}</p>
          </>
        ) : null}

        {component.status === "done" ? (
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed
            </span>
            {component.outputUrl ? (
              <a
                href={component.outputUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-200 underline underline-offset-4 hover:text-blue-100"
              >
                View Output
              </a>
            ) : null}
          </div>
        ) : null}

        {component.status === "error" ? (
          <div className="space-y-2">
            <p className="text-xs text-rose-200">{component.errorMessage || "Build failed for this component."}</p>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-300/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
              onClick={() => onRetry(component.id)}
              disabled={retryPending}
            >
              <RefreshCw className={cn("h-4 w-4", retryPending ? "animate-spin" : "")} />
              Retry
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}