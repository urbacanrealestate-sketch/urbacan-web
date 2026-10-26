# Web de Urbacan Real Estate

Web estática (HTML, CSS y un poco de JavaScript, sin base de datos) publicada con **GitHub Pages**.
Cada vez que subes un cambio a este repositorio, GitHub genera la web y la publica sola en 1–2 minutos
(pestaña **Actions** → «Publicar web»; si sale en verde, ya está publicada).

Todo el contenido de las propiedades está en **un solo archivo: `propiedades.json`**.
Las fotos están en **`fotos/<id-de-la-propiedad>/`**. No hace falta tocar nada más.

---

## 1. Añadir una propiedad

1. Abre `propiedades.json` → botón del lápiz (✏️ *Edit this file*).
2. Copia el bloque de una propiedad parecida (desde `{` hasta `},`) y pégalo debajo. Cambia:
   - `"id"`: nombre corto, en minúsculas y con guiones (será la dirección: `/propiedades/<id>/`). Ej.: `"villas-del-mar"`.
   - `"region"`: `"canarias"` o `"peninsula"`.
   - `"estado"`: `"activa"` (se ve en la web).
   - `"orden"`: posición en el listado (1 = la primera).
   - `"titulo"`, `"zona"`, `"provincia"`, `"tipologia"`.
   - `"precio_desde"`: número sin puntos (ej. `245000`). `"precio_tipo"`: `"desde"` (obra nueva) o `"cerrado"` (precio fijo).
   - `"fecha_datos"`: fecha de los datos (`"2026-11-15"`).
   - `"dormitorios"`, `"banos"`, `"m2"` (texto, ej. `"85 – 140"`), `"entrega"` (tal como aparece en HabiHub, ej. `"Q3 2026"`; si no hay fecha, `null` y saldrá «Consultar»).
   - `"descripcion"`: uno o dos párrafos entre comillas. `"caracteristicas"`: lista de frases cortas.
   - `"fotos"`: lista con el nombre de cada foto y su descripción. **La primera es la miniatura.**
   - `"enlaces"`: `"landing"` es el dossier completo (botón «Ver dossier completo»); `"anuncio"` (idealista u otro) es opcional.
3. Pulsa **Commit changes**.
4. Sube las fotos (punto 4).

> Si te equivocas con una coma o unas comillas, la publicación sale en rojo en **Actions** y la web anterior sigue funcionando. Corrige el archivo y vuelve a guardar.

## 2. Quitar una propiedad vendida

En `propiedades.json`, cambia en esa propiedad `"estado": "activa"` por `"estado": "vendida"` y guarda.
Desaparece de la web, pero sus datos y fotos se conservan por si hicieran falta.
(Con `"pendiente"` tampoco se muestra: sirve para dejarla preparada sin publicar).

## 3. Cambiar un precio

En `propiedades.json`, cambia el número de `"precio_desde"` (sin puntos ni €) y actualiza `"fecha_datos"` con la fecha de hoy. Guarda.
La web muestra siempre «Desde X €» con la nota «precios desde, orientativos; impuestos y gastos no incluidos» y la fecha de los datos.

## 4. Subir fotos nuevas

1. Entra en la carpeta `fotos/` → **Add file → Upload files**.
2. Arrastra las fotos dentro de una carpeta con el mismo nombre que el `"id"` (en GitHub puedes escribir `fotos/villas-del-mar/` en la ruta al subir, o arrastrar la carpeta entera).
3. Ponles nombres ordenados: `01.jpg`, `02.jpg`, `03.jpg`… (JPG, PNG o WebP valen). Usa esos mismos nombres en la lista `"fotos"` del JSON.
4. **Commit changes.** Al publicar, la web crea sola las versiones ligeras (WebP para móvil y ordenador) y la imagen para compartir en redes.

Consejo: como máximo unas 12 fotos por propiedad, la más llamativa la primera (luz, piscina, ambiente).

---

## Cosas que conviene saber

- **Cambiar a qué lleva la miniatura**: en `sitio.json`, `"miniatura_enlaza_a"`: `"ficha"` (nuestra página, por defecto) o `"landing"` (directo al dossier de HabiHub). Es un cambio de una línea.
- **Datos de contacto** (correo, teléfono, WhatsApp, Instagram, horario): en `sitio.json`.
- **Versión provisional**: mientras `"provisional": true` en `sitio.json`, la web lleva `noindex` (no aparece en Google) y `robots.txt` bloquea a los buscadores. Al pasar al dominio definitivo se cambia a `false`.
- **Páginas legales**: texto en `paginas/aviso-legal.html`, `paginas/politica-privacidad.html` y `paginas/politica-cookies.html`.
- **Direcciones que no deben cambiar** (están en el QR de la tarjeta y en otros sitios): `/tarjeta`, `/aviso-legal`, `/politica-privacidad`.
- **Sin cookies ni analítica.** Si algún día se añade analítica o un píxel, antes hay que poner un aviso de cookies.

## Cómo funciona por dentro (para técnicos)

- `scripts/build.mjs` genera `_site/` a partir de `sitio.json` y `propiedades.json`: portada, listados por región, una página por propiedad (`/propiedades/<id>/`) con título, descripción, Open Graph, datos estructurados (schema.org `RealEstateListing`), `sitemap.xml`, `robots.txt`, favicon y la tarjeta con QR. Las fotos se convierten con `sharp` a WebP 480/960/1600 px.
- `scripts/importar.mjs` solo actúa la primera vez (o si falta algo): descarga las fotos indicadas en `datos/fotos-origen.json`, las tipografías (alojadas en `assets/fonts/`) y las imágenes de la web anterior.
- `.github/workflows/publicar.yml` ejecuta todo en cada subida y publica en GitHub Pages; después pasa Lighthouse (móvil) y deja las puntuaciones en el resumen de la ejecución.
- Prueba local: `npm install && node scripts/build.mjs`, y sirve la carpeta `_site/`.
