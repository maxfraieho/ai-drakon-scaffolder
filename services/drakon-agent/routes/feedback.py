"""POST /feedback — persist diagram feedback into knowledge base for BM25 reindex."""
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"
FEEDBACK_DIR = KNOWLEDGE_DIR / "feedback"


class FeedbackRequest(BaseModel):
    diagram_name: str
    feedback: str
    corrected_ir: dict | None = None


def _feedback_to_markdown(req: FeedbackRequest) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [
        f"## Feedback: {req.diagram_name}",
        f"",
        f"**Date:** {ts}",
        f"**Diagram:** `{req.diagram_name}`",
        f"",
        f"### What was wrong",
        f"{req.feedback}",
    ]
    if req.corrected_ir:
        lines += [
            f"",
            f"### Corrected IR",
            f"```json",
            json.dumps(req.corrected_ir, ensure_ascii=False, indent=2),
            f"```",
            f"",
            f"**Key corrections:**",
        ]
        items = req.corrected_ir.get("items", {})
        for node_id, node in items.items():
            if node.get("type") == "question":
                lines.append(f"- `{node_id}`: question→one={node.get('one')}, two={node.get('two')}")
            elif node.get("type") == "action":
                lines.append(f"- `{node_id}`: action content=`{node.get('content','')[:60]}`")
    return "\n".join(lines)


@router.post("/feedback")
def feedback(req: FeedbackRequest):
    FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)

    slug = hashlib.md5(f"{req.diagram_name}{req.feedback}".encode()).hexdigest()[:8]
    filename = f"fb-{slug}.md"
    path = FEEDBACK_DIR / filename

    # Append to existing file or create new
    mode = "a" if path.exists() else "w"
    with open(path, mode, encoding="utf-8") as f:
        if mode == "a":
            f.write("\n\n---\n\n")
        f.write(_feedback_to_markdown(req))

    # Force KB reindex on next analyze call by resetting flag
    try:
        from routes.analyze import _reset_kb
        _reset_kb()
    except Exception:
        pass

    return {
        "status": "saved",
        "diagram": req.diagram_name,
        "file": str(path.relative_to(KNOWLEDGE_DIR)),
    }
