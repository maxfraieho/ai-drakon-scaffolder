# Skills Export — OrangePi → Dev Server (192.168.3.184)

Цей файл описує як імпортувати skills з OrangePi (192.168.3.161) на dev server.

## Які skills є тут і відсутні на dev server

```
algorithmic-art      ast-grep             brainstorming
brand-guidelines     canvas-design        codex
commands             condition-based-waiting  doc-indexer
document-skills      documentation-review internal-comms
notebooklm           obsidian-markdown    sharing-skills
skill-audit          slack-gif-creator    template-skill
testing-anti-patterns  testing-skills-with-subagents  theme-factory
verification-before-completion  web-artifacts-builder
```

## Які пропустити (прив'язані до зовнішніх програм)

- `notebooklm` — потребує NotebookLM MCP (на dev server не налаштований)
- `obsidian-markdown` — потребує Obsidian
- `codex` / `commands` — перевір чи є Codex CLI на dev server перед імпортом

## Команди для виконання на dev server (192.168.3.184)

```bash
# 1. Пакуємо skills на OrangePi (192.168.3.161)
ssh vokov@192.168.3.161 '
  cd ~/.claude/skills
  tar czf /tmp/opi_skills.tar.gz \
    algorithmic-art ast-grep brainstorming brand-guidelines \
    canvas-design condition-based-waiting doc-indexer \
    document-skills documentation-review internal-comms \
    sharing-skills skill-audit slack-gif-creator template-skill \
    testing-anti-patterns testing-skills-with-subagents \
    theme-factory verification-before-completion web-artifacts-builder
'

# 2. Копіюємо на dev server
scp vokov@192.168.3.161:/tmp/opi_skills.tar.gz /tmp/opi_skills.tar.gz

# 3. Встановлюємо (тільки відсутні)
cd ~/.claude/skills && tar xzf /tmp/opi_skills.tar.gz --keep-old-files 2>/dev/null
echo "Всього skills: $(ls | grep -v '\.' | wc -l)"

# 4. Верифікація
for s in brainstorming verification-before-completion executing-plans; do
  [ -f ~/.claude/skills/$s/SKILL.md ] && echo "✅ $s" || echo "❌ $s MISSING"
done
```

## Після імпорту

Перезапусти Claude Code (`/exit` → відкрити знову) — skills завантажуються при старті сесії.

## Перевірити diff перед виконанням

```bash
MY=$(ls ~/.claude/skills/ | grep -v '\.' | sort)
REF=$(ssh vokov@192.168.3.161 'ls ~/.claude/skills/ | grep -v "\." | sort')
echo "=== Є на OrangePi, немає тут ==="
comm -13 <(echo "$MY") <(echo "$REF")
```
