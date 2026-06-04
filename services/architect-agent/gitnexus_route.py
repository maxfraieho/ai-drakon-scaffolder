"""GitNexus → DRAKON IR pipeline for architect-agent."""
import json
import urllib.request
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pipeline.job_store import create_job, update_job
from pipeline.graphs import analysis_graph
from pipeline.states import AnalysisState
import asyncio
from concurrent.futures import ThreadPoolExecutor

router = APIRouter(prefix="/gitnexus")
_executor = ThreadPoolExecutor(max_workers=2)

GITNEXUS_URL = "http://localhost:4747/api/mcp"


def _mcp_call(method: str, params: dict, session_id: str = None) -> tuple:
    """Call GitNexus MCP endpoint, parse SSE response."""
    payload = json.dumps({
        "jsonrpc": "2.0", "id": 1,
        "method": method, "params": params
    }).encode()
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if session_id:
        headers["mcp-session-id"] = session_id
    req = urllib.request.Request(GITNEXUS_URL, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode()
            sid = r.headers.get("mcp-session-id")
        for line in raw.split("\n"):
            if line.startswith("data:"):
                return json.loads(line[5:]), sid
    except Exception as e:
        raise RuntimeError(f"GitNexus MCP error: {e}")
    return {}, None


def _init_session() -> str:
    """Initialize MCP session and return session ID."""
    _, sid = _mcp_call("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "architect-agent", "version": "1.0"}
    })
    return sid or ""


def _call_tool(tool: str, args: dict, sid: str) -> dict:
    result, _ = _mcp_call("tools/call", {"name": tool, "arguments": args}, sid)
    content = result.get("result", {}).get("content", [])
    if content and content[0].get("type") == "text":
        try:
            return json.loads(content[0]["text"])
        except Exception:
            return {"raw": content[0]["text"]}
    return {}


def _sanitize_name(s: str) -> str:
    s = "".join(c if c.isalnum() or c == '_' else '_' for c in s)
    if s and s[0].isdigit():
        s = "_" + s
    return s or "flow"


def _flows_to_python(repo: str, concept: str, flows_data: dict) -> str:
    """Convert GitNexus execution flows to synthetic Python for DRAKON analysis."""
    lines = [f'"""GitNexus flow: {concept} in {repo}"""', ""]
    processes = flows_data.get("processes", []) or flows_data.get("flows", [])
    if not processes:
        # Fallback: use raw text comment-prefixed line-by-line
        raw = str(flows_data.get("raw", flows_data))[:2000]
        for line in raw.split("\n"):
            lines.append(f"# {line}")
        lines.append("")
        func_name = _sanitize_name(concept)
        lines.append(f"def {func_name}_flow():")
        lines.append("    pass")
        return "\n".join(lines)

    for i, proc in enumerate(processes[:5]):  # max 5 processes
        raw_name = proc.get("name") or proc.get("id") or f"flow_{i}"
        name = _sanitize_name(raw_name)
        steps = proc.get("steps") or proc.get("calls") or proc.get("nodes") or []
        lines.append(f"def {name}():")
        if not steps:
            lines.append("    pass")
        for step in steps[:15]:  # max 15 steps per flow
            fn = step.get("name") or step.get("symbol") or step.get("id") or "step"
            fn = _sanitize_name(fn.split(":")[-1])
            lines.append(f"    {fn}()")
        lines.append("")
    return "\n".join(lines)


class GitNexusAnalyzeRequest(BaseModel):
    repo: str
    concept: str
    depth: Optional[int] = 2


@router.post("/analyze")
async def gitnexus_analyze(req: GitNexusAnalyzeRequest):
    """Query GitNexus for execution flows and convert to DRAKON IR."""
    job_id = create_job()
    update_job(job_id, "running")

    def run():
        try:
            # 1. Init MCP session
            sid = _init_session()

            # 2. Query GitNexus for flows related to concept
            flows = _call_tool("query", {
                "query": req.concept,
                "repo": req.repo,
            }, sid)

            # 3. Get context for top symbol if available
            context_data = {}
            procs = flows.get("processes") or flows.get("flows") or []
            if procs:
                top = procs[0]
                sym = top.get("name") or top.get("id") or ""
                if sym:
                    try:
                        context_data = _call_tool("context", {
                            "name": sym, "repo": req.repo
                        }, sid)
                    except Exception:
                        pass

            # 4. Convert to synthetic Python
            source_code = _flows_to_python(req.repo, req.concept, flows)

            # 5. Run through existing analysis_graph
            initial: AnalysisState = {
                "source_code": source_code,
                "file_path": f"{req.repo}/{req.concept.replace(' ', '_')}.py",
                "cyclomatic_complexity": 0,
                "call_graph": {},
                "tree_level": "",
                "drakon_type": "",
                "behavioral_yaml": "",
                "drakon_ir": [],
                "validation_errors": [],
                "iteration_count": 0,
            }
            final = analysis_graph.invoke(initial)

            update_job(job_id, "done", result={
                "drakon_ir": final["drakon_ir"],
                "tree_level": final["tree_level"],
                "cyclomatic_complexity": final["cyclomatic_complexity"],
                "validation_errors": final["validation_errors"],
                "gitnexus_flows": len(procs),
                "source_code": source_code,
                "repo": req.repo,
                "concept": req.concept,
                "context": context_data,
            })
        except Exception as e:
            update_job(job_id, "error", error=str(e))

    loop = asyncio.get_event_loop()
    loop.run_in_executor(_executor, run)
    return {"job_id": job_id}


@router.api_route("/repos", methods=["GET", "POST"])
async def list_repos():
    """List repos indexed in GitNexus."""
    try:
        sid = _init_session()
        data = _call_tool("list_repos", {}, sid)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.api_route("/impact", methods=["GET", "POST"])
async def gitnexus_impact(repo: str, symbol: str):
    """Get blast radius of a symbol change."""
    try:
        sid = _init_session()
        data = _call_tool("impact", {"target": symbol, "repo": repo}, sid)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
