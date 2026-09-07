/* El plan del paciente como documento.
   Se guarda entero en cada escritura, no se fusiona: el que edita es uno solo
   y siempre manda el documento completo, asi que una lectura vieja no puede
   hacer dano (a diferencia del estado, que si necesita parches). */
const { leerPlan, guardarPlan, autorizado, leerCuerpo } = require('./_almacen');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!autorizado(req)) return res.status(401).json({ error: 'sin permiso' });

  try {
    if (req.method === 'GET') return res.status(200).json(await leerPlan());

    if (req.method === 'POST') {
      const cuerpo = await leerCuerpo(req);
      const plan = cuerpo.plan || cuerpo;
      if (!plan || typeof plan !== 'object' || !plan.inicio) {
        return res.status(400).json({ error: 'el plan viene incompleto' });
      }
      plan.guardado = Date.now();
      await guardarPlan(plan);
      return res.status(200).json({ ok: true, guardado: plan.guardado });
    }
    return res.status(405).json({ error: 'metodo no permitido' });
  } catch (e) {
    return res.status(500).json({ error: 'fallo el guardado' });
  }
};
