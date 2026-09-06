// Dia 1 del programa (igual que el recordatorio de Slack)
const INICIO = '2026-09-01';
const HOY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const diaPrograma = Math.floor((Date.parse(HOY + 'T00:00:00Z') - Date.parse(INICIO + 'T00:00:00Z')) / 86400000) + 1;
const semana = Math.ceil(diaPrograma / 7);

// Dia seleccionado en la card "Lo importante ahora" (hoy por defecto; navegable a dias pasados)
function dsDiaG(d){ return new Date(Date.parse(INICIO+'T00:00:00Z')+(d-1)*86400000).toISOString().split('T')[0]; }
let selDia = diaPrograma;
let selDate = HOY;
const selSemana = () => Math.ceil(selDia/7);
function goDay(delta){ selDia = Math.min(diaPrograma, Math.max(1, selDia+delta)); selDate = dsDiaG(selDia); render(); }
function volverHoy(){ selDia = diaPrograma; selDate = HOY; render(); }
function jumpDay(d){ selDia = Math.min(diaPrograma, Math.max(1, d)); selDate = dsDiaG(selDia); render(); window.scrollTo({top:0, behavior:'smooth'}); }
function renderDayNav(){
  const nav = document.getElementById('dayNav'); if(!nav) return;
  const esHoy = selDate === HOY;
  const d = new Date(Date.parse(selDate+'T00:00:00Z'));
  const label = esHoy ? 'Hoy' : ('Día '+selDia+' · '+d.toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}));
  nav.className = 'daynav'+(esHoy?'':' past');
  nav.innerHTML =
    `<button class="dnav-btn" ${selDia<=1?'disabled':''} onclick="goDay(-1)" aria-label="Día anterior">‹</button>`+
    `<span class="dnav-lbl">${label}</span>`+
    `<button class="dnav-btn" ${esHoy?'disabled':''} onclick="goDay(1)" aria-label="Día siguiente">›</button>`+
    (esHoy ? '' : `<button class="dnav-today" onclick="volverHoy()">Hoy</button>`);
}

const IC_SUN  = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const IC_MOON = '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
const IC_DAWN = '<svg viewBox="0 0 24 24"><path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 2v4M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4"/><path d="M3 22h18"/></svg>';
const IC_DROP = '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10z"/></svg>';
const IC_LEAF = '<svg viewBox="0 0 24 24"><path d="M4 20c0-8 6-14 16-15 0 10-5 15-12 15H4z"/><path d="M8 18c2-4 5-7 9-9"/></svg>';
const mealIcon = m => m==='Desayuno' ? IC_DAWN : (m==='Almuerzo' ? IC_SUN : IC_MOON);

/* ---------------- Suplementos: protocolo Longevity 01 ---------------- */
// Las fases viven en protocolo-lib.js: el servidor las necesita para los avisos
const suplDeDia = dia => ProtocoloLib.suplDeDia(dia);

/* ---------------- Nutricion: plan de Alexia Macher ---------------- */
// Comidas y verduras: se marcan. Cuentan para el anillo del dia.
const COMIDAS = [
  {meal:'Desayuno', name:'Desayuné', dose:'Lo que dice el menú de arriba', tag:'1 opción', id:'m1'},
  {meal:'Almuerzo', name:'Almorcé', dose:'Lo que dice el plato de arriba', tag:'plato', id:'m2'},
  {meal:'Almuerzo', name:'Verduras en el almuerzo', dose:'Al menos ⅓ del plato', tag:'⅓', id:'v2'},
  {meal:'Cena', name:'Cené', dose:'Lo que dice el plato de arriba', tag:'plato', id:'m3'},
  {meal:'Cena', name:'Verduras en la cena', dose:'Al menos ⅓ del plato', tag:'⅓', id:'v3'},
];

// Raciones que se llenan. El agua cuenta para el anillo al llegar a la meta.
const RACIONES = [
  {id:'agua', name:'Vasos de agua', meta:6, extra:2, unit:IC_DROP, hint:'ideal 8', anillo:true},
  {id:'inf',  name:'Infusión',      meta:1, extra:0, unit:IC_LEAF, hint:'', anillo:false},
  {id:'fs',   name:'Frutos secos o palta', meta:1, extra:1, unit:IC_LEAF, hint:'hasta 2', anillo:false},
];

// Permisos: se gastan sin pasarse. Nunca suman al anillo.
const PERMISOS = [
  {id:'postre', name:'Postre o dulce',   tope:1, ciclo:'dia',    sub:'1 al día'},
  {id:'choco',  name:'Chocolate >70%',   tope:2, ciclo:'dia',    sub:'máximo 2 trocitos al día'},
  {id:'coca',   name:'Coca zero',        tope:3, ciclo:'semana', sub:'máximo 3 latas por semana'},
  {id:'fuera',  name:'Comer fuera o delivery', tope:2, ciclo:'semana', sub:'1 a 2 veces por semana'},
];

// Frecuencias de la semana. tipo 'min' = meta a alcanzar; 'max' = tope a no cruzar.
const SEMANALES = [
  {id:'pesc',  name:'Pescado',            tipo:'min', meta:3, alto:4, goal:'3 a 4 días · se llena con el menú'},
  {id:'menes', name:'Menestras o quinoa', tipo:'min', meta:2, alto:3, goal:'2 a 3 días · se llena con el menú'},
  {id:'fuerza',name:'Entrenamiento de fuerza', tipo:'min', meta:3, alto:5, goal:'rutina semanal'},
  {id:'roja',  name:'Carne roja',         tipo:'max', meta:2, goal:'máximo 2 veces · se llena con el menú'},
];

const refFases = [
  {nombre:'Arranque', when:'Día 1 a 5', rango:[1,5], lo:[
    'Complejo de vitaminas: 1 cápsula con el almuerzo',
    'Berberina: solo 1 cápsula al día (tolerancia)',
    'Omega 3: 2 softgels en el almuerzo y 2 en la cena',
  ]},
  {nombre:'Dosis completa', when:'Día 6 a semana 8', rango:[6,56], lo:[
    'Complejo de vitaminas: 1 cápsula con el almuerzo',
    'Berberina: 1 en el almuerzo y 1 en la cena',
    'Omega 3: 2 softgels en el almuerzo y 2 en la cena',
  ]},
  {nombre:'Solo vitaminas', when:'Semana 9 a 12', rango:[57,84], lo:[
    'Complejo de vitaminas: 1 cápsula con el almuerzo',
    'El Omega 3 y la berberina ya cumplieron sus 8 semanas',
  ]},
  {nombre:'Control médico', when:'Semana 12', rango:[85,99999], lo:[
    'Repetir análisis (vitamina D, B12, homocisteína, triglicéridos, insulina)',
    'Ajustar con el médico. Alexia mantiene el complejo diario',
  ]},
];

const notas = {
  'Fase 1':'Estás en el arranque. La berberina va suave (solo 1 al día) para que tu estómago se acostumbre antes de pasar a dos tomas.',
  'Fase 2':'Dosis completa. Toma todo con las comidas principales: el complejo necesita algo de grasa para absorber bien la vitamina D3.',
  'Fase 3':'El Omega 3 y la berberina ya cumplieron sus 8 semanas. Desde acá sigue solo el complejo de vitaminas.',
  'Fase 4':'Toca repetir análisis y ajustar el plan con tu médico. Alexia mantiene el complejo diario, el protocolo lo bajaba a 2 o 3 veces por semana: eso se define en consulta.',
};

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

const RING_CIRC = 339.29;
const DIA_SEMANA = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

// ---------- Sincronizacion entre dispositivos ----------
/* La sincronizacion ya no va a Supabase: el free tier pausaba el proyecto y el
   tablero se quedaba en modo local sin avisar. Ahora escribe contra la API
   propia, en un almacenamiento privado que no se pausa. El formato de claves
   y el merge por ultima escritura son los mismos, asi nada de lo ya marcado
   se pierde en la mudanza. */
const API = '/api';

// La casa del tablero es protocolo.papelito.online. La direccion vieja de
// GitHub Pages sigue viva pero sin API, asi que manda a la nueva.
if(location.hostname.endsWith('github.io')){
  location.replace('https://protocolo.papelito.online/' + location.hash);
}

// Clave del tablero. Llega una vez por el enlace (#k=...) y queda guardada.
function tokenApp(){
  const m = /[#&]k=([^&]+)/.exec(location.hash||'');
  if(m){
    localStorage.setItem('app_token', decodeURIComponent(m[1]));
    history.replaceState(null,'',location.pathname+location.search);
  }
  return localStorage.getItem('app_token') || '';
}
const TOKEN = tokenApp();
const cabeceras = () => Object.assign({'Content-Type':'application/json'}, TOKEN ? {'x-token':TOKEN} : {});
const cloudOn = () => true;

const DKEY = /^\d{4}-\d{2}-\d{2}:/;
const metaLoad = () => { try { return JSON.parse(localStorage.getItem('__sync_meta')||'{}'); } catch(e){ return {}; } };
const metaSave = m => localStorage.setItem('__sync_meta', JSON.stringify(m));

// Marca/desmarca (o guarda un valor, como el peso) + sella la hora + agenda sync
function setMark(key, val){
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

/* ---------------- Render ---------------- */
function render(){
  document.getElementById('fecha').textContent = new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'});
  document.getElementById('dia').textContent = diaPrograma;
  document.getElementById('semana').textContent = semana;

  // Hero = SIEMPRE hoy
  const planHoy = suplDeDia(diaPrograma);
  document.getElementById('faseTag').textContent = planHoy.fase;
  document.getElementById('notaFase').textContent = notas[planHoy.fase];
  const oHoy = obligatorio(diaPrograma);
  const pctHoy = oHoy.total ? Math.round(oHoy.hechos/oHoy.total*100) : 0;
  document.getElementById('ringPct').textContent = pctHoy+'%';
  document.getElementById('ring').style.strokeDashoffset = RING_CIRC*(1-pctHoy/100);

  renderHoy();
  renderPermisos();
  renderSemana();
  renderPeso();
  renderFases();
  renderHeat();
  if(typeof renderNutricion === 'function') renderNutricion();
  if(typeof renderAvisos === 'function') renderAvisos();
}

// Card "Lo importante ahora": suplementos + comidas del dia seleccionado + raciones
function renderHoy(){
  renderDayNav();
  const plan = suplDeDia(selDia);
  const cont = document.getElementById('hoyItems');
  cont.innerHTML = '';

  const todos = [...plan.items, ...COMIDAS];
  ['Desayuno','Almuerzo','Cena'].forEach(c=>{
    const del = todos.filter(i=>i.meal===c);
    if(!del.length) return;
    const wrap = document.createElement('div'); wrap.className='meal';
    wrap.innerHTML = `<div class="meal-h"><span class="meal-ic">${mealIcon(c)}</span><span class="meal-name">${c}</span></div>`;
    // Lo que toca comer segun el menu, antes de los checks de esa comida
    if(typeof bloquePlato === 'function'){
      const plato = bloquePlato(c, comidasDeDia(selDia));
      if(plato) wrap.appendChild(plato);
    }
    del.forEach(it=>{
      const key = `${selDate}:${it.meal}:${it.id}`;
      const on = marcado(key);
      const el = document.createElement('div');
      el.className = 'item'+(on?' on':'');
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
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
        `<div class="info"><div class="name">${it.name}</div><div class="dose">${it.dose}</div></div>`+
        `<div class="pill-dose">${it.tag}</div>`;
      wrap.appendChild(el);
    });
    cont.appendChild(wrap);
  });

  // Raciones que se llenan
  const rw = document.createElement('div'); rw.className='meal';
  rw.innerHTML = `<div class="meal-h"><span class="meal-ic">${IC_DROP}</span><span class="meal-name">A lo largo del día</span></div>`;
  RACIONES.forEach(r=>{
    const cap = r.meta + r.extra;
    const n = racionCount(selDate, r.id, cap);
    if(cap===1){   // una sola unidad no es una racion: es una marca
      const k = `${selDate}:R:${r.id}1`, on = marcado(k);
      const el = document.createElement('div');
      el.className = 'item'+(on?' on':'');
      el.setAttribute('role','button'); el.setAttribute('tabindex','0');
      el.setAttribute('aria-pressed', on?'true':'false');
      const t = ()=>{ setMark(k, on?'0':'1'); render(); };
      el.onclick = t; el.onkeydown = e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); t(); } };
      el.innerHTML = `<div class="check"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>`+
        `<div class="info"><div class="name">${r.name}</div><div class="dose">1 al día</div></div>`;
      rw.appendChild(el); return;
    }
    const box = document.createElement('div');
    box.className = 'fill'+(n>=r.meta?' done':'');
    let units='';
    for(let i=1;i<=cap;i++){
      const on = marcado(`${selDate}:R:${r.id}${i}`);
      units += `<button class="u${on?' on':''}${i>r.meta?' extra':''}" onclick="tapUnit('${r.id}',${i},${cap})" aria-label="${r.name} ${i}">${r.unit}</button>`;
    }
    box.innerHTML =
      `<div class="fill-h"><span class="fill-name">${r.name}</span><span class="fill-num">${n} de ${r.meta}${r.extra?' · '+r.hint:''}</span></div>`+
      `<div class="units">${units}</div>`;
    rw.appendChild(box);
  });
  cont.appendChild(rw);

  const o = obligatorio(selDia);
  document.getElementById('contador').textContent = `${o.hechos} de ${o.total}`;
  document.getElementById('doneMsg').style.display = (o.hechos===o.total && o.total>0) ? 'flex':'none';
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
    const sub = over
      ? `Te pasaste por ${usados-p.tope} · ${p.sub}`
      : (restan>0 ? `Te ${restan===1?'queda':'quedan'} ${restan} · ${p.sub}` : `Ya lo gastaste · ${p.sub}`);

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
        `<div class="peso-big">${ult.kg.toFixed(1)}<small>kg</small></div>`+
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

  const aviso = (esMiercoles && !yaHoy) ? `<div class="peso-sub" style="color:var(--warn);font-weight:700;margin-top:12px">Hoy es miércoles: toca pesarte.</div>` : '';
  const form =
    `<div class="peso-form">`+
      `<input id="pesoInput" type="number" inputmode="decimal" step="0.1" min="30" max="250" placeholder="Peso de hoy en kg" aria-label="Peso de hoy en kilos">`+
      `<button onclick="guardarPeso()">Guardar</button>`+
    `</div>`;
  cont.innerHTML = head + chart + aviso + form;
}
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

  document.getElementById('racha').textContent = fullCount;
  document.getElementById('hsFull').textContent = fullCount;
  document.getElementById('hsAdh').textContent = adh+'%';
  document.getElementById('hsRacha').textContent = streak;
  document.getElementById('totalDias').textContent = `${dueSoFar} de ${PROG_DIAS} días`;

  const semanas = Math.ceil(PROG_DIAS/7);
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

function completarDia(){
  suplDeDia(selDia).items.forEach(it=> setMark(`${selDate}:${it.meal}:${it.id}`,'1'));
  COMIDAS.forEach(it=> setMark(`${selDate}:${it.meal}:${it.id}`,'1'));
  for(let i=1;i<=6;i++) setMark(`${selDate}:R:agua${i}`,'1');
  render();
}
function reiniciar(){
  if(confirm('Esto borra tu progreso en TODOS tus dispositivos. ¿Seguro?')){
    const m = metaLoad(); const now = Date.now();
    Object.keys(localStorage).filter(k=>DKEY.test(k)).forEach(k=>{ localStorage.removeItem(k); m[k]=now; });
    metaSave(m);
    if(cloudOn()) fullSync().finally(()=>location.reload());
    else location.reload();
  }
}
document.getElementById('ver').textContent = 'Versión 8 · ' + HOY;
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
