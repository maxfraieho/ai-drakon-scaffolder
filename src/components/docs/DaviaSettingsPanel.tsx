import { useState } from "react";
import { ChevronDown, Eye, EyeOff, Play, RefreshCw, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DaviaSettings } from "@/hooks/useDaviaSettings";

interface ModelInfo {
  id: string;
  owned_by?: string;
}

const RECOMMENDED: ModelInfo[] = [
  { id: "free/standard-proxy", owned_by: "free-proxy" },
  { id: "free/fast-proxy", owned_by: "free-proxy" },
  { id: "free/coding-proxy", owned_by: "free-proxy" },
  { id: "free/docs-assistant-proxy", owned_by: "free-proxy" },
];

const SLIDER_HINTS = [
  { v: 3000, label: "3000 — Безкоштовні моделі (ліміт проксі)" },
  { v: 6000, label: "6000 — Середній" },
  { v: 12000, label: "12000 — CodeProxy (рекомендовано)" },
  { v: 30000, label: "30000 — Великі моделі" },
];

interface Props {
  settings: DaviaSettings;
  onSave: (updates: Partial<DaviaSettings>) => void;
  onReset: () => void;
}

export function DaviaSettingsPanel({ settings, onSave, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DaviaSettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>(RECOMMENDED);
  const [testing, setTesting] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const update = (patch: Partial<DaviaSettings>) => setDraft((p) => ({ ...p, ...patch }));

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${draft.baseUrl.replace(/\/+$/, "")}/models`, {
        headers: draft.apiKey ? { Authorization: `Bearer ${draft.apiKey}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("✓ Проксі доступне");
    } catch (e) {
      toast.error("✗ Не вдалося", { description: e instanceof Error ? e.message : "" });
    } finally {
      setTesting(false);
    }
  };

  const handleLoadModels = async () => {
    setLoadingModels(true);
    try {
      const res = await fetch(`${draft.baseUrl.replace(/\/+$/, "")}/models`, {
        headers: draft.apiKey ? { Authorization: `Bearer ${draft.apiKey}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { data?: ModelInfo[] };
      const list = Array.isArray(data.data) ? data.data : [];
      const merged = [...RECOMMENDED, ...list.filter((m) => !RECOMMENDED.some((r) => r.id === m.id))];
      setModels(merged);
      toast.success(`Завантажено моделей: ${list.length}`);
    } catch (e) {
      toast.error("Помилка завантаження моделей", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = () => {
    onSave(draft);
    toast.success("Налаштування провайдера збережено");
  };

  const handleReset = () => {
    onReset();
    setDraft({ ...settings });
    toast.message("Скинуто до за замовчуванням");
  };

  const grouped = models.reduce<Record<string, ModelInfo[]>>((acc, m) => {
    const k = m.owned_by || "other";
    (acc[k] ||= []).push(m);
    return acc;
  }, {});

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/40">
        <span>Налаштування провайдера</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t border-border p-3">
        <div className="grid gap-2">
          <Label htmlFor="davia-url">URL проксі</Label>
          <div className="flex gap-2">
            <Input
              id="davia-url"
              value={draft.baseUrl}
              onChange={(e) => update({ baseUrl: e.target.value })}
              placeholder="https://claude2.exodus.pp.ua/v1"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              <Play className="mr-1 h-3 w-3" />
              {testing ? "..." : "Тест"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">OpenAI-сумісний ендпоінт</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="davia-key">API ключ</Label>
          <div className="relative">
            <Input
              id="davia-key"
              type={showKey ? "text" : "password"}
              value={draft.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowKey((p) => !p)}
              aria-label="Toggle key"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Модель / Слот</Label>
          <div className="flex gap-2">
            <Select value={draft.model} onValueChange={(v) => update({ model: v })}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Оберіть модель" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(grouped).map(([group, items]) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{group}</SelectLabel>
                    {items.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.id}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={handleLoadModels} disabled={loadingModels}>
              <RefreshCw className={`mr-1 h-3 w-3 ${loadingModels ? "animate-spin" : ""}`} />
              Завантажити
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="davia-tokens">Розмір контексту (chunk size): {draft.maxTokens}</Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[draft.maxTokens]}
              min={1000}
              max={30000}
              step={500}
              onValueChange={(v) => update({ maxTokens: v[0] })}
              className="flex-1"
            />
            <Input
              id="davia-tokens"
              type="number"
              min={1000}
              max={30000}
              step={500}
              value={draft.maxTokens}
              onChange={(e) => update({ maxTokens: Number(e.target.value) || 1000 })}
              className="w-24"
            />
          </div>
          <ul className="space-y-0.5 text-[11px] text-muted-foreground">
            {SLIDER_HINTS.map((h) => (
              <li key={h.v}>{h.label}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Скільки символів передається в модель за раз. Менше = безпечніше для безкоштовних моделей.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Зберегти налаштування
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Скинути
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
