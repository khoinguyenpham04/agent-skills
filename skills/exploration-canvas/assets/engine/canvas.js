/*
 * Exploration canvas engine, from the exploration-canvas skill.
 *
 * A page loads canvas.css and this file, then calls ExplorationCanvas.mount()
 * with a core and a list of branches. The engine builds the map (the core in
 * the middle, branches wired out to frames of boards), the HUD and the camera:
 * drag to pan, pinch or Cmd-scroll to zoom, double-click to focus, number keys
 * to jump, arrow keys to walk through board by board. It also runs the
 * interactive pieces the helpers below write: step-through explainers, live
 * demos, flip cards, quizzes, diagrams that build in as you arrive, and a
 * docked player for timestamped video sources.
 *
 * Keep content-specific code in the page. This file is replaced wholesale by
 * `scaffold.mjs <dir> --update`.
 */
(() => {
"use strict";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Below this zoom the canvas is "far": text is texture and nothing builds in. */
const FAR = 0.22;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const px = (v) => (typeof v === "number" ? `${v}px` : v);
let uidCount = 0;
const uid = (prefix) => `${prefix}-${++uidCount}`;
/** Let a helper take a plain value where it takes options: opts("warn", "kind") → { kind: "warn" }. */
const opts = (o, key) => (o == null ? {} : typeof o === "object" && !Array.isArray(o) ? o : { [key]: o });

/* ==========================================================================
   Time: "1:02:03", "12:34" or seconds
   ========================================================================== */
const TIME = /^\d+(?::\d{1,2}){1,2}$/;
/** "1:02:03", "12:34", "95" or 95 → seconds. */
function secs(t) {
	if (typeof t === "number") return t;
	return String(t).trim().split(":").reduce((total, part) => total * 60 + Number(part), 0);
}
/** Seconds → "2:05" or "1:02:03". */
function clock(s) {
	s = Math.max(0, Math.round(s));
	const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
	return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(r).padStart(2, "0")}`;
}

/* ==========================================================================
   Icons: 24px line icons drawn for this engine. icon(name) or glyph(name).
   ========================================================================== */
const ICONS = {
	hub: '<circle cx="12" cy="12" r="2.75"/><path d="M9.25 12H5M14.75 12H19M12 9.25V5M12 14.75V19"/><circle cx="3.75" cy="12" r="1.25"/><circle cx="20.25" cy="12" r="1.25"/><circle cx="12" cy="3.75" r="1.25"/><circle cx="12" cy="20.25" r="1.25"/>',
	book: '<path d="M3.75 5.5c3-.75 5.75-.25 8.25 1.5v12c-2.5-1.75-5.25-2.25-8.25-1.5z"/><path d="M20.25 5.5c-3-.75-5.75-.25-8.25 1.5v12c2.5-1.75 5.25-2.25 8.25-1.5z"/>',
	play: '<circle cx="12" cy="12" r="8.25"/><path d="M10.25 8.75v6.5l5-3.25z"/>',
	list: '<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
	bulb: '<path d="M9.25 17.75h5.5M10.25 20.75h3.5"/><path d="M12 3.25a5.75 5.75 0 0 0-3.4 10.4c.55.4.9 1.05.9 1.75v.35h5v-.35c0-.7.35-1.35.9-1.75A5.75 5.75 0 0 0 12 3.25z"/>',
	steps: '<path d="M4 19.5h4.5V15H13v-4.5h4.5V6H20"/>',
	sliders: '<path d="M4 7h8M16 7h4M4 17h3M11 17h9"/><circle cx="14" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
	cards: '<rect x="7.5" y="4" width="12.75" height="10.5" rx="2"/><path d="M4 8.5v9.25a2 2 0 0 0 2 2h10.25"/>',
	check: '<circle cx="12" cy="12" r="8.25"/><path d="M8.5 12.25l2.4 2.4 4.6-4.9"/>',
	question: '<circle cx="12" cy="12" r="8.25"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.45 2.3c-.6.25-1.05.8-1.05 1.45v.4M12 16.6h.01"/>',
	link: '<path d="M10 14a3.5 3.5 0 0 0 4.95 0l3-3A3.5 3.5 0 0 0 13 6.05l-1 1"/><path d="M14 10a3.5 3.5 0 0 0-4.95 0l-3 3A3.5 3.5 0 0 0 11 17.95l1-1"/>',
	target: '<circle cx="12" cy="12" r="8.25"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
	compass: '<circle cx="12" cy="12" r="8.25"/><path d="M14.9 9.1l-1.6 4.2-4.2 1.6 1.6-4.2z"/>',
	layers: '<path d="M12 3.75l8.25 4.5L12 12.75 3.75 8.25z"/><path d="M3.75 12.25L12 16.75l8.25-4.5"/><path d="M3.75 16L12 20.5l8.25-4.5"/>',
	flask: '<path d="M9.5 3.75h5M10.5 3.75v5.5L5.35 17.6a1.75 1.75 0 0 0 1.5 2.65h10.3a1.75 1.75 0 0 0 1.5-2.65L13.5 9.25v-5.5M7.6 15h8.8"/>',
	spark: '<path d="M12 3.5c.65 4.15 2.35 5.85 6.5 6.5-4.15.65-5.85 2.35-6.5 6.5-.65-4.15-2.35-5.85-6.5-6.5 4.15-.65 5.85-2.35 6.5-6.5z"/><path d="M18.5 16.5c.2 1.3.7 1.8 2 2-1.3.2-1.8.7-2 2-.2-1.3-.7-1.8-2-2 1.3-.2 1.8-.7 2-2z"/>',
	clock: '<circle cx="12" cy="12" r="8.25"/><path d="M12 7.5V12l3 1.75"/>',
	quote: '<path d="M10 7.25H6.25v4.25H10V12c0 2.25-1.25 3.75-3.75 4.25M17.75 7.25H14v4.25h3.75V12c0 2.25-1.25 3.75-3.75 4.25"/>',
	grid: '<rect x="4" y="4" width="6.75" height="6.75" rx="1.5"/><rect x="13.25" y="4" width="6.75" height="6.75" rx="1.5"/><rect x="4" y="13.25" width="6.75" height="6.75" rx="1.5"/><rect x="13.25" y="13.25" width="6.75" height="6.75" rx="1.5"/>',
	flag: '<path d="M5.5 20.5v-16M5.5 4.75c4.5-2 7.5 2 13 0v8.5c-5.5 2-8.5-2-13 0"/>',
	alert: '<path d="M10.3 4.9L3.4 17a1.95 1.95 0 0 0 1.7 2.9h13.8a1.95 1.95 0 0 0 1.7-2.9L13.7 4.9a1.95 1.95 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 16.6h.01"/>',
	pen: '<path d="M14.5 5.5l4 4M4.5 19.5l1-4.5L15.9 4.6a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L9 18.5z"/>',
	code: '<path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5l-3 14"/>',
	chart: '<path d="M4.5 19.5h15M7.5 16v-4M12 16V7.5M16.5 16v-5.5"/>',
	user: '<circle cx="12" cy="8.5" r="3.75"/><path d="M4.75 20c.9-3.5 3.7-5.5 7.25-5.5s6.35 2 7.25 5.5"/>',
	eye: '<path d="M2.75 12S6.25 5.75 12 5.75 21.25 12 21.25 12 17.75 18.25 12 18.25 2.75 12 2.75 12z"/><circle cx="12" cy="12" r="2.75"/>',
	arrow: '<path d="M4.5 12H19M13.5 6.5L19 12l-5.5 5.5"/>',
	loop: '<path d="M19.25 12a7.25 7.25 0 1 1-2.1-5.1"/><path d="M19.25 4.75v3.5h-3.5"/>',
	scale: '<path d="M12 4.5v15M7.5 19.5h9M5.5 7.5h13"/><path d="M5.5 7.5L3 13a2.5 2.5 0 0 0 5 0zM18.5 7.5L16 13a2.5 2.5 0 0 0 5 0z"/>',
	map: '<path d="M9 5.25L3.75 7.5v11.25L9 16.5l6 2.25 5.25-2.25V5.25L15 7.5z"/><path d="M9 5.25V16.5M15 7.5v11.25"/>',
	close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
};
/** An icon by name, as inline SVG. */
const icon = (name, cls = "ic") => (ICONS[name] ? `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>` : "");
/** An icon name, an emoji or a few letters, ready for a tile. */
const glyph = (v) => (ICONS[v] ? icon(v) : `<span class="glyph">${esc(v)}</span>`);
const PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>`;

/* ==========================================================================
   Tints: soft section colors (see canvas.css). Branches cycle through them.
   ========================================================================== */
const TINTS = ["blue", "green", "orange", "purple", "pink", "yellow", "red", "brown", "gray"];
const tint = (name, i = 0) => (TINTS.includes(name) ? name : TINTS[i % TINTS.length]);
const tintClass = (name) => (name ? ` t-${tint(name)}` : "");

/* ==========================================================================
   Layout. Every helper returns an HTML string, so they nest.
   ========================================================================== */
const boardHead = (n, title, desc, badge) => `<div class="board-head">${n || badge ? `<p class="eyebrow">${n ?? ""}${badge ? `<span class="badge">${badge}</span>` : ""}</p>` : ""}<h3 class="board-title">${title}</h3>${desc ? `<p class="board-desc">${desc}</p>` : ""}</div>`;
/** A board: eyebrow number, title, one sentence on what to look at, then the body. o: width, controls, badge, id, cls. */
function board(n, title, desc, body = "", o = {}) {
	const head = boardHead(n, title, desc, o.badge);
	const top = o.controls ? `<div class="board-bar">${head}<div class="controls">${o.controls}</div></div>` : head;
	const attrs = `${o.id ? ` id="${esc(o.id)}"` : ""}${o.width ? ` style="width:${px(o.width)}"` : ""}`;
	return `<article class="board${o.cls ? ` ${o.cls}` : ""}"${attrs}>${top}${body}</article>`;
}
/** A captioned figure. Captions read best as "<b>Name</b> · note". */
const fig = (inner, caption) => `<figure>${inner}${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
/** A grid of `cols` columns, each `width` px wide (or any CSS track, e.g. "minmax(0,1fr)"). */
const grid = (cols, width, items) => `<div class="cards" style="grid-template-columns:repeat(${cols},${px(width)})">${items.join("")}</div>`;
const row = (...items) => `<div class="row">${items.flat().join("")}</div>`;
const stack = (...items) => `<div class="stack">${items.flat().join("")}</div>`;
const prose = (html) => `<div class="prose">${html}</div>`;
/** A code block with a file name and a Copy button. */
const code = (text, name = "text") => `<div class="code"><div class="code-bar"><span>${esc(name)}</span><button type="button" class="copy" data-copy>Copy</button></div><pre>${esc(text)}</pre></div>`;
/** A segmented control. options: [[value, label], ...]. Listen with api.onSeg(name, fn). */
const seg = (name, options, active) => `<div class="seg" data-seg="${esc(name)}" role="group" aria-label="${esc(name)}">${options.map(([v, label]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === active}">${label}</button>`).join("")}</div>`;
/** A row of color chips. */
const swatches = (colors) => `<span class="swatches">${colors.map((c) => `<i style="--sw:${c}"></i>`).join("")}</span>`;

/* ==========================================================================
   Content blocks
   ========================================================================== */
const NOTES = { note: ["spark", "gray"], insight: ["bulb", "yellow"], tip: ["check", "green"], warn: ["alert", "red"], question: ["question", "purple"], idea: ["spark", "blue"] };
/** A callout. kind: note, insight, tip, warn, question or idea; or { kind, icon, tint }. */
function note(html, o) {
	o = opts(o, "kind");
	const [ic, tn] = NOTES[o.kind] ?? NOTES.note;
	return `<div class="note t-${tint(o.tint ?? tn)}"><span class="note-ic">${glyph(o.icon ?? ic)}</span><div class="note-body">${html}</div></div>`;
}
const TILT = [-1.4, 1.1, -0.5, 1.6, -1.1, 0.6, -0.2, 1.3, -0.8];
/** One sticky note. */
const sticky = (html, color = "yellow", i = 0) => `<div class="sticky t-${tint(color)}" data-anim="pop" style="--tilt:${TILT[i % TILT.length]}deg">${html}</div>`;
/** A cluster of sticky notes. items: "text", [text, tint] or { text, tint, by }. o: cols, tint (for all), tidy (no tilt). */
function stickies(items, o = {}) {
	const cols = o.cols ?? Math.min(4, items.length);
	return `<div class="stickies${o.tidy ? " is-tidy" : ""}" style="--cols:${cols}">${items.map((item, i) => {
		const s = typeof item === "string" ? { text: item } : Array.isArray(item) ? { text: item[0], tint: item[1] } : item;
		return sticky(`${s.text}${s.by ? `<span class="sticky-by">${s.by}</span>` : ""}`, s.tint ?? o.tint ?? "yellow", i);
	}).join("")}</div>`;
}
/** A pull quote. o: cite (who said it), href, t (when, in the source video). */
function quote(html, o) {
	o = opts(o, "cite");
	const cite = o.cite ? `<cite>${o.href ? `<a href="${esc(o.href)}" target="_blank" rel="noopener">${o.cite}</a>` : o.cite}</cite>` : "";
	const when = o.t !== undefined ? t(o.t) : "";
	return `<blockquote class="quote"><p>${html}</p>${cite || when ? `<footer>${cite}${when}</footer>` : ""}</blockquote>`;
}
/** A key number. */
const stat = (value, label, sub) => `<div class="stat"><b>${value}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ""}</div>`;
/** Key numbers side by side: [[value, label, sub?], ...]. */
const stats = (items) => `<div class="stats">${items.map((s) => (Array.isArray(s) ? stat(...s) : s)).join("")}</div>`;
/** A table. The first cell of each row reads as its heading. */
const table = (head, rows) => `<div class="table-wrap"><table class="table"><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
/** A small colored label. */
const tag = (text, color = "gray") => `<span class="tag t-${tint(color)}">${text}</span>`;
const tags = (items) => `<span class="tags">${items.map((x) => (Array.isArray(x) ? tag(...x) : tag(x))).join("")}</span>`;

/* ==========================================================================
   Diagrams. Their parts carry data-anim, so they build in as you arrive.
   ========================================================================== */
const nodeOf = (x) => (typeof x === "string" ? { title: x } : x);
/** A chain of steps joined by arrows. nodes: "Title" or { title, text, icon, tint, accent }. o: dir ("right" | "down"), labels (one per arrow). */
function flow(nodes, o = {}) {
	const labels = o.labels ?? [];
	return `<div class="flow flow--${o.dir === "down" ? "down" : "right"}">${nodes.map((x, i) => {
		const nd = nodeOf(x);
		const node = `<div class="flow-node${nd.tint ? ` t-${tint(nd.tint)} is-tinted` : ""}${nd.accent ? " is-accent" : ""}" data-anim="pop" style="--i:${i * 2}">${nd.icon ? `<span class="flow-ic">${glyph(nd.icon)}</span>` : ""}<b>${nd.title}</b>${nd.text ? `<span>${nd.text}</span>` : ""}</div>`;
		const arrow = i < nodes.length - 1 ? `<div class="flow-arrow${labels[i] ? " has-label" : ""}" data-anim="grow" style="--i:${i * 2 + 1}">${labels[i] ? `<span>${labels[i]}</span>` : ""}<i></i></div>` : "";
		return node + arrow;
	}).join("")}</div>`;
}
/** Events in order. items: { t, title, text, tint } or [t, title, text]. A t like "12:34" becomes a timestamp into the source video. */
function timeline(items) {
	return `<ol class="timeline">${items.map((item, i) => {
		const it = Array.isArray(item) ? { t: item[0], title: item[1], text: item[2] } : item;
		const when = it.t === undefined || it.t === "" ? "" : TIME.test(String(it.t)) ? t(it.t) : `<span class="tl-when">${it.t}</span>`;
		return `<li class="tl-item${tintClass(it.tint)}" data-anim="in" style="--i:${i}"><span class="tl-dot"></span><div class="tl-body">${when}<b>${it.title}</b>${it.text ? `<p>${it.text}</p>` : ""}</div></li>`;
	}).join("")}</ol>`;
}
/** A 2×2 map. o: x, y ([low, high] end labels), xLabel, yLabel, quadrants [top-left, top-right, bottom-left, bottom-right], items ({ label, x, y, tint } or [label, x, y, tint], x and y from 0 to 1), size (px). */
function matrix(o) {
	const [xl, xh] = o.x ?? ["Low", "High"], [yl, yh] = o.y ?? ["Low", "High"];
	const items = (o.items ?? []).map((item, i) => {
		const it = Array.isArray(item) ? { label: item[0], x: item[1], y: item[2], tint: item[3] } : item;
		return `<span class="mx-item t-${tint(it.tint ?? "blue")}" data-anim="pop" style="left:${(it.x * 100).toFixed(1)}%;top:${((1 - it.y) * 100).toFixed(1)}%;--i:${i}">${it.label}</span>`;
	}).join("");
	return `<div class="matrix"${o.size ? ` style="--size:${px(o.size)}"` : ""}><div class="mx-plot">${(o.quadrants ?? []).map((q, i) => `<span class="mx-q mx-q${i}">${q}</span>`).join("")}${items}</div><div class="mx-x"><span>${xl}</span><b>${o.xLabel ?? ""}</b><span>${xh}</span></div><div class="mx-y"><span>${yl}</span><b>${o.yLabel ?? ""}</b><span>${yh}</span></div></div>`;
}
/** A loop: steps round a circle with arrows between them and a dot that keeps going. items: "Title" or { title, text, tint }. o: r (radius px), center (text in the middle). */
function cycle(items, o = {}) {
	const n = items.length, R = o.r ?? 150, S = 2 * R + 170, c = S / 2, id = uid("cy");
	const at = (a) => [c + R * Math.cos(a), c + R * Math.sin(a)];
	const stepA = (Math.PI * 2) / n, gap = Math.min(0.42, stepA * 0.3);
	let arcs = "";
	for (let i = 0; i < n; i++) {
		const [x0, y0] = at(-Math.PI / 2 + i * stepA + gap), [x1, y1] = at(-Math.PI / 2 + (i + 1) * stepA - gap);
		arcs += `<path class="cy-arc" d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" marker-end="url(#${id})" data-anim="fade" style="--i:${i * 2 + 1}"/>`;
	}
	const nodes = items.map((x, i) => {
		const nd = nodeOf(x), [nx, ny] = at(-Math.PI / 2 + i * stepA);
		return `<div class="cy-node${nd.tint ? ` t-${tint(nd.tint)} is-tinted` : ""}" data-anim="pop" style="left:${nx.toFixed(1)}px;top:${ny.toFixed(1)}px;--i:${i * 2}"><b>${nd.title}</b>${nd.text ? `<span>${nd.text}</span>` : ""}</div>`;
	}).join("");
	const ring = `M${c} ${c - R}A${R} ${R} 0 1 1 ${(c - 0.01).toFixed(2)} ${c - R}`;
	return `<div class="cycle" style="width:${S}px;height:${S}px"><svg viewBox="0 0 ${S} ${S}" aria-hidden="true"><defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="cy-head" d="M1 1.5L8.5 5 1 8.5z"/></marker></defs>${arcs}</svg>${nodes}${o.center ? `<div class="cy-center">${o.center}</div>` : ""}<i class="cy-dot" style="offset-path:path('${ring}')"></i></div>`;
}

/* ==========================================================================
   Interactive pieces
   ========================================================================== */
/**
 * A step-through explainer. o.stage is SVG or HTML; inside it, mark parts with
 * data-in="2" (shown from step 2), data-out="3" (hidden from step 3),
 * data-only="2,4" (shown only then) and data-focus="2" (highlighted then).
 * o.steps: [{ title, text }]. o.id names it for api.onStep. o.width.
 */
function steps(o) {
	const list = o.steps ?? [];
	return `<div class="steps" data-steps="${esc(o.id ?? uid("steps"))}" data-step="1" data-count="${list.length}"${o.width ? ` style="width:${px(o.width)}"` : ""}><div class="steps-stage">${o.stage ?? ""}</div><div class="steps-bar" aria-hidden="true"><i></i></div><div class="steps-foot"><div class="steps-text" aria-live="polite">${list.map((s, i) => `<div${i ? "" : ' class="is-on"'}><b>${s.title ?? ""}</b>${s.text ? `<p>${s.text}</p>` : ""}</div>`).join("")}</div><div class="steps-nav"><button type="button" data-step-go="-1" aria-label="Previous step">${icon("arrow", "ic is-back")}</button><span class="steps-count">1 / ${list.length}</span><button type="button" data-step-go="1" aria-label="Next step">${icon("arrow")}</button></div></div></div>`;
}
/** A slider for a demo. o: min, max, step, value, unit, digits. */
function slider(name, label, o = {}) {
	const { min = 0, max = 100, step = 1, value = min, unit = "" } = o;
	const digits = o.digits ?? (String(step).split(".")[1] ?? "").length;
	return `<label class="ctl ctl-slider"><span class="ctl-top"><span class="ctl-label">${label}</span><output>${Number(value).toFixed(digits)}${esc(unit)}</output></span><input type="range" name="${esc(name)}" min="${min}" max="${max}" step="${step}" value="${value}" data-unit="${esc(unit)}" data-digits="${digits}"></label>`;
}
/** An on/off switch for a demo. */
const toggle = (name, label, on = false) => `<label class="ctl ctl-toggle"><input type="checkbox" name="${esc(name)}"${on ? " checked" : ""}><i aria-hidden="true"></i><span class="ctl-label">${label}</span></label>`;
/** A pick-one control for a demo. options: [[value, label], ...]. */
const choice = (name, label, options, active = options[0]?.[0]) => `<div class="ctl ctl-choice"><span class="ctl-label">${label}</span>${seg(name, options, active)}</div>`;
/**
 * A live demo: a view (SVG, canvas or HTML) beside its controls. Draw it in
 * api.onDemo(id, (values, el) => …), which runs on every change and once at
 * start. o: id, view, controls (slider, toggle, choice), below (controls under
 * the view), readout (adds a .demo-readout line to write into), width.
 */
function demo(o) {
	return `<div class="demo${o.below ? " demo--below" : ""}" data-demo="${esc(o.id ?? uid("demo"))}"${o.width ? ` style="width:${px(o.width)}"` : ""}><div class="demo-view">${o.view ?? ""}</div><div class="demo-ctls">${(o.controls ?? []).join("")}${o.readout ? `<p class="demo-readout"></p>` : ""}</div></div>`;
}
/** A card that flips over on click: a term and its meaning, a question and its answer. */
const flip = (front, back, o = {}) => `<button type="button" class="flip${tintClass(o.tint)}" aria-pressed="false"><span class="flip-in"><span class="flip-face flip-front"><span>${front}</span><small>${icon("loop")}Flip</small></span><span class="flip-face flip-back"><span>${back}</span></span></span></button>`;
/** A deck of flip cards: [[front, back, tint?], ...] or { front, back, tint }. o: cols, width (px). */
function flips(items, o = {}) {
	const cols = o.cols ?? Math.min(3, items.length);
	return `<div class="flips" style="--cols:${cols}${o.width ? `;--w:${px(o.width)}` : ""}">${items.map((it) => (Array.isArray(it) ? flip(it[0], it[1], { tint: it[2] }) : flip(it.front, it.back, it))).join("")}</div>`;
}
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
/** Questions to test yourself: [{ q, options: [...], answer: index of the right option, why }]. */
function quiz(questions) {
	return `<div class="quiz">${questions.map((q, qi) => `<div class="quiz-q" data-answer="${q.answer}"><p class="quiz-ask"><span>${qi + 1}</span>${q.q}</p><div class="quiz-opts">${q.options.map((op, i) => `<button type="button" class="quiz-opt" data-i="${i}"><i aria-hidden="true"></i><span>${op}</span></button>`).join("")}</div>${q.why ? `<p class="quiz-why">${q.why}</p>` : ""}</div>`).join("")}<div class="quiz-foot"><span class="quiz-score" aria-live="polite">${plural(questions.length, "question")}</span><button type="button" class="quiz-reset" hidden>Try again</button></div></div>`;
}
/** Hidden text that shows on click, for recall: `The answer is ${reveal("42")}.` */
const reveal = (html) => `<button type="button" class="reveal" aria-pressed="false" title="Click to reveal">${html}</button>`;

/* ==========================================================================
   Sources: a video to play, timestamps into it
   ========================================================================== */
let source = null;
function sourceOf(s) {
	if (!s) return null;
	const o = typeof s === "string" ? { url: s } : { ...s };
	const m = String(o.url ?? "").match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
	if (!o.youtube && m) o.youtube = m[1];
	if (o.youtube && !o.url) o.url = `https://www.youtube.com/watch?v=${o.youtube}`;
	return o;
}
const thumb = (id) => `url('https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg')`;
/** A video thumbnail that opens the docked player. o: id (YouTube id; default: the source's), start, poster (image for file sources). */
function video(o) {
	o = opts(o, "id");
	const bg = o.poster ? `url('${esc(o.poster)}')` : o.id ? thumb(o.id) : "";
	return `<button type="button" class="video" data-video="${esc(o.id ?? "")}" data-t="${secs(o.start ?? 0)}" aria-label="Play the video"><span class="video-img"${bg ? ` style="background-image:${bg}"` : ""}></span><span class="video-play">${PLAY}</span></button>`;
}
/** A timestamp chip that plays the source video from that moment. */
function t(time, label) {
	const s = secs(time);
	return `<a class="ts" data-t="${s}" href="#t=${s}">${PLAY}<span>${label ?? clock(s)}</span></a>`;
}

/* ==========================================================================
   Charts for demos: bars() and line() draw into an element and redraw in place
   ========================================================================== */
const fmtNum = (v) => (Math.abs(v) >= 100 ? String(Math.round(v)) : String(+v.toFixed(2)));
/** About n round tick values between a and b: steps of 1, 2, 2.5 or 5 times a power of ten. */
function niceTicks(a, b, n) {
	const raw = (b - a) / Math.max(1, n), mag = 10 ** Math.floor(Math.log10(raw || 1));
	const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw * 0.999);
	const out = [];
	for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) out.push(+v.toFixed(10));
	return out;
}
/** Bars that glide as values change. items: [{ label, value, tint, hi, key }] or [label, value, tint]. o: max, format(v), dir: "up" for columns. */
function bars(el, items, o = {}) {
	const list = items.map((it) => (Array.isArray(it) ? { label: it[0], value: it[1], tint: it[2] } : it));
	const max = o.max ?? Math.max(...list.map((d) => d.value), 1e-9);
	const format = o.format ?? fmtNum;
	el.classList.add("bars");
	el.classList.toggle("bars--up", o.dir === "up");
	const rows = new Map($$(":scope > .bar", el).map((r) => [r.dataset.key, r]));
	const keep = new Set(), fresh = [];
	for (const d of list) {
		const key = String(d.key ?? d.label), v = String(clamp(d.value / max, 0, 1));
		let r = rows.get(key);
		if (r) r.style.setProperty("--v", v);
		else {
			r = document.createElement("div");
			r.dataset.key = key;
			r.innerHTML = `<span class="bar-label"></span><span class="bar-track"><i></i></span><span class="bar-value"></span>`;
			r.style.setProperty("--v", "0");
			fresh.push([r, v]);
		}
		r.className = `bar${tintClass(d.tint)}${d.hi ? " is-hi" : ""}`;
		r.querySelector(".bar-label").innerHTML = d.label;
		r.querySelector(".bar-value").textContent = format(d.value);
		el.append(r);
		keep.add(key);
	}
	for (const [key, r] of rows) if (!keep.has(key)) r.remove();
	// New bars grow from zero once they are in the page.
	if (fresh.length) requestAnimationFrame(() => requestAnimationFrame(() => { for (const [r, v] of fresh) r.style.setProperty("--v", v); }));
	return el;
}
/**
 * A line chart drawn into an <svg> (or a container that gets one).
 * o.x and o.y: [min, max]. series: [{ fn(x) | points: [[x, y]], label, muted, color }].
 * marks: [{ x, label }] (vertical guides). dots: [[x, y]]. xLabel, yLabel,
 * xTicks, yTicks, xFormat(v), yFormat(v), w, h (viewBox size).
 */
function line(el, o) {
	const W = o.w ?? 520, H = o.h ?? 260, P = { l: 46, r: 18, t: 22, b: 36 };
	const [x0, x1] = o.x, [y0, y1] = o.y;
	const sx = (x) => P.l + ((x - x0) / (x1 - x0)) * (W - P.l - P.r);
	const sy = (y) => H - P.b - ((y - y0) / (y1 - y0)) * (H - P.t - P.b);
	const fx = o.xFormat ?? fmtNum, fy = o.yFormat ?? fmtNum;
	const clip = uid("clip");
	let svg = `<defs><clipPath id="${clip}"><rect x="${P.l}" y="${P.t - 6}" width="${W - P.l - P.r}" height="${H - P.t - P.b + 12}"/></clipPath></defs><g class="ax">`;
	for (const v of niceTicks(y0, y1, o.yTicks ?? 4)) svg += `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${P.l - 10}" y="${sy(v)}" text-anchor="end" dominant-baseline="middle">${fy(v)}</text>`;
	for (const v of niceTicks(x0, x1, o.xTicks ?? 5)) svg += `<text x="${sx(v)}" y="${H - P.b + 20}" text-anchor="middle">${fx(v)}</text>`;
	svg += `</g>`;
	if (o.xLabel) svg += `<text class="ax-label" x="${W - P.r}" y="${H - 2}" text-anchor="end">${esc(o.xLabel)}</text>`;
	if (o.yLabel) svg += `<text class="ax-label" x="${P.l - 10}" y="${P.t - 12}">${esc(o.yLabel)}</text>`;
	let plot = "", labels = "";
	for (const m of o.marks ?? []) {
		plot += `<line class="mark" x1="${sx(m.x)}" x2="${sx(m.x)}" y1="${P.t}" y2="${H - P.b}"/>`;
		if (m.label) labels += `<text class="mark-label" x="${sx(m.x) + 6}" y="${P.t + 2}" dominant-baseline="hanging">${esc(m.label)}</text>`;
	}
	(o.series ?? []).forEach((s, i) => {
		const n = s.samples ?? 160;
		const pts = (s.points ?? Array.from({ length: n + 1 }, (_, k) => { const x = x0 + ((x1 - x0) * k) / n; return [x, s.fn(x)]; })).filter(([, y]) => Number.isFinite(y));
		const c = s.color ?? i;
		plot += `<path class="series s${c}${s.muted ? " is-muted" : ""}" d="${pts.map(([x, y], k) => `${k ? "L" : "M"}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`).join("")}"/>`;
		const last = [...pts].reverse().find(([, y]) => y >= y0 && y <= y1);
		if (s.label && last) labels += `<text class="series-label s${c}" x="${sx(last[0]) - 4}" y="${sy(last[1]) - 9}" text-anchor="end">${esc(s.label)}</text>`;
	});
	for (const p of o.dots ?? []) plot += `<circle class="dot" cx="${sx(p[0])}" cy="${sy(p[1])}" r="4.5"/>`;
	svg += `<g clip-path="url(#${clip})">${plot}</g>${labels}`;
	const target = el instanceof SVGSVGElement ? el : el.querySelector("svg.line") ?? el.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
	target.classList.add("line");
	target.setAttribute("viewBox", `0 0 ${W} ${H}`);
	target.innerHTML = svg;
	return target;
}

/* ==========================================================================
   Mount
   ========================================================================== */
const TOGGLES = { motion: ["Motion", "M"] };
const THEMES = {
	light: ["Light", `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9"/></svg>`],
	system: ["Match system", `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none"/></svg>`],
	dark: ["Dark", `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z"/></svg>`],
};
const THEME_KEY = "exploration-canvas:theme";

/**
 * config:
 *   title, subtitle   HUD labels (and the document title)
 *   icon              HUD tile: an icon name, emoji or letters (default "hub"); mark: custom markup instead
 *   accent            the one accent color (default #5e6ad2)
 *   source            the material: { youtube | url | file, title, by }; timestamps and video() play it
 *   core              { eyebrow, title, desc, media, meta: [...], width } or { html }
 *   branches          [{ title, sub, icon, tint, side, body }]
 *   layout            "balanced" (default: first half left, rest right), "right" or "left" (all on one side)
 *   toggles           HUD switches, default ["motion"]; [] hides them
 *   theme             "system" (default), "light" or "dark"; the viewer's own choice wins
 *   onReady(api)      runs once the map is built: draw demos, wire up controls
 */
function mount(config) {
	source = sourceOf(config.source);
	const branches = config.branches.map((b, i) => ({ ...b, n: i + 1 }));
	const half = Math.ceil(branches.length / 2);
	const layout = config.layout ?? "balanced";
	for (const [i, b] of branches.entries()) b.side ??= layout === "right" || layout === "left" ? layout : i < half ? "left" : "right";
	const toggles = config.toggles ?? ["motion"];
	document.title = config.pageTitle ?? [config.title, config.subtitle].filter(Boolean).join(" · ");
	const root = document.documentElement;
	if (config.accent) root.style.setProperty("--accent", config.accent);

	/* ---------- Theme: set before any markup, so the first frame is already right ---------- */
	const darkQuery = matchMedia("(prefers-color-scheme: dark)");
	const themeHandlers = [];
	let themePref = config.theme ?? "system";
	try { themePref = localStorage.getItem(THEME_KEY) ?? themePref; } catch { /* storage can be blocked */ }
	if (!THEMES[themePref]) themePref = "system";
	const currentTheme = () => (themePref === "system" ? (darkQuery.matches ? "dark" : "light") : themePref);
	function applyTheme() {
		const theme = currentTheme();
		root.dataset.theme = theme;
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

	/* ---------- Motion: build-ins and loops run only when allowed ---------- */
	let motion = !reduceMotion;
	root.classList.toggle("anim", motion);

	/* ---------- HUD ---------- */
	const keys = Math.min(9, branches.length);
	document.body.insertAdjacentHTML("afterbegin", `<div id="viewport" aria-label="Exploration canvas. Drag to pan, pinch or Command-scroll to zoom, arrow keys to walk through."><div id="world"><svg id="wires" aria-hidden="true"></svg><div class="map" id="map"></div></div></div>`);
	// A shared arrowhead for hand-drawn SVG: marker-end="url(#ec-arrow)". It takes the line's own color.
	document.body.insertAdjacentHTML("beforeend", `<svg class="ec-defs" aria-hidden="true"><defs><marker id="ec-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1.5L8.5 5 1 8.5z" fill="context-stroke"/></marker></defs></svg>`);
	document.body.insertAdjacentHTML("beforeend", `
		<div class="hud hud-brand panel">${config.mark ?? `<span class="hud-mark">${glyph(config.icon ?? "hub")}</span>`}<div><b>${esc(config.title)}</b><span>${esc(config.subtitle ?? "")}</span></div></div>
		<nav class="hud hud-index panel" aria-label="Branches"><ol id="index">
			<li><button type="button" data-go="0"><span>0</span>Overview</button></li><hr>
			${branches.map((b) => `<li><button type="button" data-go="${b.n}" class="t-${tint(b.tint, b.n - 1)}"><span>${b.n}</span>${esc(b.title)}</button></li>`).join("")}
		</ol></nav>
		<div class="hud hud-view panel" role="group" aria-label="View">
			${toggles.filter((k) => TOGGLES[k]).map((k) => `<button type="button" data-toggle="${k}" aria-pressed="${k === "motion" ? motion : true}"${k === "motion" && reduceMotion ? ' title="Off: your system asks for reduced motion"' : ""}><i></i>${TOGGLES[k][0]} <kbd>${TOGGLES[k][1]}</kbd></button>`).join("")}
			${toggles.length ? `<span class="hud-sep" aria-hidden="true"></span>` : ""}
			<div class="theme-seg" role="group" aria-label="Theme">${Object.entries(THEMES).map(([key, [label, svg]]) => `<button type="button" data-theme-set="${key}" aria-pressed="false" aria-label="${label}" title="${label}${key === "system" ? "" : " (D)"}">${svg}</button>`).join("")}</div>
		</div>
		<div class="hud hud-zoom panel" role="group" aria-label="Zoom">
			<button type="button" data-zoom="out" aria-label="Zoom out">−</button>
			<output id="zoom-level">100%</output>
			<button type="button" data-zoom="in" aria-label="Zoom in">+</button>
			<button type="button" data-zoom="fit">Fit</button>
		</div>
		<div class="hud hud-hint panel">Drag to pan · Pinch or <kbd>⌘</kbd>-scroll to zoom · <kbd>←</kbd> <kbd>→</kbd> walk through${keys ? ` · <kbd>1</kbd>–<kbd>${keys}</kbd> jump` : ""} · <kbd>0</kbd> fit · <kbd>D</kbd> theme<span class="tour-pos" id="tour-pos"></span></div>`);
	applyTheme();

	/* ---------- Map: core in the middle, branches on either side ---------- */
	const branchHTML = (b) => `<section class="branch t-${tint(b.tint, b.n - 1)}" id="b-${b.n}" data-n="${b.n}" aria-labelledby="h-${b.n}">
		<button type="button" class="head" data-go="${b.n}">
			<span class="head-icon">${b.icon ? glyph(b.icon) : `<span class="head-n">${b.n}</span>`}</span>
			<span class="head-text"><span class="head-num">${String(b.n).padStart(2, "0")}</span><span class="head-title" id="h-${b.n}">${esc(b.title)}</span>${b.sub ? `<span class="head-sub">${esc(b.sub)}</span>` : ""}</span>
		</button>
		<div class="frame">${typeof b.body === "function" ? b.body() : b.body ?? ""}</div>
	</section>`;
	const core = config.core ?? {};
	const coreBody = `${core.media ? `<div class="core-media">${core.media}</div>` : ""}<div class="core-body">${core.eyebrow ? `<p class="eyebrow">${core.eyebrow}</p>` : ""}<h1 class="core-title">${core.title ?? esc(config.title)}</h1>${core.desc ? `<p class="core-desc">${core.desc}</p>` : ""}${core.meta?.length ? `<div class="core-meta">${core.meta.map((m) => `<span>${m}</span>`).join("")}</div>` : ""}</div>`;
	const coreHTML = `<div class="core" id="core"${core.width ? ` style="width:${px(core.width)}"` : ""}><div class="core-card" id="core-card">${core.html ?? coreBody}</div></div>`;
	const sides = ["left", "right"].map((side) => branches.filter((b) => b.side === side));
	const map = $("#map");
	map.innerHTML = `${sides[0].length ? `<div class="side side--left">${sides[0].map(branchHTML).join("")}</div>` : ""}${coreHTML}${sides[1].length ? `<div class="side side--right">${sides[1].map(branchHTML).join("")}</div>` : ""}`;

	/* ---------- Sources: point timestamps and thumbnails at the material ---------- */
	const timeURL = (s) => (source?.youtube ? `https://www.youtube.com/watch?v=${source.youtube}&t=${Math.floor(s)}s` : source?.file ? `${source.file}#t=${s}` : source?.url ?? `#t=${s}`);
	const playable = () => Boolean(source?.youtube || source?.file);
	for (const a of $$(".ts", map)) {
		// With no source to play or link to, a timestamp is just a label.
		if (!source) { a.removeAttribute("href"); a.classList.add("is-static"); continue; }
		a.href = timeURL(+a.dataset.t);
		if (!playable()) { a.target = "_blank"; a.rel = "noopener"; }
	}
	for (const v of $$(".video", map)) {
		const id = v.dataset.video || source?.youtube || "";
		v.dataset.video = id;
		const img = $(".video-img", v);
		if (id && !img.style.backgroundImage) img.style.backgroundImage = thumb(id);
	}

	/* ---------- Step-through explainers ---------- */
	const stepHandlers = {};
	const nums = (v) => (v ? v.split(/[\s,]+/).filter(Boolean).map(Number) : null);
	function setStep(el, k) {
		const n = +el.dataset.count;
		k = clamp(Math.round(k), 1, Math.max(1, n));
		el.dataset.step = k;
		for (const part of $$("[data-in], [data-out], [data-only], [data-focus]", $(".steps-stage", el))) {
			const only = nums(part.dataset.only);
			const shown = only ? only.includes(k) : k >= (+part.dataset.in || 1) && k < (+part.dataset.out || Infinity);
			part.classList.toggle("is-off", !shown);
			part.classList.toggle("is-focus", (nums(part.dataset.focus) ?? []).includes(k));
		}
		$$(".steps-text > div", el).forEach((d, i) => d.classList.toggle("is-on", i === k - 1));
		$(".steps-count", el).textContent = `${k} / ${n}`;
		el.style.setProperty("--progress", String(n > 1 ? (k - 1) / (n - 1) : 1));
		const [prev, next] = $$("[data-step-go]", el);
		prev.disabled = k <= 1;
		next.disabled = k >= n;
		for (const fn of stepHandlers[el.dataset.steps] ?? []) fn(k, el);
	}
	for (const el of $$(".steps", map)) setStep(el, 1);

	/* ---------- Live demos ---------- */
	const demoHandlers = {};
	function demoValues(el) {
		const v = {};
		for (const input of $$("input[name]", el)) v[input.name] = input.type === "checkbox" ? input.checked : input.type === "range" || input.type === "number" ? Number(input.value) : input.value;
		for (const g of $$(".seg[data-seg]", el)) v[g.dataset.seg] = $('button[aria-pressed="true"]', g)?.dataset.v;
		return v;
	}
	function runDemo(el) {
		for (const input of $$('input[type="range"]', el)) {
			const lo = +input.min, hi = +input.max;
			input.style.setProperty("--p", String((+input.value - lo) / (hi - lo || 1)));
			const out = input.closest(".ctl")?.querySelector("output");
			if (out) out.textContent = `${Number(input.value).toFixed(+input.dataset.digits || 0)}${input.dataset.unit ?? ""}`;
		}
		const values = demoValues(el);
		for (const fn of demoHandlers[el.dataset.demo] ?? []) fn(values, el);
	}
	document.addEventListener("input", (e) => { const el = e.target.closest?.(".demo"); if (el) runDemo(el); });

	/* ---------- Build-ins: boards with data-anim parts play once you arrive ---------- */
	const animBoards = $$(".board", map).filter((b) => b.querySelector("[data-anim]"));
	for (const b of animBoards) {
		$$("[data-anim]", b).forEach((el, i) => {
			if (!el.style.getPropertyValue("--i")) el.style.setProperty("--i", String(i));
			if (el.dataset.anim === "draw") {
				for (const g of el instanceof SVGGeometryElement ? [el] : $$("path, line, polyline, polygon, circle, ellipse, rect", el)) if (!g.hasAttribute("pathLength")) g.setAttribute("pathLength", "1");
			}
		});
		b.insertAdjacentHTML("beforeend", `<button type="button" class="replay" aria-label="Replay the animation" title="Replay">${icon("loop")}</button>`);
	}

	/* ---------- Camera ---------- */
	const vp = $("#viewport"), world = $("#world"), wires = $("#wires");
	const cam = { x: 0, y: 0, z: 1 };
	const Z_MIN = 0.06, Z_MAX = 4;
	let settleTimer = 0, flyRaf = 0, wireZ = 0, liveRaf = 0;
	// Until the user moves the camera, keep the overview framed as the window resizes.
	let userMoved = false;

	function checkLive() {
		liveRaf = 0;
		if (cam.z < FAR) return;
		for (const b of animBoards) {
			if (b.classList.contains("is-live")) continue;
			const r = b.getBoundingClientRect();
			const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0), h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
			if (w > 0 && h > 0 && (w * h > 0.4 * r.width * r.height || w * h > 0.25 * innerWidth * innerHeight)) b.classList.add("is-live");
		}
	}
	const queueLive = () => { if (animBoards.length && !liveRaf) liveRaf = requestAnimationFrame(checkLive); };
	function render() {
		world.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.z})`;
		// Wires keep a constant screen width, so redraw them as the zoom drifts.
		if (wireZ && Math.abs(Math.log(cam.z / wireZ)) > 0.14) drawWires();
		let dot = 24 * cam.z;
		while (dot < 14) dot *= 4;
		vp.style.setProperty("--dot", `${dot}px`);
		vp.style.setProperty("--dot-x", `${cam.x}px`);
		vp.style.setProperty("--dot-y", `${cam.y}px`);
		$("#zoom-level").value = `${Math.round(cam.z * 100)}%`;
		queueLive();
	}
	function moving(byUser = true) {
		if (byUser) userMoved = true;
		world.classList.add("is-moving");
		clearTimeout(settleTimer);
		settleTimer = setTimeout(settle, 160);
	}
	function settle() {
		world.classList.remove("is-moving");
		world.classList.toggle("is-far", cam.z < FAR);
		drawWires();
		markActive();
		queueLive();
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
		if (!motion) {
			Object.assign(cam, camFor(to));
			render(); moving(); settle();
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
		if (el) { detached = true; flyTo(worldRect(el), 40, zMax); }
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
		const ports = [[sides[0].length, core.x - 26], [sides[1].length, core.x + core.w + 26]].filter(([used]) => used).map(([, x]) => `<circle class="w-core" cx="${x}" cy="${core.y + core.h / 2}" r="${r * 1.5}" stroke-width="${2 * k}"/>`).join("");
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

	/* ---------- Walk-through: the arrow keys go board by board ---------- */
	// Stops run core, then each branch in order: its frame (when it has several boards), then its boards.
	const stops = [{ kind: "core", el: $("#core") }];
	for (const b of branches) {
		const section = $(`#b-${b.n}`);
		const boards = $$(".board", section).filter((x) => !x.parentElement.closest(".board"));
		if (boards.length !== 1) stops.push({ kind: "branch", n: b.n, el: section });
		for (const el of boards) stops.push({ kind: "board", n: b.n, el });
	}
	let tourIdx = -1, detached = true;
	const tourPos = $("#tour-pos");
	const showTourPos = () => { tourPos.textContent = detached || tourIdx < 0 ? "" : ` · ${tourIdx + 1} of ${stops.length}`; };
	const stopRect = (s) => (s.kind === "branch" ? union([worldRect($(".head", s.el)), worldRect($(".frame", s.el))]) : worldRect(s.el));
	function tourGo(i) {
		tourIdx = clamp(i, 0, stops.length - 1);
		detached = false;
		const s = stops[tourIdx];
		flyTo(stopRect(s), 40, s.kind === "board" ? 1.5 : 1);
		showTourPos();
	}
	/** Mostly on screen and big enough to read. */
	function framed(el) {
		const r = el.getBoundingClientRect();
		const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0), h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
		return w > 0 && h > 0 && w * h > 0.6 * r.width * r.height && r.width > 0.3 * innerWidth;
	}
	/** The smallest stop under the middle of the screen, else the closest one. */
	function nearestStop() {
		const cx = (innerWidth / 2 - cam.x) / cam.z, cy = (innerHeight / 2 - cam.y) / cam.z;
		let best = -1, bestScore = Infinity;
		stops.forEach((s, i) => {
			const r = stopRect(s);
			const inside = cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
			const score = inside ? r.w * r.h : 1e12 + Math.hypot(cx - (r.x + r.w / 2), cy - (r.y + r.h / 2));
			if (score < bestScore) { bestScore = score; best = i; }
		});
		return best;
	}
	function walk(dir) {
		let i = tourIdx;
		if (detached || i < 0) {
			const near = nearestStop();
			if (near < 0) return tourGo(dir > 0 ? 0 : stops.length - 1);
			if (!framed(stops[near].el)) return tourGo(dir > 0 ? near : near - 1);
			i = near;
		}
		// A step-through explainer plays its steps before the walk moves on.
		const box = stops[i].kind === "board" ? $(".steps", stops[i].el) : null;
		if (box) {
			const k = +box.dataset.step, n = +box.dataset.count;
			if ((dir > 0 && k < n) || (dir < 0 && k > 1)) {
				tourIdx = i;
				detached = false;
				showTourPos();
				return setStep(box, k + dir);
			}
		}
		tourGo(i + dir);
	}
	function jump(n) {
		goBranch(n);
		tourIdx = n === 0 ? -1 : stops.findIndex((s) => s.n === n);
		detached = tourIdx < 0;
		showTourPos();
	}
	const manual = () => { detached = true; showTourPos(); };

	/* ---------- Docked video player ---------- */
	function openDock(s, id = source?.youtube) {
		let dock = $("#dock");
		if (!dock) {
			document.body.insertAdjacentHTML("beforeend", `<div class="hud dock panel" id="dock" role="region" aria-label="Video"><div class="dock-bar"><span class="dock-title"></span><span class="dock-time"></span><button type="button" class="dock-close" aria-label="Close the video">${icon("close")}</button></div><div class="dock-media"></div></div>`);
			dock = $("#dock");
		}
		$(".dock-title", dock).textContent = source?.title ?? "Video";
		$(".dock-time", dock).textContent = clock(s);
		const media = $(".dock-media", dock);
		if (id) {
			media.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?start=${Math.floor(s)}&autoplay=1&rel=0" title="${esc(source?.title ?? "Video")}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
		} else if (source?.file) {
			let v = $("video", media);
			if (!v) {
				media.innerHTML = `<video src="${esc(source.file)}" controls playsinline></video>`;
				v = $("video", media);
			}
			v.currentTime = s;
			v.play()?.catch(() => {});
		}
		dock.classList.add("is-open");
		document.body.classList.add("has-dock");
	}
	function closeDock() {
		const dock = $("#dock");
		if (!dock?.classList.contains("is-open")) return;
		dock.classList.remove("is-open");
		$(".dock-media", dock).innerHTML = "";
		document.body.classList.remove("has-dock");
	}

	/* ---------- Quizzes ---------- */
	function scoreQuiz(box) {
		const qs = $$(".quiz-q", box), done = qs.filter((q) => q.classList.contains("is-answered"));
		const right = done.filter((q) => q.classList.contains("is-right")).length;
		$(".quiz-score", box).textContent = done.length ? `${right} of ${done.length} right${done.length < qs.length ? ` · ${qs.length - done.length} to go` : ""}` : plural(qs.length, "question");
		$(".quiz-reset", box).hidden = !done.length;
	}
	function answer(opt) {
		const q = opt.closest(".quiz-q");
		if (q.classList.contains("is-answered")) return;
		const right = +q.dataset.answer, i = +opt.dataset.i, buttons = $$(".quiz-opt", q);
		q.classList.add("is-answered", i === right ? "is-right" : "is-wrong");
		opt.classList.add(i === right ? "is-right" : "is-wrong");
		buttons[right]?.classList.add("is-right");
		for (const b of buttons) b.setAttribute("aria-disabled", "true");
		scoreQuiz(q.closest(".quiz"));
	}
	function resetQuiz(box) {
		for (const q of $$(".quiz-q", box)) {
			q.classList.remove("is-answered", "is-right", "is-wrong");
			for (const b of $$(".quiz-opt", q)) { b.classList.remove("is-right", "is-wrong"); b.removeAttribute("aria-disabled"); }
		}
		scoreQuiz(box);
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
		render(); moving(); manual();
	}, { passive: false });

	// Safari reports pinches as gesture events rather than ctrl+wheel.
	let gestureZ = 1;
	addEventListener("gesturestart", (e) => { e.preventDefault(); gestureZ = cam.z; cancelAnimationFrame(flyRaf); });
	addEventListener("gesturechange", (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, gestureZ * e.scale); render(); moving(); manual(); });
	addEventListener("gestureend", (e) => e.preventDefault());

	const pointers = new Map();
	let drag = null, pinch = null, suppressClick = false;
	const NO_PAN = "button, a, input, select, textarea, label, .code, .seg, .hud, [data-nopan]";

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
			render(); moving(); manual();
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
			render(); moving(); manual();
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
		if (e.target.closest(`${NO_PAN}, .steps-stage`)) return;
		const target = e.target.closest(".board, .core, .head, .frame");
		if (target) focus(target);
		else { zoomAt(e.clientX, e.clientY, cam.z * 2); render(); moving(); manual(); }
	});

	const segHandlers = {};
	document.addEventListener("click", (e) => {
		const go = e.target.closest("[data-go]");
		if (go) jump(+go.dataset.go);
		const zoom = e.target.closest("[data-zoom]");
		if (zoom) {
			const v = zoom.dataset.zoom;
			if (v === "fit") jump(0);
			else { zoomAt(innerWidth / 2, innerHeight / 2, cam.z * (v === "in" ? 1.25 : 0.8)); render(); moving(); manual(); }
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
		const toggleButton = e.target.closest("[data-toggle]");
		if (toggleButton) setToggle(toggleButton.dataset.toggle);
		const themeButton = e.target.closest("[data-theme-set]");
		if (themeButton) setTheme(themeButton.dataset.themeSet);
		const segButton = e.target.closest(".seg button");
		if (segButton) {
			const group = segButton.closest(".seg");
			for (const b of $$("button", group)) b.setAttribute("aria-pressed", String(b === segButton));
			for (const fn of segHandlers[group.dataset.seg] ?? []) fn(segButton.dataset.v, group);
			const box = group.closest(".demo");
			if (box) runDemo(box);
		}
		const stepButton = e.target.closest("[data-step-go]");
		if (stepButton) {
			const box = stepButton.closest(".steps");
			setStep(box, +box.dataset.step + +stepButton.dataset.stepGo);
		} else {
			const stage = e.target.closest(".steps-stage");
			if (stage && !e.target.closest("a, button, input, label")) {
				const box = stage.closest(".steps"), k = +box.dataset.step;
				setStep(box, k >= +box.dataset.count ? 1 : k + 1);
			}
		}
		const card = e.target.closest(".flip");
		if (card) {
			const on = card.getAttribute("aria-pressed") !== "true";
			card.setAttribute("aria-pressed", String(on));
			card.classList.toggle("is-flipped", on);
		}
		const opt = e.target.closest(".quiz-opt");
		if (opt) answer(opt);
		const reset = e.target.closest(".quiz-reset");
		if (reset) resetQuiz(reset.closest(".quiz"));
		const hidden = e.target.closest(".reveal");
		if (hidden) { hidden.classList.add("is-shown"); hidden.setAttribute("aria-pressed", "true"); }
		const stamp = e.target.closest(".ts");
		if (stamp && playable()) { e.preventDefault(); openDock(+stamp.dataset.t); }
		const vid = e.target.closest(".video");
		if (vid && (vid.dataset.video || source?.file)) openDock(+vid.dataset.t, vid.dataset.video || undefined);
		if (e.target.closest(".dock-close")) closeDock();
		const replay = e.target.closest(".replay");
		if (replay) {
			const b = replay.closest(".board");
			b.classList.remove("is-live");
			void b.offsetWidth;
			b.classList.add("is-live");
		}
	});

	function setToggle(name) {
		const btn = $(`[data-toggle="${name}"]`);
		if (name === "motion") {
			motion = !motion;
			root.classList.toggle("anim", motion);
			btn?.setAttribute("aria-pressed", String(motion));
			return;
		}
		if (!btn) return;
		const on = btn.getAttribute("aria-pressed") !== "true";
		btn.setAttribute("aria-pressed", String(on));
		document.body.classList.toggle(`no-${name}`, !on);
	}

	addEventListener("keydown", (e) => {
		if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
		const zoomBy = (f) => { zoomAt(innerWidth / 2, innerHeight / 2, cam.z * f); render(); moving(); manual(); };
		const pan = (dx, dy) => { cam.x += dx; cam.y += dy; render(); moving(); manual(); };
		if (e.metaKey || e.ctrlKey) {
			if (e.key === "0") { e.preventDefault(); jump(0); }
			else if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomBy(1.25); }
			else if (e.key === "-") { e.preventDefault(); zoomBy(0.8); }
			return;
		}
		if (e.altKey) return;
		// Space and Enter on a focused button keep their usual meaning.
		if ((e.key === " " || e.key === "Enter") && e.target.closest?.("button, a")) return;
		const step = e.shiftKey ? 360 : 90;
		if (/^[0-9]$/.test(e.key) && +e.key <= branches.length) { jump(+e.key); e.preventDefault(); return; }
		switch (e.key) {
			case "ArrowRight": case "PageDown": if (e.shiftKey) pan(-step, 0); else walk(1); break;
			case "ArrowLeft": case "PageUp": if (e.shiftKey) pan(step, 0); else walk(-1); break;
			case " ": walk(e.shiftKey ? -1 : 1); break;
			case "ArrowUp": pan(0, step); break;
			case "ArrowDown": pan(0, -step); break;
			case "=": case "+": zoomBy(1.25); break;
			case "-": case "_": zoomBy(0.8); break;
			case "m": case "M": setToggle("motion"); break;
			case "d": case "D": setTheme(currentTheme() === "dark" ? "light" : "dark"); break;
			case "Escape": closeDock(); break;
			default: return;
		}
		e.preventDefault();
	});

	/* ---------- Start ---------- */
	const api = {
		$, $$, focus, goBranch: jump, setStep, bars, line,
		onSeg: (name, fn) => (segHandlers[name] ??= []).push(fn),
		/** fn(values, el) on every change to demo `id`, and once at start. */
		onDemo: (id, fn) => (demoHandlers[id] ??= []).push(fn),
		/** fn(step, el) whenever explainer `id` changes step, and once at start. */
		onStep: (id, fn) => (stepHandlers[id] ??= []).push(fn),
		/** The theme in effect, "light" or "dark". */
		theme: currentTheme,
		/** fn(theme) whenever the theme changes. */
		onTheme: (fn) => themeHandlers.push(fn),
		setTheme,
		/** Play the source video from `seconds` in the docked player. */
		play: (seconds) => openDock(secs(seconds)),
		/** Redraw wires and re-measure after the page changes layout. */
		refresh: settle,
	};
	window.canvasMap = {
		goBranch: jump, focus, walk,
		step: (target, k) => { const el = typeof target === "string" ? $(target) : target; const box = el?.closest(".steps") ?? el?.querySelector(".steps"); if (box) setStep(box, k); },
	};
	config.onReady?.(api);
	// First draw, now that the page has registered its handlers.
	for (const el of $$(".demo", map)) runDemo(el);
	for (const el of $$(".steps", map)) setStep(el, +el.dataset.step);
	themeHandlers.push(() => { for (const el of $$(".demo", map)) runDemo(el); });

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
	mount,
	board, row, stack, grid, fig, prose, code, seg, swatches, esc,
	note, sticky, stickies, quote, stat, stats, table, tag, tags, icon,
	flow, timeline, matrix, cycle,
	steps, demo, slider, toggle, choice, flip, flips, quiz, reveal,
	video, t, secs, clock,
	bars, line,
	ICONS, TINTS,
};
})();
