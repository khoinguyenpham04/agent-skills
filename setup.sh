#!/usr/bin/env bash
# Links every skill in ~/.agents/skills into each agent harness's skills dir.
# Idempotent — safe to re-run after adding or removing skills.
set -euo pipefail

CANON="$HOME/.agents/skills"

TARGETS=(
  "$HOME/.claude/skills"            # Claude Code
  "$HOME/.codex/skills"             # Codex (also reads ~/.agents natively)
  "$HOME/.cursor/skills"            # Cursor (also reads ~/.agents natively)
  "$HOME/.copilot/skills"           # GitHub Copilot
  "$HOME/.gemini/skills"            # Gemini CLI
  "$HOME/.kiro/skills"              # Kiro CLI
  "$HOME/.cline/skills"             # Cline
  "$HOME/.config/opencode/skills"   # OpenCode
  "$HOME/.codeium/windsurf/skills"  # Windsurf
  "$HOME/.config/devin/skills"      # Devin (also reads ~/.agents natively)
)

for target in "${TARGETS[@]}"; do
  mkdir -p "$target"
  for skill in "$CANON"/*/; do
    name=$(basename "$skill")
    ln -sfn "$CANON/$name" "$target/$name"
  done
  # Drop links whose canonical dir was removed
  find -L "$target" -mindepth 1 -maxdepth 1 -type l -delete 2>/dev/null || true
done

# Cursor local plugins are rejected when symlinked from outside plugins/local,
# so vendored plugins are copied instead of linked.
if [ -d "$HOME/.agents/plugins" ]; then
  mkdir -p "$HOME/.cursor/plugins/local"
  for plugin in "$HOME/.agents/plugins"/*/; do
    name=$(basename "$plugin")
    rm -rf "$HOME/.cursor/plugins/local/$name"
    cp -R "$plugin" "$HOME/.cursor/plugins/local/$name"
  done
fi

echo "Linked $(find "$CANON" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ') skills into ${#TARGETS[@]} harness dirs."
