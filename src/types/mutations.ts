import type { IrItem } from "@/lib/htse/ir-types";
import type { ValidationIssue } from "@/lib/htse/ir-validator-client";

export type MutationOp =
  | { op: "insertNode"; nodeId: string; node: IrItem; expectedVersion?: number }
  | { op: "updateNode"; nodeId: string; fields: Partial<IrItem>; expectedVersion?: number }
  | { op: "deleteNode"; nodeId: string; expectedVersion?: number }
  | { op: "setOne"; nodeId: string; targetId: string | null; expectedVersion?: number }
  | { op: "setTwo"; nodeId: string; targetId: string | null; expectedVersion?: number }
  | { op: "renameDiagram"; newName: string; expectedVersion?: number };

export type MutationResult = {
  version: number;
  applied: MutationOp[];
  rejected: Array<{ op: MutationOp; reason: string }>;
  validationIssues: ValidationIssue[];
};
