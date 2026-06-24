/* ============================================================
 *  LexFive — Cache-busting automático (se ejecuta en cada deploy)
 * ------------------------------------------------------------
 *  Netlify ejecuta este script ANTES de publicar (ver netlify.toml).
 *  No requiere dependencias: usa solo módulos nativos de Node.
 *
 *  Qué hace:
 *   1) A todas las páginas públicas (HTML en la raíz) les agrega/actualiza
 *      el parámetro de versión "?v=<ID>" en sus enlaces locales a .css y .js.
 *      Así el navegador del celular SIEMPRE descarga la versión nueva tras
 *      un despliegue, sin tener que tocar nada a mano.
 *   2) Actualiza el nombre de caché del Service Worker del sistema
 *      (sistema/sw.js) con el mismo ID, para que el panel también se
 *      refresque solo en cada despliegue.
 *
 *  El <ID> es el commit de Git (COMMIT_REF que provee Netlify); si no está
 *  disponible (ejecución local), usa la marca de tiempo actual.
 *
 *  IMPORTANTE: este script modifica los archivos del directorio de
 *  publicación durante el build de Netlify; NO cambia tu repositorio.
 *  Por eso nunca tienes que editar versiones manualmente.
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const version = (process.env.COMMIT_REF || '').slice(0, 8) || String(Date.now());

// 1) Estampar versión en los .css/.js locales de las páginas públicas (raíz).
const ROOT = process.cwd();
const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

// Captura href/src que terminen en .css o .js, con o sin un ?v=... previo.
const assetRe = /((?:href|src)=")([^"?]+\.(?:css|js))(\?[^"]*)?(")/g;

let stamped = 0;
for (const file of htmlFiles) {
  const full = path.join(ROOT, file);
  const before = fs.readFileSync(full, 'utf8');
  const after = before.replace(assetRe, (match, pre, url, _query, post) => {
    // No tocar recursos externos (Google Fonts, CDNs, etc.).
    if (/^https?:\/\//i.test(url) || url.startsWith('//')) return match;
    stamped++;
    return `${pre}${url}?v=${version}${post}`;
  });
  if (after !== before) fs.writeFileSync(full, after);
}

// 2) Actualizar el nombre de caché del Service Worker del sistema.
const swPath = path.join(ROOT, 'sistema', 'sw.js');
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, 'utf8');
  const updated = sw.replace(
    /(const CACHE = 'lexfive-sistema-)[^']*(';)/,
    `$1${version}$2`
  );
  if (updated !== sw) fs.writeFileSync(swPath, updated);
}

console.log(`[cache-bust] version=${version} · referencias estampadas: ${stamped}`);
