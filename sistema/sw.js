/* =========================================================
   LexFive — Service Worker (PWA)
   ---------------------------------------------------------
   Permite instalar el sistema como app en el celular y que
   funcione mejor con conexiones lentas.

   Estrategia por tipo de recurso:
   - HTML / navegación: "red primero" (para no quedarse con código viejo),
     con copia de respaldo en caché si no hay internet.
   - Recursos estáticos (CSS, JS, imágenes, logos, fuentes): "stale-while-
     revalidate": se sirven AL INSTANTE desde la caché y se actualizan en
     segundo plano. Así el panel se siente rápido y los re-render (después
     de subir o eliminar) no esperan la red para cada ícono o estilo.
   - Las peticiones a Supabase y otros servicios externos NO se interceptan.
   ========================================================= */
const CACHE = 'lexfive-sistema-v5';
const SHELL = [
  './',
  './index.html',
  './login.html',
  './offline.html',
  './css/panel.css',
  './js/app.js',
  './js/auth.js',
  './js/config.js',
  './js/supabase.js',
  './manifest.webmanifest',
  '../js/branding.js',
  '../assets/pwa/icon.svg',
  '../assets/pwa/icon-192.png',
  '../assets/pwa/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const ASSET_RE = /\.(?:css|js|mjs|svg|png|jpg|jpeg|webp|gif|ico|woff2?|ttf|otf|webmanifest)$/i;

function actualizarCache(req, res) {
  if (res && res.ok) {
    const copia = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Solo gestionamos archivos del propio sitio. Lo demás (Supabase, CDN,
  // fuentes, API de QR) va directo a la red.
  if (url.origin !== self.location.origin) return;

  const aceptaHtml = (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  // HTML / navegación: red primero (para no servir código viejo), con respaldo.
  if (req.mode === 'navigate' || aceptaHtml) {
    event.respondWith(
      fetch(req).then((res) => actualizarCache(req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./offline.html') || caches.match('./index.html')))
    );
    return;
  }

  // Recursos estáticos: stale-while-revalidate (caché al instante + refresco
  // en segundo plano). Hace que el panel y los re-render se sientan rápidos.
  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const red = fetch(req).then((res) => actualizarCache(req, res)).catch(() => cached);
        return cached || red;
      })
    );
    return;
  }

  // Resto: red con respaldo en caché.
  event.respondWith(
    fetch(req).then((res) => actualizarCache(req, res)).catch(() => caches.match(req))
  );
});
