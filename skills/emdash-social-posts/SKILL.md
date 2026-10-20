---
name: emdash-social-posts
description: Plan, write and illustrate EmDash social media posts, from release threads to single feature announcements, for X, Bluesky, LinkedIn, Threads or Mastodon, with emdashcms.com-styled image cards built from real screenshots, code and halftone art. Use whenever the user wants to announce, tweet, post, thread or promote anything about EmDash (a release, a merged PR, a blog post, a feature, a milestone or an event), whether from the official @emdashcms account or a maintainer's or contributor's personal account, or asks for social cards, launch images or alt text, even if they only say "make an X post for this".
---

# EmDash social posts

Turn a source (release notes, a blog post, a PR, a feature) into posts ready to paste, plus image cards in the emdashcms.com style. The deliverable is one folder holding a PNG per card and one markdown file per account, mapping every post to its images and alt text.

The user posts. Never publish, schedule or send anything to a social platform yourself.

## Bundled files

| Path | Use |
| --- | --- |
| `references/voice.md` | Style rules, brand and personal voices, post types, the thread file format, alt text. Read before writing copy. |
| `references/platforms.md` | Length limits, image shapes, link behaviour and adapting a thread between platforms. Read once the platforms are known. |
| `references/card-design.md` | The look, the cards spec, composition rules, screenshot capture, the review checklist. Read before making cards. |
| `scripts/render-cards.mjs` | Renders a cards spec (JSON) to 2x PNGs; warns about overflow, clipping, missing images and misplaced art. |
| `scripts/contact-sheet.mjs` | Tiles the rendered cards into one image for review. |
| `scripts/lint-posts.mjs` | Checks a thread file per platform: length, emojis, colons, stray mentions, missing images or alt text. |
| `examples/emdash-1-1/` | The EmDash 1.1 X thread: cards spec, screenshots, the brand thread and a maintainer's personal thread. |

Run the scripts with Node 18 or later from the working directory, calling them by their full path in the skill's base directory (shown when the skill loads), written `<skill>` below. They need Playwright, which the emdash repo has; card-design.md covers what to do when it can't be found.

## Workflow

### 1. Ask what the post is for

Voice, length and image layout all depend on the platform and the account, and a wrong guess costs a full rewrite. The 1.1 thread was rewritten twice: once when a free X account turned out to cap threads at six posts, and again when it moved to the brand account.

Before drafting, ask in one AskUserQuestion call (up to four questions, two to four options each), skipping anything the user already said or the context makes obvious:

1. **Platform** (multi-select): X, Bluesky, LinkedIn, or Threads and Mastodon.
2. **Account**: the official @emdashcms account; a core maintainer's personal account; a contributor's personal account; or both, meaning a brand thread plus a personal companion post.
3. **Format and limits**: a thread or a single post, and the account tier. On X a free account gets 280 characters per post and may cap threads; Premium allows long posts, but the feed still cuts them off at about 280 characters.
4. **Images**: dark emdashcms.com cards, light cards, or no images.

Ask a shorter second round only for what is still missing and matters:

- the source, when it isn't in the conversation or the repo (if fetching the blog fails, as it does inside the Claude Code sandbox, ask the user to paste the post);
- which highlights to include, and their order;
- contributor handles on the target platform, for credits;
- for a personal account, what the person did on the work, since a first-person post may disclose it;
- whether the last post needs a link or an install or upgrade command.

### 2. Gather and verify the facts

Every sentence in a post must trace to a source. Collect facts in this order:

1. The published blog post or release notes, pasted by the user if needed.
2. `.changeset/*.md` and `packages/*/CHANGELOG.md` in the emdash repo.
3. The merged PRs (`gh pr view <number>`), with their descriptions and screenshots.
4. The docs, through the emdash-docs MCP server's `search_docs` tool when it's available.
5. The code.

Keep a short fact sheet in scratch notes: each claim, its source, and any caveat (experimental, opt-in, needs config, different on Cloudflare). Earlier drafts were caught overclaiming "one click" for a two-step action, "live preview" for a Preview tab, and an upgrade command that left out the Cloudflare package.

### 3. Plan the posts

The default release thread:

1. A hook post naming the release and its headline features in one or two sentences.
2. One post per headline feature, each with one card.
3. A post for the smaller fixes, when readers will care.
4. A closing post with the link, any command and thanks. Give it no card, so the platform shows the link preview.

Keep the link out of the first post. When the account caps the thread length, merge minor features into one post with up to four images instead of dropping them, and check platforms.md for how multi-image posts crop. Other post types (single feature, blog promotion, contributor shout-out, milestone, event) are outlined in voice.md.

For long threads or vague requests, show the outline (one line per post, with its card) before making images. Rendering and reviewing cards is the slowest step.

### 4. Write the copy

Read `references/voice.md` and follow it. The rules that came from direct feedback:

- No emojis, and no emoji-like arrows.
- No colon constructions such as "Meet X: ..." or "Here's what's new:". End the sentence instead.
- Concise and straight to the point: one or two sentences per post, usually 100 to 170 characters, even when the limit is higher.
- Human and coherent, casual but serious, light. The brand account sounds like a startup SaaS account; a personal account sounds like a person.
- Never @-mention a handle that isn't confirmed for that platform. A scoped package name such as `@emdash-cms/cloudflare` turns into a mention of @emdash, so write "the Cloudflare package".

Save the posts in the thread file format from voice.md, then lint them for each platform:

```bash
node <skill>/scripts/lint-posts.mjs <folder>/thread-<account>.md --platform x
```

Fix every error. Treat warnings as prompts for judgment.

### 5. Make the cards

Read `references/card-design.md` first.

1. Collect screenshots at 2x. Reuse PR screenshots when they show exactly the feature; otherwise capture new ones from a demo site.
2. Write `<folder>/cards.json`, starting from `<skill>/examples/emdash-1-1/cards.json`.
3. Render the cards and a contact sheet:

   ```bash
   node <skill>/scripts/render-cards.mjs <folder>/cards.json
   node <skill>/scripts/contact-sheet.mjs <folder>
   ```

4. Read the contact sheet, then every card at full size. Fix and re-render single cards with `--only <name>` until each passes the review checklist in card-design.md.

To see the target look, render the example into scratch space: `node <skill>/scripts/render-cards.mjs <skill>/examples/emdash-1-1/cards.json --out "$TMPDIR/emdash-1-1"`.

### 6. Deliver

Put everything in one folder in the working directory, named `social-<slug>/`: the PNG cards, `cards.json` and one `thread-<account>.md` per account. The folder is a working draft, so don't commit it.

In the reply, paste each post in order with its card's file name, then list only what the user must check before posting: unconfirmed handles, the iOS caveat for commands with `--`, and anything deliberately left out.

## Iterating

Expect several rounds of feedback. Apply each change to every account file it affects, lint again and re-render only the cards that changed. When the user states a standing preference (such as "no colons"), offer to add it to `references/voice.md` so later runs follow it.
