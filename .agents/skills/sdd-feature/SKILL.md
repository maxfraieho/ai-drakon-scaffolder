---
name: sdd-feature
description: Guide and execute the SDD Feature Development workflow (Template 1) for new features, endpoints, or UI components in ai-drakon-scaffolder.
---

# SDD Feature Skill

When activated for a new feature task:

1. Read `docs/for-agents/sdd-development-methodology.md`, section "ШАБЛОН 1" (Feature Development), and follow it literally — do not invent your own sequence.
2. Before writing the spec, read `.specify/constitution.md` — every invariant defined there must be reflected in `spec.md`.
3. Determine the next free `specs/<NNN>-<slug>/` by running `ls specs/` — never guess the number from memory.
4. Run impact analysis via gitnexus before modifying any existing symbol.
5. Follow the MUST rules in `AGENTS.md`.
6. Final report must state: files created, gitnexus impact-analysis output, `python3 -m pytest tests/` output, and whether `bash bin/sdd_verify.sh` passed.
