/* =============================================================================
   EL PLAN COMO DOCUMENTO.

   Hasta aca el plan de Alexia vivia como codigo: 537 lineas repartidas en
   platos.js, construir.js y protocolo-lib.js, mas la fecha de inicio cableada
   en tres archivos. Eso significaba que cualquier ajuste que ella hiciera en
   una consulta necesitaba que alguien editara y desplegara.

   Ahora es un documento. Lo que sigue es el plan de Vinz como valor por
   defecto, pero la app lee el que este guardado. Un segundo plan es un segundo
   documento, no un segundo despliegue.

   UNA SOLA FUENTE: las reglas del menu (pescado 3-4, menestras 2-3, carne roja
   max 2) NO se guardan aparte. Se derivan de las frecuencias semanales, que es
   donde Vinz las ve y las toca. Guardarlas dos veces garantiza que un dia digan
   cosas distintas.
   ============================================================================= */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.PlanLib = fabrica();
}(typeof self !== 'undefined' ? self : this, function () {

  const PLAN_DEFECTO = {
    version: 1,
    nombre: 'Plan de Alexia Macher',
    fuente: 'Plan nutricional del 1 de setiembre de 2026',
    inicio: '2026-09-10',

    // Lo que se llena cada dia
    raciones: [
      { id: 'agua', name: 'Agua', meta: 6, extra: 2, hint: 'ideal 8', icono: 'gota', anillo: true },
      { id: 'inf', name: 'Infusión', meta: 1, extra: 0, hint: '', icono: 'hoja', anillo: false },
      { id: 'fs', name: 'Frutos secos o palta', meta: 1, extra: 1, hint: 'hasta 2', icono: 'hoja', anillo: false },
    ],

    // Lo que se gasta sin pasarse
    permisos: [
      { id: 'postre', name: 'Postre o dulce', tope: 1, ciclo: 'dia', sub: '1 al día' },
      { id: 'choco', name: 'Chocolate >70%', tope: 2, ciclo: 'dia', sub: 'máximo 2 al día' },
      { id: 'coca', name: 'Coca zero', tope: 3, ciclo: 'semana', sub: '3 por semana' },
      { id: 'fuera', name: 'Comer fuera', tope: 2, ciclo: 'semana', sub: '1 o 2 por semana' },
    ],

    // Frecuencias de la semana. De aca salen tambien las reglas del menu.
    semanales: [
      { id: 'pesc', name: 'Pescado', tipo: 'min', meta: 3, alto: 4, goal: '3 a 4 días · se llena con el menú', menu: 'pescado' },
      { id: 'menes', name: 'Menestras o quinoa', tipo: 'min', meta: 2, alto: 3, goal: '2 a 3 días · se llena con el menú', menu: 'cereal' },
      { id: 'fuerza', name: 'Entrenamiento de fuerza', tipo: 'min', meta: 3, alto: 5, goal: 'rutina semanal' },
      { id: 'roja', name: 'Carne roja', tipo: 'max', meta: 2, goal: 'máximo 2 veces · se llena con el menú', menu: 'carne' },
    ],

    proteinaPolvoMax: 3,   // "no tiene por que ser diario"

    /* Alexia lo pide en su ultima pagina: "estar atento a las sensaciones
       corporales (hinchazon, ligereza) y animicas (vitalidad, bajones de
       energia)". Se pregunta al final del dia, que es cuando se puede
       responder: a las 8 de la manana nadie sabe como le fue. */
    sensaciones: {
      desdeHora: 18,
      aspectos: [
        { id: 'energia', name: 'Energía', opciones: ['Baja', 'Normal', 'Alta'] },
        { id: 'digestion', name: 'Digestión', opciones: ['Pesada', 'Normal', 'Ligera'] },
        { id: 'sueno', name: 'Sueño', opciones: ['Malo', 'Normal', 'Bueno'] },
      ],
    },

    // Suplementos por tramo del programa
    fases: [
      { nombre: 'Arranque', desde: 1, hasta: 5, nota: 'Estás en el arranque. La berberina va suave (solo 1 al día) para que tu estómago se acostumbre antes de pasar a dos tomas.', items: [
        { meal: 'Almuerzo', name: 'Complejo de vitaminas', dose: '1 cápsula', tag: 'D3+B9+B12', id: 'c' },
        { meal: 'Almuerzo', name: 'Berberina', dose: '1 cápsula', tag: '500 mg', id: 'b1' },
        { meal: 'Almuerzo', name: 'Omega 3', dose: '2 softgels', tag: 'EPA + DHA', id: 'o1' },
        { meal: 'Cena', name: 'Omega 3', dose: '2 softgels', tag: 'EPA + DHA', id: 'o2' },
      ] },
      { nombre: 'Dosis completa', desde: 6, hasta: 56, nota: 'Dosis completa. Toma todo con las comidas principales: el complejo necesita algo de grasa para absorber bien la vitamina D3.', items: [
        { meal: 'Almuerzo', name: 'Complejo de vitaminas', dose: '1 cápsula', tag: 'D3+B9+B12', id: 'c' },
        { meal: 'Almuerzo', name: 'Berberina', dose: '1 cápsula', tag: '500 mg', id: 'b1' },
        { meal: 'Almuerzo', name: 'Omega 3', dose: '2 softgels', tag: 'EPA + DHA', id: 'o1' },
        { meal: 'Cena', name: 'Berberina', dose: '1 cápsula', tag: '500 mg', id: 'b2' },
        { meal: 'Cena', name: 'Omega 3', dose: '2 softgels', tag: 'EPA + DHA', id: 'o2' },
      ] },
      { nombre: 'Solo vitaminas', desde: 57, hasta: 84, nota: 'El Omega 3 y la berberina ya cumplieron sus 8 semanas. Desde acá sigue solo el complejo de vitaminas.', items: [
        { meal: 'Almuerzo', name: 'Complejo de vitaminas', dose: '1 cápsula', tag: 'D3+B9+B12', id: 'c' },
      ] },
      { nombre: 'Control médico', desde: 85, hasta: 99999, nota: 'Toca repetir análisis y ajustar el plan con tu médico. Alexia mantiene el complejo diario, el protocolo lo bajaba a 2 o 3 veces por semana: eso se define en consulta.', items: [
        { meal: 'Almuerzo', name: 'Complejo de vitaminas', dose: '1 cápsula', tag: 'hasta ajustar', id: 'c' },
      ] },
    ],
  };

  // Rellena lo que falte, para que un plan viejo o a medias no rompa nada
  function normalizar(p) {
    const base = JSON.parse(JSON.stringify(PLAN_DEFECTO));
    if (!p || typeof p !== 'object') return base;
    const out = Object.assign(base, p);
    if (!out.sensaciones || !Array.isArray(out.sensaciones.aspectos) || !out.sensaciones.aspectos.length) {
      out.sensaciones = base.sensaciones;
    }
    ['raciones', 'permisos', 'semanales', 'fases'].forEach(k => {
      if (!Array.isArray(out[k]) || !out[k].length) out[k] = base[k];
    });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(out.inicio || '')) out.inicio = base.inicio;
    out.fases = out.fases
      .map(f => ({ ...f, desde: +f.desde || 1, hasta: +f.hasta || 99999 }))
      .sort((a, b) => a.desde - b.desde);
    return out;
  }

  // Que suplementos tocan un dia del programa
  function suplDeDia(plan, dia) {
    const f = (plan.fases || []).find(x => dia >= x.desde && dia <= x.hasta)
      || plan.fases[plan.fases.length - 1];
    return { fase: f.nombre, nota: f.nota || '', items: f.items || [] };
  }

  /* Las reglas del menu se DERIVAN de las frecuencias: una sola fuente.
     El minimo de carne roja es 1 y no 0 porque el generador necesita margen
     para armar variedad; el tope si sale del plan. */
  function reglasDeMenu(plan) {
    const de = id => (plan.semanales || []).find(s => s.id === id) || {};
    const pesc = de('pesc'), menes = de('menes'), roja = de('roja');
    return {
      pescadoMin: +pesc.meta || 3,
      pescadoMax: +pesc.alto || (+pesc.meta || 3) + 1,
      cerealMin: +menes.meta || 2,
      cerealMax: +menes.alto || (+menes.meta || 2) + 1,
      carneMin: Math.min(1, +roja.meta || 2),
      carneMax: +roja.meta || 2,
      proteinaPolvoMax: +plan.proteinaPolvoMax || 3,
    };
  }

  const mismasReglas = (a, b) => ['pescadoMin', 'pescadoMax', 'cerealMin', 'cerealMax',
    'carneMin', 'carneMax', 'proteinaPolvoMax'].every(k => (a || {})[k] === (b || {})[k]);

  return { PLAN_DEFECTO, normalizar, suplDeDia, reglasDeMenu, mismasReglas };
}));
