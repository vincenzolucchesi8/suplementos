/* Carga y guardado del plan.

   El plan se lee de localStorage de forma SINCRONA al arrancar, porque de el
   sale la fecha de inicio y con eso se calcula el dia del programa antes de
   pintar nada. El servidor se consulta despues, en segundo plano: si trae uno
   distinto, se guarda y se recarga la pagina. Es raro que cambie, y recargar
   evita tener que rehacer todas las constantes de arranque. */

let PLAN = PlanLib.normalizar((function () {
  try { return JSON.parse(localStorage.getItem('plan') || 'null'); } catch (e) { return null; }
}()));

const planLocalGuardar = p => localStorage.setItem('plan', JSON.stringify(p));
// `guardado` lo pone el servidor: compararlo haria que el plan se vea distinto
// siempre y la pagina se recargue en bucle.
const sinSello = p => { const c = { ...p }; delete c.guardado; return c; };
const planIgual = (a, b) => JSON.stringify(sinSello(a)) === JSON.stringify(sinSello(b));

async function planTraer() {
  try {
    const r = await fetch(`${API}/plan`, { headers: cabeceras(), cache: 'no-store' });
    if (!r.ok) return;
    const remoto = await r.json();
    if (!remoto || !remoto.inicio) {
      // Todavia no hay plan guardado: se sube el que esta corriendo
      await planSubir(PLAN);
      return;
    }
    const norm = PlanLib.normalizar(remoto);
    if (!planIgual(norm, PLAN)) {
      planLocalGuardar(norm);
      // Una sola recarga por sesion: si algo hiciera que nunca coincidan,
      // el tablero se queda con el plan nuevo pero no entra en bucle.
      if (!sessionStorage.getItem('plan_recargado')) {
        sessionStorage.setItem('plan_recargado', '1');
        location.reload();
      }
    }
  } catch (e) { /* sin conexion: sigue el plan local */ }
}

async function planSubir(p) {
  await fetch(`${API}/plan`, {
    method: 'POST', headers: cabeceras(), body: JSON.stringify({ plan: p }),
  }).catch(() => {});
}

/* Guarda un plan editado. Si cambiaron las reglas que gobiernan el menu, hay
   que rearmar las 4 semanas: por eso el generador tambien corre en el navegador. */
async function planGuardar(nuevo) {
  const p = PlanLib.normalizar(nuevo);
  planLocalGuardar(p);
  PLAN = p;
  await planSubir(p);
  return p;
}

// Se consulta despues del primer pintado, que no debe esperar a la red
setTimeout(planTraer, 1800);
