/* =============================================================================
   La cuarta gramatica: LA PROPUESTA.
   Las tres que ya tenia el tablero son "se marca", "se llena" y "se gasta".
   El menu es otra cosa: algo que el plan ya decidio y que vos aceptas o cambias.
   De ahi que no lleve checkbox propio (la comida ya tiene el suyo) sino el
   disco del metodo del plato, que es literalmente como Alexia lo dibuja en las
   paginas 6 y 9 de su plan. Su ausencia informa: el desayuno y la cena de
   omelette no siguen el metodo del plato, y por eso no llevan disco.
   ============================================================================= */

let MENU = null;

const valorDe = k => localStorage.getItem(k);
const ID_COMIDA = { Desayuno: 'm1', Almuerzo: 'm2', Cena: 'm3' };
const LETRA = { Desayuno: 'D', Almuerzo: 'A', Cena: 'C' };

function cargarMenu() {
  return fetch('menu/menu.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then(m => {
      MENU = m;
      // menu.json se genero con las reglas de fabrica. Si el plan guardado tiene
      // otras, se rearma aca mismo: el generador tambien corre en el navegador.
      if (typeof PlanLib !== 'undefined' && !PlanLib.mismasReglas(PlanLib.reglasDeMenu(PLAN), m.reglas)) {
        rearmarMenu();
      }
      render();
    })
    .catch(() => { /* sin menu el tablero funciona igual, solo sin platos */ });
}

/* Rearma las 4 semanas con las reglas del plan. Los topes de variedad se
   acomodan a las reglas: con un minimo de pescado alto, el tope viejo dejaria
   el problema sin solucion. */
function rearmarMenu() {
  if (!MENU || !MENU.catalogo || typeof Generador === 'undefined') return { ok: false };
  const R = PlanLib.reglasDeMenu(PLAN);
  const V = {
    almuerzo: { pollo: 3, pescado: Math.max(3, R.pescadoMax), atun: 1, carne: Math.max(2, R.carneMax) },
    cena: { pollo: 3, pescado: Math.max(2, R.pescadoMax - 1), carne: Math.max(2, R.carneMax), huevos: 3 },
    omeletteMin: 1, huevoDesMin: 1,
  };
  try {
    MENU.dias = Generador.generar(MENU.catalogo, R, V, MENU.semilla || 20260906);
    MENU.reglas = R;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/* La resolucion del dia vive en menu-lib.js porque tambien la usa el servidor
   al armar el texto de cada aviso. */
function menuBase(dia) { return MENU ? MenuLib.menuBase(MENU, dia) : null; }

function comidasDeDia(dia) {
  if (!MENU) return null;
  const ds = dsDiaG(dia);
  return MenuLib.resolverDia(MENU, dia, c => parseInt(valorDe(`${ds}:MO:${c}`) || '0', 10) || 0);
}

/* ---------- El disco del metodo del plato ----------
   Verduras un tercio siempre. En la cena el carbohidrato baja de porcion
   (tres cuartos de taza contra una taza), y el disco lo muestra. */
function platoSVG(tipo) {
  const partes = tipo === 'cena'
    ? [['var(--pl-verd)', 120], ['var(--pl-prot)', 140], ['var(--pl-carb)', 100]]
    : [['var(--pl-verd)', 120], ['var(--pl-prot)', 120], ['var(--pl-carb)', 120]];
  const cx = 21, cy = 21, r = 18;
  let ang = -90, d = '';
  partes.forEach(([color, deg]) => {
    const a1 = ang * Math.PI / 180, a2 = (ang + deg) * Math.PI / 180;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = deg > 180 ? 1 : 0;
    d += `<path d="M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${color}" stroke="#fff" stroke-width="1.6"/>`;
    ang += deg;
  });
  return `<svg viewBox="0 0 42 42" aria-hidden="true">${d}<circle cx="21" cy="21" r="19.2" fill="none" stroke="#fff" stroke-width="1.6"/></svg>`;
}

/* Que ilustracion le toca a cada plato. Se agrupa por FAMILIA, no por
   preparacion: bonito, trucha y jurel comparten la de pescado, porque doce
   ilustraciones que se leen bien valen mas que cuarenta genericas. */
const IMG_DESAYUNO = [
  [/omelette/i, 'omelette'], [/revuelt/i, 'revueltos'], [/wrap/i, 'wrap'],
  [/batido/i, 'batido'], [/bowl|yogurt/i, 'bowl'],
];
function familiaDe(m, comida) {
  if (!m) return null;
  if (comida === 'Desayuno') {
    const t = m.titulo || '';
    const par = IMG_DESAYUNO.find(([re]) => re.test(t));
    return par ? par[1] : 'bowl';
  }
  if (m.tipo === 'omelette') return 'omelette';
  return { pescado: 'pescado', atun: 'atun', carne: 'carne', pollo: 'pollo' }[m.protK] || 'pollo';
}
const imagenDe = (m, comida) => {
  const f = familiaDe(m, comida);
  return f ? `img/${f}.webp` : null;
};

/* De la palabra del ingrediente a su ilustracion. Se busca por raiz porque el
   menu escribe "Frejol canario" o "Rúcula, tomate cherry y pepino": el primero
   que matchea manda, asi que el orden importa (menestra antes que frejol no,
   porque frejol es mas especifico). */
const IMG_PARTE = [
  [/aceituna/i, 'aceitunas'], [/palta|aguacate/i, 'palta'], [/brocoli|brócoli/i, 'brocoli'],
  [/esparrago|espárrago/i, 'esparragos'], [/espinaca/i, 'espinaca'], [/tomate/i, 'tomate'],
  [/frejol|frijol|lenteja|garbanzo|pallar/i, 'frejol'], [/menestra/i, 'menestras'],
  [/quinoa|quinua/i, 'quinoa'], [/camote/i, 'camote'], [/papa|ñoqui|noqui/i, 'papa'],
  [/ensalada|rucula|rúcula|lechuga|verdura|pepino|zapallito|verde/i, 'ensalada'],
];
const imagenParte = t => { const p = IMG_PARTE.find(([re]) => re.test(t || '')); return p ? `img/${p[1]}.webp` : null; };

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Bloque de propuesta que se inserta arriba de los checks de cada comida */
function bloquePlato(comida, c) {
  if (!c) return null;
  const m = comida === 'Desayuno' ? c.desayuno : comida === 'Almuerzo' ? c.almuerzo : c.cena;
  const conDisco = m.tipo === 'plato';
  const el = document.createElement('div');
  el.className = 'dish' + (m.cambiado ? ' swapped' : '');

  const parte = (txt, cls) => {
    const img = imagenParte(txt);
    return `<span class="dish-part ${cls}" title="${esc(txt)}">` +
      `<i${img ? ` style="background-image:url(${img})"` : ''}></i>` +
      `<span>${esc(txt)}</span></span>`;
  };
  const partes = conDisco
    ? `<div class="dish-parts">${parte(m.verdura, 'verd')}${parte(m.carbo, 'carb')}</div>`
    : '';
  const sub = conDisco
    ? (comida === 'Cena' ? '<div class="dish-sub">Sin grasa extra: basta el aceite de oliva de las verduras</div>' : (m.grasa ? `<div class="dish-sub">Con ${esc(m.grasa.toLowerCase())}</div>` : ''))
    : (m.detalle ? `<div class="dish-sub">${esc(m.detalle)}</div>` : '');

  const img = imagenDe(m, comida);
  el.innerHTML =
    (img ? `<img class="dish-img" src="${img}" alt="" loading="lazy">` : '') +
    `<div class="dish-body">
       <div class="dish-top">
         <button class="dish-swap" type="button"><svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>Cambiar el plato</button>
       </div>
       ${sub}${partes}
       ${m.cambiado ? '<span class="dish-tag">Cambiado por ti</span>' : ''}
     </div>`;

  el.querySelector('.dish-swap').onclick = () => abrirHojaOpciones(selDia, comida);
  return el;
}

/* ---------- Las frecuencias de la semana se llenan solas ----------
   Antes habia que acordarse de subir el contador de pescado a mano. Ahora sale
   de lo que el menu dice que comiste, que es la unica fuente honesta. */
/* Que frecuencias semanales aporta el MENU de un dia, segun lo que marcaste.
   Devuelve el mismo objeto que se escribe en el almacenamiento, para que la
   card "Esta semana" pueda decir cuanto sale del menu y cuanto sumaste tu. */
function derivadoDeDia(dia) {
  const c = comidasDeDia(dia);
  if (!c) return null;
  const ds = dsDiaG(dia);
  const comido = comida => marcado(`${ds}:${comida}:${ID_COMIDA[comida]}`);
  const alm = comido('Almuerzo'), cen = comido('Cena');
  return {
    pesc: (alm && (c.almuerzo.protK === 'pescado' || c.almuerzo.protK === 'atun')) ||
      (cen && c.cena.protK === 'pescado'),
    menes: (alm && (c.almuerzo.carboK === 'menestras' || c.almuerzo.carboK === 'quinoa')) ||
      (cen && c.cena.carboK === 'quinoa'),
    roja: (alm && c.almuerzo.protK === 'carne') || (cen && c.cena.protK === 'carne'),
  };
}

function sincronizarFrecuencias(dia) {
  const derivado = derivadoDeDia(dia);
  if (!derivado) return;
  const ds = dsDiaG(dia);
  Object.entries(derivado).forEach(([id, on]) => {
    const key = `${ds}:S:${id}1`;
    if (marcado(key) !== !!on) setMark(key, on ? '1' : '0');
  });
}

// El dia del programa que corresponde a una fecha, para poder ir al reves
const diaDeDs = ds => Math.round((Date.parse(ds + 'T00:00:00Z') - Date.parse(INICIO + 'T00:00:00Z')) / 86400000) + 1;

function aporteDelMenuDia(ds, id) {
  const d = derivadoDeDia(diaDeDs(ds));
  return d && d[id] ? 1 : 0;
}

function aporteDelMenu(semana, id) {
  if (typeof diasDeSemana !== 'function') return 0;
  return diasDeSemana(semana).reduce((n, ds) => n + aporteDelMenuDia(ds, id), 0);
}

/* ---------- El mes de un vistazo ----------
   Un "mes" son los 28 dias del ciclo del menu, no el mes del calendario: es la
   unidad en la que el plan realmente se repite. Cada celda lleva dos filetes,
   almuerzo y cena, con el color de la proteina. De un golpe se ve si hay tres
   dias de carne seguidos o una semana entera sin pescado. */
const COLOR_PROT = {
  pescado: '#5A8AAE', atun: '#5A8AAE', carne: '#A24266',
  pollo: '#C08A3E', huevos: '#D9A441',
};
let mesBase = null;   // primer dia del bloque de 28 que se esta mirando

const bloqueDe = dia => Math.floor((dia - 1) / 28) * 28 + 1;

function irMes(delta) {
  mesBase = Math.max(1, (mesBase || bloqueDe(selDia)) + delta * 28);
  renderMes();
}

function renderMes() {
  const nav = document.getElementById('mesNav');
  const grid = document.getElementById('mesGrid');
  if (!grid) return;
  if (!MENU) { grid.innerHTML = '<p class="dish-sub">Cargando el menú…</p>'; return; }

  const base = mesBase || (mesBase = bloqueDe(selDia));
  const fin = base + 27;
  const rango = document.getElementById('mesRange');
  if (rango) {
    const f = n => dsDiaG(n).slice(8) + '/' + dsDiaG(n).slice(5, 7);
    rango.textContent = `${f(base)} al ${f(fin)}`;
  }

  if (nav) {
    nav.className = 'daynav mesnav';
    nav.innerHTML =
      `<button class="dnav-btn" ${base <= 1 ? 'disabled' : ''} aria-label="Mes anterior">&#8249;</button>` +
      `<span class="dnav-lbl">Días ${base} al ${fin} del programa</span>` +
      `<button class="dnav-btn" aria-label="Mes siguiente">&#8250;</button>`;
    const bs = nav.querySelectorAll('.dnav-btn');
    bs[0].onclick = () => irMes(-1);
    bs[1].onclick = () => irMes(1);
  }

  // Las semanas del programa son de 7 dias corridos, asi que cada columna cae
  // siempre en el mismo dia de la semana
  const dowIni = new Date(Date.parse(dsDiaG(base) + 'T00:00:00Z')).getUTCDay();
  let html = '<div class="mes-grid">';
  for (let i = 0; i < 7; i++) html += `<div class="mes-dow">${DOW_CORTO[(dowIni + i) % 7]}</div>`;
  html += '</div><div class="mes-grid" id="mesCeldas">';
  for (let n = base; n <= fin; n++) {
    const c = comidasDeDia(n);
    const ds = dsDiaG(n);
    const dia = new Date(Date.parse(ds + 'T00:00:00Z')).getUTCDate();
    const cls = (ds === HOY ? ' hoy' : '') + (n > diaPrograma ? ' futuro' : '') +
      (Math.ceil(n / 7) === selSemana() ? ' sem' : '');
    const fam = c ? familiaDe(c.almuerzo, 'Almuerzo') : null;
    const barra = c ? `<i style="background:${COLOR_PROT[c.cena.protK] || 'var(--g2)'}"></i>` : '';
    const que = c ? `${c.almuerzo.corto || c.almuerzo.titulo}, y de cena ${(c.cena.corto || c.cena.titulo).toLowerCase()}` : '';
    html += `<button type="button" class="mes-cell${cls}${fam ? ' f-' + fam : ''}" data-dia="${n}" ` +
      `aria-label="Día ${n}: ${que}">` +
      `<b>${dia}</b><span class="barras">${barra}</span></button>`;
  }
  /* La celda lleva DOS codigos de color: el fondo es la proteina del almuerzo y
     la barra de abajo la de la cena. Estaba sin decir en ningun lado, asi que
     se leia como un color doble sin sentido. */
  html += '</div>' +
    `<div class="mes-leyenda">
       <span><i style="background:${COLOR_PROT.pescado}"></i>Pescado</span>
       <span><i style="background:${COLOR_PROT.pollo}"></i>Pollo</span>
       <span><i style="background:${COLOR_PROT.carne}"></i>Carne</span>
       <span><i style="background:${COLOR_PROT.huevos}"></i>Huevos</span>
     </div>
     <p class="mes-clave">El fondo del día es el almuerzo; la barra de abajo, la cena.</p>`;
  grid.innerHTML = html;
  grid.querySelectorAll('.mes-cell').forEach(b => {
    b.onclick = () => abrirHojaDia(parseInt(b.dataset.dia, 10));
  });
}

/* ---------- Calendario de la semana ---------- */
const DOW_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function renderCalendario() {
  const cont = document.getElementById('calBody');
  if (!cont) return;
  if (!MENU) { cont.innerHTML = '<p class="dish-sub">Cargando el menú…</p>'; return; }
  cont.innerHTML = '';

  const w = selSemana();
  const rango = document.getElementById('calRange');
  const d1 = dsDiaG((w - 1) * 7 + 1), d7 = dsDiaG(w * 7);
  if (rango) rango.textContent = `Semana ${w} · ${d1.slice(8)}/${d1.slice(5, 7)} al ${d7.slice(8)}/${d7.slice(5, 7)}`;

  for (let n = (w - 1) * 7 + 1; n <= w * 7; n++) {
    const c = comidasDeDia(n);
    if (!c) continue;
    const ds = dsDiaG(n);
    const fecha = new Date(Date.parse(ds + 'T00:00:00Z'));
    const futuro = n > diaPrograma;

    const marcas = [];
    if (c.almuerzo.protK === 'pescado' || c.almuerzo.protK === 'atun' || c.cena.protK === 'pescado') marcas.push('pesc');
    if (c.almuerzo.carboK === 'menestras' || c.almuerzo.carboK === 'quinoa' || c.cena.carboK === 'quinoa') marcas.push('menes');
    if (c.almuerzo.protK === 'carne' || c.cena.protK === 'carne') marcas.push('roja');

    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cal-row' + (ds === HOY ? ' hoy' : '') + (futuro ? ' futuro' : '');
    const imgSem = imagenDe(c.almuerzo, 'Almuerzo');
    b.innerHTML =
      `<div class="cal-day"><b>${fecha.getUTCDate()}</b><span>${DOW_CORTO[fecha.getUTCDay()]}</span></div>
       ${imgSem ? `<img class="cal-img" src="${imgSem}" alt="" loading="lazy">` : ''}
       <div class="cal-info">
         <div class="cal-main">${esc(c.almuerzo.corto || c.almuerzo.titulo)}</div>
         <div class="cal-sub">Cena: ${esc(c.cena.corto || c.cena.titulo)}</div>
       </div>
       <div class="cal-marks">${marcas.map(m => `<i class="${m}"></i>`).join('')}</div>`;
    b.onclick = () => abrirHojaDia(n);
    cont.appendChild(b);
  }
}


/* ============================================================================
   Elegir los platos de la semana.
   Las opciones no se listan aparte: se derivan probando los cambios posibles,
   asi lo que se ofrece es exactamente lo que el tablero puede resolver y nunca
   aparece una opcion que romperia la regla de una sola toma de huevo al dia.
   ============================================================================ */
const CLAVE_DE = { Desayuno: 'D', Almuerzo: 'A', Cena: 'C' };
const platoDe = (c, comida) => comida === 'Desayuno' ? c.desayuno : comida === 'Almuerzo' ? c.almuerzo : c.cena;

function opcionesDe(dia, comida) {
  if (!MENU) return [];
  const ds = dsDiaG(dia);
  const letra = CLAVE_DE[comida];
  const actual = k => parseInt(valorDe(`${ds}:MO:${k}`) || '0', 10) || 0;
  const vistas = new Map();
  for (let n = 0; n < 24; n++) {
    const r = MenuLib.resolverDia(MENU, dia, k => (k === letra ? n : actual(k)));
    if (!r) break;
    const m = platoDe(r, comida);
    if (!vistas.has(m.id)) vistas.set(m.id, { ...m, off: n });
  }
  return [...vistas.values()];
}

function elegirPlato(dia, comida, off) {
  setMark(`${dsDiaG(dia)}:MO:${CLAVE_DE[comida]}`, String(off));
  sincronizarFrecuencias(dia);
  render();
}

// Que proteina se comio el dia anterior: sirve para avisar de una repeticion
function proteinaDeAyer(dia) {
  const a = dia > 1 ? comidasDeDia(dia - 1) : null;
  if (!a) return [];
  return [a.almuerzo.protK, a.cena.protK].filter(Boolean);
}

function filaOpcion(m, comida, seleccionada, ayer, alElegir, conDisco2) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'opt' + (seleccionada ? ' sel' : '');
  b.setAttribute('aria-pressed', seleccionada ? 'true' : 'false');
  const conDisco = m.tipo === 'plato' && conDisco2 !== false;
  const repite = m.protK && ayer.includes(m.protK) && m.protK !== 'huevos';
  b.innerHTML =
    (() => { const img = imagenDe(m, comida);
      return img ? `<img class="opt-plate" src="${img}" alt="" loading="lazy">`
                 : (conDisco ? `<span class="opt-plate">${platoSVG(comida === 'Cena' ? 'cena' : 'almuerzo')}</span>` : ''); })() +
    `<span class="opt-info">
       <span class="opt-name">${esc(m.corto || m.titulo)}</span>
       ${m.tipo === 'plato' ? `<span class="opt-sub">${esc(m.titulo)}</span>` : (m.detalle ? `<span class="opt-sub">${esc(m.detalle)}</span>` : '')}
       ${repite ? '<span class="opt-hint">Ayer comiste lo mismo</span>' : ''}
     </span>
     <span class="opt-tick"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></span>`;
  b.onclick = alElegir;
  return b;
}

function abrirHojaOpciones(dia, comida) {
  const ayer = proteinaDeAyer(dia);
  abrirHoja(`${comida} · ${etiquetaDiaCorto(dia)}`, cont => {
    const c = comidasDeDia(dia);
    const actual = platoDe(c, comida);
    opcionesDe(dia, comida).forEach(m => {
      cont.appendChild(filaOpcion(m, comida, m.id === actual.id, ayer, () => {
        elegirPlato(dia, comida, m.off);
        volverHoja();
      }, false));
    });
    cont.insertAdjacentHTML('beforeend',
      `<div class="sheet-nota"><p>Son las opciones del plan de Alexia. No aparecen las que te dejarían dos tomas de huevo el mismo día.</p></div>`);
  });
}

const etiquetaDiaCorto = dia => {
  const f = new Date(Date.parse(dsDiaG(dia) + 'T00:00:00Z'));
  return f.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', timeZone: 'UTC' });
};
const etiquetaDia = dia => {
  const f = new Date(Date.parse(dsDiaG(dia) + 'T00:00:00Z'));
  const t = f.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function abrirHojaDia(dia) {
  abrirHoja(etiquetaDia(dia), cont => {
    const c = comidasDeDia(dia);
    if (!c) { cont.innerHTML = '<p class="dish-sub">Todavía no cargó el menú.</p>'; return; }
    ['Desayuno', 'Almuerzo', 'Cena'].forEach(comida => {
      const m = platoDe(c, comida);
      const bloque = document.createElement('div');
      bloque.className = 'sheet-meal';
      bloque.innerHTML = `<span>${comida}</span>`;
      bloque.appendChild(filaOpcion(m, comida, true, [], () => abrirHojaOpciones(dia, comida)));
      cont.appendChild(bloque);
    });
    const ver = document.createElement('div');
    ver.className = 'btns';
    ver.style.marginTop = '20px';
    ver.innerHTML = `<button class="btn btn-s" type="button" style="flex:1">Ver este día en Hoy</button>`;
    ver.querySelector('button').onclick = () => { cerrarHoja(); jumpDay(dia); irASeccion('hoy'); };
    cont.appendChild(ver);
    cont.insertAdjacentHTML('beforeend',
      `<div class="sheet-nota"><p>Toca un plato para cambiarlo. Lo que elijas manda en la lista de compras y en el PDF.</p></div>`);
  });
}

/* ---------- Lista de compras de la semana ----------
   El orden es el de caminar un mercado (verduleria, frutas, carnes, lacteos,
   abarrotes), no el orden interno del catalogo. Lo usan la lista de pantalla
   y el PDF: un solo orden, para que no digan cosas distintas. */
const ORDEN_MERCADO = ['verduras', 'frutas', 'proteina', 'lacteos', 'abarrotes'];

const UNIDADES = {
  u: ['u', 'u'], g: ['g', 'g'], lata: ['lata', 'latas'], lon: ['loncha', 'lonchas'],
  cda: ['cda', 'cdas'], cdta: ['cdta', 'cdtas'], taza: ['taza', 'tazas'],
  porc: ['porción', 'porciones'], pun: ['puñado', 'puñados'], troc: ['trocito', 'trocitos'],
  paq: ['paquete', 'paquetes'], vaso: ['vaso', 'vasos'], scoop: ['scoop', 'scoops'], pto: ['punto', 'puntos'],
  kg: ['kg', 'kg'], ml: ['ml', 'ml'], L: ['L', 'L'],
};
const ENTERAS = ['u', 'lata', 'paq', 'lon'];

function comprasDeSemana(w) {
  const total = {};
  for (let n = (w - 1) * 7 + 1; n <= w * 7; n++) {
    const c = comidasDeDia(n);
    if (!c) continue;
    [c.desayuno, c.mediaManana, c.almuerzo, c.merienda, c.cena, c.postre].forEach(m => {
      (m.ing || []).forEach(([clave, cant]) => { total[clave] = (total[clave] || 0) + cant; });
    });
  }
  const porCat = {};
  Object.entries(total).forEach(([clave, cant]) => {
    const it = MENU.items[clave];
    if (!it) return;
    const c = MenuLib.compraDe(MENU.items, clave, cant);
    (porCat[it.cat] = porCat[it.cat] || []).push({ clave, nombre: it.n, q: c.q, u: c.u });
  });
  Object.values(porCat).forEach(a => a.sort((x, y) => x.nombre.localeCompare(y.nombre, 'es')));
  return porCat;
}

function renderCompras() {
  const cont = document.getElementById('buyBody');
  if (!cont || cont.hidden) return;
  if (!MENU) { cont.innerHTML = '<p class="dish-sub">Cargando el menú…</p>'; return; }

  const w = selSemana();
  const semKey = dsDiaG((w - 1) * 7 + 1);
  const porCat = comprasDeSemana(w);
  cont.innerHTML = '';

  let hechos = 0, todos = 0;
  ORDEN_MERCADO.forEach(cat => {
    const titulo = MENU.cats[cat] || cat;
    const lista = porCat[cat];
    if (!lista || !lista.length) return;
    const sec = document.createElement('div');
    sec.className = 'buy-sec';
    const pendientes = lista.filter(x => !marcado(`${semKey}:C:${x.clave}`)).length;
    sec.innerHTML = `<div class="buy-h"><span>${esc(titulo)}</span><em>${pendientes} por comprar</em></div>`;
    lista.forEach(x => {
      todos++;
      const key = `${semKey}:C:${x.clave}`;
      const on = marcado(key);
      if (on) hechos++;
      const par = UNIDADES[x.u] || ['', ''];
      const unidad = x.q === 1 ? par[0] : par[1];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'buy-item' + (on ? ' on' : '');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.innerHTML =
        `<span class="buy-box"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></span>
         <span class="buy-name">${esc(x.nombre)}</span>
         <span class="buy-qty">${x.q} ${esc(unidad)}</span>`;
      b.onclick = () => { setMark(key, on ? '0' : '1'); renderCompras(); actualizarCabeceraCompras(); };
      sec.appendChild(b);
    });
    cont.appendChild(sec);
  });

  if (!todos) cont.innerHTML = '<p class="dish-sub">No hay nada que comprar para esta semana.</p>';
  actualizarCabeceraCompras(hechos, todos);
}

function actualizarCabeceraCompras(hechos, todos) {
  const el = document.getElementById('buyCount');
  if (!el || !MENU) return;
  if (hechos === undefined) {
    const w = selSemana(), semKey = dsDiaG((w - 1) * 7 + 1);
    const porCat = comprasDeSemana(w);
    todos = 0; hechos = 0;
    Object.values(porCat).forEach(l => l.forEach(x => { todos++; if (marcado(`${semKey}:C:${x.clave}`)) hechos++; }));
  }
  el.textContent = todos ? `${hechos} de ${todos}` : '';
}

function toggleCompras() {
  const b = document.getElementById('buyBtn'), body = document.getElementById('buyBody');
  const abierto = b.getAttribute('aria-expanded') === 'true';
  b.setAttribute('aria-expanded', abierto ? 'false' : 'true');
  body.hidden = abierto;
  if (!abierto) {
    renderCompras();
    if (typeof escalonar === 'function') escalonar(body, 60);
    if (typeof desplegar === 'function') desplegar(body);
  }
}

/* Se engancha al render principal del tablero */
function renderNutricion() {
  renderMes();
  renderCalendario();
  montarRangoPDF();
  actualizarCabeceraCompras();
  if (!document.getElementById('buyBody').hidden) renderCompras();
}

cargarMenu();


/* ---------- Para imprimir ----------
   Antes habia cuatro botones de PDF repartidos en dos cajas grises casi
   identicas, dos de ellos con el mismo texto "PDF del mes". El periodo se
   elige UNA vez y despues eliges que papel quieres: dos decisiones cortas en
   vez de cuatro botones que hay que leer. */
let rangoPDF = 'mes';

function montarRangoPDF() {
  const seg = document.getElementById('pdfRango');
  if (seg && !seg.dataset.montado) {
    seg.dataset.montado = '1';
    seg.querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        rangoPDF = b.dataset.r;
        seg.querySelectorAll('button').forEach(o => o.classList.toggle('on', o === b));
        montarRangoPDF();
      };
    });
  }
  const nota = document.getElementById('pdfNota');
  if (nota) {
    const w = selSemana();
    const f = ds => (typeof fechaLarga === 'function') ? fechaLarga(ds) : ds;
    if (rangoPDF === 'mes') {
      const base = (typeof mesBase === 'number' && mesBase) || 1;
      nota.textContent = `Del ${f(dsDiaG(base))} al ${f(dsDiaG(base + 27))}. ` +
        'El menú es para pegarlo en la refri; la lista de compras sale agrupada por sección del mercado.';
    } else {
      nota.textContent = `Del ${f(dsDiaG((w - 1) * 7 + 1))} al ${f(dsDiaG(w * 7))}. ` +
        'El menú es para pegarlo en la refri; la lista de compras sale agrupada por sección del mercado.';
    }
  }
  if (typeof montarBotonesPDF === 'function') montarBotonesPDF();
  if (typeof montarBotonesMenuPDF === 'function') montarBotonesMenuPDF();
}
