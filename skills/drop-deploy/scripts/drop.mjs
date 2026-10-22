#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

const ACCOUNT_NAME = process.env.DROP_ACCOUNT_NAME || "Gifted Market";
const KEYCHAIN = { service: "cloudflare-drop", account: "gifted-market" };
const HUB = "artifacts";
const API = "https://api.cloudflare.com/client/v4";
const WRANGLER = "wrangler@4";
const OUTPUT_DIRS = ["dist", "out", "build", ".output/public", "dist/client"];
const SETUP = `Run the one-time setup in ${path.join(import.meta.dirname, "..", "SKILL.md")}.`;

const die = (msg) => {
  console.error(`drop: ${msg}`);
  process.exit(1);
};

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) die(`${cmd} ${args.join(" ")} exited with ${r.status ?? r.signal}`);
}

function readToken() {
  if (process.env.DROP_CLOUDFLARE_API_TOKEN) return process.env.DROP_CLOUDFLARE_API_TOKEN;
  const r = spawnSync("security", ["find-generic-password", "-s", KEYCHAIN.service, "-a", KEYCHAIN.account, "-w"], { encoding: "utf8" });
  if (r.status !== 0) die(`no API token in Keychain (service "${KEYCHAIN.service}"). ${SETUP}`);
  return r.stdout.trim();
}

async function api(token, route, method = "GET") {
  const res = await fetch(API + route, { method, headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!body.success) die(`${method} ${route} failed (${res.status}): ${JSON.stringify(body.errors ?? [])}`);
  return body.result;
}

async function connect() {
  const token = readToken();
  const accounts = await api(token, "/accounts?per_page=50");
  if (accounts.length !== 1 || accounts[0].name !== ACCOUNT_NAME) {
    const seen = accounts.map((a) => a.name).join(", ") || "none";
    die(`the token must reach only "${ACCOUNT_NAME}", but it reaches: ${seen}. Recreate it with Account Resources set to ${ACCOUNT_NAME} alone.`);
  }
  const accountId = accounts[0].id;
  const { subdomain } = await api(token, `/accounts/${accountId}/workers/subdomain`);
  return { token, accountId, subdomain };
}

const urlOf = (t, name) => `https://${name}.${t.subdomain}.workers.dev`;
const today = () => new Date().toISOString().slice(0, 10);
const scripts = (t) => api(t.token, `/accounts/${t.accountId}/workers/scripts`);

function slug(raw) {
  const s = raw.toLowerCase().replace(/^@[^/]+\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63).replace(/-+$/, "");
  if (!s) die(`"${raw}" does not make a usable name; pass --name`);
  return s;
}

function defaultName(input) {
  const src = path.resolve(input);
  const pkg = path.join(src, "package.json");
  if (fs.existsSync(pkg)) {
    const { name } = JSON.parse(fs.readFileSync(pkg, "utf8"));
    if (name) return name;
  }
  return path.basename(src).replace(/\.(html?|zip)$/i, "");
}

function packageManager(dir) {
  if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(dir, "bun.lock")) || fs.existsSync(path.join(dir, "bun.lockb"))) return "bun";
  if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";
  return "npm";
}

// A Vite or Astro project has a source index.html at its root, so a build script wins over a root index.html.
function outputDir(dir, { out, build }) {
  if (out) return path.resolve(dir, out);
  const pkgPath = path.join(dir, "package.json");
  const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, "utf8")) : null;
  if (!pkg?.scripts?.build || !build) return dir;
  const pm = packageManager(dir);
  if (!fs.existsSync(path.join(dir, "node_modules"))) run(pm, ["install"], { cwd: dir });
  run(pm, ["run", "build"], { cwd: dir });
  const found = OUTPUT_DIRS.map((d) => path.join(dir, d)).find((d) => fs.existsSync(path.join(d, "index.html")));
  if (!found) die(`built, but none of ${OUTPUT_DIRS.join(", ")} has an index.html. A server-rendered app is not static. Pass --out <dir> if the output lives elsewhere.`);
  return found;
}

function copySite(from, to) {
  fs.cpSync(from, to, {
    recursive: true,
    filter: (p) =>
      path
        .relative(from, p)
        .split(path.sep)
        .every((seg) => seg === "" || seg === ".well-known" || (!seg.startsWith(".") && seg !== "node_modules")),
  });
}

function stage(input, flags) {
  const src = path.resolve(input);
  if (!fs.existsSync(src)) die(`${input} does not exist`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "drop-"));
  const site = path.join(tmp, "site");
  const stat = fs.statSync(src);
  if (stat.isFile() && /\.html?$/i.test(src)) {
    fs.mkdirSync(site);
    fs.copyFileSync(src, path.join(site, "index.html"));
  } else if (stat.isFile() && /\.zip$/i.test(src)) {
    const unzipped = path.join(tmp, "unzipped");
    run("unzip", ["-q", src, "-d", unzipped]);
    const entries = fs.readdirSync(unzipped).filter((e) => !e.startsWith(".") && e !== "__MACOSX");
    const single = entries.length === 1 && fs.statSync(path.join(unzipped, entries[0])).isDirectory();
    copySite(single && !fs.existsSync(path.join(unzipped, "index.html")) ? path.join(unzipped, entries[0]) : unzipped, site);
  } else if (stat.isDirectory()) {
    copySite(outputDir(src, flags), site);
  } else {
    die(`${input} is not a folder, .html file or .zip`);
  }
  if (!fs.existsSync(path.join(site, "index.html"))) die(`no index.html at the root of what would be deployed from ${input}`);
  return { site, tmp };
}

// An empty cwd keeps any wrangler config in the user's project from changing the name or account.
function wrangler(t, args) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "drop-wrangler-"));
  const env = { ...process.env, CLOUDFLARE_API_TOKEN: t.token, CLOUDFLARE_ACCOUNT_ID: t.accountId };
  delete env.CLOUDFLARE_API_KEY;
  delete env.CLOUDFLARE_EMAIL;
  run("npx", ["--yes", WRANGLER, ...args], { cwd, env });
  fs.rmSync(cwd, { recursive: true, force: true });
}

const deployAssets = (t, name, dir) => wrangler(t, ["deploy", "--assets", dir, "--name", name, "--compatibility-date", today()]);

async function waitLive(url) {
  let last = "no response";
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
      const location = res.headers.get("location") || "";
      if (location.includes("cloudflareaccess.com")) die(`${url} redirects to a Cloudflare Access login, so it is not public`);
      if (res.status === 200) return;
      last = `HTTP ${res.status}`;
    } catch (err) {
      last = err.cause?.code || err.name;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  die(`${url} still answers ${last} after 90 seconds`);
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ENTITIES[e]);
const escape = (s) => s.replace(/[&<>"']/g, (c) => `&${Object.keys(ENTITIES).find((k) => ENTITIES[k] === c)};`);

async function titleOf(url) {
  try {
    const html = await (await fetch(url, { signal: AbortSignal.timeout(5000) })).text();
    return decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "") || null;
  } catch {
    return null;
  }
}

async function artifacts(t) {
  const list = (await scripts(t)).filter((s) => s.id !== HUB).sort((a, b) => b.modified_on.localeCompare(a.modified_on));
  return Promise.all(list.map(async (s) => ({ name: s.id, url: urlOf(t, s.id), updated: s.modified_on, title: await titleOf(urlOf(t, s.id)) })));
}

function hubHtml(rows) {
  const date = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const items = rows
    .map(
      (r) => `<li><a href="${r.url}"><span class="t">${escape(r.title || r.name)}</span><span class="m">${r.name} &middot; ${date(r.updated)}</span></a></li>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Artifacts</title>
<style>
:root { color-scheme: light dark; --fg: #111; --mute: #6b6b6b; --line: #e6e6e6; --hover: #f5f5f5; }
@media (prefers-color-scheme: dark) { :root { --fg: #eee; --mute: #8f8f8f; --line: #262626; --hover: #161616; } }
body { margin: 0; font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif; color: var(--fg); }
main { max-width: 680px; margin: 0 auto; padding: 72px 24px; }
h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
p { margin: 0 0 32px; color: var(--mute); }
ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
a { display: flex; justify-content: space-between; gap: 16px; padding: 14px 8px; border-bottom: 1px solid var(--line); color: inherit; text-decoration: none; }
a:hover { background: var(--hover); }
.m { color: var(--mute); font-size: 13px; white-space: nowrap; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<main>
<h1>Artifacts</h1>
<p>${rows.length} ${rows.length === 1 ? "artifact" : "artifacts"}</p>
<ul>
${items}
</ul>
</main>
</body>
</html>
`;
}

async function publishHub(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drop-hub-"));
  fs.writeFileSync(path.join(dir, "index.html"), hubHtml(await artifacts(t)));
  deployAssets(t, HUB, dir);
  fs.rmSync(dir, { recursive: true, force: true });
}

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: { name: { type: "string" }, out: { type: "string" }, "no-build": { type: "boolean", default: false } },
});
const [command, target] = positionals;

if (command === "check") {
  const t = await connect();
  const count = (await scripts(t)).filter((s) => s.id !== HUB).length;
  console.log(`account: ${ACCOUNT_NAME} (${t.accountId})\nsubdomain: ${t.subdomain}.workers.dev\nartifacts: ${count}\nhub: ${urlOf(t, HUB)}`);
} else if (command === "deploy" && target) {
  const t = await connect();
  const name = slug(flags.name ?? defaultName(target));
  if (name === HUB) die(`"${HUB}" is the hub's name; pick another --name`);
  const existed = (await scripts(t)).some((s) => s.id === name);
  const { site, tmp } = stage(target, { out: flags.out, build: !flags["no-build"] });
  deployAssets(t, name, site);
  fs.rmSync(tmp, { recursive: true, force: true });
  const url = urlOf(t, name);
  await waitLive(url);
  await publishHub(t);
  console.log(`\n${existed ? "updated" : "created"}: ${name}\nurl: ${url}\nhub: ${urlOf(t, HUB)}`);
} else if (command === "list") {
  const t = await connect();
  for (const r of await artifacts(t)) console.log(`${r.name}\t${r.url}\t${r.updated.slice(0, 10)}\t${r.title ?? ""}`);
} else if (command === "hub") {
  const t = await connect();
  await publishHub(t);
  console.log(`hub: ${urlOf(t, HUB)}`);
} else if (command === "rm" && target) {
  const t = await connect();
  if (target === HUB) die("refusing to delete the hub");
  await api(t.token, `/accounts/${t.accountId}/workers/scripts/${encodeURIComponent(target)}`, "DELETE");
  await publishHub(t);
  console.log(`deleted: ${target}\nhub: ${urlOf(t, HUB)}`);
} else {
  die("usage: drop.mjs check | deploy <folder|file.html|file.zip> [--name <slug>] [--out <dir>] [--no-build] | list | hub | rm <name>");
}
