/**
      • Adapter: IrDiagram <-> DrakonDiagram
      • IrDiagram — canonical AI format (no coordinates)
      • DrakonDiagram — editor runtime format (used by drakonwidget.js)
*/

import type { DrakonDiagram, DrakonItem } from "@/types/drakonwidget";
import type { IrDiagram } from "./ir-types";

function mapIrAccessToDiagramAccess(access: IrDiagram["access"]): DrakonDiagram["access"]
{
return access === "private" ? "write" : "read";
}

function mapIrFlag1ToDiagramFlag1(flag1: boolean | undefined): number | undefined {
if (flag1 === undefined) return undefined;
return flag1 ? 1 : 0;
}

function mapIrBranchIdToDiagramBranchId(branchId: string | undefined): number | undefined {
if (branchId === undefined) return undefined;
const parsed = Number(branchId);
return Number.isFinite(parsed) ? parsed : undefined;
}

function mapIrItemToDrakonItem(item: IrDiagram["items"][string]): DrakonItem {
const drakonItem: DrakonItem = {
type: item.type,
content: item.content,
secondary: item.secondary,
one: item.one,
two: item.two,
side: item.side,
flag1: mapIrFlag1ToDiagramFlag1(item.flag1),
branchId: mapIrBranchIdToDiagramBranchId(item.branchId),
};

if (item.style && Object.keys(item.style).length > 0) {
drakonItem.style = JSON.stringify(item.style);
}

return drakonItem;
}

export function convertIrToDiagram(ir: IrDiagram): DrakonDiagram {
const items: Record<string, DrakonItem> = {};

for (const [id, item] of Object.entries(ir.items)) {
// Keep stable node ids: IR id == editor id.
items[id] = mapIrItemToDrakonItem(item);
}

return {
name: ir.name,
access: mapIrAccessToDiagramAccess(ir.access),
params: (ir.params ?? []).join(", "),
items,
};
}

