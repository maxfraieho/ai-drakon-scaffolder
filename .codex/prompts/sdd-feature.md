---
description: Execute SDD Feature Workflow (Template 1) for ai-drakon-scaffolder
---

Ціль: $ARGUMENTS

1. Прочитай `.agents/skills/sdd-feature/SKILL.md` і виконай його буквально.
2. Інваріанти: `.specify/constitution.md`. MUST-правила: `AGENTS.md`.
3. Номер `specs/` визначай через `ls specs/` — не з пам'яті.
4. Фінальний звіт: створені файли, impact-аналіз, `python3 -m pytest tests/`, `bash bin/sdd_verify.sh`.
