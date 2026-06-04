"""GitNexus → Documentation pipeline for docs-agent."""
import json
import urllib.request
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/gitnexus")

GITNEXUS_URL = "http://localhost:4747/api/mcp"


def _mcp_call(method: str, params: dict, sid: str = None) -> tuple:
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
    if sid:
        headers["mcp-session-id"] = sid
    req = urllib.request.Request(GITNEXUS_URL, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode()
        new_sid = r.headers.get("mcp-session-id")
    for line in raw.split("\n"):
        if line.startswith("data:"):
            return json.loads(line[5:]), new_sid
    return {}, new_sid


def _init_session():
    _, sid = _mcp_call("initialize", {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "docs-agent", "version": "1.0"}})
    return sid or ""


def _tool(name: str, args: dict, sid: str) -> dict:
    result, _ = _mcp_call("tools/call", {"name": name, "arguments": args}, sid)
    content = result.get("result", {}).get("content", [])
    if content and content[0].get("type") == "text":
        try:
            return json.loads(content[0]["text"])
        except Exception:
            return {"raw": content[0]["text"]}
    return {}


class GenDocRequest(BaseModel):
    repo: str
    concept: str
    format: str = "markdown"  # markdown | rst | docstring


class ApiDocRequest(BaseModel):
    repo: str
    route: Optional[str] = None  # None = all routes


@router.post("/generate-docs")
async def generate_docs(req: GenDocRequest):
    """Generate documentation from GitNexus execution flows."""
    try:
        sid = _init_session()
        # 1. Query flows
        flows = _tool("query", {"query": req.concept, "repo": req.repo}, sid)
        # 2. Route map for API context
        routes = {}
        try:
            routes = _tool("route_map", {"repo": req.repo}, sid)
        except Exception:
            pass
        # 3. Format as documentation
        procs = flows.get("processes") or flows.get("flows") or []
        doc_lines = [
            f"# {req.concept.title()} — {req.repo}",
            "",
            "## Overview",
            f"GitNexus identified {len(procs)} execution flows related to `{req.concept}`.",
            "",
            "## Execution Flows",
        ]
        for proc in procs[:5]:
            name = proc.get("name") or proc.get("id") or "flow"
            steps = proc.get("steps") or proc.get("calls") or []
            doc_lines.append(f"\n### `{name}`")
            for step in steps[:10]:
                fn = step.get("name") or step.get("symbol") or step.get("id") or "?"
                doc_lines.append(f"- `{fn}`")
        if routes:
            doc_lines += ["", "## API Routes", ""]
            route_list = routes.get("routes") or []
            for r in route_list[:10]:
                path = r.get("path") or r.get("route") or "?"
                handlers = r.get("handlers") or r.get("consumers") or []
                doc_lines.append(f"- `{path}` → {', '.join(str(h) for h in handlers[:3])}")
        return {
            "repo": req.repo,
            "concept": req.concept,
            "documentation": "\n".join(doc_lines),
            "flows_count": len(procs),
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/api-docs")
async def generate_api_docs(req: ApiDocRequest):
    """Generate API documentation from GitNexus route_map."""
    try:
        sid = _init_session()
        args = {"repo": req.repo}
        if req.route:
            args["route"] = req.route
        data = _tool("route_map", args, sid)
        return {"repo": req.repo, "api_map": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/what-changed")
async def what_changed(repo: str, symbol: str):
    """Document impact of changing a symbol — 'What Changed' doc."""
    try:
        sid = _init_session()
        impact = _tool("impact", {"target": symbol, "repo": repo}, sid)
        affected = impact.get("affected") or impact.get("symbols") or []
        doc = [
            f"# Impact Analysis: `{symbol}` in `{repo}`",
            "",
            f"**{len(affected)} symbols affected** if `{symbol}` changes:",
            "",
        ]
        for item in affected[:20]:
            name = item.get("name") or item.get("symbol") or str(item)
            depth = item.get("depth") or "?"
            doc.append(f"- `{name}` (depth {depth})")
        return {"symbol": symbol, "repo": repo, "documentation": "\n".join(doc), "affected_count": len(affected)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/repos")
async def list_repos():
    try:
        sid = _init_session()
        return _tool("list_repos", {}, sid)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
