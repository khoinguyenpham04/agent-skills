---
name: exploration-canvas
description: Build pan-and-zoom mind-map exploration canvases in the emdashcms.com art direction — a core idea in the middle, branches wired out left and right to frames of white boards, live grainy-gradient cards with white linework or EmDash halftone motifs, and in-context emdashcms.com mocks — as one static folder that drop-deploy can share. Use whenever the user wants to explore, map out, compare or present design directions, visual explorations, mood boards, art directions or "mind map" style HTML, especially for EmDash work (blog covers, social cards, banners, launch visuals, landing sections), or asks for "a canvas like the grain one", even if they never say "canvas".
---

# Exploration canvas

Turns a design question into an infinite canvas the user can pan and zoom: the question sits in the middle, each branch is one angle on it, and every board holds live, comparable variations instead of static screenshots. The first one built this way is the Grain × Halftone map of ElevenLabs-style covers for the EmDash blog; `assets/examples/grain-halftone/` is that map in full.

A canvas is a plain folder:

```
explorations/<slug>/
  index.html   the exploration: config plus content, the only file you write
  canvas.css   engine styles   ┐ copied from the skill, never edited by hand;
  canvas.js    engine script   ┘ refresh with `scaffold.mjs <dir> --update`
  halftone.js  optional: EmDash's halftone cover engine (--halftone)
```

## Workflow

### 1. Gather the material

Find out what is being explored and what it is for: the brief, references (screenshots, posts, prompts), where the result ships, and what decision the canvas should help make. If the work lives in an EmDash repo, read the real source for anything you will mock (tokens in `src/layouts/Base.astro`, components such as `src/components/blog/PostCard.astro`) so the mocks match production. Real content beats placeholders: real post titles, real copy, real dates.

### 2. Plan the map before writing

Sketch the core and 6–8 branches. Branches are numbered in order: the first half sit on the left, the rest on the right.

- **Left: understand.** The brief or source (translated, quoted, summarised), how the thing is built (anatomy), references rebuilt side by side, constraints such as palette and type.
- **Right: make.** Directions and variations, details (type, numerals, marks), the work in context on the real page, motion.

Each branch gets 1–4 boards and each board makes one point. Boards are numbered `n.m` with a title and one sentence that says what to look at. Captions read `<b>Name</b> · note`. Say the plan to the user in a few lines if the brief is loose; otherwise just build.

### 3. Scaffold

```bash
node ~/.agents/skills/exploration-canvas/scripts/scaffold.mjs explorations/<slug> --title "Title" --subtitle "What it explores" --launch
```

- `--halftone` adds EmDash's halftone motifs (`pattern: { kind: "halftone" }`, `paperCover`).
- `--example grain-halftone` starts from the full reference map instead of the starter: copy patterns from it (blog index mock, share cards, canvas demos, drift lanes).
- `--launch` registers a preview server in `.claude/launch.json`. Agent sandboxes often protect that file; the script then prints the entry for you to add with your file tools.
- `--update` refreshes only the engine files in an existing canvas.

The starter `index.html` is a working six-branch canvas that uses every component. Replace its content; keep its shape.

### 4. Write the content

Everything goes in the `<script>` at the bottom of `index.html`, through `ExplorationCanvas.mount({...})`. Page-only CSS goes in its `<style>`. Read `references/components.md` for the full API before writing; the short version:

```js
const { mount, C, board, fig, grid, row, stack, prose, code, seg } = ExplorationCanvas;
mount({
  title: "Discord banners", subtitle: "Server and invite art",
  core: { eyebrow: "Exploration map · Oct 22, 2026", title: "Discord banners", desc: "…", card: { palette: "sunset", pattern: { kind: "rays" } } },
  branches: [
    { title: "Brief", sub: "What Discord allows", orb: "el3", body: () => row(board("1.1", "Sizes", "…", prose("<p>…</p>"))) },
    { title: "Directions", sub: "Three looks", orb: "heat", body: () => board("2.1", "Grain", "…", grid(3, 220, [fig(C({ palette: "heat", title: "Join\nEmDash" }), "<b>A</b> · warm")])) },
  ],
  onReady({ $, onSeg }) { /* draw canvases, wire seg controls */ },
});
```

`C(opts)` places a live grain card (palette, pattern, title style, aspect ratio). Boards can hold any HTML: images in the folder, `<canvas>` demos, the `.site` mock kit for emdashcms.com pages.

### 5. Preview and check every branch

Follow `references/verify-and-ship.md`: start the preview, frame each branch with `canvasMap.goBranch(n)` or `canvasMap.focus(selector)`, screenshot it, read the console, and fix what looks off before showing the user. A canvas you have not looked at branch by branch is not done.

### 6. Iterate, then share

Iterate with the user on content and directions. When they are happy, share it with the drop-deploy skill: run its `list`, pick a descriptive kebab-case name (reuse the name only for a new version of the same canvas), and deploy the folder:

```bash
node ~/.agents/skills/drop-deploy/scripts/drop.mjs deploy explorations/<slug> --name <slug>
```

## Art direction

`references/art-direction.md` holds the full system. The essentials:

- **Canvas.** Warm off-white (#f3f3f2) with a faint dot grid; frames are translucent white; boards are white with a 1px #e8e8e8 border and a 5px #ededed ring, 24px radius; floating HUD panels with backdrop blur. This is emdashcms.com's own card language, scaled up.
- **Type.** Inter. Board titles 650 weight with tight tracking, descriptions 14.5px at 68% ink, eyebrows prefixed with a short brand-orange dash.
- **Color.** Ink #262626, one accent: heat orange #ff5e1f. Grain cards take neighbouring hues only, light and slightly cool on top, dark and warm below; the EmDash set is sliced from the logo's own gradient.
- **Cards.** Linear base, four blurred blobs, soft Gaussian 1px grain at overlay 0.4, white linework or halftone dots near 0.3 opacity, Inter 400 titles at 8% of the width.
- **Motion.** Blobs drift over 20–28 s; cards have no hover effect; everything stops under reduced motion and when zoomed far out.
- **Light and dark.** The canvas follows the system theme, with a Light / System / Dark switch in the toolbar and the `D` key; dark matches emdashcms.com's dark mode (#f5f5f5 ink, #171717 boards on near-black). The grain cards stay the same artwork in both. `.site` mocks follow the canvas unless pinned with `siteTheme(el, "light" | "dark")`.

## Keep in mind

- Write page CSS with the theme tokens (`var(--ink)`, `var(--surface)`, `var(--line)`, `var(--muted)`) and derive tints with `color-mix(in srgb, var(--ink) 16%, transparent)`, never fixed greys, so every board works in both themes. Check both before showing the user.
- Leave `canvas.css` and `canvas.js` alone in a canvas. When a canvas needs something every canvas would want, add it to the skill's `assets/engine/` and run `--update`.
- Keep a canvas under roughly 120 grain cards. The engine pauses cards off screen and when zoomed out, but every card is still DOM.
- Write copy the way the boards read: plain, specific, one idea per sentence. Say what each variation is for, not that it is beautiful.
- The halftone engine is a snapshot of `src/lib/post-art.ts` in the emdashcms.com repo. If the site's motifs change, regenerate `assets/engine/halftone.js` with the command in its header.
