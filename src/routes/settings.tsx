import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, ExternalLink, Loader2, RefreshCw, ShieldAlert, Trash2, Copy, Key } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { AgentLlmCard } from "@/components/agents/AgentLlmCard";
import { useGithubRepos, mergeWithKnown } from "@/hooks/useGithubRepos";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from
"@/components/ui/card";
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
import { useAuth } from "@/context/AuthContext";
import { readSettings, writeSettings } from "@/lib/settings-storage";
import type { AppSettings } from "@/types/settings";
import { useProject } from "@/context/ProjectContext";
import { databases } from "@/lib/appwrite";
import { getAppwriteJwt } from "@/lib/appwrite-jwt";
import { saveUserConfig, syncUserConfigToCloud } from "@/lib/user-config-api";

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
const { user, isLoading: authLoading } = useAuth();
const isAdmin = user?.email === 'tukroschu@gmail.com' ||
  (typeof window !== "undefined" && (
    localStorage.getItem("aegisroute.access_token") === "drakon-mcp-2026" ||
    localStorage.getItem("jwt") === "drakon-mcp-2026"
  ));
const { activeProject } = useProject();
const activeProjectGithub = activeProject?.github;
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

const [githubConnected, setGithubConnected] = useState(false);
const [githubUserLogin, setGithubUserLogin] = useState<string | null>(null);
const [isLoadingProfile, setIsLoadingProfile] = useState(false);

useEffect(() => {
  if (!user?.$id) return;
  setIsLoadingProfile(true);
  databases
    .getDocument("ai-drakon", "user_profiles", user.$id)
    .then((doc: any) => {
      if (doc.githubToken) {
        setGithubConnected(true);
        setGithubUserLogin(doc.githubLogin || null);
      } else {
        setGithubConnected(false);
      }
    })
    .catch(() => {
      setGithubConnected(false);
    })
    .finally(() => {
      setIsLoadingProfile(false);
    });
}, [user?.$id]);

const handleConnectGithub = async () => {
  try {
    const jwt = await getAppwriteJwt();
    if (!jwt) {
      toast.error("Не вдалося отримати токен авторизації");
      return;
    }
    const workerUrl = (settings.app.workerUrl || "https://drakon-antigravity-worker.maxfraieho.workers.dev").replace(/\/$/, "");
    window.location.href = `${workerUrl}/auth/github/start?token=${encodeURIComponent(jwt)}`;
  } catch (error) {
    toast.error("Помилка підключення GitHub");
  }
};

const [mcpKey, setMcpKey] = useState<string | null>(null);
const [mcpKeyMasked, setMcpKeyMasked] = useState<string | null>(null);
const [isLoadingMcpKey, setIsLoadingMcpKey] = useState(false);
const [isGeneratingMcpKey, setIsGeneratingMcpKey] = useState(false);

useEffect(() => {
  // Load current MCP key on mount
  const jwt = localStorage.getItem("jwt");
  if (!jwt) return;
  const workerUrl = (settings.app.workerUrl || "https://drakon-antigravity-worker.maxfraieho.workers.dev").replace(/\/$/, "");
  setIsLoadingMcpKey(true);
  fetch(`${workerUrl}/v1/api-key`, {
    headers: { Authorization: `Bearer ${jwt}` },
  })
    .then(r => r.json())
    .then((data: any) => {
      if (data.success && data.hasKey) {
        setMcpKey(data.apiKey);
        setMcpKeyMasked(data.maskedKey);
      }
    })
    .catch(() => {})
    .finally(() => setIsLoadingMcpKey(false));
}, [settings.app.workerUrl]);

const generateMcpKey = async () => {
  const jwt = localStorage.getItem("jwt");
  if (!jwt) { toast.error("Потрібна авторизація"); return; }
  const workerUrl = (settings.app.workerUrl || "https://drakon-antigravity-worker.maxfraieho.workers.dev").replace(/\/$/, "");
  setIsGeneratingMcpKey(true);
  try {
    const res = await fetch(`${workerUrl}/v1/api-key/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await res.json() as any;
    if (data.success) {
      setMcpKey(data.apiKey);
      setMcpKeyMasked(`${data.apiKey.slice(0, 14)}...${data.apiKey.slice(-6)}`);
      toast.success("MCP ключ створено", { description: "Скопіюй ключ — він більше не буде показаний повністю" });
    } else {
      toast.error("Помилка генерації ключа");
    }
  } catch {
    toast.error("Помилка підключення до Worker");
  } finally {
    setIsGeneratingMcpKey(false);
  }
};

const revokeMcpKey = async () => {
  const jwt = localStorage.getItem("jwt");
  if (!jwt) return;
  const workerUrl = (settings.app.workerUrl || "https://drakon-antigravity-worker.maxfraieho.workers.dev").replace(/\/$/, "");
  try {
    await fetch(`${workerUrl}/v1/api-key`, { method: "DELETE", headers: { Authorization: `Bearer ${jwt}` } });
    setMcpKey(null);
    setMcpKeyMasked(null);
    toast.success("MCP ключ відкликано");
  } catch { toast.error("Помилка"); }
};

const [docsRepoPath, setDocsRepoPath] = useState(() =>
typeof window !== "undefined" ? localStorage.getItem("docs_repo_path") || "" : "",
);
const [docsRepoName, setDocsRepoName] = useState(() =>
typeof window !== "undefined" ? localStorage.getItem("docs_repo_name") || "ai-drakon-setup" :
"ai-drakon-setup",
);


const handleSaveDocs = () => {
localStorage.setItem("docs_repo_path", docsRepoPath);
localStorage.setItem("docs_repo_name", docsRepoName);
toast.success("Налаштування документації збережено");
};

const { repos, loading: reposLoading } = useGithubRepos(settings.github.owner,
settings.github.token);
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

// Synchronize to MinIO
void syncUserConfigToCloud();

toast.success("Налаштування збережено", {
description: "Конфігурацію оновлено локально та синхронізовано з хмарою.",
});
} catch (error) {
toast.error("Не вдалося зберегти налаштування", {
description: error instanceof Error ? error.message : "Невідома помилка",
});
}
};

const verifyGithub = async () => {
if (!settings.github.token.trim()) {
  setGithubStatus({ type: "error", text: "Введіть Personal Access Token" });
  toast.error("GitHub: потрібен токен", { description: "Введіть PAT у поле токена вище" });
  return;
}
setIsCheckingGithub(true);
setGithubStatus({ type: "idle", text: "Перевіряю..." });

try {
const response = await api.githubListBranches(
settings.github.owner.trim(),
settings.github.repo.trim(),
settings.github.token.trim() || undefined,
);
if (!response.success) {
const r = response as {error?: string; message?: string};
throw new Error(r.error || r.message || "GitHub повернув помилку");
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
const workerUrl = (settings.app.workerUrl ||
"https://drakon-antigravity-worker.maxfraieho.workers.dev").replace(/\/$/, "");
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

if (authLoading) {
  return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}
const hasJwt = typeof window !== "undefined" && !!(
  localStorage.getItem("aegisroute.access_token") || localStorage.getItem("jwt")
);
if (!user && !hasJwt) {
  return <Navigate to="/login" replace />;
}

return (
<div className="h-full overflow-y-auto bg-background">
<div className="mx-auto w-full max-w-4xl px-3 pb-28 pt-4 md:px-6 md:pb-6">
<header className="mb-4">
<h1 className="text-lg font-semibold md:text-2xl">Налаштування</h1>
</header>

<Tabs defaultValue="profile" className="space-y-4">
<div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
<TabsList className="inline-flex w-max min-w-full gap-1 px-1 md:w-auto md:px-0">
  <TabsTrigger value="profile" className="shrink-0 whitespace-nowrap">Профіль</TabsTrigger>
  <TabsTrigger value="mcp" className="shrink-0 whitespace-nowrap">MCP Access</TabsTrigger>
  {isAdmin && <TabsTrigger value="github" className="shrink-0 whitespace-nowrap">GitHub</TabsTrigger>}
  {isAdmin && <TabsTrigger value="agents" className="shrink-0 whitespace-nowrap">Агенти</TabsTrigger>}
  {isAdmin && <TabsTrigger value="docs" className="shrink-0 whitespace-nowrap">Документація</TabsTrigger>}
  {isAdmin && <TabsTrigger value="n8n" className="shrink-0 whitespace-nowrap">n8n</TabsTrigger>}
  {isAdmin && <TabsTrigger value="minio" className="shrink-0 whitespace-nowrap">MinIO</TabsTrigger>}
  {isAdmin && <TabsTrigger value="app" className="shrink-0 whitespace-nowrap">Додаток</TabsTrigger>}
</TabsList>
</div>

<TabsContent value="profile" className="pb-20 md:pb-0">
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Акаунт</CardTitle>
        <CardDescription>Інформація про ваш обліковий запис</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Ім'я</Label>
          <p className="text-sm font-medium">{user?.name || "—"}</p>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <p className="text-sm font-medium">{user?.email || "—"}</p>
        </div>
        {isAdmin && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            Адміністратор платформи — додаткові вкладки доступні у меню вище.
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>GitHub</CardTitle>
        <CardDescription>Підключення до GitHub для роботи з проектами</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingProfile ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Завантаження профілю...</span>
          </div>
        ) : githubConnected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">✅ Connected</p>
                {githubUserLogin && (
                  <p className="text-xs opacity-90 mt-0.5">
                    Авторизовано як: <strong className="font-semibold">{githubUserLogin}</strong>
                  </p>
                )}
              </div>
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnectGithub}
                className="text-xs"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Перепідключити
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-md bg-muted/40 border border-border/50 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">GitHub App OAuth</p>
              <p className="mt-1 text-xs">
                Підключіть свій обліковий запис GitHub, щоб отримати доступ до ваших репозиторіїв та комітів.
              </p>
            </div>
            <div>
              <Button onClick={handleConnectGithub} size="sm">
                Підключити GitHub
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Інтерфейс</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="profile-theme">Тема</Label>
          <Select
            value={settings.app.theme}
            onValueChange={(value: AppSettings["app"]["theme"]) =>
              updateSettings((prev) => ({ ...prev, app: { ...prev.app, theme: value } }))
            }
          >
            <SelectTrigger id="profile-theme">
              <SelectValue placeholder="Оберіть тему" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Системна</SelectItem>
              <SelectItem value="light">Світла</SelectItem>
              <SelectItem value="dark">Темна</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={saveSettings} size="sm">Зберегти</Button>
      </CardContent>
    </Card>
  </div>
</TabsContent>

{isAdmin && (
<TabsContent value="github" className="pb-20 md:pb-0">
<Card>
<CardHeader>
<CardTitle>GitHub</CardTitle>
<CardDescription>Налаштування репозиторію для читання та комітів</CardDescription>
</CardHeader>
<CardContent className="space-y-4">
<div className="rounded-md bg-muted/40 border border-border/50 px-3 py-2 text-xs text-muted-foreground mb-2">
  Репозиторій та гілку налаштовуйте через <strong>селектор проекту</strong> у верхньому лівому куті.
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
<p className="text-xs text-muted-foreground">Потрібні права: repo (read + write
contents)</p>
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
<Button type="button" variant="outline" onClick={verifyGithub}
disabled={isCheckingGithub}>
<RefreshCw className="mr-2 h-4 w-4" />
{isCheckingGithub ? "Перевірка..." : "Перевірити підключення"}
</Button>
{statusBadge(githubStatus)}
</div>
</CardContent>
</Card>
</TabsContent>
)}

{isAdmin && (
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

// Synchronize to MinIO
void syncUserConfigToCloud();

toast.success("Адреси агентів збережено та синхронізовано з хмарою");
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

<Card>
<CardHeader className="pb-3">
<CardTitle className="text-base">Agent CLI</CardTitle>
<CardDescription className="text-xs">
CLI-агенти для Pipeline Chat (OpenAI-compatible). Можна додавати будь-яку кількість.
</CardDescription>
</CardHeader>
<CardContent className="space-y-3">
{settings.cliAgents.map((agent, idx) => (
<div key={agent.id} className="rounded-md border border-border p-3 space-y-2">
<div className="flex items-center justify-between">
<span className="text-xs font-medium text-muted-foreground font-mono">{agent.label || agent.id}</span>
<Button
type="button"
variant="ghost"
size="sm"
className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
onClick={() =>
updateSettings((prev) => ({
...prev,
cliAgents: prev.cliAgents.filter((_, i) => i !== idx),
}))
}
>
Видалити
</Button>
</div>
<div className="grid gap-2 sm:grid-cols-2">
<div className="grid gap-1">
<Label htmlFor={`cli-label-${idx}`} className="text-xs">Назва</Label>
<Input
id={`cli-label-${idx}`}
value={agent.label}
placeholder="RPi 3B"
onChange={(e) =>
updateSettings((prev) => ({
...prev,
cliAgents: prev.cliAgents.map((a, i) =>
i === idx ? { ...a, label: e.target.value } : a,
),
}))
}
/>
</div>
<div className="grid gap-1">
<Label htmlFor={`cli-url-${idx}`} className="text-xs">URL</Label>
<Input
id={`cli-url-${idx}`}
value={agent.url}
placeholder="https://claude.exodus.pp.ua"
onChange={(e) =>
updateSettings((prev) => ({
...prev,
cliAgents: prev.cliAgents.map((a, i) =>
i === idx ? { ...a, url: e.target.value } : a,
),
}))
}
/>
</div>
</div>
<div className="grid gap-1">
<Label htmlFor={`cli-key-${idx}`} className="text-xs">API Key (optional)</Label>
<Input
id={`cli-key-${idx}`}
type="password"
value={agent.apiKey}
placeholder="sk-..."
onChange={(e) =>
updateSettings((prev) => ({
...prev,
cliAgents: prev.cliAgents.map((a, i) =>
i === idx ? { ...a, apiKey: e.target.value } : a,
),
}))
}
/>
</div>
</div>
))}

<Button
type="button"
variant="outline"
size="sm"
className="w-full text-xs"
onClick={() =>
updateSettings((prev) => ({
...prev,
cliAgents: [
...prev.cliAgents,
{ id: `cli${prev.cliAgents.length + 1}`, url: "", label: "", apiKey: "" },
],
}))
}
>
+ Додати агент
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
)}

{isAdmin && (
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
<p><span className="font-medium">Протокол:</span> {typeof window !== "undefined" ?
localStorage.getItem("agent_llm_protocol") || "anthropic" : "anthropic"}</p>
<p><span className="font-medium">Base URL:</span> {typeof window !== "undefined" ?
localStorage.getItem("agent_llm_base_url") || "(з вкладки Агенти)" : "(з вкладки Агенти)"}</p>
<p><span className="font-medium">Модель:</span> {typeof window !== "undefined" ?
localStorage.getItem("agent_llm_model") || "(з вкладки Агенти)" : "(з вкладки Агенти)"}</p>
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
)}

{isAdmin && (
<TabsContent value="n8n">
<Card>
<CardHeader>
<CardTitle>n8n</CardTitle>
<CardDescription>n8n використовується для автоматизації pipeline
аналізу</CardDescription>
</CardHeader>
<CardContent className="space-y-4">
<div className="flex items-center justify-between rounded-md border border-border p-3">
<div>
<p className="text-sm font-medium">Увімкнути n8n інтеграцію</p>
<p className="text-xs text-muted-foreground">Вмикає використання n8n webhook та
API</p>
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
)}

{isAdmin && (
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
{" "}→ garden-mcp → Settings → Variables and Secrets.
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
)}

{isAdmin && (
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
)}

<TabsContent value="mcp">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Key className="h-4 w-4" />
        MCP Access Key
      </CardTitle>
      <CardDescription>
        Персональний ключ для підключення до DRAKON MCP сервера. Використовується в Antigravity, Claude Desktop та інших MCP-клієнтах.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {!isAdmin && (
        <div className="rounded-md bg-muted/40 border border-border/50 px-4 py-3 text-sm text-muted-foreground">
          <p>MCP Access Key — доступно після підключення GitHub OAuth.</p>
        </div>
      )}
      {isAdmin && (
        <>
          {isLoadingMcpKey ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Завантаження...
            </div>
          ) : mcpKey ? (
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label>Поточний ключ</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    readOnly
                    value={mcpKeyMasked || mcpKey}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => { navigator.clipboard.writeText(mcpKey); toast.success("Ключ скопійовано"); }}
                    title="Копіювати повний ключ"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Натисни кнопку для копіювання повного ключа</p>
              </div>

              <div className="grid gap-2">
                <Label>mcp_config.json для Antigravity / Claude Desktop</Label>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto cursor-pointer hover:bg-muted/70"
                  onClick={() => {
                    const cfg = JSON.stringify({
                      mcpServers: {
                        drakon: {
                          type: "http",
                          url: `${(settings.app.workerUrl || "https://drakon-antigravity-worker.maxfraieho.workers.dev").replace(/\/$/, "")}/mcp`,
                          serverUrl: `${(settings.app.workerUrl || "https://drakon-antigravity-worker.maxfraieho.workers.dev").replace(/\/$/, "")}/mcp`,
                          headers: { Authorization: `Bearer ${mcpKey}` }
                        }
                      }
                    }, null, 2);
                    navigator.clipboard.writeText(cfg);
                    toast.success("Config скопійовано");
                  }}
                >
    {`{
      "mcpServers": {
        "drakon": {
          "type": "http",
          "url": "${(settings.app.workerUrl || 'https://drakon-antigravity-worker.maxfraieho.workers.dev').replace(/\/$/,'')}/mcp",
          "headers": { "Authorization": "Bearer ${mcpKey ? `${mcpKey.slice(0, 14)}...${mcpKey.slice(-6)}` : ""}" }
        }
      }
    }`}
                </pre>
                <p className="text-xs text-muted-foreground">Натисни на блок — скопіює повний config з реальним ключем</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => void generateMcpKey()} disabled={isGeneratingMcpKey}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isGeneratingMcpKey ? "Генерую..." : "Перегенерувати ключ"}
                </Button>
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void revokeMcpKey()}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Відкликати ключ
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">У тебе ще немає MCP ключа. Створи його щоб підключити MCP клієнти.</p>
              <Button type="button" onClick={() => void generateMcpKey()} disabled={isGeneratingMcpKey}>
                <Key className="mr-2 h-4 w-4" />
                {isGeneratingMcpKey ? "Генерую..." : "Створити MCP ключ"}
              </Button>
            </div>
          )}
        </>
      )}
    </CardContent>
  </Card>
</TabsContent>
</Tabs>

<div className="fixed inset-x-0 bottom-16 border-t border-border bg-background/95 p-3 backdrop-blur md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
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

