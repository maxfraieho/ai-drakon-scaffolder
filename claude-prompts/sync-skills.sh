#!/bin/bash
# sync-skills.sh — синхронізувати skills з rpi3b на поточну машину
# Запускати на ЦІЛЬОВІЙ машині
# Джерело: vokov@192.168.3.184 (rpi3b), пароль 805235io.

set -e
SRC="vokov@192.168.3.184"
PASS="805235io."
SKILLS_DIR="$HOME/.claude/skills"

echo "=== Sync skills from rpi3b ==="

# Перевірити що sshpass є
if ! command -v sshpass &>/dev/null; then
  echo "ERROR: sshpass не встановлено. Встанови: apt install sshpass / apk add sshpass"
  exit 1
fi

# Список skills на rpi3b
REF_SKILLS=$(sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SRC" \
  'ls ~/.claude/skills/ | grep -v "\." | sort -u')

# Список skills локально
MY_SKILLS=$(ls "$SKILLS_DIR" | grep -v '\.' | sort)

# Відсутні
MISSING=$(comm -13 <(echo "$MY_SKILLS") <(echo "$REF_SKILLS") 2>/dev/null | tr '\n' ' ')

if [ -z "$MISSING" ]; then
  echo "✓ Всі skills вже є ($(ls $SKILLS_DIR | grep -v '\.' | wc -l) skills)"
  exit 0
fi

echo "Missing: $MISSING"
echo "Завантажую..."

# Упакувати на rpi3b
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SRC" \
  "cd ~/.claude/skills && tar czf /tmp/missing_skills_sync.tar.gz $MISSING"

# Скачати
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no \
  "$SRC:/tmp/missing_skills_sync.tar.gz" /tmp/missing_skills_sync.tar.gz

# Встановити
cd "$SKILLS_DIR"
tar xzf /tmp/missing_skills_sync.tar.gz

echo "✓ Синхронізовано: $(ls $SKILLS_DIR | grep -v '\.' | wc -l) skills"
echo "Перезапусти Claude Code для активації."
