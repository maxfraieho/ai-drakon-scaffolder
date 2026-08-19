#!/usr/bin/env bash
# Install git hooks for this repository
set -euo pipefail

HOOK_DIR=$(git rev-parse --git-dir)/hooks
mkdir -p "$HOOK_DIR"

# Pre-commit hook
cat > "$HOOK_DIR/pre-commit" << 'HOOK'
#!/usr/bin/env bash
# Auto-installed by scripts/install-hooks.sh
bash scripts/adr-immutability-check.sh
HOOK

chmod +x "$HOOK_DIR/pre-commit"
echo "✅ Git hooks installed."
