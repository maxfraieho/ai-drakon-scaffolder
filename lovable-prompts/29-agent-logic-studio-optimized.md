# Lovable Prompt 29 — Agent Logic Studio (Stitch Design)

## Мета

Створити нову сторінку `/agents` — "Agent Logic Studio" — з точним дотриманням
дизайн-системи **Drakon Logic System** зі Stitch. HTML-референси всіх станів
знаходяться в папці `import/stitch_agent_logic_studio/` в корені проєкту:

| Папка | Стан |
|---|---|
| `default_view/code.html` | Базовий вигляд (пайплайн вибрано, вузол не вибрано) |
| `node_selected/code.html` | Інспектор відкрито (вузол вибрано, промпт read-only) |
| `editing_prompt/code.html` | Інспектор у режимі редагування промпту |
| `saved_state/code.html` | Після збереження промпту |
| `knowledge_base_open/code.html` | KB-drawer відкрито |
| `knowledge_base_editing/code.html` | KB-файл відкрито для перегляду |

**Дизайн-система:** `import/stitch_agent_logic_studio/drakon_logic_system/DESIGN.md`

---

## Дизайн-система: обов'язкові правила

### Токени кольорів (Tailwind custom colors з DESIGN.md)
Використовувати **тільки** ці токени, **не** хардкодити hex:

| Токен | Значення | Де використовується |
|---|---|---|
| `bg-surface` | `#111318` | Панелі, сайдбари, хедер |
| `bg-surface-container-lowest` | `#0c0e13` | Головний canvas/фон |
| `bg-surface-container-low` | `#1a1b21` | Рядки hover, secondary panels |
| `bg-surface-container` | `#1e2025` | Elevated елементи |
| `bg-surface-container-high` | `#282a2f` | Активний рядок, inspector header |
| `bg-surface-container-highest` | `#33353a` | Активний вузол у сайдбарі |
| `text-on-surface` | `#e2e2e9` | Основний текст |
| `text-on-surface-variant` | `#d8c3ad` | Вторинний текст, лейбли |
| `text-primary` | `#ffc174` | Amber — активні елементи, акценти |
| `bg-primary-container` | `#f59e0b` | CTA-кнопка "Зберегти" |
| `text-on-primary-container` | `#613b00` | Текст на amber-кнопці |
| `border-outline-variant` | `#534434` | Всі розділові межі між панелями |
| `border-outline` | `#a08e7a` | Звичайні бордери елементів |
| `text-secondary` | `#cebdff` | Purple — LLM-вузли |
| `bg-secondary-container` | `#4f319c` | Фон LLM-бейджа |
| `text-on-secondary-container` | `#bea8ff` | Текст LLM-бейджа |
| `text-tertiary` | `#51e77b` | Green — детерміністичні вузли |

### Типографіка (dual-font стратегія)
- **IBM Plex Sans** → `font-ui-sm` (12px) / `font-ui-md` (13px, 500) / `font-headline-sm` (14px, 600, tracking-wider) — для всіх UI-контролів, навігації, лейблів
- **JetBrains Mono** → `font-mono-label` (11px, tracking 0.02em) / `font-mono-code` (12px) — для всіх технічних елементів: node IDs, промпти, file paths, бейджи

**Правило:** якщо це "функціональний або програмований" елемент → JetBrains Mono. Решта → IBM Plex Sans.

### Іконки
Використовувати **Material Symbols Outlined** (вже підключені через Google Fonts у проєкті):
```tsx
<span className="material-symbols-outlined text-ui-md">account_tree</span>
```

Маппінг іконок:
| Елемент | Іконка |
|---|---|
| Пайплайн (sidebar) | `linear_scale` |
| LLM-вузол | `generating_tokens` |
| Action-вузол | `data_object` |
| Decision-вузол | `call_split` |
| Validate-вузол | `task_alt` |
| База знань | `database` |
| Агенти | `account_tree` |
| Закрити | `close` |
| Зберегти | `save` |
| Live-статус | `sensors` |

### Форми та радіуси
- Панелі, хедери → **0px radius** (тверді кути — IDE look)
- Кнопки, inputs, чіпи → `rounded` (0.125rem = `rounded-sm` у кастомному конфігу)
- Бейджи → `rounded` з малим padding

### Висоти панелей
- Top header: `h-8` (32px)
- Inspector header: `h-12` (48px)
- Sidebar rows: `py-2` (24px effective)
- KB drawer collapsed: `h-10` (40px)
- KB drawer expanded: `h-[200px]`

### Elevation (без тіней, тільки тональне шарування)
1. `bg-surface-container-lowest` — глобальний canvas-фон
2. `bg-surface` — панелі та сайдбари
3. `bg-surface-container-high` / `bg-surface-container-highest` — активні стани

---

## Нові файли (CREATE)

```
src/pages/AgentStudioPage.tsx
src/components/agents/AgentSidebar.tsx
src/components/agents/PipelineGraph.tsx
src/components/agents/NodeInspector.tsx
src/components/agents/NodeCard.tsx
src/components/agents/KbDrawer.tsx
src/lib/agent-studio-data.ts
src/routes/agents.tsx
```

---

## src/routes/agents.tsx

```typescript
import { createFileRoute } from "@tanstack/react-router";
import AgentStudioPage from "@/pages/AgentStudioPage";

export const Route = createFileRoute("/agents")({
  component: AgentStudioPage,
});
```

---

## src/lib/agent-studio-data.ts

Типи та mock-дані. НЕ додавати нові залежності.

```typescript
export type AgentId = "architect" | "drakon" | "docs";
export type NodeType = "action" | "decision" | "terminator";

export interface AgentNode {
  id: string;
  label: string;
  type: NodeType;
  icon: string; // Material Symbol name
  description: string;
  hasPrompt: boolean;
  prompt?: string;
  isDeterministic?: boolean;
}

export interface AgentPipeline {
  id: string;
  agentId: AgentId;
  name: string;
  shortName: string;
  description: string;
  nodes: AgentNode[];
}

export interface KbFile {
  id: string;
  filename: string;
  description: string;
  agentId: AgentId;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────

export const PIPELINES: AgentPipeline[] = [
  {
    id: "architect-a",
    agentId: "architect",
    name: "Pipeline A: Код → DRAKON IR",
    shortName: "Pipeline A",
    description: "LangGraph StateGraph · 7 вузлів · Ralph Loop (max 3 iter)",
    nodes: [
      {
        id: "measure_cc",
        label: "measure_cc",
        type: "action",
        icon: "data_object",
        description: "Вимірює цикломатичну складність через radon.complexity.cc_visit(). Повертає максимальний CC по всіх функціях.",
        hasPrompt: false,
        isDeterministic: true,
      },
      {
        id: "classify",
        label: "classify_complexity",
        type: "decision",
        icon: "call_split",
        description: "Визначає tree_level: primitive (CC≤10) | silhouette (11-20) | branch (21-50) | deep (>50). Обирає шлях: AST або LLM.",
        hasPrompt: false,
        isDeterministic: true,
      },
      {
        id: "ast_translate",
        label: "ast_translate",
        type: "action",
        icon: "data_object",
        description: "Швидкий детерміністичний шлях. PythonAnalyzer: Python AST → DRAKON IR без LLM. Тільки для CC ≤ 10.",
        hasPrompt: false,
        isDeterministic: true,
      },
      {
        id: "yaml_gen",
        label: "yaml_gen",
        type: "action",
        icon: "generating_tokens",
        description: "LLM: перетворює Python код у спрощений C4-B YAML опис поведінки. Знижує ризик галюцинацій на першому кроці.",
        hasPrompt: true,
        prompt: `Перетвори Python код у YAML опис алгоритмічної поведінки.

Формат (C4-B behavioral YAML):
steps:
  - id: "1"
    text: "опис дії або рішення"
    type: action | decision | loop_start | loop_end | terminator
    next: "2"        # для action/terminator
    yes: "3"         # для decision
    no: "4"          # для decision

Правила:
- Кожна Python statement → один step
- if/elif/else → decision з yes/no
- for/while → loop_start + loop_end
- return → terminator (text: "return значення")
- Не додавай пояснень поза YAML

Код:
{source_code}

Поверни тільки YAML.`,
      },
      {
        id: "ir_gen",
        label: "ir_gen",
        type: "action",
        icon: "generating_tokens",
        description: "LLM: конвертує YAML + оригінальний код → DRAKON IR JSON. Якщо є validation_errors — передаються як контекст. Ralph Loop (max 3 iter).",
        hasPrompt: true,
        prompt: `Конвертуй YAML опис у DRAKON IR JSON.

YAML:
{behavioral_yaml}

{validation_errors_section}

IR-формат вузла:
{{
  "id_вузла": {{
    "type": "action|decision|terminator|loop_start|loop_end",
    "text": "текст вузла",
    "next": "id",
    "yes": "id",
    "no": "id"
  }}
}}

Правила DRAKON:
1. Один START, один END термінатор
2. Кожен вузол досяжний від START
3. Немає orphan-вузлів
4. yes/no посилаються на існуючі id
5. Помилки праворуч (no-гілка)

Поверни тільки JSON.`,
      },
      {
        id: "validate",
        label: "validate",
        type: "action",
        icon: "task_alt",
        description: "ir_validator.py: перевіряє топологічні правила DRAKON. Якщо invalid і iter < 3 → повертається до ir_gen (Ralph Loop).",
        hasPrompt: false,
        isDeterministic: true,
      },
    ],
  },
  {
    id: "architect-b",
    agentId: "architect",
    name: "Pipeline B: DRAKON IR → Код",
    shortName: "Pipeline B",
    description: "LangGraph StateGraph · 3 вузли · Syntax Loop (max 3 iter)",
    nodes: [
      {
        id: "code_gen",
        label: "code_gen",
        type: "action",
        icon: "generating_tokens",
        description: "LLM: отримує DRAKON IR + цільову мову. Якщо є syntax_errors — передаються як контекст. Syntax Loop (max 3).",
        hasPrompt: true,
        prompt: `Згенеруй код мовою {language} з DRAKON IR.

DRAKON IR:
{drakon_ir}

{syntax_errors_section}

Правила:
- Точно відтворюй алгоритмічну логіку з IR
- action → statement, decision → if/else
- loop_start/loop_end → while/for
- Термінатори з "return" → return statements
- Не додавай логіки поза IR

Поверни тільки код.`,
      },
      {
        id: "check_syntax",
        label: "check_syntax",
        type: "action",
        icon: "task_alt",
        description: "Перевіряє синтаксис. Python: ast.parse(). Якщо помилки → повертає до code_gen.",
        hasPrompt: false,
        isDeterministic: true,
      },
    ],
  },
  {
    id: "drakon-analyze",
    agentId: "drakon",
    name: "Аналіз Python AST",
    shortName: "AST Analyzer",
    description: "Детерміністичний транслятор · Python AST → DRAKON IR · без LLM",
    nodes: [
      {
        id: "ast_visitor",
        label: "PythonAnalyzer",
        type: "action",
        icon: "data_object",
        description: "ast.NodeVisitor: обходить Python AST, маппить конструкції на DRAKON вузли. Детерміністично.",
        hasPrompt: false,
        isDeterministic: true,
      },
      {
        id: "ir_validator_drakon",
        label: "validate_ir",
        type: "action",
        icon: "task_alt",
        description: "ir_validator.py: топологічні перевірки DRAKON. Повертає validation_errors[].",
        hasPrompt: false,
        isDeterministic: true,
      },
    ],
  },
];

export const KB_FILES: KbFile[] = [
  { id: "drakon-00", filename: "00-drakon-rules.md", description: "Топологічні інваріанти DRAKON (шампур, заборона перетинів)", agentId: "drakon" },
  { id: "drakon-01", filename: "01-node-patterns.md", description: "Маппінг Python конструкцій → DRAKON вузли", agentId: "drakon" },
  { id: "drakon-02", filename: "02-ir-format.md", description: "JSON-схема IR з прикладами та правилами валідації", agentId: "drakon" },
  { id: "drakon-03", filename: "03-complex-patterns.md", description: "Вкладені цикли, try/except, async/await", agentId: "drakon" },
  { id: "architect-kb", filename: "architect-kb.md", description: "Знання для architect-agent (CC thresholds, pipeline design)", agentId: "architect" },
  { id: "docs-kb", filename: "docs-kb.md", description: "Знання для docs-agent (документація, стилі)", agentId: "docs" },
];

export const AGENT_LABELS: Record<AgentId, { label: string; icon: string }> = {
  architect: { label: "Architect Agent", icon: "account_tree" },
  drakon: { label: "DRAKON Generator", icon: "account_tree" },
  docs: { label: "Docs Agent", icon: "account_tree" },
};

export const LLM_NODES_COUNT = (pipeline: AgentPipeline) =>
  pipeline.nodes.filter((n) => n.hasPrompt).length;
```

---

## src/pages/AgentStudioPage.tsx

Структура відповідає `default_view/code.html`:
- Top bar `h-8` з "⚙ АГЕНТНА ЛОГІКА" + tabs Architect/DRAKON/Docs
- Ліворуч: `AgentSidebar` (200px) з border-r border-outline-variant
- Центр: `PipelineGraph` + `NodeCard` list
- Праворуч: `NodeInspector` (320px w-80, absolute або flex) — з'являється при виборі вузла
- Знизу в центрі: `KbDrawer` (collapsible)

```typescript
import { useState } from "react";
import { AgentSidebar } from "@/components/agents/AgentSidebar";
import { PipelineGraph } from "@/components/agents/PipelineGraph";
import { NodeInspector } from "@/components/agents/NodeInspector";
import { NodeCard } from "@/components/agents/NodeCard";
import { KbDrawer } from "@/components/agents/KbDrawer";
import {
  PIPELINES, KB_FILES,
  type AgentPipeline, type AgentNode, type KbFile,
} from "@/lib/agent-studio-data";

// Active tab type for top nav
type AgentTab = "architect" | "drakon" | "docs";

export default function AgentStudioPage() {
  const [activeTab, setActiveTab] = useState<AgentTab>("architect");
  const [selectedPipeline, setSelectedPipeline] = useState<AgentPipeline>(PIPELINES[0]);
  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
  const [selectedKbFile, setSelectedKbFile] = useState<KbFile | null>(null);
  const [kbOpen, setKbOpen] = useState(false);

  const llmNodes = selectedPipeline.nodes.filter((n) => n.hasPrompt);
  const agentKbFiles = KB_FILES.filter((f) => f.agentId === selectedPipeline.agentId);

  const handleSelectPipeline = (p: AgentPipeline) => {
    setSelectedPipeline(p);
    setSelectedNode(null);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-surface-container-lowest font-ui-sm text-ui-sm text-on-surface antialiased">

      {/* ── Top Navigation Bar (h-8 per Stitch) ── */}
      <header className="flex h-8 shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-panel-padding">
        <div className="flex h-full items-center gap-6">
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
            ⚙ АГЕНТНА ЛОГІКА
          </span>
          <nav className="flex h-full items-center gap-4">
            {(["architect", "drakon", "docs"] as AgentTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  "flex h-full items-center pt-0.5 font-ui-sm text-ui-sm transition-colors",
                  activeTab === tab
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant hover:text-primary",
                ].join(" ")}
              >
                {tab === "architect" ? "Architect" : tab === "drakon" ? "DRAKON" : "Docs"}
              </button>
            ))}
          </nav>
        </div>
        <button className="flex items-center justify-center text-on-surface-variant transition-colors hover:text-primary">
          <span className="material-symbols-outlined text-ui-md">sensors</span>
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar */}
        <AgentSidebar
          pipelines={PIPELINES}
          kbFiles={KB_FILES}
          selectedPipeline={selectedPipeline}
          selectedNode={selectedNode}
          onSelectPipeline={handleSelectPipeline}
          onSelectNode={setSelectedNode}
          onSelectKbFile={(f) => { setSelectedKbFile(f); setKbOpen(true); }}
        />

        {/* Main canvas */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-panel-padding flex flex-col gap-4">

            {/* Pipeline header */}
            <div className="flex items-center justify-between">
              <h1 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                {selectedPipeline.name}
              </h1>
              <div className="flex items-center gap-2">
                <span className="font-mono-label text-mono-label text-on-surface-variant">
                  {llmNodes.length} LLM · {selectedPipeline.nodes.length - llmNodes.length} det
                </span>
              </div>
            </div>

            {/* Mermaid graph */}
            <PipelineGraph pipeline={selectedPipeline} />

            {/* LLM Node cards */}
            {llmNodes.length > 0 && (
              <div className="flex flex-col gap-unit">
                <span className="font-ui-sm text-ui-sm uppercase tracking-wider text-on-surface-variant">
                  ВУЗЛИ З ПРОМПТАМИ
                </span>
                <div className="flex flex-col gap-unit">
                  {llmNodes.map((node) => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      selected={selectedNode?.id === node.id}
                      onClick={() =>
                        setSelectedNode(selectedNode?.id === node.id ? null : node)
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {llmNodes.length === 0 && (
              <div className="border border-outline-variant bg-surface rounded p-4 text-center">
                <p className="font-mono-label text-mono-label text-on-surface-variant">
                  Всі вузли детерміністичні — LLM не використовується
                </p>
              </div>
            )}
          </div>

          {/* KB Drawer — inside main, at bottom */}
          <KbDrawer
            open={kbOpen}
            selectedFile={selectedKbFile}
            onToggle={() => setKbOpen((v) => !v)}
            onSelectFile={setSelectedKbFile}
            kbFiles={agentKbFiles}
          />
        </main>

        {/* Right Inspector Panel */}
        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            pipelineId={selectedPipeline.id}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
```

---

## src/components/agents/AgentSidebar.tsx

Точно відповідає лівому навігаційному панелі з `default_view/code.html`.
Структура: WORKSPACE header → Tabs (АГЕНТИ / ВУЗЛИ / БАЗА ЗНАНЬ) → Explorer (Pipelines → Nodes sections).

```typescript
import { cn } from "@/lib/utils";
import {
  AGENT_LABELS,
  type AgentPipeline, type AgentNode, type KbFile,
} from "@/lib/agent-studio-data";

interface Props {
  pipelines: AgentPipeline[];
  kbFiles: KbFile[];
  selectedPipeline: AgentPipeline;
  selectedNode: AgentNode | null;
  onSelectPipeline: (p: AgentPipeline) => void;
  onSelectNode: (n: AgentNode) => void;
  onSelectKbFile: (f: KbFile) => void;
}

export function AgentSidebar({
  pipelines, kbFiles, selectedPipeline, selectedNode,
  onSelectPipeline, onSelectNode, onSelectKbFile,
}: Props) {
  const agentKbFiles = kbFiles.filter((f) => f.agentId === selectedPipeline.agentId);

  return (
    <nav className="flex h-full w-[200px] shrink-0 flex-col border-r border-outline-variant bg-surface">

      {/* Header */}
      <div className="border-b border-outline-variant p-panel-padding flex flex-col gap-1">
        <span className="font-headline-sm text-headline-sm text-primary">WORKSPACE</span>
        <span className="font-mono-label text-mono-label text-on-surface-variant">Active Session</span>
      </div>

      {/* Primary tabs */}
      <div className="flex flex-col border-b border-outline-variant">
        <button className="flex items-center gap-element-gap px-panel-padding py-2 text-on-surface-variant hover:bg-surface-container-low font-mono-label text-mono-label transition-colors">
          <span className="material-symbols-outlined text-ui-md">account_tree</span>
          АГЕНТИ
        </button>
        <button className="flex items-center gap-element-gap px-panel-padding py-2 bg-surface-container-high text-primary border-l-2 border-primary font-mono-label text-mono-label">
          <span className="material-symbols-outlined text-ui-md" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
          ВУЗЛИ
        </button>
        <button
          onClick={() => agentKbFiles.length > 0 && onSelectKbFile(agentKbFiles[0])}
          className="flex items-center gap-element-gap px-panel-padding py-2 text-on-surface-variant hover:bg-surface-container-low font-mono-label text-mono-label transition-colors"
        >
          <span className="material-symbols-outlined text-ui-md">database</span>
          БАЗА ЗНАНЬ
        </button>
      </div>

      {/* Explorer */}
      <div className="flex-1 overflow-y-auto">

        {/* Pipelines section */}
        <div className="mt-4 px-panel-padding pb-2 border-b border-outline-variant font-headline-sm text-headline-sm text-on-surface-variant uppercase">
          Pipelines
        </div>
        <div className="flex flex-col py-1">
          {pipelines.map((pipeline) => {
            const isActive = pipeline.id === selectedPipeline.id;
            return (
              <button
                key={pipeline.id}
                onClick={() => onSelectPipeline(pipeline)}
                className={cn(
                  "flex items-center gap-2 px-panel-padding py-1.5 font-mono-label text-mono-label cursor-pointer transition-colors",
                  isActive
                    ? "bg-surface-container-high text-primary border-l-2 border-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                )}
              >
                <span className="material-symbols-outlined text-ui-md">linear_scale</span>
                {pipeline.shortName}
              </button>
            );
          })}
        </div>

        {/* Nodes section */}
        <div className="mt-4 px-panel-padding pb-2 border-b border-outline-variant font-headline-sm text-headline-sm text-on-surface-variant uppercase">
          ВУЗЛИ
        </div>
        <div className="flex flex-col py-1">
          {selectedPipeline.nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <button
                key={node.id}
                onClick={() => node.hasPrompt && onSelectNode(node)}
                disabled={!node.hasPrompt}
                className={cn(
                  "flex items-center justify-between px-panel-padding py-1.5 font-mono-label text-mono-label transition-colors",
                  node.hasPrompt ? "cursor-pointer hover:bg-surface-container-low" : "cursor-default",
                  isSelected
                    ? "bg-surface-container-highest text-on-surface border-l-2 border-primary"
                    : node.hasPrompt
                    ? "text-on-surface-variant"
                    : "text-on-surface-variant/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "material-symbols-outlined text-ui-md",
                      node.hasPrompt ? "text-primary" : "text-on-surface-variant"
                    )}
                  >
                    {node.icon}
                  </span>
                  <span className="truncate">{node.label}</span>
                </div>
                {node.hasPrompt && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-container shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

---

## src/components/agents/PipelineGraph.tsx

Mermaid-граф у стилі canvas Stitch. Додати `mermaid` до package.json `"mermaid": "^11.0.0"`.

```typescript
import { useEffect, useRef, useState } from "react";
import type { AgentPipeline } from "@/lib/agent-studio-data";

const PIPELINE_MERMAID: Record<string, string> = {
  "architect-a": `graph TD
    __start__([START]):::term
    measure_cc[measure_cc]:::determ
    classify[classify_complexity]:::determ
    ast_translate[ast_translate]:::determ
    yaml_gen[yaml_gen]:::llm
    ir_gen[ir_gen]:::llm
    validate[validate]:::determ
    __end__([END]):::term
    __start__ --> measure_cc
    measure_cc --> classify
    classify -.->|CC≤10| ast_translate
    classify -.->|CC>10| yaml_gen
    ast_translate --> validate
    yaml_gen --> ir_gen
    ir_gen --> validate
    validate -.->|valid| __end__
    validate -.->|invalid,iter<3| ir_gen
    classDef term fill:#1a1b21,stroke:#534434,color:#e2e2e9
    classDef determ fill:#1a1b21,stroke:#534434,color:#a08e7a
    classDef llm fill:#1e1830,stroke:#4f319c66,color:#cebdff`,
  "architect-b": `graph TD
    __start__([START]):::term
    code_gen[code_gen]:::llm
    check_syntax[check_syntax]:::determ
    __end__([END]):::term
    __start__ --> code_gen
    code_gen --> check_syntax
    check_syntax -.->|valid| __end__
    check_syntax -.->|err,iter<3| code_gen
    classDef term fill:#1a1b21,stroke:#534434,color:#e2e2e9
    classDef determ fill:#1a1b21,stroke:#534434,color:#a08e7a
    classDef llm fill:#1e1830,stroke:#4f319c66,color:#cebdff`,
  "drakon-analyze": `graph TD
    __start__([START]):::term
    ast[PythonAnalyzer]:::determ
    validator[validate_ir]:::determ
    __end__([END]):::term
    __start__ --> ast --> validator --> __end__
    classDef term fill:#1a1b21,stroke:#534434,color:#e2e2e9
    classDef determ fill:#1a1b21,stroke:#534434,color:#a08e7a`,
};

interface Props { pipeline: AgentPipeline; }

export function PipelineGraph({ pipeline }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const mermaidStr = PIPELINE_MERMAID[pipeline.id] ?? "";

  useEffect(() => {
    if (!ref.current || !mermaidStr) return;
    setError(false);
    const render = async () => {
      try {
        const mermaid = await import("mermaid" as never) as {
          default: {
            initialize: (c: object) => void;
            render: (id: string, text: string) => Promise<{ svg: string }>;
          };
        };
        mermaid.default.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            background: "#0c0e13",
            mainBkg: "#1a1b21",
            nodeBorder: "#534434",
            lineColor: "#a08e7a",
            textColor: "#d8c3ad",
            edgeLabelBackground: "#111318",
            fontSize: "11px",
          },
        });
        const { svg } = await mermaid.default.render(
          `mg-${pipeline.id}-${Date.now()}`,
          mermaidStr
        );
        if (ref.current) ref.current.innerHTML = svg;
      } catch {
        setError(true);
      }
    };
    void render();
  }, [pipeline.id, mermaidStr]);

  if (!mermaidStr) return null;

  return (
    <div className="border border-outline-variant bg-surface rounded flex flex-col overflow-hidden">
      {/* Canvas toolbar */}
      <div className="flex items-center justify-between px-panel-padding h-8 border-b border-outline-variant shrink-0">
        <span className="font-mono-label text-mono-label text-on-surface-variant uppercase">
          Graf Pайплайну · LangGraph StateGraph
        </span>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant">
            <span className="material-symbols-outlined text-ui-md">zoom_in</span>
          </button>
          <button className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant">
            <span className="material-symbols-outlined text-ui-md">zoom_out</span>
          </button>
          <button className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant">
            <span className="material-symbols-outlined text-ui-md">fit_screen</span>
          </button>
        </div>
      </div>
      {error ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <span className="font-mono-label text-mono-label text-on-surface-variant">
            Не вдалося відрендерити граф
          </span>
        </div>
      ) : (
        <div
          ref={ref}
          className="flex min-h-[200px] items-center justify-center overflow-x-auto p-panel-padding [&_svg]:max-h-[260px] [&_svg]:w-auto"
        />
      )}
    </div>
  );
}
```

---

## src/components/agents/NodeCard.tsx

Картка LLM-вузла під графом. Відповідає рядку вузла у Stitch (24px height, mono-label).

```typescript
import { cn } from "@/lib/utils";
import type { AgentNode } from "@/lib/agent-studio-data";

interface Props {
  node: AgentNode;
  selected: boolean;
  onClick: () => void;
}

export function NodeCard({ node, selected, onClick }: Props) {
  const preview = node.prompt
    ? node.prompt.trim().slice(0, 100).replace(/\n/g, " ") + "…"
    : node.description;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-element-gap border px-panel-padding py-2 text-left transition-colors rounded-sm",
        selected
          ? "border-primary/30 bg-surface-container text-on-surface"
          : "border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface-variant"
      )}
    >
      {/* Icon */}
      <span className={cn(
        "material-symbols-outlined text-ui-md shrink-0 mt-0.5",
        selected ? "text-primary" : "text-on-surface-variant"
      )}>
        {node.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono-label text-mono-label text-on-surface">{node.label}</span>
          <span className="bg-secondary-container/30 text-on-secondary-container font-mono-label text-mono-label px-1.5 py-0.5 rounded-sm uppercase text-[9px]">
            LLM
          </span>
        </div>
        <p className="mt-0.5 font-mono-label text-mono-label text-on-surface-variant/60 line-clamp-1">
          {preview}
        </p>
      </div>

      <span className={cn(
        "material-symbols-outlined text-ui-md shrink-0 mt-0.5",
        selected ? "text-primary" : "text-on-surface-variant/40"
      )}>
        chevron_right
      </span>
    </button>
  );
}
```

---

## src/components/agents/NodeInspector.tsx

Правий інспектор-панель. Відповідає `node_selected/code.html` та `editing_prompt/code.html`.
Абсолютне позиціонування `absolute right-0 top-0 bottom-0 w-80` у межах `<main>`.

```typescript
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AgentNode } from "@/lib/agent-studio-data";

interface Props {
  node: AgentNode;
  pipelineId: string;
  onClose: () => void;
}

export function NodeInspector({ node, pipelineId, onClose }: Props) {
  const [prompt, setPrompt] = useState(node.prompt ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const charCount = prompt.length;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Phase 1: mock. Phase 2: PATCH /v1/agents/nodes/{pipelineId}/{node.id}
      await new Promise((r) => setTimeout(r, 400));
      console.log("Save prompt:", { pipelineId, nodeId: node.id, prompt });
      setSavedAt(new Date());
      setEditing(false);
      toast.success("Промпт збережено");
    } catch {
      toast.error("Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPrompt(node.prompt ?? "");
    setEditing(false);
  };

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-80 bg-surface border-l border-outline-variant flex flex-col z-20">

      {/* Header (h-12 per Stitch) */}
      <div className="h-12 shrink-0 border-b border-outline-variant flex items-center justify-between px-panel-padding bg-surface-container-low">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="font-headline-sm text-headline-sm text-on-surface">{node.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary font-mono-label text-mono-label px-2 py-0.5 rounded-sm border border-primary/20 uppercase">
            {node.type}
          </span>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-ui-md">close</span>
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="border-b border-outline-variant px-panel-padding py-2 shrink-0">
        <p className="font-ui-sm text-ui-sm text-on-surface-variant leading-relaxed">
          {node.description}
        </p>
      </div>

      {/* Prompt section */}
      <div className="flex-1 overflow-y-auto p-panel-padding flex flex-col gap-6">

        {/* System Prompt */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-ui-sm text-ui-sm text-on-surface-variant uppercase tracking-wider">
              СИСТЕМНИЙ ПРОМПТ
            </label>
            <span className="font-mono-label text-mono-label text-on-surface-variant/50">
              {charCount > 1000 ? `${(charCount / 1000).toFixed(1)}k` : charCount} chars
            </span>
          </div>

          {editing ? (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              autoFocus
              rows={12}
              className="w-full bg-surface-container-lowest border border-primary/40 text-primary font-mono-code text-mono-code p-3 rounded-sm resize-none focus:outline-none focus:border-primary"
            />
          ) : (
            <div
              className="bg-surface-container-lowest border border-outline-variant rounded-sm p-3 font-mono-code text-mono-code text-primary min-h-[180px] overflow-y-auto cursor-pointer hover:border-outline transition-colors"
              onClick={() => node.hasPrompt && !node.isDeterministic && setEditing(true)}
            >
              <pre className="whitespace-pre-wrap">{prompt || "— немає промпту —"}</pre>
            </div>
          )}
        </div>

        {/* Model Config (mock, Phase 1) */}
        {node.hasPrompt && (
          <div className="flex flex-col gap-2">
            <label className="font-ui-sm text-ui-sm text-on-surface-variant uppercase tracking-wider">
              MODEL CONFIG
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[["Temperature", "0.2"], ["Max Tokens", "4096"]].map(([label, val]) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="font-mono-label text-mono-label text-on-surface-variant">{label}</span>
                  <input
                    type="text"
                    defaultValue={val}
                    readOnly
                    className="bg-surface-container-lowest border border-outline-variant text-on-surface font-mono-code text-mono-code px-2 py-1 rounded-sm w-full focus:border-primary focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {node.hasPrompt && !node.isDeterministic && (
        <div className="shrink-0 border-t border-outline-variant p-panel-padding bg-surface-container-low flex justify-end gap-2">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-1.5 border border-outline-variant text-on-surface font-ui-sm text-ui-sm rounded-sm hover:bg-surface-container-highest transition-colors"
              >
                СКАСУВАТИ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-primary-container text-on-primary-container font-ui-md text-ui-md font-semibold rounded-sm hover:brightness-110 transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-ui-md">save</span>
                {saving ? "ЗБЕРЕЖЕННЯ…" : "ЗБЕРЕГТИ ПРОМПТ"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-1.5 border border-outline-variant text-on-surface font-ui-sm text-ui-sm rounded-sm hover:bg-surface-container-highest transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-ui-md">edit</span>
              РЕДАГУВАТИ
            </button>
          )}
          {savedAt && (
            <div className="absolute bottom-14 right-panel-padding font-mono-label text-mono-label text-tertiary">
              ✓ {savedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Live status */}
      <div className="shrink-0 border-t border-outline-variant/50 px-panel-padding py-2 flex items-center justify-between">
        <span className="font-mono-label text-mono-label text-on-surface-variant">Статус агента</span>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
          <span className="font-mono-label text-mono-label text-on-surface-variant">live</span>
        </div>
      </div>
    </aside>
  );
}
```

---

## src/components/agents/KbDrawer.tsx

Відповідає `knowledge_base_open/code.html` та `knowledge_base_editing/code.html`.

```typescript
import { cn } from "@/lib/utils";
import type { KbFile } from "@/lib/agent-studio-data";

interface Props {
  open: boolean;
  selectedFile: KbFile | null;
  onToggle: () => void;
  onSelectFile: (f: KbFile) => void;
  kbFiles: KbFile[];
}

export function KbDrawer({ open, selectedFile, onToggle, onSelectFile, kbFiles }: Props) {
  const content = selectedFile
    ? `# ${selectedFile.filename}\n\n${selectedFile.description}\n\n_Реальний вміст — Phase 2 via /v1/agents/kb_`
    : "";

  return (
    <div className={cn(
      "shrink-0 border-t border-outline-variant bg-surface transition-all duration-200",
      open ? "h-[200px]" : "h-10"
    )}>
      {/* Trigger bar (h-10) */}
      <button
        onClick={onToggle}
        className="flex h-10 w-full items-center gap-element-gap px-panel-padding hover:bg-surface-container-low transition-colors"
      >
        <span className="material-symbols-outlined text-ui-md text-on-surface-variant">
          {open ? "expand_more" : "expand_less"}
        </span>
        <span className="font-mono-label text-mono-label text-on-surface-variant uppercase">
          БАЗА ЗНАНЬ
        </span>
        {selectedFile && (
          <>
            <span className="text-on-surface-variant/40">·</span>
            <span className="font-mono-label text-mono-label text-on-surface">{selectedFile.filename}</span>
          </>
        )}
        {kbFiles.length === 0 && (
          <span className="ml-2 font-mono-label text-mono-label text-on-surface-variant/40">
            немає файлів для цього агента
          </span>
        )}
      </button>

      {/* Content (h-[160px] inside) */}
      {open && (
        <div className="flex h-[160px] overflow-hidden">
          {/* File list */}
          <div className="w-[160px] shrink-0 overflow-y-auto border-r border-outline-variant py-1">
            {kbFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => onSelectFile(file)}
                className={cn(
                  "flex w-full items-center gap-element-gap px-panel-padding py-1.5 text-left transition-colors",
                  selectedFile?.id === file.id
                    ? "bg-surface-container-highest text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                )}
              >
                <span className="material-symbols-outlined text-ui-md">description</span>
                <span className="font-mono-label text-mono-label truncate">{file.filename}</span>
              </button>
            ))}
          </div>
          {/* File content */}
          <div className="flex-1 overflow-y-auto p-panel-padding">
            {selectedFile ? (
              <pre className="font-mono-code text-mono-code text-on-surface-variant whitespace-pre-wrap">
                {content}
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="font-mono-label text-mono-label text-on-surface-variant/40">
                  Оберіть файл зліва
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Навігація — додати пункт

У головному навігаційному компоненті (AppHeader або Sidebar) додати посилання `/agents`:

```typescript
// Додати до існуючих навігаційних посилань:
{ href: "/agents", label: "Агенти", icon: "account_tree" }

// Або як Link:
<Link to="/agents" className="flex items-center gap-element-gap font-ui-sm text-ui-sm">
  <span className="material-symbols-outlined text-ui-md">account_tree</span>
  Агентна логіка
</Link>
```

---

## Залежності

Додати до `package.json`:
```json
"mermaid": "^11.0.0"
```

Шрифти (якщо ще не підключено в `index.html`):
```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
```

Tailwind config — переконатись що кастомні токени з DESIGN.md підключені:
```javascript
// tailwind.config.js — extend.colors мають включати всі Stitch-токени:
// surface, surface-container-lowest, surface-container-low, surface-container,
// surface-container-high, surface-container-highest, on-surface, on-surface-variant,
// primary (#ffc174), primary-container (#f59e0b), on-primary-container (#613b00),
// secondary (#cebdff), secondary-container (#4f319c), on-secondary-container (#bea8ff),
// tertiary (#51e77b), outline (#a08e7a), outline-variant (#534434), background (#111318)
// extend.spacing: { "panel-padding": "12px", "element-gap": "8px", "unit": "4px", "gutter": "1px" }
// extend.fontFamily: { "mono-code": ["JetBrains Mono"], "mono-label": ["JetBrains Mono"],
//                      "ui-sm": ["IBM Plex Sans"], "ui-md": ["IBM Plex Sans"], "headline-sm": ["IBM Plex Sans"] }
// extend.fontSize: відповідно до DESIGN.md typography секції
```

---

## Що НЕ робити

- **НЕ** змінювати DiagramsPage, DiagramEditorPage або будь-які інші існуючі сторінки
- **НЕ** додавати реальні API calls (Phase 1 = mock data + console.log для save)
- **НЕ** встановлювати ReactFlow або D3
- **НЕ** використовувати Lucide іконки для цієї сторінки — тільки Material Symbols
- **НЕ** хардкодити hex-кольори — тільки Tailwind-токени з дизайн-системи
- **НЕ** змінювати існуючу дизайн-систему проєкту

---

## TypeScript перевірка

```bash
npx tsc --noEmit --skipLibCheck
```
Має бути 0 помилок.

---

## Резюме

Сторінка `/agents` з чотирма зонами (відповідно до Stitch HTML-референсів):
1. **Top bar** (32px) — "⚙ АГЕНТНА ЛОГІКА" + tabs Architect/DRAKON/Docs
2. **Ліва панель** (200px) — WORKSPACE header → primary tabs → Explorer (Pipelines + Nodes)
3. **Центральний canvas** (flex-1) — Mermaid граф + NodeCard list + KB Drawer (collapsible, 200px)
4. **Правий інспектор** (320px, `w-80`, conditional) — Inspector panel з промптом, model config, save/cancel
