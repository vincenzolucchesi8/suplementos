/* Emite menu/menu.json: las 4 semanas mas el catalogo completo y las reglas.
   La logica del generador vive en generador.js, que tambien corre en el
   navegador para rearmar el menu cuando cambian las reglas del plan.
   Despues, `validar.js` vuelve a medir el resultado de forma independiente.

   Uso:  node menu/construir.js
*/
const fs = require('fs');
const path = require('path');
const P = require('./platos');
const { generar } = require('./generador');

// ---------- Reglas del plan de Alexia (pagina 10 del PDF) ----------
const R = {
  pescadoMin: 3, pescadoMax: 4,   // "consumir pescado al menos 3-4 dias a la semana"
  carneMin: 1, carneMax: 2,       // "carne roja 1-2 veces a la semana como mucho"
  cerealMin: 2, cerealMax: 3,     // "menestras/quinoa al menos 2-3 dias a la semana"
  proteinaPolvoMax: 3,            // "por ahora no tiene por que ser diario"
};

// Topes de variedad. No salen del PDF: existen para que la semana no se vuelva
// cuatro almuerzos de pollo seguidos, que cumple las reglas y es un mal menu.
const V = {
  almuerzo: { pollo: 3, pescado: 3, atun: 1, carne: 2 },
  cena: { pollo: 3, pescado: 2, carne: 2, huevos: 3 },
  omeletteMin: 1,
  huevoDesMin: 1,
};

const SEMILLA = 20260906;
const dias = generar(P, R, V, SEMILLA);

// El catalogo COMPLETO viaja en el json: sin el, el navegador no podria rearmar
// el menu cuando se cambia una regla desde el editor del plan.
const catalogo = {
  DESAYUNOS: P.DESAYUNOS, PROT_ALM: P.PROT_ALM, PROT_CEN: P.PROT_CEN,
  CARB_ALM: P.CARB_ALM, CARB_CEN: P.CARB_CEN, GRASA_ALM: P.GRASA_ALM,
  VERDURAS: P.VERDURAS, OMELETTES: P.OMELETTES, POSTRES: P.POSTRES,
  MEDIA_MANANA: P.MEDIA_MANANA, MERIENDA: P.MERIENDA,
};

const salida = {
  generado: new Date().toISOString().slice(0, 10),
  fuente: 'Plan nutricional de Alexia Macher, 1-09-2026',
  reglas: R,
  variedad: V,
  semilla: SEMILLA,
  cats: P.CATS,
  items: P.ITEMS,
  catalogo,
  dias,
  // Atajo para el boton de cambiar plato: son las mismas opciones del catalogo
  opciones: {
    desayunos: P.DESAYUNOS.map(d => ({ id: d.id, titulo: d.t, detalle: d.d, tags: d.tags, ing: d.ing })),
    protAlm: P.PROT_ALM.map(p => ({ id: p.id, k: p.k, titulo: p.t, corto: p.corto, ing: p.ing })),
    protCen: P.PROT_CEN.map(p => ({ id: p.id, k: p.k, titulo: p.t, corto: p.corto, ing: p.ing })),
    omelettes: P.OMELETTES.map(o => ({ id: o.id, titulo: o.t, corto: o.corto, detalle: o.d, ing: o.ing })),
  },
};

fs.writeFileSync(path.join(__dirname, 'menu.json'), JSON.stringify(salida, null, 1), 'utf8');
console.log('menu.json escrito con', dias.length, 'dias');
