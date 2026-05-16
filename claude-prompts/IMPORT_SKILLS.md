# Skills Import — для нового Claude

Цей промт допомагає синхронізувати skills між машинами в мережі.

## Перевірити які skills є

```bash
ls ~/.claude/skills/ | grep -v '\.' | sort
```

## Порівняти з еталоном (rpi3b, 192.168.3.184)

```bash
# Еталонна машина — rpi3b
# Перевірити diff:
MY=$(ls ~/.claude/skills/ | grep -v '\.' | sort)
REF=$(sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
      'ls ~/.claude/skills/ | grep -v "\." | sort -u')
echo "=== У мене є, в еталоні немає ==="
comm -23 <(echo "$MY") <(echo "$REF") 2>/dev/null
echo "=== В еталоні є, у мене немає ==="
comm -13 <(echo "$MY") <(echo "$REF") 2>/dev/null
```

## Синхронізувати відсутні (з rpi3b → поточна машина)

```bash
# Пакуємо всі skills на rpi3b
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'cd ~/.claude/skills && tar czf /tmp/all_skills.tar.gz $(ls | grep -v "\.")'

# Завантажуємо
sshpass -p '805235io.' scp -o StrictHostKeyChecking=no \
  vokov@192.168.3.184:/tmp/all_skills.tar.gz /tmp/

# Встановлюємо (тільки відсутні — --keep-old-files)
cd ~/.claude/skills && tar xzf /tmp/all_skills.tar.gz --keep-old-files 2>/dev/null
echo "Синхронізовано: $(ls | grep -v '\\.' | wc -l) skills"
```

## Повний список skills на rpi3b (еталон, 2026-05-16)

```
algorithmic-art        angular-architect      api-designer
architecture-designer  ast-grep               atlassian-mcp
brainstorming          brand-guidelines       canvas-design
chaos-engineer         cli-developer          cloud-architect
code-documenter        code-reviewer          codex
commands               composition-patterns   condition-based-waiting
cpp-pro                csharp-developer       defense-in-depth
dispatching-parallel-agents  doc-indexer      documentation-review
document-skills        executing-plans        find-skills
finishing-a-development-branch  flutter-expert  frontend-design
golang-pro             internal-comms         kubernetes-specialist
laravel-specialist     make-interfaces-feel-better  mcp-builder
notebooklm             obsidian-markdown      php-pro
react-best-practices   receiving-code-review  requesting-code-review
root-cause-tracing     sharing-skills         skill-audit
skill-creator          slack-gif-creator      spring-boot-engineer
subagent-driven-development  systematic-debugging  template-skill
test-driven-development  testing-anti-patterns  testing-skills-with-subagents
theme-factory          using-git-worktrees    using-superpowers
vercel-composition-patterns  vercel-react-best-practices  vercel-react-native-skills
verification-before-completion  webapp-testing  web-artifacts-builder
web-design-guidelines  writing-plans          writing-skills
```

## Після синхронізації — перезапусти Claude Code

Skills завантажуються при старті сесії. Після копіювання — нова сесія (`/exit` → знову відкрити).

## Додаткові налаштування (settings.json)

Скопіювати з rpi3b якщо потрібно:
```bash
sshpass -p '805235io.' scp -o StrictHostKeyChecking=no \
  vokov@192.168.3.184:~/.claude/settings.json \
  ~/.claude/settings.json.rpi3b-ref
# Вручну перенести потрібні параметри (не перезаписувати повністю!)
```

Ключові параметри з rpi3b settings.json:
- `"alwaysThinkingEnabled": true`
- `"skillListingBudgetFraction": 0.05`
- `"extraKnownMarketplaces"`: superpowers-marketplace + openai-codex
- `"enabledPlugins"`: `"codex@openai-codex": true`
