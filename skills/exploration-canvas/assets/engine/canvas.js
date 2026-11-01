/*
 * Exploration canvas engine, from the exploration-canvas skill.
 *
 * A page loads canvas.css and this file, then calls ExplorationCanvas.mount()
 * with a core and a list of branches. The engine builds the mind map (the core
 * in the middle, branches balanced left and right, each a head wired to a frame
 * of boards), the HUD, and the camera: drag to pan, pinch or Cmd-scroll to
 * zoom, double-click to focus, number keys to jump. Grain cards are written as
 * C(opts) placeholders and filled in once the markup is in place.
 *
 * Keep content-specific code in the page. This file is replaced wholesale by
 * `scaffold.mjs <dir> --update`.
 */
(() => {
"use strict";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ==========================================================================
   Seeded randomness: the same hash and generator as EmDash's post-art.ts
   ========================================================================== */
function hash(input) {
	let h = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}
function rng(seed) {
	let state = seed | 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/* ==========================================================================
   Palettes. Blobs are [color, x%, y%, diameter as % of width]. Each palette
   keeps to neighbouring hues, light and slightly cool at the top, dark and
   warm at the bottom.
   ========================================================================== */
/** The EmDash logo gradient, light to dark. Every stop neighbours the next. */
const RAMP = ["#FFF7EC", "#FFE9CB", "#FFCD89", "#FBAD41", "#F6821F", "#FF6633", "#CE2F55", "#911475", "#5D0C83", "#281A81", "#0F006B"];

const PALETTES = {
	// The EmDash set, sliced from RAMP (`range` is the slice).
	sunset: { name: "Sunset", tag: "Brand and hero", range: [0, 10],
		base: ["#FFE7C8", "#F99A52 36%", "#D6406A 64%", "#2B1272"],
		blobs: [["#FFF6EA", 56, -6, 96], ["#FBAD41", 4, 40, 62], ["#FF6633", 96, 56, 64], ["#3A0D78", 30, 108, 94]] },
	kiln: { name: "Kiln", tag: "Changelog, light", range: [0, 4],
		base: ["#FFF3E5", "#FFC888 44%", "#E8742A 74%", "#8E3209"],
		blobs: [["#FFF8F0", 60, -6, 96], ["#FFCD89", 2, 42, 62], ["#F6821F", 94, 72, 68], ["#7A2806", 24, 110, 88]] },
	heat: { name: "Heat", tag: "Changelog", range: [2, 5],
		base: ["#ECE7F0", "#F6A866 42%", "#E2531C 72%", "#561807"],
		blobs: [["#F1ECF4", 48, -6, 96], ["#FBAD41", 6, 50, 60], ["#FA5D19", 92, 70, 70], ["#451205", 30, 110, 90]] },
	dusk: { name: "Dusk", tag: "Announcement", range: [5, 7],
		base: ["#EEE6F4", "#EE9CAF 40%", "#C3345F 70%", "#310A3E"],
		blobs: [["#F4EDF8", 30, -6, 96], ["#FF8C6E", 95, 48, 56], ["#CE2F55", 10, 72, 66], ["#22062C", 70, 110, 90]] },
	afterglow: { name: "Afterglow", tag: "AI and Build", range: [6, 10],
		base: ["#E0DAF1", "#B3649F 42%", "#5C1A7D 72%", "#11093C"],
		blobs: [["#E8E3F5", 50, -6, 96], ["#E2507A", 95, 56, 54], ["#911475", 8, 62, 66], ["#0F006B", 62, 112, 92]] },
	midnight: { name: "Midnight", tag: "Dark mode", range: [8, 10],
		base: ["#CBC4E8", "#7758B6 42%", "#2C1660 72%", "#0A0720"],
		blobs: [["#D5CFEE", 26, -6, 90], ["#B7579F", 95, 46, 50], ["#4B1F8A", 16, 66, 70], ["#07051A", 72, 112, 94]] },
	// Two cool sets for work that isn't a release.
	tide: { name: "Tide", tag: "Engineering", borrowed: true,
		base: ["#E3E9EF", "#88B0C1 42%", "#2D6B85 72%", "#0B2332"],
		blobs: [["#EBF1F5", 50, -6, 96], ["#A6D1C9", 2, 50, 60], ["#2F6F8C", 94, 72, 70], ["#081B27", 28, 110, 92]] },
	moss: { name: "Moss", tag: "Plugins", borrowed: true,
		base: ["#E2E8E3", "#AABD87 42%", "#557A36 72%", "#17220E"],
		blobs: [["#E9EFEA", 58, -6, 96], ["#D3D18A", 4, 46, 60], ["#4F7F35", 92, 68, 68], ["#111B0B", 30, 110, 92]] },
	// The ElevenLabs-style reference set.
	el1: { name: "Violet-pink → orange-gold",
		base: ["#A79CDC", "#D98BAE 46%", "#F07A44 76%", "#F3A43B"],
		blobs: [["#7F8FE6", 8, 10, 76], ["#E08BD0", 90, 16, 78], ["#EE4E3A", 2, 88, 70], ["#F7B43A", 58, 102, 86]] },
	el2: { name: "Grey-blue → deep brown",
		base: ["#94A7B1", "#C59D72 46%", "#9A4A1E 72%", "#23120B"],
		blobs: [["#A3B6C0", 50, -6, 98], ["#F1C58A", 0, 46, 62], ["#E8611E", 96, 66, 66], ["#190A05", 30, 108, 88]] },
	el3: { name: "Mist blue → deep-sea blue",
		base: ["#DEE5EB", "#8FB8B2 42%", "#2F6676 72%", "#0F2F3D"],
		blobs: [["#EBF0F4", 60, -6, 96], ["#7DC0A6", 2, 56, 60], ["#2B6A80", 94, 74, 70], ["#0C2632", 22, 110, 90]] },
	el4: { name: "Mist blue → ink green",
		base: ["#CED8DC", "#A9B677 42%", "#4F6F2C 72%", "#17220E"],
		blobs: [["#D7E0E4", 70, -6, 96], ["#C9CE82", 6, 46, 62], ["#4E7A2E", 72, 68, 70], ["#111B0B", 16, 110, 90]] },
	el5: { name: "Lavender → midnight purple",
		base: ["#BEB5E1", "#9468B2 42%", "#4A2275 72%", "#0F081B"],
		blobs: [["#C7BEE9", 22, -6, 92], ["#E28FCB", 90, 44, 56], ["#5B2E86", 24, 72, 70], ["#0C0616", 70, 110, 92]] },
	el6: { name: "Sky grey → rust red",
		base: ["#D4DDE3", "#F1B08A 42%", "#D8582E 72%", "#6D2311"],
		blobs: [["#DEE6EB", 40, -6, 96], ["#FAD0A8", 94, 34, 56], ["#E5562E", 10, 66, 66], ["#5D1D0C", 76, 110, 84]] },
};
for (const [key, p] of Object.entries(PALETTES)) p.key = key;

/** Add or replace a palette. `def` follows the shape of the entries above. */
function addPalette(key, def) {
	PALETTES[key] = { name: key, ...def, key };
	return PALETTES[key];
}
const baseCSS = (p) => p.baseCSS ?? `linear-gradient(to bottom in oklab, ${p.base.join(", ")})`;
/** Five representative colors of a palette, top to bottom. */
const swatchesOf = (p) => [p.base[0], p.blobs[1][0], p.blobs[2][0], p.base[2].split(" ")[0], p.base[3]];

/* ==========================================================================
   Grain: one 128×128 noise tile shared by every card, drawn at one grain per
   device pixel (the camera keeps --grain-size in step with the zoom).
   ========================================================================== */
function makeGrain() {
	const size = 128;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d");
	const img = ctx.createImageData(size, size);
	for (let i = 0; i < img.data.length; i += 4) {
		// Gaussian around mid-grey, sd 12% of the range: uniform noise read about
		// 2.4x too strong in mid-tones next to ElevenLabs' covers.
		const g = Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
		const v = clamp(Math.round(128 + 0.12 * 255 * g), 0, 255);
		img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
		img.data[i + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
	document.documentElement.style.setProperty("--grain-url", `url(${canvas.toDataURL("image/png")})`);
}

/* ==========================================================================
   Patterns: white linework, and EmDash's halftone motifs when halftone.js
   is loaded
   ========================================================================== */
const f2 = (n) => Math.round(n * 100) / 100;
const poly = (pts, close = false) => "M" + pts.map(([x, y]) => `${f2(x)} ${f2(y)}`).join("L") + (close ? "Z" : "");

const LINES = {
	// Wavy rays fanning up from below the bottom edge.
	rays(W, H, rand) {
		const cx = W * (0.5 + (rand() - 0.5) * 0.16), cy = H * 1.1;
		const n = 52;
		let d = "";
		for (let i = 0; i < n; i++) {
			const a0 = Math.PI + ((i + 0.5) / n) * Math.PI;
			const pts = [];
			for (let r = 8; r <= 170; r += 2.5) {
				const a = a0 + Math.sin(r * 0.085 + i * 0.9) * 0.055 * (r / 170);
				pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
			}
			d += poly(pts);
		}
		return d;
	},
	// Concentric contour lines around a point in the lower half.
	contours(W, H, rand) {
		const cx = W * 0.62, cy = H * 0.68;
		const k1 = rand() * TAU, k2 = rand() * TAU;
		let d = "";
		for (let i = 1; i <= 30; i++) {
			const r0 = i * 4.8;
			const pts = [];
			for (let t = 0; t < 120; t++) {
				const th = (t / 120) * TAU;
				const r = r0 * (1 + 0.07 * Math.sin(3 * th + k1 + i * 0.13) + 0.04 * Math.sin(5 * th + k2 - i * 0.09));
				pts.push([cx + Math.cos(th) * r * 1.1, cy + Math.sin(th) * r]);
			}
			d += poly(pts, true);
		}
		return d;
	},
	// Stacked sound-wave lines, livelier toward the top.
	sound(W, H, rand) {
		const n = 24, ph = rand() * TAU;
		let d = "";
		for (let i = 0; i < n; i++) {
			const y0 = ((i + 0.5) / n) * H;
			const amp = 3.4 * (1 - i / n) ** 1.3 + 0.35;
			const pts = [];
			for (let x = -2; x <= W + 2; x += 1.5) {
				const env = 0.55 + 0.45 * Math.sin(x * 0.035 + i * 0.25 + ph);
				pts.push([x, y0 + amp * env * Math.sin(x * (0.1 + i * 0.002) + ph + i * 0.42)]);
			}
			d += poly(pts);
		}
		return d;
	},
	// A plain dot grid.
	dots(W, H) {
		const step = 6.4;
		let d = "";
		for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) d += `M${f2(x)} ${f2(y)}h0`;
		return d;
	},
	// A lattice of lens (vesica) outlines: horizontal lenses between lattice
	// points in each row, vertical ones in each column.
	lens(W, H) {
		const S = 38, L = S * 0.9, Wd = S * 0.3;
		const s = Wd / 2, R = (L * L) / 4 / (2 * s) + s / 2;
		const lens = (x, y, vertical) => {
			const [dx, dy] = vertical ? [0, L / 2] : [L / 2, 0];
			return `M${f2(x - dx)} ${f2(y - dy)}A${f2(R)} ${f2(R)} 0 0 1 ${f2(x + dx)} ${f2(y + dy)}A${f2(R)} ${f2(R)} 0 0 1 ${f2(x - dx)} ${f2(y - dy)}Z`;
		};
		const cx = W / 2, cy = H / 2, n = Math.ceil(Math.max(W, H) / S / 2) + 1;
		let d = "";
		for (let i = -n; i <= n; i++) {
			for (let j = -n; j <= n; j++) {
				d += lens(cx + (i + 0.5) * S, cy + j * S, false);
				d += lens(cx + i * S, cy + (j + 0.5) * S, true);
			}
		}
		return d;
	},
};

function linesSVG(kind, ar, rand) {
	if (!LINES[kind]) throw new Error(`Unknown pattern "${kind}". Use halftone, ${Object.keys(LINES).join(", ")}.`);
	const W = 100 * ar, H = 100;
	const cls = kind === "dots" ? "ln ln--dots" : "ln";
	return `<svg class="${cls}" viewBox="0 0 ${f2(W)} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="${LINES[kind](W, H, rand)}"/></svg>`;
}

/** Halftone grid for a cover shape: EmDash's grids for 16:10 and 2:1, square otherwise. */
function gridFor(ar, rows = 24) {
	if (Math.abs(ar - 1.6) < 0.05) return [36, 22];
	if (ar >= 1.85) return [64, 32];
	return [Math.round(rows * ar), rows];
}

/** Motif order in post-art.ts: a seed's motif is MOTIFS[hash(seed) % 10]. */
const MOTIFS = ["waves", "ripple", "dash", "sphere", "lines", "waveform", "braid", "stack", "horizon", "calendar"];
const motifOf = (seed) => MOTIFS[hash(seed) % MOTIFS.length];
/** A seed whose halftone motif is `motif`. */
function seedFor(motif, salt = "m") {
	for (let i = 0; i < 1000; i++) {
		const seed = `${salt}-${motif}-${i}`;
		if (motifOf(seed) === motif) return seed;
	}
	return motif;
}

function halftoneLayers(seed, [cols, rows]) {
	if (!window.EmDashArt) throw new Error("Halftone patterns need halftone.js, loaded before canvas.js (scaffold with --halftone).");
	const art = window.EmDashArt.halftoneArt(seed, cols, rows);
	let ink = "", acc = "";
	for (const layer of art.layers) {
		const p = `<path d="${layer.d}" stroke-width="${layer.width}"/>`;
		if (layer.accent) acc += p; else ink += p;
	}
	return { art, ink, acc };
}
function halftoneSVG(seed, grid, accent = "white") {
	const { art, ink, acc } = halftoneLayers(seed, grid);
	return `<svg class="ht" viewBox="0 0 ${art.width} ${art.height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g class="ht-ink">${ink}</g><g class="ht-acc ht-acc--${accent}">${acc}</g></svg>`;
}

let paperId = 0;
/** The cover as emdashcms.com draws it today: halftone on paper. Returns an element. */
function paperCover(seed, grid) {
	const { art, ink, acc } = halftoneLayers(seed, grid);
	const id = `paper-${paperId++}`;
	const el = document.createElement("div");
	el.className = "cur";
	el.innerHTML = `<svg viewBox="0 0 ${art.width} ${art.height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><circle class="paper" cx="5" cy="5" r="0.75"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/><g class="ink">${ink}</g><g class="acc">${acc}</g></svg>`;
	return el;
}

/* ==========================================================================
   Grain cards
   ========================================================================== */
const io = new IntersectionObserver((entries) => {
	for (const e of entries) e.target.classList.toggle("is-off", !e.isIntersecting);
}, { rootMargin: "160px" });

function blobsHTML(p, rand, mirror) {
	const pct = (k) => `${((rand() - 0.5) * k).toFixed(1)}%`;
	return p.blobs.map(([c, x, y, s]) => {
		const X = (mirror ? 100 - x : x) + (rand() - 0.5) * 12;
		const Y = y + (rand() - 0.5) * 8;
		const S = s * (0.92 + rand() * 0.16);
		const dur = 20 + rand() * 8;
		const delay = -rand() * dur;
		return `<i class="blob" style="--c:${c};--x:${X.toFixed(1)}%;--y:${Y.toFixed(1)}%;--s:${S.toFixed(1)}%;--dur:${dur.toFixed(1)}s;--delay:${delay.toFixed(1)}s;--dx1:${pct(24)};--dy1:${pct(18)};--dx2:${pct(24)};--dy2:${pct(18)};--s1:${(0.93 + rand() * 0.15).toFixed(3)};--s2:${(0.93 + rand() * 0.15).toFixed(3)}"></i>`;
	}).join("");
}

function titleHTML(o) {
	if (o.html) return `<div class="gc-over">${o.html}</div>`;
	switch (o.titleStyle ?? (o.title ? "center" : null)) {
		case "center": return `<div class="gc-title">${esc(o.title)}</div>`;
		case "numeral": return `<div class="gc-numeral"><span class="gc-numeral-n">${esc(o.title)}</span><span class="gc-numeral-cap">${esc(o.caption ?? "EmDash")}</span></div>`;
		case "corner": return `<div class="gc-corner"><span class="gc-pill">${esc(o.tag ?? "")}</span><span class="gc-date">${esc(o.date ?? "")}</span><span class="gc-corner-title">${esc(o.title)}</span></div>`;
		case "mark": return `<div class="gc-mark"><i></i></div>`;
		case "mono": return `<div class="gc-mono"><b>${esc(o.title)}</b><span>${esc(o.caption ?? "")}</span></div>`;
		default: return "";
	}
}

/**
 * Build a grain card element. Options:
 *   palette   key of PALETTES, or a palette object
 *   seed      string; the same seed always gives the same blobs (default: palette name)
 *   ar        aspect ratio, width / height (default 1)
 *   w, r      fixed width and corner radius in px (default: fill the parent, 20px)
 *   grain     overlay opacity, 0 to turn it off (default 0.4)
 *   pattern   { kind: "rays" | "contours" | "sound" | "dots" | "lens" | "halftone",
 *               seed?, motif?, grid?, mask?: true | false | "left" }
 *   accent    halftone accent: "white" | "heat" | "none"
 *   title     text; "\n" breaks lines. titleStyle: "center" | "numeral" | "corner" | "mark" | "mono"
 *   caption, tag, date   extra text for the numeral, corner and mono styles
 *   html      custom overlay markup instead of a title (e.g. a share card)
 *   layers    { base, blobs, pattern, grain, title }: false hides a layer
 *   static    true stops the drift
 *   mirror    flip the blob layout (default: decided by the seed)
 *   cls       extra classes
 */
function makeCard(o) {
	const p = typeof o.palette === "string" ? PALETTES[o.palette] : o.palette;
	if (!p) throw new Error(`Unknown palette "${o.palette}". Known: ${Object.keys(PALETTES).join(", ")}.`);
	const seed = o.seed ?? p.name;
	const rand = rng(hash(`${seed}|${p.name}`));
	const mirror = o.mirror ?? rand() < 0.5;
	const L = { base: true, blobs: true, pattern: true, grain: true, title: true, ...o.layers };
	const ar = o.ar ?? 1;
	const grain = o.grain ?? 0.4;

	const el = document.createElement("div");
	el.className = "gc" + (o.static ? " is-static" : "") + (o.cls ? ` ${o.cls}` : "");
	el.style.setProperty("--ar", ar);
	if (o.w) el.style.width = `${o.w}px`;
	if (o.r != null) el.style.setProperty("--r", `${o.r}px`);
	if (L.base) el.style.setProperty("--base", baseCSS(p));
	el.style.setProperty("--grain", grain);

	let html = "";
	if (L.blobs && p.blobs.length) html += `<div class="gc-blobs">${blobsHTML(p, rand, mirror)}</div>`;
	const pt = o.pattern;
	if (pt && L.pattern) {
		// Halftone motifs are centred compositions, so under a title they fade to
		// a band rather than losing their middle to a radial mask.
		const masked = pt.mask ?? Boolean(o.title || o.titleStyle);
		const maskCls = pt.mask === "left" ? " mask-left" : !masked ? "" : pt.kind === "halftone" ? " is-banded" : " is-masked";
		const svg = pt.kind === "halftone"
			? halftoneSVG(pt.seed ?? seedFor(pt.motif ?? "waves", seed), pt.grid ?? gridFor(ar), o.accent ?? "white")
			: linesSVG(pt.kind, ar, rng(hash(`${seed}|${pt.kind}`)));
		html += `<div class="gc-pattern${maskCls}">${svg}</div>`;
	}
	if (L.grain && grain > 0) html += `<div class="gc-grain"></div>`;
	if (L.title) html += titleHTML(o);
	el.innerHTML = html;

	if (!o.static) io.observe(el);
	return el;
}

/* Templates call C(opts) and get a placeholder; hydrate() swaps in the card. */
const slots = [];
const C = (opts) => (slots.push(opts), `<span class="slot" data-slot="${slots.length - 1}"></span>`);
function hydrate(root = document) {
	for (const el of $$(".slot", root)) el.replaceWith(makeCard(slots[+el.dataset.slot]));
}

/* ==========================================================================
   Markup helpers. Each returns an HTML string.
   ========================================================================== */
const boardHead = (n, title, desc) => `<div class="board-head">${n ? `<p class="eyebrow">${n}</p>` : ""}<h3 class="board-title">${title}</h3>${desc ? `<p class="board-desc">${desc}</p>` : ""}</div>`;
/** A white board: eyebrow number, title, one-line description, then the body. opts: width, controls, id, cls. */
function board(n, title, desc, body, opts = {}) {
	const head = boardHead(n, title, desc);
	const top = opts.controls ? `<div class="board-bar">${head}<div class="controls">${opts.controls}</div></div>` : head;
	const attrs = `${opts.id ? ` id="${opts.id}"` : ""}${opts.width ? ` style="width:${opts.width}px"` : ""}`;
	return `<article class="board${opts.cls ? ` ${opts.cls}` : ""}"${attrs}>${top}${body}</article>`;
}
/** A captioned figure. Captions read best as "<b>Name</b> · note". */
const fig = (inner, caption) => `<figure>${inner}${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
/** A grid of `cols` columns, each `width` px wide (or any CSS track, e.g. "1fr"). */
const grid = (cols, width, items) => `<div class="cards" style="grid-template-columns:repeat(${cols},${typeof width === "number" ? `${width}px` : width})">${items.join("")}</div>`;
const row = (...items) => `<div class="row">${items.join("")}</div>`;
const stack = (...items) => `<div class="stack">${items.join("")}</div>`;
const prose = (html) => `<div class="prose">${html}</div>`;
/** A code block with a file name and a Copy button. */
const code = (text, name = "text") => `<div class="code"><div class="code-bar"><span>${esc(name)}</span><button type="button" class="copy" data-copy>Copy</button></div><pre>${esc(text)}</pre></div>`;
/** A segmented control. options: [[value, label], ...]. Listen with api.onSeg(name, fn). */
const seg = (name, options, active) => `<div class="seg" data-seg="${esc(name)}" role="group" aria-label="${esc(name)}">${options.map(([v, label]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === active}">${label}</button>`).join("")}</div>`;
const swatches = (colors) => `<span class="swatches">${colors.map((c) => `<i style="--sw:${c}"></i>`).join("")}</span>`;

/** The EmDash mark in its own gradient. Pass a prefix so several copies keep unique gradient ids. */
const mark = (id = "mk") => `<svg viewBox="0 0 75 75" fill="none" aria-hidden="true"><rect x="3" y="3" width="69" height="69" rx="10.518" stroke="url(#${id}0)" stroke-width="6"/><rect x="18" y="34" width="39.3661" height="6.56101" fill="url(#${id}1)"/><defs><linearGradient id="${id}0" x1="-43" y1="124" x2="92.4" y2="-41.7" gradientUnits="userSpaceOnUse"><stop stop-color="#0F006B"/><stop offset=".083" stop-color="#281A81"/><stop offset=".167" stop-color="#5D0C83"/><stop offset=".25" stop-color="#911475"/><stop offset=".333" stop-color="#CE2F55"/><stop offset=".417" stop-color="#FF6633"/><stop offset=".5" stop-color="#F6821F"/><stop offset=".583" stop-color="#FBAD41"/><stop offset=".667" stop-color="#FFCD89"/><stop offset=".75" stop-color="#FFE9CB"/><stop offset=".833" stop-color="#FFF7EC"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="${id}1" x1="91.5" y1="27.5" x2="28.1" y2="54.2" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset=".13" stop-color="#FFF8EE"/><stop offset=".62" stop-color="#FBAD41"/><stop offset=".85" stop-color="#F6821F"/><stop offset="1" stop-color="#FF6633"/></linearGradient></defs></svg>`;
const MARK_WHITE = `<svg viewBox="0 0 75 75" fill="none" aria-hidden="true"><rect x="4" y="4" width="67" height="67" rx="10.5" stroke="#fff" stroke-width="6"/><rect x="18" y="34" width="39.4" height="6.6" fill="#fff"/></svg>`;
const ARROW = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12m0 0-5-5m5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Pin a .site mock to "light" or "dark", or let it follow the canvas with "auto". */
function siteTheme(el, mode) {
	el.classList.toggle("is-light", mode === "light");
	el.classList.toggle("is-dark", mode === "dark");
}

/* ==========================================================================
   Mount
   ========================================================================== */
const TOGGLES = { grain: ["Grain", "G"], pattern: ["Pattern", "P"], motion: ["Motion", "M"] };
const THEMES = {
	light: ["Light", `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9"/></svg>`],
	system: ["Match system", `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none"/></svg>`],
	dark: ["Dark", `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z"/></svg>`],
};
const THEME_KEY = "exploration-canvas:theme";

/**
 * config:
 *   title, subtitle   HUD labels (and the document title)
 *   mark              HUD logo markup (default: the EmDash mark)
 *   core              { eyebrow, title, desc, card: cardOptions } or { eyebrow, title, desc, html }
 *   branches          [{ title, sub, orb: paletteKey, side?: "left" | "right", body: () => html }]
 *   toggles           HUD layer toggles, default ["grain", "pattern", "motion"]; [] hides them
 *   theme             "system" (default), "light" or "dark"; the viewer's own choice wins
 *   onReady(api)      runs once the map is built: draw canvases, wire up controls
 */
function mount(config) {
	const branches = config.branches.map((b, i) => ({ ...b, n: i + 1 }));
	const half = Math.ceil(branches.length / 2);
	for (const [i, b] of branches.entries()) b.side ??= i < half ? "left" : "right";
	const toggles = config.toggles ?? ["grain", "pattern", "motion"];
	document.title = config.pageTitle ?? [config.title, config.subtitle].filter(Boolean).join(" · ");

	/* ---------- Theme: set before any markup, so the first frame is already right ---------- */
	const darkQuery = matchMedia("(prefers-color-scheme: dark)");
	const themeHandlers = [];
	let themePref = config.theme ?? "system";
	try { themePref = localStorage.getItem(THEME_KEY) ?? themePref; } catch { /* storage can be blocked */ }
	if (!THEMES[themePref]) themePref = "system";
	const currentTheme = () => (themePref === "system" ? (darkQuery.matches ? "dark" : "light") : themePref);
	function applyTheme() {
		const theme = currentTheme();
		document.documentElement.dataset.theme = theme;
		for (const b of $$("[data-theme-set]")) b.setAttribute("aria-pressed", String(b.dataset.themeSet === themePref));
		for (const fn of themeHandlers) fn(theme);
	}
	function setTheme(pref) {
		themePref = pref;
		try { localStorage.setItem(THEME_KEY, pref); } catch { /* the choice just won't persist */ }
		applyTheme();
	}
	darkQuery.addEventListener("change", () => { if (themePref === "system") applyTheme(); });
	applyTheme();

	makeGrain();
	document.body.insertAdjacentHTML("afterbegin", `<div id="viewport" aria-label="Exploration canvas. Drag to pan, pinch or Command-scroll to zoom."><div id="world"><svg id="wires" aria-hidden="true"></svg><div class="map" id="map"></div></div></div>`);
	const keys = Math.min(9, branches.length);
	document.body.insertAdjacentHTML("beforeend", `
		<div class="hud hud-brand panel">${config.mark ?? mark("hud")}<div><b>${esc(config.title)}</b><span>${esc(config.subtitle ?? "")}</span></div></div>
		<nav class="hud hud-index panel" aria-label="Branches"><ol id="index">
			<li><button type="button" data-go="0"><span>0</span>Overview</button></li><hr>
			${branches.map((b) => `<li><button type="button" data-go="${b.n}"><span>${b.n}</span>${esc(b.title)}</button></li>`).join("")}
		</ol></nav>
		<div class="hud hud-view panel" role="group" aria-label="View">
			${toggles.map((t) => `<button type="button" data-toggle="${t}" aria-pressed="true"><i></i>${TOGGLES[t][0]} <kbd>${TOGGLES[t][1]}</kbd></button>`).join("")}
			${toggles.length ? `<span class="hud-sep" aria-hidden="true"></span>` : ""}
			<div class="theme-seg" role="group" aria-label="Theme">${Object.entries(THEMES).map(([key, [label, icon]]) => `<button type="button" data-theme-set="${key}" aria-pressed="false" aria-label="${label}" title="${label}${key === "dark" || key === "light" ? " (D)" : ""}">${icon}</button>`).join("")}</div>
		</div>
		<div class="hud hud-zoom panel" role="group" aria-label="Zoom">
			<button type="button" data-zoom="out" aria-label="Zoom out">−</button>
			<output id="zoom-level">100%</output>
			<button type="button" data-zoom="in" aria-label="Zoom in">+</button>
			<button type="button" data-zoom="fit">Fit</button>
		</div>
		<div class="hud hud-hint panel">Drag to pan · Pinch or <kbd>⌘</kbd>-scroll to zoom · Double-click to focus · <kbd>0</kbd> fit${keys ? ` · <kbd>1</kbd>–<kbd>${keys}</kbd> jump` : ""} · <kbd>D</kbd> theme</div>`);
	applyTheme();

	const branchHTML = (b) => `<section class="branch" id="b-${b.n}" data-n="${b.n}" aria-labelledby="h-${b.n}">
		<button type="button" class="head" data-go="${b.n}">
			<span class="head-orb">${C({ palette: b.orb ?? "sunset", seed: `orb-${b.n}`, w: 76, r: 999, static: true, cls: "no-ring" })}</span>
			<span class="head-text"><span class="head-num">${String(b.n).padStart(2, "0")}</span><span class="head-title" id="h-${b.n}">${esc(b.title)}</span>${b.sub ? `<span class="head-sub">${esc(b.sub)}</span>` : ""}</span>
		</button>
		<div class="frame">${typeof b.body === "function" ? b.body() : b.body ?? ""}</div>
	</section>`;
	const core = config.core ?? {};
	const coreHTML = `<div class="core" id="core">
		<div class="core-card" id="core-card">${core.html ?? C({ palette: "sunset", seed: "core", r: 36, ...core.card })}</div>
		<div class="core-cap">
			${core.eyebrow ? `<p class="eyebrow">${core.eyebrow}</p>` : ""}
			<h1 class="core-title">${core.title ?? esc(config.title)}</h1>
			${core.desc ? `<p class="core-desc">${core.desc}</p>` : ""}
		</div>
	</div>`;
	const map = $("#map");
	map.innerHTML = `
		<div class="side side--left">${branches.filter((b) => b.side === "left").map(branchHTML).join("")}</div>
		${coreHTML}
		<div class="side side--right">${branches.filter((b) => b.side === "right").map(branchHTML).join("")}</div>`;
	hydrate(map);

	/* ---------- Camera ---------- */
	const vp = $("#viewport"), world = $("#world"), wires = $("#wires");
	const cam = { x: 0, y: 0, z: 1 };
	const Z_MIN = 0.06, Z_MAX = 4;
	let settleTimer = 0, flyRaf = 0, grainZ = 0, wireZ = 0;
	// Until the user moves the camera, keep the overview framed as the window resizes.
	let userMoved = false;

	function updateGrain() {
		grainZ = cam.z;
		document.documentElement.style.setProperty("--grain-size", `${128 / ((devicePixelRatio || 1) * cam.z)}px`);
	}
	function render() {
		// Re-size the grain whenever zoom has drifted 30% from the size it was drawn for.
		if (!grainZ || Math.abs(Math.log(cam.z / grainZ)) > 0.26) updateGrain();
		world.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.z})`;
		// Wires keep a constant screen width, so redraw them as the zoom drifts too.
		if (wireZ && Math.abs(Math.log(cam.z / wireZ)) > 0.14) drawWires();
		let dot = 24 * cam.z;
		while (dot < 14) dot *= 4;
		vp.style.setProperty("--dot", `${dot}px`);
		vp.style.setProperty("--dot-x", `${cam.x}px`);
		vp.style.setProperty("--dot-y", `${cam.y}px`);
		$("#zoom-level").value = `${Math.round(cam.z * 100)}%`;
	}
	function moving(byUser = true) {
		if (byUser) userMoved = true;
		world.classList.add("is-moving");
		clearTimeout(settleTimer);
		settleTimer = setTimeout(settle, 160);
	}
	function settle() {
		world.classList.remove("is-moving");
		// Exactly one grain per device pixel once the camera rests.
		updateGrain();
		world.classList.toggle("is-far", cam.z < 0.22);
		drawWires();
		markActive();
	}
	function zoomAt(cx, cy, z) {
		z = clamp(z, Z_MIN, Z_MAX);
		const wx = (cx - cam.x) / cam.z, wy = (cy - cam.y) / cam.z;
		cam.z = z;
		cam.x = cx - wx * z;
		cam.y = cy - wy * z;
	}
	function worldRect(el) {
		const r = el.getBoundingClientRect();
		return { x: (r.left - cam.x) / cam.z, y: (r.top - cam.y) / cam.z, w: r.width / cam.z, h: r.height / cam.z };
	}
	function union(rects) {
		const x = Math.min(...rects.map((r) => r.x)), y = Math.min(...rects.map((r) => r.y));
		const X = Math.max(...rects.map((r) => r.x + r.w)), Y = Math.max(...rects.map((r) => r.y + r.h));
		return { x, y, w: X - x, h: Y - y };
	}
	/** Camera framing `rect`, inside the area the HUD leaves free. */
	function viewFor(rect, pad = 48, zMax = 1.4) {
		const left = innerWidth > 900 ? 268 : 0, top = 76, bottom = 60;
		const w = innerWidth - left - pad * 2, h = innerHeight - top - bottom - pad * 2;
		const z = clamp(Math.min(Math.max(w, 1) / rect.w, Math.max(h, 1) / rect.h), Z_MIN, zMax);
		const sx = left + (innerWidth - left) / 2, sy = top + (innerHeight - top - bottom) / 2;
		return { z, cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, sx, sy };
	}
	const camFor = (view, cx = view.cx, cy = view.cy, z = view.z) => ({ x: view.sx - cx * z, y: view.sy - cy * z, z });
	function flyTo(rect, pad, zMax) {
		cancelAnimationFrame(flyRaf);
		const to = viewFor(rect, pad, zMax);
		if (reduceMotion) {
			Object.assign(cam, camFor(to));
			render(); settle();
			return;
		}
		const from = { cx: (to.sx - cam.x) / cam.z, cy: (to.sy - cam.y) / cam.z, z: cam.z };
		const t0 = performance.now(), D = 760;
		const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
		const step = (now) => {
			const t = Math.min(1, (now - t0) / D), e = ease(t);
			// Zoom moves in log space, so zooming in and out feel equally fast.
			const z = Math.exp(lerp(Math.log(from.z), Math.log(to.z), e));
			Object.assign(cam, camFor(to, lerp(from.cx, to.cx, e), lerp(from.cy, to.cy, e), z));
			render(); moving();
			if (t < 1) flyRaf = requestAnimationFrame(step);
		};
		flyRaf = requestAnimationFrame(step);
	}
	const overviewRect = () => union([...$$(".frame, .head"), $("#core")].map(worldRect));
	function goBranch(n) {
		if (n === 0) return flyTo(overviewRect(), 32, 1);
		const b = $(`#b-${n}`);
		if (b) flyTo(union([worldRect($(".head", b)), worldRect($(".frame", b))]), 40, 1);
	}
	const focus = (target, i = 0, zMax = 2) => {
		const el = typeof target === "string" ? $$(target)[i] : target;
		if (el) flyTo(worldRect(el), 40, zMax);
	};

	/* ---------- Wires ---------- */
	function drawWires() {
		wireZ = cam.z;
		const core = worldRect($("#core-card"));
		const k = 1 / cam.z;
		const sw = 1.5 * k, r = 4.5 * k;
		let paths = "", dots = "";
		for (const b of $$(".branch")) {
			const left = b.closest(".side--left") !== null;
			const head = worldRect($(".head", b)), frame = worldRect($(".frame", b));
			const sx = left ? core.x - 26 : core.x + core.w + 26, sy = core.y + core.h / 2;
			const ex = left ? head.x + head.w : head.x, ey = head.y + head.h / 2;
			const c = Math.abs(ex - sx) * 0.62 * (left ? -1 : 1);
			paths += `<path d="M${sx} ${sy}C${sx + c} ${sy} ${ex - c} ${ey} ${ex} ${ey}"/>`;
			const hx = left ? head.x : head.x + head.w, fx = left ? frame.x + frame.w : frame.x;
			paths += `<path d="M${hx} ${ey}L${fx} ${ey}"/>`;
			dots += `<circle cx="${ex}" cy="${ey}" r="${r}"/><circle cx="${hx}" cy="${ey}" r="${r}"/><circle cx="${fx}" cy="${ey}" r="${r}"/>`;
		}
		const ports = [core.x - 26, core.x + core.w + 26].map((x) => `<circle class="w-core" cx="${x}" cy="${core.y + core.h / 2}" r="${r * 1.5}" stroke-width="${2 * k}"/>`).join("");
		wires.innerHTML = `<g stroke-width="${sw}">${paths}</g><g stroke-width="${sw}">${dots}</g>${ports}`;
	}

	function markActive() {
		const cx = (innerWidth / 2 - cam.x) / cam.z, cy = (innerHeight / 2 - cam.y) / cam.z;
		let active = 0;
		if (cam.z > 0.2) {
			for (const b of $$(".branch")) {
				const r = union([worldRect($(".head", b)), worldRect($(".frame", b))]);
				if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) active = +b.dataset.n;
			}
		}
		for (const btn of $$("#index button")) btn.classList.toggle("is-active", +btn.dataset.go === active);
	}

	/* ---------- Input ---------- */
	vp.addEventListener("wheel", (e) => {
		e.preventDefault();
		cancelAnimationFrame(flyRaf);
		let dx = e.deltaX, dy = e.deltaY;
		if (e.deltaMode === 1) { dx *= 16; dy *= 16; }
		else if (e.deltaMode === 2) { dx *= innerHeight; dy *= innerHeight; }
		if (e.ctrlKey || e.metaKey) {
			zoomAt(e.clientX, e.clientY, cam.z * clamp(Math.exp(-dy * 0.01), 0.8, 1.25));
		} else if (e.shiftKey && !dx) {
			cam.x -= dy;
		} else {
			cam.x -= dx;
			cam.y -= dy;
		}
		render(); moving();
	}, { passive: false });

	// Safari reports pinches as gesture events rather than ctrl+wheel.
	let gestureZ = 1;
	addEventListener("gesturestart", (e) => { e.preventDefault(); gestureZ = cam.z; cancelAnimationFrame(flyRaf); });
	addEventListener("gesturechange", (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, gestureZ * e.scale); render(); moving(); });
	addEventListener("gestureend", (e) => e.preventDefault());

	const pointers = new Map();
	let drag = null, pinch = null, suppressClick = false;
	const NO_PAN = "button, a, input, select, textarea, .code, .seg, .hud";

	vp.addEventListener("pointerdown", (e) => {
		if (e.button !== 0 && e.button !== 1) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		cancelAnimationFrame(flyRaf);
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
			drag = null;
			return;
		}
		if (e.target.closest(NO_PAN) && e.button === 0) return;
		drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, id: e.pointerId, moved: false };
	});
	vp.addEventListener("pointermove", (e) => {
		if (!pointers.has(e.pointerId)) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pinch && pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
			cam.x += mx - pinch.mx; cam.y += my - pinch.my;
			zoomAt(mx, my, cam.z * (d / pinch.d));
			pinch = { d, mx, my };
			render(); moving();
			return;
		}
		if (!drag || drag.id !== e.pointerId) return;
		const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
		if (!drag.moved && Math.hypot(dx, dy) > 3) {
			drag.moved = true;
			vp.classList.add("is-panning");
			vp.setPointerCapture(e.pointerId);
		}
		if (drag.moved) {
			cam.x = drag.cx + dx; cam.y = drag.cy + dy;
			render(); moving();
		}
	});
	const endPointer = (e) => {
		pointers.delete(e.pointerId);
		if (pointers.size < 2) pinch = null;
		if (drag && drag.id === e.pointerId) {
			if (drag.moved) suppressClick = true;
			drag = null;
			vp.classList.remove("is-panning");
		}
	};
	vp.addEventListener("pointerup", endPointer);
	vp.addEventListener("pointercancel", endPointer);
	// A drag shouldn't also count as a click on whatever it started over.
	addEventListener("click", (e) => {
		if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); }
	}, true);

	vp.addEventListener("dblclick", (e) => {
		if (e.target.closest(NO_PAN)) return;
		const target = e.target.closest(".board, .core, .head, .frame");
		if (target) flyTo(worldRect(target), 40, 2);
		else { zoomAt(e.clientX, e.clientY, cam.z * 2); render(); moving(); }
	});

	const segHandlers = {};
	document.addEventListener("click", (e) => {
		const go = e.target.closest("[data-go]");
		if (go) goBranch(+go.dataset.go);
		const zoom = e.target.closest("[data-zoom]");
		if (zoom) {
			const v = zoom.dataset.zoom;
			if (v === "fit") goBranch(0);
			else { zoomAt(innerWidth / 2, innerHeight / 2, cam.z * (v === "in" ? 1.25 : 0.8)); render(); moving(); }
		}
		const copy = e.target.closest("[data-copy]");
		if (copy) {
			const text = copy.closest(".code").querySelector("pre").textContent;
			const done = () => {
				copy.textContent = "Copied";
				copy.classList.add("is-done");
				setTimeout(() => { copy.textContent = "Copy"; copy.classList.remove("is-done"); }, 1400);
			};
			const fallback = () => {
				const ta = Object.assign(document.createElement("textarea"), { value: text });
				document.body.append(ta);
				ta.select();
				document.execCommand("copy");
				ta.remove();
				done();
			};
			if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback);
			else fallback();
		}
		const toggle = e.target.closest("[data-toggle]");
		if (toggle) setToggle(toggle.dataset.toggle);
		const themeButton = e.target.closest("[data-theme-set]");
		if (themeButton) setTheme(themeButton.dataset.themeSet);
		const segButton = e.target.closest(".seg button");
		if (segButton) {
			const group = segButton.closest(".seg");
			for (const b of $$("button", group)) b.setAttribute("aria-pressed", String(b === segButton));
			for (const fn of segHandlers[group.dataset.seg] ?? []) fn(segButton.dataset.v, group);
		}
	});

	function setToggle(name) {
		const btn = $(`[data-toggle="${name}"]`);
		if (!btn) return;
		const on = btn.getAttribute("aria-pressed") !== "true";
		btn.setAttribute("aria-pressed", String(on));
		document.body.classList.toggle(`no-${name}`, !on);
	}
	if (reduceMotion) {
		const btn = $('[data-toggle="motion"]');
		if (btn) {
			btn.setAttribute("aria-pressed", "false");
			btn.title = "Off: prefers-reduced-motion is set";
		}
		document.body.classList.add("no-motion");
	}

	addEventListener("keydown", (e) => {
		if (e.target.closest("input, textarea, select")) return;
		const zoomBy = (f) => { zoomAt(innerWidth / 2, innerHeight / 2, cam.z * f); render(); moving(); };
		if (e.metaKey || e.ctrlKey) {
			if (e.key === "0") { e.preventDefault(); goBranch(0); }
			else if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomBy(1.25); }
			else if (e.key === "-") { e.preventDefault(); zoomBy(0.8); }
			return;
		}
		if (e.altKey) return;
		const step = e.shiftKey ? 360 : 90;
		if (/^[0-9]$/.test(e.key) && +e.key <= branches.length) { goBranch(+e.key); e.preventDefault(); return; }
		switch (e.key) {
			case "=": case "+": zoomBy(1.25); break;
			case "-": case "_": zoomBy(0.8); break;
			case "g": case "G": setToggle("grain"); break;
			case "p": case "P": setToggle("pattern"); break;
			case "m": case "M": setToggle("motion"); break;
			case "d": case "D": setTheme(currentTheme() === "dark" ? "light" : "dark"); break;
			case "ArrowLeft": cam.x += step; render(); moving(); break;
			case "ArrowRight": cam.x -= step; render(); moving(); break;
			case "ArrowUp": cam.y += step; render(); moving(); break;
			case "ArrowDown": cam.y -= step; render(); moving(); break;
			default: return;
		}
		e.preventDefault();
	});

	/* ---------- Start ---------- */
	const api = {
		$, $$, makeCard, hydrate, focus, goBranch,
		onSeg: (name, fn) => (segHandlers[name] ??= []).push(fn),
		/** The theme in effect, "light" or "dark". */
		theme: currentTheme,
		/** fn(theme) whenever the theme changes. */
		onTheme: (fn) => themeHandlers.push(fn),
		setTheme,
		/** Redraw wires and grain after the page changes layout. */
		refresh: settle,
	};
	window.canvasMap = { goBranch, focus };
	config.onReady?.(api);

	function frameOverview() {
		Object.assign(cam, camFor(viewFor(overviewRect(), 32, 1)));
		render();
		settle();
	}
	frameOverview();
	document.fonts?.ready.then(() => (userMoved ? settle() : frameOverview()));
	addEventListener("resize", () => (userMoved ? settle() : frameOverview()));
	return api;
}

window.ExplorationCanvas = {
	mount, C, makeCard, hydrate,
	board, fig, grid, row, stack, prose, code, seg, swatches, esc, siteTheme,
	PALETTES, RAMP, addPalette, swatchesOf, baseCSS,
	MOTIFS, motifOf, seedFor, gridFor, paperCover,
	rng, hash, poly, mark, MARK_WHITE, ARROW,
};
})();
