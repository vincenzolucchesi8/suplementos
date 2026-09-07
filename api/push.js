/* Alta y baja de la suscripcion push, el "en 15 min" de las notificaciones, y
   el aviso de prueba. */
const webpush = require('web-push');
const { guardarSub, borrarSub, listarSubs, leerTick, guardarTick, autorizado, leerCuerpo } = require('./_almacen');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    // Solo para comprobar que el servidor esta configurado
    return res.status(200).json({ vapid: process.env.VAPID_PUBLIC || null });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'metodo no permitido' });

  // El snooze llega desde el service worker, que no lleva la clave del tablero
  const cuerpo = await leerCuerpo(req);
  if (cuerpo.accion !== 'snooze' && !autorizado(req)) {
    return res.status(401).json({ error: 'sin permiso' });
  }

  try {
    if (cuerpo.accion === 'alta' && cuerpo.sub && cuerpo.sub.endpoint) {
      await guardarSub({
        sub: cuerpo.sub,
        cfg: cuerpo.cfg || {},
        zona: cuerpo.zona || 'America/Lima',
        inicio: cuerpo.inicio || '2026-09-01',
        ts: Date.now(),
      });
      return res.status(200).json({ ok: true });
    }

    /* Un aviso de prueba, ahora mismo. Existe porque no se puede confiar en un
       sistema de avisos que no se puede disparar a demanda: los de verdad
       dependen de la hora y del dia del programa, asi que sin esto la unica
       forma de saber si funciona es esperar y ver si llega. Se salta la guarda
       del dia porque su trabajo es justamente probar la cadena, no el plan. */
    if (cuerpo.accion === 'prueba') {
      if (!process.env.VAPID_PUBLIC || !process.env.VAPID_PRIVATE) {
        return res.status(500).json({ error: 'faltan las llaves VAPID' });
      }
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:vincenzolucchesi8@gmail.com',
        process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE
      );
      const subs = await listarSubs();
      let mandados = 0, muertas = 0;
      for (const s of subs) {
        try {
          await webpush.sendNotification(s.sub, JSON.stringify({
            titulo: 'Prueba del tablero',
            cuerpo: 'Si ves esto, los avisos funcionan. El primero de verdad llega manana.',
            tag: 'prueba', avisoId: 'prueba', snooze: false, url: '/',
            auth: process.env.APP_TOKEN || '',
          }));
          mandados++;
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) { await borrarSub(s.sub.endpoint); muertas++; }
        }
      }
      return res.status(200).json({ ok: true, suscripciones: subs.length, mandados, muertas });
    }

    if (cuerpo.accion === 'baja' && cuerpo.endpoint) {
      await borrarSub(cuerpo.endpoint);
      return res.status(200).json({ ok: true });
    }

    if (cuerpo.accion === 'snooze' && cuerpo.avisoId) {
      const minutos = Math.min(120, Math.max(1, parseInt(cuerpo.minutos, 10) || 15));
      const datos = await leerTick();
      datos.snooze = (datos.snooze || []).filter(s => s.avisoId !== cuerpo.avisoId);
      datos.snooze.push({ avisoId: cuerpo.avisoId, cuando: Date.now() + minutos * 60000 });
      await guardarTick(datos);
      return res.status(200).json({ ok: true, en: minutos });
    }

    return res.status(400).json({ error: 'accion desconocida' });
  } catch (e) {
    return res.status(500).json({ error: 'fallo el guardado' });
  }
};
