/* ============================================================================
   El repaso del día

   El problema que resuelve: la app pedia acordarse de marcar cada cosa en el
   momento y en su sitio -- la comida en el riel, el agua en su barra, el
   permiso en su ficha, como te sentiste al final. Si te olvidabas de una, el
   dia quedaba a medias y no habia forma de saber CUAL faltaba sin recorrer la
   pantalla entera de arriba abajo.

   Aca se invierte: en vez de que tu busques lo que falta, la app te lo
   pregunta. Una cosa por pantalla, solo lo que sigue sin contestar, y con
   salida en cada paso. Lo que ya marcaste durante el dia no se vuelve a
   preguntar: en un dia normal son tres o cuatro preguntas, no quince.
   ============================================================================ */

const CIERRE_KEY = ds => `${ds}:CD`;              // el dia quedo repasado
const cerrado = ds => localStorage.getItem(CIERRE_KEY(ds)) === '1';
const esComidaPrincipal = it => it.id === 'm1' || it.id === 'm2' || it.id === 'm3';
// el verbo de cada comida: "¿Comiste el cena?" no lo dice nadie
const VERBO = { Desayuno: '¿Desayunaste?', Almuerzo: '¿Almorzaste?', Cena: '¿Cenaste?' };

/* Los pasos salen del ESTADO, no de una lista fija: si ya almorzaste y lo
   marcaste, esa pregunta no existe. */
function pasosDelCierre() {
  const pasos = [];
  const plan = suplDeDia(selDia);
  const menu = (typeof comidasDeDia === 'function') ? comidasDeDia(selDia) : null;
  const pend = it => !marcado(`${selDate}:${it.meal}:${it.id}`);

  // 1. una pregunta por comida sin resolver
  ['Desayuno', 'Almuerzo', 'Cena'].forEach(c => {
    if (saltado(selDate, c)) return;
    const item = COMIDAS.find(i => i.meal === c && esComidaPrincipal(i));
    if (!item || !pend(item)) return;
    const m = menu ? (c === 'Desayuno' ? menu.desayuno : c === 'Almuerzo' ? menu.almuerzo : menu.cena) : null;
    pasos.push({ tipo: 'comida', comida: c, item, plato: m });
  });

  // 2. todo lo que acompana: verduras y suplementos que sigan pendientes
  const acompanan = [...plan.items, ...COMIDAS]
    .filter(it => !esComidaPrincipal(it) && !saltado(selDate, it.meal) && pend(it));
  if (acompanan.length) pasos.push({ tipo: 'lista', items: acompanan });

  // 3. lo que corre todo el dia
  const rac = RACIONES.filter(r => racionCount(selDate, r.id, r.meta + (r.extra || 0)) < r.meta);
  if (rac.length) pasos.push({ tipo: 'raciones', rac });

  // 4. los permisos del dia: se preguntan aunque no los hayas gastado, que es
  //    justo lo que nadie registra por su cuenta
  const perm = PERMISOS.filter(p => p.ciclo !== 'semana');
  if (perm.length) pasos.push({ tipo: 'permisos', perm });

  // 5. como te sentiste
  const asp = ((PLAN.sensaciones || {}).aspectos || [])
    .filter(a => !localStorage.getItem(`${selDate}:F:${a.id}`));
  if (asp.length) pasos.push({ tipo: 'animo', asp });

  // 6. el peso, solo el dia que toca (miercoles)
  const esDiaDePeso = new Date(Date.parse(selDate + 'T00:00:00Z')).getUTCDay() === 3;
  if (esDiaDePeso && !localStorage.getItem(`${selDate}:W:kg`)) pasos.push({ tipo: 'peso' });

  return pasos;
}

const faltanEnElDia = () => pasosDelCierre().length;

/* ---------------------------------------------------------------- la hoja */
let cierrePasos = [], cierreI = 0;

function abrirCierre() {
  cierrePasos = pasosDelCierre();
  cierreI = 0;
  abrirHoja('Repaso del día', cont => pintarPasoCierre(cont));
}

function avanzarCierre() {
  cierreI++;
  const cont = document.getElementById('sheetBody');
  if (!cont) return;
  cont.innerHTML = '';
  pintarPasoCierre(cont);
  cont.scrollTop = 0;
  if (typeof escalonar === 'function') escalonar(cont, 20);
}

function pintarPasoCierre(cont) {
  const total = cierrePasos.length;
  if (cierreI >= total) return pintarFinCierre(cont, total);

  const paso = cierrePasos[cierreI];
  const cab = document.createElement('div');
  cab.className = 'cie-cab';
  cab.innerHTML =
    `<div class="cie-barra"><i style="transform:scaleX(${(cierreI / total).toFixed(3)})"></i></div>` +
    `<div class="cie-paso">Pregunta ${cierreI + 1} de ${total}</div>`;
  cont.appendChild(cab);

  const caja = document.createElement('div');
  caja.className = 'cie-caja';
  cont.appendChild(caja);
  const pintores = {
    comida: pasoComida, lista: pasoLista, raciones: pasoRaciones,
    permisos: pasoPermisos, animo: pasoAnimo, peso: pasoPeso,
  };
  pintores[paso.tipo](caja, paso);

  // salida en cada paso: nunca te quedas atrapado en una pregunta
  const salir = document.createElement('button');
  salir.type = 'button';
  salir.className = 'dish-swap cie-salto';
  salir.textContent = 'Saltar esta';
  salir.onclick = avanzarCierre;
  cont.appendChild(salir);
}

function tituloCierre(caja, txt, sub) {
  const h = document.createElement('div');
  h.className = 'cie-pregunta';
  h.innerHTML = `<b>${esc(txt)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`;
  caja.appendChild(h);
}

function botoneraCierre(caja, opciones) {
  const d = document.createElement('div');
  d.className = 'btns cie-btns';
  opciones.forEach(([txt, clase, hacer]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + clase;
    b.textContent = txt;
    b.onclick = () => { hacer(); avanzarCierre(); };
    d.appendChild(b);
  });
  caja.appendChild(d);
}

/* ---- una comida ---- */
function pasoComida(caja, paso) {
  const p = paso.plato;
  const img = (p && typeof imagenDe === 'function') ? imagenDe(p, paso.comida) : null;
  if (img) {
    const i = document.createElement('img');
    i.className = 'cie-img'; i.src = img; i.alt = '';
    caja.appendChild(i);
  }
  tituloCierre(caja, VERBO[paso.comida] || `¿Comiste el ${paso.comida.toLowerCase()}?`,
    p ? (p.corto || p.titulo) : '');
  botoneraCierre(caja, [
    ['Sí, lo comí', 'btn-p', () => setMark(`${selDate}:${paso.item.meal}:${paso.item.id}`, '1')],
    ['No lo comí', 'btn-s', () => setMark(`${selDate}:X:${paso.comida}`, '1')],
  ]);
}

/* ---- verduras y suplementos ---- */
function pasoLista(caja, paso) {
  const soloSupl = paso.items.every(it => it.id !== 'v2' && it.id !== 'v3');
  tituloCierre(caja, soloSupl ? '¿Tomaste los suplementos?' : '¿Y lo que va con las comidas?',
    'Toca lo que sí, o marca todo de una');
  const lista = document.createElement('div');
  lista.className = 'cie-lista';
  const marcados = new Set();
  paso.items.forEach(it => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'item';
    b.innerHTML = '<div class="check"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>' +
      `<div class="info"><span class="name">${esc(it.name)}</span>` +
      `<span class="dose">${esc(it.tag || it.dose || '')}</span></div>`;
    b.onclick = () => {
      const k = `${it.meal}:${it.id}`;
      if (marcados.has(k)) { marcados.delete(k); b.classList.remove('on'); }
      else { marcados.add(k); b.classList.add('on'); }
    };
    lista.appendChild(b);
  });
  caja.appendChild(lista);
  botoneraCierre(caja, [
    ['Todo sí', 'btn-p', () => paso.items.forEach(it => setMark(`${selDate}:${it.meal}:${it.id}`, '1'))],
    ['Solo lo marcado', 'btn-s', () => marcados.forEach(k => setMark(`${selDate}:${k}`, '1'))],
  ]);
}

/* ---- agua, infusion, frutos secos ---- */
function pasoRaciones(caja, paso) {
  tituloCierre(caja, '¿Y el tomatodo?', 'Toca hasta donde llegaste');
  const cont = document.createElement('div');
  paso.rac.forEach(r => {
    const cap = r.meta + (r.extra || 0);
    const fila = document.createElement('div');
    fila.className = 'corrida';
    const pinta = () => {
      const n = racionCount(selDate, r.id, cap);
      const cifra = r.porMarca
        ? `${(n * r.porMarca).toLocaleString('es-PE')} de ${(r.meta * r.porMarca).toLocaleString('es-PE')} ${r.unidad || ''}`.trim()
        : `${n} de ${r.meta}`;
      fila.innerHTML = `<div class="corrida-nom">${esc(r.name)}` +
        (r.hint ? `<small>${esc(r.hint)}</small>` : '') + '</div>' +
        `<span class="corrida-num">${cifra}</span><div class="units"></div>`;
      const u = fila.querySelector('.units');
      for (let i = 1; i <= cap; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'u' + (i <= n ? ' on' : '') + (i > r.meta ? ' extra' : '');
        b.setAttribute('aria-label', `${r.name} ${i}`);
        b.onclick = () => {
          const ahora = racionCount(selDate, r.id, cap);
          const meta = (i === ahora ? i - 1 : i);
          for (let j = 1; j <= cap; j++) setMark(`${selDate}:R:${r.id}${j}`, j <= meta ? '1' : '0');
          pinta();
        };
        u.appendChild(b);
      }
    };
    pinta();
    cont.appendChild(fila);
  });
  caja.appendChild(cont);
  botoneraCierre(caja, [['Listo', 'btn-p', () => {}]]);
}

/* ---- los permisos del dia ---- */
function pasoPermisos(caja, paso) {
  tituloCierre(caja, '¿Te diste algún permiso?', 'Si no, sigue de largo');
  const cont = document.createElement('div');
  paso.perm.forEach(p => {
    const cap = p.tope + 3;
    const fila = document.createElement('div');
    fila.className = 'perm';
    const pinta = () => {
      const n = diaCount(selDate, 'P', p.id, cap);
      fila.innerHTML = `<div class="perm-info"><div class="perm-name">${esc(p.name)}</div>` +
        `<div class="perm-sub">${n ? `${n} hoy` : esc(p.sub)}</div></div><div class="toks"></div>`;
      const t = fila.querySelector('.toks');
      for (let i = 1; i <= p.tope; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tok' + (i <= n ? ' on' : '');
        b.setAttribute('aria-label', `${p.name} ${i}`);
        b.onclick = () => {
          const ahora = diaCount(selDate, 'P', p.id, cap);
          const meta = (i === ahora ? i - 1 : i);
          for (let j = 1; j <= cap; j++) setMark(`${selDate}:P:${p.id}${j}`, j <= meta ? '1' : '0');
          pinta();
        };
        t.appendChild(b);
      }
    };
    pinta();
    cont.appendChild(fila);
  });
  caja.appendChild(cont);
  botoneraCierre(caja, [['Listo', 'btn-p', () => {}]]);
}

/* ---- como te sentiste ---- */
function pasoAnimo(caja, paso) {
  tituloCierre(caja, '¿Cómo te sentiste?', 'Es lo que Alexia mira en la consulta');
  const cont = document.createElement('div');
  paso.asp.forEach(a => {
    const g = document.createElement('div');
    g.className = 'cie-animo';
    g.innerHTML = `<div class="cie-animo-n">${esc(a.name)}</div><div class="seg"></div>`;
    const seg = g.querySelector('.seg');
    a.opciones.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o;
      b.onclick = () => {
        setMark(`${selDate}:F:${a.id}`, String(i + 1));
        seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      };
      seg.appendChild(b);
    });
    cont.appendChild(g);
  });
  caja.appendChild(cont);
  botoneraCierre(caja, [['Listo', 'btn-p', () => {}]]);
}

/* ---- el peso ---- */
function pasoPeso(caja) {
  tituloCierre(caja, '¿Cuánto pesaste?', 'En ayunas, hoy miércoles');
  const inp = document.createElement('input');
  inp.type = 'number'; inp.step = '0.1'; inp.inputMode = 'decimal';
  inp.className = 'cie-peso'; inp.placeholder = 'Peso en kg';
  caja.appendChild(inp);
  botoneraCierre(caja, [['Guardar', 'btn-p', () => {
    const v = parseFloat(String(inp.value).replace(',', '.'));
    if (isFinite(v) && v > 20 && v < 300) setMark(`${selDate}:W:kg`, v.toFixed(1));
  }]]);
}

/* ---- el cierre ----
   Termina con el numero, no con un "listo" seco: lo ultimo que se ve es lo
   que se recuerda, y lo que se quiere recordar es cuanto cerraste. */
function pintarFinCierre(cont, total) {
  setMark(CIERRE_KEY(selDate), '1');
  if (typeof sincronizarFrecuencias === 'function') sincronizarFrecuencias(selDia);
  const o = obligatorio(selDia);
  const pct = o.total ? Math.round(o.hechos / o.total * 100) : 0;
  const fin = document.createElement('div');
  fin.className = 'cie-fin';
  fin.innerHTML =
    `<div class="cie-pct">${pct}<em>%</em></div>` +
    `<b>${total ? 'Día repasado' : 'No quedaba nada pendiente'}</b>` +
    `<p>${o.hechos} de ${o.total} cosas del día. ` +
    (pct === 100 ? 'Cerraste el día completo.' : 'Lo que falta se queda como está: mañana no arrastra nada.') +
    '</p>';
  cont.appendChild(fin);
  const d = document.createElement('div');
  d.className = 'btns';
  d.innerHTML = '<button class="btn btn-p" type="button" style="flex:1">Terminar</button>';
  d.querySelector('button').onclick = () => { cerrarHoja(); render(); };
  cont.appendChild(d);
  if (navigator.vibrate) navigator.vibrate([10, 40, 16]);
}

/* ------------------------------------------------------- la tarjeta de Hoy
   Aparece solo en el dia de hoy y solo cuando queda algo que preguntar. Dice
   CUANTO falta, no que "hay pendientes": la diferencia entre un aviso y una
   accion es saber si son dos cosas o diez. */
/* El estado del repaso vive en la MISMA fila que el porcentaje del dia.

   Antes era una tarjeta verde aparte de 173 px, encima de la primera comida,
   con su propio contador de preguntas: un cuarto numero del mismo dia en la
   misma pantalla. La fila ya dice como vas; el boton solo tiene que decir que
   hacer. */
function renderCierre() {
  const ir = document.getElementById('resIr');
  if (!ir) return;
  if (antesDeEmpezar && selDate !== dsDiaG(1)) { ir.hidden = true; return; }
  ir.hidden = false;
  const listo = cerrado(selDate);
  ir.classList.toggle('hecho', listo);
  ir.innerHTML = (listo ? 'Repasado' : 'Repasar') +
    (listo
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>');
}

/* La ficha del porcentaje abre el repaso, siempre. Es la puerta permanente:
   la tarjeta se va cuando ya repasaste, pero el gesto natural -- tocar el
   numero del dia para ver que le falta -- tiene que seguir llevando ahi. */
(function () {
  const f = document.getElementById('fichaHoy');
  if (!f) return;
  f.addEventListener('click', () => {
    if (antesDeEmpezar && selDate !== dsDiaG(1)) return;
    abrirCierre();
  });
})();
