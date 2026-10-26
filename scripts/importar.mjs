// Importación inicial (se ejecuta sola en GitHub Actions; no hace nada si ya está todo).
// 1) Descarga las fotos de las promociones listadas en datos/fotos-origen.json cuya carpeta fotos/<id>/ aún no exista,
//    y las guarda en WebP (máx. 1600 px) con el nombre que indica propiedades.json (01.webp, 02.webp…).
// 2) Copia las tipografías (Playfair Display, Jost, IBM Plex Mono) a assets/fonts/ si faltan.
// 3) Recupera de la web anterior la foto de Las Canteras, el atardecer y el retrato de la tarjeta si faltan.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origen = JSON.parse(fs.readFileSync(path.join(RAIZ, "datos/fotos-origen.json"), "utf8"));
const mkdir = (d) => fs.mkdirSync(d, { recursive: true });
const vacia = (d) => !fs.existsSync(d) || fs.readdirSync(d).filter((f) => !f.startsWith(".")).length === 0;

async function bajar(url) {
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (urbacan-web importador)" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (intento === 3) throw new Error(`${url}: ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 1500 * intento));
    }
  }
}
const aWebp = (buf, destino, ancho = 1600) => sharp(buf).rotate().resize({ width: ancho, withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toFile(destino);

function imgsDeHtml(html) {
  return [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => {
    const tag = m[0];
    const src = (/\ssrc\s*=\s*"([^"]+)"/i.exec(tag) || /\ssrc\s*=\s*'([^']+)'/i.exec(tag) || [])[1] || "";
    const alt = (/\salt\s*=\s*"([^"]*)"/i.exec(tag) || [])[1] || "";
    return { src, alt };
  });
}
const datosDeSrc = (src) => { const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(src); return m ? Buffer.from(m[1], "base64") : null; };

let hechas = 0, errores = [];

// 1) Fotos de propiedades
for (const [id, entrada] of Object.entries(origen)) {
  const dir = path.join(RAIZ, "fotos", id);
  if (!vacia(dir)) continue;
  mkdir(dir);
  try {
    if (Array.isArray(entrada)) {
      for (const f of entrada) {
        const buf = await bajar(f.url);
        await aWebp(buf, path.join(dir, f.archivo));
        hechas++;
      }
    } else if (entrada.pagina) {
      const html = (await bajar(entrada.pagina)).toString("utf8");
      const imgs = imgsDeHtml(html);
      let n = 1;
      for (const i of entrada.indices) {
        const img = imgs[i]; if (!img) throw new Error(`no hay imagen ${i} en ${entrada.pagina}`);
        const buf = datosDeSrc(img.src) || await bajar(new URL(img.src, entrada.pagina).href);
        await aWebp(buf, path.join(dir, `${String(n).padStart(2, "0")}.webp`));
        n++; hechas++;
      }
    }
    console.log(`✓ fotos de ${id}`);
  } catch (e) {
    errores.push(`${id}: ${e.message}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// 2) Tipografías
const FUENTES = {
  "playfair-display-500.woff2": "@fontsource/playfair-display/files/playfair-display-latin-500-normal.woff2",
  "playfair-display-500-italic.woff2": "@fontsource/playfair-display/files/playfair-display-latin-500-italic.woff2",
  "jost-300.woff2": "@fontsource/jost/files/jost-latin-300-normal.woff2",
  "jost-400.woff2": "@fontsource/jost/files/jost-latin-400-normal.woff2",
  "jost-500.woff2": "@fontsource/jost/files/jost-latin-500-normal.woff2",
  "ibm-plex-mono-400.woff2": "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
  "ibm-plex-mono-500.woff2": "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
};
mkdir(path.join(RAIZ, "assets/fonts"));
for (const [nombre, rel] of Object.entries(FUENTES)) {
  const destino = path.join(RAIZ, "assets/fonts", nombre);
  if (fs.existsSync(destino)) continue;
  const src = path.join(RAIZ, "node_modules", rel);
  if (fs.existsSync(src)) { fs.copyFileSync(src, destino); console.log("✓ fuente", nombre); } else errores.push(`fuente no encontrada: ${rel}`);
}

// 3) Imágenes generales desde la web anterior
const ORIG = path.join(RAIZ, "assets/img/origen");
mkdir(ORIG);
const GENERALES = [
  { archivo: "las-canteras.webp", pagina: "https://urbacanrealestate.com/", alt: /Las Canteras/i, ancho: 2000 },
  { archivo: "atardecer-gran-canaria.webp", pagina: "https://urbacanrealestate.com/", alt: /Atardecer/i, ancho: 1600 },
  { archivo: "sergio-barranco.webp", pagina: "https://urbacanrealestate.com/tarjeta", alt: /Sergio Barranco/i, ancho: 1040 },
];
const cache = {};
for (const g of GENERALES) {
  const destino = path.join(ORIG, g.archivo);
  if (fs.existsSync(destino)) continue;
  try {
    cache[g.pagina] ??= (await bajar(g.pagina)).toString("utf8");
    const img = imgsDeHtml(cache[g.pagina]).find((i) => g.alt.test(i.alt));
    if (!img) throw new Error("imagen no encontrada");
    const buf = datosDeSrc(img.src) || await bajar(new URL(img.src, g.pagina).href);
    await aWebp(buf, destino, g.ancho);
    console.log("✓ imagen", g.archivo);
  } catch (e) { errores.push(`${g.archivo}: ${e.message}`); }
}

console.log(`Importación terminada: ${hechas} fotos nuevas.`);
if (errores.length) { console.log("Avisos:\n - " + errores.join("\n - ")); }
