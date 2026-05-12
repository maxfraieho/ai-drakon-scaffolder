# AI-DRAKON Platform — Architecture

> Last updated: 2026-05-12

## System Overview

AI-DRAKON is a platform for generating DRAKON visual diagrams from source code. It combines:
- **Lovable** frontend (React/Vite/TypeScript) hosted on Cloudflare Pages
- **Cloudflare Worker** (MCP server + MinIO S3 proxy)
- **Python AST microservice** for Python code analysis
- **Agent integration** via goclaw + MCP protocol

```
Developer / Claude Code
    ↓ MCP (Streamable HTTP)
drakon-mcp-worker.maxfraieho.workers.dev
    ├── drakon.analyzecodebase → GitHub API + research.exodus.pp.ua/analyze-files
    ├── drakon.savediagram    → MinIO S3
    ├── drakon.listdiagrams   → MinIO S3
    └── drakon.validateir     → IR validation

research.exodus.pp.ua (Python AST Microservice)
    → 192.168.3.184:8088 (FastAPI)
    → Python ast.NodeVisitor → DRAKON IR

ai-drakon-setup.pages.dev (Lovable Frontend)
    → Diagram editor, GitHub analysis UI, Settings
```

## Infrastructure

| Service | Host | Port | Public URL | Notes |
|---------|------|------|-----------|-------|
| Cloudflare Worker (MCP) | CF Edge | — | drakon-mcp-worker.maxfraieho.workers.dev | MCP_API_KEY secret |
| Python AST Analyzer | 192.168.3.184 | 8088 | research.exodus.pp.ua | OpenRC: ast-analyzer |
| goclaw (coding agent) | 192.168.3.184 | 18790 | — | port 18880 = SlotRouter |
| free-claude-code proxy | 192.168.3.184 | 18880 | openai-proxy.exodus.pp.ua | SlotRouter → NIM |
| Lovable Frontend | CF Pages | — | ai-drakon-setup.pages.dev | builds from .lovable/ |
| MinIO | 192.168.3.161 | 9001/9100 | minio.exodus.pp.ua | MINIO_SECRET_KEY needed |

## Cloudflare Worker Secrets

| Secret | Status | Notes |
|--------|--------|-------|
| JWT_SECRET | ✅ set | Auth token signing |
| OWNER_PASSWORD_HASH | ✅ set | Owner login |
| MCP_API_KEY | ✅ `drakon-mcp-2026` | MCP auth |
| GITHUB_TOKEN | ✅ set | GitHub repo access |
| MINIO_SECRET_KEY | ❌ missing | saveDiagram won't work until set |

## Repository

```
ai-drakon-setup/
├── .lovable/src/          ← Lovable manages (React/TS)
├── src/                   ← Mirror of .lovable/src/ (sync manually)
├── cloudflare-worker/
│   └── worker-mcp-drakon.js  ← Worker (plain JS, no build)
├── docs/
│   ├── architecture.md    ← this file
│   ├── agent-workflow.md  ← development cycle with agents
│   ├── services.md        ← running services reference
│   └── plans/             ← implementation plans
└── wrangler.jsonc         ← CF Worker config
```

**IMPORTANT invariants:**
- `drakonwidget.js` — DO NOT touch (external library)
- DRAKON IR has no X/Y coordinates (layout is automatic)
- `src/` must always be synced with `.lovable/src/` after Lovable changes
- FIFO for all diagram mutations
- New IR fields must be optional
