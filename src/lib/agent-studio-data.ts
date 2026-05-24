export type AgentId = "architect" | "drakon" | "docs";
export type NodeType = "action" | "decision" | "terminator";

export interface AgentNode {
id: string;
label: string;
type: NodeType;
icon: string;
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
content?: string;
}

export const PIPELINES: AgentPipeline[] = [
{
id: "architect-a",
agentId: "architect",
name: "Pipeline A: Код → DRAKON IR",
shortName: "Pipeline A",
description: "LangGraph StateGraph · 7 вузлів · Ralph Loop (max 3 iter)",
nodes: [
{ id: "measure_cc", label: "measure_cc", type: "action", icon: "data_object", description:
"Вимірює цикломатичну складність через radon.complexity.cc_visit(). Повертає максимальний CC по всіх функціях.", hasPrompt: false, isDeterministic: true },
{ id: "classify", label: "classify_complexity", type: "decision", icon: "call_split", description:
"Визначає tree_level: primitive (CC≤10) | silhouette (11-20) | branch (21-50) | deep (>50). Обирає шлях: AST або LLM.", hasPrompt: false, isDeterministic: true },
{ id: "ast_translate", label: "ast_translate", type: "action", icon: "data_object", description:
"Швидкий детерміністичний шлях. PythonAnalyzer: Python AST → DRAKON IR без LLM. Тільки для CC ≤ 10.", hasPrompt: false, isDeterministic: true },
{
id: "yaml_gen", label: "yaml_gen", type: "action", icon: "generating_tokens",
description: "LLM: перетворює Python код у спрощений C4-B YAML опис поведінки. Знижує ризик галюцинацій на першому кроці.",
hasPrompt: true,
prompt: `Перетвори Python код у YAML опис алгоритмічної поведінки.

Формат (C4-B behavioral YAML):
steps:
         • id: "1"
text: "опис дії або рішення"
type: action | decision | loop_start | loop_end | terminator
next: "2" # для action/terminator
yes: "3" # для decision
no: "4" # для decision

Правила:
     • Кожна Python statement → один step
     • if/elif/else → decision з yes/no
     • for/while → loop_start + loop_end
     • return → terminator (text: "return значення")
     • Не додавай пояснень поза YAML

Код:
{source_code}

Поверни тільки YAML.`,
},
{
id: "ir_gen", label: "ir_gen", type: "action", icon: "generating_tokens",
description: "LLM: конвертує YAML + оригінальний код → DRAKON IR JSON. Якщо є validation_errors — передаються як контекст. Ralph Loop (max 3 iter).",
hasPrompt: true,
prompt: `Конвертуй YAML опис у DRAKON IR JSON.

YAML:
{behavioral_yaml}

{validation_errors_section}

IR-формат вузла:
{
"id_вузла": {
"type": "action|decision|terminator|loop_start|loop_end",
"text": "текст вузла",
"next": "id",
"yes": "id",
"no": "id"
}
}

Правила DRAKON:
     1. Один START, один END термінатор
     2. Кожен вузол досяжний від START
     3. Немає orphan-вузлів
     4. yes/no посилаються на існуючі id
     5. Помилки праворуч (no-гілка)

Поверни тільки JSON.`,
},
{ id: "validate", label: "validate", type: "action", icon: "task_alt", description: "ir_validator.py: перевіряє топологічні правила DRAKON. Якщо invalid і iter < 3 → повертається до ir_gen (Ralph Loop).", hasPrompt: false, isDeterministic: true },
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
id: "code_gen", label: "code_gen", type: "action", icon: "generating_tokens",
description: "LLM: отримує DRAKON IR + цільову мову. Якщо є syntax_errors — передаються як контекст. Syntax Loop (max 3).",
hasPrompt: true,
prompt: `Згенеруй код мовою {language} з DRAKON IR.

DRAKON IR:
{drakon_ir}

{syntax_errors_section}

Правила:
     • Точно відтворюй алгоритмічну логіку з IR
     • action → statement, decision → if/else
     • loop_start/loop_end → while/for
     • Термінатори з "return" → return statements
     • Не додавай логіки поза IR

Поверни тільки код.`,
},
{ id: "check_syntax", label: "check_syntax", type: "action", icon: "task_alt", description:
"Перевіряє синтаксис. Python: ast.parse(). Якщо помилки → повертає до code_gen.",
hasPrompt: false, isDeterministic: true },
],
},
{
id: "drakon-analyze",
agentId: "drakon",
name: "Аналіз Python AST",
shortName: "AST Analyzer",
description: "Детерміністичний транслятор · Python AST → DRAKON IR · без LLM",
nodes: [
{ id: "ast_visitor", label: "PythonAnalyzer", type: "action", icon: "data_object", description:
"ast.NodeVisitor: обходить Python AST, маппить конструкції на DRAKON вузли. Детерміністично.", hasPrompt: false, isDeterministic: true },
{ id: "ir_validator_drakon", label: "validate_ir", type: "action", icon: "task_alt", description:
"ir_validator.py: топологічні перевірки DRAKON. Повертає validation_errors[].", hasPrompt:
false, isDeterministic: true },
],
},
{
id: "docs-chat",
agentId: "docs",
name: "Docs Q&A Pipeline",
shortName: "Docs Chat",
description: "RAG over knowledge base · 2 вузли",
nodes: [
{ id: "retrieve", label: "retrieve_context", type: "action", icon: "database", description: "BM25 + векторний пошук по KB. Повертає top-k релевантних чанків.", hasPrompt: false,
isDeterministic: true },
{
id: "answer", label: "answer", type: "action", icon: "generating_tokens",
description: "LLM: формує відповідь на основі retrieved context.",
hasPrompt: true,
prompt: `Дай відповідь на питання користувача на основі наданого контексту.

Контекст:
{context}

Питання:
{question}

Правила:
     • Відповідай лише на основі контексту
     • Якщо контексту недостатньо — скажи про це
     • Цитуй джерела (filename) у форматі [doc:filename]`,
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
export const llmNodesCount = (pipeline: AgentPipeline) =>
pipeline.nodes.filter((n) => n.hasPrompt).length;

