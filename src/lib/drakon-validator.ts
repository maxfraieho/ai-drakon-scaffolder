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
    if (typeof item.content !== "string") errors.push(`Item "${id}": missing or non-string content`);
    if (item.one !== undefined && !items[item.one as string]) errors.push(`Item "${id}": 'one' points to non-existent "${item.one}"`);
    if (item.two !== undefined && !items[item.two as string]) errors.push(`Item "${id}": 'two' points to non-existent "${item.two}"`);
    if (item.type === "end") endCount++;
  }
  if (endCount === 0) errors.push("No 'end' node found");
  if (endCount > 1) errors.push(`Found ${endCount} 'end' nodes (expected 1)`);

  const visited = new Set<string>();
  const stack = new Set<string>();
  function hasCycle(id: string, depth: number): boolean {
    if (depth > 200) { errors.push("Max traversal depth exceeded (200)"); return true; }
    if (stack.has(id)) { errors.push(`Cycle detected at "${id}"`); return true; }
    if (visited.has(id)) return false;
    visited.add(id); stack.add(id);
    const item = items[id];
    if (item?.one && hasCycle(item.one as string, depth + 1)) return true;
    if (item?.two && hasCycle(item.two as string, depth + 1)) return true;
    stack.delete(id);
    return false;
  }
  for (const id of itemIds) { if (!visited.has(id)) hasCycle(id, 0); }
  return { valid: errors.length === 0, errors };
}
