#!/usr/bin/env python3
"""SDD Pre-commit LLM Arbiter.

Cross-checks the staged git diff against the active feature's spec.md /
plan.md contracts via an OpenAI-compatible LLM proxy. Fail-open by design:
any infrastructure problem (unreachable proxy, bad auth, timeout, missing
spec) skips the check rather than blocking the commit. Only an explicit
FAIL verdict from a model that actually answered blocks the commit.

Configuration (env vars, or ~/.ai-drakon-scaffolder-secrets/sdd_judge.env):
  SDD_JUDGE_URL      OpenAI-compatible chat/completions endpoint. Empty = skip.
  SDD_JUDGE_KEY       Bearer token. Empty = skip.
  SDD_JUDGE_MODEL     Model/slot name. Empty = skip.
  SDD_JUDGE_DISABLE   "1" = always skip.
  SDD_JUDGE_SHADOW    "1" = shadow mode (log FAIL, never block). Also --dry-run.
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

SECRETS_ENV = Path("~/.ai-drakon-scaffolder-secrets").expanduser() / "sdd_judge.env"
LOG_DIR = Path("logs/sdd_judge")

# Paths that are never sent to the proxy (constitution PII invariant).
# specs/ is excluded too: reviewing the spec against itself is meaningless.
DIFF_PATHSPEC_EXCLUDES = [":!specs/"] + [
    f":!{g.strip()}" for g in "*.txt,credentials.json,*.db,*.secret".split(",") if g.strip()
]


KNOWN_ARGS = {"--staged", "--dry-run"}


def _load_secrets_env() -> None:
    """Load SDD_JUDGE_* from the secrets env file into os.environ, without
    overriding anything already set by the caller."""
    if not SECRETS_ENV.exists():
        return
    for line in SECRETS_ENV.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip()
        if key and key not in os.environ:
            os.environ[key] = value


def _warn(msg: str) -> None:
    print(f"\033[93m[SDD Arbiter] {msg}\033[0m")


def _fail(summary: str, violations: list[dict]) -> None:
    print("\n\033[91m[SDD ARBITER REJECTED COMMIT]\033[0m")
    print(f"Summary: {summary}")
    for v in violations:
        print(f"  - [{v.get('file', '?')}] {v.get('rule', '?')}: {v.get('reason', '?')}")
    print("\nCommit aborted. Fix spec deviations or update plan.md.\n")


def _passed(summary: str) -> None:
    print(f"\033[92m[SDD Arbiter: Verification PASS]\033[0m {summary}".rstrip())


def get_staged_diff() -> str:
    res = subprocess.run(
        ["git", "diff", "--cached", "--"] + DIFF_PATHSPEC_EXCLUDES,
        capture_output=True,
        text=True,
    )
    return res.stdout.strip()


def get_active_feature() -> dict:
    fj = Path(".specify/feature.json")
    if not fj.exists():
        return {}
    try:
        return json.loads(fj.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def get_spec_and_plan(spec_dir: str) -> tuple[str, str]:
    if not spec_dir:
        return "", ""
    spec_file = Path(spec_dir) / "spec.md"
    plan_file = Path(spec_dir) / "plan.md"
    spec_content = spec_file.read_text() if spec_file.exists() else ""
    plan_content = plan_file.read_text() if plan_file.exists() else ""
    return spec_content, plan_content


def get_referenced_adrs(spec_content: str) -> list[str]:
    """Scan spec.md for 'Reference: ADR-NNNN' lines and resolve them to
    real files under docs/adr/. Missing ADRs are silently skipped — this
    is best-effort context enrichment, not a contract check. Returns []
    (harmless no-op) on projects that never adopted docs/adr/."""
    if not spec_content:
        return []
    adr_numbers = re.findall(r"Reference:\s*ADR-(\d+)", spec_content, re.IGNORECASE)
    paths: list[str] = []
    adr_dir = Path("docs/adr")
    for num in adr_numbers:
        try:
            matches = list(adr_dir.glob(f"{num}-*.md"))
            for p in sorted(matches):
                p_str = str(p)
                if p_str not in paths:
                    paths.append(p_str)
        except OSError:
            continue
    return paths


def _load_adr_context(adr_paths: list[str]) -> str:
    if not adr_paths:
        return ""
    chunks: list[str] = []
    for path_str in adr_paths:
        p = Path(path_str)
        try:
            if p.exists():
                content = p.read_text(encoding="utf-8")[:2000]
                chunks.append(f"--- {path_str} ---\n{content}")
        except OSError:
            continue
    combined = "\n\n".join(chunks)
    return combined[:6000]


def _extract_json(text: str) -> dict | None:
    """Best-effort JSON extraction — handles models that don't honor
    response_format=json_object and wrap the JSON in prose or fences."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None
    return None


def _log_verdict(result: dict) -> None:
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        ts = time.strftime("%Y%m%dT%H%M%S")
        (LOG_DIR / f"{ts}.json").write_text(json.dumps(result, indent=2))
    except OSError:
        pass  # logging is best-effort, never blocks the commit over it


def _log_skip(reason: str) -> None:
    """Log a SKIP so shadow-mode has a record of *why* nothing was judged —
    otherwise silent skips are indistinguishable from a healthy PASS when
    later reviewing shadow-mode precision."""
    if os.environ.get("SDD_JUDGE_LOG_SKIPS") != "1":
        return
    _log_verdict({"verdict": "SKIP", "reason": reason, "ts": time.strftime("%Y-%m-%dT%H:%M:%S")})


def build_prompt(spec: str, plan: str, diff: str, phase: str, adr_context: str = "") -> str:
    if phase and phase != "implement":
        return f"""
You are the strict SDD Quality Arbiter. The active feature is in phase
'{phase}', not 'implement' — at this phase, staged changes are expected
to be limited to specs/ (already excluded from this diff) and should NOT
contain implementation code changes outside specs/.

[GIT STAGED DIFF] (specs/ already excluded):
{diff[:8000]}

If the diff above is non-empty, that means implementation code is being
changed before the spec/plan/tasks phase is complete — flag this as a
violation. If the diff is empty, PASS.

Return ONLY valid JSON matching this schema:
{{"verdict": "PASS" | "FAIL", "confidence": float, "violations": [{{"rule": "string", "reason": "string", "file": "string"}}], "summary": "string", "adr_drift": boolean, "adr_drift_note": "string"}}
"""
    adr_section = f"\n[REFERENCED ADR CONTEXT]:\n{adr_context}\n" if adr_context else ""
    return f"""
You are the strict SDD Quality Arbiter. Validate the staged git diff against the feature specification.

[SPECIFICATION]:
{spec[:4000]}

[PLAN & CONSTRAINTS]:
{plan[:3000]}
{adr_section}
[GIT STAGED DIFF]:
{diff[:8000]}

Analyze if the code changes violate the spec, introduce unintended side-effects, or bypass defined architectural boundaries.
Return ONLY valid JSON matching this schema:
{{"verdict": "PASS" | "FAIL", "confidence": float, "violations": [{{"rule": "string", "reason": "string", "file": "string"}}], "summary": "string", "adr_drift": boolean, "adr_drift_note": "string"}}
"""


def call_judge(prompt: str, url: str, key: str, model: str, timeout: int = 45) -> dict | None:
    """Returns a parsed verdict dict, or None if the call could not be
    completed for any infrastructure reason (caller must treat None as
    'skip, do not block')."""
    payload = json.dumps(
        {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            _warn(f"auth rejected by judge endpoint ({e.code}) — skipping, not blocking")
        else:
            _warn(f"judge endpoint returned HTTP {e.code} — skipping, not blocking")
        return None
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        _warn(f"judge endpoint unreachable ({e}) — skipping, not blocking")
        return None

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        _warn("judge response missing choices[0].message.content — skipping, not blocking")
        return None

    result = _extract_json(content)
    if result is None:
        _warn("judge response was not valid/extractable JSON — skipping, not blocking")
        return None
    return result


def evaluate_diff(dry_run: bool = False) -> int:
    if os.environ.get("SDD_JUDGE_DISABLE") == "1":
        _warn("disabled via SDD_JUDGE_DISABLE=1 — skipping")
        _log_skip("SDD_JUDGE_DISABLE=1")
        return 0

    diff = get_staged_diff()
    if not diff:
        return 0  # nothing outside excluded paths staged — nothing to judge

    feature = get_active_feature()
    spec_dir = feature.get("spec_dir", "")
    phase = feature.get("phase", "")
    spec, plan = get_spec_and_plan(spec_dir)
    if not spec:
        _warn("no active feature.json / spec.md found — skipping (no contract to judge against)")
        _log_skip("no active feature.json / spec.md")
        return 0

    _load_secrets_env()
    url = os.environ.get("SDD_JUDGE_URL", "")
    key = os.environ.get("SDD_JUDGE_KEY", "")
    model = os.environ.get("SDD_JUDGE_MODEL", "")

    if not url or not key or not model:
        _warn(f"SDD_JUDGE_URL/KEY/MODEL not fully configured (checked {SECRETS_ENV}) — skipping")
        _log_skip("judge not configured")
        return 0

    adr_paths = get_referenced_adrs(spec)
    adr_context = _load_adr_context(adr_paths)

    prompt = build_prompt(spec, plan, diff, phase, adr_context=adr_context)
    result = call_judge(prompt, url, key, model)
    if result is None:
        _log_skip("call_judge returned None (see warning above)")
        return 0

    _log_verdict(result)

    if result.get("adr_drift"):
        _warn(f"ADR drift detected: {result.get('adr_drift_note', '')}")

    verdict = result.get("verdict")
    summary = result.get("summary", "")
    violations = result.get("violations", [])

    if verdict == "FAIL":
        _fail(summary, violations)
        if dry_run:
            _warn("--dry-run / shadow mode: NOT blocking despite FAIL verdict")
            return 0
        return 1

    _passed(summary)
    return 0


def main() -> None:
    args = sys.argv[1:]
    unknown = [a for a in args if a not in KNOWN_ARGS]
    if unknown:
        print(f"Unknown argument(s): {' '.join(unknown)}. Known: {sorted(KNOWN_ARGS)}", file=sys.stderr)
        sys.exit(2)
    dry_run = "--dry-run" in args or os.environ.get("SDD_JUDGE_SHADOW") == "1"
    sys.exit(evaluate_diff(dry_run=dry_run))


if __name__ == "__main__":
    main()

