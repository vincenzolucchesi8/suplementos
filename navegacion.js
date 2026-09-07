/* Secciones y hoja de seleccion.

   El tablero paso de un rollo de 6.500 px a cuatro secciones. No estan
   numeradas porque no son una secuencia: son cuatro modos de uso distintos
   (lo de hoy, la comida, como voy, el plan de fondo).

   La hoja se abre desde abajo, como en cualquier app de celular, y el boton
   de atras del telefono la cierra en vez de sacarte del tablero. */

const SECCIONES = ['hoy', 'comidas', 'progreso', 'plan'];
const TAB_KEY = 'seccion';

/* ---------------------------------------------------------------------------
   La cabecera contesta a la seccion

   Antes decia lo mismo en las cuatro: la mitad de arriba de la pantalla no se
   enteraba de que habias cambiado de pestana, y por eso la app se sentia
   animada solo abajo. En la referencia el titulo grande ES la seccion, y se
   enciende con el mismo reloj que el indicador.

   La regla del par: el titulo dice DONDE estas, el rotulo de encima dice el
   DATO que lo situa. Asi el titulo no es una etiqueta repetida de la pestana,
   es la cabeza de un par que informa.
   --------------------------------------------------------------------------- */
const TOTAL_DIAS = (() => {
  try {
    const fs = (PLAN.fases || []).filter(f => f.hasta < 9999);
    return fs.length ? fs[fs.length - 1].hasta : 84;
  } catch (e) { return 84; }
})();

const mayus = t => t.charAt(0).toUpperCase() + t.slice(1);

const CABECERAS = {
  hoy: () => {
    const d = new Date();
    return { rot: mayus(d.toLocaleDateString('es-PE', { weekday: 'long' })),
             h1:  d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' }) };
  },
  comidas: () => {
    let rot = 'Cuatro semanas de menú';
    try {
      const c = comidasDeDia(diaPrograma);
      const plato = c && c.almuerzo && (c.almuerzo.corto || c.almuerzo.titulo);
      if (plato) rot = (antesDeEmpezar ? 'Día 1: ' : 'Hoy: ') + plato;
    } catch (e) {}
    return { rot, h1: 'Comidas' };
  },
  progreso: () => ({
    rot: antesDeEmpezar ? 'Todavía no arranca' : `Día ${diaPrograma} de ${TOTAL_DIAS}`,
    h1: 'Progreso' }),
  plan: () => {
    let rot = `${TOTAL_DIAS} días`;
    try { rot = 'Fase ' + suplDeDia(diaPrograma).fase.toLowerCase(); } catch (e) {}
    return { rot, h1: 'El plan' };
  },
};

let seccionActual = localStorage.getItem(TAB_KEY) || 'hoy';

function pintarCabecera(animar) {
  const top = document.querySelector('.top');
  const rot = document.getElementById('diaSemana');
  const h1 = document.getElementById('fecha');
  if (!top || !rot || !h1) return;
  let d;
  try { d = (CABECERAS[seccionActual] || CABECERAS.hoy)(); } catch (e) { d = CABECERAS.hoy(); }
  const igual = rot.textContent === d.rot && h1.textContent === d.h1;
  rot.textContent = d.rot;
  h1.textContent = d.h1;
  // sin cambio de texto no hay nada que encender: render() pasa por aca en
  // cada marcado y no puede reanimar la cabecera entera cada vez
  if (igual || !animar || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  top.classList.remove('cambia');
  void top.offsetWidth;
  top.classList.add('cambia');
  clearTimeout(top._cab);
  top._cab = setTimeout(() => top.classList.remove('cambia'), 800);
}

function irASeccion(nombre, opciones) {
  if (!SECCIONES.includes(nombre)) nombre = 'hoy';

  const saliendo = document.querySelector('.panel:not([hidden])');
  const destino = document.getElementById('panel-' + nombre);
  const menos = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* La pestana y la burbuja cambian AL INSTANTE, siempre. El acuse de recibo no
     puede esperar a una animacion: eso es lo que hace que una app se sienta
     lenta aunque dure poco. */
  SECCIONES.forEach(s => {
    const tab = document.getElementById('tab-' + s);
    if (!tab) return;
    const activo = s === nombre;
    tab.classList.toggle('on', activo);
    tab.setAttribute('aria-selected', activo ? 'true' : 'false');
    tab.setAttribute('tabindex', activo ? '0' : '-1');
  });
  localStorage.setItem(TAB_KEY, nombre);
  seccionActual = nombre;
  /* La cabecera y la burbuja arrancan en el MISMO instante y con el mismo
     reloj: es lo que hace que el cambio se lea como un gesto y no como una
     cadena de animaciones encadenadas. */
  pintarCabecera(true);
  if (typeof saltarChip === 'function') saltarChip(SECCIONES.indexOf(nombre));

  const mostrar = () => {
    SECCIONES.forEach(s => {
      const panel = document.getElementById('panel-' + s);
      if (panel) { panel.hidden = s !== nombre; panel.classList.remove('se-va'); }
    });
    entradaEscalonada(destino);
    if (!opciones || opciones.scroll !== false) window.scrollTo({ top: 0, behavior: 'auto' });
    // La lista de compras se pinta al entrar, no antes: es la vista mas cara
    if (nombre === 'comidas' && typeof renderNutricion === 'function') renderNutricion();
    // La cascada va DESPUES de pintar: si corre antes, las celdas del mes
    // todavia no existen y nacen sin retraso, o sea todas a la vez.
    if (typeof escalonar === 'function') escalonar(destino, 40);
  };

  /* La seccion que se va se retira antes de que entre la nueva; sin esto el
     cambio es un corte seco. Si se toca otra pestana antes de que termine, el
     temporizador se reemplaza y manda la ultima: nunca quedan dos abiertas. */
  if (saliendo && destino && saliendo !== destino && !menos) {
    saliendo.classList.add('se-va');
    clearTimeout(irASeccion._t);
    irASeccion._t = setTimeout(mostrar, 90);
  } else {
    clearTimeout(irASeccion._t);
    if (saliendo) saliendo.classList.remove('se-va');
    mostrar();
  }
}

function montarSecciones() {
  document.querySelectorAll('.tab').forEach(t => {
    t.setAttribute('role', 'tab');
    t.onclick = () => irASeccion(t.dataset.tab);
    t.onkeydown = e => {
      const i = SECCIONES.indexOf(t.dataset.tab);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const n = (i + (e.key === 'ArrowRight' ? 1 : SECCIONES.length - 1)) % SECCIONES.length;
        irASeccion(SECCIONES[n]);
        document.getElementById('tab-' + SECCIONES[n]).focus();
      }
    };
  });
  irASeccion(localStorage.getItem(TAB_KEY) || 'hoy', { scroll: false });
}

/* Entrada escalonada de las cards al abrir una seccion. La clase la pone el JS
   y sin ella el contenido ya se ve, asi que nada depende de que el JS corra.
   Con "menos movimiento" el kill de estilos.css pone el retraso en cero. */
function entradaEscalonada(panel) {
  if (!panel) return;
  panel.classList.remove('entra');
  [...panel.children].forEach((c, i) => c.style.setProperty('--retraso', (i * 55) + 'ms'));
  void panel.offsetWidth;                 // reinicia la animacion
  panel.classList.add('entra');
  clearTimeout(panel._limpia);
  panel._limpia = setTimeout(() => panel.classList.remove('entra'), 1400);
}

/* ---------------- Hoja ---------------- */
let hojaPila = [];   // permite volver de "elegir plato" al dia sin cerrar

function pintarHoja() {
  const paso = hojaPila[hojaPila.length - 1];
  if (!paso) return;
  document.getElementById('sheetTitulo').textContent = paso.titulo;
  document.getElementById('sheetAtras').hidden = hojaPila.length < 2;
  const body = document.getElementById('sheetBody');
  body.innerHTML = '';
  paso.pintar(body);
  body.scrollTop = 0;
  // el contenido de la hoja entra como una secuencia, no de golpe
  if (typeof escalonar === 'function') escalonar(body, 60);
}

function abrirHoja(titulo, pintar) {
  const nueva = !hojaPila.length;
  hojaPila.push({ titulo, pintar });
  document.getElementById('sheet').hidden = false;
  document.getElementById('sheetBg').hidden = false;
  document.body.style.overflow = 'hidden';
  pintarHoja();
  if (nueva) history.pushState({ hoja: true }, '');
  document.getElementById('sheetX').focus();
}

function volverHoja() {
  if (hojaPila.length > 1) { hojaPila.pop(); pintarHoja(); }
  else cerrarHoja();
}

function cerrarHoja(porHistorial) {
  if (!hojaPila.length) return;
  hojaPila = [];
  document.getElementById('sheet').hidden = true;
  document.getElementById('sheetBg').hidden = true;
  document.body.style.overflow = '';
  if (!porHistorial && history.state && history.state.hoja) history.back();
}

window.addEventListener('popstate', () => { if (hojaPila.length) cerrarHoja(true); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && hojaPila.length) cerrarHoja(); });

document.getElementById('sheetX').onclick = () => cerrarHoja();
document.getElementById('sheetAtras').onclick = () => volverHoja();
document.getElementById('sheetBg').onclick = () => cerrarHoja();

montarSecciones();
