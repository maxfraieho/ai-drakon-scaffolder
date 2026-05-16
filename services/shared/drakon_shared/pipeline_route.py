from __future__ import annotations
from fastapi import APIRouter, HTTPException
from .pipeline_schema import PipelineConfig, AgentId
from .pipeline_manager import (
    load_pipeline, save_pipeline,
    list_pipelines, reload_pipeline, validate_topology,
)

router = APIRouter(prefix="/v1/agents/pipeline", tags=["pipeline-config"])


@router.get("")
def get_pipelines(agent_id: AgentId | None = None):
    return [p.model_dump() for p in list_pipelines(agent_id)]


@router.get("/{pipeline_id}")
def get_pipeline(pipeline_id: str):
    try:
        return load_pipeline(pipeline_id).model_dump()
    except FileNotFoundError:
        raise HTTPException(404, f"Pipeline not found: {pipeline_id}")


@router.patch("/{pipeline_id}")
def update_pipeline(pipeline_id: str, config: PipelineConfig):
    if config.id != pipeline_id:
        raise HTTPException(400, "pipeline_id mismatch")
    errors = validate_topology(config)
    if errors:
        raise HTTPException(422, {"topology_errors": errors})
    config.version += 1
    save_pipeline(pipeline_id, config)
    return {"ok": True, "version": reload_pipeline(pipeline_id).version}


@router.post("/{pipeline_id}/validate")
def validate_pipeline_route(pipeline_id: str):
    try:
        cfg = load_pipeline(pipeline_id)
    except FileNotFoundError:
        raise HTTPException(404)
    errors = validate_topology(cfg)
    return {"valid": len(errors) == 0, "errors": errors}
