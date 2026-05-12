"""AI refinement of raw DRAKON IR via OpenAI-compatible proxy."""
import json
import os

import httpx

from .prompts import SYSTEM_PROMPT, build_refine_prompt

PROXY_URL = os.getenv("PROXY_URL", "http://localhost:18880/v1")
PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc")
PROXY_MODEL = os.getenv("PROXY_MODEL", "coding-proxy")
TIMEOUT = 60.0


def refine_ir(raw_ir: dict, kb_context: str = "") -> dict:
    """Call LLM proxy to refine raw DRAKON IR. Returns refined IR dict."""
    user_msg = build_refine_prompt(raw_ir, kb_context)

    payload = {
        "model": PROXY_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.0,
        "max_tokens": 4096,
    }

    with httpx.Client(timeout=TIMEOUT) as client:
        resp = client.post(
            f"{PROXY_URL}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {PROXY_TOKEN}"},
        )
        resp.raise_for_status()

    content = resp.json()["choices"][0]["message"]["content"].strip()

    # Strip markdown fences if present
    if content.startswith("```"):
        lines = content.splitlines()
        content = "\n".join(
            line for line in lines if not line.startswith("```")
        ).strip()

    return json.loads(content)


def refine_ir_safe(raw_ir: dict, kb_context: str = "") -> dict:
    """Like refine_ir but returns raw_ir on any error (graceful degradation)."""
    try:
        return refine_ir(raw_ir, kb_context)
    except Exception as e:
        raw_ir["_refine_error"] = str(e)
        return raw_ir
