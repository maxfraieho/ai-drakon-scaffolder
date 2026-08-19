#!/usr/bin/env bash
# Check for raw named Tailwind colors in React components & pages outside astryx-migrated
# (detects bg-slate/gray/zinc/neutral-*, text-white, text-gray/slate-*, etc.)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR"

echo "=== Checking for raw named Tailwind colors in pages & workspace/astryx components ==="

VIOLATIONS=0
CHECKED_FILES=0
SKIPPED_FILES=0

shopt -s globstar nullglob

FILES=()
for f in src/pages/*.tsx src/components/astryx/*.tsx src/components/astryx/**/*.tsx src/components/workspace/*.tsx src/components/workspace/**/*.tsx; do
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

  # Search for raw named Tailwind colors in className or string templates
  matches=$(grep -nE '\b(bg-(slate|gray|zinc|neutral)-[0-9a-z/]+|text-white\b|text-(slate|gray|zinc|neutral)-[0-9a-z/]+)' "$file" || true)
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
  echo "❌ Found $VIOLATIONS raw named Tailwind color violation(s) in non-migrated files."
  echo "Colors MUST use canonical Astryx tokens (--astryx-color-brand, --astryx-surface-*, --astryx-text-*, --astryx-border-*)."
  echo "See docs/for-agents/DESIGN.md and specs/003-astryx-remediation/plan.md."
  exit 1
fi

echo "✅ All named-color token checks passed (0 violations in non-migrated files)."
exit 0
