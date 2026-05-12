# codetomd — Code to Markdown

Utility that collects all source files from a project into one Markdown file.
Useful for sharing codebases with AI assistants (Claude, GPT, Gemini).

## Usage

**Interactive (prompts for path and output file):**
```bash
python codetomd.py
```

**Via shell script (sets up venv automatically):**
```bash
bash codetomd.sh
```

## What it does

1. Walks the project directory recursively
2. Skips: `.git`, `node_modules`, `venv`, `dist`, `__pycache__`, hidden dirs
3. Includes files with extensions: `.py`, `.js`, `.ts`, `.vue`, `.html`, `.css`, `.json`, `.md`
4. Outputs a single Markdown file with each file as a fenced code block:

```markdown
## src/lib/api.ts

```ts
export const api = { ... }
```
```

## Output

A single `project_code.md` (or custom name) that can be pasted into Claude/GPT for analysis.

## Related

- `scripts/save-diagrams.mjs` — Creates DRAKON diagrams from code analysis
- `docs/Python AST to DRAKON IR Research.pdf` — Research on Python→DRAKON conversion
