import type { IrDiagram, IrItem } from "@/lib/htse/ir-types";

export type DiffStatus = "added" | "removed" | "modified" | "unchanged";

export interface DiffResult {
  status: DiffStatus;
  oldNode?: IrItem;
  newNode?: IrItem;
}

export interface DiagramDiff {
  nodes: Record<string, DiffResult>;
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
}

export function compareDiagrams(oldIr: IrDiagram, newIr: IrDiagram): DiagramDiff {
  const diff: Record<string, DiffResult> = {};
  const summary = { added: 0, removed: 0, modified: 0 };

  // Check for added and modified nodes
  for (const [id, newItem] of Object.entries(newIr.items)) {
    const oldItem = oldIr.items[id];
    
    if (!oldItem) {
      diff[id] = { status: "added", newNode: newItem };
      summary.added++;
    } else {
      const isModified = 
        oldItem.content !== newItem.content ||
        oldItem.type !== newItem.type ||
        oldItem.one !== newItem.one ||
        oldItem.two !== newItem.two;
        
      if (isModified) {
        diff[id] = { status: "modified", oldNode: oldItem, newNode: newItem };
        summary.modified++;
      } else {
        diff[id] = { status: "unchanged", oldNode: oldItem, newNode: newItem };
      }
    }
  }

  // Check for removed nodes
  for (const [id, oldItem] of Object.entries(oldIr.items)) {
    if (!newIr.items[id]) {
      diff[id] = { status: "removed", oldNode: oldItem };
      summary.removed++;
    }
  }

  return { nodes: diff, summary };
}

export function applyDiffStyles(ir: IrDiagram, diff: DiagramDiff): IrDiagram {
  const result: IrDiagram = {
    ...ir,
    items: JSON.parse(JSON.stringify(ir.items)),
  };

  for (const [id, status] of Object.entries(diff.nodes)) {
    if (!result.items[id]) continue; // removed nodes are not in the new IR
    
    if (status.status === "added") {
      result.items[id].style = {
        ...(result.items[id].style || {}),
        backgroundColor: "#e6ffed",
        borderColor: "#2da44e",
        color: "#1f2328"
      };
    } else if (status.status === "modified") {
      result.items[id].style = {
        ...(result.items[id].style || {}),
        backgroundColor: "#fff8c5",
        borderColor: "#d4a72c",
        color: "#1f2328"
      };
    }
  }

  return result;
}
