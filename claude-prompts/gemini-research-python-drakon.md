# Deep Research Prompt: Python AST Analysis for DRAKON Diagram Generation

## Context for Gemini

You are analyzing the **ai-drakon** project — a platform that generates DRAKON visual diagrams
from source code. Currently it supports TypeScript/JavaScript analysis. The goal is to add
full Python support: analyze Python source code and generate structured DRAKON IR (Intermediate
Representation) that can be rendered as visual DRAKON flowcharts.

The DRAKON notation uses these primitives:
- **action** — a single operation (rectangle)
- **decision** — conditional branch (diamond, yes/no outputs)  
- **loop_start / loop_end** — iteration boundaries
- **call** — subroutine/function call
- **branch** — parallel branches in a silhouette
- **terminator** — start/end of algorithm

DRAKON IR format (no X/Y coordinates — layout is automatic):
```json
{
  "name": "diagram name",
  "items": {
    "1": { "type": "terminator", "text": "START", "next": "2" },
    "2": { "type": "action", "text": "operation description", "next": "3" },
    "3": { "type": "decision", "text": "condition?", "yes": "4", "no": "5" },
    "4": { "type": "action", "text": "yes branch", "next": "6" },
    "5": { "type": "action", "text": "no branch", "next": "6" },
    "6": { "type": "terminator", "text": "END", "next": null }
  }
}
```

## Current Implementation (JavaScript, Cloudflare Worker)

The existing `analyzeGithubRepo` function reads files from GitHub via API, then uses regex:
- Functions: `/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|def\s+\w+|async\s+def\s+\w+)/g`
- Classes: `/(?:class\s+[A-Z]\w+)/g`
- Flows: detect `useEffect`/`useState` patterns

This is insufficient for Python — regex cannot capture control flow structure (if/else nesting,
try/except, for/while loops, comprehensions, decorators, context managers).

## Research Questions

Please conduct deep research on the following and provide concrete implementation recommendations:

### 1. Python AST for Control Flow Extraction

How to use Python's `ast` module (or alternative like `astroid`, `libCST`, `tree-sitter`) to:
- Extract function/method signatures with their full control flow
- Map `if/elif/else` → DRAKON decision chains
- Map `for/while` → DRAKON loop_start/loop_end  
- Map `try/except/finally` → DRAKON decision + error branch
- Map `with` statements → DRAKON action wrappers
- Handle `async def`, `yield`, comprehensions

Provide code examples for each mapping.

### 2. Running Python Analysis in JavaScript/Workers Environment

The current system is a Cloudflare Worker (JavaScript). Options for Python analysis:
- **Option A**: Run Python analysis as a separate microservice (Python FastAPI) on the server,
  call it from the Worker
- **Option B**: Use tree-sitter WASM in the Worker (JavaScript, runs in CF Workers)
- **Option C**: Use a pure-JavaScript Python parser (e.g., filbert, @babel/parser won't work)
- **Option D**: Pre-process Python files to extract AST on the server, send JSON to Worker

For each option: feasibility in Cloudflare Workers, complexity, accuracy trade-offs.

### 3. DRAKON Mapping Rules for Python-Specific Patterns

Define concrete mapping rules for:
```python
# Pattern 1: if/elif/else chain
if condition_a:
    action_a()
elif condition_b:
    action_b()  
else:
    action_c()
```
→ DRAKON IR (chain of decisions)

```python
# Pattern 2: for loop with break
for item in collection:
    if predicate(item):
        break
    process(item)
```
→ DRAKON IR (loop with decision inside)

```python
# Pattern 3: try/except/finally
try:
    risky_operation()
except SpecificError as e:
    handle_error(e)
finally:
    cleanup()
```
→ DRAKON IR (decision with error branch + always-execute)

```python
# Pattern 4: Nested functions / class methods
class SlotRouter:
    def resolve_slot(self, model_name: str) -> ProxySlotConfig | None:
        normalized = model_name.strip()
        if "/" in normalized:
            suffix = normalized.rsplit("/", 1)[-1]
            normalized = suffix or normalized
        normalized = self._ALIASES.get(normalized, normalized)
        for slot in self._slots_loader():
            if slot.slot_id == normalized:
                if slot.mode == "disabled":
                    return None
                return slot
        return None
```
→ How to represent this class method as a DRAKON diagram?

### 4. Complexity Estimation

How to estimate DRAKON diagram complexity from Python AST:
- Cyclomatic complexity → DRAKON branch count
- Nesting depth → silhouette vs. flat diagram
- Which functions deserve full DRAKON diagrams vs. simple action nodes?

### 5. Incremental Analysis Strategy

For a Python codebase with 50-200 files (like free-claude-code-alpine):
- Which files/functions should be analyzed first? (entry points, high cyclomatic complexity?)
- How to handle imports and cross-module references in DRAKON?
- Caching strategy for large codebases

## Target System Architecture

The result should work like this:
1. `drakon.analyzecodebase` (Cloudflare Worker MCP tool) is called with `owner/repo`
2. Worker fetches Python files from GitHub API  
3. **NEW**: Worker calls Python microservice OR uses WASM parser to extract AST
4. AST → DRAKON IR conversion
5. Diagrams are saved to MinIO storage
6. Available in ai-drakon UI for human review

## Deliverables Expected from Research

1. **Recommended approach** (which option A/B/C/D) with justification
2. **Complete mapping table**: Python construct → DRAKON IR node type
3. **Reference implementation**: Python function that takes `ast.FunctionDef` node
   and returns DRAKON IR dict
4. **Complexity scoring**: formula to decide which functions to diagram
5. **Architecture diagram** of the Python analysis pipeline

## Attached Context

[Attach these 5 files from ai-drakon project docs when submitting to Gemini:]
1. Worker code: `cloudflare-worker/worker-mcp-drakon.js` (the `analyzeGithubRepo` function)
2. DRAKON IR schema: from `drakon.validateir` tool inputSchema
3. Frontend DiagramEditorPage: `.lovable/src/pages/DiagramEditorPage.tsx`
4. DrakonEditor component: `.lovable/src/components/drakon/DrakonEditor.tsx`
5. This prompt file

---
*Generated by Claude Code for ai-drakon Python support research phase*
*Date: 2026-05-11*
