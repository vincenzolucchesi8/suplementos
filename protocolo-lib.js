/* Las fases del protocolo Longevity 01. Compartido entre el navegador y la
   funcion `tick`, que necesita saber que capsulas nombra cada aviso.
   Una sola definicion: si esto viviera en dos lados, un cambio de fase
   dejaria los avisos mintiendo. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.ProtocoloLib = fabrica();
}(typeof self !== 'undefined' ? self : this, function () {

  function suplDeDia(dia) {
    if (dia <= 5) return { fase: 'Fase 1', items: [
      { meal: 'Almuerzo', name: 'Complejo de vitaminas', dose: '1 cápsula', tag: 'D3 + B9 + B12', id: 'c' },
      { meal: 'Almuerzo', name: 'Berberina', dose: '1 cápsula', tag: '500 mg', id: 'b1' },
      { meal: 'Almuerzo', name: 'Omega 3', dose: '2 softgels', tag: 'EPA + DHA', id: 'o1' },
      { meal: 'Cena', name: 'Omega 3', dose: '2 softgels', tag: 'EPA + DHA', id: 'o2' },
    ] };
    if (dia <= 56) return { fase: 'Fase 2', items: [
      { meal: 'Almuerzo', name: 'Complejo de vitaminas', dose: '1 cápsula', tag: 'D3 + B9 + B12', id: 'c' },
      { meal: 'Almuerzo', name: 'Berberina', dose: '1 cápsula', tag: '500 mg', id: 'b1' },
      { meal: 'Almuerzo', name: 'Omega 3', dose: '2 softgels', tag: 'EPA + DHA', id: 'o1' },
      { meal: 'Cena', name: 'Berberina', dose: '1 cápsula', tag: '500 mg', id: 'b2' },
      { meal: 'Cena', name: 'Omega 3', dose: '2 softgels', tag: 'EPA + DHA', id: 'o2' },
    ] };
    if (dia <= 84) return { fase: 'Fase 3', items: [
      { meal: 'Almuerzo', name: 'Complejo de vitaminas', dose: '1 cápsula', tag: 'D3 + B9 + B12', id: 'c' },
    ] };
    return { fase: 'Fase 4', items: [
      { meal: 'Almuerzo', name: 'Complejo de vitaminas', dose: '1 cápsula', tag: 'hasta ajustar', id: 'c' },
    ] };
  }

  return { suplDeDia };
}));
