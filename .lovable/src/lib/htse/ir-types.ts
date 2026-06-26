/**
      * Canonical IR — проміжний формат між code analysis / LLM і drakonwidget.js editor.
      * Відрізняється від DrakonDiagram (editor format) тим, що:
      * - не містить координат
      * - строго типізований через Zod
      * - є єдиним контрактом для AI pipeline
*/

export type IrItemType =
| "action"
| "question"
| "select"
| "case"
| "header"
| "end"
| "address"
| "branch"
| "insertion"
| "input"
| "output"
| "shelf"
| "process"
| "timer"
| "duration";

export interface IrItemMeta {
  nodeKind?: 'component' | 'n8n' | 'llm' | 'tool' | 'github';
  componentSlug?: string;
  agentId?: string;
  n8nNodeType?: string;
  n8nTypeVersion?: number;
  n8nParams?: Record<string, unknown>;
  credentialName?: string;
}

export interface IrItem {
type: IrItemType;
content: string;
secondary?: string;
one?: string;
two?: string;
side?: string;
flag1?: boolean;
branchId?: string;
style?: Record<string, unknown>;
meta?: IrItemMeta;
}

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
meta?: IrDiagramMeta;
}
