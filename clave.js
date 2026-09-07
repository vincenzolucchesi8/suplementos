/* ============================================================================
   La clave del tablero

   En el iPhone, una app agregada a la pantalla de inicio corre en su PROPIO
   almacenamiento, separado del de Safari. O sea que la clave que ya estaba
   guardada en el navegador NO viaja al instalarla: la app instalada arranca sin
   clave, no puede hablar con el servidor y -- lo peor -- la suscripcion de
   avisos falla con un 401 sin decir nada.

   Antes eso se veia solo como un "Sin conexion · guardado local" en el pie, que
   no explica nada ni ofrece salida. Ahora se dice claro y se puede pegar la
   clave ahi mismo, una sola vez.
   ============================================================================ */

(function () {
  if (typeof TOKEN !== 'undefined' && TOKEN) return;   // ya tiene clave

  const el = document.createElement('div');
  el.className = 'clave-falta';
  el.innerHTML =
    '<div class="clave-caja">' +
      '<b>Falta tu clave</b>' +
      '<p>Esta copia de la app todavía no está conectada a tus datos. En el iPhone, ' +
      'la app instalada no hereda lo que estaba guardado en Safari.</p>' +
      '<p class="clave-como">Abre el tablero en Safari, copia el enlace completo ' +
      '(el que termina en <code>#k=…</code>) y pégalo acá.</p>' +
      '<input type="text" id="claveInput" placeholder="Pega el enlace o solo la clave" ' +
        'autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="text">' +
      '<div class="btns"><button class="btn btn-p" id="claveOk" type="button">Conectar</button></div>' +
      '<p class="clave-error" id="claveError" hidden>Eso no parece una clave. Tiene que ser el ' +
      'enlace con <code>#k=</code> o el código suelto.</p>' +
    '</div>';
  document.body.appendChild(el);

  const campo = el.querySelector('#claveInput');
  const error = el.querySelector('#claveError');
  campo.focus();

  const conectar = () => {
    const txt = campo.value.trim();
    // vale el enlace entero o la clave suelta
    const m = /[#?&]k=([^&\s]+)/.exec(txt);
    const clave = m ? decodeURIComponent(m[1]) : (/^[A-Za-z0-9_-]{12,}$/.test(txt) ? txt : null);
    if (!clave) { error.hidden = false; campo.focus(); return; }
    localStorage.setItem('app_token', clave);
    location.reload();
  };
  el.querySelector('#claveOk').onclick = conectar;
  campo.addEventListener('keydown', e => { if (e.key === 'Enter') conectar(); });
})();
