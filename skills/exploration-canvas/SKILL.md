---
name: exploration-canvas
description: Build interactive pan-and-zoom whiteboard canvases that help someone explore, brainstorm or learn a topic — a core idea in the middle, branches wired out to frames of boards, with step-through explainers, live demos with sliders, animated diagrams, flip cards and quizzes where they help, in a calm Notion- and Linear-style look with light and dark themes. Works from a YouTube video or lecture (fetches the transcript and links claims to their timestamps), an article, paper or PDF, a rough idea, or design directions to compare, and ships as one static folder that drop-deploy can share. Use whenever the user wants to explore, map out, break down, study, brainstorm, explain, visually summarize or compare something as a canvas, mind map, whiteboard or interactive explainer — "make a canvas of this video", "help me understand this paper", "map out this idea" — even if they never say "canvas".
---

# Exploration canvas

Turns a topic into an infinite whiteboard the user can pan, zoom and walk through. The topic sits in the middle; each branch is one angle on it; each board makes one point. Where doing beats reading, a board holds something to play with: steps to click through, a slider that redraws a chart, cards to flip, a quiz. The canvas follows the material and its purpose. Nothing about its shape is fixed.

A canvas is a plain folder:

```
explorations/<slug>/
  index.html   the canvas: config plus content, the only file you write
  canvas.css   ┐ the engine, copied from the skill; never edited in a canvas;
  canvas.js    ┘ refresh with `scaffold.mjs <dir> --update`
  …            any images, slides or clips the boards show
```

Put it in `explorations/<slug>` in the current project, or `~/Explorations/<slug>` when there's no project.

## Workflow

### 1. Get the material and its purpose

Find out what the canvas is for: understanding something, studying it, generating ideas, deciding, or presenting. Then read the material in full, not a summary of it:

- **A video or lecture:** get the transcript from the web. Try the video's own page, a transcript site, or the creator's written version (many courses and channels publish one). If none turns up, ask the user to paste it. Keep the timestamps (`[m:ss]`) and the chapter list, so quotes and claims can link back to the moment. Machine-made captions garble names and terms; check them against the title and chapters.
- **An article, paper or PDF:** read the full text and keep page or section numbers. Quote only words you have seen verbatim.
- **A rough idea:** pin down the problem, who it's for and the constraints. If the user gave one line, ask two or three questions at most, or make sensible assumptions and put them on the canvas as assumptions.
- **Design directions:** the brief, the references, and the real product's tokens and screens from its source, so the mocks match production.

### 2. Decide the shape

Choose the structure that fits this material and this purpose. `references/shapes.md` has starting points (learning from a video or a paper, brainstorming, comparing directions, explaining a system, making a decision); bend them, mix them, or ignore them. A few rules of thumb:

- The core states the topic in one line, says why it matters, and shows the source (a video thumbnail that plays it, the paper's title, the idea as the user put it).
- Use 4–8 branches, each a different angle, with 1–4 boards per branch. Each board makes one point, and its description says in one sentence what to look at.
- Order branches so walking through with → reads well. Use `layout: "balanced"` (the mind map) for many parallel angles. Use `layout: "right"` for material that runs in order, like a lecture's chapters.
- Keep the source and your additions apart: give boards that go beyond the material (your examples, critiques, connections) a badge such as "Beyond the video".

If the brief is loose, tell the user the plan in a few lines before building. Otherwise just build.

### 3. Scaffold

```bash
node ~/.agents/skills/exploration-canvas/scripts/scaffold.mjs explorations/<slug> --title "Title" --subtitle "What it explores" --launch
```

- The starter `index.html` is a working canvas that uses every piece once. Keep the pieces this material needs, delete the rest, and replace all the text.
- `--launch` registers a preview server (`scripts/serve.mjs`, caching off) in `.claude/launch.json`. Agent sandboxes often protect that file; the script then prints the entry for you to add with your file tools.
- `--update` refreshes only the engine files of an existing canvas.

### 4. Write the content

Everything goes in the `<script>` at the bottom of `index.html`, through `ExplorationCanvas.mount({...})`. Page-only CSS goes in its `<style>`. Read `references/components.md` before writing; the short version:

```js
const { mount, board, row, stack, prose, note, quote, steps, demo, slider, flips, quiz, timeline, t, video } = ExplorationCanvas;
mount({
  title: "Attention, step by step", subtitle: "3Blue1Brown, chapter 6", accent: "#3b82c4",
  source: { youtube: "eMlx5fFNoYc", title: "Attention in transformers", by: "3Blue1Brown" },
  core: { eyebrow: "Video · 26 min", title: "How attention moves meaning", desc: "…", media: video() },
  branches: [
    { title: "The gist", sub: "In one minute", icon: "book", body: () => row(board("1.1", "…", "…", prose("<p>…</p>"))) },
    { title: "How it works", sub: "One head, step by step", icon: "steps", body: () => board("2.1", "…", "…", steps({ stage: `<svg>…</svg>`, steps: [ /* … */ ] })) },
  ],
  onReady({ onDemo, bars, line }) { /* draw demos */ },
});
```

### 5. Add interaction where it earns its place

Match the piece to what the idea is:

| The idea is… | Use |
| --- | --- |
| A process or mechanism with stages | `steps`: build the picture up one part at a time |
| An output that depends on a knob | `demo` with `slider` / `toggle`, drawn with `line` or `bars` |
| Options weighed against criteria | `demo` with weight sliders and a ranked `bars` |
| A pipeline, or a cause and its effects | `flow` |
| Events in order, a talk's chapters | `timeline` (times like `"12:34"` play the video) |
| A loop that feeds back on itself | `cycle` |
| A trade-off on two axes | `matrix` |
| Terms, formulas, facts to keep | `flips` |
| "Did it stick?" | `quiz` at the end; `reveal()` for key words in prose |
| Raw ideas, reactions, open questions | `stickies` |

At most one interactive piece per board, and none where a still picture makes the point. Diagram parts build in when you arrive (`data-anim`); never animate decoration. A live demo built on numbers you chose says so ("illustrative numbers").

### 6. Preview and check every branch

Follow `references/verify-and-ship.md`: start the preview, frame each branch with `canvasMap.goBranch(n)`, screenshot it in light and dark, click every interactive piece, walk through with →, and read the console. A canvas you haven't looked at branch by branch isn't done.

### 7. Iterate, then share

Iterate with the user. When they're happy, share it with the drop-deploy skill: run its `list`, pick a descriptive kebab-case name (reuse a name only for a new version of the same canvas), and deploy the folder:

```bash
node ~/.agents/skills/drop-deploy/scripts/drop.mjs deploy explorations/<slug> --name <slug>
```

## Look

A calm whiteboard after Notion and Linear: warm paper with a dot grid, white boards with a hairline border and a soft ring, Inter, one accent color, and soft Notion-style tints that give each branch its own color. It follows the system's light or dark setting (the viewer can switch with `D`). There are no gradients and no decoration: color marks meaning, and motion shows cause and effect. Choose the accent per canvas: the source's brand color, or a color that suits the topic. The default is indigo. `references/design.md` has the full system.

## Writing on the canvas

- Write plain, specific sentences with one idea each. A board description says what the board shows and what to compare, never that something is fascinating.
- Ground everything. Quotes are exact; each one from a video carries its timestamp (`quote("…", { cite, t: "12:34" })`); papers get page or section numbers. Automatic captions garble names, numbers and terms, so check them against the video or the chapter titles before quoting.
- Label your additions: examples, analogies, critiques and connections that aren't in the source go on boards with a badge.
- Use real content: real titles, names, numbers and dates, with units and where they come from.

## Keep in mind

- In page CSS use the theme tokens (`var(--ink)`, `var(--muted)`, `var(--surface)`, `var(--line)`, `var(--accent)`, `var(--tint-bg)`) and derive anything else with `color-mix(in srgb, var(--ink) 16%, transparent)`, never fixed greys, so boards work in both themes. Check both.
- For SVG stages and diagrams use the `sv-*` classes (`sv-box`, `sv-tint`, `sv-accent`, `sv-line`, `sv-label`, `sv-small`) and `marker-end="url(#ec-arrow)"` for arrows. Don't put em-based `letter-spacing` on SVG text: Chrome scales it wrongly inside the zoomed canvas.
- Leave `canvas.css` and `canvas.js` alone in a canvas. When a canvas needs something every canvas would want, add it to the skill's `assets/engine/` and run `--update`.
- Keep a canvas to roughly 40 boards. Past that, split the topic into two canvases.
