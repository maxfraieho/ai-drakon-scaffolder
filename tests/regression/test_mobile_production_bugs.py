from pathlib import Path


ROOT = Path(__file__).parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_projects_list_rejects_non_json_error_responses():
    source = read("src/lib/api.ts")
    listing = source[source.index("listProjects:"):source.index("listDrakonIr:")]
    assert "parseResponse" in listing


def test_default_drakon_proxy_counts_as_configured():
    source = read("src/components/agents/AgentChatPanel.tsx")
    assert "drakon-assistant-proxy" in source[:source.index("const AGENTS")]


def test_pipeline_error_does_not_render_empty_state():
    source = read("src/pages/PipelineEditorPage.tsx")
    assert "listError" in source
    assert source.index(") : listError ?") < source.index(") : pipelinesList.length === 0 ?")


def test_mobile_docs_link_uses_project_docs_route():
    source = read("src/components/mobile/MobileNavigationDock.tsx")
    assert 'to: "/p/$slug/docs"' in source
    assert 'to: "/docs"' not in source
