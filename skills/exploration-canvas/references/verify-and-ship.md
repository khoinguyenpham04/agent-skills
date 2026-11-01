# Verify and ship

## Preview

1. Register a static server for the canvas folder. `scaffold.mjs --launch` does it, or add this to `.claude/launch.json` yourself (pick a free port):

   ```json
   {
     "name": "canvas-<slug>",
     "runtimeExecutable": "python3",
     "runtimeArgs": ["-m", "http.server", "4420", "--bind", "127.0.0.1", "--directory", "explorations/<slug>"],
     "port": 4420
   }
   ```

2. Start it with `preview_start`. Opening `index.html` straight from disk also works; the copy buttons then fall back to `execCommand`.
3. Set a laptop-sized viewport for review (`preview_resize` 1440×900) and reset it to `desktop` when you finish. If screenshots come back cropped, the pane is smaller than the viewport: use `desktop` instead.
4. Review both themes. Switch with `document.querySelector('[data-theme-set="dark"]').click()` (or `"light"`), or emulate the system setting with `preview_resize` `colorScheme: "dark"` while the canvas is on System. The choice is stored in `localStorage` under `exploration-canvas:theme`; clear it to get back to System.

## Look at every branch

The page exposes `window.canvasMap`:

```js
canvasMap.goBranch(3)                       // frame branch 3; 0 is the overview
canvasMap.focus("#b-7 .board", 0, 1)        // frame the first board of branch 7, at most 100%
canvasMap.focus(".site-grid", 0, 1)
```

Run one through `preview_eval`, wait about 1.2 s for the flight and the grain re-size, then `preview_screenshot`. Go through the overview and every branch. Check:

- No console errors (`preview_console_logs`).
- Boards don't overflow their frames, and grids fill the boards they sit in.
- Text on cards stays legible, and titles don't collide with the pattern (use `mask`).
- Every caption and description is real, specific copy.
- In both themes: no fixed greys that vanish (lines, tracks, chart axes), and site mocks look right in Auto, Light and Dark.
- Controls work: click `seg` buttons with `preview_eval` (`document.querySelector('.seg[data-seg="theme"] button[data-v="dark"]').click()`) when they are off screen.

Pitfalls:

- **Mid-flight screenshots.** A hidden preview pane throttles animation frames, so a screenshot can catch the camera mid-flight or the grain still sized for the old zoom. Take a second screenshot; the settled frame is the real one.
- **Cropped screenshots.** With an emulated viewport larger than the pane, a screenshot can show only part of the page. Measure with `getBoundingClientRect()` before you "fix" framing that is actually fine.
- **Synthetic double-clicks.** `preview_click` with `doubleClick` may not fire `dblclick`; use `canvasMap.focus` instead.
- **Tiny first load.** The preview tab can load at a small size. The engine re-fits the overview on resize until the user first moves the camera, so the initial view corrects itself.

Optional performance check while the pane is visible (frame times in ms; aim for a median near 8–16):

```js
new Promise((r) => { const ts = []; const t0 = performance.now(); const f = (t) => { ts.push(t); if (t - t0 < 2000) requestAnimationFrame(f); else { const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b); r({ median: d[d.length >> 1], p95: d[Math.floor(d.length * 0.95)], running: document.getAnimations().filter((a) => a.playState === "running").length }); } }; requestAnimationFrame(f); })
```

## Ship

When the user is happy with the iteration, deploy with the drop-deploy skill. It pins every deploy to the user's claimed account; never run `wrangler deploy` or `--temporary` yourself.

```bash
node ~/.agents/skills/drop-deploy/scripts/drop.mjs list
node ~/.agents/skills/drop-deploy/scripts/drop.mjs deploy explorations/<slug> --name <slug>
```

In Claude Code the Bash sandbox blocks the deploy's network calls, so run these through the terminal tool and read the result with `read_terminal`. Reusing a name replaces that artifact at the same URL, which is right for a new version of the same canvas. Give the user the artifact URL and the hub URL from the script's last lines. To confirm the deploy, fetch the page and its scripts from the terminal (the sandbox blocks workers.dev too) and compare sizes with the local files.
