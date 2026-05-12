import json
import os
import re
import sys
from typing import Optional

import httpx

PROXY_URL = os.getenv("PROXY_URL", "http://localhost:18880/v1")
PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc")
PROXY_MODEL = os.getenv("PROXY_MODEL", "coding-proxy")

_DRAKON_AGENT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "drakon-agent"))
if _DRAKON_AGENT not in sys.path:
    sys.path.append(_DRAKON_AGENT)

from prompts import ARCHITECT_SYSTEM_PROMPT

_JSON_BLOCK_RE = re.compile(r"```json\s*(\[.*?\])\s*```", re.DOTALL)

_KB_SNIPPET: str = ""


def _load_kb_snippet() -> str:
    """Load first section of DRAKON rules KB for context."""
    global _KB_SNIPPET
    if _KB_SNIPPET:
        return _KB_SNIPPET
    try:
        kb_path = os.path.join(_DRAKON_AGENT, "knowledge", "00-drakon-rules.md")
        if os.path.exists(kb_path):
            text = open(kb_path, encoding="utf-8").read()
            # Take the first 2000 chars (naming + node types section)
            _KB_SNIPPET = text[:2000]
    except Exception:
        pass
    return _KB_SNIPPET


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

    drakon_rules = kb_context or _load_kb_snippet()
    if drakon_rules:
        parts.append(f"## DRAKON Rules (reference)\n{drakon_rules[:1500]}")

    if file_tree:
        parts.append(f"## Project File Tree\n{json.dumps(file_tree, indent=2)[:3000]}")
    if current_diagram:
        parts.append(f"## Current Diagram\n{json.dumps(current_diagram, indent=2)[:2000]}")
    parts.append(f"## User Message\n{message}")

    messages = [
        {"role": "system", "content": ARCHITECT_SYSTEM_PROMPT},
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
