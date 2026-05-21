import base64
import os
from pathlib import Path

import httpx

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO = os.getenv("GITHUB_REPO", "maxfraieho/ai-drakon-setup")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")
MEMORY_BASE = "memory"
_TIMEOUT = 10.0

# Local file fallback — stored next to the running agent's parent services dir
_SERVICES_DIR = Path(__file__).parent.parent
LOCAL_MEMORY_DIR = _SERVICES_DIR / "memory_local"


def _local_path(agent_name: str, filename: str) -> Path:
    return LOCAL_MEMORY_DIR / agent_name / filename


def _HEADERS() -> dict:
    if not GITHUB_TOKEN:
        return {"Accept": "application/vnd.github+json"}
    return {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def ensure_agent_memory(agent_name: str) -> bool:
    """Create memory/{agent_name}/MEMORY.md locally and in repo if possible."""
    local = _local_path(agent_name, "MEMORY.md")
    local.parent.mkdir(parents=True, exist_ok=True)
    if not local.exists():
        local.write_text(f"# {agent_name.title()} Agent Memory\n\n(auto-created)\n")

    if not GITHUB_TOKEN:
        return True
    index_path = f"{MEMORY_BASE}/{agent_name}/MEMORY.md"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{index_path}"
    try:
        resp = httpx.get(url, headers=_HEADERS(), timeout=_TIMEOUT)
        if resp.status_code == 200:
            return False
        content = f"# {agent_name.title()} Agent Memory\n\n(auto-created on first startup)\n"
        encoded = base64.b64encode(content.encode()).decode()
        httpx.put(url, headers=_HEADERS(), timeout=_TIMEOUT, json={
            "message": f"feat: initialize {agent_name} agent memory namespace",
            "content": encoded,
            "branch": GITHUB_BRANCH,
        })
    except Exception:
        pass
    return True


def save_memory(agent_name: str, filename: str, content: str, commit_msg: str) -> dict:
    """Write a memory file — local first, GitHub if token+write available."""
    local = _local_path(agent_name, filename)
    local.parent.mkdir(parents=True, exist_ok=True)
    local.write_text(content)

    if not GITHUB_TOKEN:
        return {"success": True, "path": str(local), "storage": "local"}

    path = f"{MEMORY_BASE}/{agent_name}/{filename}"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
    try:
        existing = httpx.get(url, headers=_HEADERS(), timeout=_TIMEOUT)
        sha = existing.json().get("sha") if existing.status_code == 200 else None
        encoded = base64.b64encode(content.encode()).decode()
        payload = {"message": commit_msg, "content": encoded, "branch": GITHUB_BRANCH}
        if sha:
            payload["sha"] = sha
        resp = httpx.put(url, headers=_HEADERS(), timeout=_TIMEOUT, json=payload)
        if resp.status_code in (200, 201):
            return {"success": True, "path": path, "storage": "github"}
    except Exception:
        pass

    return {"success": True, "path": str(local), "storage": "local_fallback"}


def get_memory(agent_name: str, filename: str) -> str | None:
    """Read memory — local first, then GitHub."""
    local = _local_path(agent_name, filename)
    if local.exists():
        return local.read_text()

    if not GITHUB_TOKEN:
        return None
    path = f"{MEMORY_BASE}/{agent_name}/{filename}"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
    try:
        resp = httpx.get(url, headers=_HEADERS(), timeout=_TIMEOUT)
        if resp.status_code == 200:
            content = base64.b64decode(resp.json()["content"]).decode()
            local.parent.mkdir(parents=True, exist_ok=True)
            local.write_text(content)
            return content
    except Exception:
        pass
    return None


def list_memory(agent_name: str) -> list[str]:
    """List memory files — from local dir + GitHub."""
    files: set[str] = set()

    local_dir = LOCAL_MEMORY_DIR / agent_name
    if local_dir.exists():
        files.update(f.name for f in local_dir.iterdir() if f.is_file())

    if GITHUB_TOKEN:
        path = f"{MEMORY_BASE}/{agent_name}"
        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
        try:
            resp = httpx.get(url, headers=_HEADERS(), timeout=_TIMEOUT)
            if resp.status_code == 200:
                files.update(item["name"] for item in resp.json() if item.get("type") == "file")
        except Exception:
            pass

    return sorted(files)
