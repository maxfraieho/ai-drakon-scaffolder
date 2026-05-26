# AGY Skills — AI-DRAKON Documentation Agent

Skills for `agy` (Antigravity CLI) to configure it as documentation and analysis
worker for the AI-DRAKON platform.

## Install on Windows

Copy each skill folder to your plugins directory:

```
C:\Users\vokov\.gemini\config\plugins\ai-drakon\skills\
├── 00-bootstrap\SKILL.md
├── 01-docs-agent\SKILL.md
└── 02-repo-analyzer\SKILL.md
```

PowerShell (run from project root after `git pull`):
```powershell
$dest = "C:\Users\vokov\.gemini\config\plugins\ai-drakon\skills"
New-Item -ItemType Directory -Force -Path $dest
Copy-Item -Recurse -Force .\docs\agents\agy\00-bootstrap $dest\
Copy-Item -Recurse -Force .\docs\agents\agy\01-docs-agent $dest\
Copy-Item -Recurse -Force .\docs\agents\agy\02-repo-analyzer $dest\
```

## Execution Order

1. **`00-bootstrap`** — завжди першим. AGY вивчає NotebookLM `drn-ai`, синхронізує MemPalace.
2. **`02-repo-analyzer`** — якщо дані застарілі або після нового спринту.
3. **`01-docs-agent`** — генерує документацію (LangGraph, DRAKON IR, frontend, worker API).

## MCP Requirements

MemPalace MCP must be in `mcp_config.json`:
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

## NotebookLM Notebook

Notebook: `drn-ai`
Contents: PDFs of Claude Code config, project architecture, skills, hooks.
AGY reads this as its primary knowledge source during bootstrap.
