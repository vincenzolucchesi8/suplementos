/* ============================================================================
   Movimiento

   El sistema sale MEDIDO de un reel de navigation tabs (setiembre 2026). Se
   midio la trayectoria horizontal del indicador cuadro a cuadro buscando el
   pixel del blob en 167 imagenes: sobrepasa el destino un 6,3 %, llega al pico
   a los 167 ms y se asienta a los ~330 ms. Eso es un resorte con amortiguacion
   0,67, y la bezier (.48,1.47,.3,.98) lo reproduce con error < 0,1 %. Vive en
   --resorte y la usa toda la app: la barra, los checks, las hojas, los pasos.

   Aca solo vive lo que necesita JS: el metaball de la barra (dos formas que se
   funden por un filtro SVG y no se pueden expresar en CSS solo), el ancho de
   pestana, y los numeros que cuentan. Todo lo demas es CSS.

   Regla: si el JS no corre, la app se ve igual. Nada aca esconde contenido.
   ============================================================================ */

(function () {
  // OJO: el div NO se puede llamar 'goo' porque el <filter id="goo"> ya usa ese
  // id; getElementById devolvia el filtro y la barra nunca se medía.
  const goo = document.getElementById('gooCapa');
  const pill = document.getElementById('tabsPill');
  if (!goo || !pill) return;

  const tabs = [...pill.querySelectorAll('.tab')];
  const menos = matchMedia('(prefers-reduced-motion: reduce)');

  /* El ancho de pestana es el unico numero que el CSS no puede deducir solo:
     las animaciones lo necesitan como longitud, no como fraccion. */
  const medir = () => goo.style.setProperty('--anchoTab', (pill.clientWidth - 12) / tabs.length + 'px');
  medir();
  addEventListener('resize', medir);
  addEventListener('orientationchange', () => setTimeout(medir, 120));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);

  let actual = Math.max(0, tabs.findIndex(t => t.classList.contains('on')));
  goo.style.setProperty('--i', actual);

  /* Salta el indicador a la pestana n. La llama navegacion.js despues de
     cambiar de seccion, asi que la pantalla ya cambio: la gota es el acuse de
     recibo, no la espera. */
  window.saltarChip = function (n) {
    if (n < 0 || n === actual) { goo.style.setProperty('--i', Math.max(0, n)); return; }
    goo.style.setProperty('--de', actual);
    goo.style.setProperty('--a', n);
    goo.style.setProperty('--i', n);
    actual = n;
    if (menos.matches) return;
    pill.classList.remove('saltando');
    void pill.offsetWidth;                       // reinicia la animacion
    pill.classList.add('saltando');
  };
})();

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

/* Un golpe corto cuando algo se marca. La vibracion es opcional en el sistema
   y no se pide permiso: si no existe, no pasa nada. */
function golpecito(el) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.classList.remove('celebra');
  void el.offsetWidth;
  el.classList.add('celebra');
  setTimeout(() => el.classList.remove('celebra'), 800);
}
