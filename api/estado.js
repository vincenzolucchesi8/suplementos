/* Sincroniza el tablero entre el celular y la computadora.
   Reemplaza al Supabase que el free tier dejo pausado. Mismo formato de claves
   (YYYY-MM-DD:...) y mismo merge, asi lo ya marcado no se pierde. */
const { leerEstado, guardarEstado, fusionar, autorizado, leerCuerpo } = require('./_almacen');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!autorizado(req)) return res.status(401).json({ error: 'sin permiso' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await leerEstado());
    }

    if (req.method === 'POST') {
      const cuerpo = await leerCuerpo(req);
      const actual = await leerEstado();

      // Desde el service worker: marcar claves sueltas (boton de una notificacion)
      if (Array.isArray(cuerpo.marcar)) {
        const ahora = Date.now();
        const parche = {};
        cuerpo.marcar.forEach(k => {
          if (typeof k === 'string' && /^\d{4}-\d{2}-\d{2}:/.test(k)) parche[k] = { v: '1', t: ahora };
        });
        const nuevo = fusionar(actual, parche);
        await guardarEstado(nuevo);
        return res.status(200).json({ ok: true, marcadas: Object.keys(parche).length });
      }

      // Desde el tablero: fusionar el estado completo
      const nuevo = fusionar(actual, cuerpo.state || cuerpo || {});
      await guardarEstado(nuevo);
      return res.status(200).json(nuevo);
    }

    return res.status(405).json({ error: 'metodo no permitido' });
  } catch (e) {
    return res.status(500).json({ error: 'fallo el guardado' });
  }
};
