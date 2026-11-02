# Components and API

Everything a canvas page can use, from `window.ExplorationCanvas`. Helpers return HTML strings, so they nest: `row(board(…, stack(note(…), quote(…))))`. Text you pass is HTML; escape anything you didn't write with `esc()`.

## Contents

- [mount(config)](#mountconfig)
- [Layout](#layout)
- [Content blocks](#content-blocks)
- [Diagrams](#diagrams)
- [Step-through explainers](#step-through-explainers)
- [Live demos and charts](#live-demos-and-charts)
- [Flip cards, quizzes, reveal](#flip-cards-quizzes-reveal)
- [Video sources and timestamps](#video-sources-and-timestamps)
- [Hand-drawn SVG](#hand-drawn-svg)
- [Build-in animation](#build-in-animation)
- [onReady api](#onready-api)
- [Icons and tints](#icons-and-tints)
- [Theme tokens for page CSS](#theme-tokens-for-page-css)

## mount(config)

```js
ExplorationCanvas.mount({
  title: "Attention, step by step",      // HUD title; also the document title
  subtitle: "3Blue1Brown, chapter 6",     // HUD second line
  icon: "spark",                          // HUD tile: an icon name, an emoji or a few letters (default "hub")
  accent: "#3b82c4",                      // the one accent color (default #5e6ad2, indigo)
  source: { youtube: "eMlx5fFNoYc", title: "Attention in transformers", by: "3Blue1Brown" },
  core: {
    eyebrow: "Video · 26 min",
    title: "How attention moves meaning", // HTML allowed
    desc: "One or two sentences.",
    media: video(),                       // optional: a video thumbnail, an <img>, an SVG diagram
    meta: ["<b>3Blue1Brown</b>", "Apr 2024", "26 min"], // optional chips under the text
    width: 640,                           // optional, px
    // or html: "<div>…</div>" to replace the whole card body
  },
  branches: [
    {
      title: "How it works",              // head title, also the HUD index label
      sub: "One head, step by step",      // head subtitle
      icon: "steps",                      // icon name or emoji in the head's tile; default: the branch number
      tint: "green",                      // the branch's color; default: cycles blue, green, orange, purple, pink…
      side: "left",                       // optional; overrides layout for this branch
      body: () => row(board(…), board(…)),// HTML string or a function returning one
    },
  ],
  layout: "balanced",                     // "balanced" (first half left, rest right), "right" or "left" (all one side)
  toggles: ["motion"],                    // HUD switches; [] hides them
  theme: "system",                        // "system" (default), "light" or "dark"; the viewer's own choice wins
  onReady(api) {},                        // runs after the map is built: draw demos, wire controls
});
```

Branch `n` is its 1-based position. Keys: `1`–`9` jump to a branch, `0` frames the overview, `←` `→` (or Space) walk board by board and play each explainer's steps on the way, Shift+arrows and `↑` `↓` pan, `D` flips light and dark, `M` turns motion off and on, `Esc` closes the video player. A branch's tint colors its head, its boards' eyebrow dashes, quote rules and timeline dots, and is available to page CSS as `var(--tint-bg)` and `var(--tint-ink)` inside it.

## Layout

| Helper | Output |
| --- | --- |
| `board(n, title, desc, body, opts?)` | A board. `n` is the eyebrow (`"2.1"`), `desc` one sentence on what to look at. `opts`: `width` (px), `badge` (a pill in the eyebrow, e.g. `"Beyond the video"`), `controls` (HTML right of the title, e.g. `seg(…)`), `id`, `cls`. |
| `row(...items)` | Horizontal row, 32px gap, top-aligned. |
| `stack(...items)` | Vertical stack, 32px gap; children stretch to the widest. |
| `grid(cols, width, items)` | Grid of `cols` columns, each `width` px or any CSS track (`"minmax(0,1fr)"`). |
| `fig(inner, caption)` | Figure with a caption; write captions as `<b>Name</b> · note`. An `<img>` inside gets a rounded border. |
| `prose(html)` | Body text: paragraphs, lists, `<strong>`, `<code>`, links. |
| `code(text, name)` | Monospace block with a file name and a Copy button; text is escaped for you. |
| `seg(name, [[value, label], …], active)` | Segmented control; handle with `api.onSeg(name, fn)`. |
| `swatches(colors)` | A row of color chips. |
| `esc(text)` | HTML-escape a string. |

A frame lays out whatever its branch body returns, so most bodies are `row(…)` or `stack(row(…), board(…))`. Give text boards a `width` (420–540 reads well); boards holding diagrams or demos size themselves or take a wider `width`.

## Content blocks

| Helper | Use |
| --- | --- |
| `note(html, kind)` | A callout. `kind`: `note`, `insight` (yellow, bulb), `tip` (green), `warn` (red), `question` (purple), `idea` (blue); or `{ kind, icon, tint }`. |
| `quote(html, { cite, t, href })` | A pull quote. `t: "12:34"` adds a timestamp chip that plays the source video there; `href` links the citation. |
| `stickies(items, { cols, tint, tidy })` | Sticky notes; items are `"text"`, `[text, tint]` or `{ text, tint, by }`. They sit slightly tilted; `tidy: true` straightens them. They pop in when you arrive. |
| `sticky(html, tint, i)` | One sticky, for custom layouts. |
| `stats([[value, label, sub?], …])` | Key numbers side by side; `stat(value, label, sub)` for one. |
| `table(head, rows)` | A table; the first cell of each row reads as its heading. |
| `tags(items)`, `tag(text, tint)` | Small colored labels; items are `"text"` or `[text, tint]`. |

## Diagrams

All of these build in (pop, grow, fade) when their board comes into view.

```js
flow(["Embeddings", { title: "Attention", text: "Words exchange context", accent: true, icon: "link" }, "MLP", "Next word"],
     { labels: ["", "updates", "predicts"], dir: "right" })   // dir: "down" stacks it vertically
timeline([{ t: "3:20", title: "Queries and keys", text: "…", tint: "blue" }, ["10:30", "Masking", "…"]])
matrix({ x: ["Cheap", "Costly"], y: ["Small", "Big"], xLabel: "Effort", yLabel: "Payoff",
         quadrants: ["Quick wins", "Big bets", "Fill-ins", "Skip"],        // top-left, top-right, bottom-left, bottom-right
         items: [["Idea one", 0.2, 0.8, "green"], { label: "Idea two", x: 0.7, y: 0.9 }], size: 400 })
cycle(["Predict", "Compare", "Adjust weights"], { r: 140, center: "Each pass makes the next guess better" })
```

- `flow` nodes are `"Title"` or `{ title, text, icon, tint, accent }`; `labels` puts a word on each arrow.
- `timeline` items are `{ t, title, text, tint }` or `[t, title, text]`. A `t` like `"12:34"` or `"1:02:03"` becomes a timestamp chip into the source video; any other `t` (a year, "Step 1") shows as plain text.
- `matrix` places items by `x` and `y` from 0 to 1.
- `cycle` arranges steps clockwise from the top, with arrows between them and a dot that keeps going round while motion is on.

## Step-through explainers

`steps({ id, stage, steps, width })` shows a stage with a caption under it and ← / → buttons. The stage is SVG or HTML; mark its parts with:

| Attribute | Meaning |
| --- | --- |
| `data-in="2"` | Shown from step 2 on (a build). |
| `data-out="4"` | Hidden from step 4 on. |
| `data-only="2,3"` | Shown only on those steps. |
| `data-focus="2"` | Highlighted on step 2: an accent stroke in SVG, an accent ring on HTML. |

Parts fade between steps. The root also carries `data-step="k"`, so page CSS can style any step: `.steps[data-step="3"] .row-2 { translate: 0 -20px; }`. `steps` is `[{ title, text }]`, one per step. The viewer can click the stage, use the buttons, or press → while the board is framed; the walk-through plays every step before moving on. Use `api.onStep(id, (k, el) => …)` to redraw something custom on each step.

```js
steps({ id: "head", width: 640, stage: `<svg viewBox="0 0 600 220">
    <rect class="sv-box" x="10" y="80" width="120" height="56" rx="12" data-focus="1"/>
    <text class="sv-label" x="70" y="108" text-anchor="middle" dominant-baseline="central">Embedding</text>
    <path class="sv-line" d="M136 108h56" marker-end="url(#ec-arrow)" data-in="2"/>
    <rect class="sv-accent" x="200" y="80" width="120" height="56" rx="12" data-in="2" data-focus="2"/>
    …</svg>`,
  steps: [{ title: "Each word starts as a vector", text: "…" }, { title: "It asks a question", text: "…" }] })
```

## Live demos and charts

`demo({ id, view, controls, below, readout, width })` puts a view beside its controls (`below: true` puts them underneath). Draw the view in `onReady`:

```js
demo({ id: "softmax", view: `<div class="bars-here"></div>`, controls: [
  slider("temp", "Temperature", { min: 0.1, max: 3, step: 0.1, value: 1 }),
  toggle("mask", "Hide later words", false),
  choice("word", "Query word", [["creature", "creature"], ["forest", "forest"]], "creature"),
] })

onReady({ onDemo, bars, line }) {
  onDemo("softmax", ({ temp, mask, word }, el) => {
    bars(el.querySelector(".bars-here"), weights(word, temp, mask), { dir: "up" });
  });
}
```

- `slider(name, label, { min, max, step, value, unit, digits })`, `toggle(name, label, on)` and `choice(name, label, options, active)` are the controls. The handler gets all values by name (numbers for sliders, booleans for toggles, strings for choices) on every change, once at start, and again when the theme changes.
- `readout: true` adds an empty `.demo-readout` paragraph under the controls for a line of results (`el.querySelector(".demo-readout").innerHTML = …`).
- `bars(el, items, { max, format, dir })` draws or updates bars in `el`. Items are `{ label, value, tint, hi, key }` or `[label, value, tint]`. Bars glide when values change, and keep their row when the order changes. `hi: true` fills a bar with the accent; `dir: "up"` makes columns.
- `line(el, { x: [min, max], y: [min, max], series, marks, dots, xLabel, yLabel, xTicks, yTicks, xFormat, yFormat, w, h })` draws a line chart into an `<svg>` or a container. A series is `{ fn: (x) => y, label, muted, color }` or `{ points: [[x, y], …] }`; `marks: [{ x, label }]` adds vertical guides, `dots: [[x, y]]` adds points. Ticks fall on round numbers.
- Anything else is yours to draw: write SVG into the view, or use a `<canvas>` sized by `devicePixelRatio`. Mark an element `data-nopan` if dragging on it shouldn't pan the canvas.

## Flip cards, quizzes, reveal

```js
flips([["Query", "What a word is looking for, as a vector."], { front: "Key", back: "…", tint: "blue" }], { cols: 3, width: 220 })
quiz([{ q: "Why scale the dot products by √d?", options: ["Speed", "Keep softmax from saturating", "Save memory"], answer: 1, why: "…" }])
prose(`<p>The scores go through ${reveal("softmax")} to become weights.</p>`)
```

- A flip card shows its front with a small "Flip" hint; a click turns it over. `flip(front, back, { tint })` makes one.
- `answer` is the index of the right option. Choosing marks right and wrong, shows `why`, and keeps a running score with a Try again button.
- `reveal(html)` blurs a phrase until it's clicked, for recall inside prose.

## Video sources and timestamps

Give `mount` a `source` and timestamps become playable:

| `source` | Timestamps and `video()` |
| --- | --- |
| `{ youtube: "ID", title, by }` or `{ url: "https://youtu.be/ID" }` | Play in a docked player at that second; links open YouTube at that time |
| `{ file: "talk.mp4", title }` | Play the file in the docked player |
| `{ url: "https://…" }` (any other page) | Chips link to the page; nothing plays |

- `t("12:34", label?)` is a timestamp chip; use it anywhere in HTML.
- `video({ id, start, poster })` is a thumbnail with a play button; with no `id` it uses the source's video. Put one in `core.media` so the canvas opens on the source.
- The docked player sits bottom-left over the canvas, so the viewer can keep reading while it plays. `api.play("12:34")` opens it from code.

## Hand-drawn SVG

For stages, custom diagrams and annotations, the engine styles these classes in both themes:

| Class | Look |
| --- | --- |
| `sv-box` | Board-white fill, strong hairline |
| `sv-tint` | The branch tint, with a matching edge |
| `sv-fill` | The branch tint, no edge |
| `sv-accent` | Accent-soft fill, accent edge |
| `sv-line` | A 2px connector (`fill: none`) |
| `sv-ink` | A 2px ink line |
| `sv-dash` | Add to a line to dash it |
| `sv-dot` | An accent dot |
| `sv-label` / `sv-text` / `sv-small` / `sv-mono` | 15px semibold, 13.5px, 12px muted, 12px mono |

`marker-end="url(#ec-arrow)"` adds an arrowhead in the line's own color (it turns accent with `data-focus`). Center text in a box with `text-anchor="middle" dominant-baseline="central"`. Don't give SVG text em-based `letter-spacing`: inside the zoomed canvas Chrome resolves it far too large.

## Build-in animation

Any element inside a board can carry `data-anim`; it plays the first time its board comes into view at a readable zoom:

| Value | Animation |
| --- | --- |
| `in` | Fades up 10px |
| `pop` | Scales up from 86% |
| `fade` | Fades in |
| `grow` | Grows from the left (or the top, in a `flow` going down), e.g. bars and arrows |
| `draw` | Draws an SVG stroke from start to end (on paths, lines, circles…, or a group of them) |

Parts play in document order, 90ms apart; set `style="--i:3"` to place one in the sequence, or `--stagger` on the board for a different gap. A board with build-ins gets a replay button in its corner. Zoomed far out, everything shows in its final state, and with motion off (the `M` switch, or the system's reduced-motion setting) nothing animates at all.

## onReady api

| Member | Use |
| --- | --- |
| `$`, `$$` | `querySelector` and `querySelectorAll` (as an array) |
| `onDemo(id, fn)` | `fn(values, el)` on every change to demo `id`, once at start, and on theme changes |
| `onStep(id, fn)` | `fn(step, el)` whenever explainer `id` changes step, and once at start |
| `setStep(el, k)` | Show step `k` of an explainer element |
| `onSeg(name, fn)` | `fn(value, group)` when a `seg(name, …)` button is pressed |
| `bars`, `line` | The chart helpers |
| `focus(selectorOrElement, i?, zMax?)` | Fly the camera to an element |
| `goBranch(n)` | Fly to branch `n`; `0` is the overview |
| `play(time)` | Open the docked player at a time |
| `theme()`, `onTheme(fn)`, `setTheme(pref)` | Read, watch and set the theme (`"light"`, `"dark"`, `"system"`) |
| `refresh()` | Redraw wires and re-measure after you change layout |

`window.canvasMap` exposes `goBranch`, `focus`, `walk(1 | -1)` and `step(selector, k)` for the browser console and verification.

## Icons and tints

Icons (`icon: "…"` on branches and `mount`, `{ icon }` on notes and flow nodes, or `icon(name)` anywhere): `book`, `play`, `list`, `bulb`, `steps`, `sliders`, `cards`, `check`, `question`, `link`, `target`, `compass`, `layers`, `flask`, `spark`, `clock`, `quote`, `grid`, `flag`, `alert`, `pen`, `code`, `chart`, `user`, `eye`, `arrow`, `loop`, `scale`, `map`, `hub`. Any other string shows as text, so an emoji works too.

Tints: `blue`, `green`, `orange`, `purple`, `pink`, `yellow`, `red`, `brown`, `gray`. Each is a soft background (`--t-<name>-bg`) and a matching ink (`--t-<name>-ink`); the class `t-<name>` sets `--tint-bg` and `--tint-ink` for everything inside it.

## Theme tokens for page CSS

Use these in a page's `<style>` so boards work in both themes: `--ink`, `--muted`, `--subtle`, `--prose-ink`, `--surface` (boards), `--well` (insets), `--line`, `--line-strong`, `--ring`, `--canvas`, `--accent`, `--accent-text` (accent that reads as text), `--accent-soft` (accent background), `--accent-line`, `--tint-bg`, `--tint-ink`, `--right`, `--wrong`, `--font`, `--mono`, `--ease`. For any other tint, mix from ink: `color-mix(in srgb, var(--ink) 18%, transparent)` for an axis, 7% for a track.
