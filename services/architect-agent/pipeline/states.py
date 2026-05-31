from typing import TypedDict


class AnalysisState(TypedDict):
    source_code: str
    file_path: str
    cyclomatic_complexity: int
    call_graph: dict
    tree_level: str          # "primitive" | "silhouette" | "branch" | "deep"
    drakon_type: str         # "Primitive" | "Silhouette"
    behavioral_yaml: str
    drakon_ir: list          # list of IR dicts from PythonAnalyzer or LLM
    validation_errors: list[str]
    iteration_count: int


class VibeCodingState(TypedDict):
    drakon_ir: dict          # single DRAKON IR diagram
    description: str
    language: str            # "python" | "typescript" | "javascript"
    generated_code: str
    syntax_errors: list[str]
    iteration_count: int


class DrakonAgentState(TypedDict):
    message: str
    source_code: str
    kb_context: str
    llm_prompt: str
    llm_reply: str
    drakon_ir: list
    parse_ok: bool


class DocsAgentState(TypedDict):
    message: str
    kb_context: str
    llm_prompt: str
    llm_reply: str
