import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

import httpx

PROXY_URL = os.getenv("PROXY_URL", "http://localhost:18880/v1")
PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc") or "freecc"
PROXY_MODEL = os.getenv("PROXY_MODEL", "fast-proxy")
PROXY_PROTOCOL = os.getenv("PROXY_PROTOCOL", "openai")

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
    project_slug: Optional[str] = None,
    project_path: Optional[str] = None,
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

    system_prompt = ARCHITECT_SYSTEM_PROMPT
    if project_slug:
        loc = f" at {project_path}" if project_path else ""
        system_prompt += f"\n\n**Active project: {project_slug}{loc}. Focus your responses on this project, not on the default AI-DRAKON IDE context.**"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "\n\n".join(parts)},
    ]

    if PROXY_PROTOCOL == "anthropic":
        # Anthropic /v1/messages format
        system_msg = next((m["content"] for m in messages if m["role"]=="system"), "")
        user_msgs = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"]!="system"]
        resp = httpx.post(
            f"{PROXY_URL}/messages",
            json={"model": PROXY_MODEL, "system": system_msg, "messages": user_msgs, "max_tokens": 4096},
            headers={"x-api-key": PROXY_TOKEN, "anthropic-version": "2023-06-01"},
            timeout=90.0,
        )
        resp.raise_for_status()
        content = resp.json()["content"][0]["text"]
    else:
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


def architect_chat_with_system(
    message: str,
    system_prompt: str,
    file_tree=None,
    current_diagram=None,
) -> dict:
    """Chat with a custom system prompt (for drakon/docs agents)."""
    parts = []
    if file_tree:
        parts.append(f"## Project File Tree\n{json.dumps(file_tree, indent=2)[:2000]}")
    if current_diagram:
        parts.append(f"## Current Diagram\n{json.dumps(current_diagram, indent=2)[:1500]}")
    parts.append(f"## User Message\n{message}")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "\n\n".join(parts)},
    ]

    if PROXY_PROTOCOL == "anthropic":
        system_msg = messages[0]["content"]
        user_msgs = [m for m in messages if m["role"] != "system"]
        resp = httpx.post(f"{PROXY_URL}/messages",
            json={"model": PROXY_MODEL, "system": system_msg, "messages": user_msgs, "max_tokens": 2048},
            headers={"x-api-key": PROXY_TOKEN, "anthropic-version": "2023-06-01"},
            timeout=90.0)
    else:
        resp = httpx.post(f"{PROXY_URL}/chat/completions",
            json={"model": PROXY_MODEL, "messages": messages, "temperature": 0.1},
            headers={"Authorization": f"Bearer {PROXY_TOKEN}"},
            timeout=90.0)
    resp.raise_for_status()
    content = resp.json()["content"][0]["text"] if PROXY_PROTOCOL == "anthropic" \
        else resp.json()["choices"][0]["message"]["content"]
    return {"reply": content, "suggested_mutations": None}


_TOOLS_SCHEMA = """
## File Tools — використовуй JSON-блоки для роботи з файлами:

<tool_call>{"tool":"files_list","args":{"path":"docs/manuals"}}</tool_call>
<tool_call>{"tool":"files_read","args":{"path":"docs/manuals/manual-pipeline-a.md"}}</tool_call>
<tool_call>{"tool":"files_write","args":{"path":"docs/manuals/example.md","content":"# Вміст"}}</tool_call>
<tool_call>{"tool":"files_patch","args":{"path":"docs/file.md","old_string":"застаріле","new_string":"актуальне"}}</tool_call>
<tool_call>{"tool":"files_delete","args":{"path":"docs/old-file.md"}}</tool_call>

Правила: один <tool_call> за раз. Після виконання отримаєш <tool_result>...</tool_result>.
Для завершення напиши DONE: [резюме що зроблено].
"""

_TOOL_CALL_RE = re.compile(r"<tool_call>(.*?)</tool_call>", re.DOTALL)

_BASE_URL = "http://localhost:8766"


def _execute_tool(tool: str, args: dict) -> str:
    try:
        if tool == "files_read":
            r = httpx.get(f"{_BASE_URL}/files/read", params={"path": args["path"]}, timeout=10)
        elif tool == "files_list":
            r = httpx.get(f"{_BASE_URL}/files/list", params={"path": args.get("path", ".")}, timeout=10)
        elif tool == "files_write":
            r = httpx.post(f"{_BASE_URL}/files/write", json=args, timeout=15)
        elif tool == "files_patch":
            r = httpx.post(f"{_BASE_URL}/files/patch", json=args, timeout=15)
        elif tool == "files_delete":
            r = httpx.post(f"{_BASE_URL}/files/delete", json=args, timeout=10)
        else:
            return f"Unknown tool: {tool}"
        r.raise_for_status()
        result = r.json()
        if tool == "files_read":
            return result.get("content", "")[:4000]
        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        return f"Tool error: {e}"


def agent_chat_with_tools(
    message: str,
    file_tree=None,
    current_diagram=None,
    memory_context: str = "",
    kb_context: str = "",
    project_slug=None,
    project_path=None,
    max_iterations: int = 8,
) -> dict:
    system_prompt = ARCHITECT_SYSTEM_PROMPT + "\n\n" + _TOOLS_SCHEMA
    if project_slug:
        loc = f" at {project_path}" if project_path else ""
        system_prompt += f"\n\n**Active project: {project_slug}{loc}.**"

    parts = []
    if memory_context:
        parts.append(f"## My Memory\n{memory_context}")
    drakon_rules = kb_context or _load_kb_snippet()
    if drakon_rules:
        parts.append(f"## DRAKON Rules\n{drakon_rules[:1000]}")
    if file_tree:
        parts.append(f"## File Tree\n{json.dumps(file_tree, indent=2)[:2000]}")
    if current_diagram:
        parts.append(f"## Current Diagram\n{json.dumps(current_diagram, indent=2)[:1500]}")
    parts.append(f"## User Request\n{message}")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "\n\n".join(parts)},
    ]

    all_tool_calls = []
    final_reply = ""

    for iteration in range(max_iterations):
        if PROXY_PROTOCOL == "anthropic":
            system_msg = messages[0]["content"]
            user_msgs = [m for m in messages if m["role"] != "system"]
            resp = httpx.post(
                f"{PROXY_URL}/messages",
                json={"model": PROXY_MODEL, "system": system_msg, "messages": user_msgs, "max_tokens": 4096},
                headers={"x-api-key": PROXY_TOKEN, "anthropic-version": "2023-06-01"},
                timeout=120.0,
            )
        else:
            resp = httpx.post(
                f"{PROXY_URL}/chat/completions",
                json={"model": PROXY_MODEL, "messages": messages, "temperature": 0.1},
                headers={"Authorization": f"Bearer {PROXY_TOKEN}"},
                timeout=120.0,
            )
        resp.raise_for_status()
        content = resp.json()["content"][0]["text"] if PROXY_PROTOCOL == "anthropic" \
            else resp.json()["choices"][0]["message"]["content"]

        messages.append({"role": "assistant", "content": content})

        tool_match = _TOOL_CALL_RE.search(content)
        if not tool_match:
            final_reply = content
            break

        try:
            call = json.loads(tool_match.group(1).strip())
            tool_name = call.get("tool", "")
            tool_args = call.get("args", {})
            result = _execute_tool(tool_name, tool_args)
            all_tool_calls.append({"tool": tool_name, "args": tool_args, "result": result[:300]})
        except Exception as e:
            result = f"Parse error: {e}"

        messages.append({"role": "user", "content": f"<tool_result>{result}</tool_result>"})

        if "DONE:" in content:
            final_reply = content
            break
    else:
        final_reply = content

    return {
        "reply": final_reply,
        "tool_calls": all_tool_calls,
        "iterations": iteration + 1,
        "suggested_mutations": None,
    }
