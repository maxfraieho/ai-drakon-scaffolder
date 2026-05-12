"""Validates DRAKON IR structure before returning to caller."""
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def validate_ir(ir: dict) -> ValidationResult:
    """Validate a single DRAKON IR diagram dict."""
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(ir, dict):
        return ValidationResult(False, ["IR must be a dict"])

    # Required fields
    if "name" not in ir:
        errors.append("Missing 'name' field")
    if "items" not in ir:
        errors.append("Missing 'items' field")
        return ValidationResult(False, errors, warnings)

    items = ir["items"]
    if not isinstance(items, dict):
        errors.append("'items' must be a dict")
        return ValidationResult(False, errors, warnings)

    # b0 entry
    if "b0" not in items:
        errors.append("Missing mandatory 'b0' entry node")
    else:
        b0 = items["b0"]
        if b0.get("type") != "branch":
            errors.append("b0 must have type 'branch'")
        if "branchId" not in b0:
            errors.append("b0 must have 'branchId'")
        if "one" not in b0:
            errors.append("b0 must have 'one' pointer")

    # end node
    if "end" not in items:
        errors.append("Missing mandatory 'end' node")
    else:
        if items["end"].get("type") != "end":
            errors.append("'end' node must have type 'end'")

    # params is string
    if "params" in ir and not isinstance(ir["params"], str):
        errors.append("'params' must be a string, not array/other type")

    # Node consistency
    all_ids = set(items.keys())
    for nid, node in items.items():
        ntype = node.get("type")
        if ntype == "action":
            if "content" not in node:
                warnings.append(f"Node {nid}: action missing 'content'")
            target = node.get("one")
            if target and target not in all_ids:
                errors.append(f"Node {nid}: 'one' refs unknown node '{target}'")
        elif ntype == "question":
            if "content" not in node:
                warnings.append(f"Node {nid}: question missing 'content'")
            else:
                if not node["content"].endswith("?"):
                    warnings.append(f"Node {nid}: question content should end with '?'")
            for key in ("one", "two"):
                target = node.get(key)
                if not target:
                    errors.append(f"Node {nid}: question missing '{key}' pointer")
                elif target not in all_ids:
                    errors.append(f"Node {nid}: '{key}' refs unknown node '{target}'")
        elif ntype == "branch":
            target = node.get("one")
            if target and target not in all_ids:
                errors.append(f"Node {nid}: 'one' refs unknown node '{target}'")
        elif ntype != "end":
            warnings.append(f"Node {nid}: unknown type '{ntype}'")

    # Reachability from b0
    if "b0" in items:
        reachable = _reachable(items, "b0")
        for nid in all_ids:
            if nid not in reachable:
                warnings.append(f"Node {nid} is unreachable from b0")

    return ValidationResult(len(errors) == 0, errors, warnings)


def _reachable(items: dict, start: str) -> set[str]:
    visited: set[str] = set()
    stack = [start]
    while stack:
        nid = stack.pop()
        if nid in visited or nid not in items:
            continue
        visited.add(nid)
        node = items[nid]
        for key in ("one", "two"):
            target = node.get(key)
            if target:
                stack.append(target)
    return visited
