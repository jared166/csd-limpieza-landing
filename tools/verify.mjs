// Verificación automática (sección 12 del brief). Solo desarrollo.
// Uso: node tools/verify.mjs   (requiere Playwright; ver README)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./serve.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = 4795;
const BASE = "/csd-landing-cleaning/";
const URL0 = `http://localhost:${PORT}${BASE}`;
const KNOWN_MISSING = [/logo-csd\.svg$/]; // [PENDIENTE] logo oficial

let pass = 0, fail = 0;
const ok = (cond, label, extra = "") => {
  if (cond) { pass++; console.log("  ✔", label); } else { fail++; console.log("  ✘", label, extra); }
};

const server = await startServer(PORT, BASE);
// Webhook que nunca responde (prueba 3f)
const hang = createServer(() => {}).listen(4796, "127.0.0.1");
const args = process.env.HTTPS_PROXY ? [`--proxy-server=https=${process.env.HTTPS_PROXY.replace(/^https?:\/\//, "")}`] : [];
const browser = await chromium.launch({ args });

const BASE_CONFIG = readFileSync(join(ROOT, "assets/js/config.js"), "utf8");
function configWith(overrides) {
  return BASE_CONFIG.replace(/noindex: true\s*(\/\/[^\n]*)?\n\};/, `noindex: true\n};\nObject.assign(CONFIG, ${JSON.stringify(overrides)});`);
}
const FULL = {
  legalName: "Test Legal LLC", phone: "(305) 555-0123", phoneE164: "+13055550123", email: "test@example.com",
  address: "123 Test St, Miami, FL", hours_en: "Mon–Fri", hours_es: "Lun–Vie", gtmId: "GTM-TEST123",
  crossSellUrl_en: "https://example.com/painting", crossSellUrl_es: "https://example.com/pintura",
  siteVisit: true, recurringFrequencies_en: "Weekly · Monthly", recurringFrequencies_es: "Semanal · Mensual",
  gallery: [{ src: "assets/img/og-image.jpg", width: 1200, height: 630, alt_en: "Test", alt_es: "Prueba", caption_en: "Cap", caption_es: "Leyenda" }]
};

async function newPage({ config, blockStorage = false, viewport = { width: 390, height: 844 } } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const log = { info: [], errors: [], events: [], requests: [], failed: [] };
  if (config) await ctx.route("**/assets/js/config.js", (r) => r.fulfill({ contentType: "text/javascript", body: configWith(config) }));
  await ctx.route("https://www.googletagmanager.com/**", (r) => { log.requests.push(r.request().url()); r.fulfill({ contentType: "text/javascript", body: "" }); });
  await page.exposeFunction("__dl", (e) => log.events.push(JSON.parse(e)));
  await page.exposeFunction("__pl", (e) => log.info.push(JSON.parse(e)));
  await page.addInitScript(() => {
    const info = console.info.bind(console);
    console.info = (...a) => { if (String(a[0]).includes("Webhook not configured")) window.__pl(JSON.stringify(a[1])); info(...a); };
    window.dataLayer = [];
    const push = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = (o) => { try { const c = { ...o }; delete c.eventCallback; window.__dl(JSON.stringify(c)); } catch (_) {} return push(o); };
  });
  if (blockStorage) {
    await page.addInitScript(() => {
      for (const k of ["localStorage", "sessionStorage"]) Object.defineProperty(window, k, { get() { throw new DOMException("blocked", "SecurityError"); } });
    });
  }
  page.on("console", (m) => {
    if (m.type() === "error" && !/404/.test(m.text())) log.errors.push(m.text());
  });
  page.on("pageerror", (e) => log.errors.push(e.message));
  page.on("response", (r) => { if (r.status() >= 400 && !KNOWN_MISSING.some((re) => re.test(r.url()))) log.failed.push(r.status() + " " + r.url()); });
  return { ctx, page, log };
}

// Clic en la etiqueta visible (como un usuario real), no en el input oculto.
const pick = (page, name, value) => page.click(`label:has(> input[name=${name}][value=${value}]) > span`);

async function fillForm(page, o = {}) {
  await page.fill("#f-full_name", "Jane Tester");
  await page.fill("#f-company", "Test Co");
  await page.fill("#f-phone", o.phone || "3055550123");
  await page.fill("#f-email", o.email || "jane@example.com");
  await page.selectOption("#f-property_type", o.property || "office");
  await pick(page, "cleaning_type", o.cleaning || "recurring");
  if (o.frequency) await pick(page, "frequency", o.frequency);
  for (const a of o.areas || ["floors", "windows"]) await pick(page, "areas", a);
  await page.fill("#f-location", "33130");
  await pick(page, "timeline", "asap");
}
const submit = (page) => page.click("#quote-form [type=submit]");

/* ── 2. Subruta: links y recursos ───────────────────────────────────────── */
console.log("\n2. Subruta " + BASE);
{
  const { ctx, page, log } = await newPage();
  const pages = ["", "es/", "thank-you/", "es/gracias/", "privacy/", "terms/", "es/privacidad/", "es/terminos/"];
  const hrefs = new Set();
  for (const p of pages) {
    await page.goto(URL0 + p, { waitUntil: "networkidle" });
    (await page.$$eval("a[href], link[href]", (as) => as.map((a) => a.href))).forEach((h) => hrefs.add(h.split("#")[0]));
  }
  const internal = [...hrefs].filter((h) => h.startsWith(`http://localhost:${PORT}`));
  const broken = [];
  for (const h of internal) {
    const r = await page.request.get(h);
    if (r.status() >= 400 && !KNOWN_MISSING.some((re) => re.test(h))) broken.push(r.status() + " " + h);
    if (!h.startsWith(URL0)) broken.push("fuera de la subruta: " + h);
  }
  ok(!broken.length, `${internal.length} links internos sin errores`, broken.join("\n"));
  ok(!log.failed.length, "recursos cargados sin 4xx/5xx (salvo logo pendiente)", log.failed.join("\n"));
  await ctx.close();
}

/* ── 3. Formulario ──────────────────────────────────────────────────────── */
const TEST_QS = "?gclid=TEST123&utm_source=google&utm_campaign=cleaning&h=janitorial";
console.log("\n3a. Comercial recurrente");
{
  const { ctx, page, log } = await newPage({ config: { gtmId: "" } });
  await page.goto(URL0 + TEST_QS);
  ok(!(await page.isVisible("input[name=frequency][value=weekly] + span")), "frecuencia oculta al inicio");
  await pick(page, "cleaning_type", "recurring");
  await page.waitForTimeout(450);
  ok(await page.isVisible("input[name=frequency][value=weekly] + span"), "frecuencia visible con Recurring");
  await fillForm(page, { frequency: "weekly" });
  await page.waitForTimeout(3100);
  await Promise.all([page.waitForURL(/thank-you\/\?gclid=TEST123/), submit(page)]);
  const p = log.info[0] || {};
  ok(p.cleaning_type === "recurring" && p.frequency === "weekly", "cleaning_type recurring + frequency weekly");
  ok(JSON.stringify(p.areas) === '["floors","windows"]', 'areas ["floors","windows"]');
  ok(p.phone_e164 === "+13055550123" && p.phone === "(305) 555-0123", "phone (305) 555-0123 + phone_e164");
  ok(p.lead_type === "commercial" && p.headline_variant === "janitorial", "lead_type commercial + headline_variant janitorial");
  ok(p.gclid === "TEST123" && p.utm_source === "google" && p.utm_campaign === "cleaning", "gclid y UTM en el payload");
  ok(p.service_line === "cleaning" && p.language === "en" && p.submitted_at && p.page_url && p.user_agent && p.landing_page !== undefined, "service_line, language, page_url, submitted_at, user_agent, landing_page");
  const gl = log.events.find((e) => e.event === "generate_lead");
  ok(gl && gl.user_data && gl.user_data.phone_number === "+13055550123" && gl.user_data.email && gl.cleaning_type === "recurring", "generate_lead con user_data y cleaning_type");
  ok(log.events.some((e) => e.event === "form_start"), "form_start registrado");
  ok(page.url().includes("thank-you/?gclid=TEST123&utm_source=google&utm_campaign=cleaning&h=janitorial"), "redirige a thank-you/ conservando el query string");
  ok(!log.errors.length, "sin errores en consola", log.errors.join("\n"));
  await ctx.close();
}

console.log("\n3b. Comercial puntual");
{
  const { ctx, page, log } = await newPage();
  await page.goto(URL0 + TEST_QS);
  await pick(page, "cleaning_type", "recurring");
  await pick(page, "frequency", "weekly");
  await fillForm(page, { cleaning: "one_time" });
  await page.waitForTimeout(450);
  ok(!(await page.isVisible("input[name=frequency][value=weekly] + span")), "frecuencia oculta con One-time");
  await page.waitForTimeout(2700);
  await Promise.all([page.waitForURL(/thank-you/), submit(page)]);
  ok(log.info[0] && log.info[0].frequency === "" && log.info[0].cleaning_type === "one_time", "frequency vacío y cleaning_type one_time");
  await ctx.close();
}

console.log("\n3c. Residencial");
{
  const { ctx, page, log } = await newPage();
  await page.goto(URL0 + TEST_QS);
  await fillForm(page, { property: "residential", cleaning: "one_time" });
  await page.waitForTimeout(3100);
  await Promise.all([page.waitForURL(/thank-you/), submit(page)]);
  ok(log.info[0] && log.info[0].lead_type === "residential", "lead_type residential");
  ok(log.events.some((e) => e.event === "lead_residential" && !e.user_data), "lead_residential sin user_data");
  ok(!log.events.some((e) => e.event === "generate_lead"), "no se dispara generate_lead");
  await ctx.close();
}

console.log("\n3d. Validación");
for (const lang of ["", "es/"]) {
  const { ctx, page, log } = await newPage();
  await page.goto(URL0 + lang);
  await fillForm(page, { phone: "305555012", email: "jane@", areas: [] });
  await page.waitForTimeout(3100);
  await submit(page);
  await page.waitForTimeout(300);
  const vis = async (n) => page.isVisible(`#err-${n}`);
  ok(await vis("phone") && await vis("email") && await vis("areas"), `${lang || "en/"} errores de teléfono, email y áreas visibles`);
  ok(!(await vis("full_name")) && !(await vis("location")), `${lang || "en/"} sin errores en campos correctos`);
  ok(await page.evaluate(() => document.activeElement.id) === "f-phone", `${lang || "en/"} foco en el primer error (teléfono)`);
  const txt = await page.textContent("#err-phone");
  ok(lang ? /teléfono/i.test(txt) : /phone/i.test(txt), `${lang || "en/"} mensaje en el idioma de la página: "${txt}"`);
  ok(await page.getAttribute("#f-phone", "aria-invalid") === "true", `${lang || "en/"} aria-invalid en el campo con error`);
  ok(!log.info.length, `${lang || "en/"} no se envía nada`);
  await ctx.close();
}

console.log("\n3e. Antispam");
{
  const { ctx, page, log } = await newPage();
  await page.goto(URL0);
  await fillForm(page);
  await page.evaluate(() => { document.querySelector("#f-website").value = "http://spam"; });
  await page.waitForTimeout(3100);
  await submit(page);
  await page.waitForTimeout(800);
  ok(!log.info.length && page.url() === URL0, "campo trampa lleno: no se envía ni redirige");
  // Envío en menos de 3 s
  const r2 = await newPage();
  await r2.page.goto(URL0);
  await fillForm(r2.page);
  await submit(r2.page);
  await r2.page.waitForTimeout(500);
  ok(!r2.log.info.length, "envío en < 3 s descartado");
  await r2.ctx.close();
  await ctx.close();
}

console.log("\n3f. Falla del webhook (10 s)");
{
  const { ctx, page } = await newPage({ config: { webhookUrl: "http://127.0.0.1:4796/hang", phone: "(305) 555-0123", phoneE164: "+13055550123", email: "info@example.com" } });
  await page.goto(URL0);
  await fillForm(page);
  await page.waitForTimeout(3100);
  const t0 = Date.now();
  await submit(page);
  ok(await page.textContent("#quote-form [type=submit]") === "Sending…", 'botón muestra "Sending…" y queda deshabilitado');
  await page.waitForSelector("[data-fail]:not([hidden])", { timeout: 15000 });
  const secs = (Date.now() - t0) / 1000;
  const msg = await page.textContent("[data-fail]");
  ok(secs >= 9.5 && secs < 12, `mensaje de falla a los ${secs.toFixed(1)} s`);
  ok(msg.trim() === "We couldn't send your request. Please call us at (305) 555-0123 or email info@example.com.", `texto: "${msg.trim()}"`);
  ok(await page.$eval("[data-fail] a[href^='tel:']", (a) => a.closest("[data-call-location]") ? a.dataset.callLocation : "") === "form_error", "tel: con location form_error");
  await ctx.close();
}

/* ── 4. Atribución ──────────────────────────────────────────────────────── */
console.log("\n4. Atribución entre idiomas");
{
  const { ctx, page, log } = await newPage();
  await page.goto(URL0 + "?gclid=TEST123");
  await Promise.all([page.waitForURL(/\/es\/\?gclid=TEST123/), page.click("header [data-lang-switch]")]);
  ok(true, "el botón de idioma conserva el query string");
  ok(log.events.some((e) => e.event === "language_switch" && e.from === "en" && e.to === "es"), "language_switch {from: en, to: es}");
  await page.goto(URL0 + "es/");
  await fillForm(page);
  await page.waitForTimeout(3100);
  await Promise.all([page.waitForURL(/gracias\//), submit(page)]);
  ok(log.info[0] && log.info[0].gclid === "TEST123" && log.info[0].language === "es", "gclid persiste en /es/ sin parámetros");
  await ctx.close();
}
{
  const { ctx, page, log } = await newPage({ blockStorage: true });
  await page.goto(URL0 + "?gclid=TEST123");
  await page.click("header [data-lang-switch]");
  await page.waitForURL(/\/es\//);
  await fillForm(page);
  await page.waitForTimeout(3100);
  await Promise.all([page.waitForURL(/gracias\//), submit(page)]);
  ok(!log.errors.length, "storage bloqueado: sin errores en consola", log.errors.join("\n"));
  ok(log.info[0] && log.info[0].gclid === "TEST123", "storage bloqueado: gclid presente (vía URL)");
  await ctx.close();
}

/* ── 5. Titulares ───────────────────────────────────────────────────────── */
console.log("\n5. Titulares por grupo de anuncios");
{
  const { ctx, page } = await newPage();
  const expect = {
    "": { _: "Commercial Cleaning in Miami, by Our Own Crew", office: "Office Cleaning in Miami, by Our Own Crew", janitorial: "Janitorial Services in Miami, by Our Own Crew", window: "Commercial Window Cleaning in Miami, by Our Own Crew", floor: "Commercial Floor Cleaning in Miami, by Our Own Crew" },
    "es/": { _: "Limpieza comercial en Miami, a cargo de nuestro propio equipo", office: "Limpieza de oficinas en Miami, a cargo de nuestro propio equipo", janitorial: "Limpieza recurrente para negocios en Miami, a cargo de nuestro propio equipo", window: "Limpieza de vidrios para negocios en Miami, a cargo de nuestro propio equipo", floor: "Limpieza de pisos para negocios en Miami, a cargo de nuestro propio equipo" }
  };
  for (const [lang, map] of Object.entries(expect)) {
    for (const k of ["office", "janitorial", "window", "floor"]) {
      await page.goto(URL0 + lang + "?h=" + k);
      ok((await page.textContent("h1")).replace(/\u00a0/g, " ") === map[k], `${lang || "en/"} ?h=${k}`);
    }
    for (const bad of ["<script>alert(1)</script>", "unknown", "constructor", "__proto__"]) {
      await page.goto(URL0 + lang + "?h=" + encodeURIComponent(bad));
      ok((await page.textContent("h1")).replace(/\u00a0/g, " ") === map._, `${lang || "en/"} ?h=${bad} → H1 por defecto`);
    }
    ok(await page.$$eval("h1", (h) => h.length) === 1, `${lang || "en/"} un solo h1`);
  }
  await ctx.close();
}

/* ── 6. Configuración vacía / completa ─────────────────────────────────── */
console.log("\n6. Configuración vacía");
const ALL = ["", "es/", "thank-you/", "es/gracias/", "privacy/", "terms/", "es/privacidad/", "es/terminos/"];
{
  const { ctx, page, log } = await newPage();
  for (const p of ALL) {
    await page.goto(URL0 + p, { waitUntil: "networkidle" });
    const html = await page.evaluate(() => document.documentElement.outerHTML.replace(/<!--[\s\S]*?-->/g, ""));
    const text = await page.evaluate(() => document.body.innerText);
    ok(!/href="tel:/.test(html), `${p || "/"} sin ningún tel:`);
    ok(!/\[PENDIENTE\]|undefined|\bnull\b/.test(text), `${p || "/"} sin "[PENDIENTE]", "undefined" ni "null" visibles`);
    ok(!/\[PENDIENTE\]/.test(html), `${p || "/"} sin "[PENDIENTE]" en el HTML renderizado (fuera de comentarios)`);
    ok(!/href=""|href="#"(?!quote)/.test(html), `${p || "/"} sin links vacíos`);
  }
  await page.goto(URL0, { waitUntil: "networkidle" });
  ok(!(await page.$("[data-gallery]")), "sin galería no aparece la sección");
  ok(!(await page.isVisible(".mode__freq")), "sin frecuencias no aparece la línea");
  ok(await page.$$eval(".steps > li", (l) => l.length) === 4, "siteVisit false → 4 pasos");
  ok(!(await page.$("a[data-crosssell]")), "sin crossSellUrl no hay link de pintura");
  ok(!log.requests.length && !(await page.$("script[src*='googletagmanager']")), "sin GTM no se carga ningún script de Google");
  ok(await page.$("meta[name=robots][content='noindex, follow']") !== null, "meta robots noindex, follow");
  ok(!(await page.$$eval("script[type='application/ld+json']", (s) => s.some((x) => x.textContent.includes("LocalBusiness")))), "sin datos → sin JSON-LD LocalBusiness");
  await ctx.close();
}
console.log("\n6b. Configuración completa");
{
  const { ctx, page, log } = await newPage({ config: FULL });
  await page.goto(URL0, { waitUntil: "networkidle" });
  ok(await page.$$eval("a[href='tel:+13055550123']", (a) => a.length) >= 3, "tel: en header, sticky bar y pie");
  ok(await page.isVisible("[data-gallery]"), "galería visible con fotos");
  ok((await page.textContent(".mode__freq")) === "Weekly · Monthly", "línea de frecuencias visible");
  ok(await page.$$eval(".steps > li", (l) => l.length) === 5, "siteVisit true → 5 pasos");
  ok(log.requests.some((u) => u.includes("GTM-TEST123")), "GTM cargado con el ID");
  ok(await page.$eval("a[data-crosssell]", (a) => a.href) === "https://example.com/painting", "link de pintura EN");
  ok(await page.$$eval("script[type='application/ld+json']", (s) => s.some((x) => x.textContent.includes("LocalBusiness"))), "JSON-LD LocalBusiness con datos");
  await page.click(".gallery__btn");
  ok(await page.isVisible("dialog.lightbox"), "lightbox abre");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.activeElement.classList.contains("gallery__btn")), "Escape cierra y el foco vuelve a la foto");
  await page.evaluate(() => document.querySelector("a[data-call-location='footer']").click());
  ok(log.events.some((e) => e.event === "click_to_call" && e.location === "footer" && e.language === "en"), "click_to_call {location: footer}");
  await page.goto(URL0 + "es/gracias/", { waitUntil: "networkidle" });
  ok(await page.isVisible("a[data-call-location='thank_you']"), "gracias: botón Llámenos ahora con teléfono");
  ok(await page.$eval("a[data-crosssell]", (a) => a.href) === "https://example.com/pintura", "gracias: bloque cruzado ES con link");
  ok(!log.errors.length, "sin errores en consola", log.errors.join("\n"));
  await ctx.close();
}

/* ── 7. Copy y reglas ───────────────────────────────────────────────────── */
console.log("\n7. Palabras prohibidas en el código del sitio");
{
  const files = [];
  const walk = (d) => readdirSync(d).forEach((f) => {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (!["tools", ".git", "node_modules"].includes(f)) walk(p); }
    else if ([".html", ".js", ".css"].includes(extname(p))) files.push(p);
  });
  walk(ROOT);
  const banned = ["free", "gratis", "cheap", "affordable", "barato", "guarantee", "garantía", "licensed", "insured", "on time", "best", "#1", "eco-friendly", "green", "hospital-grade", "bodega", "presupuesto", "tú", "vos"];
  // Excepción documentada: config.js define los nombres de campo del bloque opcional `guarantee`
  // (guaranteeText_en/_es) que pide el brief; no es texto visible.
  const allowed = (f, w, line) => w === "guarantee" && /guarantee(Text_|:\s*false|\b.*=== true)|blocks\.guarantee/.test(line);
  const hits = [];
  for (const f of files) {
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const w of banned) {
        const re = new RegExp(`(^|[^\\p{L}\\p{N}])${w}($|[^\\p{L}\\p{N}])`, "iu");
        if (re.test(line) && !allowed(f, w, line)) hits.push(`${f.replace(ROOT, "")}:${i + 1} «${w}»`);
      }
    });
  }
  ok(!hits.length, `${files.length} archivos sin palabras prohibidas`, "\n" + hits.join("\n"));
}

/* ── 8. Contraste ───────────────────────────────────────────────────────── */
console.log("\n8. Contraste");
{
  const { ctx, page } = await newPage({ config: FULL, viewport: { width: 360, height: 800 } });
  for (const p of ALL) {
    for (const w of [360, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(URL0 + p, { waitUntil: "networkidle" });
      const bad = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll("body *").forEach((el) => {
          const cs = getComputedStyle(el);
          if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
          if (cs.color === "rgb(124, 0, 255)") out.push("violeta: " + el.textContent.trim().slice(0, 30));
          let bg = el, bgc;
          while (bg && (bgc = getComputedStyle(bg).backgroundColor) === "rgba(0, 0, 0, 0)") bg = bg.parentElement;
          if (bgc === "rgb(223, 32, 176)" && cs.color === "rgb(255, 255, 255)" && (parseFloat(cs.fontSize) < 19 || Number(cs.fontWeight) < 700))
            out.push(`blanco/magenta ${cs.fontSize} ${cs.fontWeight}: ${el.textContent.trim().slice(0, 30)}`);
        });
        return out;
      });
      ok(!bad.length, `${p || "/"} @${w}: sin blanco/magenta < 19 px bold ni texto violeta`, bad.join("; "));
    }
  }
  await ctx.close();
}

/* ── Accesibilidad básica y tamaños ─────────────────────────────────────── */
console.log("\nExtras: texto ≥ 14 px, áreas táctiles ≥ 44 px, sin scroll horizontal (320–1440)");
{
  const { ctx, page } = await newPage({ config: FULL });
  for (const p of ["", "es/"]) {
    for (const w of [320, 360, 768, 1024, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(URL0 + p, { waitUntil: "networkidle" });
      const r = await page.evaluate(() => {
        const small = [], tiny = [];
        document.querySelectorAll("body *").forEach((el) => {
          const cs = getComputedStyle(el);
          const visible = el.offsetParent !== null && cs.visibility !== "hidden" && !el.closest(".sr-only,.hp,.skip-link,.sticky-bar:not(.is-visible)");
          if (!visible) return;
          if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(cs.fontSize) < 14) small.push(el.tagName + " " + cs.fontSize);
          if (el.matches("a, button, summary, .option span, select, input:not([type=radio]):not([type=checkbox]):not([type=range])")) {
            const b = el.getBoundingClientRect();
            if (b.height && (b.height < 44 || b.width < 44) && !el.closest("p, .faq__a, .consent, .modes__note")) tiny.push(el.tagName + "." + el.className + " " + Math.round(b.width) + "×" + Math.round(b.height));
          }
        });
        return { small, tiny, sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth };
      });
      ok(r.sw <= r.vw, `${p || "/"} @${w}: sin scroll horizontal`);
      ok(!r.small.length, `${p || "/"} @${w}: ningún texto < 14 px`, r.small.slice(0, 5).join(", "));
      ok(!r.tiny.length, `${p || "/"} @${w}: controles ≥ 44×44`, r.tiny.slice(0, 5).join(", "));
    }
  }
  await ctx.close();
}

/* ── Peso ───────────────────────────────────────────────────────────────── */
console.log("\nPeso (HTML + CSS + JS, sin fuentes ni imágenes)");
{
  const js = ["config", "main", "form", "tracking", "attribution"].reduce((s, f) => s + statSync(join(ROOT, `assets/js/${f}.js`)).size, 0);
  const css = statSync(join(ROOT, "assets/css/styles.css")).size;
  for (const p of ["index.html", "es/index.html"]) {
    const total = statSync(join(ROOT, p)).size + css + js;
    ok(total < 120 * 1024, `${p}: ${(total / 1024).toFixed(1)} KB (< 120 KB)`);
  }
}

await browser.close();
server.close();
hang.close();
console.log(`\nResultado: ${pass} OK, ${fail} con fallas`);
process.exit(fail ? 1 : 0);
