// Service worker del tablero de suplementos.
// Estrategia: la pagina va por RED primero (siempre fresca; offline cae al cache).
// Assets estaticos (fuentes, iconos) por cache primero. Supabase NUNCA se cachea.
const CACHE = 'suplementos-v6';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Datos en vivo: dejar pasar directo a la red (sin cache)
  if (url.hostname.endsWith('supabase.co')) return;

  // Navegacion: red primero, cache de respaldo
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto: cache primero, luego red (y cachea lo del mismo origen)
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (url.origin === location.origin) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return r;
    }).catch(() => hit))
  );
});
