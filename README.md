# ~/.agents — global agent skills

Single source of truth for agent skills, so the same skill set works natively in Claude Code, Codex, Cursor, Copilot, Gemini, Kiro, Cline, OpenCode, Windsurf, and Devin. Codex, Cursor, Gemini CLI, OpenCode, Windsurf, and Devin read `~/.agents/skills` directly; the rest get symlinks.

## Bootstrap a new machine

```bash
git clone https://github.com/khoinguyenpham04/agent-skills ~/.agents
~/.agents/setup.sh
```

That's it — `setup.sh` links every skill in `skills/` into the skills dir of each harness that doesn't read `~/.agents/skills` (Claude Code, Copilot, Kiro, Cline), removes links it made that no longer point at a skill, removes its old links from the harnesses that read `~/.agents/skills` directly (so they don't load every skill twice), and copies `plugins/` into `~/.cursor/plugins/local/` (Cursor rejects plugin symlinks pointing outside that dir, so plugins are copied, not linked).

## Daily use

| Task | Command |
| --- | --- |
| Pull changes + relink | `~/.agents/sync.sh` |
| Add a skill | `npx skills add <repo> -g -a claude-code -a github-copilot -a kiro-cli -a cline` then `./setup.sh && git add -A && git commit && git push` |
| Add a subtree skill | `npx skills add "https://github.com/owner/repo/tree/main/subdir" -g -s <name> ...` then commit + push |
| Remove a skill | `rm -rf skills/<name>` then `./setup.sh && git add -A && git commit && git push` |
| Update upstream | `npx skills update` (only skills in `.skill-lock.json`; see below) then `git add -A && git commit && git push` |
| Edit a skill | Edit `skills/<name>/SKILL.md` directly, commit — propagates everywhere instantly |

## Layout

- `skills/<name>/SKILL.md` — every skill, upstream copies and custom ones, including pstack's
- `plugins/<name>/` — vendored Cursor plugins, minus their `skills/` (pstack: agents, automations, docs)
- `rules/pstack-models.md` — pstack's per-role model config, linked into `~/.cursor/rules/`
- `.skill-lock.json` — skills.sh lock file; kept in-repo so `npx skills update` behaves identically on every machine
- `setup.sh` / `sync.sh` — the linker and the pull+link ritual

### Where each skill comes from

- **In `.skill-lock.json`** — installed with `npx skills`; `npx skills update` refreshes them.
- **pstack** (55 skills: `poteto-mode`, `principle-*`, `arena`, `swarm`, …) — vendored from [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack); the version is in `plugins/pstack/plugin.json`. `npx skills update` doesn't touch them; update by hand (below).
- **Everything else not in the lock** (`adversarial-review`, `drop-deploy`, `emdash-social-posts`, `basin`, `cf-cli`, `gateway-workers`, `sandbox-*`, `workers-profiling`, …) — custom or copied in by hand; edit in place.

### Update pstack

```bash
tmp=$(mktemp -d) && git clone --depth 1 https://github.com/cursor/plugins "$tmp"
rsync -a --delete --exclude skills "$tmp/pstack/" plugins/pstack/
for s in "$tmp"/pstack/skills/*/; do rsync -a --delete "$s" "skills/$(basename "$s")/"; done
sed -i '' 's#](\.\./\.\./skills/#](../../../../skills/#g' plugins/pstack/docs/guide/*.md
sed -i '' 's#](\./skills/#](../../skills/#g' plugins/pstack/README.md
git diff --stat  # re-apply local edits (e.g. skills/bro) the update overwrote
```

The `sed` lines repoint the plugin docs' links at `skills/`, since the plugin no longer carries its own copy.

Vendored skills retain their upstream licenses (MIT). Custom skills are MIT too.
