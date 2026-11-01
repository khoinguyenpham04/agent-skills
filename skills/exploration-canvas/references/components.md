# Components and API

Everything a canvas page can use, from `window.ExplorationCanvas`. Helpers return HTML strings, so they nest: `row(board(..., grid(..., [fig(C({...}), "caption")])))`.

## Contents

- [mount(config)](#mountconfig)
- [Layout helpers](#layout-helpers)
- [Grain cards: C(opts) and makeCard(opts)](#grain-cards)
- [Palettes](#palettes)
- [Patterns](#patterns)
- [Title styles and overlays](#title-styles-and-overlays)
- [onReady api](#onready-api)
- [emdashcms.com mock kit](#emdashcmscom-mock-kit)
- [Other exports](#other-exports)

## mount(config)

```js
ExplorationCanvas.mount({
  title: "Grain × Halftone",            // HUD title; also the document title
  subtitle: "EmDash cover explorations", // HUD second line
  mark: "<svg…>",                        // optional HUD logo; default is the EmDash mark
  core: {
    eyebrow: "Exploration map · Oct 22, 2026",
    title: "Grain × Halftone",           // HTML allowed
    desc: "One or two sentences.",
    card: { palette: "sunset", seed: "core", pattern: { kind: "contours" } }, // a C() options object
    // or html: "<div>…</div>" for a custom hero instead of a card
  },
  branches: [
    {
      title: "The recipe",               // head title, also the HUD index label
      sub: "Translated from the post",   // head subtitle
      orb: "el1",                        // palette key for the head's round swatch
      side: "left",                      // optional; default: first half left, rest right
      body: () => row(board(...), board(...)), // HTML string or a function returning one
    },
  ],
  toggles: ["grain", "pattern", "motion"], // HUD layer switches; [] hides them
  theme: "system",                         // "system" (default), "light" or "dark"; the viewer's own choice wins
  onReady(api) {},                         // runs after the map is built, before the first frame
});
```

Branch `n` is its 1-based position in the array; keys `1`–`9` jump to it and `0` frames the overview. `D` flips between light and dark; the toolbar's Light / System / Dark switch does the same, and the choice is remembered in `localStorage` (`exploration-canvas:theme`). The engine builds the viewport, wires, HUD, camera and input itself; the page body only needs the script tags.

## Layout helpers

| Helper | Output |
| --- | --- |
| `board(n, title, desc, body, opts?)` | White board. `n` is the eyebrow (`"2.1"`), `desc` one sentence. `opts`: `width` (px), `controls` (HTML shown right of the title, e.g. `seg(...)`), `id`, `cls`. |
| `row(...items)` | Horizontal flex row, 32px gap, top-aligned. |
| `stack(...items)` | Vertical stack, 32px gap. Children stretch to the widest. |
| `grid(cols, width, items)` | Card grid. `width` in px, or any CSS track such as `"minmax(0,1fr)"` to fill a stretched board. |
| `fig(inner, caption)` | Figure with a caption. Write captions as `<b>Name</b> · note`. |
| `prose(html)` | Body text: paragraphs, lists, `<strong>`, `<code>`. |
| `code(text, name)` | Monospace block with a file name and a Copy button. Text is escaped for you. |
| `seg(name, [[value, label], …], active)` | Segmented control. Handle clicks with `api.onSeg(name, fn)`. |
| `swatches(colors)` | A row of color chips, for palette captions. |
| `esc(text)` | HTML-escape a string you interpolate. |

A frame lays out whatever its branch body returns, so most bodies are `row(...)` or `stack(row(...), board(...))`. Give text-heavy boards a `width` (460–540 reads well); boards made of grids size themselves.

## Grain cards

`C(opts)` returns a placeholder that `mount` swaps for a live card. Use `makeCard(opts)` in `onReady` or event handlers to get the element directly.

| Option | Meaning |
| --- | --- |
| `palette` | Key of `PALETTES` or a palette object. Required. |
| `seed` | Any string. Same seed, same blob layout and mirroring. Default: the palette name. |
| `ar` | Aspect ratio, width / height. Default 1. Use 1.6 for blog grid covers, 2 for post heroes, 1200/630 for share cards. |
| `w`, `r` | Fixed width and corner radius in px. Default: fill the parent, 20px radius. |
| `grain` | Overlay opacity; 0 removes the grain. Default 0.4. |
| `pattern` | `{ kind, seed?, motif?, grid?, mask? }`, see [Patterns](#patterns). |
| `accent` | Halftone accent: `"white"` (glow, default), `"heat"` (brand orange), `"none"`. |
| `title`, `titleStyle` | Text on the card, `"\n"` for line breaks; see [Title styles](#title-styles-and-overlays). |
| `caption`, `tag`, `date` | Extra text for the numeral, corner and mono styles. |
| `html` | Custom overlay markup instead of a title, e.g. a share card layout. |
| `layers` | `{ base, blobs, pattern, grain, title }`; `false` hides a layer (anatomy diagrams). |
| `static` | `true` stops the drift (use for tiny swatches). |
| `mirror` | Force or prevent the horizontal flip the seed would pick. |
| `cls` | Extra classes. `no-ring` drops the hairline inner stroke, e.g. inside a site mock that has its own. |

Cards are `container-type: inline-size`, so anything sized in `cqi` inside them scales with the card.

## Palettes

`PALETTES` keys:

- **EmDash set**, sliced from the logo gradient `RAMP` (cream → amber → orange → coral → rose → plum → indigo): `sunset` (the whole ramp; heroes), `kiln` (light changelog), `heat` (changelog), `dusk` (announcements), `afterglow` (AI, Build), `midnight` (dark).
- **Borrowed cool sets** for work that isn't a release: `tide` (engineering), `moss` (plugins).
- **Reference set** from the ElevenLabs-style prompt: `el1` violet-pink → orange-gold, `el2` grey-blue → deep brown, `el3` mist blue → deep-sea blue, `el4` mist blue → ink green, `el5` lavender → midnight purple, `el6` sky grey → rust red.

Each palette has `name`, `tag`, `base` (four top-to-bottom stops for the linear gradient) and `blobs` (`[color, x%, y%, diameter % of width]`, four of them). Add your own with `addPalette(key, { name, tag, base, blobs })`, keeping to neighbouring hues, light and cool on top, dark and warm below. A palette object with `baseCSS` and `blobs: []` gives a flat gradient strip (the color ramp in the grain example).

## Patterns

`pattern.kind`:

| Kind | Look |
| --- | --- |
| `rays` | Wavy lines fanning up from below the card |
| `contours` | Concentric topographic rings around a point low on the card |
| `sound` | Stacked sound-wave lines, livelier toward the top |
| `dots` | Even dot grid |
| `lens` | Lattice of vesica outlines |
| `halftone` | One of EmDash's ten blog motifs as white dots (needs `halftone.js`) |

Halftone options: `seed` picks the motif exactly as emdashcms.com does (`motifOf(seed)` tells you which; a post's slug gives its live motif), or `motif: "ripple"` finds a seed for that motif. `grid: [cols, rows]` sets the dot grid; `gridFor(ar)` gives EmDash's grids for 16:10 and 2:1 and a 24-row grid otherwise. The ten motifs are `MOTIFS`: waves, ripple, dash, sphere, lines, waveform, braid, stack, horizon, calendar.

`mask`: `true` clears the middle for a title (a radial mask for linework; a faded horizontal band for halftone, whose motifs are centred), `false` keeps the full pattern, `"left"` fades the left side for share cards with text on the left. The default is `true` whenever the card has a title.

## Title styles and overlays

| `titleStyle` | Fields | Use |
| --- | --- | --- |
| `"center"` (default with `title`) | `title` | The reference layout: Inter 400 at 8% of the width, centred, white |
| `"numeral"` | `title` (e.g. `"1.4"`), `caption` | Release covers: weight 500 at 30% of the width |
| `"corner"` | `title`, `tag`, `date` | Editorial: tag pill top-left, date top-right, title bottom-left |
| `"mark"` | – | The em dash alone, glowing |
| `"mono"` | `title`, `caption` | Package stamp in monospace |

For anything else pass `html`. Share cards use the built-in `.og` overlay classes:

```js
C({ palette: "heat", seed: "emdash-1-3", ar: 1200 / 630, r: 18,
    pattern: { kind: "halftone", seed: "emdash-1-3", grid: [60, 32], mask: "left" },
    html: `<div class="og">
      <div class="og-top">${MARK_WHITE}<span>EmDash</span><span class="og-tag">Changelog</span></div>
      <div><div class="og-num">1.3</div><div class="og-title">Readable revision history</div><div class="og-meta">Oct 15, 2026 · 14 min read</div></div>
    </div>` })
```

Drop `og-num` for article cards; `og-title` then sets large.

## onReady api

`onReady(api)` receives:

| Member | Use |
| --- | --- |
| `$`, `$$` | `querySelector` and `querySelectorAll` (the latter as an array) |
| `makeCard(opts)` | Build a card element, e.g. to re-render covers when a control changes |
| `hydrate(root)` | Fill `C()` placeholders inside markup you inserted after mount |
| `onSeg(name, fn)` | `fn(value, groupElement)` when a `seg(name, …)` button is pressed |
| `focus(selectorOrElement, index?, zMax?)` | Fly the camera to an element |
| `goBranch(n)` | Fly to branch `n`; `0` is the overview |
| `refresh()` | Redraw wires and re-measure after you change layout |
| `theme()` | The theme in effect, `"light"` or `"dark"` |
| `onTheme(fn)` | `fn(theme)` whenever the theme changes, e.g. to redraw a `<canvas>` demo in new colors |
| `setTheme(pref)` | `"light"`, `"dark"` or `"system"` |

`window.canvasMap` exposes `goBranch` and `focus` for the browser console and for verification screenshots.

Draw `<canvas>` demos here (size them by `devicePixelRatio` or `image-rendering: pixelated` on purpose), and replace card elements with `el.replaceChildren(makeCard(...))`.

## emdashcms.com mock kit

Wrap mocks in `.site`; the classes mirror the real components, so mocks match the site. A `.site` follows the canvas theme. To compare, give its board a `seg("theme", [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]], "auto")` and pin it with `siteTheme(el, value)` in `onSeg`. A blog post card:

```html
<div class="site" style="width:460px;padding:28px">
  <article class="pc">                         <!-- add pc--feature for the wide feature card -->
    <div class="pc-media">${C({ palette: "heat", seed: "slug", ar: 1.6, r: 0, cls: "no-ring", pattern: { kind: "halftone", seed: "slug" } })}</div>
    <div class="pc-body">
      <p class="pc-meta"><time>Oct 15, 2026</time><span aria-hidden="true">·</span><span>14 min read</span></p>
      <h4 class="pc-title">Post title</h4>
      <p class="pc-excerpt">Excerpt.</p>
      <div class="pc-foot"><span class="byline"><span class="avatar">MK</span><b>Matt Kane</b></span><span class="pc-cta">Read ${ARROW}</span></div>
    </div>
  </article>
</div>
```

`.pc-media` also takes an `<img>` (it fills the box, `object-fit: cover`) or a `paperCover(seed, grid)` element for today's halftone-on-paper cover. Blog index pieces: `.site-index` (1240px wide page), `.site-header`, `.site-eyebrow`, `.site-title` (wrap the lead in a `<span>`), `.site-intro`, `.site-section`, `.site-grid` (three columns). Post page pieces: `.site-post`, `.pp-head`, `.pp-back`, `.pp-meta`, `.pp-title`, `.pp-dek`, `.pp-byline`, `.pp-tags`, `.pp-cover` (put a 2:1 card inside), `.pp-prose`. The grain example's branch 7 uses all of them.

## Theme tokens for page CSS

Use these in a page's `<style>` so boards work in both themes: `--ink`, `--muted`, `--subtle`, `--prose-ink`, `--surface` (boards), `--well` (insets such as code), `--line`, `--line-strong`, `--ring`, `--canvas`, `--heat`, `--heat-text`, `--card-edge` (the hairline on cards and chips). For any other tint, mix from ink: `color-mix(in srgb, var(--ink) 18%, transparent)` for a chart axis, 7% for a track. Grain cards are artwork and look the same in both themes.

## Other exports

`siteTheme(el, "auto" | "light" | "dark")`, `PALETTES`, `RAMP`, `addPalette`, `swatchesOf(palette)`, `baseCSS(palette)`, `MOTIFS`, `motifOf(seed)`, `seedFor(motif, salt)`, `gridFor(ar)`, `paperCover(seed, grid)`, `rng(seed)` and `hash(string)` (the same generator and hash as `post-art.ts`), `poly(points)` (SVG path from points), `mark(idPrefix)` (the EmDash mark in color), `MARK_WHITE`, `ARROW`.
