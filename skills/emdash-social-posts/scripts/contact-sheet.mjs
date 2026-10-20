#!/usr/bin/env node
/**
 * Tiles the PNG cards in a folder into one image for review.
 *
 *   node contact-sheet.mjs <dir> [--out <file>] [--columns 2] [--width 800]
 *
 * Writes <dir>/contact-sheet.png by default and skips earlier sheets.
 */
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./lib/browser.mjs";

const argv = process.argv.slice(2);
const option = (name, fallback) => {
	const index = argv.indexOf(name);
	return index === -1 ? fallback : argv[index + 1];
};
const dir = argv.find((arg, i) => !arg.startsWith("--") && !["--out", "--columns", "--width"].includes(argv[i - 1]));
if (!dir) {
	console.log("Usage: node contact-sheet.mjs <dir> [--out <file>] [--columns 2] [--width 800]");
	process.exit(1);
}
const folder = path.resolve(dir);
const out = path.resolve(option("--out", path.join(folder, "contact-sheet.png")));
const columns = Number(option("--columns", 2));
const width = Number(option("--width", 800));

const files = readdirSync(folder)
	.filter((file) => file.endsWith(".png") && !file.startsWith("contact-sheet"))
	.sort();
if (!files.length) {
	console.error(`No PNG files in ${folder}`);
	process.exit(1);
}

const gap = 8;
const html = `<!doctype html><body style="margin:0;padding:${gap}px;background:#333;display:grid;grid-template-columns:repeat(${columns},${width}px);gap:${gap}px;width:fit-content">${files
	.map((file) => `<img src="${pathToFileURL(path.join(folder, file)).href}" style="width:${width}px;display:block" alt="">`)
	.join("")}</body>`;
const page_ = path.join(mkdtempSync(path.join(os.tmpdir(), "emdash-sheet-")), "sheet.html");
writeFileSync(page_, html);

const browser = await launchBrowser();
try {
	const page = await browser.newPage({ viewport: { width: columns * width + (columns + 1) * gap, height: 400 } });
	await page.goto(pathToFileURL(page_).href);
	await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
	await page.screenshot({ path: out, fullPage: true });
} finally {
	await browser.close();
}
const relative = path.relative(process.cwd(), out);
console.log(`${relative && !relative.startsWith("..") ? relative : out} (${files.length} cards)`);
