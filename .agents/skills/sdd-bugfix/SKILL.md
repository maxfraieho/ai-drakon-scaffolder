---
name: sdd-bugfix
description: Guide and execute the SDD Bug Fix / Incident workflow (Template 2) for ai-drakon-scaffolder — root-cause first, RED test before any fix.
---

# SDD Bugfix Skill

When activated for a bug/incident task:

1. Read `docs/for-agents/sdd-development-methodology.md`, section "ШАБЛОН 2" (Bug Fix / Incident), and follow it literally.
2. Root cause first, exact `file:line`, no silent `try/except: pass` masking.
3. Create a regression test that reproduces the bug. Run `python3 -m pytest tests/` — the test MUST fail (RED) before touching implementation code.
4. Check blast radius via gitnexus before the point-fix.
5. Confirm the regression test goes GREEN and the rest of the suite still passes.
6. Final report must state: root cause (`file:line`), the RED→GREEN test name, impact-analysis output, and whether `bash bin/sdd_verify.sh` passed.
