/* Armar el plato con lo que hay en casa.

   El plan de Alexia no es una lista de platos: es un metodo (proteina,
   carbohidrato, verduras, grasa) con porciones fijas. Aqui cada comida del dia
   se puede rearmar por partes: si no hay yogurt, se cambia por otra proteina
   del desayuno y la porcion la pone el plan. Se busca escribiendo (predictivo y
   tolerante a errores), se escribe una lista como en notas, o se dicta.

   Lo armado se guarda por dia y comida en `fecha:AR:D|A|C` (JSON {grupo:[ids]}),
   en la misma estructura que se sincroniza entre aparatos. Mientras no se toque,
   la comida es la del menu. comidasDeDia() lo aplica, asi que las frecuencias
   de la semana, el calendario y la lista de compras cuentan lo que de verdad
   vas a comer. */

(function(){
'use strict';

const { ING, DESDE_MENU, LETRA, COMIDAS_AR, SLOTS, GNOM, MULTI, grupoEn, porcion, imgDe, textoPlato } = ArmarLib;
const claveAR = (dia, c) => `${dsDiaG(dia)}:AR:${CLAVE_DE[c]}`;

/* El menu tal cual, sin lo armado encima: es el punto de partida. */
function menuSinArmar(dia){
  const ds = dsDiaG(dia);
  return MenuLib.resolverDia(MENU, dia, k => parseInt(valorDe(`${ds}:MO:${k}`) || '0', 10) || 0);
}
function desdeMenu(m, c){
  const out = {};
  if (!m || !m.ing) return out;
  const ids = m.ing.map(([k]) => DESDE_MENU[k] || k).filter(id => ING[id] && grupoEn(ING[id], c));
  // el atun del almuerzo ya trae su huevo cocido
  const limpio = ids.includes('atun') ? ids.filter(id => id !== 'huevo') : ids;
  limpio.forEach(id => { const g = grupoEn(ING[id], c); if (!(out[g] || []).includes(id)) out[g] = MULTI(g) ? [...(out[g] || []), id] : [id]; });
  return out;
}
function guardado(dia, c){
  const v = valorDe(claveAR(dia, c));
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}
function platoDe(dia, c){
  const g = guardado(dia, c);
  if (g) return g;
  const m = menuSinArmar(dia);
  return m ? desdeMenu(c === 'Desayuno' ? m.desayuno : c === 'Almuerzo' ? m.almuerzo : m.cena, c) : {};
}
function guardar(dia, c, plato){
  setMark(claveAR(dia, c), JSON.stringify(plato));
  refrescar(dia);
}
/* Hoy y, si esta abierto, el dia del calendario: los dos muestran lo mismo */
function refrescar(dia){
  if (typeof sincronizarFrecuencias === 'function') sincronizarFrecuencias(dia);
  render();
  if (typeof pintarHoja === 'function' && typeof hojaPila !== 'undefined' && hojaPila.length) pintarHoja();
}

/* ---------- las reglas del plan, sobre el dia entero ---------- */
const lleva = (plato, flag) => Object.values(plato).flat().some(id => ING[id] && ING[id][flag]);
const otros = (dia, c, flag) => COMIDAS_AR.filter(x => x !== c).some(x => lleva(platoDe(dia, x), flag));
const omelette = plato => (plato.prot || []).includes('huevo');

function bloqueo(x, c, dia, plato){
  if (x.fuera) return x.fuera;
  if (x.info) return x.info;
  const g = grupoEn(x, c);
  if (!g) return (x.no && x.no[LETRA[c]]) || `No va en ${c === 'Cena' ? 'la cena' : 'el ' + c.toLowerCase()}`;
  if (x.huevo && otros(dia, c, 'huevo')) return 'Ya comes huevo hoy: una vez al día';
  if (x.palta && otros(dia, c, 'palta')) return 'Ya comes palta hoy: media al día';
  if (c === 'Cena'){
    const om = omelette(plato) || x.id === 'huevo';
    if (g === 'grasa' && !om) return 'En la cena no va grasa, salvo con omelette';
    if (g === 'carb' && x.noCena) return 'En la cena: quinoa, papa o ñoquis';
    if (g === 'carb' && x.soloOmel && !om) return 'Va solo con el omelette';
    if (g === 'carb' && om && !x.soloOmel) return 'Con omelette, el carbohidrato es wrap o salmas';
  }
  return '';
}
/* Lo que el cambio deja fuera de regla o sin sentido se cae solo: la papa al
   pasar a omelette, la granola cuando se va el yogurt, la leche sin batido. */
function depurar(plato, c, dia){
  const todos = () => Object.values(plato).flat();
  for (let vuelta = 0; vuelta < 2; vuelta++)
    for (const g of Object.keys(plato))
      plato[g] = plato[g].filter(id => !bloqueo(ING[id], c, dia, plato) && (!ING[id].pide || todos().includes(ING[id].pide)));
  return plato;
}
function poner(dia, c, id, reemplaza, base){
  const plato = JSON.parse(JSON.stringify(base || platoDe(dia, c)));
  const x = ING[id], g = grupoEn(x, c);
  if (reemplaza) Object.keys(plato).forEach(k => { plato[k] = plato[k].filter(i => i !== reemplaza); });
  plato[g] = MULTI(g) ? [...new Set([...(plato[g] || []), id])] : [id];
  return depurar(plato, c, dia);
}

/* ---------- lo que hay en casa ----------
   No se pregunta de nuevo: lo que marcaste como comprado en la lista de esta
   semana (o de la anterior) ya cuenta como que hay. Encima de eso, cada
   ingrediente se puede marcar a mano como "hay" o "se acabó", y eso manda.
   Se guarda por semana (`<lunes>:T:<id>`, '1' hay y '2' se acabó) para que la
   compra nueva empiece limpia y viaje al otro aparato como todo lo demas. */
const semDe = dia => dsDiaG(Math.floor((dia - 1) / 7) * 7 + 1);
const claveT = (dia, id) => `${semDe(dia)}:T:${id}`;
const deCompra = k => ArmarLib.DE_COMPRA[k] || (DESDE_MENU[k] ? [DESDE_MENU[k]] : ING[k] ? [k] : []);
const EN_CASA = Object.values(ING).filter(x => x.g && !x.fuera && !x.info);
function despensa(dia){
  const compradas = new Set();
  [dia, dia - 7].filter(d => d >= 1).forEach(d => {
    const pre = semDe(d) + ':C:';
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(pre) && localStorage.getItem(k) === '1') deCompra(k.slice(pre.length)).forEach(id => compradas.add(id));
    });
  });
  const mano = id => valorDe(claveT(dia, id)) || (dia > 7 ? valorDe(claveT(dia - 7, id)) : null);
  const marcadas = EN_CASA.filter(x => mano(x.id)).length;
  return {
    usa: compradas.size > 0 || marcadas > 0,   // sin ningun dato no se le dice a nadie "no tienes"
    tiene: id => { const t = mano(id); return t === '1' ? true : t === '2' ? false : compradas.has(id); },
  };
}

/* Rearma la comida con lo que hay: lo que falta en casa se cambia por otra
   cosa del mismo grupo que si este, respetando las reglas del dia. Lo que no
   tiene reemplazo se dice con nombre, no se inventa. */
function conLoQueHay(dia, c){
  const casa = despensa(dia);
  let plato = JSON.parse(JSON.stringify(platoDe(dia, c)));
  const hechos = [], sin = [];
  const alterna = (g, sacar) => EN_CASA.find(x => grupoEn(x, c) === g && casa.tiene(x.id) &&
    !(plato[g] || []).includes(x.id) && !bloqueo(x, c, dia, sacar ? quitarDe(plato, sacar) : plato));
  const quitarDe = (p, id) => { const q = JSON.parse(JSON.stringify(p)); Object.keys(q).forEach(k => { q[k] = q[k].filter(i => i !== id); }); return q; };
  SLOTS[c].forEach(([g]) => {
    (plato[g] || []).slice().forEach(id => {
      if (casa.tiene(id)) return;
      const otra = alterna(g, id);
      if (otra){ plato = poner(dia, c, otra.id, id, plato); hechos.push(`${ING[id].n} por ${ING[otra.id].n.toLowerCase()}`); }
      else if (MULTI(g) && (plato[g] || []).length > 1){ plato = quitarDe(plato, id); hechos.push(`sin ${ING[id].n.toLowerCase()}`); }
      else sin.push(ING[id].n.toLowerCase());
    });
  });
  // lo que el plan pide y quedo vacio, con algo que si haya
  SLOTS[c].forEach(([g,, req]) => {
    if (!req || (plato[g] || []).length || (c === 'Cena' && g === 'carb' && omelette(plato))) return;
    const otra = alterna(g);
    if (otra){ plato = poner(dia, c, otra.id, null, plato); hechos.push(`con ${ING[otra.id].n.toLowerCase()}`); }
  });
  if (hechos.length) guardar(dia, c, depurar(plato, c, dia));
  return { hechos, sin };
}

/* ---------- lo que el resto de la app lee: el plato armado como "comida" ---------- */
function aplicarArmado(r, dia){
  COMIDAS_AR.forEach(c => {
    const plato = guardado(dia, c);
    if (!plato) return;
    const k = c === 'Desayuno' ? 'desayuno' : c === 'Almuerzo' ? 'almuerzo' : 'cena';
    const ids = Object.values(plato).flat();
    const fam = { pollo:'pollo', res:'carne', atun:'atun', huevo:'huevos', pescado:'pescado', bonito:'pescado', trucha:'pescado',
      jurel:'pescado', perico:'pescado', merluza:'pescado', salmon:'pescado' };
    const prot = (plato.prot || [])[0], carb = (plato.carb || [])[0], grasa = (plato.grasa || [])[0];
    const n = id => ING[id].n.toLowerCase();
    const junta = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
    const om = c === 'Cena' && prot === 'huevo';
    // los mismos campos que un plato del menu: asi el calendario, el PDF del
    // menu y la imagen del riel lo leen sin saber que fue armado
    const corto = c === 'Desayuno'
      ? (junta([...(plato.prot || []), ...(plato.acomp || [])].map(n)) || 'Desayuno armado')
      : om ? 'Omelette' + ((plato.verd || []).length ? ' con ' + junta(plato.verd.map(n)) : '')
      : prot ? ING[prot].n : 'Plato armado';
    const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
    const conPorcion = id => { const [p] = porcion(ING[id], c); return `${n(id)} (${p.toLowerCase()})`; };
    r[k] = { ...r[k], id: 'armado', armado: true,
      tipo: om ? 'omelette' : (c === 'Desayuno' ? r[k].tipo : 'plato'),
      titulo: cap(corto), corto: cap(corto), detalle: '',
      protK: fam[prot] || (c === 'Desayuno' ? r[k].protK : undefined),
      carboK: carb ? ({ quinoa:'quinoa', lentejas:'menestras', garbanzos:'menestras', frejol:'menestras' }[carb] || 'otro') : undefined,
      verdura: (plato.verd || []).length ? cap(junta(plato.verd.map(n))) : 'Sin verduras',
      carbo: carb ? cap(conPorcion(carb)) : 'Sin carbohidrato',
      grasa: grasa ? cap(conPorcion(grasa)) : undefined,
      ing: ids.flatMap(i => (ING[i].it || []).map(([key, q]) => [key, c === 'Cena' && grupoEn(ING[i], c) === 'carb' && q === 1 ? 0.75 : q])) };
  });
  // el snack que elegiste pisa al del menu, para la lista de compras y el PDF
  SNACKS.forEach(s => {
    const o = snackElegido(dia, s);
    if (o) r[s.k] = { titulo: o.t, ing: o.ing, elegido: true };
  });
  return r;
}

/* ---------- entre comidas ----------
   La media mañana y la merienda del plan no aparecian en ningun lado, y el
   plan existe justamente para cortar el picoteo. Cada una se marca cuando se
   come; el chocolate y el postre se descuentan solos de los permisos del dia. */
const SNACKS = [
  { id: 'M', k: 'mediaManana', n: 'Media mañana', cat: 'MEDIA_MANANA', hora: '11:00', aviso: 'media' },
  { id: 'E', k: 'merienda', n: 'Merienda', cat: 'MERIENDA', hora: '17:30', aviso: 'merienda' },
];
const POSTRE = { id: 'P', k: 'postre', n: 'Postre', cat: 'POSTRES' };
const opcionesSnack = s => (MENU && MENU.catalogo && MENU.catalogo[s.cat]) || [];
const claveSN = (dia, s) => `${dsDiaG(dia)}:AR:${s.id}`;
function snackElegido(dia, s){
  const i = parseInt(valorDe(claveSN(dia, s)) || '0', 10);
  return i ? opcionesSnack(s)[i - 1] || null : null;
}
const conChoco = o => (o.ing || []).some(([k]) => k === 'chocolate');
const permisoHoy = id => { const p = (PLAN.permisos || []).find(x => x.id === id); return p ? p.tope : 0; };
const usadoHoy = (dia, id) => diaCount(dsDiaG(dia), 'P', id, permisoHoy(id) + 3);
const quedan = (dia, id) => Math.max(0, permisoHoy(id) - usadoHoy(dia, id));
function horaSnack(s){
  try { const c = typeof cfgLeer === 'function' ? cfgLeer() : null; return (c && c[s.aviso] && c[s.aviso].hora) || s.hora; }
  catch (e) { return s.hora; }
}

/* Comer un snack: queda anotado cual fue y gasta lo que corresponda */
function comerSnack(dia, s, i){
  const ds = dsDiaG(dia), antes = snackElegido(dia, s), o = opcionesSnack(s)[i];
  if (antes && conChoco(antes)) bump(ds, 'P', 'choco', permisoHoy('choco') + 3, -1);
  if (s === POSTRE && antes) bump(ds, 'P', 'postre', permisoHoy('postre') + 3, -1);
  if (!o){ setMark(claveSN(dia, s), '0'); refrescar(dia); return; }
  setMark(claveSN(dia, s), String(i + 1));
  if (conChoco(o)) bump(ds, 'P', 'choco', permisoHoy('choco') + 3, +1);
  if (s === POSTRE) bump(ds, 'P', 'postre', permisoHoy('postre') + 3, +1);
  refrescar(dia);
}

function bloqueSnacks(dia){
  const el = document.createElement('div');
  el.className = 'meal ar-snacks';
  const filas = SNACKS.map(s => {
    const o = snackElegido(dia, s), m = menuSinArmar(dia), sug = m && m[s.k] ? m[s.k].titulo : '';
    return `<div class="ar-sn${o ? ' on' : ''}">
      <button type="button" class="ar-sn-chk" data-ar-sn="${s.id}|${dia}" aria-pressed="${!!o}" aria-label="${o ? 'Desmarcar' : 'Marcar'} ${s.n}">
        <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></button>
      <div class="ar-sn-txt"><span class="ar-sn-nom">${s.n} · ${horaSnack(s)}</span>
        <span class="ar-sn-que">${esc(o ? o.t : sug || 'Opcional')}</span></div>
      <button type="button" class="ar-cambiar" data-ar-sn-ops="${s.id}|${dia}">${o ? 'Cambiar' : 'Elegir'}</button></div>`;
  }).join('');
  el.innerHTML = `<div class="meal-h"><span class="meal-name">Entre comidas</span><span class="ar-sn-op">opcional</span></div>
    ${filas}<button type="button" class="ar-antojo" data-ar-antojo="${dia}">Tengo antojo</button>`;
  return el;
}

/* Cuando aparece el antojo: lo permitido para esta hora, con lo que te queda
   de chocolate y postre hoy. Y si no es hambre sino ansiedad, la salida que
   el plan da, que ademas suma al agua o a la infusion del dia. */
function abrirAntojo(dia){
  const h = parseInt(new Date().toLocaleString('en-GB', { timeZone: 'America/Lima', hour: '2-digit', hour12: false }), 10);
  const s = h < 15 ? SNACKS[0] : h < 20 ? SNACKS[1] : POSTRE;
  const ch = quedan(dia, 'choco'), po = quedan(dia, 'postre');
  const cuenta = `Hoy te quedan <b>${ch} ${ch === 1 ? 'trocito' : 'trocitos'} de chocolate</b> y <b>${po} ${po === 1 ? 'postre' : 'postres'}</b>.`;
  AR.dia = dia;
  bump(dsDiaG(dia), 'AN', 'ant', 20, +1);   // para el informe: cuantas veces aparecio
  abrirHoja(`<div class="ar-asa"></div>
    <div class="ar-top"><h2>¿Hambre o ansiedad?</h2><button type="button" class="ar-listo" data-ar-cerrar>Cerrar</button></div>
    <p class="ar-sub">${cuenta}</p>
    <p class="ar-sug">Si es hambre, a esta hora va ${s === POSTRE ? 'el postre' : 'la ' + s.n.toLowerCase()}:</p>
    ${listaSnack(dia, s)}
    <p class="ar-sug">Si es ansiedad, prueba primero:</p>
    <div class="ar-lista">
      <button type="button" class="ar-res" data-ar-calma="agua"><i class="ar-vacio ar-ic-agua"></i><div><div class="ar-nom">Medio litro de agua</div><div class="ar-cuanto"><span>suma al tomatodo de hoy</span></div></div><span class="ar-mas" aria-hidden="true">+</span></button>
      <button type="button" class="ar-res" data-ar-calma="inf"><i class="ar-vacio ar-ic-inf"></i><div><div class="ar-nom">Una infusión</div><div class="ar-cuanto"><span>cuenta como la del día</span></div></div><span class="ar-mas" aria-hidden="true">+</span></button>
      <div class="ar-res ar-res-nota"><i class="ar-vacio ar-ic-olla"></i><div><div class="ar-nom">Canchita casera</div><div class="ar-cuanto"><span>de olla, no de microondas. Nada de snacks de bolsa</span></div></div></div>
    </div>`);
}
function listaSnack(dia, s){
  const actual = parseInt(valorDe(claveSN(dia, s)) || '0', 10) - 1;
  return `<div class="ar-lista">${opcionesSnack(s).map((o, i) => {
    const bloq = conChoco(o) && quedan(dia, 'choco') < 1 && i !== actual ? 'Ya usaste el chocolate de hoy'
      : s === POSTRE && quedan(dia, 'postre') < 1 && i !== actual ? 'Ya comiste el postre de hoy' : '';
    return `<button type="button" class="ar-res ar-sin-img${i === actual ? ' ar-elegido' : ''}" data-ar-sn-comer="${s.id}|${i}" ${bloq ? 'disabled' : ''}>
      <div><div class="ar-nom">${esc(o.t)}</div>${bloq ? `<div class="ar-aviso">${bloq}</div>` : i === actual ? '<div class="ar-cuanto"><span>es lo que comiste</span></div>' : ''}</div>
      ${bloq ? '' : i === actual ? '<span class="ar-mas ar-ok" aria-hidden="true">✓</span>' : '<span class="ar-mas" aria-hidden="true">+</span>'}</button>`;
  }).join('')}</div>`;
}
const snackPorId = id => SNACKS.find(s => s.id === id) || POSTRE;
function abrirOpcionesSnack(dia, s){
  AR.dia = dia;
  abrirHoja(`<div class="ar-asa"></div>
    <div class="ar-top"><h2>${s.n}</h2><button type="button" class="ar-listo" data-ar-cerrar>Cerrar</button></div>
    <p class="ar-sub">Toca lo que comiste. Las opciones son las del plan de Alexia.</p>${listaSnack(dia, s)}` +
    (snackElegido(dia, s) ? `<button type="button" class="ar-quitar" data-ar-sn-comer="${s.id}|-1">No comí ${s === POSTRE ? 'postre' : 'nada'}</button>` : ''));
}

/* ---------- la despensa a la vista ---------- */
const GRUPOS_CASA = [['Proteínas', x => Object.values(x.g).includes('prot')], ['Carbohidratos', x => Object.values(x.g).includes('carb')],
  ['Frutas', x => x.fruta], ['Verduras', x => x.verd], ['Grasas y para acompañar', x => Object.values(x.g).includes('grasa') || ['leche', 'granola', 'pavo'].includes(x.id)]];
function abrirDespensa(dia){
  AR.dia = dia; AR.vista = 'casa';
  const casa = despensa(dia), vistos = new Set();
  abrirHoja(`<div class="ar-asa"></div>
    <div class="ar-top"><h2>Qué hay en casa</h2><button type="button" class="ar-listo" data-ar-cerrar>Listo</button></div>
    <p class="ar-sub">Lo que marcaste como comprado ya está. Toca para decir que hay o que se acabó, y tus platos se arman con eso.</p>` +
    GRUPOS_CASA.map(([t, f]) => {
      const xs = EN_CASA.filter(x => f(x) && !vistos.has(x.id));
      xs.forEach(x => vistos.add(x.id));
      return `<p class="ar-sug">${t}</p><div class="ar-chips">${xs.map(x =>
        `<button type="button" class="ar-chip ar-casa-chip" data-ar-casa-t="${x.id}" aria-pressed="${casa.tiene(x.id)}">${esc(x.n)}</button>`).join('')}</div>`;
    }).join(''));
}

/* ---------- el bloque dentro de cada comida de Hoy ---------- */
function bloqueArmado(c, diaPedido){
  const dia = diaPedido || selDia, plato = platoDe(dia, c), tocado = !!guardado(dia, c);
  const casa = despensa(dia), noHay = id => casa.usa && !casa.tiene(id);
  const faltanCasa = Object.values(plato).flat().filter(noHay);
  const el = document.createElement('div');
  el.className = 'ar-plato';
  let primeraVerd = true;
  const filas = SLOTS[c].flatMap(([g]) => (plato[g] || []).map(id => {
    const x = ING[id];
    let cuanto;
    if (g === 'verd' && c !== 'Desayuno'){
      cuanto = primeraVerd ? '<b>Un tercio del plato</b> <span>· todas juntas, con 1 cda de aceite</span>' : '<span>junto con las demás verduras</span>';
      primeraVerd = false;
    } else { const [p, m] = porcion(x, c); cuanto = `<b>${esc(p)}</b>${m ? ` <span>· ${esc(m)}</span>` : ''}`; }
    const im = imgDe(x);
    return `<div class="ar-it">${im ? `<img src="${im}" alt="" loading="lazy">` : '<i class="ar-vacio"></i>'}
      <div><div class="ar-nom">${esc(x.n)}${noHay(id) ? ' <em class="ar-nohay">no hay en casa</em>' : ''}</div><div class="ar-cuanto">${cuanto}</div></div>
      <button type="button" class="ar-cambiar" data-ar-cambiar="${c}|${g}|${id}|${dia}">Cambiar</button></div>`;
  })).join('');
  const falta = SLOTS[c].filter(([g,, r]) => r && !(c === 'Cena' && g === 'carb' && omelette(plato)) && !(plato[g] || []).length).map(([, n]) => n.toLowerCase());
  const regla = c === 'Cena' && !omelette(plato) ? '<p class="ar-regla">Sin grasa en la cena y el carbohidrato en porción menor.</p>' : '';
  el.innerHTML = regla + (filas || '<p class="ar-regla">Todavía no hay nada. Agrega lo que vas a comer.</p>') +
    (falta.length ? `<p class="ar-regla ar-falta">Falta: ${falta.join(', ')}</p>` : '') +
    (faltanCasa.length ? `<button type="button" class="ar-conlo" data-ar-conlo="${c}|${dia}">Armarlo con lo que hay en casa</button>` : '') +
    `<div class="ar-pie"><button type="button" class="ar-agregar" data-ar-abrir="${c}|${dia}">+ Agregar</button>` +
    (tocado ? `<button type="button" class="ar-plan" data-ar-plan="${c}|${dia}">Volver al plan</button>` : '') + `</div>` +
    `<button type="button" class="ar-link" data-ar-casa="${dia}">Qué hay en casa</button>`;
  return el;
}

/* ---------- busqueda predictiva ---------- */
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function lev(a, b){
  const d = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++){ let p = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++){ const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } }
  return d[b.length];
}
/* "agua" encuentra la palta (aguacate), "polo" encuentra pollo */
function puntaje(x, q){
  let best = 0;
  [x.n, ...x.a].forEach((s, i) => {
    const t = norm(s), pen = i ? 6 : 0;
    let v = 0;
    if (t.startsWith(q)) v = 100;
    else if (t.split(/\s+/).some(w => w.startsWith(q))) v = 85;
    else if (t.includes(q)) v = 60;
    else if (q.length >= 4) for (const w of t.split(/\s+/)){
      const d = lev(q, w.slice(0, q.length));
      if (d <= (q.length >= 7 ? 2 : 1)) v = Math.max(v, 45 - d * 5);
    }
    best = Math.max(best, v ? v - pen : 0);
  });
  return best;
}
function resaltar(n, q){
  const i = norm(n).indexOf(q);
  return i < 0 ? esc(n) : esc(n.slice(0, i)) + '<mark>' + esc(n.slice(i, i + q.length)) + '</mark>' + esc(n.slice(i + q.length));
}
const CANT = /^(\d+([.,/]\d+)?|un|una|uno|unos|unas|dos|tres|cuatro|cinco|media|medio|mitad de|un poco de|poco de)\s+/;
function parsear(txt){
  return txt.split(/,|;|\n|\+|\by\b|\bcon\b|\bmas\b|\bmás\b/i).map(t => t.trim()).filter(t => t.length > 1).map(t => {
    const q = norm(t).replace(CANT, '').replace(/^(taza|tazas|cda|cdas|cucharada|cucharadas|filete|filetes|porcion)\s+(de\s+)?/, '').replace(/^(de|del|la|el|los|las)\s+/, '');
    let best = null, bs = 0;
    for (const x of Object.values(ING)){
      const s = Math.max(puntaje(x, q), ...q.split(/\s+/).filter(w => w.length >= 3).map(w => puntaje(x, w) - 10));
      if (s > bs){ bs = s; best = x; }
    }
    return { t, x: bs >= 40 ? best : null };
  });
}

/* ---------- la hoja: buscar, escribir lista o dictar ---------- */
const AR = { dia: null, c: null, forma: 'buscar', q: '', lista: '', cambio: null };
const ICO = {
  buscar: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  lista: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
  voz: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
};
const SUGS = {
  Desayuno: [
    { t:'Bowl de yogurt con granola y manzana', img:'img/platos/d_bowl_manzana.webp', ids:['yogurt','granola','manzana'] },
    { t:'Omelette con espinaca y queso', img:'img/platos/d_omelette_esp.webp', ids:['huevo','espinaca','queso','palta'] },
    { t:'Batido de proteína con plátano', img:'img/platos/d_batido_platano.webp', ids:['whey','leche','chia','platano'] },
    { t:'Huevos revueltos con pavo', img:'img/platos/d_revueltos_pavo.webp', ids:['huevo','pavo','palta','mandarina'] },
  ],
  Almuerzo: [
    { t:'Pescado con quinoa y ensalada', img:'img/pescado.webp', ids:['pescado','quinoa','lechuga','tomate','palta'] },
    { t:'Pollo con papa y brócoli', img:'img/platos/p_pollo_horno.webp', ids:['pollo','papa','brocoli','aceitunas'] },
    { t:'Lomo con lentejas y ensalada', img:'img/platos/p_lomo.webp', ids:['res','lentejas','lechuga','pepino','aceitunas'] },
  ],
  Cena: [
    { t:'Pollo sudado con papa y brócoli', img:'img/platos/p_pollo_sudado.webp', ids:['pollo','papa','brocoli'] },
    { t:'Trucha con quinoa y espárragos', img:'img/platos/p_trucha.webp', ids:['trucha','quinoa','esparragos'] },
    { t:'Omelette con champiñones', img:'img/platos/o_champ.webp', ids:['huevo','champinones','queso'] },
  ],
};
function montarHoja(){
  if (document.getElementById('arHoja')) return;
  document.body.insertAdjacentHTML('beforeend',
    '<div class="ar-velo" id="arVelo"></div><div class="ar-hoja" id="arHoja" role="dialog" aria-modal="true"></div><div class="ar-toast" id="arToast" role="status"></div>');
}
const $ar = s => document.querySelector(s);
let arT; function arToast(t){ const e = $ar('#arToast'); e.textContent = t; e.classList.add('ver'); clearTimeout(arT); arT = setTimeout(() => e.classList.remove('ver'), 2200); }

function itemRes(x, c, q, attr, sinMas){
  const plato = platoDe(AR.dia, c), b = bloqueo(x, c, AR.dia, plato), [p, m] = b ? ['', ''] : porcion(x, c), im = imgDe(x);
  const casa = despensa(AR.dia), hay = !b && casa.usa && casa.tiene(x.id);
  return `<button type="button" class="ar-res" ${attr}="${x.id}" ${b ? 'disabled' : ''}>
    ${im ? `<img src="${im}" alt="">` : '<i class="ar-vacio"></i>'}<div><div class="ar-nom">${q ? resaltar(x.n, q) : esc(x.n)}${hay ? ' <em class="ar-hay">en casa</em>' : ''}</div>
    ${b ? `<div class="ar-aviso">${esc(b)}</div>` : `<div class="ar-cuanto"><b>${esc(p)}</b>${m ? ` <span>· ${esc(m)}</span>` : ''}</div>`}</div>
    ${b || sinMas ? '' : '<span class="ar-mas" aria-hidden="true">+</span>'}</button>`;
}
function pintarRes(){
  const c = AR.c, q = norm(AR.q), r = $ar('#arRes'); if (!r) return;
  if (!q){
    const plato = platoDe(AR.dia, c);
    const falta = SLOTS[c].find(([g,, req]) => req && !(plato[g] || []).length) || SLOTS[c].find(([g]) => !(plato[g] || []).length);
    const casa = despensa(AR.dia);
    const ops = falta ? Object.values(ING).filter(x => grupoEn(x, c) === falta[0] && !bloqueo(x, c, AR.dia, plato))
      .sort((a, b) => (casa.tiene(b.id) ? 1 : 0) - (casa.tiene(a.id) ? 1 : 0)).slice(0, 8) : [];
    r.innerHTML = (ops.length ? `<p class="ar-sug">Te falta ${GNOM[falta[0]]}. Toca lo que tengas:</p>
      <div class="ar-chips">${ops.map(x => `<button type="button" class="ar-chip" data-ar-add="${x.id}">${esc(x.n)}</button>`).join('')}</div>` : '') +
      `<p class="ar-sug">O usa un plato de tu plan</p><div class="ar-carrusel">${SUGS[c].map((s, i) => `<div class="ar-receta">
        <div class="ar-foto"><img src="${s.img}" alt="" loading="lazy"></div><div class="ar-cuerpo"><h3>${esc(s.t)}</h3>
        <p>${s.ids.map(id => esc(ING[id].n)).join(', ')}</p><button type="button" class="ar-btn" data-ar-sug="${i}">Usar este plato</button></div></div>`).join('')}</div>`;
    return;
  }
  const plato = platoDe(AR.dia, c);
  const res = Object.values(ING).filter(x => puntaje(x, q) > 0)
    .map(x => [x, puntaje(x, q) - (bloqueo(x, c, AR.dia, plato) ? 30 : 0)]).sort((a, b) => b[1] - a[1]).slice(0, 7);
  r.innerHTML = res.length ? `<div class="ar-lista">${res.map(([x]) => itemRes(x, c, q, 'data-ar-add')).join('')}</div>`
    : '<p class="ar-sug">No lo encuentro. Prueba con otro nombre.</p>';
}
function pintarParse(){
  const c = AR.c, p = $ar('#arParse'), b = $ar('#arAddLista'); if (!p) return;
  const plato = platoDe(AR.dia, c), r = parsear(AR.lista), ok = r.filter(i => i.x && !bloqueo(i.x, c, AR.dia, plato));
  p.innerHTML = r.map(i => i.x ? itemRes(i.x, c, '', 'data-x', true) : `<p class="ar-nada">No reconozco «${esc(i.t)}»</p>`).join('');
  p.hidden = !r.length;
  b.disabled = !ok.length;
  b.textContent = ok.length ? `Agregar ${ok.length} ${ok.length === 1 ? 'alimento' : 'alimentos'}` : 'Agregar';
}
function hojaHTML(){
  const c = AR.c, f = AR.forma;
  const cuerpo = f === 'buscar'
    ? `<input class="ar-buscar" id="arQ" type="search" value="${esc(AR.q)}" placeholder="Pollo, quinoa, palta..." autocomplete="off" enterkeyhint="search" aria-label="Buscar ingrediente"><div id="arRes"></div>`
    : `<textarea class="ar-texto" id="arLista" placeholder="Escribe como en notas: 2 huevos, palta y un plátano">${esc(AR.lista)}</textarea>
       <div id="arParse" class="ar-lista" hidden></div><button type="button" class="ar-btn" id="arAddLista" disabled>Agregar</button>`;
  return `<div class="ar-asa"></div>
    <div class="ar-top"><h2>Agregar ${c === 'Desayuno' ? 'al desayuno' : c === 'Almuerzo' ? 'al almuerzo' : 'a la cena'}</h2><button type="button" class="ar-listo" data-ar-cerrar>Listo</button></div>
    <div class="ar-formas">
      <button type="button" class="ar-forma" data-ar-forma="buscar" aria-pressed="${f === 'buscar'}">${ICO.buscar}Buscar</button>
      <button type="button" class="ar-forma" data-ar-forma="lista" aria-pressed="${f === 'lista'}">${ICO.lista}Escribir lista</button>
      <button type="button" class="ar-forma" data-ar-forma="voz" id="arVoz" aria-pressed="false">${ICO.voz}Hablar</button>
    </div>${cuerpo}`;
}
function abrirHoja(html){
  montarHoja();
  $ar('#arHoja').innerHTML = html;
  $ar('#arHoja').classList.add('abierta'); $ar('#arVelo').classList.add('abierto');
}
function rehacer(foco){
  $ar('#arHoja').innerHTML = hojaHTML(); pintarRes(); pintarParse();
  if (foco){ const e = $ar(foco); if (e){ e.focus(); const n = e.value.length; if (e.setSelectionRange) e.setSelectionRange(n, n); } }
}
function abrirAgregar(c){
  AR.c = c; AR.q = ''; AR.lista = ''; AR.cambio = null;
  abrirHoja(hojaHTML()); pintarRes(); pintarParse();
}
function abrirCambio(c, g, id){
  AR.c = c; AR.cambio = id;
  const plato = platoDe(AR.dia, c);
  // primero lo que hay en casa, despues lo demas, y al final lo que el plan no deja
  const casa = despensa(AR.dia), peso = x => (bloqueo(x, c, AR.dia, plato) ? 2 : 0) + (casa.usa && !casa.tiene(x.id) ? 1 : 0);
  const alts = Object.values(ING).filter(x => grupoEn(x, c) === g && x.id !== id && !(plato[g] || []).includes(x.id))
    .sort((a, b) => peso(a) - peso(b));
  abrirHoja(`<div class="ar-asa"></div>
    <div class="ar-top"><h2>¿No hay ${esc(ING[id].n.toLowerCase())}?</h2><button type="button" class="ar-listo" data-ar-cerrar>Cerrar</button></div>
    <p class="ar-sub">Cámbialo por otra ${GNOM[g]} que tengas. La cantidad ya viene puesta.</p>
    <div class="ar-lista">${alts.map(x => itemRes(x, c, '', 'data-ar-swap')).join('')}</div>
    <button type="button" class="ar-quitar" data-ar-quitar="${g}|${id}">No lo voy a comer, quitarlo</button>`);
}
function cerrarHoja(){
  pararVoz();
  const h = $ar('#arHoja'); if (!h) return;
  h.classList.remove('abierta'); $ar('#arVelo').classList.remove('abierto');
}

/* ---------- dictar ---------- */
let rec = null;
function pararVoz(){ if (rec){ try { rec.stop(); } catch (e) {} rec = null; } const b = $ar('#arVoz'); if (b) b.classList.remove('grabando'); }
function hablar(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR){ arToast('Este teléfono no deja dictar aquí. Escribe la lista.'); AR.forma = 'lista'; rehacer('#arLista'); return; }
  if (rec){ pararVoz(); return; }
  AR.forma = 'lista'; rehacer();
  const base = AR.lista ? AR.lista + ', ' : '';
  rec = new SR(); rec.lang = 'es-PE'; rec.interimResults = true; rec.continuous = false;
  rec.onresult = e => { AR.lista = base + [...e.results].map(r => r[0].transcript).join(' '); const t = $ar('#arLista'); if (t) t.value = AR.lista; pintarParse(); };
  rec.onend = () => pararVoz();
  rec.onerror = () => { pararVoz(); arToast('No te escuché. Prueba otra vez.'); };
  rec.start(); $ar('#arVoz').classList.add('grabando'); arToast('Te escucho: di lo que vas a comer');
}

/* ---------- toques ---------- */
document.addEventListener('input', e => {
  if (e.target.id === 'arQ'){ AR.q = e.target.value; pintarRes(); }
  if (e.target.id === 'arLista'){ AR.lista = e.target.value; pintarParse(); }
});
document.addEventListener('keydown', e => {
  if (e.target.id === 'arQ' && e.key === 'Enter'){ const b = document.querySelector('#arRes .ar-res:not([disabled])'); if (b) b.click(); }
});
document.addEventListener('click', e => {
  const on = s => e.target.closest(s);
  let t;
  if ((t = on('[data-ar-abrir]'))){ const [c, d] = t.dataset.arAbrir.split('|'); AR.dia = +d; return abrirAgregar(c); }
  if ((t = on('[data-ar-cambiar]'))){ const [c, g, id, d] = t.dataset.arCambiar.split('|'); AR.dia = +d; return abrirCambio(c, g, id); }
  if ((t = on('[data-ar-plan]'))){ const [c, d] = t.dataset.arPlan.split('|'); AR.dia = +d; setMark(claveAR(AR.dia, c), '0'); refrescar(AR.dia); return arToast('Volviste al plato del plan'); }
  if (on('[data-ar-cerrar]') || on('#arVelo')) return cerrarHoja();
  if ((t = on('[data-ar-forma]'))){
    if (t.dataset.arForma === 'voz') return hablar();
    pararVoz(); AR.forma = t.dataset.arForma; return rehacer(AR.forma === 'buscar' ? '#arQ' : '#arLista');
  }
  if ((t = on('[data-ar-add]'))){
    if (t.disabled) return;
    const c = AR.c, id = t.dataset.arAdd, g = grupoEn(ING[id], c), antes = MULTI(g) ? null : (platoDe(AR.dia, c)[g] || [])[0];
    guardar(AR.dia, c, poner(AR.dia, c, id));
    arToast(antes && antes !== id ? `Cambié ${ING[antes].n} por ${ING[id].n}` : `Agregado: ${ING[id].n}`);
    AR.q = ''; return rehacer('#arQ');
  }
  if ((t = on('#arAddLista'))){
    const c = AR.c; let plato = platoDe(AR.dia, c), n = 0;
    parsear(AR.lista).forEach(i => { if (i.x && !bloqueo(i.x, c, AR.dia, plato) && !Object.values(plato).flat().includes(i.x.id)){ setMark(claveAR(AR.dia, c), JSON.stringify(plato)); plato = poner(AR.dia, c, i.x.id); setMark(claveAR(AR.dia, c), JSON.stringify(plato)); n++; } });
    guardar(AR.dia, c, plato); arToast(n ? `Agregué ${n} ${n === 1 ? 'alimento' : 'alimentos'}` : 'Eso ya estaba en tu plato'); AR.lista = ''; return cerrarHoja();
  }
  if ((t = on('[data-ar-sug]'))){
    const c = AR.c; let plato = {};
    setMark(claveAR(AR.dia, c), JSON.stringify(plato));
    SUGS[c][+t.dataset.arSug].ids.forEach(id => { if (!bloqueo(ING[id], c, AR.dia, plato)){ plato = poner(AR.dia, c, id); setMark(claveAR(AR.dia, c), JSON.stringify(plato)); } });
    guardar(AR.dia, c, plato); arToast('Listo, ese es tu plato'); return cerrarHoja();
  }
  if ((t = on('[data-ar-swap]'))){
    if (t.disabled) return;
    const c = AR.c, viejo = AR.cambio, nuevo = t.dataset.arSwap;
    guardar(AR.dia, c, poner(AR.dia, c, nuevo, viejo));
    arToast(`Cambié ${ING[viejo].n} por ${ING[nuevo].n}`); return cerrarHoja();
  }
  if ((t = on('[data-ar-conlo]'))){
    const [c, d] = t.dataset.arConlo.split('|'), r = conLoQueHay(+d, c);
    return arToast(r.hechos.length ? 'Listo: ' + r.hechos.join(', ') + (r.sin.length ? `. No hay con qué cambiar ${r.sin.join(' ni ')}` : '')
      : `No hay en casa con qué cambiar ${r.sin.join(' ni ')}. Márcalo en Qué hay en casa`);
  }
  if ((t = on('[data-ar-casa]'))) return abrirDespensa(+t.dataset.arCasa);
  if ((t = on('[data-ar-casa-t]'))){
    const id = t.dataset.arCasaT, dia = AR.dia, hoja = $ar('#arHoja'), top = hoja.scrollTop;
    setMark(claveT(dia, id), despensa(dia).tiene(id) ? '2' : '1');
    abrirDespensa(dia); hoja.scrollTop = top;
    return refrescar(dia);
  }
  if ((t = on('[data-ar-sn]'))){
    const [id, d] = t.dataset.arSn.split('|'), s = snackPorId(id), dia = +d;
    if (snackElegido(dia, s)) return comerSnack(dia, s, -1);
    // marcar sin elegir = comiste lo que sugeria el plan
    const m = menuSinArmar(dia), i = opcionesSnack(s).findIndex(o => m && m[s.k] && o.t === m[s.k].titulo);
    if (i < 0) return abrirOpcionesSnack(dia, s);
    const o = opcionesSnack(s)[i];
    if (conChoco(o) && quedan(dia, 'choco') < 1) return abrirOpcionesSnack(dia, s);
    comerSnack(dia, s, i); return arToast(`${s.n}: ${o.t.toLowerCase()}`);
  }
  if ((t = on('[data-ar-sn-ops]'))){ const [id, d] = t.dataset.arSnOps.split('|'); return abrirOpcionesSnack(+d, snackPorId(id)); }
  if ((t = on('[data-ar-antojo]'))) return abrirAntojo(+t.dataset.arAntojo);
  if ((t = on('[data-ar-sn-comer]'))){
    if (t.disabled) return;
    const [id, i] = t.dataset.arSnComer.split('|'), s = snackPorId(id), n = +i;
    const ya = parseInt(valorDe(claveSN(AR.dia, s)) || '0', 10) - 1;
    if (n === ya){ cerrarHoja(); return; }
    comerSnack(AR.dia, s, n); cerrarHoja();
    const o = opcionesSnack(s)[n];
    return arToast(o ? `Anotado: ${o.t.toLowerCase()}${conChoco(o) ? ` · te quedan ${quedan(AR.dia, 'choco')} de chocolate` : ''}` : `${s.n}: no comiste`);
  }
  if ((t = on('[data-ar-calma]'))){
    const ds = dsDiaG(AR.dia), r = t.dataset.arCalma;
    const R = (typeof RACIONES !== 'undefined' ? RACIONES : []).find(x => x.id === r), cap = R ? R.meta + R.extra : 1;
    bump(ds, 'R', r, cap, +1); bump(ds, 'AN', 'calma', 20, +1); cerrarHoja(); render();
    return arToast(r === 'agua' ? 'Medio litro más. Espera diez minutos y mira si sigue el antojo' : 'Infusión anotada');
  }
  if ((t = on('[data-ar-quitar]'))){
    const c = AR.c, [g, id] = t.dataset.arQuitar.split('|');
    const plato = JSON.parse(JSON.stringify(platoDe(AR.dia, c)));
    plato[g] = (plato[g] || []).filter(x => x !== id);
    guardar(AR.dia, c, depurar(plato, c, AR.dia)); arToast(`Quitado: ${ING[id].n}`); return cerrarHoja();
  }
});

// lo unico que el resto de la app necesita ver
window.aplicarArmado = aplicarArmado;
window.bloqueArmado = bloqueArmado;
window.bloqueSnacks = bloqueSnacks;
// el informe lee lo que de verdad se armo, no el titulo del plato
window.platoDelDia = (dia, c) => ({ plato: platoDe(dia, c), armado: !!guardado(dia, c) });
window.snackDelDia = (dia, id) => snackElegido(dia, snackPorId(id));
})();
