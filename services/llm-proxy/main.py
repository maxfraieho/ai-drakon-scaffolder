"""LLM Proxy Appwrite Function — OpenAI chat/completions interface, NIM->OpenRouter failover.

Replaces the Node.js llm-gateway. Callers (semantic-graph, drakon-codegen) POST
OpenAI-format requests to /v1/chat/completions and read choices[0].message.content,
so this proxy speaks OpenAI format end to end (no Anthropic conversion needed).
"""

import json
import urllib.request
import urllib.error
import os


# Map a requested model hint -> concrete NIM model id.
MODEL_MAP = {
    "opus": "moonshotai/kimi-k2-instruct",
    "sonnet": "nvidia/llama-3.3-nemotron-super-49b-v1",
    "haiku": "nvidia/llama-3.1-nemotron-nano-8b-v1",
    "default": "nvidia/llama-3.3-nemotron-super-49b-v1",
}

# Verified-available OpenRouter free slugs (2026-06); failover target.
OR_MODEL_MAP = {
    "opus": "meta-llama/llama-3.3-70b-instruct:free",
    "sonnet": "qwen/qwen3-next-80b-a3b-instruct:free",
    "haiku": "meta-llama/llama-3.2-3b-instruct:free",
    "default": "meta-llama/llama-3.3-70b-instruct:free",
}

NIM_BASE = "https://integrate.api.nvidia.com/v1/chat/completions"
OR_BASE = "https://openrouter.ai/api/v1/chat/completions"


def detect_role(model: str) -> str:
    m = (model or "").lower()
    if "opus" in m or "kimi" in m:
        return "opus"
    if "haiku" in m or "nano" in m:
        return "haiku"
    return "sonnet"


def http_post(url: str, payload: dict, headers: dict, timeout: int = 30):
    """Synchronous HTTP POST, returns (status_code, response_dict)."""
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = {}
        try:
            body = json.loads(e.read())
        except Exception:
            pass
        return e.code, body


def main(context):
    req = context.req
    res = context.res
    log = context.log
    error = context.error

    # Health check (callers probe GET /health)
    if getattr(req, "method", "POST") == "GET":
        return res.json({"status": "ok", "service": "llm-proxy"})

    # Auth check
    auth = req.headers.get("authorization", "") or req.headers.get("Authorization", "")
    expected = f"Bearer {os.environ.get('AUTH_TOKEN', 'freecc')}"
    if auth != expected:
        return res.json({"error": "Unauthorized"}, 401)

    # Parse body (OpenAI chat/completions shape)
    body = req.body
    if isinstance(body, (bytes, bytearray)):
        body = body.decode()
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except Exception:
            return res.json({"error": "Invalid JSON"}, 400)
    if not isinstance(body, dict):
        body = {}

    requested_model = body.get("model", "auto")
    role = detect_role(requested_model)
    nim_model = MODEL_MAP.get(role, MODEL_MAP["default"])

    messages = body.get("messages", [])
    base_payload = {
        "messages": messages,
        "max_tokens": body.get("max_tokens", 4096),
        "temperature": body.get("temperature", 0.7),
        "stream": False,
    }

    log(f"LLM-PROXY: requested={requested_model} role={role} nim={nim_model}")

    nim_key1 = os.environ.get("NIM_API_KEY", "")
    nim_key2 = os.environ.get("NIM_API_KEY_2", "")
    or_key = os.environ.get("OPENROUTER_API_KEY", "")

    providers = []
    if nim_key1:
        providers.append(("NIM-1", NIM_BASE, nim_key1, nim_model))
    if nim_key2:
        providers.append(("NIM-2", NIM_BASE, nim_key2, nim_model))
    if or_key:
        providers.append(("OR", OR_BASE, or_key, OR_MODEL_MAP.get(role, OR_MODEL_MAP["default"])))

    if not providers:
        return res.json({"error": "No LLM providers configured"}, 503)

    last_error = None
    for name, url, key, model in providers:
        payload = {**base_payload, "model": model}
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        }
        if "openrouter" in url:
            headers["HTTP-Referer"] = "https://antigravity.exodus.pp.ua"
            headers["X-Title"] = "AI-DRAKON"

        # NIM is known to hang; short timeout so failover stays inside the 60s budget.
        per_timeout = 12 if name.startswith("NIM") else 40

        log(f"LLM-PROXY: trying {name} model={model} (timeout={per_timeout}s)")
        try:
            status, resp_body = http_post(url, payload, headers, timeout=per_timeout)
        except Exception as e:
            last_error = f"{name} exception: {str(e)[:200]}"
            error(f"LLM-PROXY: {last_error}")
            continue

        if status == 200 and resp_body.get("choices"):
            log(f"LLM-PROXY: success via {name}")
            # Return OpenAI-format response untouched (callers read choices[0].message.content)
            return res.json(resp_body)

        last_error = f"{name} status={status}: {str(resp_body)[:200]}"
        error(f"LLM-PROXY: {last_error}")
        continue

    error(f"LLM-PROXY: all providers failed. Last: {last_error}")
    return res.json({"error": f"All LLM providers failed: {last_error}"}, 503)
