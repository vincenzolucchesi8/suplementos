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

/* Envuelve el boton de un PDF: baja la libreria, avisa mientras tanto y deja
   el boton como estaba pase lo que pase. */
function conPDF(btn, hacer) {
  return async () => {
    if (btn.dataset.ocupado === '1') return;
    const txt = btn.innerHTML;
    btn.dataset.ocupado = '1';
    btn.disabled = true;
    const lento = setTimeout(() => { btn.textContent = 'Preparando…'; }, 260);
    try {
      await cargarPDFLib();
      hacer();
    } catch (e) {
      if (typeof avisar === 'function') avisar('No se pudo preparar el PDF');
    } finally {
      clearTimeout(lento);
      btn.innerHTML = txt;
      btn.disabled = false;
      btn.dataset.ocupado = '0';
    }
  };
}
