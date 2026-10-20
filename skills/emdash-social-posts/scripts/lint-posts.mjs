#!/usr/bin/env node
/**
 * Checks a thread file before posting.
 *
 *   node lint-posts.mjs <thread.md> [--platform <name>] [--allow @handle[,@handle...]]
 *                       [--images <dir>] [--allow-colons] [--allow-hashtags] [--allow-emoji]
 *
 * Images are looked up next to the thread file unless --images points elsewhere.
 *
 * Platforms: x (default), x-premium, bluesky, linkedin, threads, mastodon.
 * Exits with 1 when a post breaks a hard rule: over the length limit, an emoji,
 * a colon in a sentence, an unconfirmed @-mention, or a missing image or alt
 * text. Warnings are prompts for judgment. Counts follow each platform's rules
 * closely but not exactly, so leave a little room near a limit.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const URL_PATTERN = /https?:\/\/[^\s<>()]+/g;
/** Bare domains that X turns into links (and counts as 23 characters). */
const BARE_DOMAIN =
	/\b(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|app|ai|co|sh|me|so|xyz|tech|page|site|cloud|edu|gov)\b(?:\/[^\s]*)?/gi;
const EMOJI = /\p{Extended_Pictographic}/u;
const NOT_EMOJI = /^[©®™]$/;
const ARROWS = /[←-⇿➔-➿⬅-⬇]/u;
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

const graphemes = (text) => [...segmenter.segment(text)].map((s) => s.segment);

/** twitter-text v3 weighting: most Latin text counts 1, CJK and emoji count 2. */
function xWeight(text) {
	let total = 0;
	for (const segment of graphemes(text)) {
		if (EMOJI.test(segment) && !NOT_EMOJI.test(segment)) {
			total += 2;
			continue;
		}
		for (const ch of segment) {
			const cp = ch.codePointAt(0);
			if (cp === 0xfe0f || cp === 0x200d) continue;
			const light =
				cp <= 0x10ff ||
				(cp >= 0x2000 && cp <= 0x200d) ||
				(cp >= 0x2010 && cp <= 0x201f) ||
				(cp >= 0x2032 && cp <= 0x2037);
			total += light ? 1 : 2;
		}
	}
	return total;
}

function countX(text) {
	let links = 0;
	const rest = text
		.replace(URL_PATTERN, () => {
			links++;
			return "";
		})
		.replace(BARE_DOMAIN, () => {
			links++;
			return "";
		});
	return xWeight(rest) + links * 23;
}

const countGraphemes = (text) => graphemes(text).length;

function countMastodon(text) {
	let links = 0;
	const rest = text.replace(URL_PATTERN, () => {
		links++;
		return "";
	});
	return countGraphemes(rest) + links * 23;
}

const PLATFORMS = {
	x: { name: "X", limit: 280, count: countX, images: 4, strictImages: true, altLimit: 1000, linkLast: true },
	"x-premium": {
		name: "X Premium",
		limit: 25000,
		fold: 280,
		count: countX,
		images: 4,
		strictImages: true,
		altLimit: 1000,
		linkLast: true,
	},
	bluesky: { name: "Bluesky", limit: 300, count: countGraphemes, images: 4, strictImages: true },
	linkedin: { name: "LinkedIn", limit: 3000, fold: 210, count: countGraphemes, images: 20 },
	threads: { name: "Threads", limit: 500, count: countGraphemes, images: 10 },
	mastodon: { name: "Mastodon", limit: 500, count: countMastodon, images: 4, strictImages: true },
};

function parseArgs(argv) {
	const args = { platform: "x", allow: new Set() };
	const rest = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--platform") args.platform = argv[++i];
		else if (arg === "--allow")
			for (const handle of argv[++i].split(",")) args.allow.add(handle.trim().replace(/^@?/, "@").toLowerCase());
		else if (arg === "--images") args.images = argv[++i];
		else if (arg === "--allow-colons") args.allowColons = true;
		else if (arg === "--allow-hashtags") args.allowHashtags = true;
		else if (arg === "--allow-emoji") args.allowEmoji = true;
		else if (arg === "--help" || arg === "-h") args.help = true;
		else rest.push(arg);
	}
	args.file = rest[0];
	return args;
}

/**
 * Splits a thread file into posts. Each post starts with a heading such as
 * "## 3 · 03-card.png, 04-card.png" or "## 9 · no image"; its text runs until
 * the first "**Alt text" line, the next "---", or the next heading.
 */
function parseThread(markdown) {
	return markdown
		.split(/\n## /)
		.slice(1)
		.map((section) => {
			const [heading, ...lines] = section.split("\n");
			const match = heading.match(/^(\S+)\s*[·|]\s*(.*)$/);
			const id = (match ? match[1] : heading).trim();
			const imagePart = match ? match[2] : "";
			const images = imagePart
				.split(",")
				.map((part) => part.trim())
				.filter((part) => /\.(png|jpe?g|gif|webp)$/i.test(part));
			const body = [];
			const alts = {};
			let inAlts = false;
			for (const line of lines) {
				if (/^---\s*$/.test(line)) break;
				const alt = line.match(/^\*\*Alt text(?:,\s*([^*]+?))?:\*\*\s*(.*)$/);
				if (alt) {
					inAlts = true;
					alts[alt[1]?.trim() ?? "*"] = alt[2].trim();
					continue;
				}
				if (!inAlts) body.push(line);
			}
			return { id, images, alts, text: body.join("\n").trim() };
		});
}

function snippet(text, index) {
	const start = Math.max(0, index - 30);
	return `${start > 0 ? "…" : ""}${text.slice(start, index + 30).replace(/\s+/g, " ")}${index + 30 < text.length ? "…" : ""}`;
}

function checkPost(post, index, count, platform, args, dir) {
	const issues = [];
	const error = (message) => issues.push({ error: true, message });
	const warn = (message) => issues.push({ message });
	const { text } = post;
	if (!text) error("the post is empty");

	const length = platform.count(text);
	if (length > platform.limit) error(`${length - platform.limit} characters over the ${platform.name} limit`);
	if (platform.fold === 280 && length > 280) {
		warn("the feed cuts this off behind Show more after about 280 characters");
	}
	if (platform.fold === 210) {
		const hook = text.split(/\n\s*\n/)[0];
		if (countGraphemes(hook) > 210) warn("the first paragraph runs past the ~210 characters LinkedIn shows before \"see more\"");
	}

	const withoutUrls = text.replace(URL_PATTERN, " ");
	if (!args.allowEmoji) {
		const emoji = graphemes(withoutUrls).filter((g) => EMOJI.test(g) && !NOT_EMOJI.test(g));
		if (emoji.length) error(`emoji ${emoji.join(" ")}; drop them`);
	}
	const arrow = withoutUrls.match(ARROWS);
	if (arrow) warn(`emoji-like arrow "${arrow[0]}"; prefer words`);

	if (!args.allowColons) {
		const prose = withoutUrls.replace(/`[^`]*`/g, " ").replace(/\d:\d/g, "");
		const at = prose.indexOf(":");
		if (at !== -1) error(`colon in "${snippet(prose, at)}"; end the sentence instead`);
	}

	for (const match of withoutUrls.matchAll(/(^|[^\w@])@([A-Za-z0-9_]{1,15})(?![A-Za-z0-9_])/g)) {
		const handle = `@${match[2]}`;
		if (args.allow.has(handle.toLowerCase())) continue;
		const after = withoutUrls[match.index + match[0].length];
		error(
			after === "-" || after === "/"
				? `"${handle}${withoutUrls.slice(match.index + match[0].length).split(/\s/)[0]}" will mention ${handle}; describe the package instead`
				: `${handle} is a mention; confirm the handle and pass --allow ${handle}`,
		);
	}

	if (!args.allowHashtags && /(^|\s)#[A-Za-z]\w*/.test(withoutUrls)) warn("hashtag; use only if the user asked for hashtags");
	if (text.includes("—")) warn("em dash; prefer a comma or a full stop");
	if (/(^|\s)--\w/.test(text)) warn("command with \"--\"; iOS turns a typed -- into an em dash, so paste it");
	if (platform.linkLast && index === 0 && count > 1 && (URL_PATTERN.test(text) || BARE_DOMAIN.test(text))) {
		warn("link in the first post; X shows less of posts with links, so move it to the last post");
	}
	URL_PATTERN.lastIndex = 0;
	BARE_DOMAIN.lastIndex = 0;

	for (const image of post.images) {
		if (!existsSync(path.resolve(dir, image))) error(`image not found: ${image}`);
	}
	if (post.images.length > platform.images) {
		(platform.strictImages ? error : warn)(`${post.images.length} images; ${platform.name} allows ${platform.images} per post`);
	}
	for (const image of post.images) {
		const alt = post.alts[image] ?? (post.images.length === 1 ? post.alts["*"] : undefined);
		if (!alt) error(`no alt text for ${image}`);
		else if (platform.altLimit && alt.length > platform.altLimit) {
			error(`alt text for ${image} is longer than ${platform.altLimit} characters`);
		}
	}
	return { length, issues };
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const platform = PLATFORMS[args.platform];
	if (args.help || !args.file || !platform) {
		if (args.platform && !platform) console.error(`Unknown platform "${args.platform}" (use ${Object.keys(PLATFORMS).join(", ")})`);
		console.log(
			"Usage: node lint-posts.mjs <thread.md> [--platform x|x-premium|bluesky|linkedin|threads|mastodon] [--allow @handle,...] [--images <dir>] [--allow-colons] [--allow-hashtags] [--allow-emoji]",
		);
		process.exit(args.help ? 0 : 1);
	}
	const file = path.resolve(args.file);
	const posts = parseThread(readFileSync(file, "utf8"));
	if (!posts.length) {
		console.error(`No posts found. Each post needs a heading like "## 1 · 01-card.png" (see references/voice.md).`);
		process.exit(1);
	}

	console.log(`${path.basename(file)} · ${platform.name} (limit ${platform.limit})`);
	let errors = 0;
	posts.forEach((post, index) => {
		const imageDir = args.images ? path.resolve(args.images) : path.dirname(file);
		const { length, issues } = checkPost(post, index, posts.length, platform, args, imageDir);
		const failed = issues.some((issue) => issue.error);
		errors += issues.filter((issue) => issue.error).length;
		console.log(`  ${post.id.padStart(2)}  ${String(length).padStart(4)}/${platform.limit}  ${failed ? "FAIL" : "ok"}`);
		for (const issue of issues) console.log(`      ${issue.error ? "error" : "warning"}: ${issue.message}`);
	});
	console.log(errors ? `${errors} error${errors === 1 ? "" : "s"}` : "No errors.");
	process.exit(errors ? 1 : 0);
}

main();
