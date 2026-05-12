import base64
import os

import httpx

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO = os.getenv("GITHUB_REPO", "maxfraieho/ai-drakon-setup")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")
MEMORY_BASE = "memory"

_HEADERS = lambda: {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


def ensure_agent_memory(agent_name: str) -> bool:
    """Create memory/{agent_name}/MEMORY.md in repo if missing. Returns True if created."""
    index_path = f"{MEMORY_BASE}/{agent_name}/MEMORY.md"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{index_path}"

    resp = httpx.get(url, headers=_HEADERS())
    if resp.status_code == 200:
        return False

    content = f"# {agent_name.title()} Agent Memory\n\n(auto-created on first startup)\n"
    encoded = base64.b64encode(content.encode()).decode()
    httpx.put(url, headers=_HEADERS(), json={
        "message": f"feat: initialize {agent_name} agent memory namespace",
        "content": encoded,
        "branch": GITHUB_BRANCH,
    })
    return True


def save_memory(agent_name: str, filename: str, content: str, commit_msg: str) -> dict:
    """Write a memory file to the repo. Creates or updates."""
    path = f"{MEMORY_BASE}/{agent_name}/{filename}"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"

    existing = httpx.get(url, headers=_HEADERS())
    sha = existing.json().get("sha") if existing.status_code == 200 else None

    encoded = base64.b64encode(content.encode()).decode()
    payload = {"message": commit_msg, "content": encoded, "branch": GITHUB_BRANCH}
    if sha:
        payload["sha"] = sha

    resp = httpx.put(url, headers=_HEADERS(), json=payload)
    return {"success": resp.status_code in (200, 201), "path": path}


def get_memory(agent_name: str, filename: str) -> str | None:
    """Read a memory file from the repo. Returns None if missing."""
    path = f"{MEMORY_BASE}/{agent_name}/{filename}"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"

    resp = httpx.get(url, headers=_HEADERS())
    if resp.status_code != 200:
        return None
    return base64.b64decode(resp.json()["content"]).decode()


def list_memory(agent_name: str) -> list[str]:
    """List memory files for an agent namespace. Returns empty list if missing."""
    path = f"{MEMORY_BASE}/{agent_name}"
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"

    resp = httpx.get(url, headers=_HEADERS())
    if resp.status_code != 200:
        return []
    return [item["name"] for item in resp.json() if item.get("type") == "file"]
