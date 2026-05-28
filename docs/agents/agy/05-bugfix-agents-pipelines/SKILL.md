---
tags:
  - domain:agent
  - status:active
  - format:skill
created: 2026-05-28
updated: 2026-05-28
tier: 2
title: "Навичка AGY: Виправлення BUG-6 та BUG-7"
lang: uk
---

# AGY: Виправлення BUG-6 та BUG-7

## Передумови

Перед початком виконай:
```bash
cd /home/vokov/workspace/ai-drakon-scaffolder
git pull origin master
```

---

## BUG-6: AgentChatPanel не підключено до AgentStudioPage (`/agents`)

### Діагноз
- `src/components/agents/AgentChatPanel.tsx` — компонент повністю реалізований
- `src/pages/AgentStudioPage.tsx` — імпорт та рендеринг `AgentChatPanel` відсутні
- Сторінка `/agents` рендерить 3 колонки: `PipelineList` + `DrakonEditor` + `PropertiesPanel`
- Чат-інтерфейс треба додати як 4-ту колонку після `PropertiesPanel`

### Task 1.1: Додати імпорт AgentChatPanel

Файл: `src/pages/AgentStudioPage.tsx`

Знайди блок імпортів (рядки 1–13) і додай **після** рядка з `ExecutionPanel`:

```typescript
import { AgentChatPanel } from "@/components/agents/AgentChatPanel";
```

### Task 1.2: Додати AgentChatPanel у JSX

У тому ж файлі знайди блок `{/* Column 3: Properties Sidebar Inspector */}` (рядок ~240).
Після закриваючого тегу `</PropertiesPanel>` і **перед** закриваючим `</div>` батьківського flex-рядка додай:

```tsx
        {/* Column 4: Agent Chat Panel */}
        <AgentChatPanel className="w-[280px] shrink-0 border-l" />
```

Результат у JSX повинен виглядати так:
```tsx
      {/* 3-Column Studio Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Column 1 */}
        <PipelineList ... />
        {/* Column 2: Center Editor */}
        <div className="flex flex-col flex-1 min-w-0">
          ...
        </div>
        {/* Column 3: Properties */}
        <PropertiesPanel ... />
        {/* Column 4: Agent Chat Panel */}
        <AgentChatPanel className="w-[280px] shrink-0 border-l" />
      </div>
```

### Task 1.3: Перевір TypeScript компіляцію

```bash
cd /home/vokov/workspace/ai-drakon-scaffolder
npx tsc --noEmit 2>&1 | head -30
```

Якщо помилок немає — продовжуй. Якщо є — виправ і повтори.

### Task 1.4: Верифікація через PinchTab

Зроби PinchTab snapshot `/agents` і перевір наявність `<textarea>` або `role="textbox"`:

```bash
# Отримай поточний instance (може змінитися)
INST=$(curl -s http://localhost:9867/instances \
  -H "Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['instances'][0]['id'])")

# Відкрий /agents
curl -s -X POST http://localhost:9867/$INST/navigate \
  -H "Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://ai-drakon-scaffolder.pages.dev/agents"}'

# Зачекай завантаження
sleep 3

# Перевір наявність textarea
curl -s -X POST http://localhost:9867/$INST/find \
  -H "Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97" \
  -H "Content-Type: application/json" \
  -d '{"selector":"textarea"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('FOUND' if d.get('found') else 'NOT FOUND')"
```

> Примітка: PinchTab перевіряє задеплоєну версію на pages.dev. Щоб зміни відображались — треба збилдити і задеплоїти фронтенд. Якщо CI/CD не налаштовано автоматично, можна верифікувати локально через npm run build (без помилок = BUG-6 виправлено на рівні коду).

---

## BUG-7: Відсутня кнопка «Новий пайплайн» у PipelineList (`/agents`)

### Діагноз
- `src/components/agents/PipelineList.tsx` — заголовок має тільки `<span>Пайплайни (IR)</span>` + `<GitFork>`
- Немає кнопки створення нового пайплайну
- `src/lib/graph-pipeline-api.ts` — відсутня функція `createPipeline`

### Task 2.1: Додати createPipeline до graph-pipeline-api.ts

Файл: `src/lib/graph-pipeline-api.ts`

Після функції `savePipeline` (приблизно рядок 50) додай:

```typescript
export async function createPipeline(name: string): Promise<PipelineInfo> {
  // Try POST first (dedicated create endpoint)
  const postResp = await fetch(`${getArchitectBase()}/graph-pipelines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, display_name: name }),
  }).catch(() => null);

  if (postResp?.ok) {
    return postResp.json() as Promise<PipelineInfo>;
  }

  // Fallback: PUT with minimal skeleton IR (create-or-update semantics)
  import type { IrDiagram } from "@/lib/htse/ir-types";
  const skeleton: IrDiagram = {
    name,
    access: "private",
    params: [],
    items: {
      h0: { type: "header", content: name },
      e0: { type: "end", content: "" },
    },
  };
  await savePipeline(name, skeleton);
  return { name, display_name: name };
}
```

> **Увага**: `import type` всередині функції не допускається в TypeScript. Використай `IrDiagram` з вже наявного імпорту на початку файлу: `import type { IrDiagram } from "@/lib/htse/ir-types";` — перевір чи він там є, якщо ні — додай у топ файлу.

**Виправлена версія createPipeline без inline import:**

```typescript
export async function createPipeline(name: string): Promise<PipelineInfo> {
  const postResp = await fetch(`${getArchitectBase()}/graph-pipelines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, display_name: name }),
  }).catch(() => null);

  if (postResp?.ok) {
    return postResp.json() as Promise<PipelineInfo>;
  }

  const skeleton: IrDiagram = {
    name,
    access: "private",
    params: [],
    items: {
      h0: { type: "header", content: name },
      e0: { type: "end", content: "" },
    },
  };
  await savePipeline(name, skeleton);
  return { name, display_name: name };
}
```

Також перевір, що рядок імпорту `import type { IrDiagram } from "@/lib/htse/ir-types";` присутній у топі файлу (він там вже є через `export type { IrDiagram }`).

### Task 2.2: Додати кнопку "+" до PipelineList

Файл: `src/components/agents/PipelineList.tsx`

**Крок A**: Додай імпорти у блок існуючих:
```typescript
import { createPipeline } from "@/lib/graph-pipeline-api";
import { Plus } from "lucide-react";
```

**Крок B**: Додай стан `isCreating` після рядка `const [isLoading, setIsLoading] = useState(true);`:
```typescript
const [isCreating, setIsCreating] = useState(false);
```

**Крок C**: Після функції `fetchList()` (після `return () => { active = false; }`) додай хендлер:
```typescript
  const handleCreatePipeline = async () => {
    const rawName = window.prompt("Назва нового пайплайну (латиниця, підкреслення):");
    if (!rawName?.trim()) return;
    const name = rawName.trim().toLowerCase().replace(/\s+/g, "_");
    setIsCreating(true);
    try {
      const created = await createPipeline(name);
      setPipelines((prev) => [...prev, created]);
      onSelectPipeline(created.name);
    } catch (e) {
      console.error("Failed to create pipeline:", e);
      window.alert(`Помилка створення пайплайну: ${e}`);
    } finally {
      setIsCreating(false);
    }
  };
```

**Крок D**: Замінь заголовок `<div className="flex h-8 ...">`:

Знайди (рядок ~68):
```tsx
      <div className="flex h-8 shrink-0 items-center justify-between border-b px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Пайплайни (IR)</span>
        <GitFork className="h-3 w-3" />
      </div>
```

Заміни на:
```tsx
      <div className="flex h-8 shrink-0 items-center justify-between border-b px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Пайплайни (IR)</span>
        <div className="flex items-center gap-1">
          {isCreating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <button
              onClick={handleCreatePipeline}
              title="Новий пайплайн"
              className="hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <GitFork className="h-3 w-3" />
        </div>
      </div>
```

### Task 2.3: Перевір TypeScript компіляцію

```bash
npx tsc --noEmit 2>&1 | head -30
```

Нуль помилок = успіх.

---

## Task 3: Виправити неузгодженість нумерації в мануалі

Файл: `docs/manuals/manual-agent-studio.md`

У секції «Виявлені проблеми та баги» знайди рядок з **BUG-5 (TEST-AGENT-03)**:
```
2. **BUG-5 (TEST-AGENT-03) — Відсутність вкладки DRAKON-редактора**:
```

Замінити на:
```
2. **BUG-8 (TEST-AGENT-03) — Відсутність вкладки DRAKON-редактора**:
```

І додай примітку після списку багів:
```
> **Примітка**: BUG-6 виправлено (AgentChatPanel підключено до /agents). BUG-7 виправлено (кнопка «+» додана до PipelineList).
```

---

## Task 4: Build перевірка

```bash
cd /home/vokov/workspace/ai-drakon-scaffolder
npm run build 2>&1 | tail -20
```

Очікуваний результат: `✓ built in X.Xs` без помилок TypeScript.

---

## Task 5: Commit і push

```bash
cd /home/vokov/workspace/ai-drakon-scaffolder
git add src/pages/AgentStudioPage.tsx
git add src/lib/graph-pipeline-api.ts
git add src/components/agents/PipelineList.tsx
git add docs/manuals/manual-agent-studio.md
git commit -m "fix(agents): wire AgentChatPanel + add pipeline create button (BUG-6, BUG-7)"
git push origin master
```

---

## Очікуваний результат

| Bug | До | Після |
|-----|----|-------|
| BUG-6 | `/agents` — чат відсутній | `/agents` — 4 колонки: PipelineList + DrakonEditor + PropertiesPanel + AgentChatPanel (280px) |
| BUG-7 | PipelineList — тільки список | PipelineList — список + кнопка «+» для створення нового пайплайну |

---

## Довідка: PinchTab Access

- API Base: `http://localhost:9867`
- Token: `0117419fcfb5de5d82220c1f9da8de97`
- Instance: визначати динамічно через `GET /instances`
- React input: завжди `click` потім `type`, ніколи `fill`
- Screenshot: `curl | python3 -c 'import sys,json,base64; ...'`
- Деталі: `docs/agents/agy/04-pinchtab-tests/PINCHTAB-ACCESS.md`

---

## Семантичні зв'язки

**Цей документ є частиною:** [[agents/agy/_INDEX]]
**Цей документ пов'язаний з:**
- [[manuals/manual-agent-studio]] — мануал Agent Studio
- [[agents/agy/01-docs-agent/SKILL]] — навичка генерації документації