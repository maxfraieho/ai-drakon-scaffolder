"""Unified Knowledge Base client using SQLite FTS5 (built-in, zero deps).
Supports Ukrainian/Cyrillic via unicode61 tokenizer.
"""
import sqlite3
import re
from pathlib import Path


class KBClient:
    def __init__(self, db_path: str = ":memory:"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS kb
            USING fts5(source, heading, content,
                       tokenize="unicode61 tokenchars '/_-'")
        """)

    def index_documents(self, docs_dir: Path) -> int:
        """Index all .md files from docs_dir. Returns count of indexed sections."""
        with self.conn:
            self.conn.execute("DELETE FROM kb")
            count = 0
            for md in sorted(docs_dir.glob("*.md")):
                text = md.read_text(encoding="utf-8", errors="ignore")
                sections, heading, lines = [], "intro", []
                for line in text.splitlines():
                    if line.startswith("## "):
                        if lines:
                            sections.append((heading, "\n".join(lines).strip()))
                        heading, lines = line[3:].strip(), []
                    else:
                        lines.append(line)
                if lines:
                    sections.append((heading, "\n".join(lines).strip()))
                for h, c in sections:
                    if c.strip():
                        self.conn.execute(
                            "INSERT INTO kb(source, heading, content) VALUES(?,?,?)",
                            (md.name, h, c)
                        )
                        count += 1
        return count

    def search(self, query: str, top_k: int = 5) -> list[str]:
        """Search KB. Returns list of relevant text chunks."""
        clean = re.sub(r'[^\w\s]', ' ', query).strip()
        if not clean:
            return []
        try:
            rows = self.conn.execute(
                "SELECT source, heading, content FROM kb WHERE kb MATCH ? "
                "ORDER BY rank LIMIT ?",
                (clean, top_k)
            ).fetchall()
            return [f"[{r[0]} / {r[1]}]\n{r[2]}" for r in rows]
        except sqlite3.OperationalError:
            return []
