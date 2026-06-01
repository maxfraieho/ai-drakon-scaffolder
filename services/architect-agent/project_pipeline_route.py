"""Per-project agent pipeline API for AI-DRAKON developer tool.
Manages pipeline storage and execution scoped to project+agent.
"""
import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.shared.graph_loader import load_graph_from_ir

PROJECTS_BASE = Path(os.getenv("DRAKON_PROJECTS_DIR", Path.home() / "projects"))

router = APIRouter(prefix="/projects", tags=["project-pipelines"])


class PipelinePayload(BaseModel):
    ir: dict
    description: str = ""


def _pipeline_path(slug: str, agent: str) -> Path:
    p = PROJECTS_BASE / slug / "agents" / agent
    p.mkdir(parents=True, exist_ok=True)
    return p / "pipeline.drakon.json"


def _kb_dir(slug: str, agent: str) -> Path:
    p = PROJECTS_BASE / slug / "agents" / agent / "kb"
    p.mkdir(parents=True, exist_ok=True)
    return p


_PROJECTS_ROOT = PROJECTS_BASE
_json = json

@router.get('')
def list_projects():
    projects = []
    if _PROJECTS_ROOT.exists():
        for d in sorted(_PROJECTS_ROOT.iterdir()):
            if d.is_dir() and not d.name.startswith('.'):
                config_file = d / 'config.json'
                config = {}
                if config_file.exists():
                    try: config = _json.loads(config_file.read_text())
                    except Exception: pass
                agents = [a.name for a in (d/'agents').iterdir() if a.is_dir()] if (d/'agents').exists() else []
                gh = config.get('github') or None
                projects.append({'slug': d.name, 'name': config.get('name', d.name),
                    'description': config.get('description', ''), 'repo_url': config.get('repo_url', ''),
                    'branch': config.get('branch', 'main'),
                    'has_repo': (d/'repo').exists(), 'agents': agents,
                    'github': gh})
    return {'projects': projects}

@router.post('/{slug}')
def create_project(slug: str, payload: dict = {}):
    project_dir = _PROJECTS_ROOT / slug
    project_dir.mkdir(parents=True, exist_ok=True)
    (project_dir / 'agents').mkdir(exist_ok=True)
    import datetime
    config = {'slug': slug, 'name': payload.get('name', slug),
        'description': payload.get('description', ''), 'repo_url': payload.get('repo_url', ''),
        'branch': payload.get('branch', 'main'),
        'created_at': datetime.datetime.utcnow().isoformat() + 'Z'}
    (project_dir / 'config.json').write_text(_json.dumps(config, indent=2, ensure_ascii=False))
    return {'success': True, 'project': config}


@router.get("/{slug}/agents")
def list_agents(slug: str):
    """List all agents for a project."""
    project_dir = PROJECTS_BASE / slug / "agents"
    if not project_dir.exists():
        return {"slug": slug, "agents": []}
    agents = []
    for d in sorted(project_dir.iterdir()):
        if d.is_dir() and not d.name.startswith('.'):
            pipeline_file = d / "pipeline.drakon.json"
            agents.append({
                "name": d.name,
                "has_pipeline": pipeline_file.exists(),
                "kb_docs": len(list((d / "kb").glob("*.md"))) if (d / "kb").exists() else 0,
            })
    return {"slug": slug, "agents": agents}


@router.get("/{slug}/agents/{agent}/pipeline")
def get_pipeline(slug: str, agent: str):
    """Get pipeline IR for a project agent."""
    path = _pipeline_path(slug, agent)
    if not path.exists():
        raise HTTPException(404, f"No pipeline for {slug}/{agent}")
    return json.loads(path.read_text())


@router.put("/{slug}/agents/{agent}/pipeline")
def save_pipeline(slug: str, agent: str, payload: PipelinePayload):
    """Save pipeline IR and hot-compile to verify it's valid."""
    path = _pipeline_path(slug, agent)
    # Validate by compiling
    try:
        load_graph_from_ir(payload.ir, {}, {}, {})
    except Exception as e:
        raise HTTPException(400, f"Pipeline compilation error: {e}")
    path.write_text(json.dumps(payload.ir, indent=2, ensure_ascii=False))
    return {"saved": str(path), "valid": True}


@router.get("/{slug}/agents/{agent}/status")
def pipeline_status(slug: str, agent: str):
    """Check if pipeline exists and is compilable."""
    path = _pipeline_path(slug, agent)
    if not path.exists():
        return {"status": "no_pipeline"}
    try:
        ir = json.loads(path.read_text())
        load_graph_from_ir(ir, {}, {}, {})
        return {"status": "ok", "nodes": len(ir.get("items", {}))}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def _execute_pipeline_impl(slug: str, agent: str, inp: str, q: str):
    path = _pipeline_path(slug, agent)
    if not path.exists():
        raise HTTPException(404, f"No pipeline for {slug}/{agent}")

    ir = json.loads(path.read_text())
    state = {
        "input": inp,
        "query": q,
        "project_slug": slug,
        "agent_name": agent,
        "context": "",
    }

    async def stream():
        import asyncio
        try:
            graph = load_graph_from_ir(ir, {}, {}, {})
            yield f"data: {{\"status\": \"started\", \"agent\": \"{agent}\"}}\n\n"
            for step in graph.stream(state):
                node_name = list(step.keys())[0] if step else "unknown"
                yield f"data: {{\"node\": \"{node_name}\", \"status\": \"done\"}}\n\n"
                await asyncio.sleep(0)
            yield f"data: {{\"status\": \"finished\"}}\n\n"
        except Exception as e:
            yield f"data: {{\"status\": \"error\", \"error\": \"{str(e)[:200]}\"}}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.post("/{slug}/agents/{agent}/execute")
async def execute_pipeline(slug: str, agent: str, input_data: dict = {}):
    """Execute pipeline with SSE streaming output via POST."""
    inp = input_data.get("input", "")
    q = input_data.get("query", "")
    return await _execute_pipeline_impl(slug, agent, inp, q)


@router.get("/{slug}/agents/{agent}/execute")
async def execute_pipeline_get(slug: str, agent: str, input: str = "", query: str = ""):
    """Execute pipeline with SSE streaming output via GET (EventSource)."""
    return await _execute_pipeline_impl(slug, agent, input, query)



@router.get("/{slug}/agents/{agent}/kb/search")
def search_project_kb(slug: str, agent: str, q: str = ""):
    """Search project KB directly."""
    from services.shared.built_in_tools import search_kb, _kb_cache
    # Invalidate cache to force re-index
    _kb_cache.pop((slug, agent), None)
    result = search_kb({"project_slug": slug, "agent_name": agent, "query": q, "input": q})
    return {"results": result.get("kb_results", []), "count": len(result.get("kb_results", []))}


@router.post("/{slug}/agents/{agent}/kb/upload")
async def upload_kb_doc(slug: str, agent: str, filename: str, content: str = ""):
    """Upload a markdown document to project KB."""
    from services.shared.built_in_tools import _kb_cache
    kb_dir = _kb_dir(slug, agent)
    doc_path = kb_dir / filename
    if not filename.endswith(".md"):
        raise HTTPException(400, "Only .md files supported")
    doc_path.write_text(content, encoding="utf-8")
    # Invalidate cache
    _kb_cache.pop((slug, agent), None)
    return {"saved": str(doc_path), "size": len(content)}

