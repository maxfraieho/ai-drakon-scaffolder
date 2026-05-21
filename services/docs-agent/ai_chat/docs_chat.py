import json
import os
import re
import sys
from typing import Optional

import httpx

PROXY_URL = os.getenv("PROXY_URL", "http://localhost:18880/v1")
PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc")
PROXY_PROTOCOL = os.getenv("PROXY_PROTOCOL", "openai")
PROXY_MODEL = os.getenv("PROXY_MODEL", "coding-proxy")

from prompts import DOCS_SYSTEM_PROMPT

_JSON_BLOCK_RE = re.compile(r"```json\s*(\[.*?\])\s*```", re.DOTALL)


def docs_chat(
    message: str,
    current_doc: Optional[str] = None,
    file_tree: Optional[dict] = None,
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
    if current_doc:
        parts.append(f"## Current Document\n{current_doc[:2000]}")
    parts.append(f"## User Message\n{message}")

    messages = [
        {"role": "system", "content": DOCS_SYSTEM_PROMPT},
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

    doc_suggestions = None
    m = _JSON_BLOCK_RE.search(content)
    if m:
        try:
            doc_suggestions = json.loads(m.group(1))
        except (json.JSONDecodeError, ValueError):
            pass

    return {"reply": content, "doc_suggestions": doc_suggestions}
