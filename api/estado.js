/* Sincroniza el tablero entre el celular y la computadora.
   Reemplaza al Supabase que el free tier dejo pausado. Mismo formato de claves
   (YYYY-MM-DD:...) y mismo merge, asi lo ya marcado no se pierde. */
const { leerEstado, guardarParche, compactar, fusionar, leerReinicio, despuesDe, autorizado, leerCuerpo } = require('./_almacen');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!autorizado(req)) return res.status(401).json({ error: 'sin permiso' });

  try {
    const reinicio = await leerReinicio();
    // el telefono ve la marca y borra lo suyo una sola vez (app.js, cloudPull)
    const conMarca = e => reinicio ? { ...e, __reinicio: { v: String(reinicio.ts), t: reinicio.ts } } : e;

    if (req.method === 'GET') {
      return res.status(200).json(conMarca(despuesDe(await leerEstado(), reinicio)));
    }

    if (req.method === 'POST') {
      const cuerpo = await leerCuerpo(req);

      // Desde el service worker: marcar claves sueltas (boton de una notificacion)
      if (Array.isArray(cuerpo.marcar)) {
        const ahora = Date.now();
        const parche = {};
        cuerpo.marcar.forEach(k => {
          if (typeof k === 'string' && /^\d{4}-\d{2}-\d{2}:/.test(k)) parche[k] = { v: '1', t: ahora };
        });
        await guardarParche(parche);
        return res.status(200).json({ ok: true, marcadas: Object.keys(parche).length });
      }

      // Desde el tablero: llega su estado completo y se guarda como parche.
      // Se responde con la fusion para que el navegador vea de una lo del otro
      // aparato, aunque el parche recien escrito todavia no se liste.
      const entrante = despuesDe(cuerpo.state || {}, reinicio);
      delete entrante.__reinicio;
      await guardarParche(entrante);
      compactar().catch(() => {});   // en segundo plano, sin bloquear la respuesta
      const guardado = await leerEstado();
      return res.status(200).json(conMarca(fusionar(despuesDe(guardado, reinicio), entrante)));
    }

    return res.status(405).json({ error: 'metodo no permitido' });
  } catch (e) {
    return res.status(500).json({ error: 'fallo el guardado' });
  }
};
