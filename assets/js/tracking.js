// Medición para Google Ads vía Google Tag Manager.
//
// IMPORTANTE: la configuración de las etiquetas (conversión de Google Ads sobre
// `generate_lead`, GA4 y Consent Mode) se hace en GTM, NO en este repositorio.
// Aquí solo se carga el contenedor (si hay ID) y se empujan eventos al dataLayer.
//
// Datos personales: email y teléfono viajan solo dentro de `user_data` en el
// dataLayer (conversiones mejoradas). Nunca en URLs ni en console.log.

import { CONFIG } from "./config.js";

window.dataLayer = window.dataLayer || [];

const GTM_RE = /^GTM-[A-Z0-9]{4,12}$/;

export function hasGtm() {
  return GTM_RE.test(String(CONFIG.gtmId || "").trim());
}

export function loadGtm() {
  if (!hasGtm()) return; // sin ID no se carga ningún script de Google
  const id = CONFIG.gtmId.trim();
  // Snippet oficial de GTM (equivalente funcional del bloque <head>).
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(id);
  const first = document.getElementsByTagName("script")[0];
  first.parentNode.insertBefore(s, first);
}

export function track(event, params = {}) {
  window.dataLayer.push({ event, ...params });
}

// Empuja un evento y espera a que GTM lo confirme antes de continuar.
// Sin GTM cargado, continúa de inmediato.
export function trackThen(event, params, done) {
  let called = false;
  const finish = () => { if (!called) { called = true; done(); } };
  const gtmReady = hasGtm() && typeof window.google_tag_manager === "object";
  if (!gtmReady) {
    track(event, params);
    finish();
    return;
  }
  window.dataLayer.push({ event, ...params, eventCallback: finish, eventTimeout: 2000 });
  setTimeout(finish, 2500); // red de seguridad si el callback nunca llega
}

export function lang() {
  return document.documentElement.lang.toLowerCase().startsWith("es") ? "es" : "en";
}
