---
tags:
  - domain:agent
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "Довідник навичок AGY (AGY Skills)"
lang: uk
---

# Довідник навичок AGY (AGY Skills)

Навички для `agy` (Antigravity CLI) для його конфігурації як виконавця документації та аналізу для платформи AI-DRAKON.

## Встановлення на Windows

Скопіюйте кожну папку навички у вашу директорію плагінів:

```
C:\Users\vokov\.gemini\config\plugins\ai-drakon\skills\
├── 00-bootstrap\SKILL.md
├── 01-docs-agent\SKILL.md
└── 02-repo-analyzer\SKILL.md
```

PowerShell (запустіть з кореня проекту після `git pull`):
```powershell
$dest = "C:\Users\vokov\.gemini\config\plugins\ai-drakon\skills"
New-Item -ItemType Directory -Force -Path $dest
Copy-Item -Recurse -Force .\docs\agents\agy\00-bootstrap $dest\
Copy-Item -Recurse -Force .\docs\agents\agy\01-docs-agent $dest\
Copy-Item -Recurse -Force .\docs\agents\agy\02-repo-analyzer $dest\
```

## Порядок виконання

1. **`00-bootstrap`** — завжди першим. AGY вивчає блокнот NotebookLM `drn-ai`, синхронізує MemPalace.
2. **`02-repo-analyzer`** — якщо дані застарілі або після завершення нового спринту розробки.
3. **`01-docs-agent`** — генерує документацію (LangGraph, DRAKON IR, frontend, worker API).

## Вимоги до MCP

Сервер MemPalace MCP має бути налаштований у `mcp_config.json`:
```json
{
  "mcpServers": {
    "mempalace": {
      "command": "...",
      "args": [...]
    },
    "notebooklm-sse": {
      "...": "already configured"
    }
  }
}
```

## Блокнот NotebookLM

Блокнот: `drn-ai`
Вміст: PDF-файли з налаштуваннями Claude Code, архітектурою проекту, навичками та хуками.
AGY читає це як своє первинне джерело знань під час етапу bootstrap.

---

## Семантичні зв'язки

**Цей документ є частиною:** [[agents/agy/_INDEX]]
**Цей документ пов'язаний з:**
- [[00-bootstrap/SKILL]] — навичка початкового запуску
- [[01-docs-agent/SKILL]] — навичка документування
- [[02-repo-analyzer/SKILL]] — навичка аналізу репозиторію
- [[03-dataview-dql/SKILL]] — навичка роботи з DQL
**Читати далі:** [[00-bootstrap/SKILL]]
