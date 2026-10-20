# Card design

- [The look](#the-look)
- [Layout](#layout)
- [The cards spec](#the-cards-spec)
- [Composition rules](#composition-rules)
- [Screenshots](#screenshots)
- [Review checklist](#review-checklist)
- [Troubleshooting](#troubleshooting)

## The look

The cards borrow from the emdashcms.com blog: its colours, Inter, the post cover frame, and the halftone art its covers use. `scripts/post-art.mjs` is a copy of the site's generator, so a release card can carry the same art as its blog post (the blog seeds a post's art with its slug, such as `emdash-1-1`).

| Token | Dark | Light |
| --- | --- | --- |
| Page | #0a0a0a mixed 50% with #171717 | #f9f9f9 mixed 50% with #ffffff |
| Text | #f5f5f5 | #262626 |
| Muted text | text at 72% | text at 72% |
| Accent | #ff5e1f | #ff5e1f |
| Frame | 18 px radius, 1 px border, 4 px ring | same |

Type: Inter (bundled in `assets/fonts`). The eyebrow is 16 px semibold after a short orange dash; the title is 50 px bold with tight tracking; the dek is 20 px in muted text; code uses SF Mono, falling back to Menlo. Dark is the default. Light suits LinkedIn, or whenever the user asks.

## Layout

A card is 1200 × 675 CSS px rendered at 2x. The left column holds the logo, then the eyebrow, title and dek, centred vertically. The right frame holds halftone art and up to two windows: screenshots, code panels or a list.

| Layout and variant | Inside of the frame | Notes |
| --- | --- | --- |
| `landscape` | 686 × 593 | The default card. |
| `landscape` cover | 558 × 593 | A big one-line title and art only. |
| `og` | 686 × 548 | 1200 × 630. |
| `portrait` | 998 × 824 | Copy on top, frame below. |

Frame coordinates (`left`, `top`, `accent`) are in CSS px from the inside top-left corner of the frame.

## The cards spec

Start from `examples/emdash-1-1/cards.json`. Paths in the spec are relative to the spec file; `~/` works too.

Top-level fields:

| Field | Default | Meaning |
| --- | --- | --- |
| `cards` | (required) | The cards, in thread order. |
| `theme` | `dark` | `dark` or `light`. |
| `layout` | `landscape` | `landscape`, `og` or `portrait`. |
| `seedPrefix` | `emdash` | Prefix for art seeds. Use the release slug so the art stays the same between renders. |
| `scale` | `2` | Pixel ratio of the output PNGs. |
| `dpr` | `2` | Pixel ratio of the screenshots you supply. |
| `out` | the spec's folder | Where PNGs go; `--out` overrides it. |
| `accent`, `logo` | brand orange, EmDash logo | Overrides for another brand. |

Card fields:

| Field | Meaning |
| --- | --- |
| `name` | File name without `.png`, such as `02-calendar`. Number the cards in thread order. |
| `variant` | `"cover"` for the opening card. |
| `eyebrow`, `title`, `dek` | The text. Keep the title to two to four words and the dek to one sentence. |
| `art` | The halftone art (below). |
| `frame` | Items drawn over the art. Later items sit on top unless `z` says otherwise. |

Art:

- `{ "seed": "emdash-1-1" }` fills the frame with the art for that seed. Use it for covers.
- `{ "name": "calendar", "motif": "ripple", "accent": [636, 44] }` enlarges the art (`zoom`, default 1.6) and shifts it so the orange accent lands on the frame point `accent`. Seeds are tried from `<seedPrefix>-<name>` until one has the motif and reaches the point. The motifs are waves, ripple, dash, sphere and lines.
- `false` draws no art.

Frame items take `left`, `top` and `z`, or `"center": true`:

| Type | Fields |
| --- | --- |
| `screenshot` | `src`; `crop` as `{ x, y, w, h }` in the screenshot's CSS px; `scale`; `masks` as `[{ x, y, w, h, color }]` in the same units, to cover clipped text; `fade` for soft top and bottom edges. |
| `code` | `file` (the header label); `code` as a string or a list of lines; `lang` (`js`, `env`, `json` or `plain`, with `.env` files detected); `width`; `size` (default 14). |
| `list` | `items` as `[[label, text], ...]`; `width`. |

Render, then review:

```bash
node <skill>/scripts/render-cards.mjs <folder>/cards.json [--only <name>]
node <skill>/scripts/contact-sheet.mjs <folder>
```

The renderer warns when text overflows its column, a window runs past the frame, an image is missing, or the accent can't reach its target.

## Composition rules

Reviewers made these corrections on the 1.1 cards:

- **Show the real product.** Use real screenshots, and code panels for config.
- **Keep the card and its post in sync**, word for word where they overlap.
- **Pair windows only when they show the same thing**, such as an HTML block's code and its preview. One card paired YouTube embed code with a preview of a store page, and a reviewer flagged it.
- **Crop to the feature.** Don't leave half-cut UI at an edge, such as a sliver of a calendar column with a clipped entry. Crop tighter or show more.
- **Mask clipped lines** at crop edges instead of leaving slivers of glyphs.
- **Put the orange accent in open space**, a corner or an edge strip. Avoid accent dots peeking out between windows and big orange blocks behind lists.
- **Centre a lone list** in the frame.
- **Make code realistic enough to copy**, such as a real `astro.config.mjs` shape; hide secrets with "…" and label made-up output "(example)".
- **No URL or arrow on a card.** Cards aren't clickable.
- **The cover title is the name and version on one line** ("EmDash 1.1"), with the release date as the eyebrow.

## Screenshots

Reuse first: PR descriptions and local PR screenshot folders often hold exactly the shot. Capture fresh ones when the UI has changed or no shot fits.

To capture from a local demo site:

1. Start a demo from the emdash repo, such as `demos/simple`, with realistic content rather than placeholder text.
2. Open the admin through the dev bypass: `http://localhost:4321/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin/<page>`.
3. Use Playwright with `deviceScaleFactor: 2`, `reducedMotion: "reduce"`, a fixed `timezoneId` and the light colour scheme, since light product UI reads best on dark cards. In the Claude Code sandbox, launch Chromium with `--single-process`.
4. Screenshot the region around the feature with some context, then crop further in the spec.

## Review checklist

Read the contact sheet, then each card at full size.

- The card says what its post says, and nothing on it is untrue or out of date.
- No text overflows or collides, and every renderer warning is understood.
- Nothing is half-cut at a window edge, and clipped lines are masked.
- The accent sits in open space.
- Code is plausible, secrets are hidden and examples are labelled.
- Small text is still legible on the contact sheet, which is close to phone size.
- Product names match the copy.

## Troubleshooting

- **"Playwright was not found".** Run from a checkout that has it installed (the emdash repo does), or set `PLAYWRIGHT_MODULE` to its entry file, such as `.../node_modules/@playwright/test/index.mjs`.
- **Chromium crashes at launch.** The scripts pass `--single-process`, which the Claude Code sandbox needs. Outside the sandbox, `RENDER_MULTI_PROCESS=1` turns it off.
- **Wrong fonts.** Inter is bundled. The mono font comes from macOS (SF Mono) and falls back to Menlo elsewhere.
- **The site's art changed.** Copy `src/lib/post-art.ts` from the emdashcms.com repo over `scripts/post-art.mjs`, strip the types and keep the exported `motifFor` and `MOTIFS`.
