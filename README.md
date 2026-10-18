# ~/.agents — global agent skills

Single source of truth for agent skills, symlinked into every harness's skills directory so the same skill set works natively in Claude Code, Codex, Cursor, Copilot, Gemini, Kiro, Cline, OpenCode, Windsurf, and Devin.

## Bootstrap a new machine

```bash
git clone https://github.com/khoinguyenpham04/agent-skills ~/.agents
~/.agents/setup.sh
```

That's it — `setup.sh` creates each harness's skills dir if missing, links every skill in `skills/` into it, drops dangling links, and copies `plugins/` into `~/.cursor/plugins/local/` (Cursor rejects plugin symlinks pointing outside that dir, so plugins are copied, not linked).

## Daily use

| Task | Command |
| --- | --- |
| Pull changes + relink | `~/.agents/sync.sh` |
| Add a skill | `npx skills add <repo> -g -a claude-code -a codex -a cursor -a github-copilot -a gemini-cli -a kiro-cli -a cline -a opencode -a windsurf -a devin` then `./setup.sh && git add -A && git commit && git push` |
| Add a subtree skill | `npx skills add "https://github.com/owner/repo/tree/main/subdir" -g -s <name> ...` then commit + push |
| Remove a skill | `rm -rf skills/<name>` then `./setup.sh && git add -A && git commit && git push` |
| Update upstream | `npx skills update` then `git add -A && git commit && git push` |
| Edit a skill | Edit `skills/<name>/SKILL.md` directly, commit — propagates everywhere instantly |

## Layout

- `skills/<name>/SKILL.md` — every skill, upstream copies and custom ones
- `plugins/<name>/` — vendored Cursor plugins (pstack: skills + agents + automations)
- `.skill-lock.json` — skills.sh lock file; kept in-repo so `npx skills update` behaves identically on every machine
- `setup.sh` / `sync.sh` — the linker and the pull+link ritual

Vendored skills retain their upstream licenses (MIT). Custom skills are MIT too.
