import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Bot, Loader2, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { NewAgentWizard } from "@/components/agents/NewAgentWizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { api } from "@/lib/api";
import { fetchPipelines } from "@/lib/pipeline-config-api";

type AgentCardStatus = "live" | "draft" | "error";

function inferStatus(name: string, index: number): AgentCardStatus {
  const normalized = name.toLowerCase();
  if (normalized.includes("error") || normalized.includes("failed")) return "error";
  if (normalized.includes("live") || normalized.includes("prod") || index % 3 === 0) return "live";
  return "draft";
}

// Astryx-migrated status meta: uses semantic tokens instead of raw Tailwind
// palettes. Border uses color-mix to derive a 30% tint of the semantic-fg.
const statusMeta: Record<AgentCardStatus, { label: string; className: string }> = {
  live: {
    label: "Live",
    className:
      "border-[color-mix(in_srgb,var(--astryx-semantic-ok-fg)_30%,transparent)] bg-[var(--astryx-semantic-ok-bg)] text-[var(--astryx-semantic-ok-fg)]",
  },
  draft: {
    label: "Draft",
    className:
      "border-[color-mix(in_srgb,var(--astryx-semantic-warn-fg)_30%,transparent)] bg-[var(--astryx-semantic-warn-bg)] text-[var(--astryx-semantic-warn-fg)]",
  },
  error: {
    label: "Error",
    className:
      "border-[color-mix(in_srgb,var(--astryx-semantic-critical-fg)_30%,transparent)] bg-[var(--astryx-semantic-critical-bg)] text-[var(--astryx-semantic-critical-fg)]",
  },
};

function studioPath(slug: string, agentName: string) {
  return `/p/${slug}/agents/${encodeURIComponent(agentName)}/studio`;
}

interface AgentsPageProps {
  slug?: string;
}

export function AgentsPage({ slug }: AgentsPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [wizardOpen, setWizardOpen] = useState(false);

  // Fetch all projects to list agents globally if no slug is provided
  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
    enabled: !slug,
    retry: false,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["drakon-ir", "list", slug || "global", projectsData],
    queryFn: async () => {
      if (slug) {
        const res = await api.listDrakonIr(slug);
        return {
          success: true,
          agents: (res.diagrams || []).map((name) => ({ name, slug, source: "diagram" as const })),
        };
      } else {
        const projects = (projectsData as any)?.projects || [];
        const allAgents: Array<{ name: string; slug: string; source: "diagram" | "pipeline"; pipelineId?: string }> = [];

        await Promise.all(
          projects.map(async (p: any) => {
            try {
              const res = await api.listDrakonIr(p.slug);
              if (res.success && Array.isArray(res.diagrams)) {
                res.diagrams.forEach((name) => {
                  allAgents.push({ name, slug: p.slug, source: "diagram" });
                });
              }
            } catch (e) {
              console.warn(`Failed to load agents for project ${p.slug}:`, e);
            }
          })
        );

        // TEST_REPORT.md defect #3: /agents showed empty while /pipelines had a
        // real list -- both called themselves "agents" from two different data
        // sources. Diagram-backed agents (above) and pipeline configs are
        // distinct entities; show both here rather than pretending pipelines
        // don't exist. Pipeline cards are read-only (no per-project studio/delete
        // semantics apply to them) -- see the openCard() branch below.
        try {
          const pipelines = await fetchPipelines();
          pipelines.forEach((p) => {
            allAgents.push({ name: p.name, slug: "", source: "pipeline", pipelineId: p.id });
          });
        } catch (e) {
          console.warn("Failed to load pipeline configs for /agents:", e);
        }

        return {
          success: true,
          agents: allAgents,
        };
      }
    },
    enabled: !!slug || !!projectsData,
  });

  const agents = useMemo(() => {
    if (!data?.success || !Array.isArray(data.agents)) return [];
    return data.agents;
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (payload: { slug: string; name: string }) => {
      const response = await api.deleteDiagram(payload.slug, payload.name);
      if (!response?.success) {
        throw new Error(response?.message || response?.error || "Failed to delete agent");
      }
      return payload;
    },
    onSuccess: (payload) => {
      toast.success(`Deleted ${payload.name}`);
      void queryClient.invalidateQueries({ queryKey: ["drakon-ir", "list"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete agent");
    },
  });

  const handleOpenStudio = (agentSlug: string, agentName: string) => {
    navigate({ to: studioPath(agentSlug, agentName) as never });
  };

  const handleOpenPipeline = (pipelineId: string) => {
    navigate({ to: "/pipeline/$pipelineId/edit", params: { pipelineId } } as never);
  };

  const handleDelete = (agentSlug: string, agentName: string) => {
    if (!window.confirm(`Delete agent "${agentName}"?`)) return;
    void deleteMutation.mutateAsync({ slug: agentSlug, name: agentName });
  };

  return (
    <section
      className="astryx-migrated relative min-h-[calc(100vh-8rem)] overflow-hidden bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)]"
      data-testid="agents-page"
    >
      {/* Astryx: flat surfaces only. Radial gradient + grid-overlay decorations
          removed per design system rules ("No gradients, no textures"). */}

      <div className="relative z-10 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--astryx-text-primary)]">
              {slug ? "Project Agents" : "All Platform Agents"}
            </h1>
            <p className="mt-1 text-sm text-[var(--astryx-text-secondary)]">
              {slug
                ? "Manage agent definitions, prompts, and execution settings."
                : "Overview of all agents across all registered projects."}
            </p>
          </div>

          {slug && (
            <Button
              id="new-agent-btn"
              className="bg-[var(--astryx-color-brand)] text-[var(--astryx-color-on-brand)] hover:bg-[var(--astryx-color-brand-hover)]"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Agent
            </Button>
          )}
        </header>

        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[var(--astryx-radius-lg)] border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)] shadow-[var(--astryx-shadow-card)]">
            <div className="flex items-center gap-2 text-[var(--astryx-text-primary)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading agents...
            </div>
          </div>
        ) : null}

        {isError ? (
          <Card className="border-[color-mix(in_srgb,var(--astryx-semantic-critical-fg)_30%,transparent)] bg-[var(--astryx-semantic-critical-bg)]">
            <CardContent className="flex items-center gap-3 p-5 text-[var(--astryx-semantic-critical-fg)]">
              <AlertCircle className="h-5 w-5" />
              <p>{error instanceof Error ? error.message : "Failed to load agents"}</p>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !isError && agents.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[var(--astryx-radius-lg)] border border-dashed border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)] p-6 text-center">
            <div className="mb-4 rounded-full bg-[var(--astryx-color-brand-light)] p-5">
              <Bot className="h-10 w-10 text-[var(--astryx-color-brand-hover)]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--astryx-text-primary)]">
              {slug ? "No agents created yet" : "No agents found on the platform"}
            </h2>
            <p className="mt-2 max-w-md text-sm text-[var(--astryx-text-secondary)]">
              {slug
                ? "Generate your first DRAKON-powered agent and start building AI execution flows."
                : "No active agents found in any of the registered projects."}
            </p>
            {slug && (
              <Button
                className="mt-6 bg-[var(--astryx-color-brand)] text-[var(--astryx-color-on-brand)] hover:bg-[var(--astryx-color-brand-hover)]"
                onClick={() => setWizardOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New Agent
              </Button>
            )}
          </div>
        ) : null}

        {!isLoading && !isError && agents.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent, index) => {
              const status = statusMeta[inferStatus(agent.name, index)];

              const isPipeline = agent.source === "pipeline";
              const openCard = () =>
                isPipeline && agent.pipelineId
                  ? handleOpenPipeline(agent.pipelineId)
                  : handleOpenStudio(agent.slug, agent.name);

              return (
                <Card
                  key={`${agent.source}:${agent.slug}:${agent.name}`}
                  className="group relative cursor-pointer overflow-hidden border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)] shadow-[var(--astryx-shadow-card)] transition-colors duration-150 hover:border-[var(--astryx-color-brand)]"
                  onClick={openCard}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="rounded-[var(--astryx-radius-sm)] border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-secondary)] p-2">
                          <Bot className="h-4 w-4 text-[var(--astryx-color-brand-hover)]" />
                        </div>
                        <div>
                          <h3 className="truncate font-mono font-medium text-[var(--astryx-text-primary)]">
                            {agent.name}
                          </h3>
                          {!slug && !isPipeline && (
                            <p className="text-xs text-[var(--astryx-text-muted)] font-mono mt-0.5">
                              Project: {agent.slug}
                            </p>
                          )}
                          {isPipeline && (
                            <p className="text-xs text-[var(--astryx-text-muted)] font-mono mt-0.5">
                              Pipeline config
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    <Badge className="w-fit border-[color-mix(in_srgb,var(--astryx-color-brand)_30%,transparent)] bg-[var(--astryx-color-brand-light)] text-[var(--astryx-color-brand-hover)]">
                      {isPipeline ? "Pipeline" : "Agent"}
                    </Badge>
                  </CardHeader>

                  <CardContent>
                    <div className="pointer-events-none flex items-center gap-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                      <Button
                        size="sm"
                        className="pointer-events-auto bg-[var(--astryx-color-brand)] text-[var(--astryx-color-on-brand)] hover:bg-[var(--astryx-color-brand-hover)]"
                        onClick={(event) => {
                          event.stopPropagation();
                          openCard();
                        }}
                      >
                        {isPipeline ? "Open Pipeline" : "Open in Studio"}
                      </Button>
                      {!isPipeline && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="pointer-events-auto"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(agent.slug, agent.name);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                      {!isPipeline && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="pointer-events-auto ml-auto"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenStudio(agent.slug, agent.name);
                          }}
                          aria-label={`Open settings for ${agent.name}`}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>

      {slug && (
        <NewAgentWizard
          slug={slug}
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ["drakon-ir", "list", slug] });
          }}
        />
      )}
    </section>
  );
}
