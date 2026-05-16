## Мета
Додати `/agents/pipeline/:id/edit` — редактор топології пайплайну на основі існуючого DrakonEditor з кастомним збереженням через PATCH `/v1/agents/pipeline/:id`.

## Нові файли
- `src/routes/pipeline-editor.tsx` — TanStack Router route
- `src/pages/PipelineEditorPage.tsx` — сторінка

## Зміни у існуючих файлах
- `src/components/drakon/DrakonEditor.tsx` — додати prop `onSaveOverride`
- `src/__root.tsx` — hideChrome для `/agents/pipeline/`
- `src/pages/AgentStudioPage.tsx` або `src/components/agents/AgentSidebar.tsx` — Edit кнопки

## 1. DrakonEditor — додати onSaveOverride

В `DrakonEditorProps` інтерфейс (~рядок 66) додати:

```typescript
onSaveOverride?: (diagram: DrakonDiagram) => Promise<boolean>;
```

У функції handleSave (де викликається `widgetRef.current?.exportJson()`) на самому початку додати:

```typescript
if (onSaveOverride && widgetRef.current) {
  const jsonString = widgetRef.current.exportJson();
  if (!jsonString) return;
  const diagram = JSON.parse(jsonString) as DrakonDiagram;
  await onSaveOverride(diagram);
  return;
}
// ... далі існуючий код збереження в GitHub/MinIO
```

## 2. src/routes/pipeline-editor.tsx

```typescript
import { createFileRoute } from "@tanstack/react-router";
import PipelineEditorPage from "@/pages/PipelineEditorPage";

export const Route = createFileRoute("/agents/pipeline/$pipelineId/edit")({
  component: PipelineEditorPage,
});
```

## 3. src/pages/PipelineEditorPage.tsx

```typescript
import { useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import type { DrakonDiagram } from "@/types/drakon";
import {
  fetchPipeline, savePipeline, validatePipeline,
  type PipelineConfig,
} from "@/lib/pipeline-config-api";
import { pipelineToIR, irToPipeline } from "@/lib/pipeline-to-drakon";

export default function PipelineEditorPage() {
  const { pipelineId } = useParams({ strict: false }) as { pipelineId?: string };
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!pipelineId) return;
    fetchPipeline(pipelineId)
      .then(setConfig)
      .catch(() => toast.error("Pipeline не знайдено"));
  }, [pipelineId]);

  const handleSaveOverride = async (diagram: DrakonDiagram): Promise<boolean> => {
    if (!config) return false;
    setErrors([]);
    try {
      const updated = irToPipeline(diagram, config);
      const result = await savePipeline(updated);
      setConfig((c) => (c ? { ...c, version: result.version } : c));
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Помилка збереження";
      setErrors([msg]);
      toast.error(msg);
      return false;
    }
  };

  const handleValidate = async () => {
    if (!pipelineId) return;
    const res = await validatePipeline(pipelineId);
    setErrors(res.errors);
    if (res.valid) toast.success("Топологія валідна ✓");
    else toast.error(`${res.errors.length} помилок топології`);
  };

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-base)] font-mono text-sm text-[var(--text-secondary)]">
        Завантаження пайплайну…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-base)] antialiased">
      {/* Toolbar */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
        <Link
          to="/agents"
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] active:scale-[0.96] active:transition-transform active:duration-75"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Агенти
        </Link>
        <span className="mx-1 text-[var(--border-subtle)]">·</span>
        <span className="font-mono text-xs text-[var(--text-secondary)]">{config.name}</span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-[var(--text-tertiary)]">
          v{config.version}
        </span>
        <button
          type="button"
          onClick={handleValidate}
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] active:scale-[0.96] active:transition-transform active:duration-75"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Validate
        </button>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1 border-b border-[var(--border-subtle)] bg-red-950/30 px-3 py-1.5">
          {errors.map((e, i) => (
            <span key={i} className="font-mono text-[11px] text-red-400">{e}</span>
          ))}
        </div>
      )}

      {/* DRAKON Editor */}
      <div className="min-h-0 flex-1">
        <DrakonEditor
          diagram={pipelineToIR(config)}
          diagramId={`pipeline-${config.id}`}
          isNew={false}
          onSaveOverride={handleSaveOverride}
          className="h-full"
        />
      </div>
    </div>
  );
}
```

## 4. hideChrome у __root.tsx

В масиві або умові де перевіряється pathname для hideChrome — додати:

```typescript
pathname.startsWith("/agents/pipeline/")
```

## 5. AgentSidebar — Edit кнопки

У списку пайплайнів (компонент AgentSidebar або AgentStudioPage), для кожного pipeline додати:

```typescript
<Link
  to="/agents/pipeline/$pipelineId/edit"
  params={{ pipelineId: pipeline.id }}
  className="inline-flex h-7 items-center gap-1 rounded px-2 font-mono text-[10px] uppercase tracking-wider text-[var(--accent-amber)] opacity-60 transition-opacity hover:opacity-100 active:scale-[0.96] active:transition-transform active:duration-75"
>
  Edit
</Link>
```

## Примітки
- `pipeline-config-api.ts` та `pipeline-to-drakon.ts` вже є у `src/lib/` (додані Claude Code)
- `drakonwidget.js` — НЕ ЧІПАТИ ніколи
- DrakonEditor вже імпортує `DrakonDiagram` тип — немає нових залежностей

## Дизайн-система
> Використовувати тільки CSS var токени. Hex не хардкодити.
> JetBrains Mono на всіх елементах тулбару.

### make-interfaces checklist
- [ ] `antialiased` на кореневому `div`
- [ ] `tabular-nums` на версії (`v{config.version}`)
- [ ] `active:scale-[0.96] transition-transform duration-75` на всіх кнопках
- [ ] ≥ 40px hit area (h-8 мінімум)
- [ ] `transition-colors` (не `transition-all`)

## ВАЖЛИВО: Sync після змін
Скопіюй `src/` до `.lovable/src/`. CF Pages будує з `.lovable/src/`.
