import textwrap
from pathlib import Path
from knowledge_base.ingest import build_index
from knowledge_base import retrieval


def test_build_index_sections(tmp_path):
    (tmp_path / "test.md").write_text(textwrap.dedent("""
    ## БПЛА / Дрон

    Відійди від вікон, ляж на підлогу.

    ## Телефони

    101 — пожежа, 112 — єдина
    """))
    index, docs = build_index(tmp_path)
    assert len(docs) == 2
    assert docs[0]["heading"] == "БПЛА / Дрон"
    assert "бпла" in docs[0]["tokens"]


def test_retrieve_relevant(tmp_path):
    (tmp_path / "kb.md").write_text("## БПЛА\n\nВідійди від вікон.\n\n## Телефони\n\n101 пожежа")
    retrieval.init(tmp_path)
    results = retrieval.retrieve("бпла дрон", top_k=1)
    assert len(results) == 1
    assert results[0]["heading"] == "БПЛА"
    assert results[0]["score"] > 0


def test_retrieve_text_format(tmp_path):
    (tmp_path / "kb.md").write_text("## Паніка\n\nТехніка 5-4-3-2-1")
    retrieval.init(tmp_path)
    text = retrieval.retrieve_text("паніка", top_k=1)
    assert "### Паніка" in text
    assert "5-4-3-2-1" in text
