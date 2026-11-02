#!/usr/bin/env node
/**
 * Serve a canvas folder for preview with caching off, so every reload shows
 * your latest edits (python's http.server lets the browser keep stale CSS/JS).
 *
 *   node serve.mjs <dir> [port]      port defaults to $PORT, then 4420
 *
 * Supports byte ranges, so a local video source can seek.
 */
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const port = Number(process.argv[3] ?? process.env.PORT ?? 4420);
const TYPES = {
	".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
	".json": "application/json", ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".vtt": "text/vtt",
	".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif",
	".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".pdf": "application/pdf", ".woff2": "font/woff2",
};

createServer((req, res) => {
	let file = normalize(join(root, decodeURIComponent(new URL(req.url, "http://localhost").pathname)));
	if (file !== root && !file.startsWith(root + sep)) return res.writeHead(403).end();
	try {
		if (statSync(file).isDirectory()) file = join(file, "index.html");
		const { size } = statSync(file);
		const headers = { "Content-Type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-store", "Accept-Ranges": "bytes" };
		const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
		if (range && size) {
			const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
			const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
			if (start > end || start >= size) return res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
			res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
			return createReadStream(file, { start, end }).pipe(res);
		}
		res.writeHead(200, { ...headers, "Content-Length": size });
		createReadStream(file).pipe(res);
	} catch {
		res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
	}
}).listen(port, "127.0.0.1", () => console.log(`Serving ${root} at http://127.0.0.1:${port}/`));
