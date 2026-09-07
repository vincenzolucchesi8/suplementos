/* Secciones y hoja de seleccion.

   El tablero paso de un rollo de 6.500 px a cuatro secciones. No estan
   numeradas porque no son una secuencia: son cuatro modos de uso distintos
   (lo de hoy, la comida, como voy, el plan de fondo).

   La hoja se abre desde abajo, como en cualquier app de celular, y el boton
   de atras del telefono la cierra en vez de sacarte del tablero. */

const SECCIONES = ['hoy', 'comidas', 'progreso', 'plan'];
const TAB_KEY = 'seccion';

function irASeccion(nombre, opciones) {
  if (!SECCIONES.includes(nombre)) nombre = 'hoy';
  SECCIONES.forEach(s => {
    const panel = document.getElementById('panel-' + s);
    const tab = document.getElementById('tab-' + s);
    if (!panel || !tab) return;
    const activo = s === nombre;
    panel.hidden = !activo;
    tab.classList.toggle('on', activo);
    tab.setAttribute('aria-selected', activo ? 'true' : 'false');
    tab.setAttribute('tabindex', activo ? '0' : '-1');
  });
  localStorage.setItem(TAB_KEY, nombre);
  // el metaball de la barra viaja a la pestana nueva (movimiento.js)
  if (typeof saltarChip === 'function') saltarChip(SECCIONES.indexOf(nombre));
  entradaEscalonada(document.getElementById('panel-' + nombre));
  if (!opciones || opciones.scroll !== false) window.scrollTo({ top: 0, behavior: 'auto' });
  // La lista de compras se pinta al entrar, no antes: es la vista mas cara
  if (nombre === 'comidas' && typeof renderNutricion === 'function') renderNutricion();
  // La cascada va DESPUES de pintar: si corre antes, las celdas del mes todavia
  // no existen y nacen sin retraso, o sea todas a la vez.
  if (typeof escalonar === 'function') escalonar(document.getElementById('panel-' + nombre), 90);
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
