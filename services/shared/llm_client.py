"""Unified LLM HTTP client for all agents.
Supports: AGY proxy (Anthropic-compatible), OpenAI-compatible endpoints.
"""
import json
import os
import urllib.request
import urllib.error
from typing import Any


DEFAULT_BASE_URL = os.getenv("LLM_BASE_URL", "https://agy.exodus.pp.ua")
DEFAULT_MODEL = os.getenv("LLM_MODEL", "gemini-2.5-flash")
DEFAULT_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "60"))


def chat(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    base_url: str = DEFAULT_BASE_URL,
    api_key: str = "",
    max_tokens: int = 4096,
    system: str = "",
) -> str:
    """Send chat request. Returns text response. Raises on error."""
    headers = {"Content-Type": "application/json", "User-Agent": "curl/7.68.0"}
    if api_key:
        headers["x-api-key"] = api_key
        headers["anthropic-version"] = "2023-06-01"

    payload: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if system:
        payload["system"] = system

    url = base_url.rstrip("/") + "/v1/messages"
    data = json.dumps(payload).encode()

    for attempt in range(3):
        try:
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
                result = json.loads(resp.read())
            for block in result.get("content", []):
                if block.get("type") == "text":
                    return block["text"]
            return ""
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 2:
                import time; time.sleep(2 ** attempt)
                continue
            raise
    return ""
