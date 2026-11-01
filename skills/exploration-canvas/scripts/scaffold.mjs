#!/usr/bin/env node
/**
 * Scaffold an exploration canvas from the exploration-canvas skill.
 *
 *   node scaffold.mjs <dir> [--title "Title"] [--subtitle "Subtitle"] [--halftone]
 *   node scaffold.mjs <dir> --example grain-halftone
 *   node scaffold.mjs <dir> --update          refresh canvas.css/canvas.js (and halftone.js if present)
 *   add --launch [port] to register a preview server in ./.claude/launch.json
 *   add --force to write into a folder that isn't empty
 *
 * The folder gets index.html (the content you write), canvas.css and canvas.js
 * (the engine, never edited by hand), and halftone.js when EmDash's halftone
 * motifs are wanted. Deploy the folder as it is.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engine = join(skill, "assets", "engine");
const examples = join(skill, "assets", "examples");

const args = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (!arg.startsWith("--")) { positional.push(arg); continue; }
	const key = arg.slice(2);
	const next = args[i + 1];
	if (next !== undefined && !next.startsWith("--")) { flags[key] = next; i++; }
	else flags[key] = true;
}

const exampleNames = () => (existsSync(examples) ? readdirSync(examples) : []);
const fail = (message) => { console.error(`error: ${message}`); process.exit(1); };

if (!positional[0] || flags.help) {
	console.log(`usage: node scaffold.mjs <dir> [--title "Title"] [--subtitle "Subtitle"] [--halftone] [--launch [port]] [--force]
       node scaffold.mjs <dir> --example <${exampleNames().join(" | ")}>
       node scaffold.mjs <dir> --update`);
	process.exit(positional[0] ? 0 : 1);
}

const dest = resolve(positional[0]);
const copyEngine = (withHalftone) => {
	for (const file of ["canvas.css", "canvas.js", ...(withHalftone ? ["halftone.js"] : [])]) {
		copyFileSync(join(engine, file), join(dest, file));
	}
};

if (flags.update) {
	if (!existsSync(join(dest, "index.html"))) fail(`${positional[0]} has no index.html; scaffold it first.`);
	copyEngine(existsSync(join(dest, "halftone.js")));
	console.log(`Updated the engine in ${relative(process.cwd(), dest) || "."}. index.html was left alone.`);
	process.exit(0);
}

if (existsSync(dest) && readdirSync(dest).length && !flags.force) {
	fail(`${positional[0]} is not empty. Pass --force to write into it, or --update to refresh only the engine.`);
}
mkdirSync(dest, { recursive: true });

const name = basename(dest);
const titleCase = (slug) => slug.split(/[-_]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date());

let html;
if (flags.example) {
	const source = join(examples, String(flags.example), "index.html");
	if (!existsSync(source)) fail(`no example "${flags.example}". Examples: ${exampleNames().join(", ")}.`);
	html = readFileSync(source, "utf8");
} else {
	// The text placeholders sit inside JavaScript strings; the engine escapes them when it renders.
	const js = (s) => String(s).replace(/[\\"`$<]/g, (c) => (c === "<" ? "\\u003c" : `\\${c}`));
	const fill = { TITLE: js(flags.title ?? titleCase(name)), SUBTITLE: js(flags.subtitle ?? "Exploration map"), DATE: date, HALFTONE: flags.halftone ? `<script src="halftone.js"></script>\n` : "" };
	html = readFileSync(join(skill, "assets", "template", "index.html"), "utf8")
		.replace(/\{\{(TITLE|SUBTITLE|DATE|HALFTONE)\}\}/g, (_, key) => fill[key]);
}
writeFileSync(join(dest, "index.html"), html);
const withHalftone = html.includes('src="halftone.js"');
copyEngine(withHalftone);

const shown = relative(process.cwd(), dest) || ".";
console.log(`Created ${shown}/`);
console.log(`  index.html   the exploration: write the content here`);
console.log(`  canvas.css, canvas.js${withHalftone ? ", halftone.js" : ""}   the engine: leave as is, refresh with --update`);

if (flags.launch) {
	const file = join(process.cwd(), ".claude", "launch.json");
	const launch = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { version: "0.0.1", configurations: [] };
	launch.configurations ??= [];
	const configName = `canvas-${name}`;
	const others = launch.configurations.filter((c) => c.name !== configName);
	const taken = new Set(others.map((c) => c.port));
	let port = flags.launch === true ? 4420 : Number(flags.launch);
	if (!Number.isInteger(port)) fail(`--launch takes a port number, got "${flags.launch}".`);
	while (flags.launch === true && taken.has(port)) port++;
	others.push({
		name: configName,
		runtimeExecutable: "python3",
		runtimeArgs: ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", shown],
		port,
	});
	launch.configurations = others;
	try {
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, `${JSON.stringify(launch, null, 2)}\n`);
		console.log(`Preview: "${configName}" on port ${port} in .claude/launch.json (start it with preview_start).`);
	} catch {
		// Agent sandboxes often protect .claude/; the agent can add the entry with its own file tools.
		console.log(`Couldn't write .claude/launch.json from here. Add this configuration to it, then preview_start "${configName}":`);
		console.log(JSON.stringify(others.at(-1), null, 2));
	}
}
console.log(`Ship: node ~/.agents/skills/drop-deploy/scripts/drop.mjs deploy ${shown} --name <slug>`);
