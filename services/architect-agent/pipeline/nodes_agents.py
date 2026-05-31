"""Agent-specific LangGraph nodes for drakon-agent and docs-agent."""
import os, json, glob
from pathlib import Path

_KB_ROOT = Path(__file__).parent.parent / "kb"
_DOCS_ROOT = Path(__file__).parent.parent.parent.parent / "docs"

def load_drakon_kb() -> str:
    """Load DRAKON rules KB."""
    rules_file = _KB_ROOT / "00-drakon-rules.md"
    if rules_file.exists():
        return rules_file.read_text(encoding="utf-8")[:3000]
    return ""

def load_docs_kb(query: str = "") -> str:
    """Load relevant docs from manuals/."""
    manuals_dir = _DOCS_ROOT / "manuals"
    if not manuals_dir.exists():
        return ""
    texts = []
    for f in sorted(manuals_dir.glob("*.md"))[:4]:
        texts.append(f"## {f.name}\n" + f.read_text(encoding="utf-8")[:800])
    return "\n\n".join(texts)

# ── DRAKON agent nodes ─────────────────────────────────────────────────────
def drakon_load_kb(state: dict) -> dict:
    return {"kb_context": load_drakon_kb()}

def drakon_format_prompt(state: dict) -> dict:
    code = state.get("source_code") or state.get("message", "")
    kb = state.get("kb_context", "")
    prompt = (
        f"KB:\n{kb[:1500]}\n\n"
        f"Згенеруй DRAKON IR JSON для функції:\n```python\n{code[:3000]}\n```\n"
        "Виведи тільки JSON масив у ```json ... ``` блоці."
    )
    return {"llm_prompt": prompt}

def drakon_parse_result(state: dict) -> dict:
    import re
    reply = state.get("llm_reply", "")
    m = re.search(r"```json\s*(\[.*?\]|\{.*?\})\s*```", reply, re.DOTALL)
    if m:
        try:
            ir = json.loads(m.group(1))
            return {"drakon_ir": ir if isinstance(ir, list) else [ir], "parse_ok": True}
        except Exception:
            pass
    return {"drakon_ir": [], "parse_ok": False}

# ── DOCS agent nodes ───────────────────────────────────────────────────────
def docs_load_kb(state: dict) -> dict:
    query = state.get("message", "")
    return {"kb_context": load_docs_kb(query)}

def docs_format_prompt(state: dict) -> dict:
    query = state.get("message", "")
    kb = state.get("kb_context", "")
    prompt = (
        f"Документація проекту:\n{kb[:2000]}\n\n"
        f"Питання: {query}\n\n"
        "Відповідай українською, посилайся на [[wiki-links]] де доречно."
    )
    return {"llm_prompt": prompt}
