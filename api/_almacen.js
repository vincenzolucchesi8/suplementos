/* Guardado en Vercel Blob, store PRIVADO: la data no queda en una URL publica.

   TRAMPA YA PAGADA: las lecturas del blob son eventualmente consistentes. Medido
   el 6-set-2026, un valor recien escrito tarda varios segundos en verse: se
   escribio 1, 2 y 3 seguidos y las lecturas devolvieron "-, -, 2". Con un
   leer-modificar-escribir eso BORRA datos: si el celular marca algo y la laptop
   sincroniza dos segundos despues con una lectura vieja, la marca del celular
   desaparece del servidor y, si el celular ya se cerro, no vuelve nunca.

   Por eso nada aca pisa un documento compartido:
   - el estado se guarda como PARCHES nuevos (`datos/d/...`) sobre una base, y
     leer es fusionar la base con todos los parches. Un parche que todavia no se
     ve solo llega tarde, nunca se pierde.
   - cada suscripcion push vive en su propio archivo, asi el alta de un aparato
     no puede borrar la de otro.
   - lo que solo escribe el cron (avisos ya mandados) si va en un archivo unico:
     tiene un solo escritor cada 5 minutos, muy lejos de la ventana del problema.
*/
const { put, get, list, del } = require('@vercel/blob');
const crypto = require('crypto');

const BASE = 'datos/base.json';
const DELTAS = 'datos/d/';
const SUBS = 'datos/subs/';
const TICK = 'datos/tick.json';
const TOPE_PARCHES = 25;   // pasado esto se compacta la base

async function leerJSON(ruta, porDefecto) {
  try {
    const r = await get(ruta, { access: 'private' });
    if (!r || r.statusCode !== 200) return porDefecto;
    const trozos = [];
    for await (const t of r.stream) trozos.push(t);
    return JSON.parse(Buffer.concat(trozos).toString('utf8'));
  } catch (e) {
    return porDefecto;   // todavia no existe
  }
}

function escribirJSON(ruta, dato) {
  return put(ruta, JSON.stringify(dato), {
    access: 'private', contentType: 'application/json',
    allowOverwrite: true, addRandomSuffix: false, cacheControlMaxAge: 0,
  });
}

/* Merge por ultima escritura, el mismo criterio que usa el navegador */
function fusionar(a, b) {
  const out = {};
  new Set([...Object.keys(a || {}), ...Object.keys(b || {})]).forEach(k => {
    const x = (a || {})[k], y = (b || {})[k];
    out[k] = (!y || (x && x.t >= y.t)) ? x : y;
  });
  return out;
}

// ---------------- Estado del tablero ----------------

async function leerEstado() {
  const base = await leerJSON(BASE, {});
  const { blobs } = await list({ prefix: DELTAS, limit: 1000 });
  const parches = await Promise.all(
    blobs.map(b => leerJSON(b.pathname, {}))
  );
  return parches.reduce((acc, p) => fusionar(acc, p), base);
}

/* Guarda SOLO lo que llega, en un archivo nuevo. Nunca reescribe lo anterior. */
async function guardarParche(parche) {
  if (!parche || !Object.keys(parche).length) return;
  const nombre = `${DELTAS}${Date.now()}-${crypto.randomBytes(5).toString('hex')}.json`;
  await escribirJSON(nombre, parche);
}

/* Junta los parches en la base cuando se acumulan. Solo borra los que fusiono,
   asi un parche escrito durante la compactacion sobrevive. */
async function compactar() {
  const { blobs } = await list({ prefix: DELTAS, limit: 1000 });
  if (blobs.length < TOPE_PARCHES) return { compactados: 0 };
  const base = await leerJSON(BASE, {});
  const rutas = blobs.map(b => b.pathname);
  const parches = await Promise.all(rutas.map(r => leerJSON(r, {})));
  const nueva = parches.reduce((acc, p) => fusionar(acc, p), base);
  await escribirJSON(BASE, nueva);
  await del(rutas).catch(() => {});
  return { compactados: rutas.length };
}

// ---------------- Suscripciones push ----------------

const idDeEndpoint = e => crypto.createHash('sha1').update(e).digest('hex').slice(0, 20);

async function listarSubs() {
  const { blobs } = await list({ prefix: SUBS, limit: 100 });
  const subs = await Promise.all(blobs.map(b => leerJSON(b.pathname, null)));
  return subs.filter(s => s && s.sub && s.sub.endpoint);
}
const guardarSub = registro =>
  escribirJSON(`${SUBS}${idDeEndpoint(registro.sub.endpoint)}.json`, registro);
const borrarSub = endpoint =>
  del(`${SUBS}${idDeEndpoint(endpoint)}.json`).catch(() => {});

// ---------------- Bitacora del cron (un solo escritor) ----------------
const leerTick = () => leerJSON(TICK, { enviados: {}, snooze: [] });
const guardarTick = d => escribirJSON(TICK, d);

/* El tablero es de una sola persona: una clave compartida alcanza para que no
   sea escribible por cualquiera que encuentre la URL. Si no hay APP_TOKEN
   configurado, la API queda abierta y el tablero funciona igual. */
function autorizado(req) {
  const esperado = process.env.APP_TOKEN;
  if (!esperado) return true;
  const dado = req.headers['x-token'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return dado === esperado;
}

const leerCuerpo = req => new Promise(res => {
  if (req.body && typeof req.body === 'object') return res(req.body);
  let d = '';
  req.on('data', c => { d += c; });
  req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch (e) { res({}); } });
});

module.exports = {
  leerEstado, guardarParche, compactar, fusionar,
  listarSubs, guardarSub, borrarSub,
  leerTick, guardarTick,
  autorizado, leerCuerpo,
};
