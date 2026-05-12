import json
import os
import re
from typing import Optional

import httpx

PROXY_URL = os.getenv("PROXY_URL", "http://localhost:18880/v1")
PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc")
PROXY_MODEL = os.getenv("PROXY_MODEL", "coding-proxy")

SYSTEM_PROMPT = """You are the Architect agent for an AI-DRAKON platform.
Your role: analyze project structure, create DRAKON architecture diagrams,
suggest structural improvements, answer architecture questions.

You have access to:
- The project file tree (GitHub repo contents)
- Existing DRAKON diagrams in the "architecture/" folder
- Your memory (memory/architect/*.md) with previous decisions
- DRAKON IR format rules from the knowledge base

When suggesting diagram changes, output MutationOp[] in a ```json``` block.
When answering questions, be concise and reference specific files.

DRAKON IR quick reference:
- b0: {type:"branch",branchId:0,one:"<first_node>"} MANDATORY
- end: {type:"end"} MANDATORY
- action: {type:"action",content:"<text>",one:"<next>"}
- question: {type:"question",content:"<cond>?",one:"<yes>",two:"<no>"}
"""

_JSON_BLOCK_RE = re.compile(r"```json\s*(\[.*?\])\s*```", re.DOTALL)


def architect_chat(
    message: str,
    file_tree: Optional[dict] = None,
    current_diagram: Optional[dict] = None,
    memory_context: str = "",
    kb_context: str = "",
) -> dict:
    parts = []
    if memory_context:
        parts.append(f"## My Memory\n{memory_context}")
    if kb_context:
        parts.append(f"## DRAKON Rules\n{kb_context}")
    if file_tree:
        parts.append(f"## Project File Tree\n{json.dumps(file_tree, indent=2)[:3000]}")
    if current_diagram:
        parts.append(f"## Current Diagram\n{json.dumps(current_diagram, indent=2)[:2000]}")
    parts.append(f"## User Message\n{message}")

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "\n\n".join(parts)},
    ]

    resp = httpx.post(
        f"{PROXY_URL}/chat/completions",
        json={"model": PROXY_MODEL, "messages": messages, "temperature": 0.2},
        headers={"Authorization": f"Bearer {PROXY_TOKEN}"},
        timeout=90.0,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]

    mutations = None
    m = _JSON_BLOCK_RE.search(content)
    if m:
        try:
            mutations = json.loads(m.group(1))
        except (json.JSONDecodeError, ValueError):
            pass

    return {"reply": content, "suggested_mutations": mutations}
