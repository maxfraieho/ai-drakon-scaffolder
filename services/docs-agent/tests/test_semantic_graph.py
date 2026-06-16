import sys
import os
from pathlib import Path

# Add services/docs-agent to path to be able to import semantic_graph and notes_route
agent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, agent_dir)
shared_dir = os.path.join(os.path.dirname(agent_dir), "shared")
sys.path.insert(0, shared_dir)


from semantic_graph import parse_relationships, enforce_link_budget, upsert_semantic_section

def test_parse_rejects_same_folder_and_self_links():
    articles = [
        {"id": 1, "slug": "concept/06-knowledge-base", "title": "KB", "folder": "concept", "summary": ""},
        {"id": 2, "slug": "concept/08-agent-docs", "title": "Docs", "folder": "concept", "summary": ""},
        {"id": 3, "slug": "architecture/06-kg", "title": "KG", "folder": "architecture", "summary": ""},
    ]
    
    llm_text = """
    ```json
    {
      "relationships": [
        {"source_id": 1, "link": "extends", "target_id": 2},
        {"source_id": 1, "link": "implements", "target_id": 1},
        {"source_id": 1, "link": "relates_to", "target_id": 3},
        {"source_id": 1, "link": "relates_to", "target_id": 99},
        {"source_id": 1, "link": "relates_to", "target_id": 3}
      ]
    }
    ```
    """
    
    rels = parse_relationships(llm_text, articles)
    
    assert len(rels) == 1
    assert rels[0]["source_id"] == 1
    assert rels[0]["target_id"] == 3
    assert rels[0]["link"] == "relates_to"

def test_enforce_budget_max_two_per_node():
    articles = [
        {"id": 1},
        {"id": 2},
        {"id": 3},
        {"id": 4},
    ]
    rels = [
        {"source_id": 1, "target_id": 2, "link": "extends"},
        {"source_id": 1, "target_id": 3, "link": "relates_to"},
        {"source_id": 1, "target_id": 4, "link": "contrast_to"},
    ]
    budgeted = enforce_link_budget(rels, articles, max_per_node=2)
    assert len(budgeted) == 2
    assert budgeted[0]["target_id"] == 2
    assert budgeted[1]["target_id"] == 3


def test_upsert_preserves_parent_moc_line():
    content = """# My Article

Some text here.

## Семантичні зв'язки
**Цей документ є частиною:** [[kb/_INDEX]]

**Цей документ пов'язаний з:**
- [[old-link]] — розширює
"""

    semantic_block = """**Цей документ пов'язаний з:**
- [[new-link]] — реалізує"""

    new_content, changed = upsert_semantic_section(content, semantic_block)
    
    assert changed is True
    assert "є частиною" in new_content
    assert "[[kb/_INDEX]]" in new_content
    assert "[[new-link]] — реалізує" in new_content
    assert "[[old-link]] — розширює" not in new_content


def test_build_semantic_graph_endpoint():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from notes_route import router
    from unittest.mock import patch, MagicMock

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    mock_articles = [
        {"id": 1, "slug": "concept/06-kb", "title": "KB", "folder": "concept", "summary": ""},
        {"id": 2, "slug": "architecture/06-kg", "title": "KG", "folder": "architecture", "summary": ""},
    ]

    llm_resp = """
    ```json
    {
      "relationships": [
        {"source_id": 1, "link": "extends", "target_id": 2}
      ]
    }
    ```
    """

    mock_file_content = """# KB
Some content here.
## Семантичні зв'язки
**Цей документ є частиною:** [[concept/_INDEX]]
"""

    mock_file_content_kb = """# KB
Some content here.
## Семантичні зв'язки
**Цей документ є частиною:** [[concept/_INDEX]]
"""

    mock_file_content_kg = """# KG
Some content here.
## Семантичні зв'язки
**Цей документ є частиною:** [[architecture/_INDEX]]

**Цей документ пов'язаний з:**
"""

    def mock_path_side_effect(slug, project=None):
        m = MagicMock()
        m.exists.return_value = True
        if slug == "concept/06-kb":
            m.read_text.return_value = mock_file_content_kb
        else:
            m.read_text.return_value = mock_file_content_kg
        return m

    with patch("semantic_graph.collect_articles", return_value=mock_articles), \
         patch("notes_route._resolve_root", return_value=Path("/tmp")), \
         patch("notes_route._path_from_slug", side_effect=mock_path_side_effect), \
         patch("llm_client.chat", return_value=llm_resp) as mock_chat:

        response = client.get("/notes/build-semantic-graph?project=mock-project&apply=false")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["proposed"]) == 1
        assert data["proposed"][0]["slug"] == "concept/06-kb"
        assert "[[architecture/06-kg]] — розширює" in data["proposed"][0]["after"]
        mock_chat.assert_called_once()



