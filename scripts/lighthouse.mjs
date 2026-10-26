// Pasa Lighthouse (móvil) a la web publicada y a una copia local en modo definitivo (sin noindex).
// Escribe las puntuaciones en el resumen de la ejecución de GitHub Actions.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sitio = JSON.parse(fs.readFileSync(path.join(RAIZ, "sitio.json"), "utf8"));
const props = JSON.parse(fs.readFileSync(path.join(RAIZ, "propiedades.json"), "utf8")).propiedades.filter((p) => p.estado === "activa");
const ficha = props.find((p) => p.region === "peninsula") || props[0];
const rutas = ["/", "/peninsula/", `/propiedades/${ficha.id}/`, "/tarjeta"];

// Copia local en modo definitivo
const PUERTO = 4173;
execSync(`node scripts/build.mjs`, { cwd: RAIZ, stdio: "inherit", env: { ...process.env, PROVISIONAL: "0", SITE_URL: `http://localhost:${PUERTO}`, BASE_PATH: "" } });
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain" };
const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(RAIZ, "_site", p);
  if (p.endsWith("/")) f = path.join(f, "index.html");
  else if (!path.extname(f)) f += ".html";
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream", "Cache-Control": "max-age=600" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((ok) => servidor.listen(PUERTO, ok));

const lh = (url) => {
  const out = `/tmp/lh-${Buffer.from(url).toString("hex").slice(-24)}.json`;
  try {
    execSync(`npx --yes lighthouse@12.2.1 "${url}" --quiet --output=json --output-path=${out} --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless=new --no-sandbox"`, { stdio: "inherit", timeout: 180000 });
    const j = JSON.parse(fs.readFileSync(out, "utf8"));
    const c = j.categories;
    const malos = Object.values(j.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode === "binary" || (a.score !== null && a.score < 0.5 && a.scoreDisplayMode === "numeric")).map((a) => a.id).slice(0, 8);
    return { url, p: Math.round(c.performance.score * 100), a: Math.round(c.accessibility.score * 100), b: Math.round(c["best-practices"].score * 100), s: Math.round(c.seo.score * 100), lcp: j.audits["largest-contentful-paint"].displayValue, cls: j.audits["cumulative-layout-shift"].displayValue, malos };
  } catch (e) { return { url, error: e.message.slice(0, 200) }; }
};

await new Promise((ok) => setTimeout(ok, 20000));
const filas = [];
for (const r of rutas) filas.push({ modo: "publicada (provisional, noindex)", ...lh(`${sitio.url_provisional}${r}`) });
for (const r of rutas) filas.push({ modo: "local (definitiva, indexable)", ...lh(`http://localhost:${PUERTO}${r}`) });
servidor.close();

let md = "## Lighthouse móvil\n\n| Modo | Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | Auditorías a revisar |\n|---|---|---|---|---|---|---|---|---|\n";
for (const f of filas) md += f.error ? `| ${f.modo} | ${f.url} | error | | | | | | ${f.error} |\n` : `| ${f.modo} | ${f.url} | ${f.p} | ${f.a} | ${f.b} | ${f.s} | ${f.lcp} | ${f.cls} | ${f.malos.join(", ")} |\n`;
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
