import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { AlertCircle, Bot, Loader2, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { NewAgentWizard } from "@/components/agents/NewAgentWizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { api } from "@/lib/api";

type AgentCardStatus = "live" | "draft" | "error";

function inferStatus(name: string, index: number): AgentCardStatus {
  const normalized = name.toLowerCase();
  if (normalized.includes("error") || normalized.includes("failed")) return "error";
  if (normalized.includes("live") || normalized.includes("prod") || index % 3 === 0) return "live";
  return "draft";
}

const statusMeta: Record<AgentCardStatus, { label: string; className: string }> = {
  live: { label: "Live", className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" },
  draft: { label: "Draft", className: "border-amber-400/30 bg-amber-500/10 text-amber-200" },
  error: { label: "Error", className: "border-rose-400/30 bg-rose-500/10 text-rose-200" },
};

function studioPath(slug: string, agentName: string) {
  return `/p/${slug}/agents/${encodeURIComponent(agentName)}/studio`;
}

export function AgentsPage() {
  const { slug } = useParams({ from: "/p/$slug/agents" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [wizardOpen, setWizardOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["drakon-ir", "list", slug],
    queryFn: () => api.listDrakonIr(slug),
  });

  const agents = useMemo(() => {
    if (!data?.success || !Array.isArray(data.diagrams)) return [];
    return data.diagrams;
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (agentName: string) => {
      const response = await api.deleteDiagram(slug, agentName);
      if (!response?.success) {
        throw new Error(response?.message || response?.error || "Failed to delete agent");
      }
      return agentName;
    },
    onSuccess: (agentName) => {
      toast.success(`Deleted ${agentName}`);
      void queryClient.invalidateQueries({ queryKey: ["drakon-ir", "list", slug] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete agent");
    },
  });

  const handleOpenStudio = (agentName: string) => {
    navigate({ to: studioPath(slug, agentName) as never });
  };

  const handleDelete = (agentName: string) => {
    if (!window.confirm(`Delete agent \"${agentName}\"?`)) return;
    void deleteMutation.mutateAsync(agentName);
  };

  return (
    <section className="relative min-h-[calc(100vh-8rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(99,102,241,0.2),transparent_38%),radial-gradient(circle_at_90%_12%,rgba(168,85,247,0.23),transparent_42%),radial-gradient(circle_at_60%_100%,rgba(79,70,229,0.2),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px]" />

      <div className="relative z-10 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-[Outfit] text-3xl text-slate-100">Project Agents</h1>
            <p className="mt-1 text-sm text-slate-300">
              Manage agent definitions, prompts, and execution settings.
            </p>
          </div>

          <Button
            id="new-agent-btn"
            className="bg-indigo-600 text-white shadow-[0_0_30px_rgba(99,102,241,0.45)] hover:bg-indigo-500"
            onClick={() => setWizardOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Agent
          </Button>
        </header>

        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-white/10 bg-slate-900/35 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-slate-200">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading agents...
            </div>
          </div>
        ) : null}

        {isError ? (
          <Card className="border-rose-500/30 bg-rose-500/10 backdrop-blur-xl">
            <CardContent className="flex items-center gap-3 p-5 text-rose-100">
              <AlertCircle className="h-5 w-5" />
              <p>{error instanceof Error ? error.message : "Failed to load agents"}</p>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !isError && agents.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-white/10 bg-slate-900/30 p-6 text-center backdrop-blur-xl">
            <div className="mb-4 rounded-full bg-indigo-500/15 p-5 shadow-[0_0_60px_rgba(99,102,241,0.45)]">
              <Bot className="h-10 w-10 text-indigo-200" />
            </div>
            <h2 className="font-[Outfit] text-2xl text-slate-100">No agents created yet</h2>
            <p className="mt-2 max-w-md text-sm text-slate-300">
              Generate your first DRAKON-powered agent and start building AI execution flows.
            </p>
            <Button
              className="mt-6 bg-indigo-600 text-white hover:bg-indigo-500"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Agent
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError && agents.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agentName, index) => {
              const status = statusMeta[inferStatus(agentName, index)];

              return (
                <Card
                  key={agentName}
                  className="group relative cursor-pointer overflow-hidden border-white/10 bg-slate-900/40 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-900/60"
                  onClick={() => handleOpenStudio(agentName)}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="rounded-md border border-white/15 bg-black/20 p-2">
                          <Bot className="h-4 w-4 text-indigo-200" />
                        </div>
                        <h3 className="truncate font-medium text-slate-100">{agentName}</h3>
                      </div>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    <Badge className="w-fit border-indigo-400/30 bg-indigo-500/10 text-indigo-200">Agent</Badge>
                  </CardHeader>

                  <CardContent>
                    <div className="pointer-events-none flex items-center gap-2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
                      <Button
                        size="sm"
                        className="pointer-events-auto bg-indigo-600 text-white hover:bg-indigo-500"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenStudio(agentName);
                        }}
                      >
                        Open in Studio
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="pointer-events-auto border-white/20 bg-transparent text-slate-100 hover:bg-white/10"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(agentName);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="pointer-events-auto ml-auto text-slate-300 hover:text-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenStudio(agentName);
                        }}
                        aria-label={`Open settings for ${agentName}`}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>

      <NewAgentWizard
        slug={slug}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ["drakon-ir", "list", slug] });
        }}
      />
    </section>
  );
}