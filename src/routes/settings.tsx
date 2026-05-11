import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, ExternalLink, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showN8nToken, setShowN8nToken] = useState(false);
  const [isCheckingGithub, setIsCheckingGithub] = useState(false);
  const [isCheckingN8n, setIsCheckingN8n] = useState(false);
  const [isLoadingMinio, setIsLoadingMinio] = useState(false);
  const [githubStatus, setGithubStatus] = useState<ConnectionStatus>({ type: "idle", text: "Не перевірено" });
  const [n8nStatus, setN8nStatus] = useState<ConnectionStatus>({ type: "idle", text: "Не перевірено" });
  const [minioStatus, setMinioStatus] = useState<ConnectionStatus>({ type: "idle", text: "Не перевірено" });

  const normalizedN8nUrl = useMemo(
    () => settings.n8n.baseUrl.trim().replace(/\/+$/, ""),
    [settings.n8n.baseUrl],
  );

  const updateSettings = (updater: (prev: AppSettings) => AppSettings) => {
    setSettings((prev) => updater(prev));
  };

  const saveSettings = () => {
    writeSettings(settings);
    toast.success("Налаштування збережено");
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
    } catch (error) {
      setGithubStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Помилка підключення",
      });
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
    } catch (error) {
      setN8nStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Помилка підключення",
      });
    } finally {
      setIsCheckingN8n(false);
    }
  };

  const clearDiagramCache = () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm("Видалити локальний кеш діаграм (drakon.diagrams)?");
    if (!ok) return;
    localStorage.removeItem("drakon.diagrams");
    toast.success("Локальний кеш діаграм очищено");
  };

  if (typeof window !== "undefined" && !localStorage.getItem("jwt")) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-3 pb-28 pt-4 md:px-6 md:pb-6">
      <header className="mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">Налаштування</h1>
      </header>

      <Tabs defaultValue="github" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="github">GitHub</TabsTrigger>
          <TabsTrigger value="n8n">n8n</TabsTrigger>
          <TabsTrigger value="app">Додаток</TabsTrigger>
        </TabsList>

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
                <Input
                  id="gh-repo"
                  value={settings.github.repo}
                  onChange={(event) =>
                    updateSettings((prev) => ({
                      ...prev,
                      github: { ...prev.github, repo: event.target.value },
                    }))
                  }
                />
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

              <Button type="button" variant="destructive" onClick={clearDiagramCache}>
                <Trash2 className="mr-2 h-4 w-4" />
                Очистити локальний кеш діаграм
              </Button>
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
  );
}
