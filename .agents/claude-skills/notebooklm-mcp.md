---
name: notebooklm-mcp
description: Interact with Google NotebookLM via the local MCP server at 192.168.3.234:8002. Use when adding documents/sources to NotebookLM notebooks, listing notebooks or sources, or any NotebookLM operation via the local MCP proxy (not notebooklm-py CLI). Triggers on: "add to NotebookLM", "update drn-ai", "add source to notebook", "list NotebookLM notebooks".
---

# NotebookLM MCP

MCP server: `http://192.168.3.234:8002/mcp`  
Notebook **drn-ai** ID: `6139067a-5776-4b29-8869-7c9f9aed475c`

## Use the bundled script

```bash
SCRIPT=~/.claude/skills/notebooklm-mcp/scripts/notebooklm_mcp.py

# List notebooks
python3 $SCRIPT list-notebooks

# List sources in drn-ai
python3 $SCRIPT list-sources 6139067a-5776-4b29-8869-7c9f9aed475c

# Add a markdown file
python3 $SCRIPT add-text 6139067a-5776-4b29-8869-7c9f9aed475c "Title" /path/to/file.md
```

## Protocol notes

- GET /mcp → grab `mcp-session-id` header (even from 4xx response)
- POST `initialize` → POST `notifications/initialized` (no-reply) → POST `tools/call`
- Response envelope: `data: {"result":{"content":[{"type":"text","text":"<JSON>"}]}}`
  Unwrap: parse `content[0].text` as JSON to get the actual result
- `sources_add_text` requires: `notebook_id`, `title`, `content` (not `text`)

## Environment overrides

```bash
export NOTEBOOKLM_MCP_HOST=192.168.3.234
export NOTEBOOKLM_MCP_PORT=8002
```
