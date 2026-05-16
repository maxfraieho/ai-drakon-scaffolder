from __future__ import annotations
import json
from pathlib import Path
from .pipeline_schema import PipelineConfig, AgentId

CONFIGS_DIR = Path(__file__).parent / "configs"
_cache: dict[str, PipelineConfig] = {}


def load_pipeline(pipeline_id: str) -> PipelineConfig:
    if pipeline_id not in _cache:
        path = CONFIGS_DIR / f"{pipeline_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"No config for pipeline: {pipeline_id}")
        _cache[pipeline_id] = PipelineConfig(**json.loads(path.read_text()))
    return _cache[pipeline_id]


def save_pipeline(pipeline_id: str, config: PipelineConfig) -> None:
    path = CONFIGS_DIR / f"{pipeline_id}.json"
    path.write_text(json.dumps(config.model_dump(), indent=2, ensure_ascii=False))
    _cache.pop(pipeline_id, None)


def list_pipelines(agent_id: AgentId | None = None) -> list[PipelineConfig]:
    result = []
    for path in sorted(CONFIGS_DIR.glob("*.json")):
        cfg = load_pipeline(path.stem)
        if agent_id is None or cfg.agent_id == agent_id:
            result.append(cfg)
    return result


def reload_pipeline(pipeline_id: str) -> PipelineConfig:
    _cache.pop(pipeline_id, None)
    return load_pipeline(pipeline_id)


def validate_topology(config: PipelineConfig) -> list[str]:
    errors: list[str] = []
    node_ids = {n.id for n in config.nodes} | {"__start__", "__end__"}

    for edge in config.edges:
        if edge.from_node not in node_ids:
            errors.append(f"Невідомий from_node: {edge.from_node}")
        if edge.to_node not in node_ids:
            errors.append(f"Невідомий to_node: {edge.to_node}")

    reachable: set[str] = {"__start__"}
    changed = True
    while changed:
        changed = False
        for edge in config.edges:
            if edge.from_node in reachable and edge.to_node not in reachable:
                reachable.add(edge.to_node)
                changed = True

    orphans = {n.id for n in config.nodes} - reachable - {"__start__", "__end__"}
    if orphans:
        errors.append(f"Недосяжні вузли: {sorted(orphans)}")
    if "__end__" not in reachable:
        errors.append("END недосяжний від жодного вузла")

    return errors
