// Comportamiento general: idioma, titular por grupo de anuncios, contenido
// condicional desde config.js, barra móvil, galería, animaciones.

import { CONFIG } from "./config.js";
import { loadGtm, track, lang } from "./tracking.js";
import { captureAttribution } from "./attribution.js";

loadGtm();
try { captureAttribution(); } catch (_) { /* nunca romper la página por storage */ }

const LANG = lang();
const ROOT = document.body.dataset.root || "";
const has = (v) => typeof v === "string" ? v.trim() !== "" : v != null;
const pick = (obj, base) => obj[`${base}_${LANG}`];

// Convierte rutas de config (relativas a la raíz del sitio) en rutas válidas
// desde la página actual. Las URLs absolutas se dejan igual.
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

/* ── Titular según grupo de anuncios ─────────────────────────────────────── */
// El reemplazo lo hace un script inline justo después del <h1> (sin parpadeo).
export function headlineVariant() {
  const h1 = document.querySelector("h1[data-headline]");
  return (h1 && h1.dataset.variant) || "default";
}

/* ── Cambio de idioma: conserva query string y hash ─────────────────────── */
document.querySelectorAll("[data-lang-switch]").forEach((a) => {
  const base = a.getAttribute("href").split(/[?#]/)[0];
  const sync = () => { a.href = base + window.location.search + window.location.hash; };
  sync();
  a.addEventListener("click", () => {
    sync();
    track("language_switch", { from: LANG, to: a.dataset.langSwitch });
  });
});

/* ── Teléfono, email y datos del pie ─────────────────────────────────────── */
const phoneOk = has(CONFIG.phone) && /^\+1\d{10}$/.test(String(CONFIG.phoneE164 || "").trim());

document.querySelectorAll("[data-tel]").forEach((el) => {
  if (!phoneOk) { el.remove(); return; }
  el.href = "tel:" + CONFIG.phoneE164.trim();
  const label = el.querySelector("[data-tel-text]");
  if (label) label.textContent = CONFIG.phone;
  if (el.hasAttribute("data-tel-aria")) el.setAttribute("aria-label", `${el.dataset.telAria} ${CONFIG.phone}`);
  el.hidden = false;
});

// Frases que solo se vuelven link si hay teléfono (ej. "give us a call" en la FAQ).
document.querySelectorAll("[data-tel-wrap]").forEach((el) => {
  if (!phoneOk) return;
  const a = document.createElement("a");
  a.href = "tel:" + CONFIG.phoneE164.trim();
  a.dataset.callLocation = el.dataset.telWrap;
  a.className = "inline-link";
  a.textContent = el.textContent;
  el.replaceWith(a);
});

function fillText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => {
    if (!has(value)) { el.remove(); return; }
    const target = el.querySelector("[data-value]") || el;
    target.textContent = value;
    el.hidden = false;
  });
}
fillText("[data-cfg='legalName']", CONFIG.legalName);
fillText("[data-cfg='address']", CONFIG.address);
fillText("[data-cfg='hours']", pick(CONFIG, "hours"));

document.querySelectorAll("[data-cfg='email']").forEach((el) => {
  const email = String(CONFIG.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { el.remove(); return; }
  const a = el.matches("a") ? el : el.querySelector("a");
  a.href = "mailto:" + email;
  a.textContent = email;
  el.hidden = false;
});

// Separadores "·" solo entre elementos que existen.
document.querySelectorAll("[data-dot-list]").forEach((list) => {
  const items = [...list.children].filter((c) => !c.hidden);
  if (!items.length) list.remove();
});

document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
document.querySelectorAll("[data-copyright-name]").forEach((el) => {
  if (has(CONFIG.legalName)) el.textContent = CONFIG.legalName;
});

/* ── Venta cruzada (pintura) ─────────────────────────────────────────────── */
const crossUrl = safeUrl(pick(CONFIG, "crossSellUrl") || "");
document.querySelectorAll("[data-crosssell]").forEach((el) => {
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

/* ── Frecuencias recurrentes ─────────────────────────────────────────────── */
fillText("[data-cfg='frequencies']", pick(CONFIG, "recurringFrequencies"));

/* ── Paso de la visita ───────────────────────────────────────────────────── */
document.querySelectorAll("[data-site-visit]").forEach((li) => {
  if (CONFIG.siteVisit === true) li.hidden = false; else li.remove();
});
document.querySelectorAll("[data-steps]").forEach((ol) => ol.style.setProperty("--steps", ol.children.length));

/* ── Imagen del hero ─────────────────────────────────────────────────────── */
const heroMedia = document.querySelector("[data-hero-media]");
if (heroMedia && has(CONFIG.heroImage)) {
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
const gallery = Array.isArray(CONFIG.gallery) ? CONFIG.gallery.filter((g) => g && has(g.src)) : [];
const gallerySection = document.querySelector("[data-gallery]");
if (gallerySection) {
  if (!gallery.length) {
    gallerySection.remove();
  } else {
    const grid = gallerySection.querySelector("[data-gallery-grid]");
    const dialog = gallerySection.querySelector("dialog");
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
      if (has(g.srcset)) img.srcset = g.srcset.split(",").map((s) => asset(s.trim().split(" ")[0]) + " " + (s.trim().split(" ")[1] || "")).join(", ");
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
    gallerySection.hidden = false;
  }
}

/* ── Antes y después (apagado si no hay pares reales) ────────────────────── */
const pairs = Array.isArray(CONFIG.beforeAfter) ? CONFIG.beforeAfter.filter((p) => p && has(p.before) && has(p.after)) : [];
const baSection = document.querySelector("[data-before-after]");
if (baSection) {
  if (!pairs.length) {
    baSection.remove();
  } else {
    const wrap = baSection.querySelector("[data-ba-list]");
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
    baSection.hidden = false;
  }
}

/* ── Bloques opcionales (apagados por defecto) ───────────────────────────── */
const anchor = document.querySelector("[data-optional-anchor]");
if (anchor) {
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
if (has(CONFIG.legalName) && (phoneOk || has(CONFIG.address))) {
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
if (CONFIG.noindex === false) {
  document.querySelectorAll("meta[name='robots']").forEach((m) => m.remove());
} else if (!document.querySelector("meta[name='robots']")) {
  const m = document.createElement("meta");
  m.name = "robots"; m.content = "noindex, follow";
  document.head.appendChild(m);
}

/* ── click_to_call en cualquier tel: ─────────────────────────────────────── */
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a[href^='tel:']");
  if (!a) return;
  const loc = (a.closest("[data-call-location]") || a).dataset.callLocation || "unknown";
  track("click_to_call", { location: loc, language: LANG });
});

/* ── Encabezado: sombra al hacer scroll ──────────────────────────────────── */
const header = document.querySelector(".site-header");
if (header) {
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ── Barra inferior fija en móvil ────────────────────────────────────────── */
const bar = document.querySelector("[data-sticky-bar]");
const hero = document.querySelector("[data-hero]");
const quote = document.querySelector("#quote");
if (bar && hero && "IntersectionObserver" in window) {
  let heroVisible = true;
  let quoteVisible = false;
  const update = () => {
    const show = !heroVisible && !quoteVisible;
    bar.classList.toggle("is-visible", show);
    bar.setAttribute("aria-hidden", show ? "false" : "true");
    bar.querySelectorAll("a").forEach((a) => { a.tabIndex = show ? 0 : -1; });
  };
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; update(); }).observe(hero);
  if (quote) new IntersectionObserver(([e]) => { quoteVisible = e.isIntersecting; update(); }, { threshold: 0.05 }).observe(quote);
  update();
}

/* ── Aparición de secciones (fade + 8 px) ────────────────────────────────── */
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const reveal = document.querySelectorAll("[data-reveal]");
if (!reduce && "IntersectionObserver" in window) {
  document.documentElement.classList.add("js-reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  reveal.forEach((el) => {
    // Lo que ya está en pantalla al cargar se muestra sin animación.
    if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-in");
    else io.observe(el);
  });
}

/* ── Aviso de desarrollo ─────────────────────────────────────────────────── */
export const IS_LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
