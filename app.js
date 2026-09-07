// Dia 1 del programa (igual que el recordatorio de Slack)
const INICIO = PLAN.inicio;   // sale del plan, ya no esta cableado
const HOY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const diaCrudo = Math.floor((Date.parse(HOY + 'T00:00:00Z') - Date.parse(INICIO + 'T00:00:00Z')) / 86400000) + 1;
/* Si el plan todavia no arranca, el dia crudo es negativo y toda la aritmetica
   de abajo (semana, menu, fases, mapa) se va al carajo en silencio. Se fija en
   1 y se levanta una bandera: la app muestra el dia 1 como adelanto, con la
   cuenta regresiva arriba, para que ya se pueda hacer la compra. */
const antesDeEmpezar = diaCrudo < 1;
const faltanDias = antesDeEmpezar ? 1 - diaCrudo : 0;
const diaPrograma = Math.max(1, diaCrudo);
const semana = Math.ceil(diaPrograma / 7);

// Dia seleccionado en la card "Lo importante ahora" (hoy por defecto; navegable a dias pasados)
function dsDiaG(d){ return new Date(Date.parse(INICIO+'T00:00:00Z')+(d-1)*86400000).toISOString().split('T')[0]; }
let selDia = diaPrograma;
let selDate = antesDeEmpezar ? dsDiaG(1) : HOY;
const selSemana = () => Math.ceil(selDia/7);
function goDay(delta){ jumpDay(selDia + delta); }
function volverHoy(){ selDia = diaPrograma; selDate = HOY; tramoAbierto = null; render(); }
function jumpDay(d){
  selDia = Math.min(diaPrograma, Math.max(1, d)); selDate = dsDiaG(selDia);
  tramoAbierto = null; render();
  // el riel se redibuja: cambiar de dia es un cambio de contenido, no un marcado
  if(typeof escalonar === 'function') escalonar(document.getElementById('panel-hoy'), 0);
  const sel = document.querySelector('.dnav.sel');
  if(sel){ sel.classList.add('recien'); setTimeout(()=>sel.classList.remove('recien'), 500); }
  window.scrollTo({top:0, behavior:'smooth'});
}
/* La tira de la semana. Reemplaza al par de flechas: se ve donde estas dentro
   de la semana, que dia vas, y de un vistazo la variedad de proteina (dos
   puntos por dia, almuerzo y cena). Tocar un dia lo abre. */
function renderDayNav(){
  const nav = document.getElementById('dayNav'); if(!nav) return;
  const w = selSemana();
  const ini = (w-1)*7 + 1;
  let html = '';
  for(let k=0; k<7; k++){
    const d = ini + k;
    const ds = dsDiaG(d);
    const fecha = new Date(Date.parse(ds+'T00:00:00Z'));
    const dow = fecha.toLocaleDateString('es-PE',{weekday:'short',timeZone:'UTC'}).replace('.','').slice(0,3);
    const num = fecha.getUTCDate();
    const c = (typeof comidasDeDia === 'function') ? comidasDeDia(d) : null;
    const col = k => (typeof COLOR_PROT === 'object' && c) ? (COLOR_PROT[k] || 'var(--g2)') : 'var(--g2)';
    const pts = c
      ? `<i style="background:${col(c.almuerzo.protK)}"></i><i style="background:${col(c.cena.protK)}"></i>`
      : '<i style="background:var(--g2)"></i><i style="background:var(--g2)"></i>';
    const cls = 'dnav' + (d===selDia ? ' sel' : '') + (d>diaPrograma ? ' fut' : '');
    html += `<button type="button" class="${cls}" data-d="${d}" aria-label="Día ${d}" `+
            `${d>diaPrograma?'disabled':''}><em>${dow}</em><b>${num}</b><span class="pts">${pts}</span></button>`;
  }
  nav.innerHTML = html;
  nav.querySelectorAll('.dnav').forEach(b=>{ b.onclick = ()=> jumpDay(parseInt(b.dataset.d,10)); });
}

const IC_SUN  = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const IC_MOON = '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
const IC_DAWN = '<svg viewBox="0 0 24 24"><path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 2v4M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4"/><path d="M3 22h18"/></svg>';
const IC_DROP = '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10z"/></svg>';
const IC_LEAF = '<svg viewBox="0 0 24 24"><path d="M4 20c0-8 6-14 16-15 0 10-5 15-12 15H4z"/><path d="M8 18c2-4 5-7 9-9"/></svg>';
/* La hora de cada tramo. Sale de los avisos que Vinz tenga puestos, para que el
   riel diga la hora real y no una escrita a mano en dos sitios distintos. */
const HORA_DEF = {Desayuno:'8:00', Almuerzo:'13:00', Cena:'20:00'};
const HORA_COMIDA = new Proxy({}, { get(_, c){
  try {
    const cfg = (typeof cfgLeer === 'function') ? cfgLeer() : null;
    const id = {Desayuno:'desayuno', Almuerzo:'almuerzo', Cena:'cena'}[c];
    const h = cfg && cfg[id] && cfg[id].hora;
    return h ? h.replace(/^0/,'') : HORA_DEF[c];
  } catch(e){ return HORA_DEF[c]; }
}});
const mealIcon = m => m==='Desayuno' ? IC_DAWN : (m==='Almuerzo' ? IC_SUN : IC_MOON);

/* ---------------- Suplementos: protocolo Longevity 01 ---------------- */
// Las fases salen del plan, que tambien lee el servidor para armar los avisos
const suplDeDia = dia => PlanLib.suplDeDia(PLAN, dia);

/* ---------------- Nutricion: plan de Alexia Macher ---------------- */
// Comidas y verduras: se marcan. Cuentan para el anillo del dia.
const COMIDAS = [
  {meal:'Desayuno', name:'Desayuné', dose:'Lo que dice el menú de arriba', tag:'1 opción', id:'m1'},
  {meal:'Almuerzo', name:'Almorcé', dose:'Lo que dice el plato de arriba', tag:'plato', id:'m2'},
  {meal:'Almuerzo', name:'Verduras en el almuerzo', dose:'Al menos ⅓ del plato', tag:'⅓', id:'v2'},
  {meal:'Cena', name:'Cené', dose:'Lo que dice el plato de arriba', tag:'plato', id:'m3'},
  {meal:'Cena', name:'Verduras en la cena', dose:'Al menos ⅓ del plato', tag:'⅓', id:'v3'},
];

// Raciones, permisos y frecuencias salen del plan. El icono es lo unico que no
// viaja en el documento: es cosa de la interfaz, no del plan.
const ICONOS = { gota: IC_DROP, hoja: IC_LEAF };
const RACIONES = PLAN.raciones.map(r => ({ ...r, unit: ICONOS[r.icono] || IC_DROP }));
const PERMISOS = PLAN.permisos;
const SEMANALES = PLAN.semanales;

// La linea de fases y su nota salen del plan: describir los suplementos en dos
// lugares distintos garantiza que un dia digan cosas diferentes.
const refFases = PLAN.fases.map(f => {
  const porNombre = {};
  (f.items || []).forEach(it => {
    (porNombre[it.name] = porNombre[it.name] || { dose: it.dose, comidas: [] }).comidas.push(it.meal);
  });
  return {
    nombre: f.nombre,
    when: f.hasta > 9000 ? `Desde el día ${f.desde}` : `Día ${f.desde} a ${f.hasta}`,
    rango: [f.desde, f.hasta],
    lo: Object.entries(porNombre).map(([n, d]) =>
      `${n}: ${d.dose} en ${d.comidas.map(c => c.toLowerCase()).join(' y ')}`),
  };
});
const notas = PLAN.fases.reduce((a, f) => (a[f.nombre] = f.nota || '', a), {});

// Referencia del plan: las opciones tal como las dejó la nutricionista
const QUE_COMER = [
  {titulo:'Ayunas', tag:'', lo:['1 vaso grande de agua tibia']},
  {titulo:'Desayuno', tag:'elegir 1', lo:[
    '<b>Omelette</b> de 3 huevos con 2 lonchas de mozzarella y espinaca o champiñones + ½ palta pequeña + 1 paquete de salmas (opcional)',
    '<b>Huevos revueltos:</b> 3 huevos con 2 lonchas de pavo o jamón cocido + ½ palta pequeña + 1 fruta',
    '<b>Wrap integral</b> de pollo deshilachado + ½ palta pequeña + tomate + lechuga + 1 punto de mayonesa light + 1 fruta',
    '<b>Batido 1:</b> 1 vaso grande de leche + 1 scoop de proteína + 1 cda de chía o linaza + 1 plátano + 1 cdta de mantequilla de maní',
    '<b>Batido 2:</b> 1 vaso grande de leche + 1 scoop de proteína + 1 cda de chía o linaza + pulpa de lúcuma',
    '<b>Bowl de yogurt:</b> 8 cdas de yogurt proteico (Vakimu PRO o Quark) + 3 cdas de granola + 1 fruta picada',
  ]},
  {titulo:'Media mañana', tag:'opcional', lo:[
    '1 fruta + 1 puñado de frutos secos (12 a 15 unidades)',
    '1 trocito de chocolate >70% + 1 puñado de frutos secos',
    '1 yogurt proteico individual de sabor',
    '1 café o infusión + 1 trocito de chocolate >70%',
  ]},
  {titulo:'Almuerzo', tag:'método del plato', lo:[
    '<b>Verduras:</b> al menos ⅓ del plato. Aliño de 1 cda de aceite de oliva virgen extra, limón y sal',
    '<b>Proteína:</b> 2 filetes medianos de pollo o 1 filete grande de pescado o carne o 1 lata de atún al natural + 1 huevo cocido',
    '<b>Carbohidratos:</b> 1 taza de quinoa o menestras cocidas o 1 papa pequeña o ½ camote mediano o 1 taza de ñoquis',
    '<b>Grasas:</b> ½ palta pequeña o 6 a 8 aceitunas',
  ]},
  {titulo:'Merienda', tag:'opcional', lo:[
    '1 yogurt proteico de sabor',
    '1 fruta + 1 barrita de proteína (VitaBars, Different)',
    '<b>Preentreno:</b> 1 plátano, o bowl de yogurt proteico con granola y ½ plátano, o jugo de lúcuma',
  ]},
  {titulo:'Cena', tag:'2 moldes', lo:[
    '<b>Opción plato:</b> verduras ⅓, misma proteína del almuerzo, ¾ taza de quinoa o ½ papa pequeña o ¾ taza de ñoquis. Sin grasa extra: basta el aceite de oliva de las verduras',
    '<b>Opción omelette:</b> champiñones, espinaca o tomate + 3 huevos enteros + 1 wrap integral o salmas (opcional) + ½ palta pequeña o 2 lonchas de queso',
  ]},
  {titulo:'Reglas de la semana', tag:'', lo:[
    'Pescado 3 a 4 días. Menestras o quinoa 2 a 3 días, nunca de noche',
    'Huevos en una sola toma del día, por variedad nutricional',
    'Carne roja 1 a 2 veces. Comer fuera o delivery 1 a 2 veces',
    'Coca zero máximo 3 latas. El resto, agua o agua con gas',
    'Nada de snacks de bolsa: si hay ansiedad, canchita casera (no de microondas)',
    'Alcohol: evitarlo. Si tomas, alterna con agua, no pases de 3 o 4 tragos y prefiere licores blancos con agua con gas o tónica',
    'Granolas recomendadas: Huella Verde, Amaru Superfoods',
  ]},
];

const RING_CIRC = 2*Math.PI*28;   // el anillo de la ficha tiene r=28
const DIA_SEMANA = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

// ---------- Sincronizacion entre dispositivos ----------
const DKEY = /^\d{4}-\d{2}-\d{2}:/;
const metaLoad = () => { try { return JSON.parse(localStorage.getItem('__sync_meta')||'{}'); } catch(e){ return {}; } };
const metaSave = m => localStorage.setItem('__sync_meta', JSON.stringify(m));

// Marca/desmarca (o guarda un valor, como el peso) + sella la hora + agenda sync
let ultimaMarca = null;   // el nodo que acaba de marcarse, para darle su pop
function setMark(key, val){
  ultimaMarca = val === '1' ? key : null;
  if(val==='0' || val===null) localStorage.removeItem(key);
  else localStorage.setItem(key, val);
  const m = metaLoad(); m[key] = Date.now(); metaSave(m);
  schedulePush();
}
const marcado = key => localStorage.getItem(key)==='1';

// Estado local como { key: {v:valor, t:epoch} }. El valor ya no es solo 1/0:
// el peso y los cambios de plato viajan como texto en la misma estructura.
function localState(){
  const m = metaLoad(); const out = {};
  new Set([...Object.keys(localStorage).filter(k=>DKEY.test(k)), ...Object.keys(m)]).forEach(k=>{
    const raw = localStorage.getItem(k);
    out[k] = { v: (raw===null ? '0' : raw), t: m[k]||1 };
  });
  return out;
}
// Merge por ultima escritura (mayor t gana)
function mergeStates(a, b){
  const out = {};
  new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k=>{
    const x=a[k], y=b[k];
    out[k] = (!y || (x && x.t>=y.t)) ? x : y;
  });
  return out;
}
function applyState(s){
  const m = metaLoad();
  Object.entries(s).forEach(([k,info])=>{
    if(info && info.v && info.v!=='0') localStorage.setItem(k, info.v); else localStorage.removeItem(k);
    m[k] = info ? info.t : Date.now();
  });
  metaSave(m);
}

async function cloudPull(){
  const r = await fetch(`${API}/estado`, { headers: cabeceras(), cache:'no-store' });
  if(r.status===401) throw Object.assign(new Error('sin clave'), {sinClave:true});
  if(!r.ok) throw new Error('pull '+r.status);
  return await r.json();
}
async function cloudPush(state){
  const r = await fetch(`${API}/estado`, {
    method:'POST', headers: cabeceras(), body: JSON.stringify({ state })
  });
  if(r.status===401) throw Object.assign(new Error('sin clave'), {sinClave:true});
  if(!r.ok) throw new Error('push '+r.status);
}

// Las escrituras se agrupan: marcar cinco cosas seguidas manda un solo sync
let pushTimer = null, syncing = false;

function schedulePush(){
  if(!cloudOn()){ setStatus('local'); return; }
  clearTimeout(pushTimer);
  pushTimer = setTimeout(fullSync, 1200);
}
async function fullSync(){
  if(!cloudOn()){ setStatus('local'); return; }
  if(syncing) return;
  syncing=true; setStatus('sync');
  try{
    const remote = await cloudPull();
    const merged = mergeStates(localState(), remote);
    applyState(merged);
    await cloudPush(merged);
    setStatus('ok'); render();
  }catch(e){ setStatus(e && e.sinClave ? 'sinClave' : 'err'); }
  finally{ syncing=false; }
}
function setStatus(s){
  const el=document.getElementById('syncTag'); if(!el) return;
  el.textContent = { local:'Solo este dispositivo', sync:'Sincronizando…',
    ok:'Sincronizado entre tus dispositivos', err:'Sin conexión · guardado local' }[s] || '';
}

/* ---------------- Conteos ---------------- */
// Cuantas unidades de una racion llevas ese dia
function racionCount(ds, id, max){
  let n=0; for(let i=1;i<=max;i++) if(marcado(`${ds}:R:${id}${i}`)) n++;
  return n;
}
// Dias calendario de una semana del programa
function diasDeSemana(w){
  const out=[]; for(let d=(w-1)*7+1; d<=w*7; d++) out.push(dsDiaG(d));
  return out;
}
// Un permiso o frecuencia gastado a lo largo de la semana
function semanaCount(w, tipo, id, tope){
  let n=0;
  diasDeSemana(w).forEach(ds=>{ for(let i=1;i<=tope;i++) if(marcado(`${ds}:${tipo}:${id}${i}`)) n++; });
  return n;
}
function diaCount(ds, tipo, id, tope){
  let n=0; for(let i=1;i<=tope;i++) if(marcado(`${ds}:${tipo}:${id}${i}`)) n++;
  return n;
}
// Marca la primera casilla libre del dia, o libera la ultima ocupada
function bump(ds, tipo, id, cap, delta){
  if(delta>0){
    for(let i=1;i<=cap;i++){ const k=`${ds}:${tipo}:${id}${i}`; if(!marcado(k)){ setMark(k,'1'); return; } }
  } else {
    for(let i=cap;i>=1;i--){ const k=`${ds}:${tipo}:${id}${i}`; if(marcado(k)){ setMark(k,'0'); return; } }
  }
}

// Lo obligatorio de un dia: suplementos + comidas + verduras + llegar a la meta de agua
function obligatorio(dia){
  const ds = dsDiaG(dia);
  const supl = suplDeDia(dia).items.map(it=>({ok:marcado(`${ds}:${it.meal}:${it.id}`)}));
  const com  = COMIDAS.map(it=>({ok:marcado(`${ds}:${it.meal}:${it.id}`)}));
  const agua = [{ok: racionCount(ds,'agua',8) >= 6}];
  const todo = [...supl, ...com, ...agua];
  return {total: todo.length, hechos: todo.filter(x=>x.ok).length};
}

/* EL MOMENTO. Un solo instante orquestado en toda la app: cuando el dia queda
   cerrado, el anillo late, el cartel entra con rebote y los puntos del riel se
   llenan en orden, contando el dia de arriba abajo. Solo al CRUZAR a completo,
   nunca al abrir la app con el dia ya hecho: una celebracion que se repite
   cada vez que entras deja de ser una celebracion. */
let diaEstabaCerrado = null;
function cerrarElDia(completo){
  const cruzo = diaEstabaCerrado === false && completo;
  diaEstabaCerrado = completo;
  if(!cruzo) return;
  const hero = document.querySelector('.hero');
  const cartel = document.getElementById('doneMsg');
  const riel = document.querySelector('.dia');
  [hero, cartel, riel].forEach(el=>{ if(el){ el.classList.remove('celebra'); void el.offsetWidth; el.classList.add('celebra'); } });
  setTimeout(()=>[hero,cartel,riel].forEach(el=>el && el.classList.remove('celebra')), 1600);
  if(navigator.vibrate) navigator.vibrate([12, 40, 18]);
}

/* ---------------- Render ---------------- */
function render(){
  const hoyD = new Date();
  const $ = id => document.getElementById(id);
  $('diaSemana').textContent = hoyD.toLocaleDateString('es-PE',{weekday:'long'});
  $('fecha').textContent = hoyD.toLocaleDateString('es-PE',{day:'numeric',month:'long'});

  // La ficha de arriba es SIEMPRE hoy, mires el dia que mires
  const planHoy = suplDeDia(diaPrograma);
  const fase = $('faseTag'); if(fase) fase.textContent = planHoy.fase.toLowerCase();
  $('notaFase').textContent = notas[planHoy.fase];
  const oHoy = obligatorio(diaPrograma);
  const pctHoy = oHoy.total ? Math.round(oHoy.hechos/oHoy.total*100) : 0;
  if(typeof contarHasta === 'function') contarHasta($('ringPct'), pctHoy);
  else $('ringPct').textContent = pctHoy;
  $('ring').style.strokeDashoffset = RING_CIRC*(1-pctHoy/100);
  $('hoyPie').textContent = `${oHoy.hechos} de ${oHoy.total} hechos`;
  if(antesDeEmpezar){
    const t = document.querySelector('#panel-hoy .card.focus h2'); if(t) t.textContent = 'El día 1';
    const r = document.querySelector('#fichaHoy .rot'); if(r) r.textContent = 'Día 1';
  }
  pintarCuentaRegresiva();

  renderHoy();
  renderPermisos();
  renderSensaciones();
  renderSien();
  renderSemana();
  renderPeso();
  renderFases();
  renderHeat();
  // Al final: renderHoy acaba de rehacer el riel, y antes la clase se perdia
  cerrarElDia(oHoy.total>0 && oHoy.hechos===oHoy.total);
  if(typeof renderNutricion === 'function') renderNutricion();
  if(typeof montarBotonInforme === 'function') montarBotonInforme();
  if(typeof montarCardPlan === 'function') montarCardPlan();
  if(typeof renderAvisos === 'function') renderAvisos();
}

/* Cuenta regresiva: entre hoy y el arranque, la app ensena el dia 1 en vez de
   numeros rotos, y dice cuando empieza. */
function pintarCuentaRegresiva(){
  const panel = document.getElementById('panel-hoy');
  let el = document.getElementById('cuentaRegresiva');
  if(!antesDeEmpezar){ if(el) el.remove(); return; }
  if(!el){
    el = document.createElement('div');
    el.id = 'cuentaRegresiva'; el.className = 'arranque';
    panel.insertBefore(el, panel.firstChild);
  }
  const f = new Date(Date.parse(INICIO + 'T00:00:00Z'));
  const cuando = f.toLocaleDateString('es-PE', {weekday:'long', day:'numeric', month:'long', timeZone:'UTC'})
    .replace(',', '');
  el.innerHTML =
    `<b>Empieza el ${cuando}</b>` +
    `<span>${faltanDias === 1 ? 'Falta un día' : 'Faltan ' + faltanDias + ' días'}. Abajo está el día 1 completo, ` +
    `para que hagas la compra con tiempo.</span>`;
}

/* Card "Lo importante ahora". El dia se dibuja como una linea con un punto
   por comida y solo el tramo del momento abierto: la card por fin hace lo que
   dice su nombre. Los demas tramos no se esconden, se resumen. */
let tramoAbierto = null;   // null = lo decide el reloj

function tramoDelReloj(){
  const h = new Date().toLocaleString('en-GB', {timeZone:'America/Lima', hour:'2-digit', minute:'2-digit', hour12:false});
  const min = parseInt(h.slice(0,2),10)*60 + parseInt(h.slice(3,5),10);
  if(min < 11*60) return 'Desayuno';
  if(min < 16*60+30) return 'Almuerzo';
  return 'Cena';
}

function pendientesDe(comida, plan){
  const todos = [...plan.items, ...COMIDAS].filter(i=>i.meal===comida);
  const faltan = todos.filter(it=> !marcado(`${selDate}:${it.meal}:${it.id}`));
  return {total: todos.length, faltan: faltan.length};
}

function tramoQueVa(plan){
  const orden = ['Desayuno','Almuerzo','Cena'];
  if(tramoAbierto) return tramoAbierto;
  const pend = orden.filter(c => pendientesDe(c, plan).faltan > 0);
  if(!pend.length) return null;                       // dia cerrado: nada abierto
  if(selDate !== HOY) return pend[0];                 // otro dia: el primero que falte
  const reloj = tramoDelReloj();
  return pend.includes(reloj) ? reloj : pend[0];
}

/* Cierra un tramo entero de un toque. Marca solo lo que falta, asi que volver
   a tocarlo no desmarca nada: para quitar una toma se toca esa toma. */
function marcarTramo(comida, items){
  const faltan = items.filter(it => !marcado(`${selDate}:${it.meal}:${it.id}`));
  if(!faltan.length) return;
  faltan.forEach(it => setMark(`${selDate}:${it.meal}:${it.id}`, '1'));
  ultimaMarca = `${selDate}:${comida}:${faltan[faltan.length-1].id}`;
  if(typeof sincronizarFrecuencias === 'function') sincronizarFrecuencias(selDia);
  if(navigator.vibrate) navigator.vibrate(14);
  render();
}

let tramoRecienAbierto = null;   // para que el tramo nuevo nazca desplegandose
function abrirTramo(comida){
  const cerrando = (tramoAbierto === comida);
  tramoAbierto = cerrando ? '__ninguno' : comida;
  tramoRecienAbierto = cerrando ? null : comida;
  renderHoy();
  tramoRecienAbierto = null;
}

function renderHoy(){
  renderDayNav();
  const plan = suplDeDia(selDia);
  const cont = document.getElementById('hoyItems');
  cont.innerHTML = '';

  const menuHoy = (typeof comidasDeDia === 'function') ? comidasDeDia(selDia) : null;
  const activo = tramoQueVa(plan);
  const todos = [...plan.items, ...COMIDAS];

  const linea = document.createElement('div');
  linea.className = 'dia';

  ['Desayuno','Almuerzo','Cena'].forEach(c=>{
    const del = todos.filter(i=>i.meal===c);
    if(!del.length) return;
    const {total, faltan} = pendientesDe(c, plan);
    const listo = faltan === 0;
    const abierto = c === activo;

    const tramo = document.createElement('div');
    // el tramo entero se cierra con el ultimo toque: ese check tambien salta
    const cerroAhora = listo && ultimaMarca && ultimaMarca.startsWith(`${selDate}:${c}:`);
    tramo.className = 'tramo' + (abierto?' ahora':'') + (listo?' listo':'') + (cerroAhora?' recien':'');

    // Que se come, para que el tramo cerrado igual lo diga
    const m = menuHoy ? (c==='Desayuno'?menuHoy.desayuno : c==='Almuerzo'?menuHoy.almuerzo : menuHoy.cena) : null;
    const resumen = m ? (m.corto || m.titulo) : (listo ? 'Listo' : `${total} cosas`);

    // El marcador del riel es la ilustracion del plato: a 48 px se lee que se
    // come sin leer nada. Un icono generico de sol o luna no dice eso.
    const fam = (typeof familiaDe === 'function' && m) ? familiaDe(m, c) : null;
    const img = (typeof imagenDe === 'function' && m) ? imagenDe(m, c) : null;

    const cab = document.createElement('button');
    cab.type='button'; cab.className='tramo-h';
    cab.setAttribute('aria-expanded', abierto?'true':'false');
    cab.innerHTML =
      `<span class="marcador${fam?' m-'+fam:''}">`+
        (img ? `<img src="${img}" alt="" loading="lazy">` : '')+
      `</span>`+
      `<span class="tramo-txt"><span class="tramo-nom">${c} · ${HORA_COMIDA[c]}</span>`+
      `<span class="tramo-res">${resumen}</span></span>`+
      (listo
        ? `<span class="tramo-ok"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></span>`
        : (abierto
            ? `<span class="tramo-todo">${faltan === 1
                  ? (faltan === total ? 'Marcar' : 'Marcar la que falta')
                  : 'Marcar las ' + faltan + (faltan === total ? '' : ' que faltan')}</span>`
            : `<span class="tramo-cnt">${total - faltan} de ${total}</span>`));
    cab.onclick = ev => {
      if (ev.target.closest('.tramo-todo')) { marcarTramo(c, del); return; }
      abrirTramo(c);
    };
    tramo.appendChild(cab);

    const body = document.createElement('div');
    body.className='tramo-body';
    body.hidden = !abierto;
    if(c === tramoRecienAbierto) body.dataset.abriendo = '1';

    if(typeof bloquePlato === 'function' && menuHoy){
      const plato = bloquePlato(c, menuHoy);
      if(plato){ plato.classList.add('fino'); body.appendChild(plato); }
    }
    del.forEach(it=>{
      const key = `${selDate}:${it.meal}:${it.id}`;
      const on = marcado(key);
      const el = document.createElement('div');
      el.className = 'item fino'+(on?' on':'')+(key===ultimaMarca?' recien':'');
      el.setAttribute('role','button'); el.setAttribute('tabindex','0');
      el.setAttribute('aria-pressed', on?'true':'false');
      const toggle = ()=>{
        setMark(key, on?'0':'1');
        if(typeof sincronizarFrecuencias === 'function') sincronizarFrecuencias(selDia);
        render();
      };
      el.onclick = toggle;
      el.onkeydown = e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); toggle(); } };
      el.innerHTML =
        `<div class="check"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>`+
        `<div class="info"><span class="name">${it.name}</span><span class="dose">${it.tag || it.dose}</span></div>`;
      body.appendChild(el);
    });
    tramo.appendChild(body);
    linea.appendChild(tramo);
  });
  cont.appendChild(linea);

  /* El tramo que se acaba de abrir se despliega. Va aca y no en una transicion
     porque renderHoy rehace el DOM: el nodo nace ya desplegado y ninguna
     transicion llega a dispararse. El alto se mide DESPUES de insertarlo, que
     es cuando existe de verdad. */
  const nuevo = linea.querySelector('.tramo-body[data-abriendo]');
  if(nuevo && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    nuevo.style.setProperty('--alto', nuevo.scrollHeight + 'px');
    nuevo.classList.add('abriendo');
    setTimeout(()=>{ nuevo.classList.remove('abriendo'); nuevo.style.removeProperty('--alto'); }, 420);
  }

  // Lo que corre todo el dia no pertenece a ninguna comida: va fuera del riel
  const rw = document.createElement('div');
  rw.className='meal'; rw.style.marginTop='16px';
  rw.innerHTML = `<div class="meal-h"><span class="meal-ic">${IC_DROP}</span><span class="meal-name">A lo largo del día</span></div>`;
  RACIONES.forEach(r=>{
    const cap = r.meta + r.extra;
    const n = racionCount(selDate, r.id, cap);
    const box = document.createElement('div');
    box.className = 'corrida'+(n>=r.meta?' done':'');
    let units='';
    for(let i=1;i<=cap;i++){
      const on = marcado(`${selDate}:R:${r.id}${i}`);
      const k = `${selDate}:R:${r.id}${i}`;
      units += `<button class="u${on?' on':''}${i>r.meta?' extra':''}${k===ultimaMarca?' recien':''}" onclick="tapUnit('${r.id}',${i},${cap})" aria-label="${r.name} ${i}">${r.unit}</button>`;
    }
    box.innerHTML =
      `<span class="corrida-nom">${r.name}</span>`+
      `<span class="units">${units}</span>`+
      `<span class="corrida-num">${n} de ${r.meta}</span>`;
    rw.appendChild(box);
  });
  cont.appendChild(rw);

  const o = obligatorio(selDia);
  document.getElementById('contador').textContent = `${o.hechos} de ${o.total}`;
  document.getElementById('doneMsg').style.display = (o.hechos===o.total && o.total>0) ? 'flex':'none';
}

/* Como te sentiste. Aparece al final del dia porque a las 8 de la manana
   nadie puede responderlo, y se queda visible si ya hay algo respondido o si
   estas mirando un dia pasado. */
function horaLima(){
  const h = new Date().toLocaleString('en-GB', {timeZone:'America/Lima', hour:'2-digit', hour12:false});
  return parseInt(h, 10);
}
function renderSensaciones(){
  const card = document.getElementById('sensCard');
  const cont = document.getElementById('sensBody');
  if(!card || !cont) return;
  const cfg = (PLAN.sensaciones || {});
  const aspectos = cfg.aspectos || [];
  const respondido = aspectos.some(a => !!localStorage.getItem(`${selDate}:F:${a.id}`));
  const toca = selDate !== HOY || respondido || horaLima() >= (cfg.desdeHora || 18);
  card.hidden = !toca || !aspectos.length;
  if(card.hidden) return;

  const cuenta = document.getElementById('sensCount');
  const hechos = aspectos.filter(a => !!localStorage.getItem(`${selDate}:F:${a.id}`)).length;
  if(cuenta) cuenta.textContent = `${hechos} de ${aspectos.length}`;

  cont.innerHTML = '';
  aspectos.forEach(a=>{
    const key = `${selDate}:F:${a.id}`;
    const val = localStorage.getItem(key);
    const fila = document.createElement('div');
    fila.className = 'sens' + (val ? ' on' : '');
    fila.innerHTML = `<span class="sens-nom">${a.name}</span>`;
    const seg = document.createElement('div');
    seg.className = 'seg';
    a.opciones.forEach((op, i)=>{
      const n = String(i+1);
      const bt = document.createElement('button');
      bt.type='button'; bt.textContent = op;
      bt.className = val===n ? 'on' : '';
      bt.setAttribute('aria-pressed', val===n ? 'true':'false');
      bt.onclick = ()=>{ setMark(key, val===n ? '0' : n); render(); };
      seg.appendChild(bt);
    });
    fila.appendChild(seg);
    cont.appendChild(fila);
  });
}

/* Como te sientes, en Progreso: el promedio de la semana por aspecto. Es la
   misma escala que se responde en Hoy, leida como instrumento y no como
   pregunta. Si no hay ni una respuesta la seccion no aparece: una fila de
   barras vacias no informa nada. */
function renderSien(){
  const card = document.getElementById('sienCard');
  const cont = document.getElementById('sienBody');
  if(!card || !cont) return;
  const aspectos = (PLAN.sensaciones || {}).aspectos || [];
  const dias = diasDeSemana(selSemana()).filter(ds => ds <= HOY);

  const filas = aspectos.map(a=>{
    const vals = dias.map(ds => parseInt(localStorage.getItem(`${ds}:F:${a.id}`),10)).filter(v=>!isNaN(v));
    if(!vals.length) return null;
    const n = a.opciones.length;
    const prom = vals.reduce((x,y)=>x+y,0)/vals.length;
    return {nombre:a.name, pct: Math.round(prom/n*100), etiqueta: a.opciones[Math.round(prom)-1] || '', veces: vals.length};
  }).filter(Boolean);

  card.hidden = !filas.length;
  if(card.hidden) return;
  cont.innerHTML = filas.map(f=>
    `<div class="sien"><span class="nm">${f.nombre}</span>`+
    `<span class="esc"><i style="width:${f.pct}%"></i></span>`+
    `<span class="v">${f.etiqueta}</span></div>`).join('');
}

function tapUnit(id, i, cap){
  const key = `${selDate}:R:${id}${i}`;
  if(marcado(key)){
    // al desmarcar, colapsa: se apagan tambien las de la derecha
    for(let j=i;j<=cap;j++) if(marcado(`${selDate}:R:${id}${j}`)) setMark(`${selDate}:R:${id}${j}`,'0');
  } else {
    for(let j=1;j<=i;j++) if(!marcado(`${selDate}:R:${id}${j}`)) setMark(`${selDate}:R:${id}${j}`,'1');
  }
  render();
}

// Card "Tus permisos": lo que se gasta sin pasarse
const CAP_P = p => p.tope + 3;   // margen para registrar un exceso
function renderPermisos(){
  const cont = document.getElementById('permisos');
  cont.innerHTML = '';
  let libres = 0, total = 0;
  PERMISOS.forEach(p=>{
    const cap    = CAP_P(p);
    const esSemana = p.ciclo==='semana';
    const usados = esSemana ? semanaCount(selSemana(),'P',p.id,cap) : diaCount(selDate,'P',p.id,cap);
    const hoy    = diaCount(selDate,'P',p.id,cap);
    const antes  = usados - hoy;
    const over   = usados > p.tope;
    total += p.tope; libres += Math.max(0, p.tope-usados);

    let toks='';
    for(let i=1;i<=p.tope;i++){
      const esPrevio = i<=antes;
      const gastadoHoy = i>antes && i<=usados;
      const cls = esPrevio ? 'prev' : (gastadoHoy ? 'on' : '');
      const lbl = esPrevio ? `${p.name}, gastado otro día de esta semana` : `${p.name} ${i}`;
      toks += `<button class="tok ${cls}" ${esPrevio?'disabled':''} onclick="tapPerm('${p.id}',${i})" aria-label="${lbl}"></button>`;
    }
    if(over) toks += `<button class="tok over" onclick="tapPerm('${p.id}',${usados})" aria-label="Quitar el exceso de ${p.name}"></button>`;

    const restan = p.tope - usados;
    const sub = over ? `Te pasaste por ${usados-p.tope}`
      : (restan > 0 ? p.sub : 'Ya lo gastaste');

    const el = document.createElement('div');
    el.className = 'perm'+(over?' over':(restan<=0?' spent':''));
    el.innerHTML = `<div class="perm-info"><div class="perm-name">${p.name}</div><div class="perm-sub">${sub}</div></div><div class="toks">${toks}</div>`;
    cont.appendChild(el);
  });
  document.getElementById('permCount').textContent = `${libres} disponibles`;
}
// Tocar una ficha libre gasta el permiso; tocar una ya gastada hoy lo devuelve.
function tapPerm(id, i){
  const p = PERMISOS.find(x=>x.id===id);
  const cap = CAP_P(p);
  const usados = p.ciclo==='semana' ? semanaCount(selSemana(),'P',id,cap) : diaCount(selDate,'P',id,cap);
  const hoy = diaCount(selDate,'P',id,cap);
  if(i<=usados && hoy>0) bump(selDate,'P',id,cap,-1);
  else if(i<=usados) return;            // gastado otro dia de la semana: no se toca desde aqui
  else bump(selDate,'P',id,cap,+1);
  render();
}

// Card "Esta semana": frecuencias con meta o tope
function renderSemana(){
  const cont = document.getElementById('semanaRows');
  cont.innerHTML = '';
  const w = selSemana();
  const d1 = dsDiaG((w-1)*7+1), d7 = dsDiaG(w*7);
  const f = s => s.slice(8)+'/'+s.slice(5,7);
  document.getElementById('wkRange').textContent = `Semana ${w} · ${f(d1)} al ${f(d7)}`;

  SEMANALES.forEach(s=>{
    const cap = (s.alto||s.meta)+3;
    const n = semanaCount(w,'S',s.id,cap);
    const ok   = s.tipo==='min' ? n>=s.meta : n<=s.meta;
    const over = s.tipo==='max' && n>s.meta;
    const el = document.createElement('div');
    el.className = 'wk'+(over?' over':(ok&&n>0?' ok':''));
    el.innerHTML =
      `<div class="wk-info"><div class="wk-name">${s.name}</div><div class="wk-goal">${s.goal}</div></div>`+
      `<div class="wk-ctrl">`+
        `<span class="wk-val">${n} / ${s.meta}${s.alto&&s.alto!==s.meta?'-'+s.alto:''}</span>`+
        `<div class="stepper">`+
          `<button class="st" ${n<=0?'disabled':''} onclick="tapWk('${s.id}',${cap},-1)" aria-label="Quitar uno a ${s.name}">−</button>`+
          `<button class="st" onclick="tapWk('${s.id}',${cap},1)" aria-label="Sumar uno a ${s.name}">+</button>`+
        `</div>`+
      `</div>`;
    cont.appendChild(el);
  });
}
function tapWk(id, cap, delta){
  if(delta>0) bump(selDate,'S',id,cap,+1);
  else {
    // quita del dia seleccionado; si ahi no hay nada, del ultimo dia de la semana que tenga
    const dias = diasDeSemana(selSemana()).filter(ds=>ds<=HOY);
    const orden = [selDate, ...dias.slice().reverse()];
    for(const ds of orden){ if(diaCount(ds,'S',id,cap)>0){ bump(ds,'S',id,cap,-1); break; } }
  }
  render();
}

// Card "Peso": el unico numero continuo del plan. Pesaje de los miercoles en ayunas.
function pesajes(){
  return Object.keys(localStorage)
    .filter(k=>/^\d{4}-\d{2}-\d{2}:W:kg$/.test(k))
    .map(k=>({ds:k.slice(0,10), kg:parseFloat(localStorage.getItem(k))}))
    .filter(p=>!isNaN(p.kg))
    .sort((a,b)=>a.ds<b.ds?-1:1);
}
function renderPeso(){
  const cont = document.getElementById('pesoBody');
  const ps = pesajes();
  const hoyDow = new Date(Date.parse(HOY+'T12:00:00Z')).getUTCDay();
  const esMiercoles = hoyDow===3;
  const yaHoy = ps.some(p=>p.ds===HOY);
  document.getElementById('pesoCount').textContent = ps.length ? `${ps.length} ${ps.length===1?'registro':'registros'}` : 'sin registros';

  let head;
  if(!ps.length){
    head = `<div class="peso-sub">Pésate una vez por semana, en ayunas y después de ir al baño. Alexia recomienda el miércoles: los lunes mienten.</div>`;
  } else {
    const ult = ps[ps.length-1], prev = ps[ps.length-2];
    const dTot = ult.kg - ps[0].kg;
    const dPrev = prev ? ult.kg - prev.kg : null;
    const fmt = v => (v>0?'+':'')+v.toFixed(1);
    head =
      `<div class="peso-top">`+
        `<div class="peso-big">${ult.kg.toFixed(1).replace('.',',')}<em>kg</em></div>`+
        (dPrev!==null ? `<div class="peso-delta"><b>${fmt(dPrev)} kg</b> desde el pesaje anterior</div>` : '')+
      `</div>`+
      `<div class="peso-sub">${ps.length>1 ? `${fmt(dTot)} kg desde que arrancaste · ` : ''}Último: ${ult.ds.slice(8)}/${ult.ds.slice(5,7)}</div>`;
  }

  // Con menos de 4 pesajes una linea miente: se muestra el numero, no el grafico.
  let chart = '';
  if(ps.length>=4){
    const W=340, H=96, pad=16;
    const kgs = ps.map(p=>p.kg);
    const min = Math.min(...kgs), max = Math.max(...kgs);
    const span = (max-min) || 1;
    const x = i => pad + i*(W-2*pad)/(ps.length-1);
    const y = v => (H-pad-14) - ((v-min)/span)*(H-2*pad-14);
    const d = ps.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
    const dots = ps.map((p,i)=>`<circle class="pl-dot${i===ps.length-1?' last':''}" cx="${x(i).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="${i===ps.length-1?5:4}"><title>${p.ds} · ${p.kg.toFixed(1)} kg</title></circle>`).join('');
    const fd = s => s.slice(8)+'/'+s.slice(5,7);
    const ejes =
      `<text class="pl-lbl" x="${pad}" y="${H-1}" text-anchor="start">${fd(ps[0].ds)}</text>`+
      `<text class="pl-lbl" x="${W-pad}" y="${H-1}" text-anchor="end">${fd(ps[ps.length-1].ds)}</text>`;
    chart =
      `<div class="peso-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Peso por pesaje, de ${ps[0].kg.toFixed(1)} a ${ps[ps.length-1].kg.toFixed(1)} kilos">`+
        `<path class="pl-line" d="${d}" vector-effect="non-scaling-stroke"/>${dots}${ejes}`+
      `</svg></div>`;
  }

  const aviso = (esMiercoles && !yaHoy) ? `<div class="peso-sub" style="color:var(--verde);font-weight:700;margin-top:12px">Hoy es miércoles: toca pesarte.</div>` : '';
  const form =
    `<div class="peso-form">`+
      `<input id="pesoInput" type="number" inputmode="decimal" step="0.1" min="30" max="250" placeholder="Peso de hoy en kg" aria-label="Peso de hoy en kilos">`+
      `<button class="btn btn-p" onclick="guardarPeso()">Guardar</button>`+
    `</div>`;
  cont.innerHTML = head + chart + aviso + form;
  pintarFichaPeso(ps);
}

/* La ficha de peso vive en Hoy y en Progreso. Con menos de dos pesajes una
   curva miente, asi que en ese caso no se dibuja ninguna: se dice el numero. */
function pintarFichaPeso(ps){
  const val = ps.length ? ps[ps.length-1].kg.toFixed(1).replace('.',',') : '—';
  const pie = !ps.length
    ? 'Todavía sin pesarte'
    : (ps.length===1
        ? 'Primer registro'
        : `${(ps[ps.length-1].kg-ps[0].kg>0?'+':'−')}${Math.abs(ps[ps.length-1].kg-ps[0].kg).toFixed(1).replace('.',',')} kg en ${ps.length} pesajes`);

  let curva = '';
  if(ps.length>=2){
    const kgs = ps.map(p=>p.kg), min=Math.min(...kgs), max=Math.max(...kgs), span=(max-min)||1;
    const x = i => 6 + i*108/(ps.length-1);
    const y = v => 33 - ((v-min)/span)*26;
    const d = ps.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(p.kg).toFixed(1)}`).join(' ');
    curva = `<path d="${d}" fill="none" stroke="#7FB8A3" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`+
            `<circle cx="${x(ps.length-1).toFixed(1)}" cy="${y(ps[ps.length-1].kg).toFixed(1)}" r="4.5" fill="var(--verde)"/>`;
  }
  ['','2'].forEach(sufijo=>{
    const v = document.getElementById('pesoVal'+sufijo);
    const p = document.getElementById('pesoPie'+sufijo);
    const c = document.getElementById('pesoMini'+sufijo);
    if(v) v.innerHTML = ps.length ? `${val}<em>kg</em>` : '—';
    if(p) p.textContent = pie;
    if(c) c.innerHTML = curva;
  });
}
/* La ficha de peso de Hoy es un enlace, no un adorno: te deja escribiendo. */
(function(){
  const f = document.getElementById('fichaPeso');
  if(!f) return;
  f.onclick = () => {
    irASeccion('progreso');
    setTimeout(()=>{
      const i = document.getElementById('pesoInput');
      if(i){ i.scrollIntoView({block:'center', behavior:'smooth'}); i.focus(); }
    }, 260);
  };
})();

function guardarPeso(){
  const el = document.getElementById('pesoInput');
  const v = parseFloat(el.value);
  if(isNaN(v) || v<30 || v>250){ el.focus(); return; }
  setMark(`${HOY}:W:kg`, v.toFixed(1));
  el.value='';
  render();
}

function renderFases(){
  const tl = document.getElementById('tlFases'); tl.innerHTML='';
  refFases.forEach(f=>{
    const active = diaPrograma>=f.rango[0] && diaPrograma<=f.rango[1];
    const done = diaPrograma > f.rango[1];
    const d = document.createElement('div');
    d.className = 'tl-item'+(active?' active':'')+(done?' done':'');
    d.innerHTML = `<div class="tl-dot"></div>`+
      `<div class="tl-head"><span class="tl-name">${f.nombre}</span><span class="tl-when">${f.when}</span></div>`+
      `<ul class="tl-list">${f.lo.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    tl.appendChild(d);
  });
}

function renderHeat(){
  const PROG_DIAS = 84; // 12 semanas
  const estadoDia = d => {
    const o = obligatorio(d);
    return {exp:o.total, tk:o.hechos, full: o.total>0 && o.hechos===o.total, partial: o.hechos>0 && o.hechos<o.total};
  };

  let fullCount=0;
  for(let d=1; d<=diaPrograma && d<=PROG_DIAS; d++){ if(estadoDia(d).full) fullCount++; }
  const dueSoFar = Math.max(0, Math.min(diaPrograma, PROG_DIAS));
  const adh = dueSoFar>0 ? Math.round(fullCount/dueSoFar*100) : 0;
  let streak=0;
  let start = (diaPrograma>=1 && estadoDia(diaPrograma).full) ? diaPrograma : diaPrograma-1;
  for(let d=start; d>=1 && estadoDia(d).full; d--) streak++;

  const $ = id => document.getElementById(id);
  const pon = (id, v) => { const e = $(id); if(e) e.textContent = v; };
  pon('hsFull', fullCount); pon('hsAdh2', adh+'%'); pon('hsRacha2', streak);
  $('totalDias').textContent = `${dueSoFar} de ${PROG_DIAS} días`;
  if(typeof contarHasta === 'function') contarHasta($('hsAdh'), adh); else $('hsAdh').textContent = adh;
  $('hsRacha').textContent = streak === 1 ? '1 día' : streak + ' días';
  if($('adhPie')) $('adhPie').textContent = dueSoFar ? `${fullCount} de ${dueSoFar} días completos` : 'Todavía sin días';

  /* La racha en barras: SOLO catorce dias, no ochenta y cuatro. Con seis dias
     hechos, un mapa de 84 celdas esta 93 % vacio y se lee como fracaso. */
  const tira = $('rachaDias');
  if(tira){
    const desde = Math.max(1, diaPrograma - 8);
    let h = '';
    for(let d=desde; d<desde+14 && d<=PROG_DIAS; d++){
      let cls = 'future';
      if(d < diaPrograma){ const e = estadoDia(d); cls = e.full?'full':(e.partial?'partial':'none'); }
      else if(d === diaPrograma){ cls = 'today'; }
      else cls = '';
      h += `<i class="${cls}"></i>`;
    }
    tira.innerHTML = h;
  }

  /* Las barras de adherencia de la ficha: una por dia de la ultima semana. */
  const mini = $('adhMini');
  if(mini){
    let h = '';
    for(let k=0; k<6; k++){
      const d = diaPrograma - 5 + k;
      const alto = (d>=1 && d<=diaPrograma) ? (()=>{ const e=estadoDia(d); return e.exp? Math.max(6, Math.round(e.tk/e.exp*34)) : 6; })() : 6;
      const col = (d===diaPrograma) ? 'var(--verde)' : '#C6CCC8';
      h += `<rect x="${3+k*18}" y="${40-alto}" width="13" height="${alto}" rx="3" fill="${col}"/>`;
    }
    mini.innerHTML = h;
  }

  const semanas = Math.min(Math.ceil(PROG_DIAS/7), Math.ceil(diaPrograma/7) + 1);
  let html='';
  for(let w=1; w<=semanas; w++){
    html += `<div class="heat-wk">S${w}</div>`;
    for(let pos=0; pos<7; pos++){
      const d=(w-1)*7+pos+1;
      if(d>PROG_DIAS){ html+='<div></div>'; continue; }
      const ds=dsDiaG(d); const ddmm=ds.slice(8)+'/'+ds.slice(5,7);
      if(d>diaPrograma){ html+=`<div class="cell future" title="Día ${d} · ${ddmm} · próximo"></div>`; continue; }
      const s=estadoDia(d);
      const cls = s.full?'full':(s.partial?'partial':'none');
      const today = d===diaPrograma?' today':'';
      html+=`<div class="cell ${cls}${today}${d===selDia?' sel':''}" title="Día ${d} · ${ddmm} · ${s.tk} de ${s.exp}" onclick="jumpDay(${d})"></div>`;
    }
  }
  document.getElementById('heatGrid').innerHTML = html;
}

function toggleComer(){
  const b = document.getElementById('accBtn'), body = document.getElementById('accBody');
  const open = b.getAttribute('aria-expanded')==='true';
  b.setAttribute('aria-expanded', open?'false':'true');
  body.hidden = open;
  if(!open && !body.innerHTML){
    body.innerHTML = QUE_COMER.map(s=>
      `<div class="rec"><div class="rec-h"><span>${s.titulo}</span>${s.tag?`<em>${s.tag}</em>`:''}</div>`+
      `<ul>${s.lo.map(x=>`<li>${x}</li>`).join('')}</ul></div>`
    ).join('');
  }
}

/* Habia un boton flotante con un check que marcaba el dia entero de un toque.
   Se saco: no decia que hacia, no se podia deshacer, y desde que cada comida
   tiene su "Marcar las N" con el numero escrito, era ademas redundante. */
function reiniciar(){
  if(confirm('Esto borra tu progreso en TODOS tus dispositivos. ¿Seguro?')){
    const m = metaLoad(); const now = Date.now();
    Object.keys(localStorage).filter(k=>DKEY.test(k)).forEach(k=>{ localStorage.removeItem(k); m[k]=now; });
    metaSave(m);
    if(cloudOn()) fullSync().finally(()=>location.reload());
    else location.reload();
  }
}
document.getElementById('ver').textContent = 'Versión 15 · ' + HOY;
render();
fullSync();

// Refresco en vivo entre dispositivos: al volver a la pestana, al enfocar y cada 25s
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') fullSync(); });
window.addEventListener('focus', fullSync);
setInterval(()=>{ if(document.visibilityState==='visible') fullSync(); }, 25000);

// PWA: instalar como app + offline
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=> navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
