/* =========================================================
   LexFive — Service Worker (PWA)
   ---------------------------------------------------------
   Permite instalar el sistema como app en el celular y que
   funcione mejor con conexiones lentas.

   Estrategia "network-first" para los archivos propios:
   siempre intenta traer la última versión desde la red (para
   no quedarse con código viejo) y, si no hay internet, usa la
   copia guardada. Las peticiones a Supabase y otros servicios
   externos NO se interceptan (van directo a la red).
   ========================================================= */
const CACHE = 'lexfive-sistema-v1';
const SHELL = [
  './',
  './index.html',
  './login.html',
  './css/panel.css',
  './js/app.js',
  './js/auth.js',
  './js/config.js',
  './js/supabase.js',
  './manifest.webmanifest',
  '../js/branding.js',
  '../assets/pwa/icon.svg'
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Solo gestionamos archivos del propio sitio. Lo demás (Supabase, CDN,
  // fuentes, API de QR) va directo a la red.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
