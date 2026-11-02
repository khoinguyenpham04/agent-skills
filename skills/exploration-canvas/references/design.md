# Design

The look of an exploration canvas, why it looks that way, and how to extend it without breaking it.

## Where it comes from

1. **A whiteboard.** Warm paper with a faint dot grid, frames that group work the way FigJam sections do, sticky notes, and the classic mind-map shape: a central topic, branches balanced left and right, and curved connectors that leave and arrive horizontally. Every gesture is one people already know from Figma, FigJam, Miro or tldraw: drag to pan, pinch or ⌘-scroll to zoom, double-click to focus.
2. **Notion's warmth.** Soft, desaturated tints for sections, callouts and stickies, so a canvas has color without shouting; icon tiles on branch heads; plain, friendly type; generous space.
3. **Linear's precision.** Crisp hierarchy, hairline borders, tight tracking on headings, monospace for numbers and keys, one accent, short motion on a confident curve, and a dark theme that's as finished as the light one.

There are no gradients, textures or decorative illustrations. Color marks meaning: a branch's identity, a right or wrong answer, the thing to look at now. Motion shows cause and effect.

## Tokens

| Element | Light | Dark |
| --- | --- | --- |
| Canvas | #f5f4f1, dots at 15% warm ink every 24px | #121211, dots at 7.5% white |
| Ink | #25241f (warm near-black) | #ecebe8 |
| Muted / subtle / prose | 64% / 46% / 86% of ink | same mixes of the dark ink |
| Boards, heads | #fff, 1px #e8e7e3 border, 5px #efeeea ring, soft drop shadow | #1b1b1a, #2a2927 border, 3.5% white ring |
| Insets (stages, demo views, code) | #f9f8f6 | #151514 |
| Frames | 55% white, 7% ink border, 38px radius | 2.2% white, 6% white border |
| HUD panels | 86% white with 14px blur | rgba(27,27,26,.82) |
| Wires | 24% ink, 1.5 screen px at any zoom | 20% white |
| Accent | `--accent`, default #5e6ad2 (indigo) | the same color |
| Accent as text | accent mixed 80% with ink (darker) | accent mixed 70% with ink (lighter) |

Radii: core 32px, frames 38px, boards 22px, insets and tables 14–16px, controls 9–12px, heads and chips fully round.

## Tints

Nine tints after Notion's palette, each a background and a matching ink: gray, brown, orange, yellow, green, blue, purple, pink, red. Light backgrounds are pale (#e7f3f8 blue, #fbf3db yellow); dark ones are deep and low in saturation (#18303e blue, #3d3420 yellow), so stickies and callouts read as colored paper in both themes.

- Branches cycle through blue, green, orange, purple, pink, yellow… unless given a `tint`. A branch's tint colors its head tile, its boards' eyebrow dashes, its quote rules and timeline dots, so each branch is recognisable at a glance.
- Text on a tint is ink, not the tint's own color; tinted labels (`tag`) mix the tint's ink with the page ink so they pass contrast.
- Use tints for grouping and meaning: themes in a sticky cluster, categories in a matrix, kinds of callout. One tint per meaning, used the same way across the canvas.

## The accent

One per canvas, used for what's interactive or current: timestamp chips, the current step's highlight, slider fills, the active toggle, demo outputs, the core's wire ports, focus rings. Choose it for the topic: the source's brand color (a channel's blue, a company's orange), or a color that suits the subject. Keep it mid-dark (contrast at least 4.5:1 on white for `--accent-text`), and don't use it for decoration.

## Type

Inter (variable, 400–800) with the system UI font as fallback, and `ui-monospace` for numbers, times, eyebrows and keys.

- Core title 54px/700 at −0.04em; description 19px at 64% ink.
- Branch title 33px/700 at −0.035em; subtitle 17px; number 13px mono.
- Board eyebrow 12.5px/600 mono with a 14×2px dash in the branch tint; title 23px/650 at −0.026em; description 14.5px/1.55 at 64% ink, one sentence, `text-wrap: pretty`.
- Prose 15.5px/1.66 at 86% ink; quotes 18px/1.5; captions 13px with the name in 600 ink: `<b>Name</b> · note`.
- Text sizes work at 100% zoom; the walk-through frames boards at up to 150%, the overview at 10–30%, where only titles need to read.

## Motion

- **Build-ins** play once, when a board first comes into view at a readable zoom: parts fade up, pop or draw in order, 90ms apart, each in 420–900ms on `cubic-bezier(.2,.8,.2,1)`. They explain an order or a structure; a board with nothing to build stays still.
- **State changes** (steps, flips, sliders, bars) transition in 250–560ms so the viewer sees what changed, and never block input.
- **Loops** are rare: only the cycle diagram's dot, which shows that the loop keeps turning.
- **Camera** flights take 760ms, ease in and out, and interpolate zoom in log space.
- Zoomed far out, nothing builds in: everything shows its final state. The `M` switch and the system's reduced-motion setting turn every animation off; states then change at once.

## Writing

Plain, specific sentences, one idea each. A board's description says what it shows and what to compare: "Lower the temperature and the weights pile onto one word." Not "A fascinating look at temperature." Name things by what they do. Use real content: the source's own words, real numbers with units, and the timestamp or page they come from.

## Extending the look

- Page-level styles use the tokens and `color-mix()` from `--ink`, never fixed colors, so they work in both themes.
- New board types or diagrams: build them in the page first. Move one into the engine only when every canvas would want it, then refresh canvases with `scaffold.mjs --update`.
- A brand's look: set `accent`, set `icon` or `mark` for the HUD, and override tokens (`--canvas`, `--ink`, `--font`) in the page's `<style>` if the brand needs it. Keep the structure.
