#!/usr/bin/env bash
# Check for raw hex colors in className/style in React components and pages
# (excluding .css files and files/lines marked with 'astryx-migrated')
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR"

echo "=== Checking for raw hex colors in React components & pages ==="

VIOLATIONS=0
CHECKED_FILES=0
SKIPPED_FILES=0

shopt -s globstar nullglob

FILES=()
for f in src/pages/*.tsx src/components/*.tsx src/components/**/*.tsx; do
  [ -f "$f" ] && FILES+=("$f")
done

# Remove duplicates if any
readarray -t UNIQUE_FILES < <(printf '%s\n' "${FILES[@]}" | sort -u)

for file in "${UNIQUE_FILES[@]}"; do
  CHECKED_FILES=$((CHECKED_FILES + 1))

  # Skip files that have the migration bridge class
  if grep -q "astryx-migrated" "$file"; then
    SKIPPED_FILES=$((SKIPPED_FILES + 1))
    continue
  fi

  # Search for raw hex color in className or style
  matches=$(grep -nE '(className|style).*#[0-9a-fA-F]{3,6}' "$file" || true)
  if [ -n "$matches" ]; then
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      # Skip if this specific line has astryx-migrated
      if [[ "$line" =~ astryx-migrated ]]; then
        continue
      fi
      echo "  ❌ $file:$line"
      VIOLATIONS=$((VIOLATIONS + 1))
    done <<< "$matches"
  fi
done

echo "---------------------------------------------------------------"
echo "Checked: $CHECKED_FILES files ($SKIPPED_FILES skipped via astryx-migrated)"

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "❌ Found $VIOLATIONS raw hex color violation(s) in non-migrated files."
  echo "Amber-brand and UI colors MUST use canonical Astryx tokens (--astryx-color-brand, --astryx-surface-*, --astryx-text-*, --astryx-border-*)."
  echo "See docs/for-agents/DESIGN.md and docs/adr/0009-astryx-canonical-design-system.md."
  exit 1
fi

echo "✅ All Astryx token checks passed (0 raw hex violations in non-migrated files)."
exit 0
