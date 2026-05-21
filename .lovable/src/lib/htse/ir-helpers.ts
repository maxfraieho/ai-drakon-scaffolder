/**
 * Canonical IR — проміжний формат між code analysis / LLM і drakonwidget.js editor.
 * Відрізняється від DrakonDiagram (editor format) тим, що:
 * - не містить координат
 * - строго типізований через Zod
 * - є єдиним контрактом для AI pipeline
 */

import { IrItemSchema } from "./ir-schema";
import type { IrDiagram, IrItem } from "./ir-types";

function cleanString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isValidIrItem(item: unknown): item is IrItem {
  return IrItemSchema.safeParse(item).success;
}

export function normalizeIr(payload: IrDiagram): IrDiagram {
  const normalizedName = payload.name.trim();
  const normalizedParams = payload.params.map((param) => param.trim()).filter((param) => param.length > 0);

  const normalizedItems = Object.fromEntries(
    Object.entries(payload.items).map(([id, item]) => {
      const normalized: IrItem = {
        ...item,
        content: item.content.trim(),
      };

      const secondary = cleanString(item.secondary);
      const one = cleanString(item.one);
      const two = cleanString(item.two);
      const side = cleanString(item.side);
      const branchId = cleanString(item.branchId);

      if (secondary === undefined) delete normalized.secondary;
      else normalized.secondary = secondary;

      if (one === undefined) delete normalized.one;
      else normalized.one = one;

      if (two === undefined) delete normalized.two;
      else normalized.two = two;

      if (side === undefined) delete normalized.side;
      else normalized.side = side;

      if (branchId === undefined) delete normalized.branchId;
      else normalized.branchId = branchId;

      if (normalized.style === undefined) {
        normalized.style = {};
      }

      return [id, normalized];
    }),
  );

  return {
    name: normalizedName.length > 0 ? normalizedName : "Untitled",
    access: payload.access,
    params: normalizedParams,
    items: normalizedItems,
  };
}

export function getItemById(ir: IrDiagram, id: string): IrItem | undefined {
  return ir.items[id];
}
