"""Tests for bootstrap.py — directory + env file creation."""
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

# bootstrap.py lives in scripts/ — test it via subprocess to avoid path issues
import subprocess


BOOTSTRAP = os.path.expanduser("~/workspace/ai-drakon-setup/scripts/bootstrap.py")


def test_creates_memory_directories(tmp_path):
    """bootstrap.py should create memory/architect, memory/docs, memory/shared."""
    result = subprocess.run(
        [sys.executable, BOOTSTRAP, "--root", str(tmp_path)],
        capture_output=True, text=True
    )
    assert result.returncode == 0
    for d in ["memory/architect", "memory/docs", "memory/shared"]:
        assert (tmp_path / d).is_dir(), f"Missing: {d}"


def test_creates_env_from_example(tmp_path):
    """bootstrap.py should copy .env.example → .env for each service that has an example."""
    svc = tmp_path / "services" / "architect-agent"
    svc.mkdir(parents=True)
    (svc / ".env.example").write_text("PROXY_URL=http://localhost:18880/v1\n")

    result = subprocess.run(
        [sys.executable, BOOTSTRAP, "--root", str(tmp_path)],
        capture_output=True, text=True
    )
    assert result.returncode == 0
    assert (svc / ".env").exists(), ".env should be created from .env.example"


def test_does_not_overwrite_existing_env(tmp_path):
    """bootstrap.py should NOT overwrite .env if it already exists."""
    svc = tmp_path / "services" / "docs-agent"
    svc.mkdir(parents=True)
    (svc / ".env.example").write_text("PROXY_URL=example\n")
    (svc / ".env").write_text("MY_CUSTOM=value\n")

    subprocess.run([sys.executable, BOOTSTRAP, "--root", str(tmp_path)], capture_output=True)

    content = (svc / ".env").read_text()
    assert "MY_CUSTOM=value" in content, ".env should NOT be overwritten"


def test_idempotent(tmp_path):
    """Running bootstrap twice should not error."""
    r1 = subprocess.run([sys.executable, BOOTSTRAP, "--root", str(tmp_path)], capture_output=True)
    r2 = subprocess.run([sys.executable, BOOTSTRAP, "--root", str(tmp_path)], capture_output=True)
    assert r1.returncode == 0
    assert r2.returncode == 0
