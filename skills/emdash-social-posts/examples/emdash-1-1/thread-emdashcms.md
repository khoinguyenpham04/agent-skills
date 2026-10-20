# EmDash 1.1 thread for @emdashcms

The official account on X Premium. Nine posts, one card each, rendered from `cards.json`. Post 9 has no image, so X shows the blog's link preview.

---

## 1 · 01-release.png

EmDash 1.1 is here, with a publishing calendar, richer embeds, easier images, Microsoft sign-in and faster sites.

Here's what's new.

**Alt text:** EmDash 1.1 release card with the title "EmDash 1.1" and the line "Publishing calendar, richer embeds and faster sites", beside orange and grey halftone ripple art.

---

## 2 · 02-calendar.png

Meet the publishing calendar. See everything published or scheduled across your collections and locales, and reschedule without leaving the page.

**Alt text:** The EmDash calendar in month view, showing published entries, today's marker on September 30, scheduled launch posts on October 1, and a popover listing that day's six scheduled entries in site and local time.

---

## 3 · 03-html-blocks.png

HTML blocks now have CSS and JS tabs and a preview. New blocks run in an isolated iframe, so scripts can't touch your site's cookies or storage.

**Alt text:** An HTML block in the EmDash editor. The HTML tab shows the markup for a newsletter signup form, and the Preview tab shows the styled form with an email field and a Subscribe button.

---

## 4 · 04-iframe-blocks.png

Type /iframe and paste an embed code or a URL. YouTube and Vimeo links become players, and your site gets a sandboxed, lazy-loaded iframe.

**Alt text:** An iFrame block in the EmDash editor on its Preview tab, showing an embedded page for a Harbour Street store.

---

## 5 · 05-images.png

Drag or paste images straight into the editor, edit them from one toolbar, and write captions right underneath.

**Alt text:** A selected photo in the EmDash editor with a toolbar above it (Replace, Alt text, alignment, link, settings and delete) and a caption typed under it.

---

## 6 · 06-microsoft-sign-in.png

Editors can now sign in with their Microsoft work or school accounts through Microsoft Entra ID.

**Alt text:** An astro.config.mjs that imports microsoft from emdash/auth/providers/microsoft and passes it to emdash() in authProviders, plus the three EMDASH_OAUTH_MICROSOFT environment variables in .env.

---

## 7 · 07-webmcp-search.png

Add <WebMcpSearch /> to give AI agents in the browser a read-only search tool for your published content. It's experimental, like WebMCP itself.

**Alt text:** An Astro layout adding the WebMcpSearch component with collections and routeMap props, and an example search_site call that returns a title, URL, collection and excerpt.

---

## 8 · 08-faster-sites.png

Under the hood, bigger sites get faster and sturdier. Redirects and menus load in one query, and lists sorted by optional fields no longer skip entries between pages.

**Alt text:** A list of four EmDash 1.1 fixes covering redirects matched in one query, menus loaded in one query, an image endpoint that no longer waits for a full runtime start, and no skipped entries when paginating by fields that can be empty.

---

## 9 · no image

That's EmDash 1.1. To upgrade, run

pnpm up --latest emdash

On Cloudflare, update the Cloudflare package too. Full release notes on the blog.

https://emdashcms.com/blog/emdash-1-1

Thanks to everyone who contributed!
