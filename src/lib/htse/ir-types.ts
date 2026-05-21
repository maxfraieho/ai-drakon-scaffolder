/**
      • Canonical IR — проміжний формат між code analysis / LLM і drakonwidget.js editor.
      • Відрізняється від DrakonDiagram (editor format) тим, що:
      • - не містить координат
      • - строго типізований через Zod
      • - є єдиним контрактом для AI pipeline
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
}

export interface IrDiagram {
name: string;
access: "public" | "private";
params: string[];
items: Record<string, IrItem>;
}

