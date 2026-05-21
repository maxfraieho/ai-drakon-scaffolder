import { useEffect, useState } from "react";
import { checkAgentHealth } from "@/lib/agent-api";
import { ChevronDown, ChevronRight, Eye, EyeOff, Plug, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { AgentId } from "@/types/agent-chat";

interface AgentLlmCardProps {
agentId: AgentId;
agentLabel: string;
agentColor: "blue" | "violet" | "emerald";
agentDescription: string;
agentIcon?: string;
}

const PROTOCOL_PRESETS = {
openai: {
baseUrl: "https://openai-proxy.exodus.pp.ua/v1",
apiKey: "freecc",
hint: "OpenAI-сумісний (Bearer токен)",
modelsPath: "/models",
authHeader: (key: string): Record<string, string> => ({
Authorization: Bearer ${key},
}),
},
anthropic: {
baseUrl: "https://claude-proxy.exodus.pp.ua",
apiKey: "freecc",
hint: "Anthropic (x-api-key заголовок)",
modelsPath: "/v1/models",
authHeader: (key: string): Record<string, string> => ({
"x-api-key": key,
"anthropic-version": "2023-06-01",
}),
},
} as const;

const RECOMMENDED: Record<string, string[]> = {
openai: [
"docs-assistant-proxy",
"coding-proxy",
"standard-proxy",
"fast-proxy",
"reasoning-proxy",
],
anthropic: [
"claude-opus-4-20250514",
"claude-sonnet-4-20250514",
"claude-haiku-4-20250514",
],
};

const COLOR_STYLES: Record<
AgentLlmCardProps["agentColor"],
{ border: string; dot: string; chipBg: string; chipText: string }
      ={
blue: {
border: "border-l-blue-500",
dot: "bg-blue-500",
chipBg: "bg-blue-500/10",
chipText: "text-blue-600 dark:text-blue-400",
},
violet: {
border: "border-l-violet-500",
dot: "bg-violet-500",
chipBg: "bg-violet-500/10",
chipText: "text-violet-600 dark:text-violet-400",
},
emerald: {
border: "border-l-emerald-500",
dot: "bg-emerald-500",
chipBg: "bg-emerald-500/10",
chipText: "text-emerald-600 dark:text-emerald-400",
},
};

function readFromStorage(agentId: string) {
if (typeof window === "undefined") return null;
const protocol =
(localStorage.getItem(${agentId}_llm_protocol) as "openai" | "anthropic" | null) || "openai";
return {
protocol,
baseUrl: localStorage.getItem(${agentId}_llm_base_url) || "",
apiKey: localStorage.getItem(${agentId}_llm_api_key) || "freecc",
model: localStorage.getItem(${agentId}_llm_model) || "",
maxTokens: localStorage.getItem(${agentId}_llm_max_tokens) || "",
};
}

export function AgentLlmCard({
agentId,
agentLabel,
agentColor,
agentDescription,
agentIcon,
}: AgentLlmCardProps) {
const saved = readFromStorage(agentId);
const initialProtocol = (saved?.protocol ?? "openai") as "openai" | "anthropic";
const [protocol, setProtocol] = useState<"openai" | "anthropic">(initialProtocol);
const [baseUrl, setBaseUrl] = useState(
saved?.baseUrl || PROTOCOL_PRESETS[initialProtocol].baseUrl,
);
const [apiKey, setApiKey] = useState(saved?.apiKey || "freecc");
const [model, setModel] = useState(saved?.model || RECOMMENDED[initialProtocol][0] || "");
const [maxTokens, setMaxTokens] = useState(saved?.maxTokens || "");
const [showKey, setShowKey] = useState(false);
const [showAdvanced, setShowAdvanced] = useState(false);
const [models, setModels] = useState<string[]>(RECOMMENDED[initialProtocol]);
const [connecting, setConnecting] = useState(false);
const [connected, setConnected] = useState(false);
const [agentAlive, setAgentAlive] = useState<boolean | null>(null);

useEffect(() => {
let cancelled = false;
checkAgentHealth(agentId).then((ok) => {
if (!cancelled) setAgentAlive(ok);
});
return () => {
cancelled = true;
};
}, [agentId]);
const styles = COLOR_STYLES[agentColor];

const handleProtocolChange = (p: "openai" | "anthropic") => {
setProtocol(p);
setBaseUrl(PROTOCOL_PRESETS[p].baseUrl);
setApiKey(PROTOCOL_PRESETS[p].apiKey);
setModels(RECOMMENDED[p]);
setModel(RECOMMENDED[p][0] ?? "");
setConnected(false);
};

const handleConnect = async () => {
setConnecting(true);
setConnected(false);
try {
const preset = PROTOCOL_PRESETS[protocol];
let normalized = baseUrl.replace(/\/+$/, "");
// For OpenAI-compatible proxies ensure /v1 suffix
if (protocol === "openai" && !/\/v\d+$/.test(normalized)) {
normalized = ${normalized}/v1;
setBaseUrl(normalized);
}
const url = ${normalized}${preset.modelsPath};
const res = await fetch(url, { headers: preset.authHeader(apiKey) });
if (!res.ok) throw new Error(HTTP ${res.status});
const data = (await res.json()) as { data?: Array<{ id: string }> };
const fetched = (data.data || []).map((m) => m.id);
const recommended = RECOMMENDED[protocol];
const merged = [...recommended, ...fetched.filter((id) => !recommended.includes(id))];
setModels(merged);
if (merged.length > 0 && !model) setModel(merged[0]);
setConnected(true);
toast.success(✓ ${agentLabel}: підключено, ${fetched.length} моделей);
} catch (e) {
toast.error(✗ ${agentLabel}: ${e instanceof Error ? e.message : "помилка
з'єднання"});
} finally {
setConnecting(false);
}
};

const handleSave = () => {
localStorage.setItem(${agentId}_llm_protocol, protocol);
localStorage.setItem(${agentId}_llm_base_url, baseUrl);
localStorage.setItem(${agentId}_llm_api_key, apiKey);
localStorage.setItem(${agentId}_llm_model, model);
if (maxTokens) localStorage.setItem(${agentId}_llm_max_tokens, maxTokens);
else localStorage.removeItem(${agentId}_llm_max_tokens);
toast.success(${agentLabel}: налаштування збережено);
};

return (
<div
className={rounded-lg border border-border border-l-4 ${styles.border} bg-card
p-3 sm:p-4 space-y-3 sm:space-y-4 shadow-sm}
>
{/ Header /}
<div className="flex items-start justify-between gap-2">
<div className="flex items-start gap-2 min-w-0">
{agentIcon && (
<div
className={flex h-8 w-8 shrink-0 items-center justify-center rounded-md
${styles.chipBg} ${styles.chipText} text-base font-semibold}
aria-hidden
>
{agentIcon}
</div>
)}
<div className="min-w-0">
<p className="font-semibold text-sm leading-tight truncate">{agentLabel}</p>
<p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">
{agentDescription}
</p>
</div>
</div>
<div className="flex items-center gap-1.5 shrink-0">
{/ Agent service health /}
<span
title={agentAlive === null ? "Перевірка..." : agentAlive ? "Агент онлайн" : "Агент офлайн"}
className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium
${
agentAlive === null
? "bg-muted text-muted-foreground"
: agentAlive
? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
: "bg-red-500/10 text-red-600 dark:text-red-400"
}`}
>
<span
className={`h-1.5 w-1.5 rounded-full ${
agentAlive === null
? "bg-muted-foreground/40"
: agentAlive
? "bg-emerald-500"
: "bg-red-500"
}`}
/>
{agentAlive === null ? "…" : agentAlive ? "Online" : "Offline"}
</span>
{/ LLM connection /}
<span
className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium
${
connected
? ${styles.chipBg} ${styles.chipText}
: "bg-muted text-muted-foreground"
}`}
>
<span
className={h-1.5 w-1.5 rounded-full ${connected ? styles.dot :
"bg-muted-foreground/50"}}
/>
{connected ? "LLM ок" : "LLM ?"}
</span>
</div>
</div>

{/ Grid: protocol + URL /}
<div className="grid gap-3 sm:grid-cols-2">
<div className="grid gap-1.5">
<Label className="text-xs">Протокол</Label>
<Select
value={protocol}
onValueChange={(v) => handleProtocolChange(v as "openai" | "anthropic")}
>
<SelectTrigger className="h-8 text-xs">
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="openai">OpenAI-сумісний</SelectItem>
<SelectItem value="anthropic">Anthropic</SelectItem>
</SelectContent>
</Select>
<p className="text-[10px] text-muted-foreground">
{PROTOCOL_PRESETS[protocol].hint}
</p>
</div>

<div className="grid gap-1.5">
<Label className="text-xs">API ключ</Label>
<div className="relative">
<Input
type={showKey ? "text" : "password"}
value={apiKey}
onChange={(e) => setApiKey(e.target.value)}
className="h-8 text-xs pr-8"
placeholder="freecc"
/>
<button
type="button"
className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
onClick={() => setShowKey((p) => !p)}
aria-label="Toggle key"
>
{showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
</button>
</div>
</div>
</div>

{/ URL + Connect button /}
<div className="grid gap-1.5">
<Label className="text-xs">URL провайдера</Label>
<div className="flex flex-col sm:flex-row gap-2">
<Input
value={baseUrl}
onChange={(e) => {
setBaseUrl(e.target.value);
setConnected(false);
}}
placeholder={PROTOCOL_PRESETS[protocol].baseUrl}
className="h-8 text-xs flex-1"
/>
<Button
type="button"
size="sm"
variant="outline"
className="h-8 px-3 gap-1.5 text-xs shrink-0"
onClick={handleConnect}
disabled={connecting}
>
<Plug className={h-3 w-3 ${connecting ? "animate-pulse" : ""}} />
{connecting ? "Підключаю..." : "Підключити"}
</Button>
</div>
</div>

{/ Model dropdown + manual /}
<div className="grid gap-1.5">
<div className="flex items-center justify-between">
<Label className="text-xs">Модель / Слот</Label>
<button
type="button"
className="text-[10px] text-muted-foreground inline-flex items-center gap-1
hover:text-foreground disabled:opacity-50"
onClick={handleConnect}
disabled={connecting}
>
<RefreshCw className={h-3 w-3 ${connecting ? "animate-spin" : ""}} />
Оновити
</button>
</div>
<Select value={models.includes(model) ? model : ""} onValueChange={setModel}>
<SelectTrigger className="h-8 text-xs">
<SelectValue placeholder="Оберіть модель..." />
</SelectTrigger>
<SelectContent>
{models.map((m) => (
<SelectItem key={m} value={m} className="text-xs">
{m}
</SelectItem>
))}
</SelectContent>
</Select>
<Input
value={model}
onChange={(e) => setModel(e.target.value)}
placeholder="...або вкажи власну назву"
className="h-7 text-[11px] text-muted-foreground"
/>
</div>

{/ Advanced /}
<div>
<button
type="button"
className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
onClick={() => setShowAdvanced((p) => !p)}
>
{showAdvanced ? (
<ChevronDown className="h-3 w-3" />
):(
<ChevronRight className="h-3 w-3" />
)}
Розширені
</button>
{showAdvanced && (
<div className="mt-2 grid gap-1.5">
<Label className="text-xs">Ліміт токенів (max_tokens)</Label>
<Input
type="number"
value={maxTokens}
onChange={(e) => setMaxTokens(e.target.value)}
placeholder="2048 (за замовчуванням)"
className="h-8 text-xs"
min={256}
max={32000}
step={256}
/>
<p className="text-[10px] text-muted-foreground">
Обмеження відповіді моделі. Менше = дешевше та швидше.
</p>
</div>
)}
</div>

<Button
type="button"
size="sm"
className="w-full h-8 gap-2 text-xs"
onClick={handleSave}
>
<Save className="h-3 w-3" />
Зберегти {agentLabel}
</Button>
</div>
);
}

