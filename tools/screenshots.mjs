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
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: process.env.MOTION === "1" ? "no-preference" : "reduce" });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}${BASE}${path}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    if (process.env.MOTION === "1") await page.waitForTimeout(3200); // deja terminar la animación del hero
    await page.screenshot({ path: `${OUT}${name}-${w}-fold.png` });
    // Recorre la página para disparar las apariciones on-scroll antes de la captura completa.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo({ top: y, behavior: "instant" }); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}${name}-${w}-full.png`, fullPage: true });
    if (w === 360 && !name.includes("-")) {
      await page.evaluate(() => window.scrollTo({ top: document.querySelector("[data-hero]").offsetHeight + 400, behavior: "instant" }));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}${name}-${w}-stickybar.png` });
    }
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log("OK →", OUT);
