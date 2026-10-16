// Genera assets/img/og-image.jpg (EN) y og-image-es.jpg (ES), 1200×630.
// Fondo #0A0A0A, H1 por defecto en blanco y, si existe, el logo oficial.
// Volver a correrlo cuando llegue el logo: node tools/og-image.mjs
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const ROOT = fileURLToPath(new URL("..", import.meta.url));

const logoFile = ["logo-csd.svg", "logo-csd.png"].map((f) => ROOT + "assets/img/" + f).find(existsSync);
const logo = logoFile
  ? `<img class="logo" src="data:${logoFile.endsWith(".svg") ? "image/svg+xml" : "image/png"};base64,${readFileSync(logoFile).toString("base64")}" alt="">`
  : "";

const titles = {
  "og-image.jpg": "Commercial Cleaning in Miami, by Our Own Crew",
  "og-image-es.jpg": "Limpieza comercial en Miami, a cargo de nuestro propio equipo"
};

const args = process.env.HTTPS_PROXY ? [`--proxy-server=https=${process.env.HTTPS_PROXY.replace(/^https?:\/\//, "")}`] : [];
const browser = await chromium.launch({ args });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

for (const [file, title] of Object.entries(titles)) {
  await page.setContent(`<!doctype html><html><head>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@800&display=swap">
  <style>
    html,body{margin:0;width:1200px;height:630px;background:#0A0A0A;overflow:hidden;font-family:Inter,system-ui,sans-serif}
    .glow{position:absolute;border-radius:50%}
    .v{width:900px;height:900px;right:-300px;top:-380px;background:radial-gradient(closest-side,rgba(124,0,255,.2),rgba(124,0,255,0))}
    .m{width:500px;height:500px;left:-200px;bottom:-320px;background:radial-gradient(closest-side,rgba(223,32,176,.14),rgba(223,32,176,0))}
    .wrap{position:absolute;inset:0;padding:84px 88px;display:flex;flex-direction:column;justify-content:flex-end}
    .logo{position:absolute;left:88px;top:72px;width:200px;height:auto}
    h1{margin:0;color:#fff;font-weight:800;font-size:${title.length > 50 ? 64 : 76}px;line-height:1.05;letter-spacing:-.025em;max-width:960px}
    .line{width:120px;height:2px;background:#75FCE4;margin-bottom:36px;box-shadow:0 0 18px rgba(117,252,228,.6)}
  </style></head><body>
  <div class="glow v"></div><div class="glow m"></div>
  <div class="wrap">${logo}<div class="line"></div><h1>${title}</h1></div>
  </body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: ROOT + "assets/img/" + file, type: "jpeg", quality: 88 });
  console.log("OK", file, logo ? "(con logo)" : "(sin logo: falta assets/img/logo-csd.svg)");
}
await browser.close();
