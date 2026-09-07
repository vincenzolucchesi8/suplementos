/* =============================================================================
   Avisos push. La app se instala en el celular y los recordatorios llegan
   aunque este cerrada: el reloj lo pone el servidor, no el navegador.
   Cada aviso trae sus botones, asi marcar no obliga a abrir el tablero.
   ============================================================================= */

const VAPID_PUBLICA = 'BDQ7DfXIB985ikVK2wqbDQ17iH88QPsgzWeTGk3XbNxnXEcEKeGNRbZ_hTmOviVarevivJd-_KzV6WOUFO9cr08';
// API y cabeceras vienen de app.js, que carga antes

// Los nueve avisos, con la hora que Alexia y el protocolo sugieren.
// Todo es editable: esto es solo el punto de partida.
const AVISOS = [
  { id: 'ayunas', nombre: 'Agua en ayunas', sub: 'El vaso de agua tibia al levantarte', hora: '07:00', cuando: 'diario' },
  { id: 'desayuno', nombre: 'Desayuno', sub: 'Con el plato que toca hoy', hora: '08:00', cuando: 'diario' },
  { id: 'media', nombre: 'Media mañana', sub: 'Opcional, según el apetito', hora: '11:00', cuando: 'diario' },
  { id: 'almuerzo', nombre: 'Almuerzo y suplementos', sub: 'La toma más importante del protocolo', hora: '13:00', cuando: 'diario' },
  { id: 'agua', nombre: 'Agua', sub: 'Solo si vas atrasado con los vasos', hora: '16:00', cuando: 'diario' },
  { id: 'merienda', nombre: 'Merienda', sub: 'Opcional, o preentreno', hora: '17:30', cuando: 'diario' },
  { id: 'cena', nombre: 'Cena, suplementos y postre', sub: 'El dulce del día va acá', hora: '20:00', cuando: 'diario' },
  { id: 'pesaje', nombre: 'Pesaje', sub: 'Miércoles, en ayunas y después del baño', hora: '07:00', cuando: 'miercoles' },
  { id: 'compras', nombre: 'Lista de compras', sub: 'El último día de cada semana del programa', hora: '18:00', cuando: 'finSemana' },
];

const CFG_KEY = 'avisos_cfg';
let estadoPush = 'cargando';   // cargando | sin-soporte | apagado | pidiendo | activo | bloqueado | error

function cfgLeer() {
  let g = {};
  try { g = JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) { g = {}; }
  const out = {};
  AVISOS.forEach(a => {
    const v = g[a.id] || {};
    out[a.id] = { on: v.on !== false, hora: v.hora || a.hora };
  });
  return out;
}
const cfgGuardar = c => localStorage.setItem(CFG_KEY, JSON.stringify(c));

/* ---------- Suscripcion ---------- */
const b64aBytes = b64 => {
  const s = (b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(s);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

const puedeAvisar = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function suscripcionActual() {
  if (!puedeAvisar()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function activarAvisos() {
  if (!puedeAvisar()) { estadoPush = 'sin-soporte'; renderAvisos(); return; }
  estadoPush = 'pidiendo'; renderAvisos();
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') { estadoPush = 'bloqueado'; renderAvisos(); return; }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64aBytes(VAPID_PUBLICA),
      });
    }
    await guardarSuscripcion(sub);
    estadoPush = 'activo';
  } catch (e) {
    estadoPush = 'error';
  }
  renderAvisos();
}

async function apagarAvisos() {
  try {
    const sub = await suscripcionActual();
    if (sub) {
      await fetch(`${API}/push`, {
        method: 'POST', headers: cabeceras(),
        body: JSON.stringify({ accion: 'baja', endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe();
    }
  } catch (e) { /* si falla, igual queda apagado del lado del servidor */ }
  estadoPush = 'apagado';
  renderAvisos();
}

async function guardarSuscripcion(sub) {
  const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima';
  const r = await fetch(`${API}/push`, {
    method: 'POST', headers: cabeceras(),
    body: JSON.stringify({ accion: 'alta', sub: sub.toJSON(), cfg: cfgLeer(), zona, inicio: INICIO }),
  });
  /* Si el servidor la rechaza (401 sin clave, por ejemplo) NO se puede decir que
     los avisos quedaron activos: el navegador tendria permiso y el servidor no
     sabria a donde mandarlos. Antes esto fallaba en silencio y el tablero decia
     "Avisos activados" mientras no llegaba ninguno. */
  if (!r.ok) throw new Error('el servidor no acepto la suscripcion (' + r.status + ')');
}

async function empujarConfig() {
  const sub = await suscripcionActual();
  if (sub) await guardarSuscripcion(sub).catch(() => {});
}

/* ---------- Render ---------- */
function renderAvisos() {
  const cont = document.getElementById('aviBody');
  if (!cont) return;
  const cfg = cfgLeer();
  const activos = AVISOS.filter(a => cfg[a.id].on).length;
  const cnt = document.getElementById('aviCount');
  if (cnt) cnt.textContent = estadoPush === 'activo' ? `${activos} de ${AVISOS.length}` : '';

  const estados = {
    cargando: ['', 'Revisando si los avisos están activados…', 'Activar avisos'],
    'sin-soporte': ['warn', 'Este navegador no puede mandar avisos. En el iPhone hay que agregar la app a la pantalla de inicio primero.', ''],
    apagado: ['', 'Los avisos están apagados. Actívalos y te llegan aunque no tengas la app abierta.', 'Activar avisos'],
    pidiendo: ['', 'Esperando que aceptes el permiso…', ''],
    activo: ['on', 'Avisos activados. Cada uno trae los botones para marcar sin abrir la app.', 'Apagar avisos'],
    bloqueado: ['warn', 'Bloqueaste las notificaciones. Se reactivan desde los ajustes del navegador para este sitio.', ''],
    error: ['warn', 'No se pudo activar. Si la app está en la pantalla de inicio, puede que le falte tu clave: ciérrala y ábrela de nuevo para pegarla.', 'Reintentar'],
  };
  const [clase, texto, boton] = estados[estadoPush] || estados.apagado;

  /* Si el plan todavia no arranco, los avisos de verdad NO se mandan: la guarda
     esta en el servidor. Decirlo aca evita la conclusion logica y equivocada de
     "active los avisos, puse una hora, no llego nada, esto no funciona". */
  const noArranco = typeof antesDeEmpezar !== 'undefined' && antesDeEmpezar;
  const cuando = noArranco
    ? new Date(Date.parse(INICIO + 'T00:00:00Z')).toLocaleDateString('es-PE',
        { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).replace(',', '')
    : '';

  cont.innerHTML =
    `<div class="avi-state ${clase}"><span class="avi-dot"></span><p>${texto}</p></div>` +
    (estadoPush === 'activo' && noArranco
      ? `<div class="avi-state"><span class="avi-dot"></span><p>El plan empieza el ${cuando}: ` +
        `hasta entonces no se manda ninguno. Usa el de prueba para comprobar que llegan.</p></div>` : '') +
    (boton ? `<div class="btns">` +
      `<button class="btn ${estadoPush === 'activo' ? 'btn-s' : 'btn-p'}" id="aviBtn" style="flex:1">${boton}</button>` +
      (estadoPush === 'activo' ? `<button class="btn btn-p" id="aviProbar" type="button">Probar ahora</button>` : '') +
      `</div>` : '');

  const btn = document.getElementById('aviBtn');
  if (btn) btn.onclick = estadoPush === 'activo' ? apagarAvisos : activarAvisos;

  const pru = document.getElementById('aviProbar');
  if (pru) pru.onclick = async () => {
    pru.disabled = true; pru.textContent = 'Mandando…';
    try {
      const r = await fetch(`${API}/push`, {
        method: 'POST', headers: cabeceras(), body: JSON.stringify({ accion: 'prueba' }),
      });
      const d = await r.json();
      pru.textContent = r.ok && d.mandados ? 'Mandado' : (d.suscripciones === 0 ? 'Sin registrar' : 'Falló');
    } catch (e) { pru.textContent = 'Falló'; }
    setTimeout(() => { pru.disabled = false; pru.textContent = 'Probar ahora'; }, 3500);
  };

  AVISOS.forEach(a => {
    const c = cfg[a.id];
    const row = document.createElement('div');
    row.className = 'avi-row' + (c.on ? '' : ' off');

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'check';
    check.setAttribute('aria-pressed', c.on ? 'true' : 'false');
    check.setAttribute('aria-label', (c.on ? 'Apagar' : 'Encender') + ' el aviso de ' + a.nombre);
    check.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';
    check.onclick = () => { const n = cfgLeer(); n[a.id].on = !n[a.id].on; cfgGuardar(n); empujarConfig(); renderAvisos(); };

    const info = document.createElement('div');
    info.className = 'avi-info';
    info.innerHTML = `<div class="avi-name">${a.nombre}</div><div class="avi-sub">${a.sub}</div>`;

    const hora = document.createElement('input');
    hora.type = 'time'; hora.value = c.hora; hora.disabled = !c.on;
    hora.setAttribute('aria-label', 'Hora del aviso de ' + a.nombre);
    hora.onchange = () => { const n = cfgLeer(); n[a.id].hora = hora.value; cfgGuardar(n); empujarConfig(); };

    row.append(check, info, hora);
    cont.appendChild(row);
  });
}

/* ---------- Arranque ---------- */
(async function initAvisos() {
  if (!puedeAvisar()) { estadoPush = 'sin-soporte'; renderAvisos(); return; }
  if (Notification.permission === 'denied') { estadoPush = 'bloqueado'; renderAvisos(); return; }
  try {
    const sub = await suscripcionActual();
    estadoPush = sub ? 'activo' : 'apagado';
    if (sub) empujarConfig();
  } catch (e) { estadoPush = 'apagado'; }
  renderAvisos();
})();

// El service worker avisa cuando se marco algo desde una notificacion
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', ev => {
    if (ev.data && ev.data.tipo === 'marcado') fullSync().then(render);
  });
}
