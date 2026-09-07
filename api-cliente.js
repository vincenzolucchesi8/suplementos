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

// Clave del tablero. Llega una vez por el enlace (#k=...) y queda guardada.
function tokenApp(){
  const m = /[#&]k=([^&]+)/.exec(location.hash||'');
  if(m){
    localStorage.setItem('app_token', decodeURIComponent(m[1]));
    history.replaceState(null,'',location.pathname+location.search);
  }
  return localStorage.getItem('app_token') || '';
}
const TOKEN = tokenApp();
const cabeceras = () => Object.assign({'Content-Type':'application/json'}, TOKEN ? {'x-token':TOKEN} : {});
const cloudOn = () => true;
