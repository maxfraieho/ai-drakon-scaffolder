"""ai-memory MCP wrapper for agents.
Uses JSON-RPC over HTTP at http://192.168.3.184:49374/mcp
"""
import json
import os
import urllib.request
import urllib.error

AI_MEMORY_URL = os.getenv("AI_MEMORY_URL", "http://192.168.3.184:49374/mcp")
_rpc_id = 0


def _rpc(method: str, params: dict) -> dict:
    global _rpc_id
    _rpc_id += 1
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": _rpc_id,
        "method": method,
        "params": params,
    }).encode()
    req = urllib.request.Request(
        AI_MEMORY_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except (urllib.error.URLError, OSError):
        return {}


def query_memory(query: str, top_k: int = 5) -> list[str]:
    """Query ai-memory wiki via MCP memory_query tool."""
    result = _rpc("tools/call", {
        "name": "memory_query",
        "arguments": {"query": query, "limit": top_k},
    })
    items = result.get("result", {}).get("content", [])
    return [i.get("text", "") for i in items if i.get("type") == "text"]


def save_context(agent: str, content: str) -> bool:
    """Save agent context to ai-memory wiki."""
    result = _rpc("tools/call", {
        "name": "memory_add",
        "arguments": {"agent": agent, "content": content},
    })
    return bool(result.get("result"))
