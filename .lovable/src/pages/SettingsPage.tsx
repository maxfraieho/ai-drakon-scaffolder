import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "@tanstack/react-router";
import {
  Settings,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Activity,
  Cpu,
  Server,
  HelpCircle,
  ToggleLeft,
  Info,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { resolveWorkerUrl } from "@/lib/worker-url";
import { authHeaders } from "@/lib/graph-pipeline-api";
import { readSettings, writeSettings } from "@/lib/settings-storage";
import { N8NConnectionStatus, type N8NConnectionState } from "@/components/n8n/N8NConnectionStatus";
import type { AppSettings } from "@/types/settings";

function isValidHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const n8nSettingsSchema = z.object({
  baseUrl: z
    .string()
    .trim()
    .min(1, "N8N Instance URL is required")
    .url("Enter a valid URL")
    .refine((value) => value.startsWith("https://"), {
      message: "URL must start with https://",
    }),
  apiKey: z.string().trim().min(1, "API key is required"),
  webhookUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isValidHttpsUrl(value), "Webhook Base URL must be a valid https:// URL"),
});

type N8NSettingsFormValues = z.infer<typeof n8nSettingsSchema>;

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function deriveWebhookBaseUrl(baseUrl: string): string {
  return `${normalizeUrl(baseUrl)}/webhook`;
}

function getProjectSettingsStorageKey(slug: string): string {
  return `drakon.settings.project.${slug}`;
}

function readScopedSettings(slug: string | null): AppSettings {
  if (!slug || typeof window === "undefined") {
    return readSettings();
  }

  const fallback = readSettings();
  try {
    const raw = localStorage.getItem(getProjectSettingsStorageKey(slug));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as AppSettings;
    return {
      ...fallback,
      ...parsed,
      github: { ...fallback.github, ...parsed.github },
      n8n: { ...fallback.n8n, ...parsed.n8n },
      app: { ...fallback.app, ...parsed.app },
      minio: { ...fallback.minio, ...parsed.minio },
      agents: { ...fallback.agents, ...parsed.agents },
      cliAgents: Array.isArray(parsed.cliAgents) ? parsed.cliAgents : fallback.cliAgents,
    };
  } catch {
    return fallback;
  }
}

function writeScopedSettings(slug: string | null, settings: AppSettings): void {
  if (!slug || typeof window === "undefined") {
    writeSettings(settings);
    return;
  }

  localStorage.setItem(getProjectSettingsStorageKey(slug), JSON.stringify(settings));
}

export function SettingsPage() {
  const location = useLocation();
  const projectSlug = location.pathname.match(/^\/p\/([^/]+)\/settings(?:\/|$)/)?.[1] ?? null;

  // --- API Keys State ---
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [keys, setKeys] = useState({
    openai: typeof window !== "undefined" ? localStorage.getItem("OPENAI_API_KEY") ?? "" : "",
    anthropic: typeof window !== "undefined" ? localStorage.getItem("ANTHROPIC_API_KEY") ?? "" : "",
    gemini: typeof window !== "undefined" ? localStorage.getItem("GEMINI_API_KEY") ?? "" : "",
  });

  // --- Agent Config State ---
  const [autoRetry, setAutoRetry] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("enable_auto_retry") === "true";
    }
    return false;
  });

  const [debugMode, setDebugMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("debug_mode") === "true";
    }
    return false;
  });

  const [defaultModel, setDefaultModel] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("default_model") || "gemini-2.5-flash";
    }
    return "gemini-2.5-flash";
  });

  // --- LLM Proxy State ---
  const [proxyUrl, setProxyUrl] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("agent_llm_base_url") ?? "https://llm-proxy.fra.appwrite.run"
      : "https://llm-proxy.fra.appwrite.run"
  );
  const [proxyToken, setProxyToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("agent_llm_api_key") ?? "" : ""
  );
  const [proxyModel, setProxyModel] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("agent_llm_model") ?? "" : ""
  );
  const [proxyStatus, setProxyStatus] = useState<"idle" | "checking" | "online" | "offline">("idle");
  const [proxyDetail, setProxyDetail] = useState("");

  // --- System Info Status State ---
  const [gitNexusStatus, setGitNexusStatus] = useState<"checking" | "online" | "offline">("checking");
  const [gitNexusDetail, setGitNexusDetail] = useState<string>("Checking endpoint...");
  const [cfStatus, setCfStatus] = useState<"checking" | "online" | "offline">("checking");
  const [cfDetail, setCfDetail] = useState<string>("Checking worker...");
  const [authStatus, setAuthStatus] = useState<"checking" | "online" | "offline" | "idle">("idle");
  const [authDetail, setAuthDetail] = useState<string>("Click to verify Appwrite JWT & /me connection");
  const [showN8nApiKey, setShowN8nApiKey] = useState(false);
  const [isTestingN8n, setIsTestingN8n] = useState(false);
  const [n8nConnectionState, setN8nConnectionState] = useState<N8NConnectionState>("unconfigured");
  const [connectedN8nUrl, setConnectedN8nUrl] = useState("");

  const initialN8n = readScopedSettings(projectSlug).n8n;
  const n8nForm = useForm<N8NSettingsFormValues>({
    resolver: zodResolver(n8nSettingsSchema),
    defaultValues: {
      baseUrl: initialN8n.baseUrl,
      apiKey: initialN8n.apiKey,
      webhookUrl: initialN8n.webhookUrl,
    },
    mode: "onSubmit",
  });

  const watchedN8nBaseUrl = n8nForm.watch("baseUrl");

  const checkN8nConnection = async (
    values?: N8NSettingsFormValues,
    options?: { silent?: boolean },
  ): Promise<void> => {
    const payload = values ?? n8nForm.getValues();
    const normalizedBaseUrl = normalizeUrl(payload.baseUrl || "");
    const apiKey = payload.apiKey?.trim() || "";

    if (!normalizedBaseUrl || !apiKey) {
      setN8nConnectionState("unconfigured");
      setConnectedN8nUrl("");
      return;
    }

    setIsTestingN8n(true);
    try {
      const response = await fetch(`${normalizedBaseUrl}/api/v1/workflows`, {
        method: "GET",
        headers: {
          "X-N8N-API-KEY": apiKey,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.status === 401) {
        setN8nConnectionState("error");
        setConnectedN8nUrl("");
        if (!options?.silent) {
          toast.error("✗ Invalid API key");
        }
        return;
      }

      const payloadJson = (await response.json().catch(() => ({}))) as {
        data?: unknown[];
        workflows?: unknown[];
      };

      if (!response.ok) {
        setN8nConnectionState("error");
        setConnectedN8nUrl("");
        if (!options?.silent) {
          toast.error(`✗ Connection failed (HTTP ${response.status})`);
        }
        return;
      }

      const workflows = Array.isArray(payloadJson.data)
        ? payloadJson.data
        : Array.isArray(payloadJson.workflows)
          ? payloadJson.workflows
          : [];

      setN8nConnectionState("connected");
      setConnectedN8nUrl(normalizedBaseUrl);
      if (!options?.silent) {
        toast.success(`✓ Connected. Found ${workflows.length} workflows.`);
      }
    } catch {
      setN8nConnectionState("error");
      setConnectedN8nUrl("");
      if (!options?.silent) {
        toast.error("✗ Cannot reach N8N instance");
      }
    } finally {
      setIsTestingN8n(false);
    }
  };

  const handleTestN8nConnection = async (): Promise<void> => {
    const isValid = await n8nForm.trigger(["baseUrl", "apiKey", "webhookUrl"]);
    if (!isValid) {
      return;
    }
    await checkN8nConnection();
  };

  const handleSaveN8nSettings = async (values: N8NSettingsFormValues): Promise<void> => {
    const normalizedBaseUrl = normalizeUrl(values.baseUrl);
    const webhookUrl = values.webhookUrl?.trim()
      ? normalizeUrl(values.webhookUrl)
      : deriveWebhookBaseUrl(normalizedBaseUrl);

    const persisted = readScopedSettings(projectSlug);
    writeScopedSettings(projectSlug, {
      ...persisted,
      n8n: {
        ...persisted.n8n,
        baseUrl: normalizedBaseUrl,
        apiKey: values.apiKey.trim(),
        webhookUrl,
        enabled: true,
      },
    });

    n8nForm.reset({
      baseUrl: normalizedBaseUrl,
      apiKey: values.apiKey.trim(),
      webhookUrl,
    });

    toast.success("N8N settings saved");
    await checkN8nConnection(
      {
        baseUrl: normalizedBaseUrl,
        apiKey: values.apiKey.trim(),
        webhookUrl,
      },
      { silent: true },
    );
  };

  // --- Handlers ---
  const saveApiKey = (keyName: string, value: string, displayName: string) => {
    try {
      localStorage.setItem(keyName, value);
      toast.success(`${displayName} збережено успішно!`);
    } catch (e) {
      toast.error("Не вдалося зберегти ключ у localStorage");
    }
  };

  const handleAutoRetryChange = (checked: boolean) => {
    setAutoRetry(checked);
    localStorage.setItem("enable_auto_retry", String(checked));
    toast.success(`Авто-повтор спроб: ${checked ? "Увімкнено" : "Вимкнено"}`);
  };

  const handleDebugModeChange = (checked: boolean) => {
    setDebugMode(checked);
    localStorage.setItem("debug_mode", String(checked));
    toast.success(`Режим відладки (Debug mode): ${checked ? "Увімкнено" : "Вимкнено"}`);
  };

  const handleModelChange = (val: string) => {
    setDefaultModel(val);
    localStorage.setItem("default_model", val);
    toast.success(`Модель за замовчуванням змінено на: ${val}`);
  };

  // --- LLM Proxy Handlers ---
  const saveProxySettings = () => {
    const url = proxyUrl.trim();
    const token = proxyToken.trim();
    const model = proxyModel.trim();
    if (url) localStorage.setItem("agent_llm_base_url", url);
    if (token) localStorage.setItem("agent_llm_api_key", token);
    else localStorage.removeItem("agent_llm_api_key");
    if (model) localStorage.setItem("agent_llm_model", model);
    else localStorage.removeItem("agent_llm_model");
    localStorage.setItem("agent_llm_protocol", "openai");
    toast.success("Налаштування LLM Proxy збережено. Агенти використають при наступному запиті.");
  };

  const testProxyConnection = async () => {
    setProxyStatus("checking");
    setProxyDetail("Перевірка з'єднання...");
    try {
      const resp = await fetch(proxyUrl.trim(), {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setProxyStatus("online");
        setProxyDetail(data.service || data.status || "Онлайн");
      } else {
        setProxyStatus("offline");
        setProxyDetail(`HTTP ${resp.status}`);
      }
    } catch (e: any) {
      setProxyStatus("offline");
      setProxyDetail((e.message || "Недоступний").slice(0, 80));
    }
  };

  const checkGitNexusHealth = async () => {
    setGitNexusStatus("checking");
    setGitNexusDetail("Connecting...");
    try {
      const resp = await fetch("/api/health", { method: "GET" });
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setGitNexusStatus("online");
        setGitNexusDetail(data.status || data.message || "Healthy (OK)");
      } else {
        setGitNexusStatus("offline");
        setGitNexusDetail(`HTTP Error: ${resp.status}`);
      }
    } catch (e) {
      setGitNexusStatus("offline");
      setGitNexusDetail("Could not connect to /api/health");
    }
  };

  const checkCfHealth = async () => {
    setCfStatus("checking");
    setCfDetail("Connecting...");
    try {
      const workerUrl = resolveWorkerUrl().replace(/\/$/, "");
      const resp = await fetch(`${workerUrl}/health`, { method: "GET" });
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setCfStatus("online");
        setCfDetail(data.status || "Worker Online");
      } else {
        setCfStatus("offline");
        setCfDetail(`HTTP Error: ${resp.status}`);
      }
    } catch (e) {
      setCfStatus("offline");
      setCfDetail("Cloudflare Worker unreachable");
    }
  };

  const checkAuthStatus = async () => {
    setAuthStatus("checking");
    setAuthDetail("Fetching JWT & verifying /me...");
    try {
      const architectUrl = readScopedSettings(projectSlug).agents.architectUrl.replace(/\/+$/, "");
      const headers = await authHeaders();
      const resp = await fetch(`${architectUrl}/me`, {
        method: "GET",
        headers
      });
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setAuthStatus("online");
        setAuthDetail(JSON.stringify(data));
      } else {
        setAuthStatus("offline");
        const errText = await resp.text().catch(() => "Unknown error");
        setAuthDetail(`HTTP Error: ${resp.status} - ${errText}`);
      }
    } catch (e: any) {
      setAuthStatus("offline");
      setAuthDetail(e.message || "Failed to verify JWT / /me endpoint");
    }
  };

  const runAllChecks = () => {
    checkGitNexusHealth();
    checkCfHealth();
    checkAuthStatus();
  };

  useEffect(() => {
    runAllChecks();
  }, [projectSlug]);

  useEffect(() => {
    const currentWebhook = (n8nForm.getValues("webhookUrl") || "").trim();
    const nextWebhook = watchedN8nBaseUrl.trim() ? deriveWebhookBaseUrl(watchedN8nBaseUrl) : "";
    if (!currentWebhook && nextWebhook) {
      n8nForm.setValue("webhookUrl", nextWebhook, { shouldDirty: true, shouldValidate: true });
    }
  }, [watchedN8nBaseUrl, n8nForm]);

  useEffect(() => {
    if (initialN8n.baseUrl && initialN8n.apiKey) {
      const hydrated: N8NSettingsFormValues = {
        baseUrl: initialN8n.baseUrl,
        apiKey: initialN8n.apiKey,
        webhookUrl: initialN8n.webhookUrl || deriveWebhookBaseUrl(initialN8n.baseUrl),
      };
      n8nForm.reset(hydrated);
      void checkN8nConnection(hydrated, { silent: true });
      return;
    }

    setN8nConnectionState("unconfigured");
    setConnectedN8nUrl("");
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Налаштування</h1>
            <p className="text-sm text-zinc-400 mt-1">Керування ключами доступу, конфігурацією агентів та моніторинг системи</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runAllChecks}
          className="flex items-center gap-2 border-zinc-800 hover:bg-zinc-900 text-zinc-300"
        >
          <RefreshCw className="w-4 h-4" />
          Оновити статуси
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Columns - Inputs and Configurations */}
        <div className="md:col-span-2 space-y-6">

          {/* API Keys Card */}
          <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b border-zinc-800/80 pb-4">
              <CardTitle className="text-xl font-medium flex items-center gap-2 text-zinc-100">
                <Cpu className="w-5 h-5 text-amber-500" />
                API Ключі Провайдерів
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Встановіть ваші персональні ключі доступу до LLM провайдерів. Ключі зберігаються виключно локально у вашому браузері.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {[
                {
                  id: "openai",
                  label: "OpenAI API Key",
                  storeKey: "OPENAI_API_KEY",
                  placeholder: "sk-proj-...",
                  displayName: "OpenAI API Key"
                },
                {
                  id: "anthropic",
                  label: "Anthropic API Key",
                  storeKey: "ANTHROPIC_API_KEY",
                  placeholder: "sk-ant-...",
                  displayName: "Anthropic API Key"
                },
                {
                  id: "gemini",
                  label: "Gemini API Key",
                  storeKey: "GEMINI_API_KEY",
                  placeholder: "AIzaSy...",
                  displayName: "Gemini API Key"
                },
              ].map(({ id, label, storeKey, placeholder, displayName }) => (
                <div key={id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={id} className="text-sm font-medium text-zinc-300">
                      {label}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={id}
                        type={show[id] ? "text" : "password"}
                        placeholder={placeholder}
                        value={keys[id as keyof typeof keys]}
                        onChange={e => setKeys(p => ({ ...p, [id]: e.target.value }))}
                        className="bg-zinc-950/80 border-zinc-800 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 text-zinc-100 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShow(p => ({ ...p, [id]: !p[id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {show[id] ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                    <Button
                      size="icon"
                      onClick={() => saveApiKey(storeKey, keys[id as keyof typeof keys], displayName)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 hover:border-zinc-600 shadow-md transition-all shrink-0"
                    >
                      <Save size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* LLM Proxy Server Card */}
          <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b border-zinc-800/80 pb-4">
              <CardTitle className="text-xl font-medium flex items-center gap-2 text-zinc-100">
                <Globe className="w-5 h-5 text-amber-500" />
                LLM Proxy Server
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Адреса та токен проксі-сервера LLM для AI-агентів. Передаються агентам у кожному запиті.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proxy-url" className="text-sm font-medium text-zinc-300">
                  Proxy URL
                </Label>
                <Input
                  id="proxy-url"
                  type="text"
                  placeholder="https://llm-proxy.fra.appwrite.run"
                  value={proxyUrl}
                  onChange={e => setProxyUrl(e.target.value)}
                  className="bg-zinc-950/80 border-zinc-800 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 text-zinc-100 font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proxy-token" className="text-sm font-medium text-zinc-300">
                  Auth Token
                </Label>
                <div className="relative">
                  <Input
                    id="proxy-token"
                    type={show["proxy-token"] ? "text" : "password"}
                    placeholder="freecc"
                    value={proxyToken}
                    onChange={e => setProxyToken(e.target.value)}
                    className="bg-zinc-950/80 border-zinc-800 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 text-zinc-100 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(p => ({ ...p, "proxy-token": !p["proxy-token"] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {show["proxy-token"] ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proxy-model" className="text-sm font-medium text-zinc-300">
                  Model <span className="text-zinc-500 font-normal">(опційно — залиште порожнім для авто)</span>
                </Label>
                <Input
                  id="proxy-model"
                  type="text"
                  placeholder="llama-3.3-70b-versatile"
                  value={proxyModel}
                  onChange={e => setProxyModel(e.target.value)}
                  className="bg-zinc-950/80 border-zinc-800 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 text-zinc-100 font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={saveProxySettings}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-0"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Зберегти
                </Button>
                <Button
                  variant="outline"
                  onClick={testProxyConnection}
                  disabled={proxyStatus === "checking"}
                  className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                >
                  {proxyStatus === "checking" ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4" />
                  )}
                  <span className="ml-2">Тест</span>
                </Button>
              </div>
              {proxyStatus !== "idle" && (
                <div className={`flex items-center gap-2 p-2 rounded-lg text-xs font-mono ${
                  proxyStatus === "online"
                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/30"
                    : proxyStatus === "offline"
                    ? "bg-red-950/40 text-red-400 border border-red-800/30"
                    : "bg-zinc-950/40 text-zinc-400 border border-zinc-800"
                }`}>
                  {proxyStatus === "online" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  {proxyStatus === "offline" && <ShieldAlert className="w-3.5 h-3.5 shrink-0" />}
                  {proxyStatus === "checking" && <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />}
                  {proxyDetail}
                </div>
              )}
            </CardContent>
          </Card>

          {/* N8N Integration Card */}
          <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b border-zinc-800/80 pb-4">
              <CardTitle className="text-xl font-medium flex items-center gap-2 text-zinc-100">
                <Globe className="w-5 h-5 text-amber-500" />
                N8N Integration
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Configure your N8N instance and API key for workflow compilation and deployment.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <N8NConnectionStatus status={n8nConnectionState} n8nUrl={connectedN8nUrl} checking={isTestingN8n} />

              <Form {...n8nForm}>
                <form onSubmit={n8nForm.handleSubmit(handleSaveN8nSettings)} className="space-y-4">
                  <FormField
                    control={n8nForm.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300">N8N Instance URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://your-n8n.instance.com"
                            className="bg-zinc-950/80 border-zinc-800 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 text-zinc-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={n8nForm.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300">API Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showN8nApiKey ? "text" : "password"}
                              className="bg-zinc-950/80 border-zinc-800 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 text-zinc-100 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowN8nApiKey((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                              aria-label="Toggle N8N API key visibility"
                            >
                              {showN8nApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormDescription className="text-zinc-500">
                          Found in N8N → Settings → API → Create API Key
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={n8nForm.control}
                    name="webhookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300">Webhook Base URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://your-n8n.instance.com/webhook"
                            className="bg-zinc-950/80 border-zinc-800 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 text-zinc-100"
                          />
                        </FormControl>
                        <FormDescription className="text-zinc-500">
                          Optional. If empty, this field is auto-filled from the instance URL.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestN8nConnection}
                      disabled={isTestingN8n}
                      className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                    >
                      {isTestingN8n ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Activity className="w-4 h-4" />
                      )}
                      <span className="ml-2">Test Connection</span>
                    </Button>

                    <Button
                      type="submit"
                      disabled={n8nForm.formState.isSubmitting}
                      className="bg-amber-600 hover:bg-amber-700 text-white border-0"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Agent Configuration Card */}
          <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b border-zinc-800/80 pb-4">
              <CardTitle className="text-xl font-medium flex items-center gap-2 text-zinc-100">
                <ToggleLeft className="w-5 h-5 text-amber-500" />
                Конфігурація Агента
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Налаштуйте поведінку штучного інтелекту та параметри виконання завдань.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              {/* Dropdown Selector */}
              <div className="space-y-2">
                <Label htmlFor="default-model" className="text-sm font-medium text-zinc-300">
                  Модель за замовчуванням
                </Label>
                <Select value={defaultModel} onValueChange={handleModelChange}>
                  <SelectTrigger id="default-model" className="bg-zinc-950/80 border-zinc-800 text-zinc-200 focus:ring-amber-500/20">
                    <SelectValue placeholder="Оберіть модель" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-850 text-zinc-100">
                    <SelectItem value="gemini-2.5-flash" className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">gemini-2.5-flash</SelectItem>
                    <SelectItem value="claude-3-5-sonnet" className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">claude-3-5-sonnet</SelectItem>
                    <SelectItem value="gpt-4o" className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">gpt-4o</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/40 border border-zinc-850">
                  <div className="space-y-0.5 pr-4">
                    <Label htmlFor="auto-retry" className="text-sm font-medium text-zinc-200 cursor-pointer">
                      Авто-повтор спроб (Auto-retry)
                    </Label>
                    <p className="text-xs text-zinc-400">
                      Автоматично повторювати невдалі запити до API провайдерів при помилках мережі чи лімітів.
                    </p>
                  </div>
                  <Switch
                    id="auto-retry"
                    checked={autoRetry}
                    onCheckedChange={handleAutoRetryChange}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/40 border border-zinc-850">
                  <div className="space-y-0.5 pr-4">
                    <Label htmlFor="debug-mode" className="text-sm font-medium text-zinc-200 cursor-pointer">
                      Режим відладки (Debug Mode)
                    </Label>
                    <p className="text-xs text-zinc-400">
                      Логувати детальні кроки та системні події в консоль розробника для швидкої діагностики.
                    </p>
                  </div>
                  <Switch
                    id="debug-mode"
                    checked={debugMode}
                    onCheckedChange={handleDebugModeChange}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column - System Info and Health Statuses */}
        <div className="space-y-6">

          <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b border-zinc-800/80 pb-4">
              <CardTitle className="text-xl font-medium flex items-center gap-2 text-zinc-100">
                <Info className="w-5 h-5 text-amber-500" />
                Інформація про систему
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Основні версії та підключені сервіси платформи.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">

              {/* App Version & Build info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-850">
                  <span className="text-xs text-zinc-500 block mb-0.5">Версія додатку</span>
                  <span className="text-sm font-semibold text-zinc-200 font-mono">v1.2.4-alpha</span>
                </div>
                <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-850">
                  <span className="text-xs text-zinc-500 block mb-0.5">Дата збірки</span>
                  <span className="text-sm font-semibold text-zinc-200 font-mono">2026-06-07</span>
                </div>
              </div>

              {/* Health checks */}
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-zinc-500" />
                      GitNexus Status
                    </span>
                    <button
                      onClick={checkGitNexusHealth}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                      title="Перевірити знову"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${gitNexusStatus === "checking" ? "animate-spin text-amber-500" : ""}`} />
                    </button>
                  </div>
                  <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-850 flex items-center gap-3">
                    <div className="shrink-0">
                      {gitNexusStatus === "online" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {gitNexusStatus === "offline" && <ShieldAlert className="w-5 h-5 text-red-500" />}
                      {gitNexusStatus === "checking" && <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-200 capitalize">
                        {gitNexusStatus === "online" ? "Підключено" : gitNexusStatus === "offline" ? "Помилка" : "Перевірка..."}
                      </div>
                      <div className="text-xs text-zinc-500 truncate font-mono">
                        {gitNexusDetail}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-zinc-500" />
                      Cloudflare Status
                    </span>
                    <button
                      onClick={checkCfHealth}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                      title="Перевірити знову"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${cfStatus === "checking" ? "animate-spin text-amber-500" : ""}`} />
                    </button>
                  </div>
                  <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-850 flex items-center gap-3">
                    <div className="shrink-0">
                      {cfStatus === "online" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {cfStatus === "offline" && <ShieldAlert className="w-5 h-5 text-red-500" />}
                      {cfStatus === "checking" && <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-200 capitalize">
                        {cfStatus === "online" ? "Підключено" : cfStatus === "offline" ? "Помилка" : "Перевірка..."}
                      </div>
                      <div className="text-xs text-zinc-500 truncate font-mono">
                        {cfDetail}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
                      JWT Auth Status (/me)
                    </span>
                    <button
                      onClick={checkAuthStatus}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                      title="Перевірити знову"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${authStatus === "checking" ? "animate-spin text-amber-500" : ""}`} />
                    </button>
                  </div>
                  <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-850 flex items-center gap-3">
                    <div className="shrink-0">
                      {authStatus === "online" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {authStatus === "offline" && <ShieldAlert className="w-5 h-5 text-red-500" />}
                      {authStatus === "checking" && <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />}
                      {authStatus === "idle" && <HelpCircle className="w-5 h-5 text-zinc-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-200 capitalize">
                        {authStatus === "online" ? "Авторизовано" : authStatus === "offline" ? "Помилка" : authStatus === "checking" ? "Перевірка..." : "Не перевірено"}
                      </div>
                      <div className="text-xs text-zinc-500 truncate font-mono" title={authDetail}>
                        {authDetail}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
