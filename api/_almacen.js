/* Guardado en Vercel Blob, store PRIVADO: la data no queda en una URL publica.
   Es un usuario solo, asi que un JSON por cosa alcanza y sobra. */
const { put, get } = require('@vercel/blob');

const RUTA_ESTADO = 'datos/estado.json';
const RUTA_PUSH = 'datos/push.json';

async function leer(ruta, porDefecto) {
  try {
    const r = await get(ruta, { access: 'private' });
    if (!r || r.statusCode !== 200) return porDefecto;
    const trozos = [];
    for await (const t of r.stream) trozos.push(t);
    return JSON.parse(Buffer.concat(trozos).toString('utf8'));
  } catch (e) {
    return porDefecto;   // todavia no existe: primera escritura
  }
}

async function escribir(ruta, dato) {
  await put(ruta, JSON.stringify(dato), {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
    addRandomSuffix: false,
    cacheControlMaxAge: 0,
  });
}

const leerEstado = () => leer(RUTA_ESTADO, {});
const guardarEstado = e => escribir(RUTA_ESTADO, e);
const leerPush = () => leer(RUTA_PUSH, { subs: [], enviados: {}, snooze: [] });
const guardarPush = p => escribir(RUTA_PUSH, p);

/* Merge por ultima escritura, el mismo criterio que usa el navegador */
function fusionar(a, b) {
  const out = {};
  new Set([...Object.keys(a || {}), ...Object.keys(b || {})]).forEach(k => {
    const x = (a || {})[k], y = (b || {})[k];
    out[k] = (!y || (x && x.t >= y.t)) ? x : y;
  });
  return out;
}

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
  leerEstado, guardarEstado, leerPush, guardarPush,
  fusionar, autorizado, leerCuerpo,
};
