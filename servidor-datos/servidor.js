/* El almacen del tablero de protocolo, en el A1.

   Antes vivia en Vercel Blob y el 8-set-2026 el plan Hobby SUSPENDIO el store:
   el reloj de avisos listaba los archivos dos veces cada 5 minutos (~17.000
   operaciones al mes contra un tope de ~2.000) y desde entonces no se guardo
   nada -- ni marcas, ni suscripciones push -- sin que la app lo dijera.

   Aca no hay topes: son archivos JSON en disco, con las mismas rutas que tenia
   el blob (datos/base.json, datos/d/..., datos/subs/...). Se escribe a un
   temporal y se renombra, asi un corte a mitad nunca deja un JSON a medias.
   Detras de nginx en https://api.atom-u.com/protocolo-datos/, con clave. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = process.env.RAIZ || '/home/ubuntu/protocolo-datos-store';
const SECRETO = process.env.SECRETO || '';
const PUERTO = parseInt(process.env.PUERTO || '8798', 10);
const TOPE = 5 * 1024 * 1024;

if (!SECRETO) { console.error('falta SECRETO'); process.exit(1); }

const RUTA_OK = /^datos\/[A-Za-z0-9._\/-]+$/;
const aDisco = r => (RUTA_OK.test(r) && !r.includes('..')) ? path.join(RAIZ, r) : null;

function igual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function recorrer(dir, base, out) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of ents) {
    const abs = path.join(dir, e.name), rel = base + e.name;
    if (e.isDirectory()) recorrer(abs, rel + '/', out);
    else if (!e.name.endsWith('.tmp')) {
      const st = fs.statSync(abs);
      out.push({ pathname: rel, size: st.size, uploadedAt: st.mtime.toISOString() });
    }
  }
  return out;
}

const responder = (res, code, cuerpo, tipo = 'application/json') => {
  res.writeHead(code, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  res.end(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo));
};

http.createServer((req, res) => {
  if (!igual(req.headers['x-secreto'] || '', SECRETO)) return responder(res, 401, { error: 'sin permiso' });
  const u = new URL(req.url, 'http://x');
  const r = u.searchParams.get('r') || '';

  if (req.method === 'GET' && u.pathname === '/l') {
    const pre = u.searchParams.get('p') || 'datos/';
    if (!RUTA_OK.test(pre + 'x')) return responder(res, 400, { error: 'prefijo' });
    const todos = recorrer(path.join(RAIZ, 'datos'), 'datos/', []).filter(b => b.pathname.startsWith(pre));
    todos.sort((a, b) => a.pathname.localeCompare(b.pathname));
    return responder(res, 200, { blobs: todos });
  }

  const f = aDisco(r);
  if (!f) return responder(res, 400, { error: 'ruta' });

  if (req.method === 'GET') {
    fs.readFile(f, (err, buf) => err ? responder(res, 404, { error: 'no existe' }) : responder(res, 200, buf.toString('utf8')));
    return;
  }
  if (req.method === 'DELETE') {
    fs.rm(f, { force: true }, () => responder(res, 200, { ok: true }));
    return;
  }
  if (req.method === 'PUT') {
    const trozos = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > TOPE) req.destroy(); else trozos.push(c); });
    req.on('end', () => {
      try {
        fs.mkdirSync(path.dirname(f), { recursive: true });
        const tmp = f + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
        fs.writeFileSync(tmp, Buffer.concat(trozos));
        fs.renameSync(tmp, f);
        responder(res, 200, { ok: true });
      } catch (e) { responder(res, 500, { error: 'no se pudo escribir' }); }
    });
    return;
  }
  responder(res, 405, { error: 'metodo' });
}).listen(PUERTO, '127.0.0.1', () => console.log('protocolo-datos en', PUERTO));
