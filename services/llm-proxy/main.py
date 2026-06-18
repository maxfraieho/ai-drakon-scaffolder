"""LLM Proxy Appwrite Function — OpenAI chat/completions, NIM->OpenRouter->Groq->Google failover."""

import json
import urllib.request
import urllib.error
import os

MODEL_MAP = {
    "opus": "moonshotai/kimi-k2-instruct",
    "sonnet": "nvidia/llama-3.3-nemotron-super-49b-v1",
    "haiku": "nvidia/llama-3.1-nemotron-nano-8b-v1",
    "default": "nvidia/llama-3.3-nemotron-super-49b-v1",
}

OR_MODEL_MAP = {
    "opus": "meta-llama/llama-3.3-70b-instruct:free",
    "sonnet": "qwen/qwen3-next-80b-a3b-instruct:free",
    "haiku": "meta-llama/llama-3.2-3b-instruct:free",
    "default": "meta-llama/llama-3.3-70b-instruct:free",
}

GROQ_MODEL = "llama-3.3-70b-versatile"

# Google Gemini via OpenAI-compatible endpoint. flash-lite has the highest free-tier quota.
GOOGLE_MODEL_MAP = {
    "opus": "gemini-2.5-flash",
    "sonnet": "gemini-2.5-flash-lite",
    "haiku": "gemini-2.5-flash-lite",
    "default": "gemini-2.5-flash-lite",
}

NIM_BASE    = "https://integrate.api.nvidia.com/v1/chat/completions"
OR_BASE     = "https://openrouter.ai/api/v1/chat/completions"
GROQ_BASE   = "https://api.groq.com/openai/v1/chat/completions"
GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"


def detect_role(model: str) -> str:
    m = (model or "").lower()
    if "opus" in m or "kimi" in m:
        return "opus"
    if "haiku" in m or "nano" in m:
        return "haiku"
    return "sonnet"


def _load_keys(primary_env: str, pool_env: str) -> list:
    """Return deduplicated key list: primary, _2, _3, then pool (comma-separated)."""
    keys = []
    for suffix in ("", "_2", "_3", "_4"):
        k = os.environ.get(primary_env + suffix, "").strip()
        if k and k not in keys:
            keys.append(k)
    for k in os.environ.get(pool_env, "").split(","):
        k = k.strip()
        if k and k not in keys:
            keys.append(k)
    return keys


def http_post(url, payload, headers, timeout=30):
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

    if getattr(req, "method", "POST") == "GET":
        return res.json({"status": "ok", "service": "llm-proxy"})

    auth = req.headers.get("authorization", "") or req.headers.get("Authorization", "")
    token = os.environ.get("AUTH_TOKEN", "freecc")
    if auth != "Bearer " + token:
        return res.json({"error": "Unauthorized"}, 401)

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

    base_payload = {
        "messages": body.get("messages", []),
        "max_tokens": body.get("max_tokens", 4096),
        "temperature": body.get("temperature", 0.7),
        "stream": False,
    }

    log("LLM-PROXY: model=" + requested_model + " role=" + role)

    providers = []

    nim_model = MODEL_MAP.get(role, MODEL_MAP["default"])
    for i, key in enumerate(_load_keys("NIM_API_KEY", "NIM_API_KEYS"), 1):
        providers.append(("NIM-" + str(i), NIM_BASE, key, nim_model, 12))

    or_model = OR_MODEL_MAP.get(role, OR_MODEL_MAP["default"])
    for i, key in enumerate(_load_keys("OPENROUTER_API_KEY", "OPENROUTER_API_KEYS"), 1):
        providers.append(("OR-" + str(i), OR_BASE, key, or_model, 40))

    for i, key in enumerate(_load_keys("GROQ_API_KEY", "GROQ_API_KEYS"), 1):
        providers.append(("GROQ-" + str(i), GROQ_BASE, key, GROQ_MODEL, 30))

    google_model = GOOGLE_MODEL_MAP.get(role, GOOGLE_MODEL_MAP["default"])
    for i, key in enumerate(_load_keys("GOOGLE_API_KEY", "GOOGLE_API_KEYS"), 1):
        providers.append(("GOOGLE-" + str(i), GOOGLE_BASE, key, google_model, 30))

    if not providers:
        return res.json({"error": "No LLM providers configured"}, 503)

    last_error = None
    for name, url, key, model, per_timeout in providers:
        payload = dict(base_payload)
        payload["model"] = model
        headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + key,
        }
        if "openrouter" in url:
            headers["HTTP-Referer"] = "https://antigravity.exodus.pp.ua"
            headers["X-Title"] = "AI-DRAKON"

        log("LLM-PROXY: trying " + name + " model=" + model + " timeout=" + str(per_timeout) + "s")
        try:
            status, resp_body = http_post(url, payload, headers, timeout=per_timeout)
        except Exception as e:
            last_error = name + " exception: " + str(e)[:200]
            error("LLM-PROXY: " + last_error)
            continue

        if status == 200 and resp_body.get("choices"):
            log("LLM-PROXY: success via " + name)
            return res.json(resp_body)

        last_error = name + " status=" + str(status) + ": " + str(resp_body)[:200]
        error("LLM-PROXY: " + last_error)

    error("LLM-PROXY: all providers failed. Last: " + str(last_error))
    return res.json({"error": "All LLM providers failed: " + str(last_error)}, 503)
