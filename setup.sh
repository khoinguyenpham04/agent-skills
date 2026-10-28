#!/usr/bin/env bash
# Links every skill in ~/.agents/skills into each agent harness's skills dir.
# Idempotent — safe to re-run after adding or removing skills.
set -euo pipefail

CANON="$HOME/.agents/skills"

# Harnesses that don't read ~/.agents/skills on their own.
TARGETS=(
  "$HOME/.claude/skills"            # Claude Code
  "$HOME/.copilot/skills"           # GitHub Copilot
  "$HOME/.kiro/skills"              # Kiro CLI
  "$HOME/.cline/skills"             # Cline
)

# Harnesses that read ~/.agents/skills natively: Codex, Cursor, Gemini CLI,
# OpenCode, Windsurf, Devin. Linking into their own dirs too would load every
# skill twice, so earlier links there are removed.
NATIVE=(
  "$HOME/.codex/skills"
  "$HOME/.cursor/skills"
  "$HOME/.gemini/skills"
  "$HOME/.config/opencode/skills"
  "$HOME/.codeium/windsurf/skills"
  "$HOME/.config/devin/skills"
)

# Remove links in $1 that point into $CANON. With "dangling", only those whose
# skill was removed; links the user made to anything else are left alone.
prune_links() {
  local dir=$1 mode=${2:-all} link dest
  [ -d "$dir" ] || return 0
  for link in "$dir"/*; do
    [ -L "$link" ] || continue
    dest=$(readlink "$link")
    # Absolute links from this script, or relative ones from `npx skills`.
    [[ "$dest" == "$CANON/"* || "$dest" == *".agents/skills/$(basename "$link")" ]] || continue
    if [ "$mode" = all ] || [ ! -e "$link" ]; then
      rm "$link"
    fi
  done
}

for target in "${TARGETS[@]}"; do
  mkdir -p "$target"
  for skill in "$CANON"/*/; do
    name=$(basename "$skill")
    ln -sfn "$CANON/$name" "$target/$name"
  done
  prune_links "$target" dangling
done

for dir in "${NATIVE[@]}"; do
  prune_links "$dir"
done

# pstack's model config lives at ~/.agents/rules/pstack-models.md; link it into
# ~/.cursor/rules/ so Cursor also auto-applies it (.mdc = alwaysApply rule).
if [ -f "$HOME/.agents/rules/pstack-models.md" ]; then
  mkdir -p "$HOME/.cursor/rules"
  ln -sfn "$HOME/.agents/rules/pstack-models.md" "$HOME/.cursor/rules/pstack-models.mdc"
fi

# Cursor local plugins are rejected when symlinked from outside plugins/local,
# so vendored plugins are copied instead of linked. Their skills live in
# skills/ (Cursor reads them from ~/.agents/skills), not inside the plugin.
if [ -d "$HOME/.agents/plugins" ]; then
  mkdir -p "$HOME/.cursor/plugins/local"
  for plugin in "$HOME/.agents/plugins"/*/; do
    name=$(basename "$plugin")
    rm -rf "$HOME/.cursor/plugins/local/$name"
    cp -R "$plugin" "$HOME/.cursor/plugins/local/$name"
  done
fi

echo "Linked $(find "$CANON" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ') skills into ${#TARGETS[@]} harness dirs; ${#NATIVE[@]} more read ~/.agents/skills directly."
