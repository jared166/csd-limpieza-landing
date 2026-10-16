// Formulario de cotización: validación, lógica condicional, envío al webhook
// de GoHighLevel y plan B si el envío falla. Nunca se pierde un lead en silencio.

import { CONFIG } from "./config.js";
import { track, trackThen, lang } from "./tracking.js";
import { getAttribution } from "./attribution.js";

const form = document.getElementById("quote-form");
const LOADED_AT = Date.now();
const LANG = lang();
const IS_LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const TIMEOUT_MS = 10000;

const T = {
  en: {
    full_name: "Please enter your full name.",
    company: "Please enter your company name.",
    phone: "Please enter a valid 10-digit US phone number.",
    email: "Please enter a valid email address.",
    property_type: "Please select a property type.",
    cleaning_type: "Please choose a type of cleaning.",
    areas: "Please select at least one option.",
    location: "Please enter a city or ZIP code.",
    size_sqft: "Please enter a number, for example 2500.",
    timeline: "Please choose when you'd like to start.",
    sending: "Sending…",
    freqShown: "New question below: If recurring, how often?",
    devNotice: "Webhook not configured",
    failBoth: (p, e) => `We couldn't send your request. Please call us at ${p} or email ${e}.`,
    failPhone: (p) => `We couldn't send your request. Please call us at ${p}.`,
    failEmail: (e) => `We couldn't send your request. Please email ${e}.`,
    failNone: "We couldn't send your request. Please try again in a few minutes."
  },
  es: {
    full_name: "Ingrese su nombre completo.",
    company: "Ingrese el nombre de su empresa.",
    phone: "Ingrese un teléfono de EE. UU. válido, de 10 dígitos.",
    email: "Ingrese un email válido.",
    property_type: "Seleccione el tipo de propiedad.",
    cleaning_type: "Elija el tipo de limpieza.",
    areas: "Seleccione al menos una opción.",
    location: "Ingrese su ciudad o código postal.",
    size_sqft: "Ingrese un número, por ejemplo 2500.",
    timeline: "Elija cuándo quiere empezar.",
    sending: "Enviando…",
    freqShown: "Nueva pregunta abajo: Si es recurrente, ¿con qué frecuencia?",
    devNotice: "Webhook not configured",
    failBoth: (p, e) => `No pudimos enviar su solicitud. Llámenos al ${p} o escríbanos a ${e}.`,
    failPhone: (p) => `No pudimos enviar su solicitud. Llámenos al ${p}.`,
    failEmail: (e) => `No pudimos enviar su solicitud. Escríbanos a ${e}.`,
    failNone: "No pudimos enviar su solicitud. Inténtelo de nuevo en unos minutos."
  }
}[LANG];

/* ── Utilidades de teléfono ──────────────────────────────────────────────── */
function phoneDigits(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d;
}
function formatPhone(d) {
  if (!d) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
}
const validPhone = (d) => /^[2-9]\d{2}[2-9]\d{6}$/.test(d);
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

if (form) init();

function init() {
  const $ = (name) => form.elements.namedItem(name);
  const submitBtn = form.querySelector("[type='submit']");
  const submitLabel = submitBtn.querySelector("[data-label]") || submitBtn;
  const defaultLabel = submitLabel.textContent;
  const freqWrap = form.querySelector("[data-frequency]");
  const live = form.querySelector("[data-live]");
  const failBox = form.querySelector("[data-fail]");

  /* form_start: primer foco, una vez por página */
  let started = false;
  form.addEventListener("focusin", () => {
    if (started) return;
    started = true;
    track("form_start", { form_id: "cleaning_quote", language: LANG });
  });

  /* Teléfono con formato mientras se escribe */
  const phone = $("phone");
  phone.addEventListener("input", () => {
    const d = phoneDigits(phone.value).slice(0, 10);
    const atEnd = phone.selectionStart === phone.value.length;
    phone.value = formatPhone(d);
    if (atEnd) phone.setSelectionRange(phone.value.length, phone.value.length);
  });

  /* Frecuencia: solo visible si cleaning_type = recurring */
  const setFrequency = (show, announce) => {
    freqWrap.classList.toggle("is-open", show);
    freqWrap.setAttribute("aria-hidden", show ? "false" : "true");
    freqWrap.querySelectorAll("input").forEach((i) => {
      i.disabled = !show;
      if (!show) i.checked = false;
    });
    if (show && announce) live.textContent = T.freqShown;
    if (!show) live.textContent = "";
  };
  setFrequency(false, false);
  form.querySelectorAll("input[name='cleaning_type']").forEach((r) => {
    r.addEventListener("change", () => setFrequency(r.value === "recurring" && r.checked, true));
  });

  /* Validación */
  const groups = ["property_type", "cleaning_type", "areas", "timeline"];
  const order = ["full_name", "company", "phone", "email", "property_type", "cleaning_type", "areas", "location", "size_sqft", "timeline"];

  function fieldEl(name) {
    return form.querySelector(`[data-field='${name}']`);
  }
  function setError(name, msg) {
    const wrap = fieldEl(name);
    if (!wrap) return;
    const err = wrap.querySelector(".field__error");
    const controls = wrap.querySelectorAll("input, select, textarea");
    wrap.classList.toggle("has-error", !!msg);
    err.textContent = msg || "";
    err.hidden = !msg;
    const target = wrap.matches("fieldset") ? wrap : controls[0];
    if (msg) target.setAttribute("aria-invalid", "true"); else target.removeAttribute("aria-invalid");
  }
  function checkedValues(name) {
    return [...form.querySelectorAll(`input[name='${name}']:checked`)].map((i) => i.value);
  }
  function validateField(name) {
    const v = (n) => String(($(n) && $(n).value) || "").trim();
    switch (name) {
      case "full_name": case "company": case "location":
        return v(name).length >= 2 ? "" : T[name];
      case "phone": return validPhone(phoneDigits(v("phone"))) ? "" : T.phone;
      case "email": return validEmail(v("email")) ? "" : T.email;
      case "property_type": return v("property_type") ? "" : T.property_type;
      case "cleaning_type": case "timeline": return checkedValues(name).length ? "" : T[name];
      case "areas": return checkedValues("areas").length ? "" : T.areas;
      case "size_sqft": {
        const s = v("size_sqft");
        return !s || (/^\d{1,9}$/.test(s.replace(/,/g, "")) && Number(s.replace(/,/g, "")) > 0) ? "" : T.size_sqft;
      }
      default: return "";
    }
  }
  function validateAll() {
    let first = null;
    order.forEach((name) => {
      const msg = validateField(name);
      setError(name, msg);
      if (msg && !first) first = name;
    });
    return first;
  }

  // Revalidar en vivo solo los campos que ya mostraron error.
  form.addEventListener("input", (e) => {
    const wrap = e.target.closest("[data-field]");
    if (wrap && wrap.classList.contains("has-error")) setError(wrap.dataset.field, validateField(wrap.dataset.field));
  });
  form.addEventListener("change", (e) => {
    const wrap = e.target.closest("[data-field]");
    if (wrap && wrap.classList.contains("has-error")) setError(wrap.dataset.field, validateField(wrap.dataset.field));
  });
  form.querySelectorAll("input[type='text'], input[type='tel'], input[type='email'], input[type='number']").forEach((i) => {
    i.addEventListener("blur", () => {
      const wrap = i.closest("[data-field]");
      if (i.value.trim()) setError(wrap.dataset.field, validateField(wrap.dataset.field));
    });
  });

  function focusField(name) {
    const wrap = fieldEl(name);
    const ctl = groups.includes(name) && name !== "property_type"
      ? wrap.querySelector("input:not([disabled])")
      : wrap.querySelector("input, select, textarea");
    if (ctl) {
      ctl.focus({ preventScroll: true });
      wrap.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }

  /* Payload */
  function buildPayload() {
    const g = (n) => String(($(n) && $(n).value) || "").trim();
    const digits = phoneDigits(g("phone"));
    const propertyType = g("property_type");
    const h1 = document.querySelector("h1[data-headline]");
    const size = g("size_sqft").replace(/,/g, "");
    return {
      full_name: g("full_name"),
      company: g("company"),
      phone: formatPhone(digits),
      phone_e164: "+1" + digits,
      email: g("email"),
      property_type: propertyType,
      cleaning_type: checkedValues("cleaning_type")[0] || "",
      frequency: checkedValues("frequency")[0] || "",
      areas: checkedValues("areas"),
      location: g("location"),
      size_sqft: size ? Number(size) : "",
      timeline: checkedValues("timeline")[0] || "",
      message: g("message"),
      lead_type: propertyType === "residential" ? "residential" : "commercial",
      service_line: "cleaning",
      language: LANG,
      headline_variant: (h1 && h1.dataset.variant) || "default",
      ...getAttribution(),
      page_url: window.location.href,
      submitted_at: new Date().toISOString(),
      user_agent: navigator.userAgent
    };
  }

  /* Envío al webhook (modo configurable) */
  async function send(payload) {
    const url = String(CONFIG.webhookUrl || "").trim();
    if (!url) {
      // Modo desarrollo: no se envía nada.
      console.info("[CSD] Webhook not configured. Payload:", payload);
      if (IS_LOCAL) showDevNotice();
      return true;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      if (CONFIG.webhookMode === "no-cors") {
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          body: JSON.stringify(payload),
          signal: ctrl.signal
        });
        return true; // respuesta opaca: si no lanzó error, se toma como enviada
      }
      const res = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      return res.ok;
    } catch (_) {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  function showDevNotice() {
    if (document.querySelector(".dev-notice")) return;
    const n = document.createElement("div");
    n.className = "dev-notice";
    n.setAttribute("role", "status");
    n.textContent = T.devNotice;
    document.body.appendChild(n);
  }

  function showFailure() {
    const phoneOk = String(CONFIG.phone || "").trim() && /^\+1\d{10}$/.test(String(CONFIG.phoneE164 || "").trim());
    const email = String(CONFIG.email || "").trim();
    const P = "\u0000P\u0000", E = "\u0000E\u0000";
    const text = phoneOk && email ? T.failBoth(P, E) : phoneOk ? T.failPhone(P) : email ? T.failEmail(E) : T.failNone;
    const msg = failBox.querySelector("[data-fail-text]");
    msg.replaceChildren();
    text.split(/(\u0000[PE]\u0000)/).forEach((part) => {
      if (part === P) {
        const a = document.createElement("a");
        a.href = "tel:" + CONFIG.phoneE164.trim();
        a.dataset.callLocation = "form_error";
        a.textContent = CONFIG.phone;
        msg.appendChild(a);
      } else if (part === E) {
        const a = document.createElement("a");
        a.href = "mailto:" + email;
        a.textContent = email;
        msg.appendChild(a);
      } else if (part) {
        msg.appendChild(document.createTextNode(part));
      }
    });
    failBox.hidden = false;
    failBox.focus();
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.setAttribute("aria-busy", busy ? "true" : "false");
    submitLabel.textContent = busy ? T.sending : defaultLabel;
  }

  function goToThanks() {
    const target = new URL(form.dataset.thanks, window.location.href);
    target.search = window.location.search;
    window.location.assign(target.href);
  }

  let sending = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;
    failBox.hidden = true;

    // Antispam: campo trampa o envío en menos de 3 s → descartar en silencio.
    const trap = $("website");
    if ((trap && trap.value) || Date.now() - LOADED_AT < 3000) return;

    const firstError = validateAll();
    if (firstError) { focusField(firstError); return; }

    const payload = buildPayload();
    sending = true;
    setBusy(true);
    const ok = await send(payload);

    if (!ok) {
      sending = false;
      setBusy(false);
      showFailure();
      return;
    }

    const params = {
      form_id: "cleaning_quote",
      language: LANG,
      service_line: "cleaning",
      cleaning_type: payload.cleaning_type,
      frequency: payload.frequency,
      areas: payload.areas,
      property_type: payload.property_type,
      timeline: payload.timeline,
      headline_variant: payload.headline_variant
    };
    if (payload.lead_type === "residential") {
      trackThen("lead_residential", params, goToThanks);
    } else {
      trackThen("generate_lead", {
        ...params,
        user_data: { email: payload.email, phone_number: payload.phone_e164 }
      }, goToThanks);
    }
  });
}
