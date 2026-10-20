# Voice and copy

- [Rules for every account](#rules-for-every-account)
- [The official account](#the-official-account)
- [Personal accounts](#personal-accounts)
- [Both at once](#both-at-once)
- [Post types](#post-types)
- [Thread file format](#thread-file-format)
- [Alt text](#alt-text)

## Rules for every account

Each rule exists because a draft of the EmDash 1.1 thread broke it and the user corrected it.

- **No emojis**, and no emoji-like arrows (→, ↓ and the like). They read as filler.
- **No colon constructions.** "Meet the calendar: everything you need" and "Here's what's new:" read as machine-written. End the sentence and start a new one, including before a list. Colons inside URLs, times and code are fine.
- **Concise and straight to the point.** One or two sentences per post, usually 100 to 170 characters, even when the platform allows more. Cut a detail before adding a clause; the card and the linked post carry the rest.
- **Human, casual but serious, light.** Plain words, contractions, and now and then a dry line ("Images, minus the fiddling."). No hype words such as game-changer, revolutionary, supercharge or "we're excited to announce".
- **No hashtags** unless the user asks. On Mastodon they matter for discovery, so ask there.
- **One idea per post.** A post that needs "and also" is two posts or a list.
- **Accurate before catchy.** Every claim traces to the fact sheet. Don't round up: two clicks are not "one click", a Preview tab is not a "live preview", and an upgrade command that misses a package is wrong.
- **Mentions.** Tag only handles confirmed for that platform; a GitHub username is not an X handle. Scoped package names become mentions (`@emdash-cms/cloudflare` tags @emdash), so describe them instead ("the Cloudflare package").
- **Names.** Follow the release notes: EmDash, EmDash 1.1 (not v1.1), Portable Text, Media Library. Marketing copy writes "iFrame" (a reviewer's call) although the admin labels the block "Iframe"; the `/iframe` command stays lowercase.
- **Commands** go on their own line. Tell the user that iOS turns a typed `--` into an em dash, so they should paste the post rather than type it.
- **Links** go in the last post.

## The official account

The official account (@emdashcms on X) speaks as "we". It sounds like a confident startup SaaS account, in the spirit of Cloudflare, Stripe, Ramp or Linear: short, clear, a little dry, never cute at the expense of the facts.

- Open each post with the point, not a teaser. "Meet the publishing calendar." works; "Guess what we built?" doesn't.
- Say what the reader can do now, then the one detail that makes it believable.
- No personal asides such as "I built this". Credit contributors as a group, or by handle once the user confirms the handles.
- Don't mention roadmap items or dates that aren't public.

Example: `examples/emdash-1-1/thread-emdashcms.md`, nine posts with one card each.

## Personal accounts

A personal post sounds like a person and uses the first person. Ask what the person did on the work, because it changes what they can say.

**Core maintainer.** Uses "we" for the project and "I" for their own work. Can add a behind-the-scenes line or an opinion. Discloses their own work when praising it ("I built this one, so I'm a bit biased."). Stays inside what the release notes say.

**Contributor, core or community.** Writes about what they built or learned and links the release or the PR. Says "EmDash 1.1 shipped" rather than "we shipped" unless they're on the team, and thanks the maintainers who reviewed the work. A first contribution makes a good hook.

Example: `examples/emdash-1-1/thread-personal.md`, a core maintainer who built the calendar, on a free X account capped at six posts.

Never write a personal post as if it came from the brand, or a brand post as if it came from a person.

## Both at once

When the user wants brand and personal posts:

1. The brand account posts the full thread first.
2. The personal account quote-posts the brand's first post with a short first-person take, or posts its own shorter thread when its limits allow.
3. Word the same facts differently. Two accounts posting the same text looks automated.
4. Share the cards. A personal companion post usually needs one image or none, since the quoted thread carries the rest.

Write one thread file per account, such as `thread-emdashcms.md` and `thread-<first-name>.md`.

## Post types

| Type | Shape |
| --- | --- |
| Release thread | A hook naming the release and its headline features, one post per feature with a card, a fixes post, and a closing post with the link and any command. |
| Single feature | One post with one card. What the reader can do now, then how to get it. |
| Blog promotion | One post with the blog's cover or a cover card, a one-sentence hook and the link. |
| Merged PR or contributor shout-out | Credit by confirmed handle, one sentence on what the change enables, and a link to the PR or release. |
| Milestone (stars, releases, users) | The number and one sentence of thanks or context. |
| Event or talk | What, when and where, one reason to come, and the link. |

## Thread file format

One file per account. `lint-posts.mjs` and the user both rely on this layout: a heading per post with its image files (or "no image"), the post text, then an alt text line per image.

```markdown
# EmDash 1.1 thread for @emdashcms

Nine posts, one image each. Post 9 has no image, so X shows the link preview.

---

## 1 · 01-release.png

EmDash 1.1 is here, with a publishing calendar, richer embeds, easier images, Microsoft sign-in and faster sites.

Here's what's new.

**Alt text:** EmDash 1.1 release card with the title "EmDash 1.1" and the line "Publishing calendar, richer embeds and faster sites", beside orange and grey halftone art.

---

## 3 · 03-html-blocks.png, 04-iframe-blocks.png

A few more things in 1.1.

**Alt text, 03-html-blocks.png:** An HTML block in the EmDash editor, showing its markup and a preview of the form it builds.

**Alt text, 04-iframe-blocks.png:** An iFrame block on its Preview tab, showing an embedded store page.

---

## 9 · no image

That's EmDash 1.1. To upgrade, run

pnpm up --latest emdash

https://emdashcms.com/blog/emdash-1-1
```

With one image, use `**Alt text:**`. With several, use `**Alt text, <file>:**` for each.

## Alt text

Write alt text for every image. Say what the image shows and quote the card's headline. For a screenshot, describe what the interface shows; for code, say in a sentence what it does instead of reading it out. Keep it to one or two sentences, don't start with "Image of", and stay under X's 1,000-character limit.
