# Lovable Prompt 28 — Agent Logic Studio Page

## Мета

Створити нову сторінку `/agents` — "Agent Logic Studio" — для перегляду та редагування внутрішньої логіки AI-агентів. Сторінка відображає LangGraph pipeline-графи як Mermaid-діаграми та дозволяє редагувати системні промпти LLM-вузлів прямо в інтерфейсі.

---

## Нові файли (CREATE)

```
src/pages/AgentStudioPage.tsx
src/components/agents/AgentSidebar.tsx
src/components/agents/PipelineGraph.tsx
src/components/agents/NodePromptPanel.tsx
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

Константи та типи. НЕ додавати нові залежності.

```typescript
export type AgentId = "architect" | "drakon" | "docs";
export type NodeType = "action" | "decision" | "terminator";

export interface AgentNode {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  hasPrompt: boolean;
  prompt?: string;
  isDeterministic?: boolean; // AST-шлях, без LLM
}

export interface AgentPipeline {
  id: string;
  agentId: AgentId;
  name: string;
  shortName: string;
  description: string;
  mermaidEndpoint: string; // GET endpoint → повертає Mermaid string
  nodes: AgentNode[];
}

export interface KbFile {
  id: string;
  filename: string;
  description: string;
  agentId: AgentId;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────
// Промпти тут — приблизні; реальні будуть з backend у Phase 2

export const PIPELINES: AgentPipeline[] = [
  {
    id: "architect-a",
    agentId: "architect",
    name: "Pipeline A: Код → DRAKON IR",
    shortName: "Pipeline A",
    description: "LangGraph StateGraph · 7 вузлів · Ralph Loop (max 3 iter)",
    mermaidEndpoint: "/v1/agents/pipeline-graph/architect-a",
    nodes: [
      {
        id: "measure_cc",
        label: "measure_cc",
        type: "action",
        description: "Вимірює цикломатичну складність через radon.complexity.cc_visit(). Повертає максимальний CC по всіх функціях.",
        hasPrompt: false,
        isDeterministic: true,
      },
      {
        id: "classify",
        label: "classify_complexity",
        type: "action",
        description: "Визначає tree_level: primitive (CC≤10) | silhouette (11-20) | branch (21-50) | deep (>50). Обирає шлях: AST або LLM.",
        hasPrompt: false,
        isDeterministic: true,
      },
      {
        id: "ast_translate",
        label: "ast_translate",
        type: "action",
        description: "Швидкий детерміністичний шлях. PythonAnalyzer: Python AST → DRAKON IR без LLM. Тільки для CC ≤ 10.",
        hasPrompt: false,
        isDeterministic: true,
      },
      {
        id: "yaml_gen",
        label: "yaml_gen",
        type: "action",
        description: "LLM-крок: перетворює Python код у спрощений C4-B YAML опис поведінки. Знижує ризик галюцинацій на першому кроці.",
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
        description: "LLM-крок: конвертує YAML + оригінальний код → DRAKON IR JSON. Якщо є validation_errors з попередньої ітерації — передаються як контекст. Ralph Loop (max 3 iter).",
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
    "next": "id",       // для action
    "yes": "id",        // для decision (True-гілка)
    "no": "id"          // для decision (False-гілка, помилки праворуч)
  }}
}}

Правила DRAKON (обов'язкові):
1. Один START термінатор, один END термінатор
2. Кожен вузол досяжний від START
3. Немає orphan-вузлів (ізольованих)
4. yes/no посилаються на існуючі id
5. Помилки та виняткові шляхи — праворуч (no-гілка)

Поверни тільки JSON об'єкт з вузлами.`,
      },
      {
        id: "validate",
        label: "validate",
        type: "action",
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
    mermaidEndpoint: "/v1/agents/pipeline-graph/architect-b",
    nodes: [
      {
        id: "code_gen",
        label: "code_gen",
        type: "action",
        description: "LLM: отримує DRAKON IR + цільову мову + опис. Якщо є syntax_errors — передаються як контекст. Syntax Loop (max 3).",
        hasPrompt: true,
        prompt: `Згенеруй код мовою {language} з DRAKON IR.

DRAKON IR:
{drakon_ir}

{description_section}

{syntax_errors_section}

Правила:
- Точно відтворюй алгоритмічну логіку з IR
- Кожен action-вузол → statement або expression
- Кожен decision-вузол → if/else
- loop_start/loop_end → цикл while або for
- Термінатори з "return" → return statements
- Не додавай логіки поза IR

Поверни тільки код, без пояснень.`,
      },
      {
        id: "check_syntax",
        label: "check_syntax",
        type: "action",
        description: "Перевіряє синтаксис. Python: ast.parse(). TypeScript/JavaScript: pass-through (розширювати у Phase 2). Якщо помилки → повертає до code_gen.",
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
    mermaidEndpoint: "/v1/agents/pipeline-graph/drakon-analyze",
    nodes: [
      {
        id: "ast_visitor",
        label: "PythonAnalyzer",
        type: "action",
        description: "ast.NodeVisitor: обходить Python AST, маппить конструкції на DRAKON вузли. if → decision, for/while → loop, return → terminator. Детерміністично — один код = один IR.",
        hasPrompt: false,
        isDeterministic: true,
      },
      {
        id: "ir_validator_drakon",
        label: "validate_ir",
        type: "action",
        description: "ir_validator.py: топологічні перевірки DRAKON. START/END, досяжність, зв'язність, посилання. Повертає validation_errors[].",
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

// ─── Helpers ───────────────────────────────────────────────────────────────

export const AGENT_LABELS: Record<AgentId, string> = {
  architect: "Architect Agent",
  drakon: "DRAKON Generator",
  docs: "Docs Agent",
};

export const LLM_NODES_COUNT = (pipeline: AgentPipeline) =>
  pipeline.nodes.filter((n) => n.hasPrompt).length;
```

---

## src/pages/AgentStudioPage.tsx

```typescript
import { useState } from "react";
import { AgentSidebar } from "@/components/agents/AgentSidebar";
import { PipelineGraph } from "@/components/agents/PipelineGraph";
import { NodePromptPanel } from "@/components/agents/NodePromptPanel";
import { NodeCard } from "@/components/agents/NodeCard";
import { KbDrawer } from "@/components/agents/KbDrawer";
import { PIPELINES, KB_FILES, type AgentPipeline, type AgentNode, type KbFile } from "@/lib/agent-studio-data";

export default function AgentStudioPage() {
  const [selectedPipeline, setSelectedPipeline] = useState<AgentPipeline>(PIPELINES[0]);
  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
  const [selectedKbFile, setSelectedKbFile] = useState<KbFile | null>(null);
  const [kbOpen, setKbOpen] = useState(false);

  const llmNodes = selectedPipeline.nodes.filter((n) => n.hasPrompt);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0a0b0e]">
      {/* Page header */}
      <header className="flex h-10 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#111318] px-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#f59e0b]">
          ⚙ Агентна Логіка
        </span>
        <span className="text-white/20">·</span>
        <span className="font-mono text-[10px] text-white/40">
          {selectedPipeline.name}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
          <span className="font-mono text-[10px] text-white/40">live</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <AgentSidebar
          pipelines={PIPELINES}
          kbFiles={KB_FILES}
          selectedPipeline={selectedPipeline}
          selectedNode={selectedNode}
          onSelectPipeline={(p) => { setSelectedPipeline(p); setSelectedNode(null); }}
          onSelectNode={setSelectedNode}
          onSelectKbFile={(f) => { setSelectedKbFile(f); setKbOpen(true); }}
        />

        {/* Main */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Pipeline graph + node cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Description */}
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-[11px] text-white/70">
                {selectedPipeline.description}
              </h1>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-white/40">
                {llmNodes.length} LLM {llmNodes.length === 1 ? "вузол" : "вузли"}
              </span>
            </div>

            {/* Mermaid graph */}
            <PipelineGraph pipeline={selectedPipeline} />

            {/* LLM node cards */}
            {llmNodes.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/28">
                  Вузли з LLM-промптами
                </span>
                <div className="space-y-1.5">
                  {llmNodes.map((node) => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      selected={selectedNode?.id === node.id}
                      onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                    />
                  ))}
                </div>
              </div>
            )}

            {llmNodes.length === 0 && (
              <div className="rounded border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <p className="font-mono text-[11px] text-white/30">
                  Всі вузли детерміністичні — LLM не використовується
                </p>
              </div>
            )}
          </div>

          {/* KB Drawer */}
          <KbDrawer
            open={kbOpen}
            selectedFile={selectedKbFile}
            onToggle={() => setKbOpen((v) => !v)}
            onSelectFile={setSelectedKbFile}
            agentId={selectedPipeline.agentId}
            kbFiles={KB_FILES.filter((f) => f.agentId === selectedPipeline.agentId)}
          />
        </main>

        {/* Right panel — node detail */}
        {selectedNode && (
          <NodePromptPanel
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

```typescript
import { cn } from "@/lib/utils";
import { AGENT_LABELS, type AgentPipeline, type AgentNode, type KbFile, type AgentId } from "@/lib/agent-studio-data";

interface Props {
  pipelines: AgentPipeline[];
  kbFiles: KbFile[];
  selectedPipeline: AgentPipeline;
  selectedNode: AgentNode | null;
  onSelectPipeline: (p: AgentPipeline) => void;
  onSelectNode: (n: AgentNode) => void;
  onSelectKbFile: (f: KbFile) => void;
}

export function AgentSidebar({ pipelines, kbFiles, selectedPipeline, selectedNode, onSelectPipeline, onSelectNode, onSelectKbFile }: Props) {
  // Group pipelines by agent
  const agents: AgentId[] = ["architect", "drakon", "docs"];

  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-white/[0.06] bg-[#111318] overflow-y-auto">
      {/* Agent groups */}
      {agents.map((agentId) => {
        const agentPipelines = pipelines.filter((p) => p.agentId === agentId);
        if (agentPipelines.length === 0) return null;
        const agentKbFiles = kbFiles.filter((f) => f.agentId === agentId);

        return (
          <div key={agentId} className="border-b border-white/[0.06]">
            {/* Agent header */}
            <div className="px-3 py-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/28">
                {AGENT_LABELS[agentId]}
              </span>
            </div>

            {/* Pipelines */}
            {agentPipelines.map((pipeline) => {
              const isActive = pipeline.id === selectedPipeline.id;
              const llmCount = pipeline.nodes.filter((n) => n.hasPrompt).length;
              return (
                <button
                  key={pipeline.id}
                  onClick={() => onSelectPipeline(pipeline)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
                    isActive
                      ? "border-l-2 border-[#f59e0b] bg-[#f59e0b]/[0.08] pl-[10px]"
                      : "border-l-2 border-transparent hover:bg-white/[0.03]"
                  )}
                >
                  <span className={cn("font-mono text-[11px] flex-1", isActive ? "text-white/90" : "text-white/55")}>
                    {pipeline.shortName}
                  </span>
                  {llmCount > 0 && (
                    <span className="rounded bg-purple-500/20 px-1 font-mono text-[8px] text-purple-400">
                      {llmCount}LLM
                    </span>
                  )}
                </button>
              );
            })}

            {/* Node list if this agent is selected */}
            {agentPipelines.some((p) => p.id === selectedPipeline.id) && (
              <div className="border-t border-white/[0.04] pb-1">
                <div className="px-3 py-1.5">
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/20">Вузли</span>
                </div>
                {selectedPipeline.nodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => node.hasPrompt && onSelectNode(node)}
                      disabled={!node.hasPrompt}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1 text-left",
                        node.hasPrompt ? "cursor-pointer hover:bg-white/[0.03]" : "cursor-default",
                        isSelected && "border-l-2 border-[#f59e0b] bg-[#f59e0b]/[0.06] pl-[10px]"
                      )}
                    >
                      <span className="font-mono text-[9px]">{isSelected ? "●" : "○"}</span>
                      <span className={cn(
                        "flex-1 font-mono text-[10px] truncate",
                        node.hasPrompt ? (isSelected ? "text-white/90" : "text-white/60") : "text-white/25"
                      )}>
                        {node.label}
                      </span>
                      {node.hasPrompt && (
                        <span className="font-mono text-[7px] text-purple-400/70">LLM</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* KB files for this agent */}
            {agentKbFiles.length > 0 && agentPipelines.some((p) => p.id === selectedPipeline.id) && (
              <div className="border-t border-white/[0.04] pb-2">
                <div className="px-3 py-1.5">
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/20">База знань</span>
                </div>
                {agentKbFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => onSelectKbFile(file)}
                    className="flex w-full items-center gap-2 px-3 py-0.5 text-left hover:bg-white/[0.03]"
                  >
                    <span className="font-mono text-[10px] text-white/35 truncate">{file.filename}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
```

---

## src/components/agents/PipelineGraph.tsx

Рендерить Mermaid-діаграму. Використовує CDN для mermaid.js (без npm install — Lovable може не підтримати динамічний import).

```typescript
import { useEffect, useRef, useState } from "react";
import type { AgentPipeline } from "@/lib/agent-studio-data";

// Hardcoded Mermaid strings (Phase 1) — у Phase 2 fetching від backend
const PIPELINE_MERMAID: Record<string, string> = {
  "architect-a": `graph TD
    __start__([START]):::term
    measure_cc[measure_cc]:::action
    classify[classify_complexity]:::action
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
    classDef term fill:#1a1a1a,stroke:#ffffff22,color:#ffffff55
    classDef action fill:#191c23,stroke:#ffffff18,color:#ffffff88
    classDef llm fill:#1e1830,stroke:#a78bfa44,color:#c4b5fd
    classDef determ fill:#141a14,stroke:#22c55e22,color:#22c55e88`,
  "architect-b": `graph TD
    __start__([START]):::term
    code_gen[code_gen]:::llm
    check_syntax[check_syntax]:::determ
    __end__([END]):::term
    __start__ --> code_gen
    code_gen --> check_syntax
    check_syntax -.->|valid| __end__
    check_syntax -.->|syntax err,iter<3| code_gen
    classDef term fill:#1a1a1a,stroke:#ffffff22,color:#ffffff55
    classDef llm fill:#1e1830,stroke:#a78bfa44,color:#c4b5fd
    classDef determ fill:#141a14,stroke:#22c55e22,color:#22c55e88`,
  "drakon-analyze": `graph TD
    __start__([START]):::term
    ast[PythonAnalyzer]:::determ
    validator[validate_ir]:::determ
    __end__([END]):::term
    __start__ --> ast --> validator --> __end__
    classDef term fill:#1a1a1a,stroke:#ffffff22,color:#ffffff55
    classDef determ fill:#141a14,stroke:#22c55e22,color:#22c55e88`,
};

interface Props {
  pipeline: AgentPipeline;
}

export function PipelineGraph({ pipeline }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState(false);

  const mermaidStr = PIPELINE_MERMAID[pipeline.id] ?? "";

  useEffect(() => {
    if (!ref.current || !mermaidStr) return;
    setRendered(false);
    setError(false);

    const render = async () => {
      try {
        // Dynamic import mermaid (should be in package.json)
        const mermaid = await import("mermaid" as never) as { default: { initialize: (c: object) => void; render: (id: string, text: string) => Promise<{ svg: string }> } };
        mermaid.default.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            background: "#0a0b0e",
            mainBkg: "#191c23",
            nodeBorder: "#ffffff18",
            lineColor: "#ffffff30",
            textColor: "#ffffff88",
            edgeLabelBackground: "#111318",
            fontSize: "11px",
          },
        });
        const { svg } = await mermaid.default.render(`mermaid-${pipeline.id}-${Date.now()}`, mermaidStr);
        if (ref.current) {
          ref.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (e) {
        console.error("Mermaid render error", e);
        setError(true);
      }
    };

    void render();
  }, [pipeline.id, mermaidStr]);

  if (!mermaidStr) return null;

  return (
    <div className="rounded border border-white/[0.06] bg-[#111318] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/25">
          Граф пайплайну
        </span>
        <span className="font-mono text-[9px] text-white/20">·</span>
        <span className="font-mono text-[9px] text-white/20">LangGraph StateGraph</span>
      </div>
      {error ? (
        <div className="flex h-[140px] items-center justify-center">
          <span className="font-mono text-[10px] text-white/25">
            Не вдалося відрендерити граф
          </span>
        </div>
      ) : (
        <div
          ref={ref}
          className="flex min-h-[140px] items-center justify-center overflow-x-auto [&_svg]:max-h-[220px] [&_svg]:w-auto"
        />
      )}
    </div>
  );
}
```

---

## src/components/agents/NodeCard.tsx

```typescript
import { cn } from "@/lib/utils";
import type { AgentNode } from "@/lib/agent-studio-data";

interface Props {
  node: AgentNode;
  selected: boolean;
  onClick: () => void;
}

export function NodeCard({ node, selected, onClick }: Props) {
  const promptPreview = node.prompt
    ? node.prompt.trim().slice(0, 80).replace(/\n/g, " ") + (node.prompt.length > 80 ? "…" : "")
    : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded border px-3 py-2.5 text-left transition-all",
        selected
          ? "border-[#f59e0b]/40 bg-[#f59e0b]/[0.07]"
          : "border-white/[0.07] bg-[#111318] hover:border-white/[0.12] hover:bg-[#161920]"
      )}
    >
      {/* Left: indicator */}
      <div className={cn(
        "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
        selected ? "bg-[#f59e0b]" : "bg-purple-500/60"
      )} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-mono text-[11px]",
            selected ? "text-white/90" : "text-white/70"
          )}>
            {node.label}
          </span>
          <span className="rounded bg-purple-500/15 px-1.5 py-0.5 font-mono text-[8px] text-purple-400">
            LLM
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-white/30 line-clamp-1">
          {promptPreview || node.description}
        </p>
      </div>

      {/* Arrow */}
      <span className={cn(
        "font-mono text-[11px] shrink-0 mt-0.5",
        selected ? "text-[#f59e0b]" : "text-white/20"
      )}>→</span>
    </button>
  );
}
```

---

## src/components/agents/NodePromptPanel.tsx

```typescript
import { useState } from "react";
import { X, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AgentNode } from "@/lib/agent-studio-data";

interface Props {
  node: AgentNode;
  pipelineId: string;
  onClose: () => void;
}

export function NodePromptPanel({ node, pipelineId, onClose }: Props) {
  const [prompt, setPrompt] = useState(node.prompt ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Phase 1: mock save (console log)
      // Phase 2: PATCH /v1/agents/nodes/{pipelineId}/{node.id}
      await new Promise((r) => setTimeout(r, 400));
      console.log("Save prompt:", { pipelineId, nodeId: node.id, prompt });
      setSavedAt(new Date());
      toast.success("Промпт збережено");
    } catch {
      toast.error("Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const charCount = prompt.length;

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-white/[0.06] bg-[#111318] overflow-y-auto">
      {/* Header */}
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3">
        <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
        <span className="flex-1 font-mono text-[11px] text-white/90">{node.label}</span>
        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[8px] text-white/40">
          action
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded text-white/35 hover:bg-white/[0.06] hover:text-white/70"
        >
          <X className="h-3 w-3" />
        </button>
      </header>

      {/* Description */}
      <div className="border-b border-white/[0.04] px-3 py-2">
        <p className="font-mono text-[10px] leading-relaxed text-white/40">{node.description}</p>
      </div>

      {/* Prompt section */}
      <div className="flex-1 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/28">
            Системний промпт
          </span>
          <span className="font-mono text-[9px] text-white/20">{charCount} chars</span>
        </div>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={node.isDeterministic
            ? "Детерміністичний вузол — LLM не використовується"
            : "Введіть системний промпт для цього вузла"}
          disabled={node.isDeterministic}
          rows={14}
          className="font-mono text-[10px] leading-relaxed resize-none bg-[#191c23] border-white/[0.08] text-[rgba(180,220,160,0.9)] placeholder:text-white/20 focus:border-[#f59e0b]/40"
        />
      </div>

      {/* Save */}
      {!node.isDeterministic && (
        <div className="border-t border-white/[0.06] p-3 space-y-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#f59e0b] text-black hover:bg-[#f59e0b]/90 font-mono text-[10px] uppercase tracking-wider"
          >
            <Save className="mr-2 h-3 w-3" />
            {saving ? "Збереження…" : "Зберегти промпт"}
          </Button>
          {savedAt && (
            <p className="text-center font-mono text-[9px] text-[#22c55e]">
              ✓ Збережено {savedAt.toLocaleTimeString()}
            </p>
          )}
          <p className="text-center font-mono text-[9px] text-white/20">
            Phase 1: зберігає локально · Phase 2: оновлює агента через API
          </p>
        </div>
      )}

      {/* Agent status */}
      <div className="border-t border-white/[0.04] px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-white/25">Статус агента</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <span className="font-mono text-[9px] text-white/35">live</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

---

## src/components/agents/KbDrawer.tsx

```typescript
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KbFile, AgentId } from "@/lib/agent-studio-data";

interface Props {
  open: boolean;
  selectedFile: KbFile | null;
  onToggle: () => void;
  onSelectFile: (f: KbFile) => void;
  agentId: AgentId;
  kbFiles: KbFile[];
}

export function KbDrawer({ open, selectedFile, onToggle, onSelectFile, kbFiles }: Props) {
  // Phase 1: show description, Phase 2: fetch real content
  const content = selectedFile
    ? `# ${selectedFile.filename}\n\n${selectedFile.description}\n\n_Реальний вміст буде доступний в Phase 2 через /v1/agents/kb endpoint_`
    : "";

  return (
    <div className={cn(
      "shrink-0 border-t border-white/[0.06] bg-[#0f1115] transition-all duration-200",
      open ? "h-[200px]" : "h-10"
    )}>
      {/* Trigger bar */}
      <button
        type="button"
        onClick={onToggle}
        className="flex h-10 w-full items-center gap-2 px-4 hover:bg-white/[0.02]"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 text-white/30" />
        ) : (
          <ChevronUp className="h-3 w-3 text-white/30" />
        )}
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/28">
          База знань
        </span>
        {selectedFile && (
          <>
            <span className="text-white/20">·</span>
            <span className="font-mono text-[10px] text-white/50">{selectedFile.filename}</span>
          </>
        )}
        {kbFiles.length === 0 && (
          <span className="ml-2 font-mono text-[9px] text-white/20">немає файлів для цього агента</span>
        )}
      </button>

      {/* Content */}
      {open && (
        <div className="flex h-[160px] overflow-hidden">
          {/* File list */}
          <div className="w-[160px] shrink-0 overflow-y-auto border-r border-white/[0.06] py-1">
            {kbFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => onSelectFile(file)}
                className={cn(
                  "flex w-full px-3 py-1.5 text-left hover:bg-white/[0.03]",
                  selectedFile?.id === file.id && "bg-white/[0.05]"
                )}
              >
                <span className={cn(
                  "font-mono text-[10px] truncate",
                  selectedFile?.id === file.id ? "text-white/70" : "text-white/35"
                )}>
                  {file.filename}
                </span>
              </button>
            ))}
          </div>

          {/* File content */}
          <div className="flex-1 overflow-y-auto p-3">
            {selectedFile ? (
              <pre className="font-mono text-[10px] leading-relaxed text-white/50 whitespace-pre-wrap">
                {content}
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="font-mono text-[10px] text-white/20">
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

У існуючому компоненті навігації (sidebar або header, де є посилання /diagrams, /docs тощо) додати:

```typescript
// У навігаційному компоненті — додати поруч з іншими посиланнями:
{ href: "/agents", label: "Агенти", icon: <Settings2 className="h-4 w-4" /> }
// або:
<Link to="/agents">
  <Settings2 className="h-4 w-4" />
  <span>Агентна логіка</span>
</Link>
```

---

## Залежність: mermaid

Додати `mermaid` до package.json:

```json
"mermaid": "^11.0.0"
```

Або Lovable може використати dynamic import через CDN (якщо npm не підтримується):

```typescript
// Альтернатива без npm:
const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
document.head.appendChild(script);
```

---

## Що НЕ робити

- НЕ змінювати DiagramsPage, DiagramEditorPage, або інші існуючі сторінки
- НЕ додавати реальні API calls (Phase 1 = mock data + console.log для save)
- НЕ встановлювати ReactFlow або D3 — mermaid достатньо
- НЕ змінювати дизайн-систему (кольори, шрифти, spacing)

---

## TypeScript перевірка

Після реалізації запустити:
```
npx tsc --noEmit --skipLibCheck
```
Має бути 0 помилок.

---

## Резюме сторінки

Нова сторінка `/agents` з трьома панелями:
1. **Ліва** (200px) — дерево агентів → пайплайни → вузли → KB файли
2. **Центральна** (flex-1) — Mermaid граф пайплайну + картки LLM-вузлів
3. **Права** (340px, conditional) — редактор промпту вибраного вузла
4. **Нижня** (200px, collapsible) — перегляд KB файлів
