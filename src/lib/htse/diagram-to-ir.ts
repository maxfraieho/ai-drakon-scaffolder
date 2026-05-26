/**
 * Adapter: IrDiagram <-> DrakonDiagram
 * IrDiagram — canonical AI format (no coordinates)
 * DrakonDiagram — editor runtime format (used by drakonwidget.js)
 */

import type { DrakonDiagram, DrakonItem } from "@/types/drakonwidget";

import type { IrDiagram, IrItem, IrItemType } from "./ir-types";
import { validateIrDeterministic } from "./ir-validator-core";
import type { ValidationIssue } from "./ir-validator-core";

const IR_ITEM_TYPES: ReadonlySet<IrItemType> = new Set([
  "action",
  "question",
  "select",
  "case",
  "header",
  "end",
  "address",
  "branch",
  "insertion",
  "input",
  "output",
  "shelf",
  "process",
  "timer",
  "duration",
]);

function mapDiagramAccessToIrAccess(access: DrakonDiagram["access"]): IrDiagram["access"] {
  return access === "write" ? "private" : "public";
}

function mapDiagramFlag1ToIrFlag1(flag1: number | undefined): boolean | undefined {
  if (flag1 === undefined) return undefined;
  return flag1 !== 0;
}

function mapDiagramBranchIdToIrBranchId(branchId: number | undefined): string | undefined {
  if (branchId === undefined) return undefined;
  return String(branchId);
}

function parseItemStyle(style: string | undefined): Record<string, unknown> {
  if (!style) return {};

  try {
    const parsed = JSON.parse(style) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { rawStyle: style };
  } catch {
    return { rawStyle: style };
  }
}

function mapDrakonTypeToIrType(type: string): IrItemType {
  if (IR_ITEM_TYPES.has(type as IrItemType)) {
    return type as IrItemType;
  }

  return "action";
}

function mapDiagramItemToIrItem(item: DrakonItem): IrItem {
  const style = parseItemStyle(item.style);

  // TODO: field `link` has no direct IR mapping, preserved in style.
  if (item.link !== undefined) style.link = item.link;

  // TODO: field `margin` has no direct IR mapping, preserved in style.
  if (item.margin !== undefined) style.margin = item.margin;

  // TODO: unknown DrakonItem.type values have no direct IR mapping, preserved in style.
  if (!IR_ITEM_TYPES.has(item.type as IrItemType)) style.originalType = item.type;

  const irItem: IrItem = {
    type: mapDrakonTypeToIrType(item.type),
    content: item.content ?? "",
    secondary: item.secondary,
    one: item.one,
    two: item.two,
    side: item.side,
    flag1: mapDiagramFlag1ToIrFlag1(item.flag1),
    branchId: mapDiagramBranchIdToIrBranchId(item.branchId),
  };

  if (Object.keys(style).length > 0) {
    irItem.style = style;
  }

  return irItem;
}

function parseDiagramParams(params: string | undefined): string[] {
  if (!params) return [];

  return params
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function convertDiagramToIr(diagram: DrakonDiagram): IrDiagram {
  const items: Record<string, IrItem> = {};

  for (const [id, item] of Object.entries(diagram.items)) {
    // Keep stable node ids: editor id == IR id.
    items[id] = mapDiagramItemToIrItem(item);
  }

  return {
    name: diagram.name,
    access: mapDiagramAccessToIrAccess(diagram.access),
    params: parseDiagramParams(diagram.params),
    items,
  };
}

export function convertDiagramToIrWithValidation(diagram: DrakonDiagram): {
  ir: IrDiagram;
  issues: ValidationIssue[];
} {
  const conversionIssues: ValidationIssue[] = [];

  for (const [id, item] of Object.entries(diagram.items)) {
    if (!IR_ITEM_TYPES.has(item.type as IrItemType)) {
      conversionIssues.push({
        code: "UNKNOWN_ITEM_TYPE",
        severity: "warning",
        message: `Unknown item type "${item.type}", mapped to "action"`,
        nodeId: id,
      });
    }
  }

  const ir = convertDiagramToIr(diagram);
  const { issues: validationIssues } = validateIrDeterministic(ir);

  return {
    ir,
    issues: [...conversionIssues, ...validationIssues],
  };
}
