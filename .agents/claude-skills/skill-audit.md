---
name: skill-audit
description: Use when auditing the skills installed in ~/.claude/skills/ for structure quality, metadata completeness, and instruction usefulness. Run after installing new skills, before sharing skills upstream, or during periodic skill maintenance.
---

# Skill Audit

## Audit checklist per skill

### Structure
- [ ] Has `SKILL.md` (not just a bare `.md` file)
- [ ] SKILL.md has valid YAML frontmatter block (--- delimiters)

### Metadata quality
- [ ] `name:` field present and matches directory name
- [ ] `description:` field present, specific (not generic placeholder)
- [ ] Description tells Claude WHEN to use the skill (not just what it is)

### Instruction quality
- [ ] Has actual instructions (not empty after frontmatter)
- [ ] Not just a stub (more than 3 lines of content)
- [ ] Instructions are actionable (tell Claude what to DO)
- [ ] Has concrete examples where applicable

### Safety
- [ ] No shell injection patterns (backtick execution in description)
- [ ] No hardcoded secrets or credentials
- [ ] No aggressive permission escalation

## Audit output format

```
## Skill Audit Report — <date>

| Skill | Structure | Metadata | Instructions | Safety | Overall |
|-------|-----------|----------|--------------|--------|---------|
| skill-name | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | OK/STUB/UNSAFE |

### Issues requiring action:
- [skill-name] STUB: description is placeholder text
- [skill-name] MISSING: no instructions after frontmatter
```

## Running the audit

```bash
for dir in ~/.claude/skills/*/; do
  skill=$(basename "$dir")
  skill_md="$dir/SKILL.md"
  if [ ! -f "$skill_md" ]; then
    echo "FAIL [$skill]: no SKILL.md"
    continue
  fi
  lines=$(wc -l < "$skill_md")
  has_name=$(grep -c "^name:" "$skill_md" || true)
  has_desc=$(grep -c "^description:" "$skill_md" || true)
  echo "[$skill] lines=$lines name=$has_name desc=$has_desc"
done
```

## Stubs to fix

A skill is a stub if:
- description contains "Replace with" or "template"
- Body after frontmatter is empty or < 5 lines
- Instructions don't say when/how to use the skill

Action: fill with concrete guidance or remove.
