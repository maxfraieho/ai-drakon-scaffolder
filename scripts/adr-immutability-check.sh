#!/usr/bin/env bash
# ADR Immutability Check — blocks modification of accepted/deprecated/superseded ADR files.
# Allows ONLY changes to the "superseded-by" frontmatter field.
# Usage: as git pre-commit hook (no args, diffs staged changes) or standalone/CI
# (pass changed files as args; set DIFF_BASE to a git diff range, e.g.
# "origin/main...HEAD", instead of the default staged-changes diff).
set -euo pipefail

FAILED=0
DIFF_BASE="${DIFF_BASE:-}"

diff_for() {
  # $1 = file path. Uses DIFF_BASE range if set (CI), else staged diff (pre-commit hook).
  if [ -n "$DIFF_BASE" ]; then
    git diff "$DIFF_BASE" -- "$1"
  else
    git diff --cached -- "$1"
  fi
}

# Get list of changed ADR files (staged or from args)
if [ "$#" -gt 0 ]; then
  CHANGED_FILES="$@"
else
  CHANGED_FILES=$(git diff --cached --name-only --diff-filter=M -- 'docs/adr/0*.md' 2>/dev/null || true)
fi

for f in $CHANGED_FILES; do
  # Skip if file doesn't match ADR pattern
  [[ "$f" =~ docs/adr/0[0-9]{3,4}-.*\.md$ ]] || continue

  # Read status from HEAD version
  STATUS=$(git show HEAD:"$f" 2>/dev/null | sed -n '/^---$/,/^---$/{ /^status:/{ s/^status:[[:space:]]*"\{0,1\}//; s/"\{0,1\}[[:space:]]*$//; p; } }' | head -1)

  # Check if status is immutable (accepted, deprecated, superseded)
  case "$STATUS" in
    accepted*|deprecated*|superseded*)
      # Check if ONLY superseded-by field changed
      DIFF=$(diff_for "$f" | grep '^[+-]' | grep -v '^[+-][+-][+-]' | grep -v '^[+-]superseded-by:' || true)
      if [ -n "$DIFF" ]; then
        echo "❌ BLOCKED: '$f' has status '$STATUS' and is immutable."
        echo "   Only 'superseded-by' field changes are allowed."
        echo "   Create a new ADR with 'supersedes' instead."
        FAILED=1
      fi
      ;;
  esac
done

# Also check SVG assets for immutable ADRs
if [ -n "$DIFF_BASE" ]; then
  CHANGED_ASSETS=$(git diff --name-only --diff-filter=M "$DIFF_BASE" -- 'docs/adr/assets/0*.svg' 2>/dev/null || true)
else
  CHANGED_ASSETS=$(git diff --cached --name-only --diff-filter=M -- 'docs/adr/assets/0*.svg' 2>/dev/null || true)
fi
for f in $CHANGED_ASSETS; do
  # Extract ADR number from filename like 0015-something.svg
  ADR_NUM=$(basename "$f" | grep -oP '^\d{4}' || true)
  [ -z "$ADR_NUM" ] && continue

  # Find matching ADR
  ADR_FILE=$(find docs/adr -maxdepth 1 -name "${ADR_NUM}-*.md" | head -1)
  [ -z "$ADR_FILE" ] && continue

  STATUS=$(git show HEAD:"$ADR_FILE" 2>/dev/null | sed -n '/^---$/,/^---$/{ /^status:/{ s/^status:[[:space:]]*"\{0,1\}//; s/"\{0,1\}[[:space:]]*$//; p; } }' | head -1)
  case "$STATUS" in
    accepted*|deprecated*|superseded*)
      echo "❌ BLOCKED: '$f' belongs to ADR $ADR_NUM (status: '$STATUS') and is immutable."
      FAILED=1
      ;;
  esac
done

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "💡 ADR immutability rule: accepted/deprecated ADRs cannot be modified."
  echo "   See ADR-0015 for details."
  exit 1
fi

exit 0
