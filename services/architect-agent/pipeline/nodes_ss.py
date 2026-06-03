"""Sonate Solidaire agent nodes.

KB files live in sonate-solidsite repo and are served via Cloudflare Pages.
The agent fetches them at runtime from https://sonate-solidaire.me/kb/.
"""
import os
from pathlib import Path

_KB_BASE_URL = os.getenv("SS_KB_BASE_URL", "https://sonate-solidaire.me/kb")
_KB_SS_LOCAL = Path(__file__).parent.parent / "kb" / "sonate-solidaire"

_AUDIENCE_KEYWORDS = {
    "events": [
        "concert", "booking", "заход", "konzert", "tarif", "замовити",
        "виступ", "organisation", "réservation", "spectacle", "engager",
        "programme", "soirée", "event",
    ],
    "musicians": [
        "musicien", "музикант", "instrument", "jouer", "грати", "виступати",
        "intégrer", "інтеграція", "audition", "rejoindre", "participer",
        "приєднатися", "заявка", "колектив", "mitmachen", "beitreten",
        "candidature", "postuler",
    ],
    "partners": [
        "volunteer", "волонтер", "partner", "don", "financement",
        "association", "bénévole", "soutenir", "subvention", "loterie",
        "підтримати", "партнер", "фінансування",
    ],
}


def ss_detect_audience(state: dict) -> dict:
    """Detect audience type from message content."""
    msg = (state.get("message") or "").lower()
    for audience, keywords in _AUDIENCE_KEYWORDS.items():
        if any(kw in msg for kw in keywords):
            return {"ss_audience": audience}
    return {"ss_audience": "general"}


def _fetch_kb(audience: str) -> str:
    """Fetch KB from sonate-solidaire.me, fall back to local copy."""
    import httpx
    url = f"{_KB_BASE_URL}/kb-{audience}.md"
    try:
        r = httpx.get(url, timeout=8.0, follow_redirects=True)
        if r.status_code == 200:
            return r.text
    except Exception:
        pass
    # Local fallback (local copy in repo for dev/offline)
    local = _KB_SS_LOCAL / f"kb-{audience}.md"
    fallback = _KB_SS_LOCAL / "kb-general.md"
    f = local if local.exists() else fallback
    return f.read_text(encoding="utf-8") if f.exists() else ""


def ss_load_kb(state: dict) -> dict:
    """Load KB based on detected audience — primary source: sonate-solidaire.me/kb/."""
    audience = state.get("ss_audience", "general")
    content = _fetch_kb(audience)
    return {"kb_context": content}


def ss_format_prompt(state: dict) -> dict:
    """Build multilingual prompt with system instructions."""
    msg = state.get("message", "")
    kb = state.get("kb_context", "")
    audience = state.get("ss_audience", "general")

    msg_lower = msg.lower()
    if any(c in msg_lower for c in "абвгдеєжзиіїйклмнопрстуфхцчшщьюя"):
        lang_hint = "Respond in Ukrainian (Українська)."
    elif any(c in msg_lower for c in ["ü", "ö", "ä", "ß"]) or any(
        w in msg_lower for w in ["ich", "sie", "das", "und", "bitte"]
    ):
        lang_hint = "Antworte auf Deutsch."
    else:
        lang_hint = "Réponds en français."

    system = (
        "Tu es l'assistant de l'association Sonate Solidaire. "
        "Tu réponds aux questions sur l'association, ses activités et ses services. "
        f"Audience détectée: {audience}. {lang_hint} "
        "Sois concis, chaleureux et professionnel. "
        "Si tu ne sais pas, dirige vers contact@sonate-solidaire.me."
    )
    prompt = f"Contexte:\n{kb[:2000]}\n\nQuestion: {msg}"
    return {"llm_prompt": prompt, "ss_system": system}


def ss_format_response(state: dict) -> dict:
    """Append audience-specific CTA to reply."""
    reply = state.get("llm_reply", "")
    audience = state.get("ss_audience", "general")
    ctas = {
        "events": "\n\n→ [Formulaire de contact](https://sonate-solidaire.me/contact)",
        "musicians": "\n\n→ [Chemin d'intégration](https://sonate-solidaire.me/integration-path)",
        "partners": "\n\n→ [Soutenir l'association](https://sonate-solidaire.me/support)",
        "general": "\n\n→ [sonate-solidaire.me](https://sonate-solidaire.me)",
    }
    return {"llm_reply": reply + ctas.get(audience, "")}


from pathlib import Path
import json
import datetime

_ANALYTICS_LOG = Path(__file__).parent.parent / "kb" / "sonate-solidaire" / "analytics.jsonl"

def ss_log_analytics(state: dict) -> dict:
    """Log anonymized interaction — full question for KB analysis."""
    try:
        _ANALYTICS_LOG.parent.mkdir(parents=True, exist_ok=True)
        msg = state.get("message", "")
        reply = state.get("llm_reply", "")

        # Detect language
        lang = "uk" if any(c in msg for c in "абвгдеєжзиіїйклмнопрстуфхцчшщ") else \
               "de" if any(c in msg.lower() for c in ["ü", "ö", "ä", "ß"]) else \
               "fr"

        # Detect response quality
        low_quality_markers = ["je ne sais pas", "je n'ai pas", "désolé", "sorry",
                               "нема інформації", "не знаю"]
        response_quality = "weak" if (
            len(reply) < 100 or any(m in reply.lower() for m in low_quality_markers)
        ) else "good"

        entry = {
            "ts": datetime.datetime.utcnow().isoformat() + "Z",
            "audience": state.get("ss_audience", "general"),
            "lang": lang,
            "question": msg[:500],          # full question, max 500 chars
            "question_len": len(msg),
            "response_len": len(reply),
            "response_quality": response_quality,
        }
        with open(_ANALYTICS_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as e:
        pass  # fail silently — analytics must never break the agent
    return {}
