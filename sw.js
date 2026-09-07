// Service worker del tablero de protocolo (suplementos, comidas y peso).
// Estrategia: la pagina va por RED primero (siempre fresca; offline cae al cache).
// Assets estaticos por cache primero. La API NUNCA se cachea.
const CACHE = 'protocolo-v10';
const ASSETS = [
  './', './index.html', './estilos.css', './protocolo-lib.js', './menu-lib.js', './app.js', './nutricion.js', './avisos.js',
  './compras-pdf.js', './navegacion.js', './vendor/jspdf.umd.min.js',
  './menu/menu.json', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png',
];

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

  // Datos en vivo: derecho a la red, sin cache
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (url.origin === location.origin) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return r;
    }).catch(() => hit))
  );
});

/* ---------------------------------------------------------------------------
   Avisos. El servidor manda que decir y que marcaria cada boton, para que el
   worker no tenga que saber nada del protocolo.
   --------------------------------------------------------------------------- */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = {}; }

  const acciones = [];
  if (d.marcar && d.marcar.length) acciones.push({ action: 'hecho', title: d.rotuloHecho || 'Ya lo hice' });
  if (d.snooze !== false) acciones.push({ action: 'snooze', title: 'En 15 min' });

  e.waitUntil(self.registration.showNotification(d.titulo || 'Tu protocolo', {
    body: d.cuerpo || '',
    tag: d.tag || 'protocolo',
    renotify: true,
    icon: './icon-192.png',
    badge: './icon-192.png',
    lang: 'es-PE',
    data: d,
    actions: acciones,
    requireInteraction: false,
  }));
});

self.addEventListener('notificationclick', e => {
  const d = e.notification.data || {};
  e.notification.close();

  if (e.action === 'hecho' && d.marcar && d.marcar.length) {
    e.waitUntil(
      fetch('/api/estado', {
        method: 'POST', headers: cabeceras(d),
        body: JSON.stringify({ marcar: d.marcar }),
      })
        .then(() => avisarClientes({ tipo: 'marcado', avisoId: d.avisoId }))
        .catch(() => {})
    );
    return;
  }

  if (e.action === 'snooze') {
    e.waitUntil(
      fetch('/api/push', {
        method: 'POST', headers: cabeceras(d),
        body: JSON.stringify({ accion: 'snooze', avisoId: d.avisoId, minutos: 15 }),
      }).catch(() => {})
    );
    return;
  }

  // Toque en el cuerpo: abrir el tablero, reusando la pestana si ya esta abierta
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const abierta = cs.find(c => c.url.includes(self.location.origin));
      if (abierta) return abierta.focus();
      return self.clients.openWindow(d.url || './');
    })
  );
});

// La clave llega en el propio aviso, no de localStorage: el worker no lo ve
function cabeceras(d) {
  const h = { 'Content-Type': 'application/json' };
  if (d && d.auth) h['x-token'] = d.auth;
  return h;
}

function avisarClientes(msg) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(cs => cs.forEach(c => c.postMessage(msg)));
}
