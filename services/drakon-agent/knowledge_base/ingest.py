"""Knowledge base ingestion: loads markdown docs into BM25 index."""
import re
from pathlib import Path

from rank_bm25 import BM25Okapi


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9_]+", text.lower())


def _split_sections(text: str) -> list[dict]:
    """Split markdown into sections by ## headings."""
    sections = []
    current_heading = "intro"
    current_lines: list[str] = []

    for line in text.splitlines():
        if line.startswith("## "):
            if current_lines:
                sections.append({
                    "heading": current_heading,
                    "text": "\n".join(current_lines).strip(),
                })
            current_heading = line[3:].strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        sections.append({
            "heading": current_heading,
            "text": "\n".join(current_lines).strip(),
        })

    return [s for s in sections if s["text"]]


def build_index(knowledge_dir: str | Path) -> tuple[BM25Okapi, list[dict]]:
    """Load all .md files from knowledge_dir and return (bm25_index, docs)."""
    knowledge_dir = Path(knowledge_dir)
    docs: list[dict] = []

    for md_file in sorted(knowledge_dir.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        for section in _split_sections(text):
            docs.append({
                "source": md_file.name,
                "heading": section["heading"],
                "text": section["text"],
                "tokens": _tokenize(section["heading"] + " " + section["text"]),
            })

    if not docs:
        raise ValueError(f"No .md files found in {knowledge_dir}")

    corpus = [d["tokens"] for d in docs]
    index = BM25Okapi(corpus)
    return index, docs
