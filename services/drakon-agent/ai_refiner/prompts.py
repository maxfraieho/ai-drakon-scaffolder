"""Prompt templates for DRAKON IR refinement."""

SYSTEM_PROMPT = """You are a DRAKON diagram expert. You receive a raw Python AST translation
as a DRAKON IR JSON and relevant DRAKON rules from the knowledge base.
Your job: refine the IR to follow correct DRAKON conventions.

DRAKON IR rules you MUST follow:
- Every diagram MUST have a "b0" node: {"type":"branch","branchId":0,"one":"<first_node>"}
- Every diagram MUST have an "end" node: {"type":"end"}
- "action" nodes: {"type":"action","content":"<text>","one":"<next>"}
- "question" nodes: {"type":"question","content":"<condition>?","one":"<yes>","two":"<no>"}
- "one" = YES/true branch for questions; "two" = NO/false branch
- "params" must be a STRING (e.g. "name: str, x: int"), never an array
- All node content should be human-readable, not raw Python AST
- Remove redundant empty nodes
- question content MUST end with "?"

Return ONLY a valid JSON object matching the DRAKON IR schema. No markdown, no explanation.
"""

REFINE_USER_TEMPLATE = """Knowledge base context:
{kb_context}

Raw DRAKON IR to refine:
{raw_ir}

Return the refined DRAKON IR JSON only.
"""


def build_refine_prompt(raw_ir: dict, kb_context: str) -> str:
    import json
    return REFINE_USER_TEMPLATE.format(
        kb_context=kb_context or "(no context)",
        raw_ir=json.dumps(raw_ir, ensure_ascii=False, indent=2),
    )
