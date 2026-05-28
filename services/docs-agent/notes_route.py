"""
Notes file-system API for docs-agent.

Provides CRUD operations on markdown notes stored in REPO_ROOT/docs/,
plus a graph endpoint that builds wikilink edges server-side.
All write operations commit + push to GitHub via local git.
"""
import os
import re
import subprocess
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/notes", tags=["notes"])

REPO_ROOT = Path(os.getenv(
    "REPO_ROOT",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
))
DOCS_ROOT = REPO_ROOT / "docs"

# Wikilink pattern: [[target]] or [[target|alias]]
_WIKILINK_RE = re.compile(r'\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]')
# Frontmatter pattern
_FRONTMATTER_RE = re.compile(r'^---\s*\n.*?\n---\s*\n', re.DOTALL)


def _ensure_docs_root():
    DOCS_ROOT.mkdir(parents=True, exist_ok=True)


def _slug_from_path(path: Path) -> str:
    """Convert docs-relative path to slug (no .md suffix)."""
    rel = path.relative_to(DOCS_ROOT)
    return str(rel).replace("\\", "/").removesuffix(".md")


def _path_from_slug(slug: str) -> Path:
    """Convert slug to absolute path."""
    clean = slug.lstrip("/").replace("..", "").replace("\\", "/")
    if not clean.endswith(".md"):
        clean += ".md"
    return DOCS_ROOT / clean


def _strip_frontmatter(content: str) -> str:
    return _FRONTMATTER_RE.sub("", content).strip()


def _parse_wikilinks(content: str) -> list[str]:
    """Extract all [[target]] slugs, skipping code blocks."""
    no_fence = re.sub(r'```.*?```', '', content, flags=re.DOTALL)
    no_inline = re.sub(r'`[^`]+`', '', no_fence)
    return [t.strip() for t in _WIKILINK_RE.findall(no_inline) if t.strip()]


def _build_folder_tree(root: Path) -> list[dict]:
    """Recursively build folder-aware note list."""
    items = []
    if not root.exists():
        return items
    for entry in sorted(root.iterdir()):
        if entry.name.startswith("."):
            continue
        if entry.is_dir():
            children = _build_folder_tree(entry)
            items.append({
                "type": "folder",
                "name": entry.name,
                "path": str(entry.relative_to(DOCS_ROOT)).replace("\\", "/"),
                "children": children,
            })
        elif entry.is_file() and entry.suffix == ".md":
            slug = _slug_from_path(entry)
            # Extract title from frontmatter if present
            raw = entry.read_text(encoding="utf-8")
            title = _extract_title(raw) or entry.stem
            items.append({
                "type": "note",
                "slug": slug,
                "title": title,
                "path": str(entry.relative_to(DOCS_ROOT)).replace("\\", "/"),
                "size": entry.stat().st_size,
            })
    return items


def _flat_notes(root: Path) -> list[dict]:
    """Flat list of all notes for API compatibility."""
    notes = []
    if not root.exists():
        return notes
    for entry in sorted(root.rglob("*.md")):
        if any(p.startswith(".") for p in entry.parts):
            continue
        slug = _slug_from_path(entry)
        raw = entry.read_text(encoding="utf-8")
        title = _extract_title(raw) or entry.stem
        folder = str(entry.parent.relative_to(DOCS_ROOT)).replace("\\", "/")
        if folder == ".":
            folder = ""
        notes.append({
            "slug": slug,
            "title": title,
            "path": str(entry.relative_to(DOCS_ROOT)).replace("\\", "/"),
            "folder": folder,
            "sha": None,
        })
    return notes


def _extract_title(content: str) -> Optional[str]:
    m = re.search(r'^---\s*\ntitle:\s*["\']?(.+?)["\']?\s*\n', content, re.MULTILINE)
    if m:
        return m.group(1).strip()
    m = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if m:
        return m.group(1).strip()
    return None


def _git_commit_push(slug: str, action: str) -> tuple[bool, str]:
    """Run git add/commit/push in REPO_ROOT. Returns (ok, error_msg)."""
    rel_path = f"docs/{slug}.md" if not slug.endswith(".md") else f"docs/{slug}"
    try:
        subprocess.run(
            ["git", "-C", str(REPO_ROOT), "pull", "--rebase", "--autostash", "-q"],
            check=True, capture_output=True, timeout=30
        )
        subprocess.run(
            ["git", "-C", str(REPO_ROOT), "add", rel_path],
            check=True, capture_output=True, timeout=10
        )
        result = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "commit", "-m", f"docs: {action} {slug}"],
            capture_output=True, timeout=10
        )
        if result.returncode not in (0, 1):  # 1 = nothing to commit
            return False, result.stderr.decode()
        subprocess.run(
            ["git", "-C", str(REPO_ROOT), "push", "-q"],
            check=True, capture_output=True, timeout=30
        )
        return True, ""
    except subprocess.CalledProcessError as e:
        return False, e.stderr.decode() if e.stderr else str(e)
    except subprocess.TimeoutExpired:
        return False, "git operation timed out"


def restructure_wiki_graph(docs_root: Path):
    import re
    from collections import defaultdict
    
    files = list(docs_root.rglob("*.md"))
    files = [f for f in files if f.is_file()]
    
    slug_to_file = {}
    for f in files:
        try:
            rel = f.relative_to(docs_root)
            slug = str(rel).replace(".md", "").replace("\\", "/")
            slug_to_file[slug] = f
        except Exception:
            continue
        
    dir_to_files = {}
    for f in files:
        try:
            rel = f.relative_to(docs_root)
            parts = rel.parts
            sub = parts[0] if len(parts) > 1 else "_root"
            if sub not in dir_to_files:
                dir_to_files[sub] = []
            dir_to_files[sub].append(f)
        except Exception:
            continue
        
    for sub in dir_to_files:
        def sort_key(fpath):
            name = fpath.name
            match = re.match(r"^(\d+)", name)
            if match:
                return (0, int(match.group(1)), name)
            return (1, 0, name)
        dir_to_files[sub].sort(key=sort_key)
        
    seq_map = {}
    for sub, folder_files in dir_to_files.items():
        for i in range(len(folder_files) - 1):
            try:
                curr_rel = folder_files[i].relative_to(docs_root)
                next_rel = folder_files[i+1].relative_to(docs_root)
                curr_slug = str(curr_rel).replace(".md", "").replace("\\", "/")
                next_slug = str(next_rel).replace(".md", "").replace("\\", "/")
                
                curr_name = folder_files[i].name
                next_name = folder_files[i+1].name
                if re.match(r"^\d+", curr_name) and re.match(r"^\d+", next_name):
                    seq_map[curr_slug] = next_slug
            except Exception:
                continue
                
    for fpath in files:
        try:
            rel = fpath.relative_to(docs_root)
            slug = str(rel).replace(".md", "").replace("\\", "/")
            filename = fpath.name
            
            if filename in ["INDEX.md", "_INDEX.md"]:
                continue
                
            parts = rel.parts
            if len(parts) == 1:
                parent = None if parts[0] in ["INDEX.md", "INDEX"] else "INDEX"
            else:
                sub_dir = parts[0]
                idx_path = docs_root / sub_dir / "_INDEX.md"
                if idx_path.exists():
                    parent = f"{sub_dir}/_INDEX"
                else:
                    readme_path = docs_root / sub_dir / "README.md"
                    if readme_path.exists():
                        parent = f"{sub_dir}/README"
                    else:
                        parent = "INDEX"
                        
            next_seq = seq_map.get(slug, None)
            
            content = fpath.read_text(encoding="utf-8")
            
            links_section = re.search(r"## Семантичні зв'язки.*", content, re.DOTALL)
            existing_related = []
            if links_section:
                section_text = links_section.group(0)
                found_links = re.findall(r"\[\[([^\]]+)\]\]", section_text)
                for fl in found_links:
                    fl_clean = fl.split("|")[0].strip()
                    if fl_clean.startswith("docs/"):
                        fl_clean = fl_clean[5:]
                    if fl_clean != parent and "INDEX" not in fl_clean and fl_clean != next_seq and fl_clean != slug:
                        existing_related.append(fl_clean)
                        
            seen = set()
            deduped_related = []
            for r in existing_related:
                if r not in seen and r in slug_to_file:
                    seen.add(r)
                    deduped_related.append(r)
                    
            max_related = 2 if not next_seq else 1
            selected_related = deduped_related[:max_related]
            
            new_section = "## Семантичні зв'язки\n"
            if parent:
                new_section += f"**Цей документ є частиною:** [[{parent}]]\n\n"
                
            new_section += "**Цей документ пов'язаний з:**\n"
            has_links = False
            
            if next_seq:
                next_name_clean = slug_to_file[next_seq].name.replace(".md", "").replace("_", " ").replace("-", " ")
                new_section += f"- [[{next_seq}]] — наступний розділ ({next_name_clean})\n"
                has_links = True
                
            for r in selected_related:
                r_name_clean = slug_to_file[r].name.replace(".md", "").replace("_", " ").replace("-", " ")
                new_section += f"- [[{r}]] — пов'язаний документ ({r_name_clean})\n"
                has_links = True
                
            if not has_links:
                new_section += f"- [[{parent}]] — переглянути всі документи розділу\n"
                
            if "## Семантичні зв'язки" in content:
                content = re.sub(r"## Семантичні зв'язки.*", new_section.strip(), content, flags=re.DOTALL)
            else:
                content = content.rstrip() + "\n\n" + new_section.strip()
                
            fpath.write_text(content, encoding="utf-8")
        except Exception:
            continue


# ── Request/Response models ──────────────────────────────────────────────────

class WriteNoteRequest(BaseModel):
    slug: str
    title: str
    content: str
    tags: list[str] = []


class DeleteNoteRequest(BaseModel):
    slug: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/list")
def list_notes(flat: bool = Query(default=True, description="Flat list (true) or tree (false)")):
    """List all notes. flat=true returns [{slug,title,path,folder}], flat=false returns folder tree."""
    _ensure_docs_root()
    if flat:
        return {"success": True, "notes": _flat_notes(DOCS_ROOT)}
    else:
        return {"success": True, "tree": _build_folder_tree(DOCS_ROOT)}


@router.get("/read")
def read_note(slug: str = Query(..., description="Note slug")):
    """Read raw markdown content of a note (without frontmatter)."""
    path = _path_from_slug(slug)
    if not str(path).startswith(str(DOCS_ROOT)):
        raise HTTPException(status_code=403, detail="Path outside docs root")
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Note not found: {slug}")
    raw = path.read_text(encoding="utf-8")
    return {
        "success": True,
        "slug": slug,
        "content": _strip_frontmatter(raw),
        "raw": raw,
    }


@router.post("/write")
def write_note(req: WriteNoteRequest):
    """Create or update a note. Commits + pushes to GitHub."""
    _ensure_docs_root()
    path = _path_from_slug(req.slug)
    if not str(path).startswith(str(DOCS_ROOT)):
        raise HTTPException(status_code=403, detail="Path outside docs root")

    path.parent.mkdir(parents=True, exist_ok=True)

    tag_list = ", ".join(f'"{t}"' for t in req.tags)
    from datetime import date
    date_str = date.today().isoformat()
    frontmatter = f'---\ntitle: "{req.title}"\ntags: [{tag_list}]\nupdated: "{date_str}"\n---\n\n'
    full_content = frontmatter + req.content

    path.write_text(full_content, encoding="utf-8")

    # Run auto-restructuring to enforce clean tree structure
    try:
        restructure_wiki_graph(DOCS_ROOT)
    except Exception as e:
        print(f"[warn] wiki auto-restructuring failed: {e}")

    ok, err = _git_commit_push(req.slug, "update" if path.exists() else "create")
    if not ok:
        # File is written but push failed — still return success with warning
        return {"success": True, "slug": req.slug, "warning": f"git push failed: {err}"}

    return {"success": True, "slug": req.slug, "path": f"docs/{req.slug}.md"}


@router.delete("/delete")
def delete_note(req: DeleteNoteRequest):
    """Delete a note and commit the deletion."""
    path = _path_from_slug(req.slug)
    if not str(path).startswith(str(DOCS_ROOT)):
        raise HTTPException(status_code=403, detail="Path outside docs root")
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Note not found: {req.slug}")

    path.unlink()
    ok, err = _git_commit_push(req.slug, "delete")
    return {"success": True, "slug": req.slug, "git_ok": ok}


@router.post("/restructure")
def restructure_notes():
    """Manually trigger self-balancing Zettelkasten restructuring of all wiki links."""
    _ensure_docs_root()
    try:
        restructure_wiki_graph(DOCS_ROOT)
        # Commit the changes made by the restructure
        subprocess.run(
            ["git", "-C", str(REPO_ROOT), "add", "docs/"],
            check=True, capture_output=True, timeout=30
        )
        r = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "commit", "-m", "chore(graph): self-balancing Zettelkasten restructuring"],
            capture_output=True, timeout=10
        )
        if r.returncode == 0:
            subprocess.run(
                ["git", "-C", str(REPO_ROOT), "push", "-q"],
                check=True, capture_output=True, timeout=30
            )
            git_status = "pushed changes"
        else:
            git_status = "no structural changes needed"
        return {"success": True, "git_status": git_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restructuring failed: {e}")


@router.get("/graph")
def notes_graph():
    """Build graph data: nodes (all notes) + edges (wikilinks between notes)."""
    _ensure_docs_root()
    notes = _flat_notes(DOCS_ROOT)
    slug_set = {n["slug"] for n in notes}

    nodes = [
        {"slug": n["slug"], "title": n["title"], "exists": True}
        for n in notes
    ]

    edges = []
    for note in notes:
        path = _path_from_slug(note["slug"])
        if not path.exists():
            continue
        try:
            raw = path.read_text(encoding="utf-8")
            body = _strip_frontmatter(raw)
            for target in _parse_wikilinks(body):
                # Normalize target slug
                target_slug = target.strip().lower().replace(" ", "-")
                # Try exact match, then normalized
                matched = None
                if target in slug_set:
                    matched = target
                elif target_slug in slug_set:
                    matched = target_slug
                else:
                    # Partial match by filename
                    for s in slug_set:
                        if s.split("/")[-1] == target or s.split("/")[-1] == target_slug:
                            matched = s
                            break
                if matched and matched != note["slug"]:
                    edges.append({
                        "source": note["slug"],
                        "target": matched,
                        "type": "navigational",
                    })
        except Exception:
            continue

    # Deduplicate edges
    seen = set()
    unique_edges = []
    for e in edges:
        key = (e["source"], e["target"])
        if key not in seen:
            seen.add(key)
            unique_edges.append(e)

    return {
        "success": True,
        "nodes": nodes,
        "edges": unique_edges,
        "stats": {"notes": len(nodes), "links": len(unique_edges)},
    }
