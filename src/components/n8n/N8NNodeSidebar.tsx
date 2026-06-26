import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type N8NNodeType = "Webhook" | "HTTP Request" | "Telegram" | "Code" | "IF Condition";

export type N8NNodeConfig = {
  nodeType: N8NNodeType;
  method?: "GET" | "POST";
  path?: string;
  url?: string;
  body?: string;
  chatId?: string;
  text?: string;
  jsCode?: string;
  credentialName?: string;
};

interface N8NNodeSidebarProps {
  activeNodeId: string;
  config: N8NNodeConfig;
  onChange: (next: N8NNodeConfig) => void;
}

function updatePartial(
  current: N8NNodeConfig,
  patch: Partial<N8NNodeConfig>,
): N8NNodeConfig {
  return { ...current, ...patch };
}

export function N8NNodeSidebar({ activeNodeId, config, onChange }: N8NNodeSidebarProps) {
  const update = (patch: Partial<N8NNodeConfig>) => onChange(updatePartial(config, patch));

  return (
    <aside className="h-full rounded-xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">N8N Node Settings</p>
        <p className="mt-1 truncate text-sm text-slate-200">Node: {activeNodeId}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-slate-300">N8N Node Type</Label>
          <Select
            value={config.nodeType}
            onValueChange={(value) => update({ nodeType: value as N8NNodeType })}
          >
            <SelectTrigger className="border-white/15 bg-black/20 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/15 bg-slate-950 text-slate-100">
              <SelectItem value="Webhook">Webhook</SelectItem>
              <SelectItem value="HTTP Request">HTTP Request</SelectItem>
              <SelectItem value="Telegram">Telegram</SelectItem>
              <SelectItem value="Code">Code</SelectItem>
              <SelectItem value="IF Condition">IF Condition</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.nodeType === "Webhook" ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Path</Label>
              <Input
                value={config.path ?? ""}
                onChange={(event) => update({ path: event.target.value })}
                className="border-white/15 bg-black/20 text-slate-100"
                placeholder="/webhook/new-order"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Method</Label>
              <Select
                value={config.method ?? "POST"}
                onValueChange={(value) => update({ method: value as "GET" | "POST" })}
              >
                <SelectTrigger className="border-white/15 bg-black/20 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/15 bg-slate-950 text-slate-100">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}

        {config.nodeType === "HTTP Request" ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-slate-300">URL</Label>
              <Input
                value={config.url ?? ""}
                onChange={(event) => update({ url: event.target.value })}
                className="border-white/15 bg-black/20 text-slate-100"
                placeholder="https://api.example.com/items"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Method</Label>
              <Select
                value={config.method ?? "POST"}
                onValueChange={(value) => update({ method: value as "GET" | "POST" })}
              >
                <SelectTrigger className="border-white/15 bg-black/20 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/15 bg-slate-950 text-slate-100">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Body</Label>
              <Textarea
                value={config.body ?? ""}
                onChange={(event) => update({ body: event.target.value })}
                className="min-h-24 border-white/15 bg-black/20 text-slate-100"
                placeholder='{"name":"example"}'
              />
            </div>
          </>
        ) : null}

        {config.nodeType === "Telegram" ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Chat ID</Label>
              <Input
                value={config.chatId ?? ""}
                onChange={(event) => update({ chatId: event.target.value })}
                className="border-white/15 bg-black/20 text-slate-100"
                placeholder="123456789"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Text</Label>
              <Textarea
                value={config.text ?? ""}
                onChange={(event) => update({ text: event.target.value })}
                className="min-h-24 border-white/15 bg-black/20 text-slate-100"
                placeholder="Build complete"
              />
            </div>
          </>
        ) : null}

        {config.nodeType === "Code" ? (
          <div className="space-y-1.5">
            <Label className="text-slate-300">JavaScript Code</Label>
            <Textarea
              value={config.jsCode ?? ""}
              onChange={(event) => update({ jsCode: event.target.value })}
              className="min-h-36 border-white/15 bg-black/20 font-mono text-slate-100"
              placeholder="return items;"
            />
          </div>
        ) : null}

        {config.nodeType === "IF Condition" ? (
          <div className="rounded-md border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-200">
            Condition is configured in DRAKON question branch links (YES/NO outputs).
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label className="text-slate-300">Credential name in N8N instance</Label>
          <Input
            value={config.credentialName ?? ""}
            onChange={(event) => update({ credentialName: event.target.value })}
            className="border-white/15 bg-black/20 text-slate-100"
            placeholder="my-n8n-credential"
          />
        </div>
      </div>
    </aside>
  );
}
