"""Project registry — lists available repos the agents can operate on."""
import json
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/projects", tags=["projects"])

_DEFAULT_CONFIG = Path(os.getenv(
    "PROJECTS_CONFIG",
    str(Path(__file__).parent.parent.parent / "projects.json")
))

_FALLBACK_PROJECTS = [
    {
        "slug": "sharon-global",
        "name": "Sharon Global",
        "path": "/home/vokov/workspace/sharon-global",
        "description": "AI-система моніторингу повітряних загроз",
        "hasDrakonIr": True,
        "hasDocs": True,
        "github": {"owner": "maxfraieho", "repo": "sharon-global", "branch": "main"},
    },
    {
        "slug": "uav-watcher",
        "name": "UAV Watcher",
        "path": "/home/vokov/projects/uav-watcher",
        "description": "Telegram-бот моніторингу БПЛА",
        "hasDrakonIr": True,
        "hasDocs": True,
        "github": {"owner": "maxfraieho", "repo": "uav-watcher", "branch": "master"},
    },
    {
        "slug": "code-proxy",
        "name": "Code Proxy",
        "path": "/home/vokov/workspace/code-proxy",
        "description": "LM streaming proxy для агентів",
        "hasDrakonIr": False,
        "hasDocs": False,
        "github": {"owner": "maxfraieho", "repo": "code-proxy", "branch": "main"},
    },
    {
        "slug": "ai-drakon-setup",
        "name": "AI-DRAKON Platform",
        "path": "/home/vokov/workspace/ai-drakon-setup",
        "description": "DRAKON editor + agent pipeline UI",
        "hasDrakonIr": False,
        "hasDocs": True,
        "github": {"owner": "maxfraieho", "repo": "ai-drakon-setup", "branch": "main"},
    },
]


def _load_projects() -> list[dict]:
    if _DEFAULT_CONFIG.exists():
        try:
            data = json.loads(_DEFAULT_CONFIG.read_text())
            return data.get("projects", _FALLBACK_PROJECTS)
        except Exception:
            pass
    return _FALLBACK_PROJECTS


def _save_projects(projects: list[dict]) -> None:
    _DEFAULT_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    _DEFAULT_CONFIG.write_text(json.dumps({"projects": projects}, indent=2, ensure_ascii=False))


def resolve_project_root(project: Optional[str] = None) -> Path:
    if not project:
        return Path(os.getenv("REPO_ROOT", str(Path.home() / "workspace" / "sharon-global")))
    for p in _load_projects():
        if p["slug"] == project:
            root = Path(p["path"])
            if root.exists():
                return root
            raise HTTPException(status_code=404, detail=f"Project path not found: {root}")
    raise HTTPException(status_code=404, detail=f"Unknown project: {project}")


@router.get("/list")
def list_projects():
    projects = _load_projects()
    result = []
    for p in projects:
        entry = dict(p)
        entry["exists"] = Path(p["path"]).exists()
        result.append(entry)
    return {"success": True, "projects": result}


class AddProjectRequest(BaseModel):
    slug: str
    name: str
    path: str
    description: str = ""
    hasDrakonIr: bool = False
    hasDocs: bool = False
    github: Optional[dict] = None


@router.post("/add")
def add_project(req: AddProjectRequest):
    projects = _load_projects()
    if any(p["slug"] == req.slug for p in projects):
        raise HTTPException(status_code=409, detail=f"Project slug already exists: {req.slug}")
    entry = {
        "slug": req.slug,
        "name": req.name,
        "path": req.path,
        "description": req.description,
        "hasDrakonIr": req.hasDrakonIr,
        "hasDocs": req.hasDocs,
    }
    if req.github:
        entry["github"] = req.github
    projects.append(entry)
    _save_projects(projects)
    return {"success": True, "project": entry}


@router.delete("/{slug}")
def delete_project(slug: str):
    projects = _load_projects()
    updated = [p for p in projects if p["slug"] != slug]
    if len(updated) == len(projects):
        raise HTTPException(status_code=404, detail=f"Project not found: {slug}")
    _save_projects(updated)
    return {"success": True, "deleted": slug}
