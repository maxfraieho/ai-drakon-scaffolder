---
name: sdd-teaching
description: Guide and execute the SDD Agent Teaching / HITL Rule Formalization workflow (Template 5) for ai-drakon-scaffolder.
---

# SDD Teaching Skill

> **This project has `enable_hitl_precedence: false`.** This skill assumes a
> human-in-the-loop correction/teaching loop exists (an operator can override
> model output and that override gets formalized into a rule). If this project
> has no such loop, delete this skill — do not force-fit it.

When activated for a human-in-the-loop teaching/rule-formalization task:

1. Read `docs/for-agents/sdd-development-methodology.md`, section "ШАБЛОН 5" (HITL Agent Teaching), and follow it literally.
2. Human operator corrections have 100% priority over model predictions.
3. Read the latest relevant log/state, identify the pattern being corrected.
4. Record a `shadow`-status rule in this project's rules/heuristics store.
7. Add a unit test verifying rule selection in the priority cascade.
8. Final report must state: the shadow rule recorded, test result, and promotion status.
