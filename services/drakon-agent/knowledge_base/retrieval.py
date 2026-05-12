"""BM25 retrieval: find relevant DRAKON IR rules for a diagram context."""
import re
from pathlib import Path

from rank_bm25 import BM25Okapi

from .ingest import build_index, _tokenize

_index: BM25Okapi | None = None
_docs: list[dict] = []
_knowledge_dir: Path | None = None


def init(knowledge_dir: str | Path):
    global _index, _docs, _knowledge_dir
    _knowledge_dir = Path(knowledge_dir)
    _index, _docs = build_index(_knowledge_dir)


def retrieve(query: str, top_k: int = 3) -> list[dict]:
    """Return top_k most relevant knowledge sections for query."""
    if _index is None or not _docs:
        return []
    tokens = _tokenize(query)
    scores = _index.get_scores(tokens)
    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    results = []
    for idx, score in ranked[:top_k]:
        if score > 0:
            doc = _docs[idx]
            results.append({
                "source": doc["source"],
                "heading": doc["heading"],
                "text": doc["text"],
                "score": round(float(score), 4),
            })
    return results


def retrieve_text(query: str, top_k: int = 3) -> str:
    """Return concatenated text of top_k relevant sections."""
    sections = retrieve(query, top_k)
    if not sections:
        return ""
    return "\n\n---\n\n".join(
        f"### {s['heading']}\n{s['text']}" for s in sections
    )
