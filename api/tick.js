/* El reloj de los avisos.
   Vercel en plan Hobby solo corre un cron al dia, asi que el que llama aca cada
   5 minutos es un cron del A1. Esta funcion decide que toca y lo manda.

   Cada aviso se manda UNA vez al dia: queda anotado en `enviados`. Y si algo
   ya esta marcado en el tablero, no se manda: el aviso que llega cuando ya
   hiciste la cosa es exactamente lo que hace que la gente apague los avisos. */
const webpush = require('web-push');
const MenuLib = require('../menu-lib.js');
const PlanLib = require('../plan-lib.js');
const MENU = require('../menu/menu.json');
const { listarSubs, borrarSub, leerTick, guardarTick, leerEstado, leerPlan } = require('./_almacen');

const TOLERANCIA_MIN = 90;   // si el cron estuvo caido mas de esto, no se dispara tarde

function enZona(zona, cuando) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  }).formatToParts(cuando).reduce((a, p) => (a[p.type] = p.value, a), {});
  const dowIdx = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    fecha: `${f.year}-${f.month}-${f.day}`,
    minutos: parseInt(f.hour, 10) * 60 + parseInt(f.minute, 10),
    dow: dowIdx[f.weekday] !== undefined ? dowIdx[f.weekday] : 0,
  };
}

const aMinutos = hhmm => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
};

const marcada = (estado, k) => !!(estado[k] && estado[k].v === '1');

const vasosDeAgua = (estado, fecha) => {
  let n = 0;
  for (let i = 1; i <= 8; i++) if (marcada(estado, `${fecha}:R:agua${i}`)) n++;
  return n;
};

/* Arma el texto y los botones de cada aviso. Devuelve null si hoy no toca. */
function armar(avisoId, ctx) {
  const { fecha, dia, comidas, estado } = ctx;
  const supl = PlanLib.suplDeDia(ctx.plan, dia).items;
  const listaSupl = m => supl.filter(s => s.meal === m).map(s => `${s.name} (${s.dose})`).join(', ');
  const clavesSupl = m => supl.filter(s => s.meal === m).map(s => `${fecha}:${m}:${s.id}`);

  switch (avisoId) {
    case 'ayunas':
      if (marcada(estado, `${fecha}:R:agua1`)) return null;
      return { titulo: 'Vaso de agua en ayunas',
        cuerpo: 'Agua tibia antes de cualquier otra cosa.',
        marcar: [`${fecha}:R:agua1`], rotuloHecho: 'Ya lo tomé' };

    case 'desayuno': {
      if (marcada(estado, `${fecha}:Desayuno:m1`)) return null;
      const d = comidas && comidas.desayuno;
      return { titulo: 'Hora del desayuno',
        cuerpo: d ? d.titulo : 'Elige una de las opciones del plan.',
        marcar: [`${fecha}:Desayuno:m1`], rotuloHecho: 'Ya desayuné' };
    }

    case 'media':
      return { titulo: 'Media mañana',
        cuerpo: (comidas && comidas.mediaManana ? comidas.mediaManana.titulo : 'Fruta y frutos secos.') + ' Opcional: solo si tienes hambre.',
        marcar: null, snooze: false };

    case 'almuerzo': {
      if (marcada(estado, `${fecha}:Almuerzo:m2`)) return null;
      const a = comidas && comidas.almuerzo;
      const cuerpo = a
        ? `${a.titulo}. Con ${a.verdura.toLowerCase()} y ${a.carbo.toLowerCase()}.` + (listaSupl('Almuerzo') ? ` Toma: ${listaSupl('Almuerzo')}.` : '')
        : `Método del plato.` + (listaSupl('Almuerzo') ? ` Toma: ${listaSupl('Almuerzo')}.` : '');
      return { titulo: 'Almuerzo y suplementos', cuerpo,
        marcar: [`${fecha}:Almuerzo:m2`, `${fecha}:Almuerzo:v2`, ...clavesSupl('Almuerzo')],
        rotuloHecho: 'Comí y tomé todo' };
    }

    case 'agua': {
      const n = vasosDeAgua(estado, fecha);
      if (n >= 6) return null;                       // ya llegaste a la meta
      return { titulo: `Te faltan ${6 - n} vasos de agua`,
        cuerpo: 'La meta del día es 6, y lo ideal son 8.',
        marcar: [`${fecha}:R:agua${Math.min(8, n + 1)}`], rotuloHecho: 'Me tomé uno' };
    }

    case 'merienda':
      return { titulo: 'Merienda',
        cuerpo: (comidas && comidas.merienda ? comidas.merienda.titulo : 'Yogurt proteico o fruta con barrita.') + ' Opcional.',
        marcar: null, snooze: false };

    case 'cena': {
      if (marcada(estado, `${fecha}:Cena:m3`)) return null;
      const c = comidas && comidas.cena;
      const post = comidas && comidas.postre ? ` De postre: ${comidas.postre.titulo.toLowerCase()}.` : '';
      const cuerpo = c
        ? `${c.titulo}.` + (c.tipo === 'plato' ? ` Con ${c.verdura.toLowerCase()} y ${c.carbo.toLowerCase()}.` : '') +
          (listaSupl('Cena') ? ` Toma: ${listaSupl('Cena')}.` : '') + post
        : 'Método del plato o tortilla.' + post;
      const claves = [`${fecha}:Cena:m3`, ...clavesSupl('Cena')];
      if (c && c.tipo === 'plato') claves.push(`${fecha}:Cena:v3`);
      return { titulo: 'Cena, suplementos y postre', cuerpo, marcar: claves, rotuloHecho: 'Comí y tomé todo' };
    }

    case 'pesaje':
      if (estado[`${fecha}:W:kg`]) return null;
      return { titulo: 'Toca pesarte',
        cuerpo: 'En ayunas y después de ir al baño. Anótalo en el tablero.',
        marcar: null };

    case 'compras':
      return { titulo: 'Lista de compras',
        cuerpo: 'Mañana arranca una semana nueva del menú. Revisa qué te falta.',
        marcar: null };

    default:
      return null;
  }
}

function tocaHoy(avisoId, ctx) {
  const def = { pesaje: 'miercoles', compras: 'finSemana' }[avisoId] || 'diario';
  if (def === 'miercoles') return ctx.dow === 3;
  if (def === 'finSemana') return ctx.dia % 7 === 0;
  return true;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const secreto = process.env.TICK_SECRET;
  const dado = req.query && req.query.s ? req.query.s : (req.headers['x-tick'] || '');
  if (!secreto || dado !== secreto) return res.status(401).json({ error: 'sin permiso' });

  if (!process.env.VAPID_PUBLIC || !process.env.VAPID_PRIVATE) {
    return res.status(500).json({ error: 'faltan las llaves VAPID' });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:vincenzolucchesi8@gmail.com',
    process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE
  );

  const datos = await leerTick();
  const subs = await listarSubs();
  const estado = await leerEstado();
  // Las fases y la fecha de arranque salen del plan guardado, no del codigo
  const plan = PlanLib.normalizar(await leerPlan());
  const ahora = new Date();
  const enviados = datos.enviados || {};
  const mandados = [];
  let cambio = false;

  let vivas = 0;
  for (const s of subs) {
    const zona = s.zona || 'America/Lima';
    const { fecha, minutos, dow } = enZona(zona, ahora);
    const inicio = plan.inicio || s.inicio || '2026-09-01';
    const dia = Math.floor((Date.parse(fecha + 'T00:00:00Z') - Date.parse(inicio + 'T00:00:00Z')) / 86400000) + 1;
    const off = c => {
      const v = estado[`${fecha}:MO:${c}`];
      return v && v.v ? (parseInt(v.v, 10) || 0) : 0;
    };
    if (dia < 1) continue;               // el plan todavia no arranca: no se avisa nada
    const comidas = MenuLib.resolverDia(MENU, dia, off);
    const ctx = { fecha, dia, dow, comidas, estado, plan };

    const pendientes = [];

    // Avisos de la agenda
    Object.entries(s.cfg || {}).forEach(([avisoId, c]) => {
      if (!c || c.on === false) return;
      const h = aMinutos(c.hora);
      if (h === null) return;
      const atraso = minutos - h;
      if (atraso < 0 || atraso > TOLERANCIA_MIN) return;
      if (!tocaHoy(avisoId, ctx)) return;
      if (enviados[`${fecha}:${avisoId}`]) return;
      pendientes.push(avisoId);
    });

    // Los "en 15 min" que ya vencieron
    (datos.snooze || []).forEach(sn => {
      if (sn.cuando <= ahora.getTime() && !pendientes.includes(sn.avisoId)) pendientes.push(sn.avisoId);
    });

    let sigueViva = true;
    for (const avisoId of pendientes) {
      const carga = armar(avisoId, ctx);
      if (!carga) { enviados[`${fecha}:${avisoId}`] = ahora.getTime(); cambio = true; continue; }
      try {
        // La clave viaja DENTRO del payload, que va cifrado de extremo a extremo
        // hasta el dispositivo: es la unica forma de que los botones de la
        // notificacion puedan marcar, porque el service worker no lee localStorage.
        await webpush.sendNotification(s.sub, JSON.stringify({
          ...carga, avisoId, tag: avisoId, url: '/', auth: process.env.APP_TOKEN || '',
        }));
        enviados[`${fecha}:${avisoId}`] = ahora.getTime();
        mandados.push(avisoId);
        cambio = true;
      } catch (e) {
        // 404 o 410 = la suscripcion murio (app desinstalada, permiso revocado)
        if (e.statusCode === 404 || e.statusCode === 410) { sigueViva = false; break; }
      }
    }
    if (sigueViva) vivas++; else await borrarSub(s.sub.endpoint);
  }

  // Limpiar snoozes vencidos y anotaciones viejas
  const antes = (datos.snooze || []).length;
  datos.snooze = (datos.snooze || []).filter(sn => sn.cuando > ahora.getTime());
  if (datos.snooze.length !== antes) cambio = true;

  const corte = ahora.getTime() - 10 * 86400000;
  Object.keys(enviados).forEach(k => { if (enviados[k] < corte) { delete enviados[k]; cambio = true; } });

  if (cambio) {
    datos.enviados = enviados;
    await guardarTick(datos);
  }

  return res.status(200).json({ ok: true, suscripciones: vivas, mandados });
};
