import type { IrDiagram } from "@/lib/htse/ir-types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDrakonIR(ir: unknown): ir is IrDiagram {
  const result = validateDrakonIRDetailed(ir);
  return result.valid;
}

export function validateDrakonIRDetailed(ir: unknown): ValidationResult {
  const errors: string[] = [];
  if (!ir || typeof ir !== "object") return { valid: false, errors: ["IR is not an object"] };
  const obj = ir as Record<string, unknown>;
  if (!obj.items || typeof obj.items !== "object") return { valid: false, errors: ["Missing or invalid 'items' field"] };
  const items = obj.items as Record<string, Record<string, unknown>>;
  const itemIds = Object.keys(items);
  if (itemIds.length === 0) return { valid: false, errors: ["Empty items"] };

  let endCount = 0;
  for (const [id, item] of Object.entries(items)) {
    if (typeof item.type !== "string") errors.push(`Item "${id}": missing or non-string type`);
    if (item.content !== undefined && typeof item.content !== "string") errors.push(`Item "${id}": content must be a string`);
    if (item.one !== undefined && !items[item.one as string]) errors.push(`Item "${id}": 'one' points to non-existent "${item.one}"`);
    if (item.two !== undefined && !items[item.two as string]) errors.push(`Item "${id}": 'two' points to non-existent "${item.two}"`);
    if (item.type === "end") endCount++;
  }
  if (endCount === 0) errors.push("No 'end' node found");
  if (endCount > 1) errors.push(`Found ${endCount} 'end' nodes (expected 1)`);

  return { valid: errors.length === 0, errors };
}
