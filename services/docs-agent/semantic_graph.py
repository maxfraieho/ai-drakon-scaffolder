"""
Semantic Knowledge Graph extraction and upsert core functions.
"""

from pathlib import Path
import re
import json
from typing import Optional, Tuple, List, Dict

# Reuse from notes_route.py
from notes_route import _flat_notes, _strip_frontmatter, _parse_wikilinks, _resolve_root


def collect_articles(docs_root: Path, project: Optional[str]) -> List[Dict]:
    """
    Collects articles from the docs root.
    Returns list of dicts: [{'id': int, 'slug': str, 'title': str, 'folder': str, 'summary': str}]
    summary = first ~600 characters of the body content without frontmatter.
    """
    notes = _flat_notes(docs_root, project)
    articles = []
    for i, note in enumerate(notes):
        docs_scoped_root = _resolve_root(project)
        abs_path = docs_scoped_root / note["path"]
        
        summary = ""
        if abs_path.exists():
            try:
                raw_content = abs_path.read_text(encoding="utf-8")
                body = _strip_frontmatter(raw_content)
                summary = body[:600]
            except Exception:
                pass
                
        articles.append({
            "id": i + 1,
            "slug": note["slug"],
            "title": note["title"],
            "folder": note["folder"],
            "summary": summary,
        })
    return articles


def build_extraction_prompt(articles: List[Dict]) -> Tuple[str, str]:
    """
    Builds the system and user prompts for LLM semantic graph extraction.
    Returns (system_prompt, user_prompt).
    """
    system_prompt = (
        "You are the Documentarian agent building a SEMANTIC knowledge graph over a set of\n"
        "knowledge-zone articles. Use ONLY the provided article titles and summaries — never invent\n"
        "articles, slugs, or facts from outside the input.\n\n"
        "Goal: for each article, find AT MOST 2 of the MOST semantically related OTHER articles that\n"
        "live in a DIFFERENT section (different `folder`). Skip structural/sequential neighbours.\n\n"
        "Output strictly:\n"
        "```json\n"
        '{"relationships":[{"source_id":<int>,"link":"<snake_case_predicate>","target_id":<int>}]}\n'
        "```\n"
        "Rules:\n"
        "- source_id != target_id; both must exist in the provided id list.\n"
        "- `link` is a concise snake_case predicate (e.g. prerequisite_of, extends, implements,\n"
        "  relates_to, contrast_to, example_of).\n"
        "- Prefer cross-section links (different folder). Do not output more than 2 per source_id.\n"
        "- If unsure, output fewer links. Quality over quantity."
    )
    
    lines = []
    for art in articles:
        # Normalize newlines in summary to spaces
        clean_summary = art["summary"].replace("\n", " ").strip()
        lines.append(f"{art['id']} | {art['folder']} | {art['title']} | {clean_summary}")
        
    user_prompt = "Articles list:\n" + "\n".join(lines)
    return system_prompt, user_prompt


def parse_relationships(llm_text: str, articles: List[Dict]) -> List[Dict]:
    """
    Parses LLM JSON response. Validates IDs, filters self-links, duplicates,
    and same-folder (intra-section) relationships.
    """
    # Extract JSON block
    match = re.search(r'```json\s*(.*?)\s*```', llm_text, re.DOTALL)
    if match:
        json_str = match.group(1).strip()
    else:
        # Fallback search for curly braces
        start_idx = llm_text.find('{')
        end_idx = llm_text.rfind('}')
        if start_idx != -1 and end_idx != -1:
            json_str = llm_text[start_idx:end_idx + 1].strip()
        else:
            json_str = llm_text.strip()
            
    try:
        data = json.loads(json_str)
    except Exception:
        return []
        
    relationships = data.get("relationships", [])
    if not isinstance(relationships, list):
        return []
        
    art_map = {art["id"]: art for art in articles}
    valid_rels = []
    seen = set()
    
    for rel in relationships:
        if not isinstance(rel, dict):
            continue
            
        source_id = rel.get("source_id")
        target_id = rel.get("target_id")
        link = rel.get("link", "relates_to")
        
        # Validate ID existence and type
        if not isinstance(source_id, int) or not isinstance(target_id, int):
            continue
            
        if source_id == target_id:
            continue
            
        if source_id not in art_map or target_id not in art_map:
            continue
            
        source_art = art_map[source_id]
        target_art = art_map[target_id]
        
        # Reject relationships if in the same folder
        if source_art["folder"] == target_art["folder"]:
            continue
            
        # Deduplicate
        key = (source_id, target_id)
        if key in seen:
            continue
        seen.add(key)
        
        # Clean predicate to lower snake_case
        link_str = str(link).strip().lower().replace(" ", "_")
        
        valid_rels.append({
            "source_id": source_id,
            "target_id": target_id,
            "link": link_str,
        })
        
    return valid_rels


def enforce_link_budget(rels: List[Dict], articles: List[Dict], max_per_node: int = 2) -> List[Dict]:
    """
    Enforces maximum of max_per_node outgoing links per article.
    Keeps the first ones returned by the LLM.
    """
    counts = {}
    budgeted = []
    for rel in rels:
        source_id = rel["source_id"]
        count = counts.get(source_id, 0)
        if count < max_per_node:
            budgeted.append(rel)
            counts[source_id] = count + 1
    return budgeted


_PREDICATE_MAP = {
    "prerequisite_of": "є передумовою для",
    "extends": "розширює",
    "implements": "реалізує",
    "relates_to": "пов'язаний з",
    "contrast_to": "контрастує з",
    "example_of": "є прикладом для",
}


def _human_predicate(link: str) -> str:
    if link in _PREDICATE_MAP:
        return _PREDICATE_MAP[link]
    return link.replace("_", " ")


def render_semantic_block(slug: str, rels: List[Dict], articles: List[Dict]) -> str:
    """
    Generates markdown block:
    **Цей документ пов'язаний з:**
    - [[target_slug]] — human description
    """
    art_map = {art["slug"]: art for art in articles}
    id_map = {art["id"]: art for art in articles}
    
    current_art = art_map.get(slug)
    if not current_art:
        return "**Цей документ пов'язаний з:**"
        
    current_id = current_art["id"]
    related_items = []
    
    for rel in rels:
        if rel["source_id"] == current_id:
            target_art = id_map.get(rel["target_id"])
            if target_art:
                clean_target = target_art["slug"].removeprefix("docs/").removesuffix(".md")
                pred = _human_predicate(rel["link"])
                related_items.append(f"- [[{clean_target}]] — {pred}")
                
    block = "**Цей документ пов'язаний з:**"
    if related_items:
        block += "\n" + "\n".join(related_items)
    return block


def upsert_semantic_section(content: str, semantic_block: str) -> Tuple[str, bool]:
    """
    Replaces only the '**Цей документ пов'язаний з:**' subblock in '## Семантичні зв'язки' section,
    preserving the 'є частиною' line.
    If '## Семантичні зв'язки' section doesn't exist, appends the whole section to the end.
    Returns (new_content, changed).
    """
    content_norm = content.replace("\r\n", "\n")
    
    if "## Семантичні зв'язки" in content_norm:
        parts = content_norm.split("## Семантичні зв'язки")
        before_section = parts[0]
        section_content = parts[1]
        
        # Matches **Цей документ пов'язаний з:** and everything after it until next header or end of file
        pattern = r"\*\*Цей документ пов'язаний з:\*\*.*?(?=\n##|\Z)"
        
        if re.search(pattern, section_content, re.DOTALL):
            new_section_content = re.sub(pattern, semantic_block, section_content, flags=re.DOTALL)
        else:
            new_section_content = section_content.rstrip() + "\n\n" + semantic_block
            
        new_content = before_section + "## Семантичні зв'язки" + new_section_content
    else:
        new_section = "## Семантичні зв'язки\n" + semantic_block
        new_content = content_norm.rstrip() + "\n\n" + new_section
        
    changed = (new_content.strip() != content_norm.strip())
    return new_content, changed
