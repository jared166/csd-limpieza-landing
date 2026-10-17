// Comportamiento general: idioma, contenido condicional desde config.js,
// barra móvil, galería y capa visual (efectos sutiles).
// Cada bloque corre dentro de safe(): si uno falla, el resto sigue funcionando.
// El contenido crítico está escrito en el HTML; el JS solo lo completa.

import { CONFIG } from "./config.js";
import { loadGtm, track, lang } from "./tracking.js";
import { captureAttribution } from "./attribution.js";

const LANG = lang();
const ROOT = document.body.dataset.root || "";
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const has = (v) => typeof v === "string" ? v.trim() !== "" : v != null;
const pick = (obj, base) => obj[`${base}_${LANG}`];
const $$ = (sel, root = document) => root.querySelectorAll(sel);

function safe(fn, name) {
  try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
}

// Rutas de config (relativas a la raíz del sitio) → rutas válidas desde esta página.
function asset(path) {
  if (!has(path)) return "";
  return /^(https?:)?\/\//.test(path) || path.startsWith("data:") ? path : ROOT + path.replace(/^\.?\//, "");
}

function safeUrl(url) {
  if (!has(url)) return "";
  try {
    const u = new URL(url, window.location.href);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch (_) { return ""; }
}

const phoneOk = has(CONFIG.phone) && /^\+1\d{10}$/.test(String(CONFIG.phoneE164 || "").trim());
const phone2Ok = has(CONFIG.phone2) && /^\+1\d{10}$/.test(String(CONFIG.phone2E164 || "").trim());

/* ── Medición y atribución ───────────────────────────────────────────────── */
safe(loadGtm, "gtm");
safe(captureAttribution, "attribution");

/* ── Cambio de idioma: conserva query string y hash ─────────────────────── */
function initLangSwitch() {
  $$("[data-lang-switch]").forEach((a) => {
    const base = a.getAttribute("href").split(/[?#]/)[0];
    const sync = () => { a.href = base + window.location.search + window.location.hash; };
    sync();
    a.addEventListener("click", () => {
      sync();
      track("language_switch", { from: LANG, to: a.dataset.langSwitch });
    });
  });
}

/* ── Teléfono, email y datos del pie ─────────────────────────────────────── */
function fillText(selector, value) {
  $$(selector).forEach((el) => {
    if (!has(value)) { el.remove(); return; }
    const target = el.querySelector("[data-value]") || el;
    target.textContent = value;
    el.hidden = false;
  });
}

function initContact() {
  $$("[data-tel]").forEach((el) => {
    if (!phoneOk) { el.remove(); return; }
    el.href = "tel:" + CONFIG.phoneE164.trim();
    const label = el.querySelector("[data-tel-text]");
    if (label) label.textContent = CONFIG.phone;
    if (el.hasAttribute("data-tel-aria")) el.setAttribute("aria-label", `${el.dataset.telAria} ${CONFIG.phone}`);
    el.hidden = false;
  });

  // Teléfono secundario: solo en el pie.
  $$("[data-tel2]").forEach((el) => {
    if (!phone2Ok) { el.remove(); return; }
    el.href = "tel:" + CONFIG.phone2E164.trim();
    const label = el.querySelector("[data-tel-text]");
    if (label) label.textContent = CONFIG.phone2;
    el.hidden = false;
  });

  // Frases que solo se vuelven link si hay teléfono (ej. "give us a call" en la FAQ).
  $$("[data-tel-wrap]").forEach((el) => {
    if (!phoneOk) return;
    const a = document.createElement("a");
    a.href = "tel:" + CONFIG.phoneE164.trim();
    a.dataset.callLocation = el.dataset.telWrap;
    a.className = "inline-link";
    a.textContent = el.textContent;
    el.replaceWith(a);
  });

  fillText("[data-cfg='legalName']", CONFIG.legalName);
  fillText("[data-cfg='address']", CONFIG.address);
  fillText("[data-cfg='hours']", pick(CONFIG, "hours"));

  $$("[data-cfg='email']").forEach((el) => {
    const email = String(CONFIG.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { el.remove(); return; }
    const a = el.matches("a") ? el : el.querySelector("a");
    a.href = "mailto:" + email;
    a.textContent = email;
    el.hidden = false;
  });

  // Separadores "·" solo entre elementos que existen.
  $$("[data-dot-list]").forEach((list) => {
    if (![...list.children].some((c) => !c.hidden)) list.remove();
  });

  $$("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  $$("[data-copyright-name]").forEach((el) => { if (has(CONFIG.legalName)) el.textContent = CONFIG.legalName; });
}

/* ── Venta cruzada (pintura) ─────────────────────────────────────────────── */
function initCrossSell() {
  const crossUrl = safeUrl(pick(CONFIG, "crossSellUrl") || "");
  $$("[data-crosssell]").forEach((el) => {
    if (crossUrl) {
      el.href = crossUrl;
      el.hidden = false;
    } else if (el.dataset.crosssell === "wrap") {
      // Sin URL: el texto se mantiene, sin link.
      const span = document.createElement("span");
      span.className = "cs";
      span.innerHTML = el.innerHTML;
      span.querySelectorAll("[data-crosssell-arrow]").forEach((n) => n.remove());
      el.replaceWith(span);
    } else {
      el.remove();
    }
  });
}

/* ── Frecuencias, paso de visita ─────────────────────────────────────────── */
function initConditionalCopy() {
  fillText("[data-cfg='frequencies']", pick(CONFIG, "recurringFrequencies"));
  $$("[data-site-visit]").forEach((li) => {
    if (CONFIG.siteVisit === true) li.hidden = false; else li.remove();
  });
  $$("[data-steps]").forEach((ol) => ol.style.setProperty("--steps", ol.children.length));
}

/* ── Imagen del hero ─────────────────────────────────────────────────────── */
function initHeroImage() {
  const heroMedia = document.querySelector("[data-hero-media]");
  if (!heroMedia || !has(CONFIG.heroImage)) return;
  const img = new Image();
  img.src = asset(CONFIG.heroImage);
  img.alt = "";
  img.decoding = "async";
  img.setAttribute("fetchpriority", "high");
  img.width = 1200; img.height = 900;
  heroMedia.classList.add("hero__media--photo");
  heroMedia.replaceChildren(img);
}

/* ── Galería "Our work" + lightbox ───────────────────────────────────────── */
function initGallery() {
  const section = document.querySelector("[data-gallery]");
  if (!section) return;
  const gallery = Array.isArray(CONFIG.gallery) ? CONFIG.gallery.filter((g) => g && has(g.src)) : [];
  if (!gallery.length) { section.remove(); return; }

  const grid = section.querySelector("[data-gallery-grid]");
  if (grid.children.length) return; // idempotente
  const dialog = section.querySelector("dialog");
  const dImg = dialog.querySelector("img");
  const dCap = dialog.querySelector("figcaption");
  let opener = null;

  gallery.forEach((g) => {
    const fig = document.createElement("figure");
    fig.className = "gallery__item";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gallery__btn";
    const img = document.createElement("img");
    img.src = asset(g.src);
    if (has(g.srcset)) img.srcset = g.srcset.split(",").map((s) => { const [u, d] = s.trim().split(/\s+/); return asset(u) + (d ? " " + d : ""); }).join(", ");
    img.sizes = "(min-width: 1024px) 33vw, 50vw";
    img.width = g.width || 800; img.height = g.height || 600;
    img.loading = "lazy"; img.decoding = "async";
    img.alt = pick(g, "alt") || "";
    btn.setAttribute("aria-label", (pick(g, "alt") || "") + (LANG === "es" ? " — ampliar" : " — enlarge"));
    btn.appendChild(img);
    fig.appendChild(btn);
    const cap = pick(g, "caption");
    if (has(cap)) {
      const fc = document.createElement("figcaption");
      fc.textContent = cap;
      fig.appendChild(fc);
    }
    btn.addEventListener("click", () => {
      opener = btn;
      dImg.src = img.currentSrc || img.src;
      dImg.alt = img.alt;
      dImg.width = img.width; dImg.height = img.height;
      dCap.textContent = cap || "";
      dCap.hidden = !has(cap);
      dialog.showModal();
    });
    grid.appendChild(fig);
  });

  dialog.addEventListener("close", () => { if (opener) opener.focus(); });
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
  section.hidden = false;
}

/* ── Antes y después (apagado si no hay pares reales) ────────────────────── */
function initBeforeAfter() {
  const section = document.querySelector("[data-before-after]");
  if (!section) return;
  const pairs = Array.isArray(CONFIG.beforeAfter) ? CONFIG.beforeAfter.filter((p) => p && has(p.before) && has(p.after)) : [];
  if (!pairs.length) { section.remove(); return; }
  const wrap = section.querySelector("[data-ba-list]");
  if (wrap.children.length) return;
  const t = LANG === "es" ? { before: "Antes", after: "Después", range: "Comparar antes y después" } : { before: "Before", after: "After", range: "Compare before and after" };
  pairs.forEach((p, i) => {
    const el = document.createElement("div");
    el.className = "ba";
    el.style.setProperty("--pos", "50%");
    const alt = pick(p, "alt") || "";
    el.innerHTML = `
      <div class="ba__frame">
        <img class="ba__img" loading="lazy" decoding="async" alt="">
        <div class="ba__after"><img class="ba__img" loading="lazy" decoding="async" alt=""></div>
        <span class="ba__tag ba__tag--before">${t.before}</span>
        <span class="ba__tag ba__tag--after">${t.after}</span>
        <span class="ba__handle" aria-hidden="true"></span>
      </div>
      <label class="sr-only" for="ba-${i}">${t.range}</label>
      <input class="ba__range" id="ba-${i}" type="range" min="0" max="100" value="50" aria-valuenow="50">`;
    const [imgB, imgA] = el.querySelectorAll("img");
    imgB.src = asset(p.before); imgB.alt = alt ? `${t.before}: ${alt}` : t.before;
    imgA.src = asset(p.after); imgA.alt = alt ? `${t.after}: ${alt}` : t.after;
    const range = el.querySelector("input");
    range.addEventListener("input", () => {
      el.style.setProperty("--pos", range.value + "%");
      range.setAttribute("aria-valuenow", range.value);
    });
    wrap.appendChild(el);
  });
  section.hidden = false;
}

/* ── Bloques opcionales (apagados por defecto) ───────────────────────────── */
function initOptionalBlocks() {
  const anchor = document.querySelector("[data-optional-anchor]");
  if (!anchor) return;
  const blocks = CONFIG.optionalBlocks || {};
  const frag = document.createDocumentFragment();

  const reviews = Array.isArray(CONFIG.googleReviews) ? CONFIG.googleReviews.filter((r) => r && has(r.text) && has(r.author)) : [];
  const profile = safeUrl(CONFIG.googleProfileUrl || "");
  if (blocks.reviews === true && reviews.length && profile) {
    const sec = document.createElement("section");
    sec.className = "section reviews";
    sec.setAttribute("aria-labelledby", "reviews-title");
    sec.innerHTML = `<div class="container"><h2 id="reviews-title" class="h2"></h2><div class="reviews__grid"></div><a class="link-arrow" target="_blank" rel="noopener"></a></div>`;
    sec.querySelector("h2").textContent = LANG === "es" ? "Reseñas en Google" : "Reviews on Google";
    const grid = sec.querySelector(".reviews__grid");
    reviews.forEach((r) => {
      const q = document.createElement("blockquote");
      q.className = "card review";
      const p = document.createElement("p"); p.textContent = r.text;
      const f = document.createElement("footer"); f.textContent = r.author + (has(r.date) ? " · " + r.date : "");
      q.append(p, f);
      grid.appendChild(q);
    });
    const link = sec.querySelector("a");
    link.href = profile;
    link.textContent = (LANG === "es" ? "Ver el perfil en Google" : "See our Google profile") + " ↗";
    frag.appendChild(sec);
  }

  const notes = [];
  if (blocks.guarantee === true && has(pick(CONFIG, "guaranteeText"))) notes.push(pick(CONFIG, "guaranteeText"));
  if (blocks.licenseInsurance === true && has(pick(CONFIG, "licenseText"))) notes.push(pick(CONFIG, "licenseText"));
  if (notes.length) {
    const sec = document.createElement("section");
    sec.className = "section section--tight";
    const c = document.createElement("div");
    c.className = "container notes";
    notes.forEach((n) => { const p = document.createElement("p"); p.className = "card note"; p.textContent = n; c.appendChild(p); });
    sec.appendChild(c);
    frag.appendChild(sec);
  }
  anchor.replaceWith(frag);
}

/* ── Datos estructurados LocalBusiness (solo con campos con valor) ───────── */
function initLocalBusiness() {
  if (!has(CONFIG.legalName) || !(phoneOk || has(CONFIG.address))) return;
  const ld = { "@context": "https://schema.org", "@type": "LocalBusiness", name: CONFIG.legalName, areaServed: "Miami, FL" };
  if (phoneOk) ld.telephone = CONFIG.phoneE164.trim();
  if (has(CONFIG.email)) ld.email = CONFIG.email.trim();
  if (has(CONFIG.address)) ld.address = CONFIG.address.trim();
  if (has(CONFIG.hours_en)) ld.openingHours = CONFIG.hours_en.trim(); // texto libre del horario real
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
}

/* ── noindex (el meta también está escrito en el HTML; ver README) ───────── */
function initRobots() {
  if (CONFIG.noindex === false) {
    $$("meta[name='robots']").forEach((m) => m.remove());
  } else if (!document.querySelector("meta[name='robots']")) {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, follow";
    document.head.appendChild(m);
  }
}

/* ── click_to_call en cualquier tel: ─────────────────────────────────────── */
function initCallTracking() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href^='tel:']");
    if (!a) return;
    const loc = (a.closest("[data-call-location]") || a).dataset.callLocation || "unknown";
    track("click_to_call", { location: loc, language: LANG });
  });
}

/* ── Encabezado sólido al hacer scroll + barra de progreso ───────────────── */
function initScrollUi() {
  const header = document.querySelector(".site-header");
  const bar = document.querySelector("[data-scroll-progress]");
  let raf = 0;
  const update = () => {
    raf = 0;
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    }
  };
  update();
  window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener("resize", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
}

/* ── Barra inferior fija en móvil ────────────────────────────────────────── */
function initStickyBar() {
  const bar = document.querySelector("[data-sticky-bar]");
  const hero = document.querySelector("[data-hero]");
  const quote = document.querySelector("#quote");
  if (!bar || !hero || !("IntersectionObserver" in window)) return;
  let heroVisible = true;
  let quoteVisible = false;
  const update = () => {
    const show = !heroVisible && !quoteVisible;
    bar.classList.toggle("is-visible", show);
    bar.setAttribute("aria-hidden", show ? "false" : "true");
    bar.querySelectorAll("a").forEach((a) => { a.tabIndex = show ? 0 : -1; });
  };
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; update(); }).observe(hero);
  if (quote) new IntersectionObserver(([e]) => { quoteVisible = e.isIntersecting; update(); }, { threshold: 0.02 }).observe(quote);
  update();
}

/* ── Aparición de secciones (fade + 8 px) ────────────────────────────────── */
// Umbral bajo + red de seguridad a los 6 s: nada queda oculto aunque falle el observer.
function initReveal() {
  const els = $$("[data-reveal]");
  if (REDUCED || !("IntersectionObserver" in window) || !els.length) return;
  document.documentElement.classList.add("js-reveal");
  const show = (el) => el.classList.add("is-in");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.01, rootMargin: "0px 0px -6% 0px" });
  els.forEach((el) => {
    // Escalonado suave para listas (solo retraso de transición, no oculta contenido).
    [...el.children].forEach((c, i) => c.style.setProperty("--i", i));
    if (el.getBoundingClientRect().top < window.innerHeight) show(el);
    else io.observe(el);
  });
  setTimeout(() => {
    $$("[data-reveal]:not(.is-in)").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 1.5) show(el);
    });
  }, 6000);
}

/* ── Capa visual: gradiente del hero que sigue al puntero ────────────────── */
// Solo en dispositivos con puntero fino. Con movimiento reducido, queda estático.
function initHeroGlow() {
  const hero = document.querySelector("[data-hero]");
  if (!hero || !FINE_POINTER || REDUCED) return;
  let tx = 70, ty = 30, x = 70, y = 30, raf = 0, active = false;
  const frame = () => {
    x += (tx - x) * 0.06;
    y += (ty - y) * 0.06;
    hero.style.setProperty("--gx", x.toFixed(2) + "%");
    hero.style.setProperty("--gy", y.toFixed(2) + "%");
    raf = active || Math.abs(tx - x) + Math.abs(ty - y) > 0.1 ? requestAnimationFrame(frame) : 0;
  };
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    // El brillo se mueve solo en la mitad derecha: nunca queda detrás del texto del hero.
    tx = 50 + ((e.clientX - r.left) / r.width) * 50;
    ty = ((e.clientY - r.top) / r.height) * 100;
    active = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
  hero.addEventListener("pointerleave", () => { active = false; tx = 70; ty = 30; if (!raf) raf = requestAnimationFrame(frame); });
}

/* ── Capa visual: halo cian que sigue al puntero en tarjetas ─────────────── */
function initCardHalo() {
  if (!FINE_POINTER) return;
  $$("[data-halo]").forEach((card) => {
    if (card.dataset.haloBound) return;
    card.dataset.haloBound = "1";
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--hx", (e.clientX - r.left) + "px");
      card.style.setProperty("--hy", (e.clientY - r.top) + "px");
    }, { passive: true });
  });
}

/* ── Arranque ────────────────────────────────────────────────────────────── */
safe(initLangSwitch, "langSwitch");
safe(initContact, "contact");
safe(initCrossSell, "crossSell");
safe(initConditionalCopy, "conditionalCopy");
safe(initHeroImage, "heroImage");
safe(initGallery, "gallery");
safe(initBeforeAfter, "beforeAfter");
safe(initOptionalBlocks, "optionalBlocks");
safe(initLocalBusiness, "localBusiness");
safe(initRobots, "robots");
safe(initCallTracking, "callTracking");
safe(initScrollUi, "scrollUi");
safe(initStickyBar, "stickyBar");
safe(initReveal, "reveal");
safe(initHeroGlow, "heroGlow");
safe(initCardHalo, "cardHalo");
