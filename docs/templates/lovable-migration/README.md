---
tags:
  - domain:kb
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "Міграція акаунту Lovable"
lang: uk
---

# Lovable Account Migration

Переїзд на новий Lovable акаунт зі збереженням CF Pages + усіх налаштувань.

## Архітектура

```
[Lovable] -> push -> [new-repo] -> GitHub Action (mirror) -> [ai-drakon-setup] -> CF Pages
```

CF Pages завжди будує з `maxfraieho/ai-drakon-setup`.
Lovable пише у будь-який repo — GitHub Action дзеркалює в `ai-drakon-setup`.

---

## Швидка міграція (1 команда)

```bash
# На сервері 192.168.3.184
lovable-migrate.sh https://github.com/maxfraieho/<new-repo>
```

Скрипт автоматично:
1. Оновлює git remote `drakon-diagram-flow` на новий URL
2. Force push поточного коду в новий repo
3. Встановлює `MIRROR_TOKEN` secret через `gh` CLI
4. Виводить початковий Lovable промт для копіювання

**Вимоги:** `gh` CLI авторизований (`gh auth status`), скрипт в `~/bin/lovable-migrate.sh`.

---

## Потім у Lovable

1. Create project -> Import from GitHub -> обрати **new-repo**
2. Перший промт — скопіювати з `lovable-prompts/00-safe-migration-init.md`
   (НЕ `00-project-init.md` — він генерує scaffold і стирає код)
3. Lovable підтвердить що бачить репо -> далі фіча-промти

---

## Ручні кроки (якщо скрипт недоступний)

```bash
cd ~/workspace/ai-drakon-setup

# 1. Оновити remote
git remote set-url drakon-diagram-flow https://github.com/maxfraieho/<new-repo>

# 2. Push коду
git push drakon-diagram-flow main --force

# 3. MIRROR_TOKEN secret
gh secret set MIRROR_TOKEN --repo maxfraieho/<new-repo> --body "$(gh auth token)"

# 4. Перевірити mirror workflow
gh run list --repo maxfraieho/<new-repo> --limit 3
```

---

## Файли шаблону

| Файл | Призначення |
|------|-------------|
| `migrate.sh` | Скрипт автоматичної міграції |
| `lovable-prompts/00-safe-migration-init.md` | Початковий промт (не генерує код) |
| `lovable-prompts/00-project-init.md` | Промт для нового проекту з нуля (небезпечний для міграції) |
| `lovable-prompts/00-handoff.md` | Контекст архітектури для Lovable |

---

## Відомі обмеження

- CF Pages API не підтримує зміну repo source — тому mirror архітектура
- MIRROR_TOKEN має мати `repo` scope для обох repos
- `--force` при push обов'язковий — Lovable може додати початкові коміти

---

## Семантичні зв'язки

**Цей документ є частиною:** [[templates/_INDEX]]
**Цей документ пов'язаний з:**
- [[templates/lovable-migration/lovable-prompts/00-safe-migration-init]] — Промпт ініціалізації безпечної міграції Lovable
- [[templates/lovable-migration/lovable-prompts/00-project-init]] — Промпт ініціалізації проекту Lovable
**Читати далі:** [[templates/lovable-migration/lovable-prompts/00-handoff]]
