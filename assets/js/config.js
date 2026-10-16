// ─────────────────────────────────────────────────────────────────────────────
// CSD Good Services · Landing de limpieza comercial
// ÚNICO archivo de configuración editable. El resto del código lee de aquí.
// Si un campo queda vacío, la interfaz oculta el elemento: nunca muestra un
// link roto, "undefined" ni un tel: vacío.
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {
  // Contacto y datos legales (obligatorios antes de lanzar)
  legalName: "",          // [PENDIENTE] nombre legal exacto: "CSD Good Services, LLC", "CSD Good Service LLC" o "CSD Good Services LLC"
  phone: "",              // [PENDIENTE] formato (305) 555-0123
  phoneE164: "",          // [PENDIENTE] formato +13055550123, para los links tel:
  email: "",              // [PENDIENTE]
  address: "",            // [PENDIENTE]
  hours_en: "",           // [PENDIENTE] horario real de atención, ej. "Mon–Fri 8 AM–6 PM · Sat 9 AM–3 PM"
  hours_es: "",           // [PENDIENTE]

  // Integraciones
  webhookUrl: "",         // [PENDIENTE] Inbound Webhook del workflow de GoHighLevel
  webhookMode: "cors-json", // "cors-json" | "no-cors" (ver README)
  gtmId: "",              // [PENDIENTE] GTM-XXXXXXX

  // Venta cruzada
  crossSellUrl_en: "",    // [PENDIENTE] URL de la landing de pintura en inglés
  crossSellUrl_es: "",    // [PENDIENTE] URL de la landing de pintura en español

  // Contenido condicional
  heroImage: "",          // ruta a una foto real, ej. "assets/img/work/hero.webp" (relativa a la raíz del sitio)
  gallery: [],            // [{ src, width, height, alt_en, alt_es, caption_en, caption_es }]: solo fotos reales
  beforeAfter: [],        // [{ before, after, alt_en, alt_es }]: solo pares reales
  siteVisit: false,       // [PENDIENTE] true si CSD visita el lugar antes de cotizar
  recurringFrequencies_en: "", // [PENDIENTE] ej. "Weekly · Every two weeks · Monthly"
  recurringFrequencies_es: "", // [PENDIENTE]
  optionalBlocks: { reviews: false, guarantee: false, licenseInsurance: false },
  googleReviews: [],      // solo reseñas reales copiadas del perfil, con link: [{ text, author, date }]
  googleProfileUrl: "",
  guaranteeText_en: "", guaranteeText_es: "",
  licenseText_en: "",   licenseText_es: "",

  // SEO
  noindex: true           // ver README: el <meta robots> también está escrito en cada HTML
};
