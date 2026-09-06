/* Resuelve que se come un dia concreto: el menu base mas los cambios que hizo
   Vinz. Vive en un archivo aparte porque lo usan LOS DOS lados: el navegador
   para pintar el tablero y la funcion `tick` para nombrar el plato en la
   notificacion. Si estuviera duplicado, un aviso podria anunciar un plato que
   la app ya no muestra. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.MenuLib = fabrica();
}(typeof self !== 'undefined' ? self : this, function () {

  const rota = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];
  const conHuevo = ing => (ing || []).some(([c]) => c === 'huevo');

  function menuBase(MENU, dia) {
    if (!MENU || !MENU.dias || !MENU.dias.length) return null;
    const n = MENU.dias.length;
    return MENU.dias[((dia - 1) % n + n) % n];
  }

  /* off(letra) devuelve cuantas veces se toco "Cambiar" en esa comida.
     El orden desayuno -> almuerzo -> cena no es capricho: encadena los filtros
     para que nunca queden dos tomas de huevo en el mismo dia, que es regla
     del plan ("elegir 1 vez al dia para comer la porcion de huevos"). */
  function resolverDia(MENU, dia, off) {
    const base = menuBase(MENU, dia);
    if (!base) return null;

    const gastaHuevoBase = conHuevo(base.almuerzo.ing) || conHuevo(base.cena.ing);
    const opsDes = MENU.opciones.desayunos.filter(d => !gastaHuevoBase || !conHuevo(d.ing));
    const iD = opsDes.findIndex(d => d.id === base.desayuno.id);
    const oD = off('D');
    const des = rota(opsDes, (iD < 0 ? 0 : iD) + oD);
    const desayuno = Object.assign({}, des, { cambiado: oD !== 0 });

    const pa = base.almuerzo.partes;
    const opsAlm = MENU.opciones.protAlm.filter(p => !conHuevo(desayuno.ing) || p.k !== 'atun');
    const iA = opsAlm.findIndex(p => p.id === pa.prot.id);
    const oA = off('A');
    const protA = rota(opsAlm, (iA < 0 ? 0 : iA) + oA);
    const almuerzo = {
      tipo: 'plato', titulo: protA.titulo, corto: protA.corto || protA.titulo, protK: protA.k, cambiado: oA !== 0,
      verdura: pa.verdura.titulo, carbo: pa.carbo.titulo, carboK: pa.carbo.k, grasa: pa.grasa.titulo,
      ing: [].concat(protA.ing, pa.verdura.ing, pa.carbo.ing, pa.grasa.ing),
    };

    const gastado = conHuevo(desayuno.ing) || conHuevo(almuerzo.ing);
    const opsCen = [].concat(
      MENU.opciones.protCen.map(p => ({ tipo: 'plato', p })),
      gastado ? [] : MENU.opciones.omelettes.map(o => ({ tipo: 'omelette', o }))
    );
    const pc = base.cena.partes;
    const idBaseCena = base.cena.tipo === 'plato' ? pc.prot.id : pc.omelette.id;
    const iC = opsCen.findIndex(x => (x.tipo === 'plato' ? x.p.id : x.o.id) === idBaseCena);
    const oC = off('C');
    const elC = rota(opsCen, (iC < 0 ? 0 : iC) + oC);

    let cena;
    if (elC.tipo === 'omelette') {
      cena = {
        tipo: 'omelette', titulo: elC.o.titulo, corto: elC.o.corto || elC.o.titulo, detalle: elC.o.detalle,
        protK: 'huevos', carboK: null, cambiado: oC !== 0, ing: elC.o.ing,
      };
    } else {
      // Si la cena base era omelette no hay verdura ni carbo guardados: se pone
      // el molde de la opcion plato, que es lo que el plan indica para la cena.
      const verd = base.cena.tipo === 'plato' ? pc.verdura
        : { titulo: 'Verduras al gusto, un tercio del plato', ing: [['lechuga', 1], ['aceite', 1]] };
      const carb = base.cena.tipo === 'plato' ? pc.carbo
        : { titulo: 'Media papa pequeña sancochada', k: 'otro', ing: [['papa', 0.5]] };
      cena = {
        tipo: 'plato', titulo: elC.p.titulo, corto: elC.p.corto || elC.p.titulo, protK: elC.p.k, cambiado: oC !== 0,
        verdura: verd.titulo, carbo: carb.titulo, carboK: carb.k,
        detalle: 'Sin grasa extra: basta el aceite de oliva de las verduras',
        ing: [].concat(elC.p.ing, verd.ing, carb.ing),
      };
    }

    return {
      dia, desayuno, almuerzo, cena,
      mediaManana: base.mediaManana, merienda: base.merienda, postre: base.postre,
    };
  }

  return { rota, conHuevo, menuBase, resolverDia };
}));
