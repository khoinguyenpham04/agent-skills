# Art direction

The look of an exploration canvas, why it looks that way, and how to extend it without breaking it.

## Where it comes from

Three sources, combined on purpose:

1. **emdashcms.com's own design language.** The canvas is the site's card system scaled up to a workspace: Inter, #262626 ink on near-white, brand orange #ff5e1f as the only accent, white cards with a 1px border plus a 4–6px pale ring (from `PostCard.astro`), eyebrows led by a short orange dash (from the blog header), and a dot-grid background that echoes the halftone "paper" pattern behind the blog's cover art (`PostCover.astro`). Work shown on the canvas therefore already sits in its brand context.
2. **Infinite-canvas conventions** that designers know from Figma, FigJam, Miro, tldraw and XMind: scroll or drag to pan, pinch or ⌘-scroll to zoom, double-click to zoom to a thing, a floating file-name panel top-left and zoom controls bottom-right, translucent blurred toolbars, frames that group work like Figma sections, and the classic mind-map shape (a central topic, branches balanced left and right, curved connectors that leave and arrive horizontally). Nothing needs explaining because every gesture is one people already use.
3. **The grainy gradient recipe** from Ian's post about ElevenLabs' blog covers: blurred color blobs in neighbouring hues, light over dark, under a layer of one-pixel grain. It gives the boards something alive and tactile to hold, and it is the art direction the first canvas explored.

## Canvas

| Element | Spec |
| --- | --- |
| Background | #f3f3f2, dots of rgba(38,38,38,.16) every 24px at 100%; the spacing scales with zoom and jumps ×4 below 14px so it never turns to noise |
| Map | Core in the middle; branch columns 240px from it; 150px between branches; heads 120px from their frames; 360px padding |
| Core | 600px grain card, 36px radius, an 8px white ring plus a hairline, a long soft shadow; 64px/700 title at −0.045em, 19px description at 68% ink |
| Heads | Pill, 76px palette orb, mono branch number, 34px/700 title, 17px subtitle |
| Frames | rgba(255,255,255,.5), 1px rgba(38,38,38,.07) border, 40px radius, 40px padding |
| Boards | White, 1px #e8e8e8 border, 5px #ededed ring, 24px radius, 28px padding |
| Wires | 1.5 screen px at any zoom, rgba(38,38,38,.24); white port dots; orange ports on the core |
| HUD | Translucent panels with 14px blur, 16px radius; brand top-left, branch index below it, layer switches and the Light / System / Dark switch top-right, zoom bottom-right, shortcuts bottom-centre |

## Dark theme

Follows emdashcms.com's dark mode, so dark mocks and dark canvas agree.

| Token | Light | Dark |
| --- | --- | --- |
| Canvas | #f3f3f2, dots at 16% ink | #0c0c0c, dots at 8.5% white |
| Ink | #262626 | #f5f5f5 |
| Muted / subtle | 68% / 52% ink | 64% / 46% ink |
| Boards, heads | #fff, border #e8e8e8, ring #ededed | #171717, border #272727, ring 4.5% white |
| Insets (code, stats) | #f8f8f7 | #111 |
| Frames | 50% white | 2.2% white, 6% white border |
| HUD panels | 88% white | rgba(24,24,24,.8) |
| Wires | 24% ink | 20% white |
| Card hairline | 20% black | 10% white, so dark-bottomed cards keep an edge |
| Orange text | #b84416 | #ff5e1f |
| Core glow | soft plum shadow | warm orange glow under the hero |

The grain cards don't change: they are artwork, and on dark boards they read like lit screens. In page styles use the tokens and `color-mix` from `--ink`; a fixed grey is the usual reason a board breaks in one theme.

## Type

Inter (variable, 400–800) with the system UI font as fallback, and `ui-monospace` for numbers, file names and keys.

- Board eyebrow: 13px/600 with a 14×2px heat-orange dash, tabular numbers (`2.1`).
- Board title: 23px/650, −0.028em.
- Board description: 14.5px/1.55 at 68% ink, one sentence, wraps with `text-wrap: pretty`.
- Captions: 13px at 68% ink with the name in 600 ink: `<b>Name</b> · note`.
- Prose: 15.5px/1.66 at 84% ink.
- On grain cards: titles Inter 400 at 8% of the card width (`8cqi`), white, centred, balanced; numerals 500 at 30% with −0.065em tracking.

## Color

- Ink #262626; muted ink at 68% and 52%; lines #e8e8e8 and #ededed.
- One accent, heat orange #ff5e1f, for the eyebrow dash, active states, switches and the core ports. Orange text on white uses #b84416 for contrast.
- Grain card palettes keep to **neighbouring hues on the color wheel**, run **light and slightly cool at the top to dark and warm at the bottom** (sky over ground), and never mix complements inside one card. The EmDash set is sliced from the logo gradient, which already runs through neighbours: #FFF7EC #FFE9CB #FFCD89 #FBAD41 #F6821F #FF6633 #CE2F55 #911475 #5D0C83 #281A81 #0F006B. Take three or four adjacent stops, add a pale fog on top and a deep tone below.
- Map palettes to meaning when a series needs it (releases warm, engineering cool) and let the seed vary the composition within a palette, so one tag never looks like a row of copies.

## Grain cards

Five layers, bottom to top:

1. **Base:** a top-to-bottom linear gradient in oklab through four stops.
2. **Blobs:** four radial gradients sized 50–100% of the card, with an eased falloff (no visible edge), placed near the corners and edges, jittered and mirrored by the seed.
3. **Pattern:** white linework at 0.8px and about 0.32 opacity, or halftone dots (ordinary dots 0.36, the motif's accent 0.95 with a glow). Masked away from any title.
4. **Grain:** a 128×128 tile of Gaussian grayscale noise centred on mid-grey (standard deviation 12% of the range), at overlay 0.4, one grain per device pixel, sampled smooth. Uniform noise reads about 2.4× too strong in the mid-tones. Overlay grains the mid-tones most and fades toward the palest and darkest areas; it also breaks up banding.
5. **Title:** white Inter, then a 0.5px inner hairline over everything.

## Motion

- Blobs drift on their own 20–28 s loops with slight scaling, so a card never visibly repeats.
- Cards have no hover effect. Drift is their only motion.
- Camera flights take 760 ms with ease-in-out and interpolate zoom in log space.
- Drift pauses for cards off screen and below 22% zoom. `prefers-reduced-motion` turns off drift and flights.

## Writing on the canvas

Plain, specific sentences. A board description says what the board shows and what to compare ("The ripple's drop three ways. White keeps to the recipe; heat orange keeps the brand but breaks the adjacent-hue rule."), not that something is stunning. Name variations by what they do. Use real content: real titles, real dates, real copy from the source.

## Extending the look

- New palettes: follow the color rules above and register them with `addPalette`.
- New card treatments or board types: build them in the page first. Move one into the engine only when every canvas would want it, then refresh canvases with `scaffold.mjs --update`.
- Other brands: swap `mark` in `mount`, add palettes from that brand's ramp, and override the tokens at the top of `canvas.css` from the page's `<style>` (`--heat`, `--ink`, `--canvas`), keeping the structure.
