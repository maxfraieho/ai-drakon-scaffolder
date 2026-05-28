---
tags:
  - domain:plan
  - status:active
  - format:plan
created: 2026-05-21
updated: 2026-05-28
tier: 3
title: "Двонаправлений імпорт DRAKON IR ↔ Scheme — План реалізації"
lang: uk
---

# Двонаправлений імпорт DRAKON IR ↔ Scheme — План реалізації

> **Для Claude:** НЕОБХІДНИЙ SUB-SKILL: Використовуйте superpowers:executing-plans для реалізації цього плану завдання за завданням.

**Мета:** Увімкнути двонаправлений імпорт між `/pipelines` (DRAKON IR JSON) та `/diagrams` (візуальний редактор DRAKON), використовуючи `IrDiagram` як єдиний канонічний формат.

**Архітектура:** Розширити `IrDiagram` додатковим полем `meta` для специфічних даних конвеєра (pipeline). Додати кнопку "Відкрити в Схемах" (Open in Diagrams) до `PipelineDrakonView`, яка конвертує `IrDiagram` → `DrakonDiagram` → `localStorage` → навігація на `/diagrams`. Додати кнопку "Зберегти як пайплайн" (Save as Pipeline) до `CanvasToolbar`, яка конвертує `DrakonDiagram` → `IrDiagram` → `PUT` до `architect-agent`.

**Стек технологій:** TypeScript/React, TanStack Router, `ir-to-diagram.ts` / `diagram-to-ir.ts` (вже є в кодовій базі), `upsertDiagramInStorage`, API `savePipeline`.

---

### Завдання 1: Розширення IrDiagram полем `meta`

**Файли:**
- Змінити: `.lovable/src/lib/htse/ir-types.ts`
- Змінити: `src/lib/htse/ir-types.ts`

**Крок 1:** В обох файлах додати `meta` до `IrDiagram`:

```typescript
export interface IrDiagramMeta {
  state_class?: string;
  node_module?: string;
  router_module?: string;
  description?: string;
  source?: string;
}

export interface IrDiagram {
  name: string;
  access: "public" | "private";
  params: string[];
  items: Record<string, IrItem>;
  meta?: IrDiagramMeta;  // ДОДАТИ ЦЕЙ РЯДОК
}
```

**Крок 2:** Перевірити, що TypeScript компілюється (без помилок в імпортах `IrDiagram`).

**Крок 3:** Коміт:
```bash
git add .lovable/src/lib/htse/ir-types.ts src/lib/htse/ir-types.ts
git commit -m "feat(ir): add meta field to IrDiagram for pipeline metadata"
```

---

### Завдання 2: Міграція `graph-pipeline-api.ts` на використання `IrDiagram`

**Файли:**
- Змінити: `.lovable/src/lib/graph-pipeline-api.ts`
- Змінити: `src/lib/graph-pipeline-api.ts`

**Крок 1:** Замінити імпорт та використання `DrakonIR` на `IrDiagram` в обох файлах:

```typescript
// ВИДАЛИТИ:
// export interface DrakonIRItem { ... }
// export interface DrakonIR { ... }

// ДОДАТИ вгорі:
import type { IrDiagram } from "@/lib/htse/ir-types";
export type { IrDiagram };  // реекспорт для споживачів

// ОНОВИТИ всі використання DrakonIR → IrDiagram
// Сигнатури listPipelines, getPipeline, savePipeline залишаються тими ж, але змінюється тип:
export async function savePipeline(name: string, ir: IrDiagram): Promise<void> { ... }
```

**Крок 2:** Оновити `PipelinesPage.tsx` та `PipelineDrakonView.tsx` для імпорту `IrDiagram` з `graph-pipeline-api` замість `DrakonIR`.

**Крок 3:** Перевірити відсутність помилок TypeScript. Значення `ir.items` мають сумісні поля (`IrItem` є надмножиною старого `DrakonIRItem`).

**Крок 4:** Коміт:
```bash
git add .lovable/src/lib/graph-pipeline-api.ts src/lib/graph-pipeline-api.ts
git add .lovable/src/components/pipelines/
git commit -m "feat(pipeline): use IrDiagram as canonical type replacing DrakonIR"
```

---

### Завдання 3: Міграція файлів .drakon.json до формату IrDiagram (бекенд)

**Файли:**
- Змінити: `services/architect-agent/pipelines/*.drakon.json` (всі 5 файлів)

**Крок 1:** Запустити скрипт міграції на сервері (192.168.3.184):
```bash
python3 /tmp/migrate_pipeline_ir.py
```

Вміст скрипту (`/tmp/migrate_pipeline_ir.py`):
```python
import json, os, glob

PIPELINES = "/home/vokov/workspace/ai-drakon-setup/services/architect-agent/pipelines"

for path in glob.glob(f"{PIPELINES}/*.drakon.json"):
    with open(path) as f:
        d = json.load(f)
    
    # Build meta from schema + extra fields
    meta = {}
    if "schema" in d:
        meta.update(d.pop("schema"))
    if "description" in d:
        meta["description"] = d.pop("description")
    if "source" in d:
        meta["source"] = d.pop("source")
    
    # Add IrDiagram required fields if missing
    if "access" not in d:
        d["access"] = "public"
    if "params" not in d:
        d["params"] = []
    if meta:
        d["meta"] = meta
    
    # Reorder keys: name, access, params, items, meta
    ordered = {
        "name": d["name"],
        "access": d.get("access", "public"),
        "params": d.get("params", []),
        "items": d["items"],
    }
    if meta:
        ordered["meta"] = meta
    
    with open(path, "w") as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)
    print(f"Migrated: {os.path.basename(path)}")
```

**Крок 2:** Перевірити правильність кожного файлу (наявність `access`, `params`, `items`, опціонального `meta`).

**Крок 3:** Протестувати через API: `curl http://localhost:8766/graph-pipelines/pipeline_a` — має повертати новий формат.

**Крок 4:** Коміт:
```bash
cd /home/vokov/workspace/ai-drakon-setup
git add services/architect-agent/pipelines/
git commit -m "feat(pipelines): migrate .drakon.json to IrDiagram canonical format"
git push origin main && git push drakon-diagram-flow main
```

---

### Завдання 4: Додавання кнопки "Відкрити в Схемах" у PipelineDrakonView

**Файли:**
- Змінити: `.lovable/src/components/pipelines/PipelineDrakonView.tsx`
- Змінити: `src/components/pipelines/PipelineDrakonView.tsx`

**Крок 1:** Додати імпорти на початку файлу:
```typescript
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { convertIrToDiagram } from "@/lib/htse/ir-to-diagram";
import { upsertDiagramInStorage } from "@/lib/diagram-storage";
import type { Diagram } from "@/types/drakon";
```

**Крок 2:** Додати хук `navigate` всередині компонента:
```typescript
const navigate = useNavigate();
```

**Крок 3:** Додати функцію-обробник:
```typescript
const handleOpenInDiagrams = () => {
  try {
    const drakonDiagram = convertIrToDiagram(ir);
    const diagramId = `pipeline-${pipelineName}`;
    const stored: Diagram = {
      id: diagramId,
      name: ir.name,
      folderId: "__pipelines__",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      diagram: drakonDiagram,
    };
    upsertDiagramInStorage(stored);
    localStorage.setItem("_pending_open_diagram_id", diagramId);
    navigate({ to: "/diagrams" });
  } catch (e) {
    toast.error("Не вдалось конвертувати у схему");
  }
};
```

**Крок 4:** Додати кнопку до рядка панелі інструментів (біля кнопок Run/Stop):
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleOpenInDiagrams}
  className="font-mono text-[10px] uppercase tracking-wider"
  title="Відкрити в редакторі схем"
>
  <ExternalLink className="h-3 w-3 mr-1.5" />
  Схеми
</Button>
```

**Крок 5:** Перевірити: натискання кнопки зберігає схему в localStorage та перенаправляє на /diagrams.

**Крок 6:** Коміт:
```bash
git add .lovable/src/components/pipelines/PipelineDrakonView.tsx
git add src/components/pipelines/PipelineDrakonView.tsx
git commit -m "feat(pipelines): add 'Open in Diagrams' button — converts IR to visual scheme"
```

---

### Завдання 5: Автовибір імпортованої схеми на сторінці DiagramsPage

**Файли:**
- Змінити: `.lovable/src/pages/DiagramsPage.tsx`
- Змінити: `src/pages/DiagramsPage.tsx`

**Крок 1:** У `DiagramsPage` додати `useEffect`, який запускається після завантаження схем, зчитує прапорець localStorage та автоматично вибирає її:

```typescript
// Додати біля інших useEffects (після встановлення стану diagrams):
useEffect(() => {
  const pendingId = localStorage.getItem("_pending_open_diagram_id");
  if (!pendingId) return;
  localStorage.removeItem("_pending_open_diagram_id");
  
  const all = readDiagramsFromStorage();
  const target = all.find((d) => d.id === pendingId);
  if (target) {
    // Переключити на локальний режим та вибрати схему
    setViewMode("local");
    setSelectedFolderSlug("__pipelines__");
    setSelectedDiagram(target);
  }
}, []);  // запускається один раз при монтуванні
```

**Крок 2:** Переконатися, що папка `"__pipelines__"` обробляється — її може знадобитися додати до списку папок, якщо її там немає. Додати відображення віртуальної папки для схем, імпортованих із пайплайнів:

```typescript
// У списку відображення папок додати:
// Віртуальна папка для імпорту пайплайнів (тільки якщо вона існує)
const pipelineDiagrams = readDiagramsFromStorage().filter(d => d.folderId === "__pipelines__");
```

Насправді, для спрощення: встановити `folderId` у значення папки за замовчуванням (`"general"`) замість `"__pipelines__"`. Тоді автовибір просто знайде схему в папці за замовчуванням.

**Крок 3:** Перевірити: після кліку на "Схеми" в /pipelines, схема з'являється вибраною та видимою на сторінці /diagrams.

**Крок 4:** Коміт:
```bash
git add .lovable/src/pages/DiagramsPage.tsx src/pages/DiagramsPage.tsx
git commit -m "feat(diagrams): auto-select imported pipeline diagram on navigation"
```

---

### Завдання 6: Додавання "Зберегти як пайплайн" до CanvasToolbar + DiagramsPage

**Файли:**
- Змінити: `.lovable/src/components/workspace/CanvasToolbar.tsx`
- Змінити: `src/components/workspace/CanvasToolbar.tsx`
- Змінити: `.lovable/src/pages/DiagramsPage.tsx`
- Змінити: `src/pages/DiagramsPage.tsx`

**Крок 1:** Додати проп `onSaveAsPipeline?: () => void` до `CanvasToolbarProps`:
```typescript
interface CanvasToolbarProps {
  // ... існуючі пропси ...
  onSaveAsPipeline?: () => void;
}
```

**Крок 2:** Додати кнопку в CanvasToolbar JSX (після існуючих кнопок):
```tsx
{onSaveAsPipeline && (
  <button
    type="button"
    onClick={onSaveAsPipeline}
    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--accent-amber)] hover:border-[var(--accent-amber)]/50 transition-colors"
    title="Зберегти як пайплайн"
  >
    <Download className="h-2.5 w-2.5" />
    Пайплайн
  </button>
)}
```

Додати `Download` до імпорту `lucide-react`.

**Крок 3:** У `DiagramsPage.tsx` додати стан для модального вікна збереження пайплайну:
```typescript
const [savePipelineOpen, setSavePipelineOpen] = useState(false);
const [pipelineName, setPipelineName] = useState("");
const [savingPipeline, setSavingPipeline] = useState(false);
```

**Крок 4:** Додати функцію `handleSaveAsPipeline` в DiagramsPage:
```typescript
const handleSaveAsPipeline = async () => {
  if (!selectedDiagram || !pipelineName.trim()) return;
  setSavingPipeline(true);
  try {
    const { convertDiagramToIr } = await import("@/lib/htse/diagram-to-ir");
    const { savePipeline } = await import("@/lib/graph-pipeline-api");
    const irDiagram = convertDiagramToIr(selectedDiagram.diagram);
    // Створити слаг з назви для API
    const slug = pipelineName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    await savePipeline(slug, irDiagram);
    setSavePipelineOpen(false);
    setPipelineName("");
    toast.success(`Пайплайн "${slug}" збережено`);
    navigate({ to: "/pipelines" });
  } catch (e) {
    toast.error("Помилка збереження: " + (e instanceof Error ? e.message : "unknown"));
  } finally {
    setSavingPipeline(false);
  }
};
```

**Крок 5:** Додати модальне вікно JSX у рендер DiagramsPage:
```tsx
<Dialog open={savePipelineOpen} onOpenChange={setSavePipelineOpen}>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle className="font-mono text-sm">Зберегти як пайплайн</DialogTitle>
    </DialogHeader>
    <div className="py-4">
      <Input
        placeholder="назва_пайплайну"
        value={pipelineName}
        onChange={(e) => setPipelineName(e.target.value)}
        className="font-mono text-sm"
        onKeyDown={(e) => e.key === "Enter" && handleSaveAsPipeline()}
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setSavePipelineOpen(false)}>Скасувати</Button>
      <Button onClick={handleSaveAsPipeline} disabled={!pipelineName.trim() || savingPipeline}>
        {savingPipeline ? "Збереження…" : "Зберегти"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Крок 6:** Передати `onSaveAsPipeline` до CanvasToolbar:
```tsx
<CanvasToolbar
  ...існуючіПропси...
  onSaveAsPipeline={selectedDiagram && !currentDiagramIsIr ? () => setSavePipelineOpen(true) : undefined}
/>
```

**Крок 7:** Перевірити наскрізний сценарій (end-to-end):
- Відкрити схему в /diagrams
- Натиснути кнопку "Пайплайн" у CanvasToolbar
- Ввести назву в модальному вікні
- Підтвердити → перенаправлення на /pipelines → новий пайплайн з'являється у списку

**Крок 8:** Коміт:
```bash
git add .lovable/src/components/workspace/CanvasToolbar.tsx src/components/workspace/CanvasToolbar.tsx
git add .lovable/src/pages/DiagramsPage.tsx src/pages/DiagramsPage.tsx
git commit -m "feat(diagrams): add 'Save as Pipeline' button — converts visual scheme to DRAKON IR"
git push origin main && git push drakon-diagram-flow main
```

---

### Завдання 7: Наскрізне тестування та фінальний пуш

**Крок 1:** Протестувати сценарій А (Пайплайн → Схеми):
1. Перейти на сторінку `/pipelines`
2. Вибрати "Sharon LangGraph Pipeline"
3. Натиснути кнопку "Схеми"
4. Перевірити: перенаправлено на сторінку /diagrams, вибрано схему Sharon, відображаються блоки

**Крок 2:** Протестувати сценарій Б (Схеми → Пайплайн):
1. Відредагувати схему Sharon в /diagrams
2. Натиснути "Пайплайн" у CanvasToolbar
3. Ввести `sharon_consultant_graph_v2`
4. Перевірити: перенаправлено на /pipelines, новий пайплайн у списку, його можна запустити

**Крок 3:** Перевірити, що виконання пайплайну все ще працює після міграції формату:
```bash
curl http://localhost:8766/graph-pipelines/pipeline_a
curl -X POST http://localhost:8766/graph-pipelines/pipeline_a/execute \
  -H "Content-Type: application/json" -d '{"code":"def hello(): return 42"}'
```

**Крок 4:** Фінальний коміт:
```bash
git push origin main && git push drakon-diagram-flow main
```

---

## Семантичні зв'язки

**Цей документ є частиною:** [[plans/_INDEX]]
**Цей документ пов'язаний з:**
- [[concept/04-pipelines]] — концепція конвеєрів (pipelines)
- [[plans/2026-05-16-js-ts-support]] — підтримка JS/TS в drakon-agent