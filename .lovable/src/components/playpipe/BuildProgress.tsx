import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2, PlugZap } from "lucide-react";
import { toast } from "sonner";

import { ComponentBuildCard, type BuildComponentNode, type BuildComponentStatus } from "@/components/playpipe/ComponentBuildCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getAccessToken } from "@/lib/auth";
import { getProject } from "@/lib/appwrite-projects";
import { api } from "@/lib/api";
import { resolveWorkerUrl } from "@/lib/worker-url";

type BuildProgressProps = {
  slug: string;
  buildId: string;
};

type StreamPayload = {
  action?: string;
  componentId?: string;
  status?: BuildComponentStatus;
  errorMessage?: string;
  projectName?: string;
  component?: {
    id?: string;
    name?: string;
    description?: string;
    status?: BuildComponentStatus;
    outputUrl?: string;
    agentId?: string;
  };
  components?: Array<{
    id?: string;
    name?: string;
    description?: string;
    status?: BuildComponentStatus;
    outputUrl?: string;
    agentId?: string;
    errorMessage?: string;
  }>;
};

function coerceStatus(input: unknown): BuildComponentStatus {
  if (input === "pending" || input === "connecting" || input === "building" || input === "done" || input === "error") {
    return input;
  }
  return "pending";
}

function upsertComponent(
  prev: BuildComponentNode[],
  id: string,
  patch: Partial<BuildComponentNode>,
  fallbackName?: string,
): BuildComponentNode[] {
  const now = Date.now();
  const found = prev.find((node) => node.id === id);
  if (!found) {
    return [
      ...prev,
      {
        id,
        name: fallbackName || id,
        description: "",
        status: patch.status ?? "pending",
        startedAt: patch.status === "building" ? now : undefined,
        ...patch,
      },
    ];
  }

  const nextStatus = patch.status ?? found.status;
  return prev.map((node) => {
    if (node.id !== id) return node;
    return {
      ...node,
      ...patch,
      status: nextStatus,
      startedAt:
        nextStatus === "building"
          ? node.startedAt ?? Date.now()
          : patch.startedAt ?? node.startedAt,
    };
  });
}

export function BuildProgress({ slug, buildId }: BuildProgressProps) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const [components, setComponents] = useState<BuildComponentNode[]>([]);
  const [streamStatus, setStreamStatus] = useState<"connecting" | "live" | "reconnecting" | "lost">("connecting");
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [globalSuccess, setGlobalSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());

  const { data: project } = useQuery({
    queryKey: ["project", slug],
    queryFn: () => getProject(slug),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const handleStreamEvent = useCallback((payload: StreamPayload) => {
    if (!payload || typeof payload !== "object") return;

    if (Array.isArray(payload.components) && payload.components.length > 0) {
      setComponents((prev) => {
        let next = [...prev];
        for (const item of payload.components ?? []) {
          const id = item.id;
          if (!id) continue;
          next = upsertComponent(next, id, {
            name: item.name,
            description: item.description,
            status: coerceStatus(item.status),
            outputUrl: item.outputUrl,
            agentId: item.agentId,
            errorMessage: item.errorMessage,
          }, item.name);
        }
        return next;
      });
    }

    if (payload.action === "status_update") {
      const id = payload.componentId || payload.component?.id;
      if (!id) return;
      const nextStatus = coerceStatus(payload.status ?? payload.component?.status);
      setComponents((prev) =>
        upsertComponent(
          prev,
          id,
          {
            status: nextStatus,
            name: payload.component?.name,
            description: payload.component?.description,
            outputUrl: payload.component?.outputUrl,
            agentId: payload.component?.agentId,
          },
          payload.component?.name,
        ),
      );
      return;
    }

    if (payload.action === "error_halt") {
      const id = payload.componentId || payload.component?.id;
      if (!id) return;
      setComponents((prev) =>
        upsertComponent(
          prev,
          id,
          {
            status: "error",
            name: payload.component?.name,
            description: payload.component?.description,
            errorMessage: payload.errorMessage || payload.component?.description || "Build halted with an error.",
          },
          payload.component?.name,
        ),
      );
      return;
    }

    if (payload.action === "build_complete_global") {
      setGlobalSuccess(true);
      setStreamStatus("live");
      stoppedRef.current = true;
      closeStream();
    }
  }, [closeStream]);

  const connectStream = useCallback(() => {
    closeStream();
    const base = resolveWorkerUrl();
    const jwt = getAccessToken();
    const tokenQuery = jwt ? `?token=${encodeURIComponent(jwt)}` : "";
    const es = new EventSource(`${base}/v1/playpipe/build/${encodeURIComponent(buildId)}/stream${tokenQuery}`);
    eventSourceRef.current = es;

    setStreamStatus((prev) => (prev === "reconnecting" ? "reconnecting" : "connecting"));

    es.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setStreamStatus("live");
      setGlobalError(null);
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as StreamPayload;
        handleStreamEvent(payload);
      } catch {
        // ignore malformed payloads
      }
    };

    es.onerror = () => {
      if (stoppedRef.current) {
        closeStream();
        return;
      }

      closeStream();
      reconnectAttemptsRef.current += 1;
      if (reconnectAttemptsRef.current > 3) {
        setStreamStatus("lost");
        setGlobalError("Connection lost");
        return;
      }

      setStreamStatus("reconnecting");
      reconnectTimerRef.current = window.setTimeout(() => {
        connectStream();
      }, 2000);
    };
  }, [buildId, closeStream, handleStreamEvent]);

  useEffect(() => {
    stoppedRef.current = false;
    setGlobalSuccess(false);
    setGlobalError(null);
    setComponents([]);
    setStreamStatus("connecting");
    reconnectAttemptsRef.current = 0;
    connectStream();

    return () => {
      stoppedRef.current = true;
      closeStream();
    };
  }, [buildId, closeStream, connectStream]);

  const completedCount = useMemo(
    () => components.filter((node) => node.status === "done").length,
    [components],
  );
  const totalCount = components.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const retryMutation = useMutation({
    mutationFn: async (componentId: string) => {
      await api.retryPlayPipeComponent(buildId, componentId);
      return componentId;
    },
    onSuccess: (componentId) => {
      setComponents((prev) =>
        upsertComponent(prev, componentId, { status: "building", errorMessage: undefined, startedAt: Date.now() }),
      );
      toast.success("Retry started.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Retry failed.");
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => api.stopPlayPipeBuild(buildId),
    onSuccess: () => {
      stoppedRef.current = true;
      closeStream();
      setShowStopConfirm(false);
      toast.success("Build stopped.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to stop build.");
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => api.commitPlayPipeBuild(buildId),
    onSuccess: () => {
      toast.success("Build committed to GitHub.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Commit failed.");
    },
  });

  const projectName = project?.name || slug;

  return (
    <div className="space-y-5">
      <header className="rounded-xl border border-white/10 bg-slate-900/45 p-4 backdrop-blur-xl md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-[Outfit] text-2xl text-slate-100">Building {projectName}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {completedCount}/{totalCount || 0} components completed
            </p>
          </div>

          {streamStatus === "reconnecting" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Reconnecting...
            </span>
          ) : null}

          {streamStatus === "lost" ? (
            <Button
              size="sm"
              variant="outline"
              className="border-rose-400/35 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
              onClick={() => {
                reconnectAttemptsRef.current = 0;
                setStreamStatus("reconnecting");
                connectStream();
              }}
            >
              <PlugZap className="h-4 w-4" />
              Resume
            </Button>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <Progress value={progress} className="h-2 bg-white/10" />
          <p className="text-xs text-slate-400">Overall progress: {progress}%</p>
        </div>
      </header>

      {globalError ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {globalError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {components.map((component) => (
          <ComponentBuildCard
            key={component.id}
            component={component}
            nowTs={nowTs}
            onRetry={(componentId) => void retryMutation.mutateAsync(componentId)}
            retryPending={retryMutation.isPending && retryMutation.variables === component.id}
          />
        ))}
      </div>

      {globalSuccess ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-5 text-emerald-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">All components built successfully</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500" asChild>
                <Link to="/p/$slug/overview" params={{ slug }}>
                  View Solution
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-300/40 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/20"
                onClick={() => void commitMutation.mutateAsync()}
                disabled={commitMutation.isPending}
              >
                {commitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Commit to GitHub
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="rounded-xl border border-white/10 bg-slate-900/45 p-4 backdrop-blur-xl md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">
            {totalCount === 0
              ? "Waiting for build events..."
              : `${completedCount} done, ${components.filter((c) => c.status === "error").length} errors, ${components.filter((c) => c.status === "building").length} building`}
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/p/$slug/playpipe" params={{ slug }}>
                Back to PlayPipe
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-300/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
              onClick={() => setShowStopConfirm(true)}
              disabled={stopMutation.isPending || globalSuccess}
            >
              {stopMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Stop All
            </Button>
          </div>
        </div>
      </footer>

      <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop the build?</AlertDialogTitle>
            <AlertDialogDescription>
              Progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void stopMutation.mutateAsync()}>
              Stop Build
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}