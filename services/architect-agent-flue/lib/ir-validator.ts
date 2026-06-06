export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateIr(ir: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ir || typeof ir !== 'object' || Array.isArray(ir)) {
    return { valid: false, errors: ['IR must be a dict'], warnings };
  }

  // Required fields
  if (!('name' in ir)) {
    errors.push("Missing 'name' field");
  }
  if (!('items' in ir)) {
    errors.push("Missing 'items' field");
    return { valid: false, errors, warnings };
  }

  const items = ir.items;
  if (!items || typeof items !== 'object' || Array.isArray(items)) {
    errors.push("'items' must be a dict");
    return { valid: false, errors, warnings };
  }

  // b0 entry
  if (!('b0' in items)) {
    errors.push("Missing mandatory 'b0' entry node");
  } else {
    const b0 = items.b0;
    if (b0.type !== 'branch') {
      errors.push("b0 must have type 'branch'");
    }
    if (!('branchId' in b0)) {
      errors.push("b0 must have 'branchId'");
    }
    if (!('one' in b0)) {
      errors.push("b0 must have 'one' pointer");
    }
  }

  // end node
  if (!('end' in items)) {
    errors.push("Missing mandatory 'end' node");
  } else {
    if (items.end?.type !== 'end') {
      errors.push("'end' node must have type 'end'");
    }
  }

  // params is string
  if ('params' in ir && typeof ir.params !== 'string') {
    errors.push("'params' must be a string, not array/other type");
  }

  // Node consistency
  const allIds = new Set(Object.keys(items));
  for (const [nid, nodeAny] of Object.entries(items)) {
    const node = nodeAny as any;
    if (!node || typeof node !== 'object') continue;

    const ntype = node.type;
    if (ntype === 'action') {
      if (!('content' in node)) {
        warnings.push(`Node ${nid}: action missing 'content'`);
      }
      const target = node.one;
      if (target && !allIds.has(target)) {
        errors.push(`Node ${nid}: 'one' refs unknown node '${target}'`);
      }
    } else if (ntype === 'question') {
      if (!('content' in node)) {
        warnings.push(`Node ${nid}: question missing 'content'`);
      } else {
        if (typeof node.content === 'string' && !node.content.endsWith('?')) {
          warnings.push(`Node ${nid}: question content should end with '?'`);
        }
      }
      for (const key of ['one', 'two']) {
        const target = node[key];
        if (!target) {
          errors.push(`Node ${nid}: question missing '${key}' pointer`);
        } else if (!allIds.has(target)) {
          errors.push(`Node ${nid}: '${key}' refs unknown node '${target}'`);
        }
      }
    } else if (ntype === 'branch') {
      const target = node.one;
      if (target && !allIds.has(target)) {
        errors.push(`Node ${nid}: 'one' refs unknown node '${target}'`);
      }
    } else if (ntype !== 'end') {
      warnings.push(`Node ${nid}: unknown type '${ntype}'`);
    }
  }

  // Reachability from b0
  if ('b0' in items) {
    const reachable = getReachable(items, 'b0');
    for (const nid of allIds) {
      if (!reachable.has(nid)) {
        warnings.push(`Node ${nid} is unreachable from b0`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function getReachable(items: any, start: string): Set<string> {
  const visited = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const nid = stack.pop()!;
    if (visited.has(nid) || !(nid in items)) {
      continue;
    }
    visited.add(nid);
    const node = items[nid];
    if (node && typeof node === 'object') {
      for (const key of ['one', 'two']) {
        const target = node[key];
        if (target) {
          stack.push(target);
        }
      }
    }
  }
  return visited;
}
