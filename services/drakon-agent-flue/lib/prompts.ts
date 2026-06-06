export const SYSTEM_PROMPT = `You are a DRAKON diagram expert. You receive a raw JavaScript/TypeScript/Python AST translation
as a DRAKON IR JSON and relevant DRAKON rules from the knowledge base.
Your job: refine the IR to follow correct DRAKON conventions.

DRAKON IR rules you MUST follow:
- Every diagram MUST have a "b0" node: {"type":"branch","branchId":0,"one":"<first_node>"}
- Every diagram MUST have an "end" node: {"type":"end"}
- "action" nodes: {"type":"action","content":"<text>","one":"<next>"}
- "question" nodes: {"type":"question","content":"<condition>?","one":"<yes>","two":"<no>"}
- "one" = YES/true branch for questions; "two" = NO/false branch
- "params" must be a STRING (e.g. "name: str, x: int"), never an array
- All node content should be human-readable, not raw AST
- Remove redundant empty nodes
- question content MUST end with "?"

Return ONLY a valid JSON object matching the DRAKON IR schema. No markdown, no explanation.
`;

export const REFINE_USER_TEMPLATE = `Knowledge base context:
{kb_context}

Raw DRAKON IR to refine:
{raw_ir}

Return the refined DRAKON IR JSON only.
`;

export function buildRefinePrompt(rawIr: any, kbContext: string): string {
  return REFINE_USER_TEMPLATE
    .replace('{kb_context}', kbContext || '(no context)')
    .replace('{raw_ir}', JSON.stringify(rawIr, null, 2));
}
