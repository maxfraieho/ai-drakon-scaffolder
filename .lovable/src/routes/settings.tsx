import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, ExternalLink, Loader2, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AgentLlmCard } from "@/components/agents/AgentLlmCard";
import { useGithubRepos, mergeWithKnown } from "@/hooks/useGithubRepos";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { hasClientJwt } from "@/lib/route-auth";
import { readSettings, writeSettings } from "@/lib/settings-storage";
import type { AppSettings } from "@/types/settings";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

type ConnectionStatus =
  | { type: "idle"; text: string }
  | { type: "success"; text: string }
  | { type: "error"; text: string };

function statusBadge(status: ConnectionStatus) {
  if (status.type === "success") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Check className="h-3.5 w-3.5" />
        {status.text}
      </Badge>
    );
  }

  if (status.type === "error") {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="h-3.5 w-3.5" />
        {status.text}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      {status.text}
    </Badge>
  );
}

function SettingsRoute() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());
  const [agentBaseUrl, setAgentBaseUrl] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("drakon_agent_base_url") ?? "http://192.168.3.184"
      : "http://192.168.3.184",
  );
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showN8nToken, setShowN8nToken] = useState(false);
  const [isCheckingGithub, setIsCheckingGithub] = useState(false);
  const [isCheckingN8n, setIsCheckingN8n] = useState(false);
  const [isLoadingMinio, setIsLoadingMinio] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);
  const [githubStatus, setGithubStatus] = useState<ConnectionStatus>({ type: "idle", text: "Не перевірено" });
  const [n8nStatus, setN8nStatus] = useState<ConnectionStatus>({ type: "idle", text: "Не перевірено" });
  const [minioStatus, setMinioStatus] = useState<ConnectionStatus>({ type: "idle", text: "Не перевірено" });

  const [docsRepoPath, setDocsRepoPath] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("docs_repo_path") || "" : "",
  );
  const [docsRepoName, setDocsRepoName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("docs_repo_name") || "ai-drakon-setup" : "ai-drakon-setup",
  );



  const handleSaveDocs = () => {
    localStorage.setItem("docs_repo_path", docsRepoPath);
    localStorage.setItem("docs_repo_name", docsRepoName);
    toast.success("Налаштування документації збережено");
  };

  const { repos, loading: reposLoading } = useGithubRepos(settings.github.owner, settings.github.token);
  const allRepos = mergeWithKnown(repos);
  const repoQuery = settings.github.repo.toLowerCase().trim();
  const repoExactMatch = allRepos.some(
    (r) => r.name.toLowerCase() === repoQuery || r.full_name.toLowerCase() === repoQuery,
  );
  const filteredRepos = !repoQuery || repoExactMatch
    ? allRepos
    : allRepos.filter(
        (r) =>
          r.name.toLowerCase().includes(repoQuery) ||
          r.full_name.toLowerCase().includes(repoQuery),
      );

  const normalizedN8nUrl = useMemo(
    () => settings.n8n.baseUrl.trim().replace(/\/+$/, ""),
    [settings.n8n.baseUrl],
  );

  const updateSettings = (updater: (prev: AppSettings) => AppSettings) => {
    setSettings((prev) => updater(prev));
  };

  const saveSettings = () => {
    try {
      writeSettings(settings);
      localStorage.setItem("drakon_agent_base_url", agentBaseUrl.trim() || "http://192.168.3.184");
      toast.success("Налаштування збережено", {
        description: "Конфігурацію оновлено локально.",
      });
    } catch (error) {
      toast.error("Не вдалося зберегти налаштування", {
        description: error instanceof Error ? error.message : "Невідома помилка",
      });
    }
  };

  const verifyGithub = async () => {
    setIsCheckingGithub(true);
    setGithubStatus({ type: "idle", text: "Перевіряю..." });

    try {
      const response = await api.githubListBranches(
        settings.github.owner.trim(),
        settings.github.repo.trim(),
        settings.github.token.trim() || undefined,
      );

      if (!response.success) {
        throw new Error("GitHub повернув помилку");
      }

      setGithubStatus({
        type: "success",
        text: `Знайдено гілок: ${response.branches.length}`,
      });
      toast.success("GitHub підключено", {
        description: `Знайдено гілок: ${response.branches.length}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Помилка підключення";
      setGithubStatus({ type: "error", text: message });
      toast.error("GitHub: помилка підключення", { description: message });
    } finally {
      setIsCheckingGithub(false);
    }
  };

  const verifyN8n = async () => {
    setIsCheckingN8n(true);
    setN8nStatus({ type: "idle", text: "Перевіряю..." });

    try {
      if (!normalizedN8nUrl) {
        throw new Error("Вкажіть n8n Base URL");
      }

      if (!settings.n8n.apiKey.trim()) {
        throw new Error("Вкажіть n8n API Key");
      }

      const response = await fetch(`${normalizedN8nUrl}/api/v1/workflows`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${settings.n8n.apiKey.trim()}`,
        },
      });

      const data = (await response.json()) as { data?: unknown[]; error?: string; message?: string };
      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      const workflows = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      setN8nStatus({ type: "success", text: `Workflows: ${workflows.length}` });
      toast.success("n8n підключено", { description: `Workflows: ${workflows.length}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Помилка підключення";
      setN8nStatus({ type: "error", text: message });
      toast.error("n8n: помилка підключення", { description: message });
    } finally {
      setIsCheckingN8n(false);
    }
  };

  const fetchWorkerHealth = async () => {
    setIsLoadingMinio(true);
    setMinioStatus({ type: "idle", text: "Завантажую..." });
    try {
      const workerUrl = (settings.app.workerUrl || "https://drakon-mcp-worker.maxfraieho.workers.dev").replace(/\/$/, "");
      const resp = await fetch(`${workerUrl}/health`);
      const data = (await resp.json()) as { storage?: { endpoint?: string; bucket?: string } };
      if (data.storage?.endpoint && data.storage.endpoint !== "not configured") {
        updateSettings((prev) => ({
          ...prev,
          minio: {
            ...prev.minio,
            endpoint: data.storage!.endpoint ?? prev.minio.endpoint,
            bucket:
              data.storage?.bucket && data.storage.bucket !== "not configured"
                ? data.storage.bucket
                : prev.minio.bucket,
          },
        }));
        setMinioStatus({ type: "success", text: "Дані отримано з Worker" });
        toast.success("MinIO: дані отримано з Worker");
      } else {
        setMinioStatus({ type: "idle", text: "MinIO не налаштовано у Worker" });
        toast.message("MinIO ще не налаштовано у Worker");
      }
    } catch {
      setMinioStatus({ type: "error", text: "Не вдалося підключитись до Worker" });
      toast.error("Не вдалося підключитись до Worker");
    } finally {
      setIsLoadingMinio(false);
    }
  };

  const clearDiagramCache = () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm("Видалити локальний кеш діаграм (drakon.diagrams)?");
    if (!ok) return;
    localStorage.removeItem("drakon.diagrams");
    toast.success("Локальний кеш діаграм очищено");
  };

  if (!hasClientJwt()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto w-full max-w-4xl px-3 pb-28 pt-4 md:px-6 md:pb-6">
        <header className="mb-4">
          <h1 className="text-lg font-semibold md:text-2xl">Налаштування</h1>
        </header>

        <Tabs defaultValue="github" className="space-y-4">
          <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="inline-flex w-max min-w-full gap-1 px-1 md:grid md:grid-cols-6 md:gap-0 md:px-0">
              <TabsTrigger value="github" className="shrink-0 whitespace-nowrap">GitHub</TabsTrigger>
              <TabsTrigger value="agents" className="shrink-0 whitespace-nowrap">Агенти</TabsTrigger>
              <TabsTrigger value="docs" className="shrink-0 whitespace-nowrap">Документація</TabsTrigger>
              <TabsTrigger value="n8n" className="shrink-0 whitespace-nowrap">n8n</TabsTrigger>
              <TabsTrigger value="minio" className="shrink-0 whitespace-nowrap">MinIO</TabsTrigger>
              <TabsTrigger value="app" className="shrink-0 whitespace-nowrap">Додаток</TabsTrigger>
            </TabsList>
          </div>

        <TabsContent value="github">
          <Card>
            <CardHeader>
              <CardTitle>GitHub</CardTitle>
              <CardDescription>Налаштування репозиторію для читання та комітів</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="gh-owner">Repository Owner</Label>
                <Input
                  id="gh-owner"
                  value={settings.github.owner}
                  onChange={(event) =>
                    updateSettings((prev) => ({
                      ...prev,
                      github: { ...prev.github, owner: event.target.value },
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gh-repo">Repository Name</Label>
                <div className="relative">
                  <Input
                    id="gh-repo"
                    value={settings.github.repo}
                    onChange={(event) =>
                      updateSettings((prev) => ({
                        ...prev,
                        github: { ...prev.github, repo: event.target.value },
                      }))
                    }
                    onFocus={() => setRepoOpen(true)}
                    onBlur={() => setTimeout(() => setRepoOpen(false), 150)}
                  />
                  {repoOpen && (
                    <div className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto bg-card border border-border rounded-md shadow-md">
                      {reposLoading && (
                        <div className="px-3 py-2 text-sm text-muted-foreground flex items-center">
                          <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                          Loading repos…
                        </div>
                      )}
                      {!reposLoading && filteredRepos.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No repos found — type to enter manually
                        </div>
                      )}
                      {filteredRepos.map((r) => (
                        <button
                          key={r.full_name}
                          type="button"
                          onMouseDown={() => {
                            updateSettings((prev) => ({
                              ...prev,
                              github: { ...prev.github, repo: r.name, owner: r.owner },
                            }));
                            setRepoOpen(false);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
                        >
                          <span className="font-medium">{r.name}</span>
                          {r.private && (
                            <span className="ml-2 text-[10px] text-muted-foreground">private</span>
                          )}
                          <span className="ml-2 text-[10px] text-muted-foreground">{r.owner}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gh-branch">Branch</Label>
                <Input
                  id="gh-branch"
                  value={settings.github.branch}
                  onChange={(event) =>
                    updateSettings((prev) => ({
                      ...prev,
                      github: { ...prev.github, branch: event.target.value },
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gh-token">Personal Access Token</Label>
                <div className="relative">
                  <Input
                    id="gh-token"
                    type={showGithubToken ? "text" : "password"}
                    value={settings.github.token}
                    onChange={(event) =>
                      updateSettings((prev) => ({
                        ...prev,
                        github: { ...prev.github, token: event.target.value },
                      }))
                    }
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowGithubToken((prev) => !prev)}
                    aria-label="Toggle token visibility"
                  >
                    {showGithubToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Потрібні права: repo (read + write contents)</p>
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary"
                >
                  Створити токен
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={verifyGithub} disabled={isCheckingGithub}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isCheckingGithub ? "Перевірка..." : "Перевірити підключення"}
                </Button>
                {statusBadge(githubStatus)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <div className="space-y-4">
            {/* Section 1: Agent URLs (compact) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Адреси агентів</CardTitle>
                <CardDescription className="text-xs">
                  HTTPS-URL трьох локальних агентів. Запити йдуть через Cloudflare Worker.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="agent-drakon" className="text-xs flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      DRAKON · 8765
                    </Label>
                    <Input
                      id="agent-drakon"
                      value={settings.agents.drakonUrl}
                      onChange={(event) =>
                        updateSettings((prev) => ({
                          ...prev,
                          agents: { ...prev.agents, drakonUrl: event.target.value },
                        }))
                      }
                      placeholder="https://drakon-agent..."
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="agent-architect" className="text-xs flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-violet-500" />
                      Архітектор · 8766
                    </Label>
                    <Input
                      id="agent-architect"
                      value={settings.agents.architectUrl}
                      onChange={(event) =>
                        updateSettings((prev) => ({
                          ...prev,
                          agents: { ...prev.agents, architectUrl: event.target.value },
                        }))
                      }
                      placeholder="https://architect-agent..."
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="agent-docs" className="text-xs flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Документаліст · 8767
                    </Label>
                    <Input
                      id="agent-docs"
                      value={settings.agents.docsUrl}
                      onChange={(event) =>
                        updateSettings((prev) => ({
                          ...prev,
                          agents: { ...prev.agents, docsUrl: event.target.value },
                        }))
                      }
                      placeholder="https://docs-agent..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const urls = [
                      settings.agents.drakonUrl,
                      settings.agents.architectUrl,
                      settings.agents.docsUrl,
                    ];
                    if (urls.some((u) => !u.startsWith("https://"))) {
                      toast.error("Усі адреси агентів мають починатися з https://");
                      return;
                    }
                    try {
                      writeSettings(settings);
                      toast.success("Адреси агентів збережено");
                    } catch (error) {
                      toast.error("Не вдалося зберегти", {
                        description: error instanceof Error ? error.message : "Невідома помилка",
                      });
                    }
                  }}
                >
                  Зберегти адреси
                </Button>
              </CardContent>
            </Card>

            {/* Section 2: Per-agent LLM cards */}
            <div className="space-y-2">
              <div className="px-1">
                <h3 className="text-sm font-semibold">LLM-провайдер для кожного агента</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Кожен агент може мати власну модель. Натисни «Підключити» — перевірить
                  з&apos;єднання та завантажить список доступних слотів.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <AgentLlmCard
                  agentId="drakon"
                  agentLabel="DRAKON"
                  agentColor="blue"
                  agentIcon="D"
                  agentDescription="Аналіз Python → DRAKON IR. Coding-модель."
                />
                <AgentLlmCard
                  agentId="architect"
                  agentLabel="Архітектор"
                  agentColor="violet"
                  agentIcon="A"
                  agentDescription="Дерево DRAKON-схем. Reasoning-модель."
                />
                <AgentLlmCard
                  agentId="docs"
                  agentLabel="Документаліст"
                  agentColor="emerald"
                  agentIcon="D"
                  agentDescription="Генерація документації. Long-context."
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Документація — репозиторій</CardTitle>
              <CardDescription>
                LLM-налаштування беруться з вкладки «Агенти». Тут лише шлях до репозиторію.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium">Протокол:</span> {typeof window !== "undefined" ? localStorage.getItem("agent_llm_protocol") || "anthropic" : "anthropic"}</p>
                <p><span className="font-medium">Base URL:</span> {typeof window !== "undefined" ? localStorage.getItem("agent_llm_base_url") || "(з вкладки Агенти)" : "(з вкладки Агенти)"}</p>
                <p><span className="font-medium">Модель:</span> {typeof window !== "undefined" ? localStorage.getItem("agent_llm_model") || "(з вкладки Агенти)" : "(з вкладки Агенти)"}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="docs-repo-path">Шлях до репо (на сервері)</Label>
                <Input
                  id="docs-repo-path"
                  value={docsRepoPath}
                  onChange={(e) => setDocsRepoPath(e.target.value)}
                  placeholder="залиш пусто для поточного"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="docs-repo-name">Назва репо (для папки результатів)</Label>
                <Input
                  id="docs-repo-name"
                  value={docsRepoName}
                  onChange={(e) => setDocsRepoName(e.target.value)}
                  placeholder="ai-drakon-setup"
                />
              </div>
              <Button type="button" onClick={handleSaveDocs}>
                Зберегти
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="n8n">
          <Card>
            <CardHeader>
              <CardTitle>n8n</CardTitle>
              <CardDescription>n8n використовується для автоматизації pipeline аналізу</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Увімкнути n8n інтеграцію</p>
                  <p className="text-xs text-muted-foreground">Вмикає використання n8n webhook та API</p>
                </div>
                <Switch
                  checked={settings.n8n.enabled}
                  onCheckedChange={(checked) =>
                    updateSettings((prev) => ({
                      ...prev,
                      n8n: { ...prev.n8n, enabled: checked },
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="n8n-base">n8n Base URL</Label>
                <Input
                  id="n8n-base"
                  value={settings.n8n.baseUrl}
                  onChange={(event) =>
                    updateSettings((prev) => ({
                      ...prev,
                      n8n: { ...prev.n8n, baseUrl: event.target.value },
                    }))
                  }
                  placeholder="https://n8n.yourhost.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="n8n-api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="n8n-api-key"
                    type={showN8nToken ? "text" : "password"}
                    value={settings.n8n.apiKey}
                    onChange={(event) =>
                      updateSettings((prev) => ({
                        ...prev,
                        n8n: { ...prev.n8n, apiKey: event.target.value },
                      }))
                    }
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowN8nToken((prev) => !prev)}
                    aria-label="Toggle n8n key visibility"
                  >
                    {showN8nToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="n8n-webhook">Webhook URL</Label>
                <Input
                  id="n8n-webhook"
                  value={settings.n8n.webhookUrl}
                  onChange={(event) =>
                    updateSettings((prev) => ({
                      ...prev,
                      n8n: { ...prev.n8n, webhookUrl: event.target.value },
                    }))
                  }
                  placeholder="https://n8n.yourhost.com/webhook/..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={verifyN8n} disabled={isCheckingN8n}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isCheckingN8n ? "Перевірка..." : "Перевірити підключення"}
                </Button>
                {statusBadge(n8nStatus)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="minio">
          <Card>
            <CardHeader>
              <CardTitle>MinIO Storage</CardTitle>
              <CardDescription>
                S3-сумісне сховище для діаграм. Параметри зберігаються локально для довідки.
                Для зміни конфігурації — оновіть secrets у Cloudflare Workers Dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="minio-endpoint">Endpoint</Label>
                <Input
                  id="minio-endpoint"
                  value={settings.minio?.endpoint || ""}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      minio: { ...prev.minio, endpoint: e.target.value },
                    }))
                  }
                  placeholder="https://your-minio-host"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minio-bucket">Bucket</Label>
                <Input
                  id="minio-bucket"
                  value={settings.minio?.bucket || ""}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      minio: { ...prev.minio, bucket: e.target.value },
                    }))
                  }
                  placeholder="drakon-diagrams"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minio-access-key">Access Key</Label>
                <Input
                  id="minio-access-key"
                  value={settings.minio?.accessKey || ""}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      minio: { ...prev.minio, accessKey: e.target.value },
                    }))
                  }
                  placeholder="minioadmin"
                />
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Secret Key та повна конфігурація зберігаються у{" "}
                <a
                  href="https://dash.cloudflare.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Cloudflare Workers Dashboard
                </a>
                {" "}→ drakon-mcp-worker → Settings → Variables and Secrets.
                Access Key тут — лише для довідки.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchWorkerHealth}
                  disabled={isLoadingMinio}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isLoadingMinio ? "Завантажую..." : "Завантажити з Worker"}
                </Button>
                {statusBadge(minioStatus)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="app">
          <Card>
            <CardHeader>
              <CardTitle>Додаток</CardTitle>
              <CardDescription>Локальні параметри UI та API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="app-worker-url">Worker URL (override)</Label>
                <Input
                  id="app-worker-url"
                  value={settings.app.workerUrl}
                  onChange={(event) =>
                    updateSettings((prev) => ({
                      ...prev,
                      app: { ...prev.app, workerUrl: event.target.value },
                    }))
                  }
                  placeholder="https://your-worker.example.workers.dev"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="app-agent-base-url">Agent Server URL</Label>
                <Input
                  id="app-agent-base-url"
                  value={agentBaseUrl}
                  onChange={(event) => setAgentBaseUrl(event.target.value)}
                  placeholder="http://192.168.3.184"
                />
                <p className="text-xs text-muted-foreground">
                  Base URL for AI agents (drakon:8765, architect:8766, docs:8767)
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="app-folder">Default folder</Label>
                <Input
                  id="app-folder"
                  value={settings.app.defaultFolder}
                  onChange={(event) =>
                    updateSettings((prev) => ({
                      ...prev,
                      app: { ...prev.app, defaultFolder: event.target.value },
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="app-theme">Тема</Label>
                <Select
                  value={settings.app.theme}
                  onValueChange={(value: AppSettings["app"]["theme"]) =>
                    updateSettings((prev) => ({
                      ...prev,
                      app: { ...prev.app, theme: value },
                    }))
                  }
                >
                  <SelectTrigger id="app-theme">
                    <SelectValue placeholder="Оберіть тему" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">Системна</SelectItem>
                    <SelectItem value="light">Світла</SelectItem>
                    <SelectItem value="dark">Темна</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                onClick={clearDiagramCache}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-400/50 active:scale-[0.96]"
                style={{ touchAction: "manipulation" }}
              >
                <Trash2 className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                Очистити кеш
              </button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-3 backdrop-blur md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex w-full max-w-4xl justify-end gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/diagrams" })}>
            Скасувати
          </Button>
          <Button onClick={saveSettings}>Зберегти</Button>
        </div>
      </div>
      </div>
    </div>
  );
}
