# Verify and ship

## Preview

1. Register a preview server for the canvas folder. `scaffold.mjs --launch` does it, or add this to `.claude/launch.json` yourself (pick a free port):

   ```json
   {
     "name": "canvas-<slug>",
     "runtimeExecutable": "node",
     "runtimeArgs": ["<home>/.agents/skills/exploration-canvas/scripts/serve.mjs", "<absolute path to the canvas>", "4420"],
     "port": 4420
   }
   ```

   `serve.mjs` turns caching off. With python's `http.server` the browser keeps serving stale `canvas.css` and `canvas.js` after an edit, and you end up checking the old engine.
2. Start it with `preview_start`. Opening `index.html` straight from disk also works, but the copy buttons then fall back to `execCommand`, and YouTube embeds may refuse a `file://` page.
3. Set a laptop-sized viewport (`preview_resize` 1440×900) and reset it to `desktop` when you finish. If screenshots come back cropped, the pane is smaller than the viewport: use `desktop` instead.
4. **Turn motion off for screenshots** when the preview pane is hidden: background tabs throttle animation frames, so build-ins and transitions can freeze half-way. Use `document.querySelector('[data-toggle="motion"]').click()` (or press `M`). Every state then shows at once. Turn it back on to check the motion itself while the pane is visible.
5. Review both themes. Switch with `document.querySelector('[data-theme-set="dark"]').click()` (or `"light"`), or emulate the system setting with `preview_resize` `colorScheme: "dark"` while the canvas is on System. The choice is stored in `localStorage` under `exploration-canvas:theme`; clear it to get back to System.

## Look at every branch

The page exposes `window.canvasMap`:

```js
canvasMap.goBranch(3)                 // frame branch 3; 0 is the overview
canvasMap.focus("#b-4 .board", 1, 1)  // frame the second board of branch 4, at most 100%
canvasMap.walk(1)                     // what → does: next board, or the next step of an explainer
canvasMap.step(".steps", 3)           // show step 3 of the first explainer
```

Run one through `preview_eval`, wait about 1.5 s for the flight, then `preview_screenshot`. Go through the overview and every branch, in light and in dark. Check:

- No console errors (`preview_console_logs`).
- Boards don't overflow their frames, grids fill the boards they sit in, and nothing is cut off.
- Text in SVG stages and diagrams is the right size and centered in its shapes. If a label looks tiny or squashed, check `el.getComputedTextLength()` and remove any em-based `letter-spacing` from it.
- Every caption, description and quote is real, specific, and grounded: quotes have timestamps or pages, and boards that go beyond the source have a badge.
- In both themes: no fixed greys that vanish (lines, tracks, axes), and tints read as colored paper.

## Use every interactive piece

- **Explainers:** step through to the end with `canvasMap.step(sel, k)` and screenshot each step: every part appears when it should, and the highlight moves to the right part.
- **Demos:** move each control and check the view responds. For a slider, `const s = document.querySelector('[name="temp"]'); s.value = 2; s.dispatchEvent(new Event("input", { bubbles: true }))`; for a toggle or choice, `.click()` it. Try the extremes: the lowest and highest values shouldn't break the drawing.
- **Flips, quizzes, reveals:** click them; a quiz shows right and wrong, the explanation, and the score.
- **Timestamps:** with a video source, click a chip; the docked player opens at that time (check the iframe `src` has the right `start=`). Without a playable source, chips link to the page or stay plain.
- **Walk-through:** from the overview, call `canvasMap.walk(1)` repeatedly. It should go core, then each branch and its boards in order, playing every explainer's steps on the way. The hint bar shows "n of N".

Pitfalls:

- **Stale files.** If a fix doesn't show, confirm the page loaded the new engine (`[...document.styleSheets].find(s => s.href?.includes("canvas.css"))`). Use `serve.mjs` and reload.
- **Mid-flight screenshots.** A screenshot can catch the camera mid-flight. Take a second one; the settled frame is the real one.
- **Cropped screenshots.** With an emulated viewport larger than the pane, a screenshot can show only part of the page. Measure with `getBoundingClientRect()` before you "fix" framing that's actually fine.
- **Synthetic double-clicks.** `preview_click` with `doubleClick` may not fire `dblclick`; use `canvasMap.focus` instead.
- **Tiny first load.** The preview tab can load at a small size. The engine re-fits the overview on resize until the user first moves the camera, so the initial view corrects itself.

Optional performance check while the pane is visible (frame times in ms; aim for a median near 8–16):

```js
new Promise((r) => { const ts = []; const t0 = performance.now(); const f = (t) => { ts.push(t); if (t - t0 < 2000) requestAnimationFrame(f); else { const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b); r({ median: d[d.length >> 1], p95: d[Math.floor(d.length * 0.95)] }); } }; requestAnimationFrame(f); })
```

## Ship

When the user is happy with the iteration, deploy with the drop-deploy skill. It pins every deploy to the user's claimed account; never run `wrangler deploy` or `--temporary` yourself.

```bash
node ~/.agents/skills/drop-deploy/scripts/drop.mjs list
node ~/.agents/skills/drop-deploy/scripts/drop.mjs deploy explorations/<slug> --name <slug>
```

In Claude Code the Bash sandbox blocks the deploy's network calls, so run these through the terminal tool and read the result with `read_terminal`. Reusing a name replaces that artifact at the same URL, which is right for a new version of the same canvas. Give the user the artifact URL and the hub URL from the script's last lines.
