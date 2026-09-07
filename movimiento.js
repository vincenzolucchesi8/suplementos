/* ============================================================================
   Movimiento

   Seis reglas, y ninguna es de gusto: bajo 250 ms, ease out y nunca linear,
   sin sobrepaso salvo en el momento de deleite, anclado a su disparador,
   respetando "menos movimiento", y solo transform (nunca width, height ni
   left, que relayoutean la pagina en cada cuadro).

   El resorte medido de un reel de navigation tabs -- 6,3 % de sobrepaso, pico
   a los 167 ms, asentado a los ~330, bezier (.48,1.47,.3,.98) con error
   < 0,1 % -- se quedo SOLO en el vuelo de la burbuja y en tres celebraciones.
   Un rebote es simpatico la primera vez y cansa la decima.

   La barra: el indicador es una BURBUJA del color de acento que vive medio
   hundida en el canto, lleva el icono dentro, y al cambiar de seccion sale con
   un cuello liquido, cruza por arriba y se vuelve a hundir en el destino. Dos
   formas planas dentro de un filtro SVG hacen el cuello; el icono va fuera del
   filtro porque lo derretiria.

   Aca solo vive lo que necesita JS: el ancho de pestana (el CSS no puede
   deducirlo como longitud), el cruce de los dos iconos, y los numeros que
   cuentan. Todo lo demas es CSS.

   Regla: si el JS no corre, la app se ve igual. Nada aca esconde contenido.
   ============================================================================ */

(function () {
  // OJO: el div NO se puede llamar 'goo' porque el <filter id="goo"> ya usa ese
  // id; getElementById devolvia el filtro y la barra nunca se media.
  const goo = document.getElementById('gooCapa');
  const pill = document.getElementById('tabsPill');
  const ico = document.getElementById('burbujaIco');
  if (!goo || !pill || !ico) return;

  const nav = document.querySelector('.tabs');
  const tabs = [...pill.querySelectorAll('.tab')];
  const menos = matchMedia('(prefers-reduced-motion: reduce)');

  /* El ancho de pestana es el unico numero que el CSS no puede deducir solo:
     las animaciones lo necesitan como longitud, no como fraccion. */
  const medir = () => {
    const w = pill.clientWidth / tabs.length + 'px';
    goo.style.setProperty('--anchoTab', w);
    ico.style.setProperty('--anchoTab', w);
  };
  medir();
  addEventListener('resize', medir);
  addEventListener('orientationchange', () => setTimeout(medir, 120));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);

  const svgDe = n => tabs[n].querySelector('svg').outerHTML;
  const pon = (k, v) => { goo.style.setProperty(k, v); ico.style.setProperty(k, v); };

  let actual = Math.max(0, tabs.findIndex(t => t.classList.contains('on')));
  pon('--i', actual);
  ico.innerHTML = `<span class="ico-y"><span>${svgDe(actual)}</span></span>`;

  /* Salta la burbuja a la pestana n. La llama navegacion.js DESPUES de cambiar
     de seccion, asi que la pantalla ya cambio: la burbuja es el acuse de
     recibo, no la espera. */
  window.saltarChip = function (n) {
    if (n < 0 || n === actual) { if (n >= 0) pon('--i', n); return; }
    pon('--de', actual);
    pon('--a', n);
    pon('--i', n);

    if (menos.matches) {
      ico.innerHTML = `<span class="ico-y"><span>${svgDe(n)}</span></span>`;
      actual = n;
      return;
    }
    // los dos iconos conviven y se cruzan con el mismo reloj que la burbuja:
    // reemplazar el DOM a mitad de vuelo reinicia la animacion y el icono del
    // destino aparecería en el origen
    ico.innerHTML = `<span class="ico-y"><span class="sale">${svgDe(actual)}</span>` +
      `<span class="entra">${svgDe(n)}</span></span>`;
    nav.classList.remove('saltando');
    void nav.offsetWidth;                        // reinicia la animacion
    nav.classList.add('saltando');
    // La clase se QUITA al terminar. Si se queda, el filtro sigue encendido y
    // deja un halo verde sucio alrededor del circulo en reposo (ademas de una
    // capa compuesta de mas en cada scroll).
    clearTimeout(nav._salto);
    nav._salto = setTimeout(() => {
      nav.classList.remove('saltando');
      // el icono que salio queda invisible pero vivo en el DOM: se limpia, o
      // se acumula un nodo muerto por cada cambio de seccion
      ico.innerHTML = `<span class="ico-y"><span>${svgDe(n)}</span></span>`;
    }, 520);
    actual = n;
  };
})();

/* ---------------------------------------------------------------------------
   Cascadas de entrada

   Una seccion que aparece entera de golpe se lee como un salto; entrando por
   partes se lee como que se esta armando. Solo corre al ENTRAR a una seccion o
   al cambiar de dia, nunca en cada marcado: si cada toque reanimara la pantalla
   entera seria insoportable.

   La clase la pone el JS y se quita sola: sin JS todo se ve igual, y si una
   animacion no llegara a arrancar nada queda invisible.
   --------------------------------------------------------------------------- */
const CASCADAS = [
  ['.dia .tramo', 34],          // el riel del dia, tramo por tramo
  ['.corrida', 24],
  ['.mes-cell', 5],             // las 28 celdas del mes, en diagonal
  ['.cal-row', 18],
  ['.dias i', 10],              // la tira de la racha, dia por dia
  ['.wk', 26],
  ['.sien', 26],
  ['.tl-item', 30],             // las fases del plan
  ['.avi-row', 18],
  ['.frec', 26],
  ['.ficha', 34],
  ['.opt', 18],                 // las opciones de plato, en la hoja
  ['.buy-item', 8],             // la lista de compras
  ['.rec', 26],
  ['.dish-part', 30],
  ['.cell', 3],                 // el mapa de constancia
  ['.perm', 24],                // los permisos del dia
];

/* Techo del escalonado. Una entrada tiene que estar terminada antes de los
   250 ms; con --paso en 210, al ultimo elemento le quedan 150 de retraso y
   ni uno mas. Sin techo, la lista de compras (30 filas) estiraba la entrada
   mas alla del segundo y dejaba de ser UN gesto. Pasado el techo, lo que
   falta entra junto. */
const TECHO_CASCADA = 150;

/* Reparte los retrasos sin tocar el layout. Se separo del disparo porque al
   entrar a una seccion corrian DOS reflujos sincronos seguidos sobre un panel
   de dos mil pixeles (uno aca y otro en entradaEscalonada), y con la CPU
   estrangulada 6x eso era el cuadro de 262 ms del cambio de seccion. */
function marcarRetrasos(raiz, base) {
  if (!raiz || matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  CASCADAS.forEach(([sel, paso]) => {
    raiz.querySelectorAll(sel).forEach((el, i) => {
      const d = Math.min((base || 0) + i * paso, (base || 0) + TECHO_CASCADA);
      el.style.setProperty('--retraso', d + 'ms');
    });
  });
  return true;
}

function escalonar(raiz, base, sinReflujo) {
  if (!marcarRetrasos(raiz, base)) return;
  raiz.classList.remove('cae');
  if (!sinReflujo) void raiz.offsetWidth;      // reinicia las animaciones
  raiz.classList.add('cae');
  clearTimeout(raiz._cae);
  // rescate: si algo no llegara a animarse, no puede quedarse invisible
  raiz._cae = setTimeout(() => raiz.classList.remove('cae'), 1200);
}

/* Despliega un bloque que acaba de dejar de estar hidden.

   El alto SALTA en un cuadro y lo que se anima es el contenido. Antes se media
   el scrollHeight y se animaba max-height: eso relayoutea la pagina entera en
   cada cuadro (la regla es "nunca animes width, height ni left") y obligaba a
   renunciar a la animacion cuando el bloque no cabia en la pantalla, que es
   justo el caso de la lista de compras. Sin medir nada, funciona con
   cualquier tamano. */
function desplegar(el) {
  if (!el || el.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.classList.remove('abriendo');
  void el.offsetWidth;
  el.classList.add('abriendo');
  clearTimeout(el._abre);
  el._abre = setTimeout(() => el.classList.remove('abriendo'), 260);
}

/* ---------------------------------------------------------------------------
   Numeros que cuentan. Un porcentaje que salta de 55 a 64 no se lee; contando
   se ve subir. Solo para numeros enteros y solo si el cambio vale la pena.
   --------------------------------------------------------------------------- */
function contarHasta(el, destino, sufijo) {
  if (!el) return;
  const menos = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desde = parseInt((el.dataset.n != null ? el.dataset.n : el.textContent), 10);
  el.dataset.n = destino;
  const pinta = v => { el.textContent = v + (sufijo || ''); };
  if (menos || !isFinite(desde) || desde === destino || Math.abs(destino - desde) > 60) { pinta(destino); return; }

  const dur = 520, t0 = performance.now();
  cancelAnimationFrame(el._raf);
  const paso = t => {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);                       // desacelera al final
    pinta(Math.round(desde + (destino - desde) * e));
    if (p < 1) el._raf = requestAnimationFrame(paso);
  };
  el._raf = requestAnimationFrame(paso);
}

/* Un golpe corto cuando algo se cierra. La vibracion es opcional en el sistema
   y no se pide permiso: si no existe, no pasa nada. */
function golpecito(el) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.classList.remove('celebra');
  void el.offsetWidth;
  el.classList.add('celebra');
  setTimeout(() => el.classList.remove('celebra'), 800);
}

/* ---------------------------------------------------------------------------
   La cabecera se condensa al bajar

   El otro sitio donde la app se sentia quieta era leyendo: se movia al tocar,
   pero no mientras usabas la pantalla. Pegada arriba y encogiendose, la
   cabecera acompana el scroll y ademas deja siempre a la vista en que seccion
   estas, que es el patron que la gente ya conoce de iOS.

   Con histeresis (28 px para encoger, 12 para volver): con un solo umbral, un
   scroll que se queda justo en el limite hace parpadear la cabecera.
   --------------------------------------------------------------------------- */
(function () {
  const top = document.querySelector('.top');
  if (!top) return;
  let puesto = false, pedido = false;
  const mirar = () => {
    pedido = false;
    const baja = scrollY > (puesto ? 12 : 28);
    if (baja === puesto) return;
    puesto = baja;
    top.classList.toggle('condensada', baja);
  };
  addEventListener('scroll', () => {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(mirar);
  }, { passive: true });
  mirar();
})();
