"""LLM node factory for AI-DRAKON agent pipelines.
When DRAKON action content is not a tool name, it is treated as an LLM prompt.
"""
from typing import Any


def llm_node_factory(prompt_template: str):
    """Returns a LangGraph-compatible node function that calls LLM with prompt_template."""
    from services.shared.llm_client import chat

    def node(state: dict) -> dict:
        context = state.get("context", "")
        input_data = state.get("input") or state.get("query") or state.get("last_llm_result", "")
        messages = [{
            "role": "user",
            "content": (
                f"{prompt_template}\n\n"
                f"Input: {str(input_data)[:2000]}\n"
                f"Context: {str(context)[:1000]}"
            )
        }]
        result = chat(messages, max_tokens=2048)
        return {**state, "output": result, "last_llm_result": result}

    node.__name__ = f"llm_{abs(hash(prompt_template)):08x}"
    node.__doc__ = prompt_template[:80]
    return node
