/* Aura · service worker: permite abrir la app sin conexión.
   - La página (index.html), los estilos (estilos.css) y el código (js/*.js): primero la red, para recibir siempre
     la versión nueva de cada archivo; sin red, la copia guardada.
   - Íconos y manifest: copia guardada, que se renueva en segundo plano.
   - Librerías y fuentes (jsdelivr, cdnjs, Google Fonts): copia guardada.
   - Supabase (datos, sesión y archivos): nunca se guarda aquí; siempre va a la red.
   Al cambiar archivos fijos, subir el número de CACHE para renovar la copia.
   aura-v2 (24 oct 2026): ícono nuevo (amanecer con camino).
   aura-v3 (25 oct 2026): código dividido en estilos.css y js/ (versión 22). Si se agrega un archivo a js/, sumarlo a CODE.
   aura-v4 (31 oct 2026): avisos (notificaciones push): js/avisos.js y los eventos «push» y «notificationclick» al final. */
const CACHE = 'aura-v4';
const CODE = ['estilos.css', 'js/base.js', 'js/catalogos.js', 'js/datos.js', 'js/nube.js', 'js/organizador.js', 'js/calendario-pasos.js',
  'js/mi-dia.js', 'js/salud.js', 'js/cuerpo.js', 'js/finanzas.js', 'js/registro.js', 'js/foto-ia.js', 'js/avisos.js', 'js/inicio.js'];
const CORE = ['./', 'index.html', 'manifest.json', 'icono.svg', 'apple-touch-icon.png', 'icono-192.png', 'icono-512.png'].concat(CODE);
const CDN = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;

  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('/index.html'))) {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put('index.html', copy));
      return r;
    }).catch(() => caches.match('index.html')));
    return;
  }

  // Estilos y código: primero la red (con la caché del navegador saltada), para que todos los archivos sean de la misma versión.
  if (url.origin === location.origin && /\.(js|css)$/.test(url.pathname) && !url.pathname.endsWith('/sw.js')) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  if (CDN.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    })));
  }
});

// Avisos (31 oct 2026): la función «avisos» de Supabase manda {title, body, tag, url} cifrado; aquí se muestra.
// En el iPhone cada push debe terminar en una notificación visible (si no, iOS puede quitar el permiso).
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Aura', {
    body: d.body || '', tag: d.tag || undefined, icon: 'icono-192.png', badge: 'icono-192.png', data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) { if ('focus' in w) return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
