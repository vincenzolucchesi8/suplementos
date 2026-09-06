/* Arma el menu de 28 dias (4 semanas del programa) respetando las reglas de
   frecuencia del plan de Alexia Macher. No lo escribe una persona a ojo: hace
   busqueda con poda y semilla fija hasta que una semana cumple TODO, y
   despues `validar.js` vuelve a medir el resultado de forma independiente.

   Uso:  node menu/construir.js        -> escribe menu/menu.json
*/
const fs = require('fs');
const path = require('path');
const P = require('./platos');

// ---------- Azar reproducible ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260906);
const pick = arr => arr[Math.floor(rnd() * arr.length)];

// ---------- Reglas ----------
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
  omeletteMin: 1,   // al menos una cena de omelette por semana
  huevoDesMin: 1,   // y al menos un desayuno con huevos
};

// Para la regla de no repetir, atun y pescado son lo mismo
const fam = k => (k === 'atun' ? 'pescado' : k);

// ---------- Paso 1: patron de proteinas de la semana ----------
function patronSemana(ultimaCena) {
  const LUNCH = ['pollo', 'pescado', 'atun', 'carne'];
  const DINNER = [
    { tipo: 'plato', k: 'pollo' }, { tipo: 'plato', k: 'pescado' },
    { tipo: 'plato', k: 'carne' }, { tipo: 'omelette', k: 'huevos' },
  ];
  // Busqueda en profundidad con poda. El orden de los candidatos se baraja con
  // la semilla, asi cada semana sale distinta sin depender de la suerte.
  const esPescado = d => fam(d.lunchK) === 'pescado' || fam(d.cena.k) === 'pescado';
  const esCarne = d => d.lunchK === 'carne' || d.cena.k === 'carne';
  const barajar = arr => arr.map(x => [rnd(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

  const dias = [];
  const nL = {}, nC = {};

  function completa() {
    const nP = dias.filter(esPescado).length;
    const nCarne = dias.filter(esCarne).length;
    if (nP < R.pescadoMin || nP > R.pescadoMax) return false;
    if (nCarne < R.carneMin || nCarne > R.carneMax) return false;
    if ((nC.huevos || 0) < V.omeletteMin) return false;
    const libres = dias.filter(d => d.lunchK !== 'atun' && d.cena.tipo !== 'omelette').length;
    return libres >= 3;
  }

  function dfs(i, prevMeal) {
    if (i === 7) return completa();
    // poda: ya se pasaron los topes de dias con pescado o carne
    if (dias.filter(esPescado).length > R.pescadoMax) return false;
    if (dias.filter(esCarne).length > R.carneMax) return false;

    for (const l of barajar(LUNCH)) {
      if (fam(l) === fam(prevMeal)) continue;
      if ((nL[l] || 0) + 1 > V.almuerzo[l]) continue;
      for (const c of barajar(DINNER)) {
        if (fam(c.k) === fam(l)) continue;
        if ((nC[c.k] || 0) + 1 > V.cena[c.k]) continue;
        // dos tomas de huevo en el mismo dia: el atun del almuerzo trae huevo cocido
        if (l === 'atun' && c.tipo === 'omelette') continue;
        dias.push({ lunchK: l, cena: c });
        nL[l] = (nL[l] || 0) + 1; nC[c.k] = (nC[c.k] || 0) + 1;
        if (dfs(i + 1, c.k)) return true;
        dias.pop(); nL[l]--; nC[c.k]--;
      }
    }
    return false;
  }

  return dfs(0, ultimaCena) ? dias.map(d => ({ ...d })) : null;
}

// ---------- Paso 2: carbohidratos ----------
function asignarCarbos(dias) {
  const menestras = P.CARB_ALM.filter(c => c.k === 'menestras');
  const quinoaAlm = P.CARB_ALM.find(c => c.k === 'quinoa');
  const otrosAlm = P.CARB_ALM.filter(c => c.k === 'otro');
  const otrosCen = P.CARB_CEN.filter(c => c.k === 'otro');
  const quinoaCen = P.CARB_CEN.find(c => c.k === 'quinoa');

  for (let intento = 0; intento < 3000; intento++) {
    // cuantos dias llevan menestras o quinoa, y en que dias
    const objetivo = 2 + Math.floor(rnd() * (R.cerealMax - R.cerealMin + 1));
    const idx = [0, 1, 2, 3, 4, 5, 6].sort(() => rnd() - 0.5).slice(0, objetivo);
    const out = dias.map((d, i) => {
      let almC, cenC;
      if (idx.includes(i)) {
        // las menestras nunca de noche: van al almuerzo. La quinoa puede ir en cualquiera.
        if (rnd() < 0.65) { almC = pick(menestras); cenC = pick(otrosCen); }
        else if (rnd() < 0.5) { almC = quinoaAlm; cenC = pick(otrosCen); }
        else { almC = pick(otrosAlm); cenC = quinoaCen; }
      } else {
        almC = pick(otrosAlm); cenC = pick(otrosCen);
      }
      return { ...d, almC, cenC };
    });

    // no repetir el mismo carbo dos dias seguidos en la misma comida
    let ok = true;
    for (let i = 1; i < 7; i++) {
      if (out[i].almC.id === out[i - 1].almC.id) { ok = false; break; }
      if (out[i].cenC.id === out[i - 1].cenC.id) { ok = false; break; }
    }
    if (!ok) continue;

    const cereal = out.filter(d => d.almC.k === 'menestras' || d.almC.k === 'quinoa' || d.cenC.k === 'quinoa').length;
    if (cereal < R.cerealMin || cereal > R.cerealMax) continue;
    return out;
  }
  return null;
}

// ---------- Paso 3: desayunos ----------
function asignarDesayunos(dias, ultimoDesayuno) {
  const conHuevo = P.DESAYUNOS.filter(d => d.tags.includes('huevos'));
  const sinHuevo = P.DESAYUNOS.filter(d => !d.tags.includes('huevos'));

  for (let intento = 0; intento < 6000; intento++) {
    const usados = new Set();
    const out = [];
    let ok = true;
    for (let i = 0; i < 7 && ok; i++) {
      const d = dias[i];
      const gastoHuevo = d.lunchK === 'atun' || d.cena.tipo === 'omelette';
      const pool = (gastoHuevo ? sinHuevo : P.DESAYUNOS).filter(x => !usados.has(x.id));
      if (!pool.length) { ok = false; break; }
      const el = pick(pool);
      usados.add(el.id);
      out.push({ ...d, des: el });
    }
    if (!ok) continue;

    // la proteina en polvo no es diaria ni dos dias seguidos
    const pp = out.map(d => d.des.tags.includes('proteina_polvo'));
    if (pp.filter(Boolean).length > R.proteinaPolvoMax) continue;
    if (pp.some((v, i) => v && pp[i - 1])) continue;

    // no encadenar la misma proteina: desayuno -> almuerzo
    let choca = false;
    for (let i = 0; i < 7; i++) {
      const kDes = out[i].des.tags.includes('huevos') ? 'huevos'
        : out[i].des.tags.includes('pollo') ? 'pollo' : null;
      if (kDes && fam(kDes) === fam(out[i].lunchK)) { choca = true; break; }
      const prevCena = i === 0 ? ultimoDesayuno.cenaK : out[i - 1].cena.k;
      if (kDes && fam(kDes) === fam(prevCena)) { choca = true; break; }
    }
    if (choca) continue;

    // fruta al menos interdiario: nunca dos dias seguidos sin fruta en el desayuno
    const fr = out.map(d => d.des.tags.includes('fruta'));
    if (fr.some((v, i) => !v && i > 0 && !fr[i - 1])) continue;

    // que la semana tenga al menos un desayuno con huevos
    if (out.filter(d => d.des.tags.includes('huevos')).length < V.huevoDesMin) continue;

    return out;
  }
  return null;
}

// ---------- Paso 4: rellenar el resto y emitir el dia ----------
function sinRepetir(pool, anterior, campo = 'id') {
  const libres = pool.filter(x => !anterior || x[campo] !== anterior[campo]);
  return pick(libres.length ? libres : pool);
}

function construir() {
  const dias = [];
  let ultimaCenaK = null;
  let prevVerdAlm = null, prevVerdCen = null, prevGrasa = null;
  let prevMM = null, prevMer = null, prevPostre = null, prevProtAlm = null, prevProtCen = null;

  for (let w = 0; w < 4; w++) {
    // Los tres pasos estan acoplados: si los desayunos no entran contra el patron
    // de proteinas, se descarta la semana entera y se vuelve a empezar.
    let semana = null;
    for (let vuelta = 0; vuelta < 300 && !semana; vuelta++) {
      const patron = patronSemana(ultimaCenaK);
      if (!patron) continue;
      const conCarbos = asignarCarbos(patron);
      if (!conCarbos) continue;
      semana = asignarDesayunos(conCarbos, { cenaK: ultimaCenaK });
    }
    if (!semana) throw new Error(`No se pudo armar la semana ${w + 1} cumpliendo las reglas`);

    semana.forEach((d, i) => {
      const numDia = w * 7 + i + 1;

      const protAlm = sinRepetir(P.PROT_ALM.filter(p => p.k === d.lunchK), prevProtAlm);
      prevProtAlm = protAlm;
      const verdAlm = sinRepetir(P.VERDURAS, prevVerdAlm); prevVerdAlm = verdAlm;
      const grasa = sinRepetir(P.GRASA_ALM, prevGrasa); prevGrasa = grasa;

      let cena;
      if (d.cena.tipo === 'omelette') {
        const om = pick(P.OMELETTES);
        cena = { tipo: 'omelette', protK: 'huevos', titulo: om.t, detalle: om.d, ing: om.ing };
      } else {
        const protCen = sinRepetir(P.PROT_CEN.filter(p => p.k === d.cena.k), prevProtCen);
        prevProtCen = protCen;
        const verdCen = sinRepetir(P.VERDURAS, prevVerdCen); prevVerdCen = verdCen;
        cena = {
          tipo: 'plato', protK: d.cena.k,
          titulo: protCen.t, verdura: verdCen.t, carbo: d.cenC.t,
          detalle: 'Sin grasa extra: basta el aceite de oliva de las verduras',
          ing: [...protCen.ing, ...verdCen.ing, ...d.cenC.ing],
        };
      }

      const postre = sinRepetir(P.POSTRES, prevPostre, 't'); prevPostre = postre;
      const mm = sinRepetir(P.MEDIA_MANANA, prevMM, 't'); prevMM = mm;
      const mer = sinRepetir(P.MERIENDA, prevMer, 't'); prevMer = mer;

      dias.push({
        dia: numDia,
        semana: w + 1,
        desayuno: { titulo: d.des.t, detalle: d.des.d, tags: d.des.tags, ing: d.des.ing },
        mediaManana: { titulo: mm.t, ing: mm.ing },
        almuerzo: {
          titulo: protAlm.t, protK: protAlm.k,
          verdura: verdAlm.t, carbo: d.almC.t, carboK: d.almC.k, grasa: grasa.t,
          ing: [...protAlm.ing, ...verdAlm.ing, ...d.almC.ing, ...grasa.ing],
        },
        merienda: { titulo: mer.t, ing: mer.ing },
        cena: { ...cena, carboK: d.cenC.k },
        postre: { titulo: postre.t, ing: postre.ing },
      });

      ultimaCenaK = cena.protK;
    });
  }
  return dias;
}

const dias = construir();
const salida = {
  generado: new Date().toISOString().slice(0, 10),
  fuente: 'Plan nutricional de Alexia Macher, 1-09-2026',
  reglas: R,
  cats: P.CATS,
  items: P.ITEMS,
  dias,
};
fs.writeFileSync(path.join(__dirname, 'menu.json'), JSON.stringify(salida, null, 1), 'utf8');
console.log('menu.json escrito con', dias.length, 'dias');
