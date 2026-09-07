/* ============================================================================
   El cartel de instalar

   En el iPhone esto no es cosmetico: Safari **no tiene Web Push**. `Notification`
   y `PushManager` solo existen cuando la app corre desde la pantalla de inicio
   (iOS 16.4+). O sea que abierta en Safari el tablero funciona pero los avisos
   no llegan nunca, y ademas se ve la barra del navegador con el URL.

   El cartel sale UNA vez, solo en iPhone/iPad, solo si todavia no esta
   instalada, y se puede cerrar para siempre. En Android el navegador ya ofrece
   instalar solo, asi que ahi no aparece.
   ============================================================================ */

(function () {
  const CLAVE = 'instalar-visto';
  const enPantallaDeInicio = () =>
    window.navigator.standalone === true ||
    matchMedia('(display-mode: standalone)').matches;

  const esApple = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (!esApple || enPantallaDeInicio() || localStorage.getItem(CLAVE)) return;

  const panel = document.getElementById('panel-hoy');
  if (!panel) return;

  const el = document.createElement('div');
  el.className = 'instalar';
  el.innerHTML =
    `<img class="ins-ico" src="icon-192.png" alt="">` +
    `<div class="ins-txt">` +
      `<b>Ponla en tu pantalla de inicio</b>` +
      `<span>Toca <svg class="ins-share" viewBox="0 0 24 24" aria-label="compartir">` +
        `<path d="M12 15V3"/><path d="M8.5 6.5L12 3l3.5 3.5"/>` +
        `<path d="M6 12H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1"/>` +
      `</svg> abajo y luego <b>Agregar a inicio</b>. Se abre sin la barra del navegador y ahí sí te llegan los avisos: Safari no los soporta.</span>` +
    `</div>` +
    `<button class="ins-x" type="button" aria-label="Cerrar este aviso">` +
      `<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`;

  el.querySelector('.ins-x').onclick = () => {
    localStorage.setItem(CLAVE, '1');
    el.style.height = el.offsetHeight + 'px';
    requestAnimationFrame(() => el.classList.add('yendose'));
    setTimeout(() => el.remove(), 380);
  };

  panel.insertBefore(el, panel.firstChild);
})();
