import { useState } from "react";
import { ChevronDown, FolderOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateVersionName, type DaviaSettings } from "@/hooks/useDaviaSettings";
import { docsApi, type DocsVersionItem } from "@/lib/docs-api";

interface Props {
  settings: DaviaSettings;
  onSave: (updates: Partial<DaviaSettings>) => void;
}

const VERSION_RE = /^[a-zA-Z0-9_-]+$/;

export function DocsVersionPanel({ settings, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(settings.outputVersion);
  const [versions, setVersions] = useState<DocsVersionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const valid = name.trim() === "" || VERSION_RE.test(name.trim());
  const exists = versions.some((v) => v.name === name.trim());

  const commit = (val: string) => {
    setName(val);
    onSave({ outputVersion: val });
  };

  const handleAuto = () => {
    const v = generateVersionName(settings.model, settings.maxTokens);
    commit(v);
    toast.success(`Згенеровано: ${v}`);
  };

  const handleList = async () => {
    setLoading(true);
    try {
      const data = await docsApi.listVersions();
      setVersions(data);
    } catch (e) {
      toast.error("Помилка завантаження", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/40">
        <span>Версія документації</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t border-border p-3">
        <div className="grid gap-2">
          <Label htmlFor="docs-version">Назва версії (папка)</Label>
          <div className="flex gap-2">
            <Input
              id="docs-version"
              value={name}
              onChange={(e) => commit(e.target.value)}
              placeholder="v1-standard-12k"
              aria-invalid={!valid}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAuto}>
              <Sparkles className="mr-1 h-3 w-3" />
              Авто
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Папка, де збережеться ця версія. Наприклад: v1-standard-12k, v2-fast-6k
          </p>
          {!valid && (
            <p className="text-xs text-red-500">Дозволені лише символи [a-zA-Z0-9_-]</p>
          )}
          {valid && exists && (
            <p className="text-xs text-amber-500">Папка існує. При генерації буде перезаписано.</p>
          )}
        </div>

        <div className="space-y-2">
          <Button type="button" variant="outline" size="sm" onClick={handleList} disabled={loading}>
            <FolderOpen className="mr-1 h-3 w-3" />
            {loading ? "Завантаження..." : "Список версій"}
          </Button>

          {versions.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left">Назва</th>
                    <th className="px-2 py-1 text-left">Дата</th>
                    <th className="px-2 py-1 text-right">Файлів</th>
                    <th className="px-2 py-1 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.path} className="border-t border-border">
                      <td className="px-2 py-1 font-mono">{v.name}</td>
                      <td className="px-2 py-1 text-muted-foreground">
                        {v.modified ? new Date(v.modified * 1000).toLocaleString() : "—"}
                      </td>
                      <td className="px-2 py-1 text-right">{v.files ?? 0}</td>
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => commit(v.name)}
                        >
                          Вибрати
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
