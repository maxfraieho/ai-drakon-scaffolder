"""Unified LLM HTTP client for all agents.
Supports: AGY proxy (Anthropic-compatible), OpenAI-compatible endpoints.
"""
import json
import os
import urllib.request
import urllib.error
from typing import Any


# PROXY_* is the project-wide convention (see services/docs-agent/.env,
# /etc/init.d/ai-drakon-agent, ai-architect-agent, ai-docs-agent, uav-consultant).
# LLM_* kept as a secondary fallback for callers that don't follow that convention.
DEFAULT_BASE_URL = os.getenv("PROXY_URL", os.getenv("LLM_BASE_URL", "https://agy.exodus.pp.ua"))
DEFAULT_MODEL = os.getenv("PROXY_MODEL", os.getenv("LLM_MODEL", "gemini-2.5-flash"))
DEFAULT_API_KEY = os.getenv("PROXY_TOKEN", os.getenv("LLM_API_KEY", ""))
# "anthropic" -> POST {base}/v1/messages, x-api-key header, {content:[{type,text}]} response
# "openai"    -> POST {base}/chat/completions, Authorization: Bearer, {choices:[{message:{content}}]} response
DEFAULT_PROTOCOL = os.getenv("PROXY_PROTOCOL", "anthropic")
DEFAULT_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "60"))


def chat(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    base_url: str = DEFAULT_BASE_URL,
    api_key: str = DEFAULT_API_KEY,
    max_tokens: int = 4096,
    system: str = "",
    temperature: float | None = None,
    protocol: str = DEFAULT_PROTOCOL,
) -> str:
    """Send chat request. Returns text response. Raises on error."""
    is_openai = protocol == "openai"

    headers = {"Content-Type": "application/json", "User-Agent": "curl/7.68.0"}
    if api_key:
        if is_openai:
            headers["Authorization"] = f"Bearer {api_key}"
        else:
            headers["x-api-key"] = api_key
            headers["anthropic-version"] = "2023-06-01"

    if is_openai:
        chat_messages = ([{"role": "system", "content": system}] if system else []) + messages
        payload: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": chat_messages,
        }
    else:
        payload = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
        }
        if system:
            payload["system"] = system
    if temperature is not None:
        payload["temperature"] = temperature

    path = "/chat/completions" if is_openai else "/v1/messages"
    url = base_url.rstrip("/") + path
    data = json.dumps(payload).encode()

    for attempt in range(3):
        try:
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
                result = json.loads(resp.read())
            if is_openai:
                choices = result.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "") or ""
                return ""
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
