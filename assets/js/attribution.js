// Captura de origen (GCLID / UTM) con persistencia de primer contacto.
// - Guarda en localStorage con fecha y expira a los 90 días.
// - Si llega un click ID nuevo (gclid/gbraid/wbraid distinto), reemplaza todo.
// - Si el storage está bloqueado: sessionStorage y, si tampoco, memoria.

const KEY = "csd_attribution_v1";
const TTL_MS = 90 * 24 * 60 * 60 * 1000;
const PARAMS = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "h"];
const CLICK_IDS = ["gclid", "gbraid", "wbraid"];

let memoryStore = null;

function storageBackends() {
  const out = [];
  for (const name of ["localStorage", "sessionStorage"]) {
    try {
      const s = window[name];
      const probe = "__csd_probe__";
      s.setItem(probe, "1");
      s.removeItem(probe);
      out.push(s);
    } catch (_) { /* bloqueado: probar el siguiente */ }
  }
  return out;
}

function read() {
  for (const s of storageBackends()) {
    try {
      const raw = s.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignorar y seguir */ }
  }
  return memoryStore;
}

function write(data) {
  memoryStore = data;
  const backends = storageBackends();
  for (const s of backends) {
    try { s.setItem(KEY, JSON.stringify(data)); return; } catch (_) { /* siguiente */ }
  }
}

function fromUrl() {
  const q = new URLSearchParams(window.location.search);
  const vals = {};
  for (const p of PARAMS) {
    const v = q.get(p);
    if (v) vals[p] = v.slice(0, 500);
  }
  return vals;
}

function isExpired(data) {
  return !data || !data.captured_at || Date.now() - Date.parse(data.captured_at) > TTL_MS;
}

function newClickId(stored, incoming) {
  return CLICK_IDS.some((k) => incoming[k] && incoming[k] !== (stored.params || {})[k]);
}

export function captureAttribution() {
  const incoming = fromUrl();
  let stored = null;
  try { stored = read(); } catch (_) { stored = null; }

  if (isExpired(stored) || newClickId(stored, incoming)) {
    stored = {
      params: incoming,
      landing_page: window.location.href,
      referrer: document.referrer || "",
      captured_at: new Date().toISOString()
    };
    write(stored);
  } else if (!memoryStore) {
    memoryStore = stored;
  }
  return stored;
}

// Datos planos para el payload del formulario.
export function getAttribution() {
  const data = read() || captureAttribution();
  const out = {};
  for (const p of PARAMS) {
    if (p === "h") continue; // el titular mostrado viaja como headline_variant
    out[p] = (data.params && data.params[p]) || "";
  }
  out.landing_page = data.landing_page || "";
  out.referrer = data.referrer || "";
  out.attribution_captured_at = data.captured_at || "";
  return out;
}
