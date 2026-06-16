import sys
import os
from pathlib import Path

# Add services/docs-agent to path to be able to import semantic_graph and notes_route
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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


