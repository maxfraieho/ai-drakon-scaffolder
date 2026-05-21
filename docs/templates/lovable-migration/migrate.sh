#!/bin/bash
# lovable-migrate.sh — переключає Lovable repo на новий
# Використання: lovable-migrate.sh <new-github-repo-url>
# Приклад:      lovable-migrate.sh https://github.com/maxfraieho/ai-drakon-v2

set -e

NEW_URL="$1"
REPO_DIR=~/workspace/ai-drakon-setup
REMOTE_NAME=drakon-diagram-flow
PROMPT_FILE="$REPO_DIR/lovable-prompts/00-safe-migration-init.md"

if [ -z "$NEW_URL" ]; then
  echo "Використання: $0 <new-github-repo-url>"
  echo "Приклад:      $0 https://github.com/maxfraieho/ai-drakon-v2"
  exit 1
fi

# Витягуємо owner/repo з URL
REPO=$(echo "$NEW_URL" | sed "s|https://github.com/||")
echo "Міграція на: $REPO"

cd "$REPO_DIR"

# 1. Оновлюємо remote
OLD_URL=$(git remote get-url "$REMOTE_NAME" 2>/dev/null || echo "немає")
echo ""
echo "1. Оновлення remote..."
echo "   Було:  $OLD_URL"
echo "   Стало: $NEW_URL"
git remote set-url "$REMOTE_NAME" "$NEW_URL"
echo "   ✓ Remote оновлено"

# 2. Force push коду
echo ""
echo "2. Push коду у новий repo..."
git push "$REMOTE_NAME" main --force
echo "   ✓ Код запушено"

# 3. Встановлюємо MIRROR_TOKEN в новому repo
echo ""
echo "3. Встановлення MIRROR_TOKEN secret..."
GH_TOKEN=$(gh auth token 2>/dev/null || echo "")
if [ -n "$GH_TOKEN" ]; then
  gh secret set MIRROR_TOKEN --repo "$REPO" --body "$GH_TOKEN"
  echo "   ✓ MIRROR_TOKEN встановлено в $REPO"
else
  echo "   ⚠ gh не авторизований — встанови MIRROR_TOKEN вручну в $REPO > Settings > Secrets"
fi

# 4. Зберігаємо новий repo у файл-довідці
echo "$REPO" > ~/.lovable-current-repo
echo ""
echo "   ✓ Поточний Lovable repo збережено: ~/.lovable-current-repo"

# 5. Виводимо початковий промт
echo ""
echo "══════════════════════════════════════════"
echo "  Початковий Lovable промт (скопіюй):"
echo "══════════════════════════════════════════"
if [ -f "$PROMPT_FILE" ]; then
  cat "$PROMPT_FILE"
else
  echo "⚠ Файл $PROMPT_FILE не знайдено"
fi
echo "══════════════════════════════════════════"
echo ""
echo "Готово! Підключи $NEW_URL у новому Lovable акаунті."
