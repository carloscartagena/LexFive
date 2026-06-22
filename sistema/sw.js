/* =========================================================
   LexFive — Service Worker (PWA)
   ---------------------------------------------------------
   Permite instalar el sistema como app en el celular y que
   funcione mejor con conexiones lentas.

   Estrategia por tipo de recurso:
   - HTML / navegación: "red primero con tiempo de espera corto". Intenta la
     red por unos segundos (para no servir HTML viejo) y, si tarda o falla,
     usa de inmediato la copia en caché. Así en el celular NUNCA se queda
     colgado mostrando la página de "recargar".
   - JavaScript y CSS de la app: "stale-while-revalidate": se sirven AL INSTANTE
     desde la caché (carga rápida en el celular) y se actualizan en segundo
     plano, de modo que la próxima carga ya trae la última versión. Antes era
     "red primero", lo que volvía lento el celular y, si la red fallaba,
     mostraba la página de recarga.
   - Otros recursos estáticos (imágenes, logos, fuentes): "stale-while-
     revalidate": se sirven al instante desde la caché y se actualizan en
     segundo plano. Así el panel se siente rápido.
   - Las peticiones a Supabase y otros servicios externos NO se interceptan.
   ========================================================= */
const CACHE = 'lexfive-sistema-v40';
const SHELL = [
  './',
  './index.html',
  './login.html',
  './offline.html',
  './css/panel.css',
  './js/app.js',
  './js/auth.js',
  './js/config.js',
  './js/icons.js',
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

// fetch con tiempo de espera: si la red tarda demasiado (típico en celular con
// señal débil), se rechaza para poder caer al instante en la copia en caché,
// en vez de quedarse colgado y terminar mostrando la página de "recargar".
function fetchConTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(
      (res) => { clearTimeout(t); resolve(res); },
      (err) => { clearTimeout(t); reject(err); }
    );
  });
}

// Stale-while-revalidate: responde al instante con la copia en caché (si la
// hay) y, en paralelo, actualiza la caché desde la red para la próxima vez.
// Si "avisar" es true (JS/CSS de la app) y la versión del servidor cambió
// respecto a la copia en caché, avisa a las pestañas abiertas para que el
// usuario pueda recargar y aplicar la nueva versión sin forzar nada.
function staleWhileRevalidate(req, avisar) {
  return caches.match(req).then((cached) => {
    const red = fetch(req).then((res) => {
      if (avisar && cached && res && res.ok && cambioDeVersion(cached, res)) notificarNuevaVersion();
      return actualizarCache(req, res);
    }).catch(() => cached);
    return cached || red;
  });
}

// Compara dos respuestas por su validador HTTP (ETag o Last-Modified) para
// saber si el archivo cambió en el servidor.
function cambioDeVersion(a, b) {
  const ea = a.headers.get('etag'), eb = b.headers.get('etag');
  if (ea && eb) return ea !== eb;
  const la = a.headers.get('last-modified'), lb = b.headers.get('last-modified');
  if (la && lb) return la !== lb;
  return false;
}

// Avisa UNA vez (por vida del SW) a todas las pestañas/clientes abiertos.
let _avisoEnviado = false;
function notificarNuevaVersion() {
  if (_avisoEnviado) return;
  _avisoEnviado = true;
  self.clients.matchAll({ includeUncontrolled: true }).then((cs) => {
    cs.forEach((c) => c.postMessage({ tipo: 'lexfive-nueva-version' }));
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Solo gestionamos archivos del propio sitio. Lo demás (Supabase, CDN,
  // fuentes, API de QR) va directo a la red.
  if (url.origin !== self.location.origin) return;

  const aceptaHtml = (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  // HTML / navegación: red primero con tiempo de espera corto. Si la red
  // responde rápido, se usa (HTML fresco); si tarda más de 4 s o falla, se
  // usa de inmediato la copia en caché (la página guardada) y solo como
  // último recurso la página offline. Así el celular no se queda colgado.
  if (req.mode === 'navigate' || aceptaHtml) {
    event.respondWith(
      fetchConTimeout(req, 4000).then((res) => actualizarCache(req, res))
        .catch(() => caches.match(req)
          .then((hit) => hit || caches.match('./index.html'))
          .then((hit) => hit || caches.match('./offline.html')))
    );
    return;
  }

  // JavaScript y CSS de la app: stale-while-revalidate. Se sirve AL INSTANTE
  // desde la caché (carga rápida en el celular) y se actualiza en segundo
  // plano, así la próxima carga ya trae la última versión tras un despliegue.
  if (/\.(?:m?js|css)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req, true));
    return;
  }

  // Recursos estáticos: stale-while-revalidate (caché al instante + refresco
  // en segundo plano). Hace que el panel y los re-render se sientan rápidos.
  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Resto: red con respaldo en caché.
  event.respondWith(
    fetch(req).then((res) => actualizarCache(req, res)).catch(() => caches.match(req))
  );
});

// ---------------------------------------------------------
//  Notificaciones push (función #10 — Fase A)
//  Muestra la notificación que llega desde el servidor (Edge Function)
//  y, al hacer clic, abre el sistema.
// ---------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = { title: 'LexFive', body: '', url: './index.html' };
  try { if (event.data) data = Object.assign(data, event.data.json()); }
  catch (e) { if (event.data) data.body = event.data.text(); }
  event.waitUntil(
    self.registration.showNotification(data.title || 'LexFive', {
      body: data.body || '',
      icon: '../assets/pwa/icon-192.png',
      badge: '../assets/pwa/icon-192.png',
      data: { url: data.url || './index.html' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) { if ('focus' in w) return w.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    })
  );
});
