# ai-drakon-scaffolder — SDD Workflow

Цей проєкт використовує Spec-Driven Development (SDD). Правила — у `.specify/constitution.md`, процедура — у `docs/for-agents/sdd-development-methodology.md`.

## Швидкий старт

```bash
git config core.hooksPath .githooks   # якщо ще не виконано (copier робить це автоматично)
chmod +x bin/sdd_verify.sh .githooks/pre-commit scripts/sdd_llm_judge.py
```

Заповни `~/.ai-drakon-scaffolder-secrets/sdd_judge.env` (поза git!) якщо плануєш увімкнути LLM-арбітра:

```
SDD_JUDGE_URL=<openai-compatible endpoint>
SDD_JUDGE_KEY=<bearer token>
SDD_JUDGE_MODEL=<model/slot name>
```



## Команди

Дивись `.claude/commands/sdd/`, `.codex/prompts/`, `.agents/skills/sdd-*` — три різні "двері" до одної й тієї ж методології, під різних агентів (Claude Code / Codex CLI / AGY). Деталі — `docs/for-agents/sdd-development-methodology.md`.

## Оновлення з шаблону

Цей проєкт згенеровано з `sdd-universal-template` через Copier. Щоб підтягнути оновлення шаблону:

```bash
uvx copier update --trust
```

Твій `.specify/constitution.md`, `.specify/feature.json`, `AGENTS.md` захищені `_skip_if_exists` — Copier їх не перезапише.

## Brownfield (існуючий проєкт)?

Якщо це не новий проєкт, а ретрофіт SDD на вже написаний код — читай `docs/brownfield-migration-guide.md` ПЕРЕД тим як писати перший `spec.md`.
