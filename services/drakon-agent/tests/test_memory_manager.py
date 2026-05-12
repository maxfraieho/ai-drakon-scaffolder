"""Tests for memory_manager — mocks GitHub API calls."""
import base64
import json
import os
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.expanduser("~/workspace/ai-drakon-setup/services/drakon-agent"))

import pytest


class MockResponse:
    def __init__(self, status_code, data=None):
        self.status_code = status_code
        self._data = data or {}

    def json(self):
        return self._data


# --- ensure_agent_memory ---

def test_ensure_creates_namespace_when_missing():
    """When memory/agent/MEMORY.md doesn't exist (404), it should create it and return True."""
    with patch("httpx.get") as mock_get, patch("httpx.put") as mock_put:
        mock_get.return_value = MockResponse(404)
        mock_put.return_value = MockResponse(201)

        from memory_manager import ensure_agent_memory
        result = ensure_agent_memory("architect")

    assert result is True
    mock_put.assert_called_once()
    call_kwargs = mock_put.call_args
    payload = call_kwargs.kwargs.get("json") or call_kwargs.args[1] if len(call_kwargs.args) > 1 else call_kwargs.kwargs["json"]
    assert "memory/architect/MEMORY.md" in call_kwargs.args[0] or "memory/architect/MEMORY.md" in str(call_kwargs)


def test_ensure_skips_when_existing():
    """When memory/agent/MEMORY.md already exists (200), it should return False without PUT."""
    with patch("httpx.get") as mock_get, patch("httpx.put") as mock_put:
        mock_get.return_value = MockResponse(200, {"content": base64.b64encode(b"existing").decode()})

        from memory_manager import ensure_agent_memory
        result = ensure_agent_memory("docs")

    assert result is False
    mock_put.assert_not_called()


# --- save_memory ---

def test_save_memory_creates_new_file():
    """save_memory on a new file (404 on GET) should PUT without sha."""
    with patch("httpx.get") as mock_get, patch("httpx.put") as mock_put:
        mock_get.return_value = MockResponse(404)
        mock_put.return_value = MockResponse(201, {"content": {"sha": "abc123"}})

        from memory_manager import save_memory
        result = save_memory("architect", "project-structure.md", "# Structure", "feat: add structure")

    assert result["success"] is True
    payload = mock_put.call_args.kwargs["json"]
    assert "sha" not in payload


def test_save_memory_updates_existing_file():
    """save_memory on existing file (200 on GET) should include sha in PUT payload."""
    existing_sha = "def456"
    with patch("httpx.get") as mock_get, patch("httpx.put") as mock_put:
        mock_get.return_value = MockResponse(200, {"sha": existing_sha, "content": base64.b64encode(b"old").decode()})
        mock_put.return_value = MockResponse(200, {"content": {"sha": "ghi789"}})

        from memory_manager import save_memory
        result = save_memory("docs", "api-coverage.md", "# Coverage", "docs: update api coverage")

    assert result["success"] is True
    payload = mock_put.call_args.kwargs["json"]
    assert payload["sha"] == existing_sha


# --- get_memory ---

def test_get_memory_returns_content():
    content = "# My Memory\n\nsome data"
    with patch("httpx.get") as mock_get:
        mock_get.return_value = MockResponse(200, {
            "content": base64.b64encode(content.encode()).decode(),
            "sha": "abc",
        })

        from memory_manager import get_memory
        result = get_memory("architect", "MEMORY.md")

    assert result == content


def test_get_memory_returns_none_when_missing():
    with patch("httpx.get") as mock_get:
        mock_get.return_value = MockResponse(404)

        from memory_manager import get_memory
        result = get_memory("shared", "missing.md")

    assert result is None
