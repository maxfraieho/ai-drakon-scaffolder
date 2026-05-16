from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel

NodeType = Literal["action", "decision", "terminator", "loop_start", "loop_end"]
AgentId  = Literal["architect", "drakon", "docs"]


class NodeConfig(BaseModel):
    id:               str
    label:            str
    type:             NodeType
    is_llm:           bool = False
    is_deterministic: bool = False
    prompt_key:       Optional[str] = None
    description:      str = ""


class EdgeConfig(BaseModel):
    from_node: str
    to_node:   str
    label:     Optional[str] = None
    condition: Optional[Literal["yes", "no"]] = None


class PipelineConfig(BaseModel):
    id:             str
    agent_id:       AgentId
    name:           str
    description:    str
    nodes:          list[NodeConfig]
    edges:          list[EdgeConfig]
    max_iterations: int = 3
    version:        int = 1
