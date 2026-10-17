// ─────────────────────────────────────────────────────────────────────────────
// CSD Good Services · Landing de limpieza comercial
// ÚNICO archivo de configuración editable. El resto del código lee de aquí.
// Si un campo queda vacío, la interfaz oculta el elemento: nunca muestra un
// link roto, "undefined" ni un tel: vacío.
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {
  // Contacto y datos legales (datos del cliente, 17-10-2026)
  legalName: "CSD Good Services LLC",   // confirmado en los textos legales del cliente (17-10-2026)
  phone: "(786) 295-7057",      // teléfono principal: botones de llamada (header, barra móvil, FAQ, gracias, error)
  phoneE164: "+17862957057",    // mismo número en E.164, para los links tel:
  phone2: "(863) 488-6716",     // teléfono secundario: solo se muestra en el pie
  phone2E164: "+18634886716",
  email: "admin@csdgoodservices.com",
  address: "8215 NW 64th Street, Medley, FL 33166",
  hours_en: "",           // opcional: horario de atención, ej. "Mon–Fri 8 AM–6 PM". Vacío = no se muestra
  hours_es: "",           // opcional: ej. "Lun–Vie 8 AM–6 PM"

  // Integraciones
  webhookUrl: "",         // INTEGRACIÓN: pegar la URL del Inbound Webhook del workflow de GoHighLevel (ver README)
  webhookMode: "cors-json", // "cors-json" | "no-cors" (ver README)
  gtmId: "",              // INTEGRACIÓN: pegar el ID del contenedor de Google Tag Manager, formato GTM-XXXXXXX

  // Venta cruzada
  crossSellUrl_en: "",    // opcional: URL de la landing de pintura en inglés. Vacío = el texto queda sin link
  crossSellUrl_es: "",    // opcional: URL de la landing de pintura en español

  // Contenido condicional
  heroImage: "",          // ruta a una foto real, ej. "assets/img/work/hero.webp" (relativa a la raíz del sitio)
  gallery: [],            // [{ src, width, height, alt_en, alt_es, caption_en, caption_es }]: solo fotos reales
  beforeAfter: [],        // [{ before, after, alt_en, alt_es }]: solo pares reales
  siteVisit: false,       // true agrega el paso "We visit your space" (5 pasos); false = 4 pasos
  recurringFrequencies_en: "", // opcional: ej. "Weekly · Every two weeks · Monthly". Vacío = no se muestra
  recurringFrequencies_es: "", // opcional
  optionalBlocks: { reviews: false, guarantee: false, licenseInsurance: false },
  googleReviews: [],      // solo reseñas reales copiadas del perfil, con link: [{ text, author, date }]
  googleProfileUrl: "",
  guaranteeText_en: "", guaranteeText_es: "",
  licenseText_en: "",   licenseText_es: "",

  // SEO
  noindex: true           // ver README: el <meta robots> también está escrito en cada HTML
};
