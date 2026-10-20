# Platforms

Limits change. These were checked in October 2026. Search the web when a post is close to a limit or the platform isn't listed.

## Limits

| Platform | Length per post | Images per post | Links |
| --- | --- | --- | --- |
| X, free account | 280 weighted characters. A URL, or a bare domain such as emdashcms.com, counts as 23; emoji and CJK characters count as 2. | 4 | A link preview appears only when the post has no image. |
| X, Premium (verified) | Up to 25,000 characters, but the feed cuts a post off after about 280 behind "Show more". Keep posts under 280 anyway. | 4 | Same as a free account. |
| Bluesky | 300 characters. Count links at full length to be safe. | 4 | A link preview appears when the post has no image. |
| LinkedIn | 3,000 characters. The feed shows about the first 210 before "see more". | Several images, or a PDF document for a carousel. | A preview of the first link. |
| Threads | 500 characters. | Up to 10, as a carousel. | A link preview. |
| Mastodon | 500 characters by default; each server sets its own limit. A URL counts as 23. | 4 | A link preview. Alt text is expected, and CamelCase hashtags are how people find posts. |

**Thread length.** X doesn't clearly document a cap, but a free account was stopped at six posts in October 2026. Ask how many posts the user's account allows.

**Links and reach.** Posts with external links tend to get less reach on X, which is why the link goes in the last post.

## Image shapes

| Layout | Size (CSS px, rendered at 2x) | Use |
| --- | --- | --- |
| `landscape` (16:9) | 1200 × 675, giving 2400 × 1350 | X, Bluesky, Mastodon, Threads and LinkedIn. The default. |
| `og` (1.91:1) | 1200 × 630, giving 2400 × 1260 | Link previews and a blog's `og:image`. |
| `portrait` (4:5) | 1080 × 1350, giving 2160 × 2700 | LinkedIn and Threads feeds, where a taller image gets more space. |

X shows a single 16:9 image uncropped. With two or three images it crops each one to a taller tile; four images show as a 2 × 2 grid of roughly 16:9 tiles. Check the composer preview whenever a post has more than one image, and keep the key content away from the edges.

Rendered cards weigh 0.3 to 1.1 MB, well under every platform's size limit (X allows 5 MB per image).

## Adapting a thread

- **X to Bluesky.** Keep the thread and lint it with `--platform bluesky`; links count at full length.
- **X to LinkedIn.** Write one post, not a thread: the hook in the first line, three to five short paragraphs or a short list, the link at the end, and one image (the cover or the strongest feature card, in `portrait` when it stands alone). A carousel is a PDF of portrait cards.
- **X to Mastodon.** Keep the thread, ask about hashtags such as #EmDash and #Astro, and make sure every image has alt text.
- **X to Threads.** Keep the thread. The 500-character limit leaves room, but keep posts short.
