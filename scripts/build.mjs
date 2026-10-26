// Urbacan Real Estate — generador del sitio estático
// Lee sitio.json y propiedades.json y crea la web completa en la carpeta _site/.
// Uso: node scripts/build.mjs   (variables opcionales: SITE_URL, BASE_PATH)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = path.join(RAIZ, "_site");
const leerJSON = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, f), "utf8"));

const sitio = leerJSON("sitio.json");
const todas = leerJSON("propiedades.json").propiedades;
const C = sitio.contacto;

const SITE_URL = (process.env.SITE_URL || (sitio.provisional ? sitio.url_provisional : sitio.url_definitiva)).replace(/\/$/, "");
const BASE = process.env.BASE_PATH !== undefined ? process.env.BASE_PATH.replace(/\/$/, "") : new URL(SITE_URL).pathname.replace(/\/$/, "");
const PROVISIONAL = process.env.PROVISIONAL !== undefined ? process.env.PROVISIONAL === "1" : !!sitio.provisional;
const ENLACE_MINIATURA = sitio.miniatura_enlaza_a || "ficha"; // "ficha" o "landing"

let sharp = null, QR = null;
try { sharp = (await import("sharp")).default; } catch { console.warn("· sharp no disponible: se copian las fotos sin optimizar"); }
try { QR = (await import("qrcode")).default; } catch { console.warn("· qrcode no disponible: la tarjeta se genera sin QR"); }

// ---------- utilidades ----------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const u = (p) => `${BASE}${p}`;                  // ruta interna
const abs = (p) => `${SITE_URL}${p}`;            // URL absoluta
const euros = (n) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" }).format(n) + " €";
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const fechaLarga = (iso) => { const [a, m, d] = iso.split("-").map(Number); return `${d} de ${MESES[m - 1]} de ${a}`; };
const entregaTxt = (q) => {
  if (!q) return null;
  const m = /^Q([1-4])\s*(\d{4})$/.exec(q.trim());
  if (!m) return q;
  return `${["1.er", "2.º", "3.er", "4.º"][+m[1] - 1]} trimestre de ${m[2]}`;
};
const wa = (texto) => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(texto)}`;
const mkdir = (d) => fs.mkdirSync(d, { recursive: true });
const escribir = (rel, contenido) => { const f = path.join(SALIDA, rel); mkdir(path.dirname(f)); fs.writeFileSync(f, contenido); };
const hash = (f) => crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex").slice(0, 8);

const activas = todas.filter((p) => p.estado === "activa").sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
const porRegion = (r) => activas.filter((p) => p.region === r);
const REGIONES = {
  canarias: { nombre: "Canarias", ruta: "/canarias/", sub: "Gran Canaria" },
  peninsula: { nombre: "Península", ruta: "/peninsula/", sub: "Alicante · Murcia · Almería" },
};

// ---------- iconos ----------
const I = {
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z"/></svg>',
  tel: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 3h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2L19 13.5V17a2 2 0 0 1-2 2A15 15 0 0 1 3 5a2 2 0 0 1 2-2Z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3.5 6 8.5 7 8.5-7"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor"/></svg>',
  flecha: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
  ant: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5 8 12l7 7"/></svg>',
  sig: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 5 7 7-7 7"/></svg>',
  cerrar: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 5l14 14M19 5 5 19"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
  mapa: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  ext: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  web: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  persona: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
};

// Emblema: skyline dorado dentro de un círculo fino (de la tarjeta digital)
const EMBLEMA = (fondo = true) => `<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${fondo ? '<circle cx="70" cy="70" r="66" fill="#14120F"/>' : ""}<g transform="translate(70,76)"><circle r="46" fill="none" stroke="#C9A063" stroke-width="2"/><g fill="#C9A063"><rect x="-32" y="8" width="8" height="24"/><rect x="-21" y="-3" width="9" height="35"/><rect x="-9" y="-15" width="10" height="47"/><rect x="3" y="-25" width="5" height="57"/><polygon points="5.5,-34 3,-25 8,-25"/><rect x="11" y="-11" width="9" height="43"/><rect x="23" y="0" width="8" height="32"/></g><rect x="-36" y="32" width="72" height="2" fill="#C9A063"/></g></svg>`;

// ---------- imágenes ----------
const ANCHOS = [480, 960, 1600];
const fotosHechas = new Map();
async function procesarFoto(origen, destinoBase) {
  // destinoBase: ruta relativa en _site sin extensión, p.ej. fotos/la-naval-80/01
  if (fotosHechas.has(destinoBase)) return fotosHechas.get(destinoBase);
  const info = { base: destinoBase, ancho: 1600, alto: 1200 };
  if (!fs.existsSync(origen)) { console.warn("  ! falta la foto", path.relative(RAIZ, origen)); info.falta = true; fotosHechas.set(destinoBase, info); return info; }
  mkdir(path.join(SALIDA, path.dirname(destinoBase)));
  if (sharp) {
    const meta = await sharp(origen).metadata();
    info.ancho = meta.width; info.alto = meta.height;
    for (const w of ANCHOS) {
      await sharp(origen).rotate().resize({ width: Math.min(w, meta.width), withoutEnlargement: true }).webp({ quality: w <= 480 ? 70 : 74, effort: 5 }).toFile(path.join(SALIDA, `${destinoBase}-${w}.webp`));
    }
  } else {
    for (const w of ANCHOS) fs.copyFileSync(origen, path.join(SALIDA, `${destinoBase}-${w}.webp`));
  }
  fotosHechas.set(destinoBase, info);
  return info;
}
async function imagenOG(origen, destinoRel) {
  if (!fs.existsSync(origen)) return null;
  mkdir(path.join(SALIDA, path.dirname(destinoRel)));
  if (sharp) await sharp(origen).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(SALIDA, destinoRel));
  else fs.copyFileSync(origen, path.join(SALIDA, destinoRel));
  return destinoRel;
}
const srcset = (info) => ANCHOS.map((w) => `${u("/" + info.base)}-${w}.webp ${w}w`).join(", ");
const imgTag = (info, alt, { sizes = "100vw", lazy = true, prioridad = false, clase = "" } = {}) =>
  `<img src="${u("/" + info.base)}-960.webp" srcset="${srcset(info)}" sizes="${sizes}" width="${info.ancho}" height="${info.alto}" alt="${esc(alt)}"${lazy ? ' loading="lazy" decoding="async"' : ""}${prioridad ? ' fetchpriority="high"' : ""}${clase ? ` class="${clase}"` : ""}>`;

const fotoOrigen = (p, archivo) => path.join(RAIZ, "fotos", p.id, archivo);
const fotoInfo = async (p, i = 0) => {
  const f = p.fotos[i]; const archivo = typeof f === "string" ? f : f.archivo;
  return procesarFoto(fotoOrigen(p, archivo), `fotos/${p.id}/${path.parse(archivo).name}`);
};
const fotoAlt = (p, i) => { const f = p.fotos[i]; return (typeof f === "object" && f.alt) ? `${p.titulo}: ${f.alt}` : `${p.titulo}, ${p.zona} — foto ${i + 1}`; };

// ---------- textos de precio ----------
const precioTexto = (p) => p.precio_tipo === "cerrado" ? euros(p.precio_desde) : `Desde ${euros(p.precio_desde)}`;
const notaPrecio = (p) => p.precio_tipo === "cerrado"
  ? `Impuestos y gastos de la compraventa no incluidos. Datos a ${fechaLarga(p.fecha_datos)}.`
  : `Precios desde, orientativos; impuestos y gastos no incluidos. Datos a ${fechaLarga(p.fecha_datos)}.`;

// ---------- plantilla base ----------
let CSS_V = "", JS_V = "";
function pagina({ titulo, descripcion, ruta, ogImagen, jsonld = [], cuerpo, claseBody = "", barra = "", sinFlotante = false, waTexto = C.whatsapp_texto, robots = null }) {
  const canonical = abs(ruta);
  const og = ogImagen ? abs("/" + ogImagen) : abs("/assets/img/og-urbacan.jpg");
  const robotsMeta = PROVISIONAL ? "noindex, nofollow" : (robots || "index, follow");
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta name="robots" content="${robotsMeta}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#14120F">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="${esc(sitio.nombre)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${u("/favicon.svg")}" type="image/svg+xml">
<link rel="icon" href="${u("/favicon-32.png")}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${u("/apple-touch-icon.png")}">
<link rel="preload" href="${u("/assets/fonts/jost-300.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${u("/assets/fonts/playfair-display-500.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${u("/assets/css/estilos.css")}?v=${CSS_V}">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body class="${claseBody}">
<a class="saltar" href="#contenido">Saltar al contenido</a>
${PROVISIONAL ? '<div class="aviso-provisional">Versión provisional en revisión</div>' : ""}
${cabecera(ruta)}
<main id="contenido">
${cuerpo}
</main>
${pie()}
${barra}
${sinFlotante ? "" : `<a class="wa-flotante" href="${wa(waTexto)}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp (se abre en una pestaña nueva)">${I.wa}</a>`}
<script src="${u("/assets/js/web.js")}?v=${JS_V}" defer></script>
</body>
</html>`;
}

function cabecera(ruta) {
  const links = [
    porRegion("canarias").length ? ["Canarias", "/canarias/"] : null,
    porRegion("peninsula").length ? ["Península", "/peninsula/"] : null,
    ["Cómo trabajamos", "/#como-trabajamos"],
    ["Contacto", "/#contacto"],
  ].filter(Boolean);
  const a = (t, r) => `<a href="${u(r)}"${ruta === r ? ' aria-current="page"' : ""}>${t}</a>`;
  return `<header class="cabecera">
  <div class="contenedor">
    <a class="marca" href="${u("/")}" aria-label="Urbacan Real Estate, inicio">${EMBLEMA()}<span><b>URBACAN</b><small>REAL ESTATE</small></span></a>
    <nav class="nav" aria-label="Principal">${links.map(([t, r]) => a(t, r)).join("")}</nav>
    <div class="cab-acciones">
      <button class="btn-menu" type="button" aria-expanded="false" aria-controls="menu-movil" aria-label="Abrir menú">${I.menu}</button>
    </div>
  </div>
  <nav id="menu-movil" class="menu-movil" aria-label="Menú móvil" hidden><ul>${links.map(([t, r]) => `<li>${a(t, r)}</li>`).join("")}</ul></nav>
</header>`;
}

function pie() {
  const anio = new Date().getFullYear();
  return `<footer class="pie">
  <div class="contenedor">
    <div>
      <a class="marca" href="${u("/")}" aria-label="Urbacan Real Estate, inicio">${EMBLEMA()}<span><b>URBACAN</b><small>REAL ESTATE</small></span></a>
      <p style="margin-top:1rem;max-width:38ch">${esc(sitio.lema)}.</p>
      <p>${esc(C.direccion)}</p>
    </div>
    <div>
      <h2>Propiedades</h2>
      <ul>
        ${porRegion("canarias").length ? `<li><a href="${u("/canarias/")}">Canarias</a></li>` : ""}
        ${porRegion("peninsula").length ? `<li><a href="${u("/peninsula/")}">Península</a></li>` : ""}
        <li><a href="${u("/tarjeta")}">Tarjeta de contacto</a></li>
      </ul>
    </div>
    <div>
      <h2>Contacto</h2>
      <ul>
        <li><a href="${wa(C.whatsapp_texto)}" target="_blank" rel="noopener">WhatsApp ${esc(C.whatsapp_visible)}</a></li>
        <li><a href="tel:${C.telefono}">Teléfono ${esc(C.telefono_visible)}</a></li>
        <li><a href="mailto:${C.correo}">${esc(C.correo)}</a></li>
        <li><a href="https://www.instagram.com/${C.instagram}/" target="_blank" rel="noopener">Instagram @${esc(C.instagram)}</a></li>
      </ul>
    </div>
    <p class="legal">© ${anio} Urbacan Real Estate · <a href="${u("/aviso-legal")}">Aviso legal</a> · <a href="${u("/politica-privacidad")}">Política de privacidad</a> · <a href="${u("/politica-cookies")}">Política de cookies</a></p>
  </div>
</footer>`;
}

// ---------- componentes ----------
async function miniatura(p, { sizes = "(min-width:1100px) 33vw, (min-width:700px) 50vw, 100vw" } = {}) {
  const info = await fotoInfo(p, 0);
  const destino = ENLACE_MINIATURA === "landing" && p.enlaces?.landing ? p.enlaces.landing : u(`/propiedades/${p.id}/`);
  const externo = destino.startsWith("http");
  const datos = [p.tipologia, p.dormitorios ? `${p.dormitorios} dorm.` : null, p.m2 ? `${p.m2} m²` : null].filter(Boolean);
  const sello = p.precio_tipo === "cerrado" ? (p.estado_vivienda ? "Segunda mano" : null) : (p.entrega ? `Entrega ${entregaTxt(p.entrega).replace(" trimestre de", " trim.")}` : null);
  return `<article class="ficha-mini aparece" data-provincia="${esc(p.provincia)}">
  <div class="foto">${imgTag(info, fotoAlt(p, 0), { sizes })}${sello ? `<span class="sello">${esc(sello)}</span>` : ""}</div>
  <div class="cuerpo">
    <p class="zona">${esc(p.zona)}${p.region === "peninsula" ? ` · ${esc(p.provincia)}` : ""}</p>
    <h3><a class="cubre" href="${destino}"${externo ? ' target="_blank" rel="noopener"' : ""}><span class="vh">Ver </span></a>${esc(p.titulo)}</h3>
    <p class="datos">${datos.map((d) => `<span>${esc(d)}</span>`).join("")}</p>
    <div class="precio"><strong>${esc(precioTexto(p))}</strong><span class="ver">Ver ficha →</span></div>
  </div>
</article>`;
}

function botonesContacto(texto, asunto) {
  return `<a class="btn btn-bloque" href="${wa(texto)}" target="_blank" rel="noopener">${I.wa}<span>WhatsApp</span><span class="vh"> (se abre en una pestaña nueva)</span></a>
      <a class="btn btn-bloque" href="tel:${C.telefono}">${I.tel}<span>Llamar · ${esc(C.telefono_visible)}</span></a>
      <a class="btn btn-bloque" href="mailto:${C.correo}?subject=${encodeURIComponent(asunto)}">${I.mail}<span>Escribir un correo</span></a>`;
}

function barraContacto(texto) {
  return `<nav class="barra-contacto" aria-label="Contacto rápido"><a class="wa" href="${wa(texto)}" target="_blank" rel="noopener">${I.wa}<span>WhatsApp</span></a><a href="tel:${C.telefono}">${I.tel}<span>Llamar</span></a></nav>`;
}

const agenteLD = () => ({
  "@context": "https://schema.org", "@type": "RealEstateAgent", "@id": abs("/#agencia"),
  name: sitio.nombre, url: abs("/"), logo: abs("/apple-touch-icon.png"), image: abs("/assets/img/og-urbacan.jpg"),
  description: sitio.lema, email: C.correo, telephone: C.telefono,
  address: { "@type": "PostalAddress", streetAddress: "Avda. Juan Carlos I nº 23", postalCode: "35019", addressLocality: "Las Palmas de Gran Canaria", addressRegion: "Las Palmas", addressCountry: "ES" },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"], opens: "09:00", closes: "14:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"], opens: "16:00", closes: "19:00" },
  ],
  areaServed: ["Gran Canaria", "Alicante", "Murcia", "Almería"],
  sameAs: [`https://www.instagram.com/${C.instagram}/`, C.facebook],
});

// ---------- páginas ----------
async function paginaInicio(imgs) {
  const can = porRegion("canarias"), pen = porRegion("peninsula");
  const seleccion = [...can.slice(0, 1), ...pen].slice(0, 6);
  const minis = (await Promise.all(seleccion.map((p) => miniatura(p)))).join("\n");
  const accesos = [
    can.length ? `<a class="acceso" href="${u("/canarias/")}"><span><b>Canarias</b><span>${can.length} ${can.length === 1 ? "propiedad" : "propiedades"} · Gran Canaria</span></span>${I.flecha}</a>` : "",
    pen.length ? `<a class="acceso" href="${u("/peninsula/")}"><span><b>Península</b><span>${pen.length} ${pen.length === 1 ? "propiedad" : "propiedades"} · Alicante y Murcia</span></span>${I.flecha}</a>` : "",
  ].join("");
  const regionCard = (r, info, alt, texto, n) => `<a class="region aparece" href="${u(REGIONES[r].ruta)}">${imgTag(info, alt, { sizes: "(min-width:800px) 50vw, 100vw" })}<div class="txt"><p class="etiqueta">${n} ${n === 1 ? "propiedad" : "propiedades"}</p><h3>${REGIONES[r].nombre}</h3><p>${texto}</p><span class="mas">Ver propiedades ${I.flecha}</span></div></a>`;
  const penFoto = pen.length ? await fotoInfo(pen.find((p) => p.id === "pinatar-luxury-homes") || pen[0], 0) : null;
  const cuerpo = `
<section class="portada" aria-labelledby="titulo-portada">
  <picture>${imgTag(imgs.portada, "Playa de Las Canteras, Las Palmas de Gran Canaria", { lazy: false, prioridad: true })}</picture>
  <div class="contenedor">
    <p class="etiqueta">Urbacan Real Estate · Las Palmas de Gran Canaria</p>
    <h1 id="titulo-portada">Tu casa junto al mar, <em>con nosotros</em> a tu lado.</h1>
    <p class="intro">Somos una agencia inmobiliaria de Las Palmas de Gran Canaria especializada en obra nueva en la Costa Blanca y la Costa Cálida. Te ayudamos a elegir bien y te acompañamos hasta la firma.</p>
    <div class="accesos">${accesos}</div>
  </div>
</section>

<section class="seccion zona-crema" aria-labelledby="t-seleccion">
  <div class="contenedor">
    <div class="cab-seccion aparece">
      <div><p class="etiqueta">Selección</p><h2 id="t-seleccion">Propiedades que tenemos ahora</h2></div>
      <p class="texto-suave">Cada ficha incluye fotos, datos clave y el dossier completo de la promoción. Pregúntanos por cualquiera: te respondemos por WhatsApp, teléfono o correo.</p>
    </div>
    <div class="rejilla">${minis}</div>
    <p class="nota-precios">Precios orientativos; impuestos y gastos no incluidos. Datos a ${fechaLarga(activas[0]?.fecha_datos || "2026-10-26")}.</p>
  </div>
</section>

<section class="seccion" aria-labelledby="t-zonas">
  <div class="contenedor">
    <div class="cab-seccion aparece">
      <div><p class="etiqueta">Dónde trabajamos</p><h2 id="t-zonas">Dos destinos, un mismo equipo</h2></div>
      <p class="texto-suave">Trabajamos en Alicante, Murcia y Almería, incluidas sus zonas costeras, y en Gran Canaria, donde tenemos nuestra oficina.</p>
    </div>
    <div class="regiones">
      ${can.length ? regionCard("canarias", imgs.canarias, "Atardecer en Gran Canaria", "Viviendas en Gran Canaria, cerca del mar y de la vida de barrio.", can.length) : ""}
      ${pen.length ? regionCard("peninsula", penFoto, "Piscina comunitaria entre palmeras en San Pedro del Pinatar", "Obra nueva en la Costa Blanca y la Costa Cálida: Alicante, Murcia y Almería.", pen.length) : ""}
    </div>
  </div>
</section>

<section id="como-trabajamos" class="seccion zona-suave" aria-labelledby="t-como">
  <div class="contenedor">
    <div class="cab-seccion aparece">
      <div><p class="etiqueta">Cómo trabajamos</p><h2 id="t-como">Atención personal, de principio a fin</h2></div>
      <p class="texto-suave">Somos un equipo pequeño y nos gusta conocer bien a cada cliente. Así es como trabajamos contigo.</p>
    </div>
    <div class="pasos">
      <div class="paso aparece"><span class="num">01</span><h3>Te escuchamos</h3><p>Hablamos contigo para entender qué buscas: zona, presupuesto, plazos y uso de la vivienda. Con eso seleccionamos las promociones que de verdad encajan.</p></div>
      <div class="paso aparece"><span class="num">02</span><h3>Revisamos cada detalle</h3><p>Contamos con apoyo técnico propio en derecho, ingeniería y arquitectura para revisar documentación, calidades y condiciones antes de que decidas.</p></div>
      <div class="paso aparece"><span class="num">03</span><h3>Te acompañamos hasta la firma</h3><p>Coordinamos visitas, resolvemos dudas con el promotor y te informamos en cada paso. Según cada caso, gestionamos nosotros la operación o la coordinamos con el agente local.</p></div>
    </div>
    <div class="areas">
      <div class="area aparece"><span class="etiqueta">Área técnica</span><b>Derecho</b><p>Contratos, documentación y condiciones de compra revisados antes de firmar.</p></div>
      <div class="area aparece"><span class="etiqueta">Área técnica</span><b>Ingeniería</b><p>Instalaciones, calidades y estado de la obra con criterio técnico.</p></div>
      <div class="area aparece"><span class="etiqueta">Área técnica</span><b>Arquitectura</b><p>Distribución, orientación y proyecto: lo que no siempre se ve en las fotos.</p></div>
    </div>
  </div>
</section>

${seccionContacto()}`;
  return pagina({
    titulo: "Urbacan Real Estate · Obra nueva en Costa Blanca y Costa Cálida",
    descripcion: "Agencia inmobiliaria en Las Palmas de Gran Canaria especializada en obra nueva en Costa Blanca y Costa Cálida. Propiedades en Canarias y en la Península, con atención personal hasta la firma.",
    ruta: "/", ogImagen: "assets/img/og-urbacan.jpg", jsonld: [agenteLD()], cuerpo, claseBody: "inicio",
  });
}

function seccionContacto() {
  return `<section id="contacto" class="seccion" aria-labelledby="t-contacto">
  <div class="contenedor contacto-grid">
    <div class="aparece">
      <p class="etiqueta">Contacto</p>
      <h2 id="t-contacto">Hablemos.</h2>
      <p class="texto-suave" style="max-width:44ch">Escríbenos por WhatsApp, llámanos o mándanos un correo. Te respondemos en horario de oficina, sin compromiso.</p>
      <ul class="datos-contacto">
        <li><span>Oficina</span>${esc(C.direccion)}</li>
        <li><span>Horario</span>${esc(C.horario)}</li>
        <li><span>Teléfono</span>${esc(C.telefono_visible)}</li>
        <li><span>WhatsApp</span>${esc(C.whatsapp_visible)}</li>
      </ul>
    </div>
    <div class="lista-contacto aparece">
      <a class="btn btn-oro btn-grande" href="${wa(C.whatsapp_texto)}" target="_blank" rel="noopener">${I.wa}<span>Escríbenos por WhatsApp</span><span class="vh"> (se abre en una pestaña nueva)</span></a>
      <a class="btn btn-grande" href="tel:${C.telefono}">${I.tel}<span>Llamar · ${esc(C.telefono_visible)}</span></a>
      <a class="btn btn-grande" href="mailto:${C.correo}">${I.mail}<span>${esc(C.correo)}</span></a>
      <a class="btn btn-grande" href="https://www.instagram.com/${C.instagram}/" target="_blank" rel="noopener">${I.ig}<span>@${esc(C.instagram)}</span><span class="vh"> (se abre en una pestaña nueva)</span></a>
    </div>
  </div>
</section>`;
}

async function paginaRegion(r) {
  const lista = porRegion(r);
  const R = REGIONES[r];
  const provincias = [...new Set(lista.map((p) => p.provincia))];
  const minis = (await Promise.all(lista.map((p) => miniatura(p)))).join("\n");
  const intro = r === "peninsula"
    ? "Obra nueva en la Costa Blanca y la Costa Cálida. Trabajamos en Alicante, Murcia y Almería, incluidas sus zonas costeras."
    : "Viviendas en Gran Canaria, cerca del mar y con todos los servicios a pie de calle.";
  const hayCerrado = lista.some((p) => p.precio_tipo === "cerrado"), hayDesde = lista.some((p) => p.precio_tipo !== "cerrado");
  const fecha = fechaLarga(lista[0].fecha_datos);
  const nota = [hayDesde ? "Precios desde, orientativos; impuestos y gastos no incluidos." : "", hayCerrado ? "Impuestos y gastos de la compraventa no incluidos." : "", `Datos a ${fecha}.`].filter(Boolean).join(" ");
  const cuerpo = `
<section class="seccion zona-crema" aria-labelledby="t-region" style="padding-top:clamp(2rem,6vw,4rem)">
  <div class="contenedor">
    <nav class="migas" aria-label="Ruta" style="color:var(--piedra-oscura)"><a href="${u("/")}" style="color:var(--piedra-oscura)">Inicio</a> / <span aria-current="page">${R.nombre}</span></nav>
    <div class="cab-seccion">
      <div><p class="etiqueta">${esc(R.sub)}</p><h1 id="t-region" style="margin:0">${R.nombre}</h1></div>
      <p class="texto-suave">${intro}</p>
    </div>
    ${provincias.length > 1 ? `<div class="filtros" role="group" aria-label="Filtrar por provincia"><button type="button" data-filtro="todas" aria-pressed="true">Todas</button>${provincias.map((pv) => `<button type="button" data-filtro="${esc(pv)}" aria-pressed="false">${esc(pv)}</button>`).join("")}</div><p class="vh" id="estado-filtro" aria-live="polite"></p>` : ""}
    <div class="rejilla${lista.length === 1 ? " una" : ""}">${minis}</div>
    <p class="nota-precios">${nota}</p>
  </div>
</section>
${seccionContacto()}`;
  const ld = { "@context": "https://schema.org", "@type": "ItemList", name: `Propiedades en ${R.nombre}`, itemListElement: lista.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/propiedades/${p.id}/`), name: p.titulo })) };
  return pagina({
    titulo: `${R.nombre}: propiedades en venta · Urbacan Real Estate`,
    descripcion: r === "peninsula" ? `Obra nueva en Alicante y Murcia: ${lista.length} promociones en la Costa Blanca y la Costa Cálida con fotos, precios orientativos y dossier completo.` : `Propiedades en venta en Gran Canaria con Urbacan Real Estate.`,
    ruta: R.ruta, ogImagen: (await imagenOG(fotoOrigen(lista[0], typeof lista[0].fotos[0] === "string" ? lista[0].fotos[0] : lista[0].fotos[0].archivo), `${r}/og.jpg`)), jsonld: [ld], cuerpo,
  });
}

async function paginaPropiedad(p) {
  const infos = []; for (let i = 0; i < p.fotos.length; i++) infos.push(await fotoInfo(p, i));
  const og = await imagenOG(fotoOrigen(p, typeof p.fotos[0] === "string" ? p.fotos[0] : p.fotos[0].archivo), `propiedades/${p.id}/og.jpg`);
  const R = REGIONES[p.region];
  const textoWa = `Hola, os escribo desde la web, me interesa ${p.titulo}`;
  const claves = [
    ["Precio", precioTexto(p)],
    ["Dormitorios", p.dormitorios],
    ["Superficie", p.m2 ? `${p.m2} m²` : null],
    p.entrega !== undefined && p.precio_tipo !== "cerrado" ? ["Entrega", entregaTxt(p.entrega) || "Consultar"] : ["Estado", p.estado_vivienda || "Consultar"],
  ].filter(([, v]) => v);
  const galeria = `<section class="galeria" aria-label="Galería de fotos">
  <div class="pista" tabindex="0" aria-label="Fotos de ${esc(p.titulo)}. Desliza para ver más.">
    ${infos.map((info, i) => `<figure><button type="button" data-grande="${u("/" + info.base)}-1600.webp" aria-label="Ampliar foto ${i + 1} de ${infos.length}">${imgTag(info, fotoAlt(p, i), { sizes: "(min-width:900px) 78vw, 100vw", lazy: i > 0, prioridad: i === 0 })}</button></figure>`).join("\n    ")}
  </div>
  ${infos.length > 1 ? `<div class="controles"><button type="button" class="g-ant" aria-label="Foto anterior">${I.ant}</button><span class="contador" aria-live="polite">1 / ${infos.length}</span><button type="button" class="g-sig" aria-label="Foto siguiente">${I.sig}</button></div>` : ""}
</section>
<dialog id="visor" class="visor" aria-label="Visor de fotos"><div class="marco"><img alt=""></div><button type="button" class="cerrar" aria-label="Cerrar visor">${I.cerrar}</button><button type="button" class="ant" aria-label="Foto anterior">${I.ant}</button><button type="button" class="sig" aria-label="Foto siguiente">${I.sig}</button><p class="pie-foto"></p></dialog>`;

  const mapaUrl = p.coordenadas
    ? `https://www.openstreetmap.org/?mlat=${p.coordenadas[0]}&mlon=${p.coordenadas[1]}#map=15/${p.coordenadas[0]}/${p.coordenadas[1]}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(p.direccion || `${p.zona}, ${p.provincia}`)}`;
  const enlaces = [];
  if (p.enlaces?.landing) enlaces.push(`<a class="btn" href="${esc(p.enlaces.landing)}" target="_blank" rel="noopener">${I.ext}<span>Dossier completo</span><span class="vh"> (se abre en una pestaña nueva)</span></a>`);
  if (p.enlaces?.anuncio) enlaces.push(`<a class="btn" href="${esc(p.enlaces.anuncio)}" target="_blank" rel="noopener">${I.ext}<span>Anuncio en idealista</span><span class="vh"> (se abre en una pestaña nueva)</span></a>`);
  if (p.enlaces?.thenewpropers && p.enlaces.thenewpropers !== p.enlaces.landing) enlaces.push(`<a class="btn" href="${esc(p.enlaces.thenewpropers)}" target="_blank" rel="noopener">${I.ext}<span>Ficha en The New Propers</span></a>`);

  const otras = activas.filter((x) => x.id !== p.id).sort((a, b) => (a.region === p.region ? -1 : 1) - (b.region === p.region ? -1 : 1)).slice(0, 3);
  const minisOtras = (await Promise.all(otras.map((x) => miniatura(x)))).join("\n");

  const cuerpo = `
<div class="contenedor">
  <nav class="migas" aria-label="Ruta"><a href="${u("/")}">Inicio</a> / <a href="${u(R.ruta)}">${R.nombre}</a> / <span aria-current="page">${esc(p.titulo)}</span></nav>
  <header class="ficha-cab">
    <p class="zona">${esc(p.zona)}${p.region === "peninsula" ? ` · ${esc(p.provincia)}` : ""}</p>
    <h1>${esc(p.titulo)}</h1>
    <p class="texto-suave" style="margin:0">${esc(p.tipologia)}</p>
  </header>
</div>
${galeria}
<div class="contenedor ficha-cuerpo">
  <div>
    <dl class="claves">${claves.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    ${p.enlaces?.landing ? `<div class="cta-movil"><a class="btn btn-oro btn-grande btn-bloque" href="${esc(p.enlaces.landing)}" target="_blank" rel="noopener">${I.ext}<span>Ver dossier completo</span><span class="vh"> (se abre en una pestaña nueva)</span></a><p class="precio-nota">${esc(notaPrecio(p))}</p></div>` : ""}
    <div class="descripcion">${p.descripcion.map((t) => `<p>${esc(t)}</p>`).join("")}</div>
    <div class="bloque"><h2>Características</h2><ul class="caracteristicas">${p.caracteristicas.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>
    <div class="bloque"><h2>Ubicación</h2><p class="texto-suave">${esc(p.zona)}${p.region === "peninsula" ? `, ${esc(p.provincia)}` : ""}.</p><a class="btn" href="${mapaUrl}" target="_blank" rel="noopener">${I.mapa}<span>Ver en el mapa</span><span class="vh"> (OpenStreetMap, se abre en una pestaña nueva)</span></a></div>
    ${enlaces.length ? `<div class="bloque"><h2>Enlaces oficiales</h2><div class="enlaces-ofi">${enlaces.join("")}</div></div>` : ""}
  </div>
  <aside class="panel" aria-label="Precio y contacto">
    <p class="etiqueta">${p.precio_tipo === "cerrado" ? "Precio" : "Precio orientativo"}</p>
    <p class="precio-grande">${esc(precioTexto(p))}</p>
    <p class="precio-nota">${esc(notaPrecio(p))}</p>
    <div class="acciones">
      ${p.enlaces?.landing ? `<a class="btn btn-oro btn-grande btn-bloque" href="${esc(p.enlaces.landing)}" target="_blank" rel="noopener">${I.ext}<span>Ver dossier completo</span><span class="vh"> (se abre en una pestaña nueva)</span></a>` : ""}
      ${botonesContacto(textoWa, `Consulta: ${p.titulo}`)}
    </div>
    <p class="ayuda">Respondemos de lunes a viernes, de 9:00 a 14:00 y de 16:00 a 19:00.</p>
  </aside>
</div>
${otras.length ? `<section class="seccion zona-crema" aria-labelledby="t-otras"><div class="contenedor"><div class="cab-seccion"><div><p class="etiqueta">Seguir viendo</p><h2 id="t-otras">Otras propiedades</h2></div></div><div class="rejilla">${minisOtras}</div></div></section>` : ""}`;

  const imagenes = infos.slice(0, 6).map((i) => abs(`/${i.base}-1600.webp`));
  const lugar = { "@type": "PostalAddress", addressLocality: p.zona, addressRegion: p.provincia, addressCountry: "ES" };
  const ld = [
    {
      "@context": "https://schema.org", "@type": "RealEstateListing", name: p.titulo, url: abs(`/propiedades/${p.id}/`),
      description: p.descripcion.join(" "), image: imagenes, datePosted: p.fecha_datos,
      offers: p.precio_tipo === "cerrado"
        ? { "@type": "Offer", price: p.precio_desde, priceCurrency: "EUR", availability: "https://schema.org/InStock", seller: { "@id": abs("/#agencia") } }
        : { "@type": "AggregateOffer", lowPrice: p.precio_desde, priceCurrency: "EUR", availability: "https://schema.org/InStock", seller: { "@id": abs("/#agencia") } },
      about: {
        "@type": /villa|adosad|independ|bungalow/i.test(p.tipologia) ? "SingleFamilyResidence" : "Apartment",
        name: p.titulo, address: lugar,
        ...(p.coordenadas ? { geo: { "@type": "GeoCoordinates", latitude: p.coordenadas[0], longitude: p.coordenadas[1] } } : {}),
        numberOfBedrooms: p.dormitorios,
        ...(p.m2 ? { floorSize: { "@type": "QuantitativeValue", value: p.m2, unitCode: "MTK" } } : {}),
      },
    },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: abs("/") },
      { "@type": "ListItem", position: 2, name: R.nombre, item: abs(R.ruta) },
      { "@type": "ListItem", position: 3, name: p.titulo, item: abs(`/propiedades/${p.id}/`) },
    ] },
    agenteLD(),
  ];
  const descMeta = `${p.tipologia} en ${p.zona}${p.region === "peninsula" ? ` (${p.provincia})` : ""}. ${precioTexto(p)}, ${p.dormitorios} dorm., ${p.m2} m². Fotos, características y dossier completo.`;
  return pagina({
    titulo: `${p.titulo}, ${p.zona} · ${precioTexto(p)} · Urbacan Real Estate`,
    descripcion: descMeta, ruta: `/propiedades/${p.id}/`, ogImagen: og, jsonld: ld, cuerpo,
    claseBody: "con-barra", barra: barraContacto(textoWa), sinFlotante: true, waTexto: textoWa,
  });
}

function paginaLegal(nombre, titulo, intro, html, ruta) {
  const cuerpo = `<section class="seccion zona-crema" style="padding-top:clamp(2rem,6vw,4rem)"><div class="contenedor legal-txt">
  <p class="etiqueta">Legal</p><h1 style="font-size:clamp(2rem,6vw,3.2rem)">${esc(titulo)}</h1><p class="texto-suave">${esc(intro)}</p>
  ${html}
</div></section>`;
  return pagina({ titulo: `${titulo} · Urbacan Real Estate`, descripcion: intro, ruta, cuerpo, robots: "index, follow" });
}

function paginaTarjeta(imgs, qrSvg) {
  const T = sitio.contacto;
  const web = sitio.url_definitiva;
  const vcard = [
    "BEGIN:VCARD", "VERSION:3.0", "N:Barranco de la Merced;Sergio;;;", "FN:Sergio Barranco", "ORG:Urbacan Real Estate", "TITLE:Fundador",
    `TEL;TYPE=CELL,VOICE:${T.telefono}`, `TEL;TYPE=CELL,MSG:+${T.whatsapp}`, `EMAIL;TYPE=WORK:${T.correo_tarjeta}`, `URL:${web}`,
    "ADR;TYPE=WORK:;;Avda. Juan Carlos I nº 23;Las Palmas de Gran Canaria;;35019;España", "END:VCARD",
  ].join("\\n");
  const cuerpo = `
<section class="seccion" style="padding-top:clamp(1.5rem,5vw,3rem)">
  <div class="contenedor" style="max-width:520px">
    <article class="panel" style="padding:0;overflow:hidden;text-align:center">
      <div style="position:relative">
        ${imgTag(imgs.sergio, "Sergio Barranco, fundador de Urbacan Real Estate", { lazy: false, prioridad: true, sizes: "(min-width:560px) 520px, 100vw" })}
        <div style="position:absolute;inset:auto 0 0 0;height:45%;background:linear-gradient(180deg,rgba(30,27,22,0),var(--tinta-suave))"></div>
        <div style="position:absolute;top:14px;left:14px;width:44px;height:44px">${EMBLEMA()}</div>
      </div>
      <div style="padding:0 1.5rem 1.8rem;margin-top:-1.5rem;position:relative">
        <h1 style="font-size:2.1rem;margin:0">Sergio Barranco</h1>
        <p style="font-family:var(--serif);font-style:italic;color:var(--dorado);margin:.3rem 0 .6rem">Fundador — Urbacan Real Estate</p>
        <p class="etiqueta" style="color:var(--texto-suave)">Urbacan Real Estate</p>
        <span class="filete" style="margin-inline:auto"></span>
        <p class="texto-suave" style="max-width:34ch;margin-inline:auto">${esc(sitio.lema)}</p>
        <div class="acciones" style="display:grid;gap:10px;margin-top:1.4rem;text-align:left">
          <a class="btn btn-oro btn-bloque" href="${wa(C.whatsapp_texto)}" target="_blank" rel="noopener">${I.wa}<span>Escribir por WhatsApp</span></a>
          <a class="btn btn-bloque" href="tel:${T.telefono}">${I.tel}<span>Llamar · ${esc(T.telefono_visible)}</span></a>
          <a class="btn btn-bloque" href="mailto:${T.correo_tarjeta}" style="text-transform:none;letter-spacing:.04em">${I.mail}<span>${esc(T.correo_tarjeta)}</span></a>
          <a class="btn btn-bloque" href="${web}/">${I.web}<span>Ver nuestra web</span></a>
          <a class="btn btn-bloque" href="https://www.instagram.com/${T.instagram}/" target="_blank" rel="noopener">${I.ig}<span>@${esc(T.instagram)}</span></a>
          <a class="btn btn-bloque" id="guardar-contacto" href="#" data-vcard="${esc(vcard)}">${I.persona}<span>Guardar en contactos</span></a>
        </div>
        ${qrSvg ? `<div style="margin:1.8rem auto 0;width:168px;padding:12px;background:#F5F1E8">${qrSvg}</div><p class="etiqueta" style="margin-top:.8rem;color:var(--texto-suave)">Escanea para abrir esta tarjeta</p>` : ""}
        <p style="margin:1.6rem 0 0;font:400 .74rem/1.7 var(--mono);color:var(--texto-suave)">URBACAN REAL ESTATE · Sergio Barranco de la Merced<br>${esc(T.direccion)}</p>
      </div>
    </article>
  </div>
</section>`;
  const ld = { "@context": "https://schema.org", "@type": "Person", name: "Sergio Barranco", jobTitle: "Fundador", worksFor: { "@id": abs("/#agencia"), "@type": "RealEstateAgent", name: sitio.nombre }, email: T.correo_tarjeta, telephone: T.telefono, url: abs("/tarjeta") };
  return pagina({ titulo: "Sergio Barranco — Urbacan Real Estate", descripcion: `Tarjeta de contacto de Sergio Barranco, fundador de Urbacan Real Estate. ${sitio.lema}.`, ruta: "/tarjeta", ogImagen: "assets/img/og-urbacan.jpg", jsonld: [ld], cuerpo, sinFlotante: true });
}

// ---------- ejecución ----------
async function main() {
  fs.rmSync(SALIDA, { recursive: true, force: true });
  mkdir(SALIDA);

  // estáticos
  fs.cpSync(path.join(RAIZ, "assets"), path.join(SALIDA, "assets"), { recursive: true, filter: (s) => !/assets[\\/]img[\\/]origen/.test(s) });
  CSS_V = hash(path.join(RAIZ, "assets/css/estilos.css"));
  JS_V = hash(path.join(RAIZ, "assets/js/web.js"));

  // favicon e iconos
  const fav = EMBLEMA(true);
  escribir("favicon.svg", fav);
  if (sharp) {
    await sharp(Buffer.from(fav)).resize(32, 32).png().toFile(path.join(SALIDA, "favicon-32.png"));
    await sharp(Buffer.from(fav)).resize(180, 180).flatten({ background: "#14120F" }).png().toFile(path.join(SALIDA, "apple-touch-icon.png"));
    await sharp(Buffer.from(fav)).resize(512, 512).flatten({ background: "#14120F" }).png().toFile(path.join(SALIDA, "icono-512.png"));
  }
  escribir("site.webmanifest", JSON.stringify({ name: sitio.nombre, short_name: "Urbacan", start_url: `${BASE}/`, display: "standalone", background_color: "#14120F", theme_color: "#14120F", icons: [{ src: `${BASE}/icono-512.png`, sizes: "512x512", type: "image/png" }] }));

  // imágenes generales
  const O = (f) => path.join(RAIZ, "assets/img/origen", f);
  const imgs = {
    portada: await procesarFoto(O("las-canteras.webp"), "assets/img/portada"),
    canarias: await procesarFoto(O("atardecer-gran-canaria.webp"), "assets/img/canarias"),
    sergio: await procesarFoto(O("sergio-barranco.webp"), "assets/img/sergio"),
  };
  await imagenOG(O("las-canteras.webp"), "assets/img/og-urbacan.jpg");

  // QR de la tarjeta (apunta a la dirección definitiva)
  let qrSvg = null;
  if (QR) {
    qrSvg = await QR.toString(`${sitio.url_definitiva}/tarjeta`, { type: "svg", margin: 0, color: { dark: "#14120F", light: "#F5F1E8" }, errorCorrectionLevel: "M" });
    qrSvg = qrSvg.replace("<svg ", '<svg role="img" aria-label="Código QR de la tarjeta de contacto" ');
    escribir("assets/img/qr-tarjeta.svg", qrSvg);
  }

  escribir("index.html", await paginaInicio(imgs));
  for (const r of Object.keys(REGIONES)) if (porRegion(r).length) escribir(`${r}/index.html`, await paginaRegion(r));
  for (const p of activas) escribir(`propiedades/${p.id}/index.html`, await paginaPropiedad(p));

  // páginas legales (contenido en paginas/*.html)
  const leg = (f) => fs.readFileSync(path.join(RAIZ, "paginas", f), "utf8").replaceAll("{{WEB}}", sitio.url_definitiva).replaceAll("{{CORREO}}", C.correo);
  escribir("aviso-legal.html", paginaLegal("aviso-legal", "Aviso legal", "Información sobre la titularidad y condiciones de uso de este sitio web, en cumplimiento del artículo 10 de la Ley 34/2002 (LSSICE).", leg("aviso-legal.html"), "/aviso-legal"));
  escribir("politica-privacidad.html", paginaLegal("politica-privacidad", "Política de privacidad", "Cómo tratamos tus datos personales cuando contactas con Urbacan Real Estate para consultar sobre un inmueble o gestionar una operación inmobiliaria.", leg("politica-privacidad.html"), "/politica-privacidad"));
  escribir("politica-cookies.html", paginaLegal("politica-cookies", "Política de cookies", "Qué cookies usa esta web (ninguna) y qué ocurre cuando sales hacia otros sitios.", leg("politica-cookies.html"), "/politica-cookies"));
  escribir("tarjeta.html", paginaTarjeta(imgs, qrSvg));

  escribir("404.html", pagina({ titulo: "Página no encontrada · Urbacan Real Estate", descripcion: "La página que buscas no existe.", ruta: "/404.html", cuerpo: `<section class="seccion"><div class="contenedor"><p class="etiqueta">Error 404</p><h1>Esta página no existe.</h1><p class="texto-suave">Puede que la propiedad ya se haya vendido o que la dirección haya cambiado.</p><p><a class="btn btn-oro" href="${u("/")}">Volver al inicio</a></p></div></section>` }));

  // robots y sitemap
  const urls = ["/", ...Object.keys(REGIONES).filter((r) => porRegion(r).length).map((r) => REGIONES[r].ruta), ...activas.map((p) => `/propiedades/${p.id}/`), "/tarjeta", "/aviso-legal", "/politica-privacidad", "/politica-cookies"];
  escribir("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((x) => `  <url><loc>${abs(x)}</loc></url>`).join("\n")}\n</urlset>\n`);
  escribir("robots.txt", PROVISIONAL ? "# Versión provisional: no indexar\nUser-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\n\nSitemap: ${abs("/sitemap.xml")}\n`);
  escribir(".nojekyll", "");

  console.log(`✓ Sitio generado en _site/ (${activas.length} propiedades activas, base "${BASE || "/"}", ${PROVISIONAL ? "PROVISIONAL noindex" : "definitivo"})`);
  const ocultas = todas.filter((p) => p.estado !== "activa").map((p) => `${p.titulo} [${p.estado}]`);
  if (ocultas.length) console.log("  No publicadas:", ocultas.join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
