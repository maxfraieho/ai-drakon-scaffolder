import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import {
  AutomationListTable,
  type AutomationListItem,
} from "@/components/n8n/AutomationListTable";
import {
  N8NNodeSidebar,
  type N8NNodeConfig,
  type N8NNodeType,
} from "@/components/n8n/N8NNodeSidebar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getN8nConfig } from "@/lib/settings-storage";
import type { DrakonSelectionItem, DrakonDiagram as WidgetDrakonDiagram } from "@/types/drakonwidget";

type ViewMode = "list" | "editor";
type PushStatus = "not-pushed" | "pushed";

function toDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function createEmptyAutomationDiagram(name: string): WidgetDrakonDiagram {
  return {
    name,
    access: "write",
    items: {
      "1": { type: "end" },
      "2": { type: "branch", branchId: 0, one: "3" },
      "3": { type: "action", content: ":: n8n :: Webhook", one: "1" },
    },
  };
}

function inferNodeType(content?: string): N8NNodeType {
  const value = (content ?? "").toLowerCase();
  if (value.includes("webhook")) return "Webhook";
  if (value.includes("http request")) return "HTTP Request";
  if (value.includes("telegram")) return "Telegram";
  if (value.includes("code")) return "Code";
  if (value.includes("if")) return "IF Condition";
  return "Webhook";
}

function nodeTypeToMeta(nodeType: N8NNodeType): { n8nNodeType: string; n8nTypeVersion: number } {
  switch (nodeType) {
    case "Webhook":
      return { n8nNodeType: "n8n-nodes-base.webhook", n8nTypeVersion: 2 };
    case "HTTP Request":
      return { n8nNodeType: "n8n-nodes-base.httpRequest", n8nTypeVersion: 3 };
    case "Telegram":
      return { n8nNodeType: "n8n-nodes-base.telegram", n8nTypeVersion: 1 };
    case "Code":
      return { n8nNodeType: "n8n-nodes-base.code", n8nTypeVersion: 2 };
    case "IF Condition":
      return { n8nNodeType: "n8n-nodes-base.if", n8nTypeVersion: 2 };
  }
}

function configToMeta(config: N8NNodeConfig) {
  const params: Record<string, unknown> = {};

  if (config.nodeType === "Webhook") {
    params.path = config.path ?? "";
    params.httpMethod = config.method ?? "POST";
  }
  if (config.nodeType === "HTTP Request") {
    params.url = config.url ?? "";
    params.method = config.method ?? "POST";
    params.body = config.body ?? "";
  }
  if (config.nodeType === "Telegram") {
    params.chat_id = config.chatId ?? "";
    params.text = config.text ?? "";
  }
  if (config.nodeType === "Code") {
    params.jsCode = config.jsCode ?? "";
  }

  return {
    ...nodeTypeToMeta(config.nodeType),
    n8nParams: params,
    credentialName: config.credentialName ?? "",
  };
}

function stripTransientFields(schema: unknown) {
  if (!schema || typeof schema !== "object") return schema;
  const copy = structuredClone(schema as Record<string, unknown>) as {
    items?: Record<string, Record<string, unknown>>;
  };

  if (copy.items && typeof copy.items === "object") {
    for (const nodeId of Object.keys(copy.items)) {
      const node = copy.items[nodeId];
      if (!node || typeof node !== "object") continue;
      delete node.__n8nConfig;
    }
  }
  return copy;
}

function readNodeCount(diagram: unknown): number {
  if (!diagram || typeof diagram !== "object") return 0;
  const items = (diagram as { items?: Record<string, unknown> }).items;
  if (!items || typeof items !== "object") return 0;
  return Object.keys(items).length;
}

function inferItemStatus(itemName: string): "pushed" | "local" {
  return itemName.toLowerCase().includes("pushed") ? "pushed" : "local";
}

function inferDiagramStatus(diagram: unknown, fallbackName: string): "pushed" | "local" {
  if (diagram && typeof diagram === "object") {
    const meta = (diagram as { meta?: Record<string, unknown> }).meta;
    if (meta && typeof meta === "object") {
      if (meta.pushedToN8N === true || typeof meta.pushedAt === "string") return "pushed";
    }
  }
  return inferItemStatus(fallbackName);
}

function inferDiagramDate(diagram: unknown): string {
  if (diagram && typeof diagram === "object") {
    const candidate = (diagram as { updatedAt?: string; createdAt?: string }).updatedAt
      || (diagram as { updatedAt?: string; createdAt?: string }).createdAt;
    if (candidate) return toDateLabel(candidate);
  }
  return toDateLabel(new Date().toISOString());
}

export function N8NAutomationsPage() {
  const { slug } = useParams({ from: "/p/$slug/automations" });
  const n8nConfig = getN8nConfig();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [automationName, setAutomationName] = useState("new-automation");
  const [activeDiagram, setActiveDiagram] = useState<WidgetDrakonDiagram>(
    createEmptyAutomationDiagram("new-automation"),
  );
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [nodeConfigurations, setNodeConfigurations] = useState<Record<string, N8NNodeConfig>>({});
  const [pushStatus, setPushStatus] = useState<PushStatus>("not-pushed");
  const [compileError, setCompileError] = useState<string | null>(null);

  const automationsQuery = useQuery({
    queryKey: ["drakon-ir", "automations", slug],
    queryFn: () => api.listDrakonIr(slug),
  });

  const automationItems = useMemo<AutomationListItem[]>(() => {
    if (!automationsQuery.data?.success || !Array.isArray(automationsQuery.data.diagrams)) {
      return [];
    }
    return automationsQuery.data.diagrams.map((name) => ({
      name,
      nodeCount: 0,
      status: inferItemStatus(name),
      dateLabel: "-",
    }));
  }, [automationsQuery.data]);

  const automationDetailsQuery = useQuery({
    queryKey: ["drakon-ir", "automations", "details", slug, automationItems.map((a) => a.name).join("|")],
    enabled: automationItems.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        automationItems.map(async (item) => {
          try {
            const details = await api.getDrakonIr(item.name, slug);
            return { name: item.name, details };
          } catch {
            return { name: item.name, details: null };
          }
        }),
      );
      return responses;
    },
  });

  const tableItems = useMemo<AutomationListItem[]>(() => {
    if (!automationDetailsQuery.data || automationDetailsQuery.data.length === 0) return automationItems;
    const detailsByName = new Map(automationDetailsQuery.data.map((entry) => [entry.name, entry.details]));

    return automationItems.map((item) => {
      const details = detailsByName.get(item.name);
      if (!details?.success) return item;
      const diagram = details.diagram;
      return {
        name: item.name,
        nodeCount: readNodeCount(diagram),
        status: inferDiagramStatus(diagram, item.name),
        dateLabel: inferDiagramDate(diagram),
      };
    });
  }, [automationDetailsQuery.data, automationItems]);

  const hasN8NSelection = Boolean(activeNodeId);
  const activeNodeConfig = hasN8NSelection && activeNodeId
    ? nodeConfigurations[activeNodeId] ?? { nodeType: "Webhook", method: "POST" }
    : null;

  const loadAutomationMutation = useMutation({
    mutationFn: async (name: string) => api.getDrakonIr(name, slug),
    onSuccess: (result, name) => {
      if (!result.success || !result.diagram || typeof result.diagram !== "object") {
        toast.error("Failed to load automation diagram.");
        return;
      }

      const loaded = result.diagram as WidgetDrakonDiagram;
      setAutomationName(name);
      setActiveDiagram(loaded);

      const derivedConfigs: Record<string, N8NNodeConfig> = {};
      const items = loaded.items ?? {};
      for (const [nodeId, item] of Object.entries(items)) {
        const typedItem = item as { content?: string; meta?: Record<string, unknown> };
        if (!String(typedItem.content ?? "").toLowerCase().startsWith(":: n8n ::")) continue;

        const nodeType = inferNodeType(typedItem.content);
        const meta = (typedItem.meta ?? {}) as Record<string, unknown>;
        const params = (meta.n8nParams ?? {}) as Record<string, unknown>;
        derivedConfigs[nodeId] = {
          nodeType,
          method: (params.method || params.httpMethod) as "GET" | "POST" | undefined,
          path: params.path as string | undefined,
          url: params.url as string | undefined,
          body: params.body as string | undefined,
          chatId: params.chat_id as string | undefined,
          text: params.text as string | undefined,
          jsCode: params.jsCode as string | undefined,
          credentialName: (meta.credentialName as string | undefined) ?? "",
        };
      }

      setNodeConfigurations(derivedConfigs);
      setActiveNodeId(null);
      setPushStatus("not-pushed");
      setCompileError(null);
      setViewMode("editor");
    },
    onError: () => {
      toast.error("Failed to load automation diagram.");
    },
  });

  const compileMutation = useMutation({
    mutationFn: async () => {
      const payloadSchema = stripTransientFields(activeDiagram);
      return api.compileN8NWorkflow(payloadSchema, automationName);
    },
    onSuccess: (result) => {
      if (!result.success || !result.workflow) {
        setCompileError(result.error || result.message || "N8N compilation failed.");
        return;
      }

      setCompileError(null);
      const blob = new Blob([JSON.stringify(result.workflow, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "workflow.json";
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("workflow.json exported.");
    },
    onError: (error) => {
      setCompileError(error instanceof Error ? error.message : "N8N compilation failed.");
    },
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      const payloadSchema = stripTransientFields(activeDiagram);
      return api.pushN8NWorkflow({
        schema: payloadSchema,
        name: automationName,
        n8nUrl: n8nConfig.baseUrl,
        n8nApiKey: n8nConfig.apiKey,
      });
    },
    onSuccess: (result) => {
      if (!result.success) {
        const message = result.error || result.message || "Push to N8N failed.";
        setPushStatus("not-pushed");
        toast.error(message);
        return;
      }

      setPushStatus("pushed");
      toast.success("Pushed to N8N ✓");
    },
    onError: (error) => {
      setPushStatus("not-pushed");
      toast.error(error instanceof Error ? error.message : "Push to N8N failed.");
    },
  });

  const handleCreateNew = () => {
    const name = "new-automation";
    setAutomationName(name);
    setActiveDiagram(createEmptyAutomationDiagram(name));
    setActiveNodeId(null);
    setNodeConfigurations({});
    setPushStatus("not-pushed");
    setCompileError(null);
    setViewMode("editor");
  };

  const handleSelectionChanged = (items: DrakonSelectionItem[] | null) => {
    if (!items || items.length === 0) {
      setActiveNodeId(null);
      return;
    }

    const first = items[0];
    const content = String(first.content ?? "");
    if (!content.toLowerCase().startsWith(":: n8n ::")) {
      setActiveNodeId(null);
      return;
    }

    setActiveNodeId(first.id);
    setNodeConfigurations((prev) => {
      if (prev[first.id]) return prev;
      return {
        ...prev,
        [first.id]: {
          nodeType: inferNodeType(content),
          method: "POST",
          credentialName: "",
        },
      };
    });
  };

  const handleNodeConfigChange = (next: N8NNodeConfig) => {
    if (!activeNodeId) return;

    setNodeConfigurations((prev) => ({
      ...prev,
      [activeNodeId]: next,
    }));

    setActiveDiagram((prev) => {
      const item = prev.items[activeNodeId];
      if (!item) return prev;

      const nextContent = `:: n8n :: ${next.nodeType}`;
      const itemWithMeta = item as unknown as { meta?: Record<string, unknown> };
      return {
        ...prev,
        items: {
          ...prev.items,
          [activeNodeId]: {
            ...item,
            content: nextContent,
            meta: {
              ...(itemWithMeta.meta ?? {}),
              ...configToMeta(next),
            },
          } as unknown as WidgetDrakonDiagram["items"][string],
        },
      };
    });
    setPushStatus("not-pushed");
  };

  if (viewMode === "list") {
    return (
      <AutomationListTable
        items={tableItems}
        loading={automationsQuery.isLoading || automationDetailsQuery.isLoading || loadAutomationMutation.isPending}
        error={automationsQuery.isError ? "Failed to load automations." : null}
        onCreateNew={handleCreateNew}
        onOpenAutomation={(name) => {
          void loadAutomationMutation.mutateAsync(name);
        }}
      />
    );
  }

  const n8nPushDisabled = !n8nConfig.baseUrl.trim() || !n8nConfig.apiKey.trim() || pushMutation.isPending;

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-white/10 bg-slate-900/45 p-4 backdrop-blur-xl md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to list
            </button>
            <h1 className="text-2xl font-semibold text-slate-100">{automationName}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-white/15 bg-black/20 text-slate-100 hover:bg-white/10"
              onClick={() => void compileMutation.mutateAsync()}
              disabled={compileMutation.isPending}
            >
              Export JSON
            </Button>
            <Button
              className="bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-700/60"
              disabled={n8nPushDisabled}
              onClick={() => void pushMutation.mutateAsync()}
            >
              <UploadCloud className="h-4 w-4" />
              Push to N8N
            </Button>

            <span
              className={
                pushStatus === "pushed"
                  ? "inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200"
                  : "inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200"
              }
            >
              {pushStatus === "pushed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              {pushStatus === "pushed" ? "Pushed to N8N ✓" : "Not pushed"}
            </span>
          </div>
        </div>

        {n8nPushDisabled ? (
          <p className="mt-2 text-xs text-slate-400">Push is disabled until N8N Base URL and API Key are configured in Settings.</p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
        <div className="min-h-[560px] rounded-xl border border-white/10 bg-slate-900/35 p-3 backdrop-blur-xl">
          <DrakonEditor
            diagram={activeDiagram}
            diagramId={automationName}
            onSelectionChanged={handleSelectionChanged}
            onSaveOverride={async (nextDiagram) => {
              setAutomationName(nextDiagram.name || automationName);
              setActiveDiagram(nextDiagram);
              setPushStatus("not-pushed");
              return true;
            }}
            className="h-full"
          />

          {compileError ? (
            <div className="mt-3 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {compileError}
            </div>
          ) : null}
        </div>

        <div className="min-h-[560px] transition-all duration-300 ease-out">
          {hasN8NSelection && activeNodeId && activeNodeConfig ? (
            <N8NNodeSidebar
              activeNodeId={activeNodeId}
              config={activeNodeConfig}
              onChange={handleNodeConfigChange}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-900/25 p-4 text-center text-sm text-slate-400">
              Select a node with content starting with ":: n8n ::" to configure node settings.
            </div>
          )}
        </div>
      </div>

    </section>
  );
}
