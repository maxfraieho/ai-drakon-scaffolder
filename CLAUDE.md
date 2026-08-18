<

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project may be indexed by GitNexus as **ai-drakon-scaffolder**. Use the GitNexus MCP tools to understand code, assess impact, and navigate safely only when the index exists and matches the checkout.

> Index unavailable or stale? Run `node .gitnexus/run.cjs analyze` from the project root (or `npx gitnexus analyze`) and verify repository name, branch, and last commit before relying on results. If reindexing is impossible, report the limitation and use direct code reading as a documented fallback; never claim an unavailable/stale graph is current.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ai-drakon-scaffolder/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ai-drakon-scaffolder/clusters` | All functional areas |
| `gitnexus://repo/ai-drakon-scaffolder/processes` | All execution flows |
| `gitnexus://repo/ai-drakon-scaffolder/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

# Astryx UI Framework Guidelines

This project uses the **Astryx Design System** (Meta/Facebook agent-ready standard).

- **CSS Tokens:** Import `@/styles/astryx.css` with `[data-astryx-theme="astryx"]` / `[data-astryx-theme="dark"]`.
- **Layout Shell:** Use `WorkspaceShell` with `AstryxHeader` and `AstryxSideNav`.
- **Buttons & Badges:** Use `astryx-button` (`primary`, `ghost`, `sm`, `md`) and `astryx-badge` (`primary`, `success`).
- **Semantic Selectors:** Always include `data-variant`, `data-size`, and `data-testid` attributes on new components to preserve agent-readiness.

# NotebookLM & GitNexus Copilot Rule

For complex refactoring, multi-file feature development, or architectural reviews:
- **MUST activate the `notebooklm-gitnexus-copilot` skill** to offload codebase context and execution flow analysis.
- Generate project PDF via `/home/vokov/resume/run_md_service.sh --batch --source <path> --output <pdf_path> --structure-only`.
- Initialize a NotebookLM notebook (`notebooks_create`), attach PDF and GitNexus graph link (`gitnexus://repo/...`), and consult the built-in NotebookLM agent (`chat_ask`) for developer recommendations.
- **MUST enforce `rsync -av --delete src/ .lovable/src/`** after modifying any source file to guarantee 100% sync before committing for Cloudflare Pages deployment.
