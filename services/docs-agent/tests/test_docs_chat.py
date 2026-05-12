"""TDD tests for docs_chat."""
import json
import sys
import os
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.expanduser("~/workspace/ai-drakon-setup/services/docs-agent"))


def make_mock_post(content: str):
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {"choices": [{"message": {"content": content}}]}
    return MagicMock(return_value=resp)


def test_docs_chat_returns_reply():
    with patch("httpx.post", make_mock_post("Here is the updated API docs.")):
        from ai_chat.docs_chat import docs_chat
        result = docs_chat("Update docs for /analyze")
    assert result["reply"] == "Here is the updated API docs."
    assert result["doc_suggestions"] is None


def test_docs_chat_extracts_suggestions():
    """When reply contains a ```json``` block with doc objects, doc_suggestions is parsed."""
    content = 'Updated:\n```json\n[{"file":"api.md","section":"POST /analyze","content":"New docs"}]\n```'
    with patch("httpx.post", make_mock_post(content)):
        from ai_chat.docs_chat import docs_chat
        result = docs_chat("Update API docs")
    assert result["doc_suggestions"] is not None
    assert result["doc_suggestions"][0]["file"] == "api.md"


def test_docs_chat_context_in_prompt():
    sent = []
    def capture(url, **kwargs):
        sent.extend(kwargs["json"]["messages"])
        return make_mock_post("ok")()
    with patch("httpx.post", capture):
        from ai_chat.docs_chat import docs_chat
        docs_chat("Summarize", current_doc="# Old Doc", memory_context="## Coverage\n- /health covered")
    user_msg = next(m for m in sent if m["role"] == "user")
    assert "Old Doc" in user_msg["content"]
    assert "/health covered" in user_msg["content"]
