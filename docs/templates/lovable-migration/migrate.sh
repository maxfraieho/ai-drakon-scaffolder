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

# Витягуємо owner/repo з URL (підтримка https:// та git@github.com:)
REPO=$(echo "$NEW_URL" | sed 's|https://github.com/||;s|git@github.com:||;s|\.git$||')
NEW_URL_CLEAN="https://github.com/$REPO"
echo "Міграція на: $REPO"

cd "$REPO_DIR"

# 1. Зберігаємо старий remote
OLD_URL=$(git remote get-url "$REMOTE_NAME" 2>/dev/null || echo "")
OLD_REPO=$(echo "$OLD_URL" | sed 's|https://github.com/||;s|git@github.com:||;s|\.git$||')

echo ""
echo "1. Оновлення remote..."
echo "   Було:  ${OLD_URL:-немає}"
echo "   Стало: $NEW_URL_CLEAN"
git remote set-url "$REMOTE_NAME" "$NEW_URL_CLEAN"
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

# 4b. Видалення старого repo
if [ -n "$OLD_REPO" ] && [ "$OLD_REPO" != "$REPO" ]; then
  echo ""
  echo "4b. Старий repo: $OLD_REPO"
  # Перевіряємо чи існує
  if gh repo view "$OLD_REPO" &>/dev/null; then
    printf "    Видалити $OLD_REPO? [y/N] "
    read -r CONFIRM_DELETE
    if [[ "$CONFIRM_DELETE" =~ ^[Yy]$ ]]; then
      gh repo delete "$OLD_REPO" --yes
      echo "    ✓ $OLD_REPO видалено"
    else
      echo "    — Пропущено (можна видалити вручну)"
    fi
  else
    echo "    — Repo не існує або вже видалено, пропускаємо"
  fi
fi

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
echo "Готово! Підключи $NEW_URL_CLEAN у новому Lovable акаунті."
