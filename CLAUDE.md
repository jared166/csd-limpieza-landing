# Guía para agentes y editores · Landing de limpieza comercial CSD

Este archivo es la referencia para cualquier sesión de trabajo (Claude Code, Gemini CLI u otro agente, y también personas). `CLAUDE.md` y `GEMINI.md` tienen el mismo contenido.

## Contexto en 30 segundos

- Landing de **CSD Good Services** (pintura y limpieza comercial en Miami). Esta página es **solo limpieza comercial**, puntual o recurrente.
- Tráfico de **Google Ads (búsqueda)**, mayormente móvil. EN por defecto (`/index.html`), ES en `/es/index.html`.
- Objetivo único: completar el formulario de cotización (`#quote`) o llamar.
- Leads → GoHighLevel (webhook). Ventas cerradas vuelven a Google Ads como conversiones offline → el **GCLID viaja con cada lead**.
- Sitio estático sin build (HTML + CSS + JS vanilla con ES modules), publicable en GitHub Pages bajo subruta. **Todas las rutas internas son relativas.**
- Toda la configuración editable vive en `assets/js/config.js`. No se toca el HTML para cambiar un teléfono, un link o un ID.

## Regla de oro del copy

**El copy se cambia solo si Jared lo pide, en los dos idiomas a la vez.**
El texto de las páginas es literal del brief (sección 8). Se pueden ajustar saltos de línea y jerarquía visual; no se reescribe, no se resume y no se agregan frases de venta.

## Reglas de contenido que no se rompen

1. **El copy se usa literal.** No reescribir, no resumir, no agregar frases de venta.
2. **Prohibido afirmar** (no hay respaldo):
   - Precios, "desde", "cheap", "affordable", "low price", "barato" ni "mejor precio".
   - Garantías de cualquier tipo.
   - Plazos, "on time" ni "fast".
   - "Licensed", "insured", "bonded" ni años de experiencia.
   - Cantidad de clientes o contratos.
   - "#1", "best" ni "top rated".
   - "Free estimate" o "free quote": no está confirmado que la cotización sea gratis.
   - "Eco-friendly", "green", "hospital-grade", productos o equipos específicos.
   - Frecuencias concretas como oferta (diaria, semanal…). En el formulario son una pregunta al lead, no una promesa.
3. **Sin reseñas, testimonios, estrellas, logos de clientes, contadores, temporizadores ni sellos.** Los bloques opcionales (`config.optionalBlocks`) quedan apagados por defecto y solo se encienden con contenido real.
4. **Solo fotos reales de trabajos de limpieza comercial de CSD.** Nada de stock presentado como trabajo propio, nada residencial, nada generado por IA. Sin fotos, la galería no se muestra.
5. **Español:** neutro, con "usted", para el público hispano de Miami. "Cotización" (no "presupuesto" ni "estimado"); "almacenes" (no "bodegas").
6. **Inglés:** de EE. UU. "Janitorial" solo aparece en el titular de `?h=janitorial`.
7. **Formatos:** teléfono (305) 555-0123; tamaños en pies cuadrados (sq ft).
8. Nada marcado `[PENDIENTE]` se rellena con datos inventados ni aparece como texto en la página pública.
9. No agregar chat, pop-ups, WhatsApp flotante ni banners promocionales.

## Identidad visual (resumen del manual de CSD)

### Colores

| Token | Valor | Uso |
| --- | --- | --- |
| `--csd-cyan` | `#75FCE4` | Acentos secundarios, hover, íconos, foco |
| `--csd-violet` | `#7C00FF` | **Solo decorativo**: brillos difusos al 10–20 %. Nunca texto |
| `--csd-magenta` | `#DF20B0` | Acción principal (CTA) |
| `--csd-bg` | `#0A0A0A` | Fondo dominante |
| `--csd-white` | `#FFFFFF` | Títulos y cuerpo |
| `--csd-gray` | `#A0A0A0` | Texto secundario |
| `--csd-surface` | `#141414` | Tarjetas (derivado) |
| `--csd-border` | `#262626` | Bordes finos (derivado) |

### Contraste (WCAG 2.x)

| Combinación | Contraste | Regla |
| --- | --- | --- |
| Blanco sobre `#0A0A0A` | 19,80:1 | Libre |
| `#A0A0A0` sobre `#0A0A0A` | 7,57:1 | Libre para texto secundario |
| Cian sobre `#0A0A0A` | 15,84:1 | Libre como acento de texto |
| Magenta sobre `#0A0A0A` | 4,69:1 | Pasa AA; etiquetas cortas |
| `#0A0A0A` sobre magenta | 4,69:1 | Pasa AA |
| **Blanco sobre magenta** | **4,22:1** | **Solo texto grande: botón primario en 19 px, peso 700** |
| **Violeta sobre `#0A0A0A`** | **3,11:1** | **Nunca para texto** |

El botón primario usa **blanco, 19 px mínimo, peso 700, mayúsculas, tracking 1,5 px**: es el único desvío del manual (700 en vez de 600), comentado en el CSS.

### Tipografía

- **Inter** (Google Fonts) 400, 600, 700, 800; carga sin bloquear el render y con respaldo de métricas ajustadas.
- H1/H2 en 800 blanco. Cuerpo 400, 16–18 px, interlineado 1,5. Nada de Light.
- Etiquetas y botones en 600, mayúsculas, tracking 1,5–2 px (salvo el botón primario).
- H1 34→56 px (interlineado 1,05), H2 26→40 px, H3 20 px. **Nunca texto de menos de 14 px.**

### Logo

- Usar **solo el archivo oficial**: `assets/img/logo-csd.png` (PNG transparente provisto por el cliente, recortado solo en su margen transparente). Si llega un SVG o un PNG de mayor resolución, reemplazarlo manteniendo la proporción. **No recrearlo, no redibujarlo, no reescribir "CSD" ni "GOOD SERVICES LLC" con otra fuente.**
- Ancho mínimo 120 px. Área de resguardo = altura de la "D" del monograma. Sin sombras, biseles ni trazos. Siempre sobre `#0A0A0A`.
- Tamaño en pantalla: 120 px en móvil y 132 px en escritorio (el archivo tiene 266 px reales; más grande se vería borroso en pantallas 2×).
- El encabezado es sólido `#0A0A0A` y mide 68 px en móvil / 84 px en escritorio para que el logo respire (el brief pedía 60 px en móvil; se subió por el logo).
- Si el archivo no cargara, el `<img>` muestra un texto de respaldo neutro (`.brand__fallback`).

### Sistema visual

- Negro dominante; los neones son "puntos de luz", no superficies grandes.
- Botón primario pill magenta, 52 px de alto, ancho completo en móvil; hover con borde/brillo cian; foco con outline cian de 3 px.
- Tarjetas `#141414` con borde `#262626` y radio 16 px. Íconos SVG inline de línea, 1,75 px, cian. Sin icon fonts ni emojis.
- Animaciones mínimas: aparición con fade + 8 px; se respeta `prefers-reduced-motion`. **Nada de parallax ni cursores personalizados.**
- Capa premium vigente (ver `DOCUMENTACION.md`): brillo del hero que sigue al puntero (solo mitad derecha y solo con puntero fino), línea cian que "limpia" la composición abstracta, halo cian en bordes de tarjetas, barra de progreso de 2 px, grano sutil y numeración editorial de secciones. No sumar más efectos sin pedido explícito.

## Medición (eventos del dataLayer)

| Evento | Cuándo | Parámetros |
| --- | --- | --- |
| `form_start` | Primer foco en el formulario, una vez por página | `form_id: "cleaning_quote"`, `language` |
| `generate_lead` | Envío correcto con `lead_type = "commercial"` | `form_id`, `language`, `service_line: "cleaning"`, `cleaning_type`, `frequency`, `areas`, `property_type`, `timeline`, `headline_variant`, `user_data { email, phone_number }` (E.164) |
| `lead_residential` | Envío correcto con `lead_type = "residential"` | Lo mismo, sin `user_data` |
| `click_to_call` | Clic en cualquier `tel:` | `location` (header, sticky_bar, faq, footer, thank_you, form_error), `language` |
| `language_switch` | Clic en el botón de idioma | `from`, `to` |

- La conversión de Google Ads se configura **solo** sobre `generate_lead`.
- No asignar valores de conversión en el código: se hace en GTM.
- Email y teléfono **solo** dentro de `user_data` en el dataLayer. Nunca en URLs, query strings ni `console.log` en producción.
- La página de gracias no dispara conversiones.

## Convenciones técnicas

- Cada idioma es una página HTML ya renderizada. Cualquier cambio de estructura se hace **en las dos** (`index.html` y `es/index.html`; `thank-you/` y `es/gracias/`; legales).
- Los valores del formulario son claves en inglés iguales en ambos idiomas (`recurring`, `weekly`, `floors`…). Cambia la etiqueta visible, nunca la clave.
- Elementos que dependen de `config.js` llevan `hidden` en el HTML y los revela `main.js` solo si hay dato.
- `main.js` corre cada bloque dentro de `safe()`: un error no rompe el resto.
- Al cambiar CSS/JS, actualizar `?v=AAAAMMDD` en los `<link>`/`<script>` de los 8 HTML.
- Sin frameworks, Tailwind, npm en producción ni librerías de animación. Única dependencia externa: Google Fonts y (si hay ID) GTM.
- Peso objetivo: < 120 KB de HTML + CSS + JS por página.

## Verificación antes de cada commit

1. `node tools/verify.mjs` → debe terminar con **0 fallas**. Cubre: subruta sin links rotos, formulario (recurrente, puntual, residencial, validación, antispam, falla a los 10 s), atribución entre idiomas y con storage bloqueado, titulares `?h=`, configuración vacía y completa, palabras prohibidas, contraste, tamaños mínimos, scroll horizontal 320–1440 y peso.
2. `node tools/screenshots.mjs` → revisar las capturas de `tools/out/` (360×800, 768×1024, 1440×900, EN y ES): hero, tarjetas de modalidad, barra inferior móvil, formulario y pie.
3. Comparar a mano cualquier texto tocado con la sección 8 del brief, en los dos idiomas.
4. Si cambió algo de rendimiento: Lighthouse móvil ≥ 90 en rendimiento, accesibilidad y buenas prácticas (el SEO baja por `noindex`, es esperado).
5. No hacer push ni crear repositorios remotos sin que Jared lo pida.
