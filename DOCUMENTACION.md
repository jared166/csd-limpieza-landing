# Documentación del proyecto · Landing de limpieza comercial CSD Good Services

**Cliente:** CSD Good Services (pintura y limpieza comercial, Miami, FL)
**Pieza:** landing de captación para Google Ads (búsqueda), servicio de limpieza comercial puntual o recurrente
**Idiomas:** inglés (por defecto) y español, cada uno con su URL final
**Fecha:** octubre de 2026
**Estado:** construida, verificada y lista para cargar datos reales. No lanzar campañas hasta cerrar el checklist de la sección 9.

---

## 1. Resumen ejecutivo

Se construyó una landing estática bilingüe, rápida y medible, pensada para convertir tráfico de búsqueda móvil en solicitudes de cotización o llamadas, y para que cada lead llegue a GoHighLevel con su origen de Google Ads (GCLID) intacto.

| Indicador | Resultado |
| --- | --- |
| Pruebas automáticas (sección 12 del brief) | **161 de 161 OK** |
| Lighthouse móvil · Rendimiento | **99** (EN y ES) |
| Lighthouse móvil · Accesibilidad | **100** (EN y ES) |
| Lighthouse móvil · Buenas prácticas | **96** (único aviso: el 404 del logo pendiente) |
| Lighthouse móvil · SEO | 54 (esperado: `noindex` activo y `hreflang` relativos hasta tener dominio) |
| LCP / CLS / TBT (móvil simulado) | 1,6–1,7 s / 0,004 / 0 ms |
| Peso HTML + CSS + JS por página | 107 KB EN · 108 KB ES (objetivo < 120 KB) |
| Scroll horizontal 320–1440 px | Ninguno |

---

## 2. Qué se construyó

### 2.1 Páginas

| Ruta | Idioma | Contenido |
| --- | --- | --- |
| `/` | EN | Landing completa |
| `/es/` | ES | Landing completa |
| `/thank-you/` · `/es/gracias/` | EN · ES | Confirmación, botón de llamada (si hay teléfono) y venta cruzada a pintura |
| `/privacy/` · `/es/privacidad/` | EN · ES | Placeholder legal ("This page is being updated.") |
| `/terms/` · `/es/terminos/` | EN · ES | Placeholder legal |

### 2.2 Secciones de la landing (en orden)

1. **Encabezado fijo:** logo, botón de idioma, teléfono click-to-call (si existe) y "Request a Quote".
2. **Hero:** H1 dinámico por grupo de anuncios, subtítulo, 3 viñetas, CTA y compromiso de devolver la llamada el mismo día hábil. Sin foto: composición abstracta en CSS.
3. **Two ways to work with us:** tarjetas Puntual / Recurrente (+ línea de frecuencias si se configura).
4. **What we clean:** pisos, vidrios, paredes, techos, con íconos de línea en cian.
5. **Why work with CSD:** 4 razones confirmadas por el cliente (+ link a pintura si hay URL).
6. **Spaces we clean:** chips por tipo de espacio.
7. **Our work:** galería con lightbox (solo con fotos reales; hoy oculta).
8. **How it works:** 4 pasos (5 si `siteVisit: true`).
9. **FAQ:** acordeón accesible + datos estructurados `FAQPage`.
10. **Tell us about your space:** formulario de cotización.
11. **Pie:** datos legales y de contacto desde `config.js`, links legales, idioma, ©.
12. **Barra inferior fija en móvil:** Call + Request a Quote; aparece después del hero y se oculta al llegar al formulario.

### 2.3 Funcionalidades clave

- **Titular por grupo de anuncios (`?h=`):** `office`, `janitorial`, `window`, `floor`. Se aplica con un script inline justo después del H1, antes del primer render (sin parpadeo). Lista blanca estricta: nunca se inserta texto de la URL. La clave mostrada viaja como `headline_variant`.
- **Atribución (`attribution.js`):** captura `gclid`, `gbraid`, `wbraid`, `utm_*` y `h`; guarda primer contacto 90 días; un click ID nuevo reemplaza al anterior; agrega `landing_page` y `referrer`. Si el storage está bloqueado: `sessionStorage` → memoria, sin errores.
- **Cambio de idioma:** conserva query string y hash; sin redirección automática por idioma del navegador; `hreflang` recíprocos; evento `language_switch`.
- **Formulario (`form.js`):**
  - Campos y opciones exactos del brief; valores enviados como claves en inglés iguales en ambos idiomas.
  - "Frecuencia" aparece solo con *Recurring*, con transición suave y anuncio para lectores de pantalla; si se oculta, se envía vacía.
  - Validación junto a cada campo, en el idioma de la página, foco al primer error, `aria-invalid` y `aria-describedby`.
  - Teléfono con formato (305) 555-0123 mientras se escribe, y envío también en E.164.
  - Antispam: campo trampa + descarte de envíos en menos de 3 s.
  - `lead_type` residencial/comercial; `service_line: "cleaning"`.
  - Envío configurable `cors-json` / `no-cors`, timeout de 10 s, botón "Sending…/Enviando…".
  - **Plan B:** si falla, mensaje con teléfono y email clicables. Nunca se pierde un lead en silencio.
  - Modo desarrollo sin webhook: `console.info` del payload y aviso "Webhook not configured" solo en localhost.
  - Redirección a gracias conservando el query string, después de que GTM confirme el evento (máx. 2 s).
- **Medición (`tracking.js`):** GTM solo si hay ID; `dataLayer` siempre inicializado; eventos `form_start`, `generate_lead` (con `user_data` para conversiones mejoradas), `lead_residential`, `click_to_call`, `language_switch`.
- **Degradación elegante:** todo lo que depende de `config.js` está oculto en el HTML y se revela solo con dato real. Sin teléfono no existe ningún `tel:`; sin galería, no existe la sección; nunca aparece "undefined", "null" ni "[PENDIENTE]".

---

## 3. Arquitectura técnica

- **Stack:** HTML5 + CSS + JavaScript vanilla con ES modules. Sin build, sin frameworks, sin npm en producción. Dependencias externas: Google Fonts (Inter) y GTM (solo con ID).
- **Páginas ya renderizadas por idioma:** el contenido está en el HTML (SEO y sin parpadeo); el JS solo completa datos de `config.js` y comportamiento.
- **Rutas relativas** en todo el sitio → funciona en GitHub Pages bajo subruta (verificado con `/csd-landing-cleaning/`).
- **`config.js` como fuente única** de datos editables.
- **Robustez:** cada bloque de `main.js` corre dentro de `safe()`; un error no rompe el resto. Las apariciones on-scroll tienen red de seguridad a los 6 s.
- **Rendimiento:** Inter se carga sin bloquear el render y con una fuente de respaldo con métricas ajustadas (CLS ≈ 0); sin imágenes pesadas; JS diferido (módulos).
- **Caché:** `?v=AAAAMMDD` en CSS y scripts de entrada; `.htaccess` incluido por si el sitio se mueve a Apache/Hostinger (GitHub Pages lo ignora).

```
assets/js/
├── config.js       datos editables
├── tracking.js     GTM + dataLayer
├── attribution.js  GCLID/UTM + persistencia
├── main.js         idioma, contenido condicional, galería, barra móvil, efectos
└── form.js         validación, envío, plan B, eventos de conversión
```

---

## 4. Identidad visual aplicada

- Colores exactos del manual (`#75FCE4`, `#7C00FF`, `#DF20B0`, `#0A0A0A`, `#FFFFFF`, `#A0A0A0`) + dos neutros derivados (`#141414`, `#262626`).
- **Contraste:** el blanco sobre magenta (4,22:1) solo pasa AA como texto grande; por eso el botón primario va en **19 px, peso 700** (único desvío del manual, comentado en el CSS). El violeta nunca se usa en texto. Ambas reglas se verifican automáticamente en las 8 páginas.
- **Tipografía:** Inter 400/600/700/800; H1 34→56 px, H2 26→40 px, H3 20 px; nada por debajo de 14 px (verificado).
- **Accesibilidad:** foco cian de 3 px, áreas táctiles ≥ 44×44 px (verificado), un solo H1, navegación por teclado, `skip link`, lightbox con `<dialog>` (Escape cierra y devuelve el foco).

---

## 5. Pase premium (skill `adrian-saenz-hostinger-premium-website`)

Después de la base funcional se aplicó la skill de diseño premium. Como la skill está pensada para sitios con más libertad visual, se usó **como filtro**: se tomó todo lo compatible con el brief y se descartó lo que lo contradice. **El brief del cliente tiene prioridad.**

### 5.1 Arquetipo elegido

**05 · Mouse-Reactive Gradient** (casi negro, casi blanco, un solo acento neón). Encaja de forma natural con el manual de CSD, así que no obliga a cambiar la marca. Se mantuvo Inter como tipografía (el arquetipo sugiere una display serif o mono, pero manda el manual).

### 5.2 Efectos incorporados (5, el máximo que recomienda la skill)

| Efecto | Detalle | Cuidado de marca / brief |
| --- | --- | --- |
| **Firma: brillo del hero que sigue al puntero** | Violeta y magenta difusos que siguen suavemente al mouse | Opacidad 10–20 %; solo se mueve en la mitad derecha (nunca detrás del texto); solo con puntero fino; estático con movimiento reducido |
| **"Squeegee" cian** | Una línea cian vertical recorre una vez la composición abstracta y "limpia" una bruma granulada | Metáfora de limpieza sin fotos; una sola vez, sin bucle; desactivado con movimiento reducido |
| **Halo cian en bordes de tarjetas** | El borde se ilumina donde está el puntero (modalidades, superficies, formulario) | Solo dispositivos con hover; punto de luz, no superficie |
| **Barra de progreso de lectura** | Hilo cian de 2 px arriba | Decorativo, `aria-hidden` |
| **Grano sutil** | Textura al 5 % en hero y bloque de cotización | Da profundidad sin peso (SVG inline) |

Refinamientos adicionales: numeración editorial de secciones (01–07, decorativa e invisible para lectores de pantalla), aparición escalonada de listas (fade + 8 px por elemento), línea de "How it works" que se dibuja al aparecer, apertura suave del FAQ donde el navegador lo soporta, hover "pop-up" del CTA y subrayado animado en links con flecha.

### 5.3 Reglas de robustez de la skill que se aplicaron

- `safe()` por cada bloque de inicialización.
- IntersectionObserver con umbral 0,01 + red de seguridad a los 6 s.
- `overflow-x: clip` en lugar de `hidden` (no rompe `position: sticky` del bloque de cotización).
- `100svh` para el alto del hero en escritorio.
- Fallback sólido para `backdrop-filter` en el encabezado.
- Montajes idempotentes (galería, antes/después, halos).
- Contenido crítico escrito en el HTML; el JS solo enriquece.
- `?v=` en CSS/JS + `.htaccess` de la skill.

### 5.4 Lo que se descartó de la skill y por qué

| Recomendación de la skill | Decisión | Motivo |
| --- | --- | --- |
| Fotos de stock de Openverse | No | Brief: solo fotos reales de CSD |
| Parallax, cursor personalizado | No | Prohibidos por el brief (4.5) |
| GSAP / Lenis / Three.js | No | Brief: sin librerías de animación; se logró todo con CSS + JS nativo |
| Splash / loader | No | Retrasaría el contenido del hero |
| Split-text, contadores, marquee | No | Brief: animaciones mínimas; sin contadores |
| IIFE en lugar de ES modules | No | El brief pide ES modules; el sitio se publica en GitHub Pages (no se abre con `file://`). Riesgo de caché mitigado con `?v=` |
| No condicionar animaciones a `prefers-reduced-motion` | Parcial | El brief exige respetarlo: las apariciones, el squeegee y el brillo del hero se desactivan; los hovers (color, borde) se mantienen |
| Todo en WebP | Parcial | Las imágenes Open Graph quedan en JPG porque WhatsApp, Facebook y LinkedIn no leen WebP de forma confiable. Las fotos de trabajos sí deben ir en WebP/AVIF |

El verificador de la skill (`verify_project.py`) solo reporta esas desviaciones intencionales (módulos, JPG de OG, logo pendiente y ausencia de `lib/`).

---

## 6. Decisiones tomadas por cuenta propia

1. **H1 por grupo de anuncios con script inline** después del `<h1>`, con las variantes en atributos `data-h-*` del propio HTML: evita el parpadeo que tendría un módulo diferido.
2. **`noindex` escrito en el HTML** (no solo por JS), porque Google puede decidir sin ejecutar JavaScript. Para indexar hay que borrar la línea en los 8 HTML y poner `noindex: false`.
3. **CTA del encabezado oculto por debajo de 640 px:** en móvil no entra con el texto en 19 px (exigido por contraste). El CTA del hero y la barra inferior cubren esa función.
4. **Texto de los botones primarios puede partirse en dos líneas** en pantallas < 480 px (ej. "SOLICITAR COTIZACIÓN" en la barra inferior junto a "Llamar"), en lugar de bajar el tamaño por debajo de 19 px.
5. **Logo faltante:** el `<img>` apunta a `assets/img/logo-csd.svg`; si no carga, se muestra un texto neutro "CSD Good Services" en Inter (no es una recreación del logo; desaparece al subir el archivo).
6. **Copyright sin `legalName`:** muestra "CSD Good Services" (nombre comercial confirmado) para no dejar "© 2026" solo.
7. **Mensajes de error del formulario y textos de accesibilidad** (no estaban en el brief) escritos de forma neutra, con "usted" en español.
8. **Mensaje de falla con datos parciales:** si falta teléfono o email, se usa la variante con el dato disponible; si faltan ambos, "Please try again in a few minutes" / "Inténtelo de nuevo en unos minutos".
9. **Ubicación `hero`** no se usó: el hero no tiene botón de llamada, así que `click_to_call` mantiene exactamente las ubicaciones del brief.
10. **Venta cruzada sin URL:** el texto informativo se mantiene (es verdadero) y solo se omite el link.
11. **Dos imágenes Open Graph** (EN y ES), cada una con su H1, generadas por script; incluyen el logo automáticamente cuando exista.
12. **Ícono de "Techos":** se dibujó una lámpara colgando de un techo interior (coherente con el pendiente de confirmar que son techos interiores).
13. **Selector "Property type"** con opción inicial "—" en lugar de un texto inventado.
14. **JSON-LD `LocalBusiness`** solo si hay `legalName` y (teléfono o dirección); el horario se publica como texto libre en `openingHours`.
15. **`.nojekyll`** para que GitHub Pages sirva el sitio tal cual.

---

## 7. Verificación realizada

Script: `node tools/verify.mjs` (Playwright, Chromium headless, sitio servido bajo `/csd-landing-cleaning/`).

| Prueba del brief | Resultado |
| --- | --- |
| 12.1 Capturas 360/768/1440, EN y ES | Revisadas (hero, modalidades, barra móvil, formulario, pie). Se corrigieron: desborde del formulario a 320–360 px, huérfana "a" en el H1 español, separadores del pie en móvil |
| 12.2 Subruta | 11 links internos y todos los recursos OK (salvo el logo pendiente) |
| 12.3a Comercial recurrente | Frecuencia aparece; payload con `recurring`, `weekly`, `["floors","windows"]`, `phone_e164`, `commercial`, `janitorial`, gclid y UTM; `generate_lead` con `user_data`; redirige a `thank-you/` con el query string |
| 12.3b Comercial puntual | Frecuencia oculta y enviada vacía |
| 12.3c Residencial | `lead_residential` sin `user_data`; no se dispara `generate_lead` |
| 12.3d Validación | Errores junto a cada campo, en el idioma correcto, foco al primero (EN y ES) |
| 12.3e Antispam | Campo trampa y envío < 3 s descartados |
| 12.3f Falla | Mensaje con teléfono y email a los ~10 s |
| 12.4 Atribución | gclid persiste de EN a ES sin parámetros; con storage bloqueado, sin errores |
| 12.5 Titulares | 4 claves × 2 idiomas OK; `<script>`, claves desconocidas, `constructor` y `__proto__` → H1 por defecto |
| 12.6 Config vacía | Sin `tel:`, sin galería, sin frecuencias, sin scripts de Google, 4 pasos; sin "[PENDIENTE]/undefined/null" |
| 12.6b Config completa | Teléfonos, galería + lightbox (Escape devuelve el foco), 5 pasos, GTM, JSON-LD, venta cruzada |
| 12.7 Palabras prohibidas | Ninguna en HTML/CSS/JS (los nombres de campo `guarantee*` de `config.js` son la única excepción, pedida por el brief) |
| 12.8 Contraste | Sin blanco sobre magenta < 19 px/700 ni texto violeta, en 8 páginas × 2 anchos |
| 12.9 Lighthouse móvil | 99 / 100 / 96 / 54 (SEO bajo por `noindex`, esperado) |
| Extras | Texto ≥ 14 px, áreas táctiles ≥ 44 px, sin scroll horizontal de 320 a 1440 px, peso < 120 KB |

---

## 8. Pendientes (`[PENDIENTE]`)

### En `assets/js/config.js`

| Campo | Qué falta |
| --- | --- |
| `legalName` | Nombre legal exacto ("CSD Good Services, LLC", "CSD Good Service LLC" o "CSD Good Services LLC") |
| `phone`, `phoneE164` | Teléfono en (305) 555-0123 y +13055550123 |
| `email`, `address` | Email y dirección |
| `hours_en`, `hours_es` | Horario real de atención |
| `webhookUrl` | Inbound Webhook del workflow de GoHighLevel (y definir `webhookMode` tras la prueba de CORS) |
| `gtmId` | Contenedor GTM |
| `crossSellUrl_en`, `crossSellUrl_es` | URLs de la landing de pintura |
| `siteVisit` | ¿CSD visita el lugar antes de cotizar? |
| `recurringFrequencies_en/_es` | Frecuencias que CSD ofrece realmente |
| `heroImage`, `gallery`, `beforeAfter` | Fotos reales (opcional) |

### En el contenido y los archivos

- **Logo oficial** → `assets/img/logo-csd.svg` (después, `node tools/og-image.mjs`).
- **Isotipo** para reemplazar el favicon provisorio.
- **Textos legales** (privacidad y términos, EN/ES) revisados por abogado. No lanzar campañas sin esto.
- **Consentimiento del formulario:** revisión legal; si piden casilla obligatoria, se agrega.
- **Email de confirmación:** la página de gracias dice que se envió; el workflow de GHL debe enviarlo.
- **"Ceilings / Techos":** confirmar que son techos interiores.
- **Dominio final:** convertir `hreflang` y `og:image` a URLs absolutas.
- **GTM:** conversión de Google Ads sobre `generate_lead`, GA4 y Consent Mode.

---

## 9. Checklist de lanzamiento

- [ ] Datos legales y de contacto cargados.
- [ ] Horario real.
- [ ] Textos legales revisados.
- [ ] Webhook probado de punta a punta en GoHighLevel (gclid, etiqueta puntual/recurrente, email de confirmación).
- [ ] GTM publicado con la conversión sobre `generate_lead` (y conversiones mejoradas).
- [ ] Fotos reales cargadas (o galería oculta, que es válido).
- [ ] Logo oficial + OG regenerada.
- [ ] "Ceilings / Techos" confirmado.
- [ ] `noindex` revisado.
- [ ] `node tools/verify.mjs` en 0 fallas con la configuración real.
- [ ] Prueba final en un celular real con `?gclid=TEST&h=office` en EN y ES.

---

## 10. Cómo seguir iterando

1. Leer `AGENTS.md` (reglas de contenido, marca y medición).
2. Cambiar datos solo en `config.js`; cambios de copy solo si los pide Jared y en los dos idiomas a la vez.
3. Correr `node tools/verify.mjs` y `node tools/screenshots.mjs` antes de cada commit.
4. Si se cambia CSS/JS, actualizar `?v=AAAAMMDD` en los 8 HTML.

### Ideas de optimización para próximas iteraciones (requieren aprobación)

- Variante del hero con foto real de un espacio terminado cuando haya material (`heroImage`).
- Test A/B de titulares por grupo de anuncios usando `headline_variant` como dimensión en GA4.
- Valores de conversión diferenciados puntual vs. recurrente en GTM a partir de `cleaning_type`.
- Bloque de reseñas de Google cuando el perfil tenga reseñas reales (ya está construido y apagado).
