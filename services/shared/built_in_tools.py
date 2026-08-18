"""Built-in tools available to all AI-DRAKON agents across all projects.
Add new tools here to make them available in the DRAKON editor node registry.
"""
from typing import Any
from pathlib import Path

_kb_cache: dict = {}  # (slug, agent) -> KBClient


def search_kb(state: dict) -> dict:
    """Search the project knowledge base. Caches index per project/agent."""
    from services.shared.kb_client import KBClient
    slug = state.get("project_slug", "_default")
    agent = state.get("agent_name", "default")
    cache_key = (slug, agent)

    # Find KB directory
    projects_root = Path(os.getenv("PROJECTS_ROOT", str(Path.cwd())))
    kb_dir = projects_root / slug / "agents" / agent / "kb"
    if not kb_dir.exists() or not list(kb_dir.glob("*.md")):
        # fallback to docs/kb/
        kb_dir = Path(os.getenv("REPO_ROOT", str(Path(__file__).resolve().parents[2]))) / "docs" / "kb"

    # Re-index if not cached or docs changed
    if cache_key not in _kb_cache:
        kb = KBClient(":memory:")
        if kb_dir.exists():
            n = kb.index_documents(kb_dir)
        _kb_cache[cache_key] = kb

    query = state.get("query") or state.get("input", "")
    results = _kb_cache[cache_key].search(query, top_k=5) if query else []
    context = "\n\n".join(results)
    return {**state, "kb_results": results, "context": context}


def analyze_code(state: dict) -> dict:
    """Analyze code using AST. Uses state["input"] as source code."""
    import ast
    source = state.get("input", "")
    try:
        tree = ast.parse(source)
        nodes = [type(n).__name__ for n in ast.walk(tree)]
        summary = f"AST nodes: {len(nodes)}. Types: {set(list(nodes)[:10])}"
    except SyntaxError as e:
        summary = f"Syntax error: {e}"
    return {**state, "code_analysis": summary, "output": summary}


def generate_ir(state: dict) -> dict:
    """Generate minimal DRAKON IR from analysis result."""
    analysis = state.get("code_analysis", state.get("input", ""))
    ir = {
        "name": state.get("agent_name", "generated"),
        "items": {
            "h": {"type": "header", "content": "Generated", "one": "n1"},
            "n1": {"type": "action", "content": analysis[:50], "one": "end"},
            "end": {"type": "end"}
        }
    }
    import json
    return {**state, "generated_ir": ir, "output": json.dumps(ir, ensure_ascii=False)}


def save_to_project(state: dict) -> dict:
    """Save output to project storage."""
    slug = state.get("project_slug", "_default")
    agent = state.get("agent_name", "default")
    output = state.get("output", str(state))
    import json, datetime
    out_dir = Path(os.getenv("PROJECTS_ROOT", str(Path.cwd()))) / slug / "agents" / agent / "results"
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = out_dir / f"result_{ts}.json"
    out_file.write_text(json.dumps({"output": output, "state": str(state)[:500]}, ensure_ascii=False))
    return {**state, "saved_to": str(out_file)}



def github_write(state: dict) -> dict:
    """Commit a file to GitHub. Uses git CLI (SSH key) with REST API fallback.

    State keys:
      - path: file path relative to repo root
      - content: file content to write
      - message: commit message (optional)
      - git_repo_path: local repo path (optional, env fallback)
    """
    import subprocess as _sp, os as _os, base64
    file_path = state.get("path", state.get("file_path", ""))
    file_content = state.get("content", state.get("output", ""))
    commit_msg = state.get("message", state.get("commit_message", f"agent: update {file_path}"))
    repo_root = state.get("git_repo_path") or _os.getenv("GIT_REPO_PATH", str(Path(__file__).resolve().parents[2]))

    if not file_path:
        return {**state, "github_result": "Error: path is required"}

    full_path = _os.path.join(repo_root, file_path)
    _os.makedirs(_os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as _f:
        _f.write(file_content)

    _sp.run(["git", "-C", repo_root, "add", file_path], capture_output=True)
    r2 = _sp.run(["git", "-C", repo_root, "commit", "-m", commit_msg], capture_output=True, text=True)
    if "nothing to commit" in r2.stdout + r2.stderr:
        return {**state, "github_result": f"No changes: {file_path} already up-to-date"}
    r3 = _sp.run(["git", "-C", repo_root, "push", "origin", "main"], capture_output=True, text=True)
    if r3.returncode == 0:
        return {**state, "github_result": f"OK: {file_path} committed and pushed"}

    # Fallback: GitHub REST API with token
    import urllib.request, json as _json
    gh_token = _os.getenv("GITHUB_TOKEN", "")
    if not gh_token:
        return {**state, "github_result": f"Committed locally but push failed: {r3.stderr[:100]}"}

    gh_repo_full = _os.getenv("GITHUB_REPO", "maxfraieho/ai-drakon-scaffolder")
    gh_owner, _, gh_repo = gh_repo_full.partition("/")
    gh_branch = _os.getenv("GITHUB_BRANCH", "main")
    api_url = f"https://api.github.com/repos/{gh_owner}/{gh_repo}/contents/{file_path}"

    headers = {"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github+json",
               "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28"}
    get_req = urllib.request.Request(f"{api_url}?ref={gh_branch}", headers=headers)
    sha = None
    try:
        with urllib.request.urlopen(get_req, timeout=10) as resp:
            sha = _json.loads(resp.read()).get("sha")
    except Exception:
        pass

    payload = {"message": commit_msg, "content": base64.b64encode(file_content.encode()).decode(), "branch": gh_branch}
    if sha:
        payload["sha"] = sha
    put_req = urllib.request.Request(api_url, data=_json.dumps(payload).encode(), headers=headers, method="PUT")
    try:
        with urllib.request.urlopen(put_req, timeout=15) as resp:
            return {**state, "github_result": f"OK: {file_path} committed via API"}
    except Exception as e:
        return {**state, "github_result": f"GitHub API error: {e}"}


BUILT_IN_TOOLS: dict[str, Any] = {
    "github_write":   github_write,
    "search_kb":      search_kb,
    "analyze_code":   analyze_code,
    "generate_ir":    generate_ir,
    "save_to_project": save_to_project,
}
