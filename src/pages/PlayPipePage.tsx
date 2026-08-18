import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowRight, Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { NewAgentWizard } from "@/components/agents/NewAgentWizard";
import {
  DecompositionWizard,
} from "@/components/playpipe/DecompositionWizard";
import {
  type PlayPipeComponentItem,
  type PlayPipeComponentStatus,
} from "@/components/playpipe/ComponentCard";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type WizardPhase = "empty" | "loading" | "components";

function makeId() {
  return `cmp-${Math.random().toString(36).slice(2, 10)}`;
}

function toAgentSlug(value: string) {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "component-agent";
}

export function PlayPipePage() {
  const { slug } = useParams({ from: "/p/$slug/playpipe" });
  const navigate = useNavigate();

  const [phase, setPhase] = useState<WizardPhase>("empty");
  const [decomposeError, setDecomposeError] = useState<string | null>(null);
  const [componentsQueue, setComponentsQueue] = useState<PlayPipeComponentItem[]>([]);
  const [autoFocusComponentId, setAutoFocusComponentId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeComponentId, setActiveComponentId] = useState<string | null>(null);

  const activeComponent = useMemo(
    () => componentsQueue.find((component) => component.id === activeComponentId) ?? null,
    [componentsQueue, activeComponentId],
  );

  const decomposeMutation = useMutation({
    mutationFn: async (appDescription: string) => {
      const response = await api.decomposeApp(appDescription);
      if (!response.success || !Array.isArray(response.components)) {
        throw new Error(response.message || response.error || "Decomposition failed.");
      }
      return response.components;
    },
    onMutate: () => {
      setDecomposeError(null);
      setPhase("loading");
    },
    onSuccess: (components) => {
      const mapped = components.map((item) => ({
        id: makeId(),
        name: item.name,
        description: item.description,
        status: "pending" as PlayPipeComponentStatus,
      }));
      setComponentsQueue(mapped);
      setAutoFocusComponentId(mapped[0]?.id ?? null);
      setPhase("components");
    },
    onError: () => {
      setDecomposeError("Decomposition failed. Try manually entering components.");
      setPhase("empty");
    },
  });

  const buildMutation = useMutation({
    mutationFn: async () => {
      const payload = componentsQueue
        .filter((component) => component.name.trim().length > 0 && component.description.trim().length > 0)
        .map((component) => ({
          name: component.name.trim(),
          description: component.description.trim(),
          agentId: component.agentId ?? toAgentSlug(component.name),
        }));

      const response = await api.startPlayPipeBuild(payload);
      const buildId = response.buildId;
      if (!response.success || !buildId) {
        throw new Error(response.message || response.error || "Failed to start build.");
      }
      return buildId;
    },
    onSuccess: (buildId) => {
      toast.success("PlayPipe build started.");
      navigate({ to: `/p/${slug}/playpipe/build?buildId=${encodeURIComponent(buildId)}` as never });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to start build.");
    },
  });

  const canStartBuild =
    componentsQueue.length > 0 &&
    componentsQueue.every(
      (component) =>
        component.status === "has-agent" &&
        component.name.trim().length > 0 &&
        component.description.trim().length > 0,
    );

  const assignAgent = (componentId: string) => {
    setActiveComponentId(componentId);
    setWizardOpen(true);
  };

  const addComponent = () => {
    const created = {
      id: makeId(),
      name: "",
      description: "",
      status: "pending" as PlayPipeComponentStatus,
    };
    setComponentsQueue((prev) => [...prev, created]);
    setAutoFocusComponentId(created.id);
  };

  return (
    <section className="astryx-migrated relative min-h-[calc(100vh-8rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(99,102,241,0.2),transparent_38%),radial-gradient(circle_at_90%_12%,rgba(168,85,247,0.2),transparent_40%),radial-gradient(circle_at_50%_95%,rgba(59,130,246,0.17),transparent_38%)]" />

      <div className="relative z-10 grid grid-cols-1 gap-4 xl:grid-cols-10">
        <div className="xl:col-span-4">
          <DecompositionWizard
            phase={phase}
            decomposePending={decomposeMutation.isPending}
            decomposeError={decomposeError}
            componentsQueue={componentsQueue}
            autoFocusComponentId={autoFocusComponentId}
            onDecompose={async (description) => {
              await decomposeMutation.mutateAsync(description);
            }}
            onAddManual={() => {
              setDecomposeError(null);
              setPhase("components");
              if (componentsQueue.length === 0) {
                const created = {
                  id: makeId(),
                  name: "",
                  description: "",
                  status: "pending" as PlayPipeComponentStatus,
                };
                setComponentsQueue([created]);
                setAutoFocusComponentId(created.id);
              }
            }}
            onAddComponent={addComponent}
            onNameChange={(id, value) => {
              setComponentsQueue((prev) =>
                prev.map((component) => (component.id === id ? { ...component, name: value } : component)),
              );
            }}
            onDescriptionChange={(id, value) => {
              setComponentsQueue((prev) =>
                prev.map((component) =>
                  component.id === id ? { ...component, description: value } : component,
                ),
              );
            }}
            onAssignAgent={assignAgent}
            onDeleteComponent={(id) => {
              setComponentsQueue((prev) => prev.filter((component) => component.id !== id));
            }}
            onStartBuild={async () => {
              await buildMutation.mutateAsync();
            }}
            canStartBuild={canStartBuild}
            buildPending={buildMutation.isPending}
          />
        </div>

        <div className="xl:col-span-6">
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-xl md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-[Outfit] text-xl text-slate-100">Component Dependency Graph</h2>
                <p className="mt-1 text-sm text-slate-300">Pipeline visualization of component build order.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">
                <Sparkles className="h-3.5 w-3.5" />
                {componentsQueue.length} nodes
              </span>
            </div>

            <div className="relative min-h-[460px] rounded-lg border border-white/10 bg-black/25 p-4">
              {componentsQueue.length === 0 ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center text-slate-400">
                  <Sparkles className="h-8 w-8 text-slate-500" />
                  <p className="max-w-sm text-sm">Decompose an app description to render your component flow graph here.</p>
                </div>
              ) : (
                <div className="relative flex min-h-[420px] flex-col gap-5">
                  {componentsQueue.map((component, index) => {
                    const hasAgent = component.status === "has-agent" || Boolean(component.agentId);

                    return (
                      <div key={component.id} className="relative flex items-center gap-3 pl-2">
                        <div
                          className={cn(
                            "relative w-full rounded-lg border bg-slate-900/75 p-3",
                            hasAgent
                              ? "border-blue-400/45 shadow-[0_0_30px_rgba(59,130,246,0.25)]"
                              : "border-white/15",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-100">
                                {component.name.trim() || `Component ${index + 1}`}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-300">{component.description.trim() || "No description yet."}</p>
                            </div>
                            {hasAgent ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
                                <Bot className="h-3.5 w-3.5" />
                                Agent
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {index < componentsQueue.length - 1 ? (
                          <div className="pointer-events-none absolute left-6 top-[calc(100%+2px)] flex h-5 items-center">
                            <div className="h-5 border-l border-indigo-300/40" />
                            <ArrowRight className="-ml-2 h-3.5 w-3.5 text-indigo-300/60" />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <NewAgentWizard
        slug={slug}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initialAgentName={activeComponent ? toAgentSlug(activeComponent.name) : ""}
        initialDescription={activeComponent?.description ?? ""}
        onSaved={(agentName) => {
          if (!activeComponentId) return;
          setComponentsQueue((prev) =>
            prev.map((component) =>
              component.id === activeComponentId
                ? { ...component, status: "has-agent", agentId: agentName }
                : component,
            ),
          );
          toast.success(`Agent ${agentName} assigned.`);
        }}
      />
    </section>
  );
}
