# CSD Good Services · Landing de limpieza comercial (Miami)

Landing de captación para campañas de **Google Ads (búsqueda)** del servicio de **limpieza comercial puntual o recurrente** de CSD Good Services. Inglés por defecto (`/`) y español (`/es/`), cada idioma con su propia URL final.

- Sitio estático **sin build**: HTML5 + CSS + JavaScript vanilla (ES modules).
- Se publica tal cual en **GitHub Pages**, también bajo subruta (`usuario.github.io/csd-landing-cleaning/`). Todas las rutas internas son relativas.
- Leads → **GoHighLevel** (Inbound Webhook de un workflow), con GCLID/UTM para conversiones offline.
- Medición → **Google Tag Manager** vía `dataLayer` (solo si hay ID).

> Documentación completa del trabajo, decisiones y pendientes: [`DOCUMENTACION.md`](DOCUMENTACION.md).
> Reglas para quien edite el sitio (personas o agentes): [`AGENTS.md`](AGENTS.md).

---

## Estructura

```
/
├── index.html                  (EN)
├── thank-you/index.html        (EN)
├── privacy/index.html          (EN, placeholder legal)
├── terms/index.html            (EN, placeholder legal)
├── es/
│   ├── index.html              (ES)
│   ├── gracias/index.html      (ES)
│   ├── privacidad/index.html   (ES, placeholder legal)
│   └── terminos/index.html     (ES, placeholder legal)
├── assets/
│   ├── css/styles.css
│   ├── js/config.js            ← ÚNICO archivo de configuración
│   ├── js/main.js              (idioma, contenido condicional, barra móvil, galería, efectos)
│   ├── js/attribution.js       (GCLID/UTM y persistencia)
│   ├── js/form.js              (validación, lógica condicional, envío, plan B)
│   ├── js/tracking.js          (GTM y dataLayer)
│   └── img/
│       ├── logo-csd.svg        [PENDIENTE: archivo oficial del cliente]
│       ├── favicon.svg         (provisorio: "C" cian sobre negro)
│       ├── og-image.jpg        (EN, 1200×630)
│       ├── og-image-es.jpg     (ES, 1200×630)
│       └── work/               (fotos reales de trabajos)
├── tools/                      (solo desarrollo: servidor, capturas, OG, verificación)
├── robots.txt
├── .htaccess                   (solo aplica si se migra a Apache/Hostinger; GitHub Pages lo ignora)
├── .nojekyll
├── README.md · AGENTS.md · CLAUDE.md · GEMINI.md · DOCUMENTACION.md
```

## Correr en local

Los ES modules necesitan un servidor HTTP (abrir el archivo con doble clic no funciona).

```bash
npx serve .                    # o:
python3 -m http.server 8080    # o, para simular GitHub Pages bajo subruta:
node tools/serve.mjs 8080 /csd-landing-cleaning/
```

Con `webhookUrl` vacío, el formulario no envía nada: muestra el payload con `console.info` y, en `localhost`, un aviso discreto "Webhook not configured".

## Publicar en GitHub Pages

1. Subir el repositorio a GitHub.
2. *Settings → Pages → Build and deployment*: **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Queda en `https://<usuario>.github.io/<repo>/`. Las rutas relativas funcionan bajo esa subruta.
4. **Dominio propio:** en *Settings → Pages → Custom domain*, escribir el dominio (ej. `limpieza.csdgoodservices.com`), crear el registro DNS `CNAME` hacia `<usuario>.github.io` y activar *Enforce HTTPS*. GitHub crea el archivo `CNAME` en la raíz.
5. **Caché:** GitHub Pages cachea ~10 minutos. Los `<link>`/`<script>` llevan `?v=AAAAMMDD`; en cada cambio de CSS/JS, actualizar esa fecha en los HTML.

## Qué se edita en `assets/js/config.js`

| Campo | Para qué | Si está vacío |
| --- | --- | --- |
| `legalName` | Pie, © y JSON-LD | Se oculta; el © usa "CSD Good Services" |
| `phone` / `phoneE164` | Click-to-call en header, barra móvil, FAQ, pie, gracias, error | No aparece ningún `tel:` |
| `email`, `address`, `hours_en/_es` | Pie y mensaje de error | Se ocultan |
| `webhookUrl` / `webhookMode` | Envío a GoHighLevel | Modo desarrollo |
| `gtmId` | Contenedor GTM (`GTM-XXXXXXX`) | No se carga ningún script de Google |
| `crossSellUrl_en/_es` | Links a la landing de pintura | El texto queda, sin link |
| `heroImage` | Foto real en el hero | Composición abstracta en CSS |
| `gallery` | Sección "Our work" | La sección no existe |
| `beforeAfter` | Slider antes/después | No se muestra |
| `siteVisit` | Paso "We visit your space" | 4 pasos |
| `recurringFrequencies_en/_es` | Línea bajo "Recurring cleaning" | No se muestra |
| `optionalBlocks` + textos | Reseñas, garantía, licencia | Apagados, sin rastro en el HTML |
| `noindex` | Indexación | Ver nota abajo |

**Galería:** `{ src: "assets/img/work/oficina-1.webp", srcset: "assets/img/work/oficina-1-800.webp 800w, assets/img/work/oficina-1.webp 1600w", width: 1600, height: 1200, alt_en, alt_es, caption_en, caption_es }`. Solo fotos reales de trabajos de limpieza comercial de CSD, en WebP o AVIF.

**noindex:** el `<meta name="robots" content="noindex, follow">` está escrito en los 8 HTML (Google no siempre ejecuta el JS antes de decidir). Para indexar: borrar esa línea en los 8 archivos **y** poner `noindex: false`.

**GTM `<noscript>`:** es opcional (sin JavaScript tampoco funciona el formulario). Si se quiere, pegar el iframe oficial con el mismo ID donde está el comentario, justo después de `<body>`.

## Probar el webhook y diagnosticar CORS

1. En GoHighLevel: *Automation → Workflows → New → trigger "Inbound Webhook"*. Copiar la URL en `webhookUrl`.
2. Enviar el formulario una vez desde la landing publicada (o en local). En GHL, en el trigger, usar *Fetch sample requests* para mapear los campos (`cleaning_type`, `frequency`, `areas`, `lead_type`, `gclid`, etc.).
3. **Cómo detectar el bloqueo de CORS:** abrir DevTools → Console. Si aparece algo como
   `Access to fetch at 'https://services.leadconnectorhq.com/hooks/…' from origin '…' has been blocked by CORS policy`,
   el webhook no devuelve cabeceras CORS. En Network la petición figura como `(failed)` o `CORS error`, y la landing muestra el mensaje de "We couldn't send your request…".
4. **Qué hacer:** cambiar `webhookMode: "no-cors"`. El cuerpo viaja como `text/plain` con el JSON; la respuesta es opaca, así que se toma como enviada si la petición no falla. Verificar en GHL que el workflow recibe y parsea el JSON (en la ejecución del workflow, el body debe verse con los campos).
5. Si en `no-cors` GHL no parsea el body, la alternativa es un proxy propio (Cloudflare Worker o similar) que reciba el JSON con CORS y lo reenvíe a GHL.

## Medición (dataLayer)

| Evento | Cuándo | Parámetros |
| --- | --- | --- |
| `form_start` | Primer foco en el formulario (una vez por página) | `form_id: "cleaning_quote"`, `language` |
| `generate_lead` | Envío correcto, `lead_type = "commercial"` | `form_id`, `language`, `service_line`, `cleaning_type`, `frequency`, `areas`, `property_type`, `timeline`, `headline_variant`, `user_data { email, phone_number (E.164) }` |
| `lead_residential` | Envío correcto, `lead_type = "residential"` | Lo mismo, **sin** `user_data` |
| `click_to_call` | Clic en cualquier `tel:` | `location` (header, sticky_bar, faq, footer, thank_you, form_error), `language` |
| `language_switch` | Clic en el botón de idioma | `from`, `to` |

- **La conversión de Google Ads se configura solo sobre `generate_lead`.** `lead_residential` existe aparte para que Google no aprenda a traer particulares.
- `cleaning_type` viaja en `generate_lead` para asignar, si se decide, valores distintos a puntual y recurrente **en GTM** (no en el código).
- Antes de redirigir a la página de gracias se espera la confirmación de GTM (`eventCallback`, `eventTimeout: 2000`). La página de gracias **no** dispara conversión.
- Conversión de Google Ads, GA4 y Consent Mode se configuran **en GTM**, no en este repositorio.

## Herramientas de desarrollo (`tools/`)

Requieren Node 18+ y Playwright (`npm i -g playwright` o `PLAYWRIGHT_PATH=/ruta/a/playwright`). No se usan en producción.

```bash
node tools/verify.mjs        # sección 12 del brief: formulario, atribución, titulares, config vacía, copy, contraste, subruta…
node tools/screenshots.mjs   # capturas EN/ES en 360×800, 768×1024 y 1440×900 → tools/out/
node tools/og-image.mjs      # regenera og-image(.jpg|-es.jpg); incluye el logo si existe
```

## Checklist de lanzamiento (bloqueantes)

- [ ] **Datos legales y de contacto** en `config.js`: `legalName` exacto, `phone`, `phoneE164`, `email`, `address`.
- [ ] **Horario real** (`hours_en`, `hours_es`).
- [ ] **Textos legales revisados por abogado** en `privacy/`, `terms/`, `es/privacidad/`, `es/terminos/` (y revisión del texto de consentimiento del formulario).
- [ ] **Webhook probado de punta a punta en GoHighLevel** (incluye `gclid`, etiqueta puntual/recurrente y email de confirmación al lead).
- [ ] **GTM** con la conversión de Google Ads configurada sobre `generate_lead` (conversiones mejoradas con `user_data`).
- [ ] **Fotos reales** cargadas (o la galería sigue oculta).
- [ ] **Logo oficial** en `assets/img/logo-csd.svg` (y volver a correr `node tools/og-image.mjs`).
- [ ] Confirmar que **"Ceilings / Techos"** son techos interiores y no limpieza de techos exteriores.
- [ ] **`noindex`** revisado (por defecto activo).
- [ ] URLs de **venta cruzada** a la landing de pintura (`crossSellUrl_en/_es`).
- [ ] Dominio final: convertir `hreflang` y `og:image` a URLs absolutas (hoy son relativas).
- [ ] Isotipo oficial para el **favicon** (el actual es provisorio).
