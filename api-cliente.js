/* La capa que habla con el servidor. Vive aparte de app.js porque el plan la
   necesita antes: de el sale la fecha de inicio, y sin eso app.js no puede
   calcular el dia del programa. */
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

/* Clave del tablero. Llega una vez por el enlace y queda guardada.
   Se acepta tanto #k= como ?k=: el hash se pierde en varios caminos de
   instalacion y el query sobrevive mejor. */
function tokenApp(){
  const m = /[#?&]k=([^&\s]+)/.exec((location.hash||'') + (location.search||''));
  if(m){
    localStorage.setItem('app_token', decodeURIComponent(m[1]));
    history.replaceState(null,'',location.pathname);
  }
  return localStorage.getItem('app_token') || '';
}
const TOKEN = tokenApp();
const cabeceras = () => Object.assign({'Content-Type':'application/json'}, TOKEN ? {'x-token':TOKEN} : {});
const cloudOn = () => true;


/* ---------------------------------------------------------------------------
   jsPDF, solo cuando de verdad se pide

   Pesa 420 KB: mas que TODO el codigo propio de la app junto (172 KB), y se
   descargaba y parseaba en cada arranque para algo que se usa cuando tocas un
   boton de PDF. Ahora se carga la primera vez que hace falta y se recuerda.
   --------------------------------------------------------------------------- */
let _pdfLib = null;
function cargarPDFLib() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  if (_pdfLib) return _pdfLib;
  _pdfLib = new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = 'vendor/jspdf.umd.min.js';
    s.onload = () => (window.jspdf ? ok(window.jspdf) : mal(new Error('jspdf no cargo')));
    s.onerror = () => { _pdfLib = null; mal(new Error('no se pudo bajar jspdf')); };
    document.head.appendChild(s);
  });
  return _pdfLib;
}

/* La libreria se pide al ENTRAR a la seccion, no al tocar el boton.

   Es la diferencia entre que funcione y que no: `navigator.share` -- y en
   Chromium tambien la descarga -- exigen "activacion transitoria", o sea que
   la accion salga del toque del usuario. Un `await` de red en el medio se la
   come, asi que el PRIMER PDF de cada sesion se quedaba en nada, sin error.
   Se veia exactamente como "no me deja descargar el PDF". */
function precargarPDF() {
  if (window.jspdf || _pdfLib) return;
  const pedir = () => cargarPDFLib().catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(pedir, { timeout: 3000 });
  else setTimeout(pedir, 1200);
}

/* Envuelve el boton de un PDF. Si la libreria ya esta -- que es el caso normal
   gracias a la precarga -- se llama DERECHO, sin await ni promesas: es lo
   unico que conserva la activacion del toque. Solo si no llego todavia se cae
   al camino asincrono, y ahi entregarPDF ya sabe que no puede compartir. */
function conPDF(btn, hacer) {
  return e => {
    if (btn.dataset.ocupado === '1') return;
    if (window.jspdf) { hacer(); return; }
    const txt = btn.innerHTML;
    btn.dataset.ocupado = '1';
    btn.disabled = true;
    const lento = setTimeout(() => { btn.textContent = 'Preparando…'; }, 260);
    cargarPDFLib()
      .then(hacer)
      .catch(() => { if (typeof avisar === 'function') avisar('No se pudo preparar el PDF'); })
      .finally(() => {
        clearTimeout(lento);
        btn.innerHTML = txt;
        btn.disabled = false;
        btn.dataset.ocupado = '0';
      });
  };
}


/* ---------------------------------------------------------------------------
   Entregar un PDF

   doc.save() de jsPDF arma un blob y pincha un <a download>. En el iPhone,
   una app agregada a la pantalla de inicio corre en modo standalone y ahi
   Safari NO baja archivos: el enlace no hace nada, sin error y sin aviso. Por
   eso "no me deja descargar el PDF" pasaba solo en la app instalada y no en
   el navegador.

   La salida buena en iOS no es descargar, es COMPARTIR: el menu nativo deja
   guardar en Archivos, imprimir, mandarlo por WhatsApp o mail. Si el aparato
   no sabe compartir archivos se baja como siempre, y si el compartir falla se
   abre en una pestana, que al menos se puede guardar a mano.
   --------------------------------------------------------------------------- */
async function entregarPDF(doc, nombre) {
  const blob = doc.output('blob');

  /* Compartir SOLO donde descargar no funciona, que es la app instalada del
     iPhone. En todo lo demas -- Safari normal, Android, escritorio -- bajar el
     archivo es lo que la gente espera, y abrir el menu de compartir seria un
     paso de mas. */
  const esIOS = /iP(hone|ad|od)/.test(navigator.platform || '') ||
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || ''));
  const instalada = navigator.standalone === true ||
    (matchMedia && matchMedia('(display-mode: standalone)').matches);

  if (esIOS && instalada) {
    const archivo = new File([blob], nombre, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: nombre });
        return 'compartido';
      } catch (e) {
        // cancelar el menu no es un fallo: no hay que insistir
        if (e && e.name === 'AbortError') return 'cancelado';
      }
    }
  }

  try {
    doc.save(nombre);
    if (typeof avisar === 'function') avisar('PDF listo: ' + nombre);
    return 'bajado';
  } catch (e) {}

  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  if (!w && typeof avisar === 'function') avisar('Tu navegador bloqueó la ventana del PDF');
  return w ? 'abierto' : 'bloqueado';
}
