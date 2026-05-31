"""Sonate Solidaire agent nodes."""
from pathlib import Path

_KB_SS = Path(__file__).parent.parent / "kb" / "sonate-solidaire"

_AUDIENCE_KEYWORDS = {
    "events": [
        "concert", "booking", "заход", "konzert", "tarif", "замовити",
        "виступ", "organisation", "réservation", "spectacle", "engager",
        "programme", "soirée", "event",
    ],
    "musicians": [
        "musicien", "музикант", "refugee", "bijeganets", "protection s",
        "evam", "біженець", "integration", "інтеграція", "audition",
        "rejoindre", "participer", "statut", "permis", "droit de travail",
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


def ss_load_kb(state: dict) -> dict:
    """Load KB based on detected audience."""
    audience = state.get("ss_audience", "general")
    kb_file = _KB_SS / f"kb-{audience}.md"
    fallback = _KB_SS / "kb-general.md"
    f = kb_file if kb_file.exists() else fallback
    content = f.read_text(encoding="utf-8") if f.exists() else ""
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
