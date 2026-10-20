import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Finds Playwright's Chromium. Tries PLAYWRIGHT_MODULE, then packages
 * resolvable from the working directory, then the emdash main checkout.
 */
async function loadChromium() {
	const candidates = [];
	if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
	const requireFromCwd = createRequire(path.join(process.cwd(), "noop.js"));
	for (const name of ["playwright", "@playwright/test", "playwright-core"]) {
		try {
			candidates.push(requireFromCwd.resolve(name));
		} catch {
			// Not installed here.
		}
	}
	candidates.push(path.join(os.homedir(), "Developer/cloudflare/emdash-cms/emdash/node_modules/@playwright/test/index.mjs"));

	for (const candidate of candidates) {
		if (!existsSync(candidate)) continue;
		try {
			const mod = await import(pathToFileURL(candidate).href);
			const chromium = mod.chromium ?? mod.default?.chromium;
			if (chromium) return chromium;
		} catch {
			// Try the next candidate.
		}
	}
	throw new Error(
		"Playwright was not found. Run from a checkout that has it installed (such as the emdash repo), or set PLAYWRIGHT_MODULE to its entry file, for example .../node_modules/@playwright/test/index.mjs.",
	);
}

/**
 * Launches Chromium. The Claude Code sandbox crashes Chromium unless it runs
 * as a single process; set RENDER_MULTI_PROCESS=1 to turn that off.
 */
export async function launchBrowser() {
	const chromium = await loadChromium();
	const args = ["--allow-file-access-from-files"];
	if (!process.env.RENDER_MULTI_PROCESS) args.push("--single-process");
	return chromium.launch({ args });
}
