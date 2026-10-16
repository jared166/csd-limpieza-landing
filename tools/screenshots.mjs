// Capturas de EN y ES en 360×800, 768×1024 y 1440×900 (sección 12.1).
// Uso: node tools/screenshots.mjs   → guarda en tools/out/
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { startServer } from "./serve.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const OUT = new URL("./out/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4791;
const BASE = "/csd-landing-cleaning/";
const server = await startServer(PORT, BASE);
// En entornos con proxy de salida (HTTPS_PROXY) solo se enruta el tráfico externo (Google Fonts).
const args = process.env.HTTPS_PROXY ? [`--proxy-server=https=${process.env.HTTPS_PROXY.replace(/^https?:\/\//, "")}`] : [];
const browser = await chromium.launch({ args });

const sizes = [[360, 800], [768, 1024], [1440, 900]];
const pages = [["en", ""], ["es", "es/"], ["en-thanks", "thank-you/"], ["es-legal", "es/privacidad/"]];
const only = process.argv[2];

for (const [name, path] of pages) {
  if (only && !name.startsWith(only)) continue;
  for (const [w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}${BASE}${path}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${OUT}${name}-${w}-fold.png` });
    await page.screenshot({ path: `${OUT}${name}-${w}-full.png`, fullPage: true });
    if (w === 360 && !name.includes("-")) {
      await page.evaluate(() => window.scrollTo(0, document.querySelector("[data-hero]").offsetHeight + 400));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}${name}-${w}-stickybar.png` });
    }
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log("OK →", OUT);
