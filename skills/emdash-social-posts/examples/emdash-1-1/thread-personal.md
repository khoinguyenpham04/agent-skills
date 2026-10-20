# EmDash 1.1 thread for a maintainer's personal account

A core maintainer who built the calendar, on a free X account that caps threads at six posts. Post 3 carries four cards, which X shows as a 2 × 2 grid. Post 6 has no image, so X shows the blog's link preview.

---

## 1 · 01-release.png

EmDash 1.1 is out! It's the first release since 1.0, with a publishing calendar, HTML blocks with CSS and JS, iFrame embeds, easier images and Microsoft sign-in.

Here's a quick tour.

**Alt text:** EmDash 1.1 release card with the title "EmDash 1.1" and the line "Publishing calendar, richer embeds and faster sites", beside orange and grey halftone ripple art.

---

## 2 · 02-calendar.png

The big one is the publishing calendar. It shows everything published or scheduled across your collections and locales, and you can reschedule right from it.

(I built this one, so I'm a bit biased.)

**Alt text:** The EmDash calendar in month view, showing published entries, today's marker on September 30, scheduled launch posts on October 1, and a popover listing that day's six scheduled entries in site and local time.

---

## 3 · 03-html-blocks.png, 04-iframe-blocks.png, 05-images.png, 06-microsoft-sign-in.png

A few more things in 1.1.

- HTML blocks with CSS and JS tabs, rendered in an isolated iframe
- An iFrame block that turns YouTube and Vimeo links into players
- Images you can drag or paste straight into the editor
- Sign-in with Microsoft Entra ID work or school accounts

**Alt text, 03-html-blocks.png:** An HTML block in the EmDash editor. The HTML tab shows the markup for a newsletter signup form, and the Preview tab shows the styled form with an email field and a Subscribe button.

**Alt text, 04-iframe-blocks.png:** An iFrame block in the EmDash editor on its Preview tab, showing an embedded page for a Harbour Street store.

**Alt text, 05-images.png:** A selected photo in the EmDash editor with a toolbar above it (Replace, Alt text, alignment, link, settings and delete) and a caption typed under it.

**Alt text, 06-microsoft-sign-in.png:** An astro.config.mjs that imports microsoft from emdash/auth/providers/microsoft and passes it to emdash() in authProviders, plus the three EMDASH_OAUTH_MICROSOFT environment variables in .env.

---

## 4 · 07-webmcp-search.png

And one experiment. <WebMcpSearch /> gives AI agents in the browser a read-only search tool for your published content. It's experimental, like WebMCP itself.

**Alt text:** An Astro layout adding the WebMcpSearch component with collections and routeMap props, and an example search_site call that returns a title, URL, collection and excerpt.

---

## 5 · 08-faster-sites.png

A lot of this release is quieter, but it adds up on bigger sites. Redirects and menus load in one query, and lists sorted by optional fields no longer skip entries between pages.

**Alt text:** A list of four EmDash 1.1 fixes covering redirects matched in one query, menus loaded in one query, an image endpoint that no longer waits for a full runtime start, and no skipped entries when paginating by fields that can be empty.

---

## 6 · no image

To upgrade, run

pnpm up --latest emdash

On Cloudflare, update the Cloudflare package too. Thanks to everyone who contributed!

https://emdashcms.com/blog/emdash-1-1
