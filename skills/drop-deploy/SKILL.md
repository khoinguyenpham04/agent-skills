---
name: drop-deploy
description: Deploy a static site, single HTML file, zip, or buildable front-end project (Vite, Astro, Next export) to the user's claimed Cloudflare Drop account "Gifted Market" as a public workers.dev link anyone can open without signing in, and keep an index hub of every artifact. Use whenever the user asks to deploy, publish, host, share, put online, "drop it", get a link for leadership or teammates, or use Cloudflare Drop for something made locally.
---

# Drop deploy

Every deploy goes to one account, Gifted Market, through `scripts/drop.mjs`. The script refuses any token that reaches another account, so nothing can land in EmDash CMS, ANT Experiments, or the other Demo accounts.

## Rules

- Deploy only through the script. Never run `wrangler deploy` yourself and never pass `--temporary`. The local wrangler login points at a Demo account, and `--temporary` creates a new throwaway account.
- In Claude Code the Bash sandbox blocks npm and `api.cloudflare.com`. Run the script with the terminal tool (`run_in_terminal`), then read the result with `read_terminal`. Other harnesses run it directly.
- Run `list` before choosing a name. Reusing a name overwrites that artifact at the same URL, which is right for a new version of the same thing and wrong for anything else. Pick a descriptive kebab-case `--name`, such as `emdash-discord-banners`.
- `rm` is permanent. Run it only for an artifact the user named for deletion in this conversation.

## Commands

Run from any directory, with `~/.agents/skills/drop-deploy/scripts/drop.mjs` as the script path.

```bash
node ~/.agents/skills/drop-deploy/scripts/drop.mjs check
node ~/.agents/skills/drop-deploy/scripts/drop.mjs list
node ~/.agents/skills/drop-deploy/scripts/drop.mjs deploy <folder|file.html|file.zip> --name <slug>
node ~/.agents/skills/drop-deploy/scripts/drop.mjs hub
node ~/.agents/skills/drop-deploy/scripts/drop.mjs rm <name>
```

`deploy` stages the input and uploads it as an assets-only Worker. A single HTML file becomes `index.html`. A zip is unpacked. A folder whose `package.json` has a `build` script is built first, and the first of `dist`, `out`, `build`, `.output/public` or `dist/client` holding an `index.html` is deployed. Pass `--out <dir>` to name the output folder or `--no-build` to upload the folder as it is. Dotfiles and `node_modules` are never uploaded. The script then waits for the URL to return 200 and rebuilds the hub.

Give the user the artifact URL and the hub URL from the script's last lines. There is no claim link, because the account is already claimed.

## One-time setup

When `check` reports no token, the user has to create one. Give them these steps and wait.

1. In the Cloudflare dashboard, open My Profile, then API Tokens, then Create Token, then Create Custom Token.
2. Add the permissions Account, Workers Scripts, Edit and Account, Account Settings, Read.
3. Under Account Resources choose Include, Gifted Market. Create the token and copy it.
4. In a terminal, run `security add-generic-password -U -s cloudflare-drop -a gifted-market -w` and paste the token at the prompt.
5. Run `check`. It prints the account, its workers.dev subdomain and the hub URL.

Off macOS, export the token as `DROP_CLOUDFLARE_API_TOKEN` instead of step 4.
