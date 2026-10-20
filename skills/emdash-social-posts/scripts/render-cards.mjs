#!/usr/bin/env node
/**
 * Renders emdashcms.com-styled social cards from a JSON spec.
 *
 *   node render-cards.mjs <cards.json> [--out <dir>] [--only <name>[,<name>...]]
 *
 * PNGs are written next to the spec unless --out (or the spec's "out") says
 * otherwise. The spec format is documented in ../references/card-design.md.
 * Exits with 1 when an image is missing or a spec field is invalid.
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchBrowser } from "./lib/browser.mjs";
import { halftoneArt, motifFor, MOTIFS } from "./post-art.mjs";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(SKILL_DIR, "assets");

/** Halftone pitch in CSS px, the same pitch the blog's hero cover uses. */
const CELL = 15.6;
/** How far an accent may land from its target before it counts as a miss. */
const ACCENT_TOLERANCE = 16;

const LAYOUTS = {
	landscape: { width: 1200, height: 675 },
	og: { width: 1200, height: 630 },
	portrait: { width: 1080, height: 1350 },
};

/** Colours from emdashcms.com's Base.astro, theme.css and the blog post page. */
const THEMES = {
	dark: {
		bg: "#0a0a0a",
		surface: "#171717",
		text: "#f5f5f5",
		border: "color-mix(in srgb, var(--bg) 90%, var(--text))",
		ring: "color-mix(in srgb, var(--text) 5%, transparent)",
		sunken: "color-mix(in srgb, var(--bg) 55%, var(--surface))",
		artBg: "color-mix(in srgb, var(--bg) 40%, var(--surface))",
		paper: 8,
		ink: 50,
		codeKeyword: "#ff7a45",
		codeString: "#ffb48f",
		windowEdge: "rgba(0, 0, 0, 0.6)",
		windowRing: "color-mix(in srgb, var(--text) 7%, transparent)",
		shadow: "0 28px 56px -18px rgba(0, 0, 0, 0.85)",
		logo: "logo-light-text.svg",
	},
	light: {
		bg: "#f9f9f9",
		surface: "#ffffff",
		text: "#262626",
		border: "#e8e8e8",
		ring: "#ededed",
		sunken: "color-mix(in srgb, var(--bg) 70%, var(--surface))",
		artBg: "color-mix(in srgb, var(--bg) 55%, var(--surface))",
		paper: 9,
		ink: 62,
		codeKeyword: "#c2410c",
		codeString: "#9a3412",
		windowEdge: "rgba(0, 0, 0, 0.08)",
		windowRing: "color-mix(in srgb, var(--text) 4%, transparent)",
		shadow: "0 24px 48px -20px rgba(0, 0, 0, 0.25)",
		logo: "logo-dark-text.svg",
	},
};

const CHECK_ICON = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9.25" stroke="currentColor" stroke-width="1.5"/><path d="m8.25 12.25 2.5 2.5 5-5.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const KEYWORDS = new Set([
	"import",
	"from",
	"export",
	"default",
	"const",
	"let",
	"var",
	"return",
	"await",
	"async",
	"function",
	"new",
	"if",
	"else",
	"true",
	"false",
	"null",
	"undefined",
	"type",
	"interface",
]);

class SpecError extends Error {}

const escapeHtml = (value) =>
	String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const textHtml = (value) => escapeHtml(value).replace(/\n/g, "<br>");
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const clampTo = (value, min, max) => Math.min(max, Math.max(min, value));
/** A path relative to the working directory when it's inside it. */
const shown = (file) => {
	const relative = path.relative(process.cwd(), file);
	return relative && !relative.startsWith("..") ? relative : file;
};
const span = (cls, value) => `<i class="${cls}">${escapeHtml(value)}</i>`;

function parseArgs(argv) {
	const args = { only: [] };
	const rest = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--out") args.out = argv[++i];
		else if (arg === "--only") args.only.push(...argv[++i].split(",").filter(Boolean));
		else if (arg === "--help" || arg === "-h") args.help = true;
		else rest.push(arg);
	}
	args.spec = rest[0];
	return args;
}

/** Pixel size of a PNG or JPEG, read from its header. */
function imageSize(file) {
	const buf = readFileSync(file);
	if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
		return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
	}
	if (buf[0] === 0xff && buf[1] === 0xd8) {
		let offset = 2;
		while (offset + 9 < buf.length) {
			if (buf[offset] !== 0xff) {
				offset++;
				continue;
			}
			const marker = buf[offset + 1];
			const length = buf.readUInt16BE(offset + 2);
			if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
				return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
			}
			offset += 2 + length;
		}
	}
	return null;
}

/** Inner size of the art frame, in CSS px. */
function frameInner(layout, variant) {
	const { width, height } = LAYOUTS[layout];
	if (layout === "portrait") return { width: width - 80 - 2, height: height - 484 - 40 - 2 };
	const left = variant === "cover" ? 600 : 472;
	return { width: width - left - 40 - 2, height: height - 80 - 2 };
}

function* seedsFrom(base) {
	yield base;
	for (let i = 1; i < 5000; i++) yield `${base}-${i}`;
}

let svgCount = 0;
function artSvg(art, className, style = "") {
	const id = `paper-${svgCount++}`;
	const layers = art.layers
		.map((l) => `<path class="dots${l.accent ? " accent" : ""}" d="${l.d}" stroke-width="${l.width}"/>`)
		.join("");
	return `<svg class="${className}" style="${style}" viewBox="0 0 ${art.width} ${art.height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><circle class="grain" cx="5" cy="5" r="0.75"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/>${layers}</svg>`;
}

/**
 * Art larger than the frame, offset so its orange accent sits at `accent`
 * (frame px). Seeds derived from `base` are tried in order until one has the
 * wanted motif and can reach the target without uncovering the frame.
 */
function placedArt({ base, motif, accent, zoom }, inner, warn) {
	const columns = Math.round((inner.width * zoom) / CELL);
	const rows = Math.round((inner.height * zoom) / CELL);
	const width = inner.width * zoom;
	let best = null;
	let tried = 0;
	for (const seed of seedsFrom(base)) {
		if (motif && motifFor(seed) !== motif) continue;
		if (++tried > 500) break;
		const art = halftoneArt(seed, columns, rows);
		const accentDots = art.dots.filter((dot) => dot.accent);
		if (!accentDots.length) continue;
		const unit = width / art.width;
		const height = art.height * unit;
		const wantLeft = accent[0] - mean(accentDots.map((dot) => dot.cx)) * unit;
		const wantTop = accent[1] - mean(accentDots.map((dot) => dot.cy)) * unit;
		const left = clampTo(wantLeft, inner.width - width, 0);
		const top = clampTo(wantTop, inner.height - height, 0);
		const miss = Math.hypot(left - wantLeft, top - wantTop);
		if (!best || miss < best.miss) best = { art, left, top, width, height, miss };
		if (miss <= ACCENT_TOLERANCE) break;
	}
	if (!best) throw new SpecError(`no art found for "${base}"`);
	if (best.miss > ACCENT_TOLERANCE) {
		warn(`the accent lands ${Math.round(best.miss)}px from its target; move the target, raise "zoom" or try another motif`);
	}
	return artSvg(best.art, "art placed", `left:${best.left}px;top:${best.top}px;width:${best.width}px;height:${best.height}px`);
}

function cardArt(card, inner, ctx) {
	const art = card.art ?? {};
	if (art === false) return "";
	if (art.motif && !MOTIFS.includes(art.motif)) throw new SpecError(`unknown motif "${art.motif}" (use ${MOTIFS.join(", ")})`);
	const base = art.seed ?? `${ctx.seedPrefix}-${art.name ?? card.name}`;
	if (art.accent) return placedArt({ base, motif: art.motif, accent: art.accent, zoom: art.zoom ?? 1.6 }, inner, ctx.warn);
	const columns = art.grid?.[0] ?? Math.round(inner.width / CELL);
	const rows = art.grid?.[1] ?? Math.round(inner.height / CELL);
	let seed = base;
	if (art.motif) {
		for (const candidate of seedsFrom(base)) {
			if (motifFor(candidate) === art.motif) {
				seed = candidate;
				break;
			}
		}
	}
	return artSvg(halftoneArt(seed, columns, rows), "art");
}

function position(item) {
	const placement = item.center
		? "left:50%;top:50%;transform:translate(-50%,-50%);"
		: `left:${item.left ?? 0}px;top:${item.top ?? 0}px;`;
	return `${placement}z-index:${item.z ?? 1};`;
}

function screenshotItem(item, ctx) {
	if (!item.src) throw new SpecError(`a screenshot needs "src"`);
	const file = ctx.resolve(item.src);
	const dpr = item.dpr ?? ctx.dpr;
	let natural = item.natural;
	if (!natural) {
		const size = imageSize(file);
		if (!size) throw new SpecError(`can't read the size of ${item.src}; add "natural": [width, height] in CSS px`);
		natural = [size.width / dpr, size.height / dpr];
	}
	const crop = item.crop ?? { x: 0, y: 0, w: natural[0], h: natural[1] };
	const scale = item.scale ?? 1;
	const width = item.width ?? crop.w * scale;
	const height = item.height ?? crop.h * scale;
	const masks = (item.masks ?? [])
		.map(
			(m) =>
				`<i class="mask" style="left:${(m.x - crop.x) * scale}px;top:${(m.y - crop.y) * scale}px;width:${m.w * scale}px;height:${m.h * scale}px;background:${m.color ?? item.maskColor ?? "#fff"}"></i>`,
		)
		.join("");
	return `<div class="window${item.fade ? " fade" : ""}" data-label="${escapeHtml(item.label ?? item.src)}" style="${position(item)}width:${width}px;height:${height}px"><img src="${pathToFileURL(file).href}" alt="" style="width:${natural[0] * scale}px;height:${natural[1] * scale}px;left:${-crop.x * scale}px;top:${-crop.y * scale}px">${masks}</div>`;
}

function languageFor(item) {
	if (item.lang) return item.lang;
	if (/(^|\/)\.env/.test(item.file ?? "")) return "env";
	return "js";
}

/** A small highlighter for config snippets, JSX, JSON and .env files. */
function highlight(code, lang) {
	if (lang === "plain") return escapeHtml(code);
	if (lang === "env") {
		return code
			.split("\n")
			.map((line) => {
				const pair = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)(=)(.*)$/);
				if (pair) return `${pair[1]}${span("a", pair[2])}${span("p", pair[3])}${span("c", pair[4])}`;
				return line.trimStart().startsWith("#") ? span("c", line) : escapeHtml(line);
			})
			.join("\n");
	}
	const token =
		/(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(<\/?)([A-Za-z][\w.-]*)|([A-Za-z_$][\w$]*)|(…|→|\.\.\.)|([{}[\]();,.=:<>/?!|&+*%-]+)/g;
	let out = "";
	let last = 0;
	for (const m of code.matchAll(token)) {
		out += escapeHtml(code.slice(last, m.index));
		last = m.index + m[0].length;
		const after = code.slice(last);
		if (m[1]) out += span("c", m[1]);
		else if (m[2]) out += span(/^\s*:(?!:)/.test(after) ? "a" : "s", m[2]);
		else if (m[3]) out += span("p", m[3]) + span("f", m[4]);
		else if (m[5]) {
			if (KEYWORDS.has(m[5])) out += span("k", m[5]);
			else if (/^\s*\(/.test(after)) out += span("f", m[5]);
			else if (/^\s*(?::(?!:)|=(?![=>]))/.test(after)) out += span("a", m[5]);
			else out += escapeHtml(m[5]);
		} else if (m[6]) out += span("c", m[6]);
		else out += span("p", m[7]);
	}
	return out + escapeHtml(code.slice(last));
}

function codeItem(item) {
	if (item.code === undefined) throw new SpecError(`a code panel needs "code"`);
	const code = Array.isArray(item.code) ? item.code.join("\n") : item.code;
	const header = item.file ? `<div class="code-file">${escapeHtml(item.file)}</div>` : "";
	return `<div class="code" data-label="${escapeHtml(item.file ?? "code")}" style="${position(item)}width:${item.width ?? 574}px">${header}<pre style="font-size:${item.size ?? 14}px">${highlight(code, languageFor(item))}</pre></div>`;
}

function listItem(item) {
	if (!Array.isArray(item.items)) throw new SpecError(`a list needs "items": [[label, text], ...]`);
	const rows = item.items
		.map((entry) => {
			const [label, text] = Array.isArray(entry) ? entry : [entry];
			return `<div class="row">${CHECK_ICON}<div><b>${textHtml(label)}</b>${text ? `<span>${textHtml(text)}</span>` : ""}</div></div>`;
		})
		.join("");
	return `<div class="list" data-label="list" style="${position(item)}width:${item.width ?? 606}px">${rows}</div>`;
}

function frameItem(item, ctx) {
	switch (item.type) {
		case "screenshot":
			return screenshotItem(item, ctx);
		case "code":
			return codeItem(item);
		case "list":
			return listItem(item);
		default:
			throw new SpecError(`unknown frame item type "${item.type}" (use screenshot, code or list)`);
	}
}

function css(ctx) {
	const t = ctx.theme;
	const { width, height } = LAYOUTS[ctx.layout];
	return `
@font-face { font-family: "Inter"; src: url("${pathToFileURL(path.join(ASSETS, "fonts/inter-latin-variable.woff2")).href}") format("woff2"); font-weight: 100 900; font-display: block; }
@font-face { font-family: "Card Mono"; src: url("file:///System/Library/Fonts/SFNSMono.ttf"); font-weight: 100 900; font-display: block; }
:root {
	--bg: ${t.bg}; --surface: ${t.surface}; --text: ${t.text}; --heat: ${ctx.accent};
	--page: color-mix(in srgb, var(--bg) 50%, var(--surface));
	--muted: color-mix(in srgb, var(--text) 72%, transparent);
	--subtle: color-mix(in srgb, var(--text) 66%, transparent);
	--line: color-mix(in srgb, var(--text) 10%, transparent);
	--border: ${t.border}; --ring: ${t.ring}; --sunken: ${t.sunken}; --art-bg: ${t.artBg};
	--art-paper: color-mix(in srgb, var(--text) ${t.paper}%, transparent);
	--art-ink: color-mix(in srgb, var(--text) ${t.ink}%, transparent);
	--code-keyword: ${t.codeKeyword}; --code-string: ${t.codeString};
	--window-edge: ${t.windowEdge}; --window-ring: ${t.windowRing}; --shadow: ${t.shadow};
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: var(--page); color: var(--text); font-family: "Inter", sans-serif; -webkit-font-smoothing: antialiased; }
i { font-style: normal; }
.card { position: relative; width: ${width}px; height: ${height}px; }
.copy { position: absolute; display: flex; flex-direction: column; }
.logo { display: block; height: 28px; width: auto; align-self: flex-start; }
.headline { margin-block: auto; }
.eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; line-height: 1; }
.eyebrow::before { content: ""; width: 16px; height: 2px; border-radius: 9999px; background: var(--heat); }
h1 { margin-top: 20px; font-size: 50px; font-weight: 700; line-height: 1.04; letter-spacing: -0.04em; text-wrap: balance; }
.dek { margin-top: 18px; color: var(--muted); font-size: 20px; line-height: 1.5; text-wrap: pretty; }
.frame { position: absolute; overflow: hidden; background: var(--art-bg); border: 1px solid var(--border); border-radius: 18px; box-shadow: 0 0 0 4px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.04); isolation: isolate; }
.art { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.art.placed { inset: auto; }
.grain { fill: var(--art-paper); }
.dots { fill: none; stroke: var(--art-ink); stroke-linecap: round; }
.dots.accent { stroke: var(--heat); }
.window { position: absolute; overflow: hidden; background: #fff; border-radius: 12px; box-shadow: 0 0 0 1px var(--window-edge), 0 0 0 5px var(--window-ring), var(--shadow); }
.window img { position: absolute; display: block; max-width: none; }
.window .mask { position: absolute; }
.window.fade::before, .window.fade::after { content: ""; position: absolute; z-index: 1; left: 0; right: 0; height: 30px; pointer-events: none; }
.window.fade::before { top: 0; background: linear-gradient(#fff, rgb(255 255 255 / 0)); }
.window.fade::after { bottom: 0; background: linear-gradient(rgb(255 255 255 / 0), #fff); }
.code, .list { position: absolute; overflow: hidden; background: var(--sunken); border: 1px solid color-mix(in srgb, var(--text) 12%, transparent); border-radius: 12px; box-shadow: 0 0 0 5px color-mix(in srgb, var(--text) 4%, transparent), var(--shadow); }
.code-file { padding: 13px 20px; border-bottom: 1px solid var(--line); color: var(--muted); font: 500 13px/1 "Card Mono", "SF Mono", Menlo, monospace; }
.code pre { padding: 18px 20px 20px; font-family: "Card Mono", "SF Mono", Menlo, monospace; line-height: 1.7; color: var(--text); white-space: pre; }
.k { color: var(--code-keyword); } .s { color: var(--code-string); }
.p { color: color-mix(in srgb, var(--text) 50%, transparent); } .f { color: var(--text); font-weight: 600; }
.a { color: color-mix(in srgb, var(--text) 82%, transparent); } .c { color: color-mix(in srgb, var(--text) 45%, transparent); }
.row { display: flex; gap: 14px; align-items: flex-start; padding: 15px 22px; }
.row + .row { border-top: 1px solid var(--line); }
.row svg { flex: none; width: 22px; height: 22px; margin-top: 1px; color: var(--heat); }
.row b { display: block; font-size: 17px; font-weight: 600; line-height: 1.3; }
.row span { display: block; margin-top: 3px; color: var(--muted); font-size: 16px; line-height: 1.45; }
.landscape .copy, .og .copy { left: 60px; top: 58px; bottom: 58px; width: 370px; }
.landscape .frame, .og .frame { top: 40px; right: 40px; bottom: 40px; left: 472px; }
.landscape.cover .copy, .og.cover .copy { width: 500px; }
.landscape.cover .frame, .og.cover .frame { left: 600px; }
.cover h1 { margin-top: 22px; font-size: 92px; line-height: 1; letter-spacing: -0.045em; white-space: nowrap; }
.cover .dek { margin-top: 24px; font-size: 27px; line-height: 1.4; max-width: 470px; }
.portrait .copy { left: 72px; right: 72px; top: 72px; height: 372px; }
.portrait .frame { left: 40px; right: 40px; top: 484px; bottom: 40px; }
.portrait .headline { margin-block: auto 0; }
.portrait h1 { font-size: 64px; }
.portrait .dek { font-size: 24px; max-width: 820px; }
.portrait.cover h1 { font-size: 128px; }
.portrait.cover .dek { font-size: 30px; max-width: 860px; }
`;
}

function cardHtml(card, ctx) {
	const variant = card.variant === "cover" ? "cover" : "";
	const inner = frameInner(ctx.layout, variant);
	const art = cardArt(card, inner, ctx);
	const items = (card.frame ?? []).map((item) => frameItem(item, ctx)).join("");
	const eyebrow = card.eyebrow ? `<p class="eyebrow">${textHtml(card.eyebrow)}</p>` : "";
	const dek = card.dek ? `<p class="dek">${textHtml(card.dek)}</p>` : "";
	return `<!doctype html><html lang="${escapeHtml(ctx.lang)}"><head><meta charset="utf-8"><style>${css(ctx)}</style></head><body><div class="card ${ctx.layout} ${variant}">
<div class="copy"><img class="logo" src="${ctx.logo}" alt=""><div class="headline">${eyebrow}<h1>${textHtml(card.title ?? "")}</h1>${dek}</div></div>
<div class="frame">${art}${items}</div></div></body></html>`;
}

/** Runs in the page: reports layout problems a reviewer would catch. */
function pageChecks() {
	const issues = [];
	for (const img of document.images) {
		if (!img.naturalWidth) issues.push({ error: true, message: `image failed to load: ${decodeURIComponent(img.src)}` });
	}
	const copy = document.querySelector(".copy");
	if (copy.scrollHeight > copy.clientHeight + 1) {
		issues.push({ message: "the text overflows its column; shorten the title or dek" });
	}
	const title = document.querySelector("h1");
	if (title.scrollWidth > title.clientWidth + 1) issues.push({ message: "the title is wider than its column" });
	const frame = document.querySelector(".frame").getBoundingClientRect();
	for (const el of document.querySelectorAll(".frame > .window, .frame > .code, .frame > .list")) {
		const r = el.getBoundingClientRect();
		if (r.left < frame.left - 1 || r.top < frame.top - 1 || r.right > frame.right + 1 || r.bottom > frame.bottom + 1) {
			issues.push({ message: `"${el.dataset.label}" runs past the frame and is clipped` });
		}
	}
	if (!document.fonts.check('700 50px "Inter"')) issues.push({ message: "Inter did not load" });
	return issues;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help || !args.spec) {
		console.log("Usage: node render-cards.mjs <cards.json> [--out <dir>] [--only <name>[,<name>...]]");
		process.exit(args.help ? 0 : 1);
	}
	const specPath = path.resolve(args.spec);
	const specDir = path.dirname(specPath);
	const spec = JSON.parse(readFileSync(specPath, "utf8"));
	const layout = spec.layout ?? "landscape";
	if (!LAYOUTS[layout]) throw new SpecError(`unknown layout "${layout}" (use ${Object.keys(LAYOUTS).join(", ")})`);
	const theme = THEMES[spec.theme ?? "dark"];
	if (!theme) throw new SpecError(`unknown theme "${spec.theme}" (use dark or light)`);
	if (!Array.isArray(spec.cards) || !spec.cards.length) throw new SpecError(`the spec needs a "cards" array`);

	const resolve = (src) => {
		const expanded = src.startsWith("~/") ? path.join(os.homedir(), src.slice(2)) : src;
		const file = path.resolve(specDir, expanded);
		if (!existsSync(file)) throw new SpecError(`file not found: ${src}`);
		return file;
	};
	const names = new Set();
	for (const card of spec.cards) {
		if (!card.name || !/^[\w.-]+$/.test(card.name)) throw new SpecError(`every card needs a file-safe "name" (got "${card.name}")`);
		if (names.has(card.name)) throw new SpecError(`duplicate card name "${card.name}"`);
		names.add(card.name);
	}

	const outDir = path.resolve(args.out ?? (spec.out ? path.resolve(specDir, spec.out) : specDir));
	mkdirSync(outDir, { recursive: true });
	const htmlDir = mkdtempSync(path.join(os.tmpdir(), "emdash-cards-"));
	const cards = spec.cards.filter((card) => !args.only.length || args.only.some((name) => card.name.includes(name)));
	if (!cards.length) throw new SpecError(`no card matches --only ${args.only.join(",")}`);

	const { width, height } = LAYOUTS[layout];
	const browser = await launchBrowser();
	const page = await (await browser.newContext({ viewport: { width, height }, deviceScaleFactor: spec.scale ?? 2 })).newPage();
	let failed = false;
	try {
		for (const card of cards) {
			const warnings = [];
			const ctx = {
				layout,
				theme,
				accent: spec.accent ?? "#ff5e1f",
				lang: spec.lang ?? "en",
				dpr: spec.dpr ?? 2,
				seedPrefix: spec.seedPrefix ?? "emdash",
				logo: pathToFileURL(spec.logo ? resolve(spec.logo) : path.join(ASSETS, theme.logo)).href,
				resolve,
				warn: (message) => warnings.push({ message }),
			};
			const file = path.join(htmlDir, `${card.name}.html`);
			writeFileSync(file, cardHtml(card, ctx));
			await page.goto(pathToFileURL(file).href);
			await page.evaluate(async () => {
				await document.fonts.ready;
				await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
			});
			warnings.push(...(await page.evaluate(pageChecks)));
			const target = path.join(outDir, `${card.name}.png`);
			await page.screenshot({ path: target });
			console.log(`${shown(target)}${warnings.length ? "" : "  ok"}`);
			for (const { error, message } of warnings) {
				console.log(`  ${error ? "error" : "warning"}: ${message}`);
				if (error) failed = true;
			}
		}
	} finally {
		await browser.close();
	}
	if (failed) process.exit(1);
}

main().catch((error) => {
	console.error(error instanceof SpecError ? `error: ${error.message}` : error);
	process.exit(1);
});
