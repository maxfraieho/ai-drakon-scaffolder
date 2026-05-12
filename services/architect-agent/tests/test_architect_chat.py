"""TDD tests for architect_chat — mocks the AI proxy."""
import json
import sys
import os
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.expanduser("~/workspace/ai-drakon-setup/services/architect-agent"))


class FakeChoice:
    def __init__(self, content):
        self.message = MagicMock(content=content)


class FakeCompletion:
    def __init__(self, content):
        self.choices = [FakeChoice(content)]

    def json(self):
        return {"choices": [{"message": {"content": self.choices[0].message.content}}]}


def make_mock_post(content: str):
    resp = MagicMock()
    resp.status_code = 200
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {"choices": [{"message": {"content": content}}]}
    return MagicMock(return_value=resp)


def test_chat_returns_reply():
    """architect_chat returns a reply string from the LLM."""
    with patch("httpx.post", make_mock_post("The architecture has 4 layers.")):
        from ai_chat.architect_chat import architect_chat
        result = architect_chat("Explain architecture")
    assert result["reply"] == "The architecture has 4 layers."
    assert result["suggested_mutations"] is None


def test_chat_extracts_json_mutations():
    """When reply contains ```json [...] ```, suggested_mutations is parsed."""
    content = 'Here is a diagram:\n```json\n[{"op":"set","id":"n1","item":{"type":"action","content":"Module A","one":"end"}}]\n```\nApply it!'
    with patch("httpx.post", make_mock_post(content)):
        from ai_chat.architect_chat import architect_chat
        result = architect_chat("Create diagram")
    assert result["suggested_mutations"] is not None
    assert len(result["suggested_mutations"]) == 1
    assert result["suggested_mutations"][0]["op"] == "set"


def test_chat_handles_malformed_json_gracefully():
    """If JSON block is malformed, suggested_mutations is None (no crash)."""
    content = "Here:\n```json\n[BROKEN JSON\n```"
    with patch("httpx.post", make_mock_post(content)):
        from ai_chat.architect_chat import architect_chat
        result = architect_chat("Create diagram")
    assert result["reply"] == content
    assert result["suggested_mutations"] is None


def test_chat_includes_context_in_prompt():
    """File tree and memory context must appear in the messages sent to proxy."""
    sent_messages = []

    def capture_post(url, **kwargs):
        sent_messages.extend(kwargs["json"]["messages"])
        return make_mock_post("ok")()

    with patch("httpx.post", capture_post):
        from ai_chat.architect_chat import architect_chat
        architect_chat(
            "What is the structure?",
            file_tree={"tree": [{"path": "src/main.py", "type": "blob"}]},
            memory_context="## Past decisions\n- Use FastAPI",
        )

    user_msg = next(m for m in sent_messages if m["role"] == "user")
    assert "src/main.py" in user_msg["content"]
    assert "Use FastAPI" in user_msg["content"]
