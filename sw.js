/* Service worker del tablero de protocolo (suplementos, comidas y peso).

   BUG QUE ESTO ARREGLA -- vale la pena escribirlo, porque rompio la app en
   silencio despues de CADA despliegue: la pagina iba por red (HTML nuevo) y
   TODO lo demas por cache primero (JS viejo). O sea que la primera vez que
   abrias la app despues de un deploy, el marcado nuevo se pintaba con el
   codigo viejo: los botones nuevos existian en la pantalla y sus handlers no
   existian en ningun lado, asi que no hacian NADA y no salia un solo error
   visible. Se arreglaba solo al volver a abrir, que es justo lo que hace que
   parezca "a veces funciona".

   Regla nueva: el codigo viaja junto. HTML, JS, CSS y JSON van por RED
   primero y caen al cache solo si no hay red; las imagenes, los iconos y las
   librerias con version en el nombre siguen por cache, que es donde el cache
   sirve de verdad. Y al activarse una version nueva se avisa a las pestanas
   abiertas para que se recarguen cuando el usuario no este tocando nada. */
const CACHE = 'protocolo-v46';
const ASSETS = [
  './', './index.html', './estilos.css', './plan-lib.js', './api-cliente.js', './plan.js', './menu/generador.js',
  './menu-lib.js', './app.js', './nutricion.js', './avisos.js', './plan-editor.js',
  './compras-pdf.js', './menu-pdf.js', './informe-pdf.js', './navegacion.js', './movimiento.js', './instalar.js', './clave.js',
  // jspdf NO va aca: son 420 KB para algo que se usa al tocar un boton. Se
  // baja la primera vez que se pide y se queda cacheado desde entonces.
  './menu/menu.json', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png',
  // los 24 platos del menu: son lo primero que se ve al abrir
  './img/platos/d_batido_lucuma.webp', './img/platos/d_batido_platano.webp', './img/platos/d_bowl_mango.webp', './img/platos/d_bowl_manzana.webp', './img/platos/d_bowl_papaya.webp', './img/platos/d_omelette_champ.webp', './img/platos/d_omelette_esp.webp', './img/platos/d_revueltos_jamon.webp', './img/platos/d_revueltos_pavo.webp', './img/platos/d_wrap_pollo.webp', './img/platos/o_champ.webp', './img/platos/o_espinaca.webp', './img/platos/o_verduras.webp', './img/platos/p_atun.webp', './img/platos/p_bonito.webp', './img/platos/p_jurel.webp', './img/platos/p_lomo.webp', './img/platos/p_merluza.webp', './img/platos/p_perico.webp', './img/platos/p_pollo_horno.webp', './img/platos/p_pollo_plancha.webp', './img/platos/p_pollo_sudado.webp', './img/platos/p_res.webp', './img/platos/p_trucha.webp',
  './img/pescado.webp', './img/pollo.webp', './img/carne.webp', './img/atun.webp', './img/omelette.webp', './img/revueltos.webp', './img/bowl.webp', './img/batido.webp', './img/wrap.webp', './img/palta.webp', './img/quinoa.webp', './img/menestras.webp',
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
      .then(() => avisarClientes({ tipo: 'nueva-version', cache: CACHE }))
  );
});

// lo que puede vivir del cache sin riesgo de descuadre: no lleva logica dentro
// El menu y la libreria de PDF entran aca: no llevan logica de la app y solo
// cambian cuando se despliega, y el cache lleva el nombre de la version.
const ESTATICO = /(\.(png|jpg|jpeg|webp|svg|ico|woff2?)$|menu\/menu\.json$|vendor\/)/i;

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

  const guardar = r => {
    if (r && r.ok && url.origin === location.origin) {
      const cp = r.clone();
      caches.open(CACHE).then(c => c.put(req, cp));
    }
    return r;
  };

  // Imagenes y tipografias: del cache, que es donde el cache sirve
  if (ESTATICO.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(guardar)));
    return;
  }

  // Todo lo que lleva logica (js, css, json): de la RED, y del cache solo si
  // no hay red. Nunca puede servirse codigo de una version distinta a la del
  // HTML que ya se pinto.
  e.respondWith(
    fetch(req).then(guardar).catch(() => caches.match(req))
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
