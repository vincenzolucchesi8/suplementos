/* El generador del menu, sin depender de Node.
   Vive aparte para que corra en LOS DOS lados: el build lo usa para emitir
   menu.json, y el navegador lo usa cuando Vinz cambia una regla del plan y hay
   que rearmar las 4 semanas ahi mismo. Recibe el catalogo y las reglas como
   datos: no sabe nada del plan de nadie en particular. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Generador = fabrica();
}(typeof self !== 'undefined' ? self : this, function () {

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const fam = k => (k === 'atun' ? 'pescado' : k);

  function generar(P, R, V, semilla) {
    const rnd = mulberry32(semilla || 20260906);
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const barajar = arr => arr.map(x => [rnd(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

    /* Fisher-Yates de verdad.

       Antes esto era `arr.sort(() => rnd() - 0.5)`, que NO es un barajado: es
       un comparador inconsistente, y con un comparador inconsistente el
       resultado de sort() depende del algoritmo del motor. O sea que el mismo
       codigo con la MISMA semilla daba un menu distinto en el Node de esta
       maquina y en el de Vercel -- y como el menu se regeneraba en cada
       despliegue, a Vinz le cambiaban los platos de la semana sin que nadie
       tocara nada. */
    const barajarBien = arr => {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const t = a2[i]; a2[i] = a2[j]; a2[j] = t;
      }
      return a2;
    };

    // ---------- Paso 1: patron de proteinas, por busqueda con poda ----------
    function patronSemana(ultimaCena) {
      const LUNCH = ['pollo', 'pescado', 'atun', 'carne'];
      const DINNER = [
        { tipo: 'plato', k: 'pollo' }, { tipo: 'plato', k: 'pescado' },
        { tipo: 'plato', k: 'carne' }, { tipo: 'omelette', k: 'huevos' },
      ];
      const esPescado = d => fam(d.lunchK) === 'pescado' || fam(d.cena.k) === 'pescado';
      const esCarne = d => d.lunchK === 'carne' || d.cena.k === 'carne';
      const dias = [], nL = {}, nC = {};

      function completa() {
        const nP = dias.filter(esPescado).length;
        const nCarne = dias.filter(esCarne).length;
        if (nP < R.pescadoMin || nP > R.pescadoMax) return false;
        if (nCarne < R.carneMin || nCarne > R.carneMax) return false;
        if ((nC.huevos || 0) < V.omeletteMin) return false;
        return dias.filter(d => d.lunchK !== 'atun' && d.cena.tipo !== 'omelette').length >= 3;
      }

      function dfs(i, prevMeal) {
        if (i === 7) return completa();
        if (dias.filter(esPescado).length > R.pescadoMax) return false;
        if (dias.filter(esCarne).length > R.carneMax) return false;
        for (const l of barajar(LUNCH)) {
          if (fam(l) === fam(prevMeal)) continue;
          if ((nL[l] || 0) + 1 > V.almuerzo[l]) continue;
          for (const c of barajar(DINNER)) {
            if (fam(c.k) === fam(l)) continue;
            if ((nC[c.k] || 0) + 1 > V.cena[c.k]) continue;
            // dos tomas de huevo el mismo dia: el atun del almuerzo trae huevo cocido
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
        const objetivo = R.cerealMin + Math.floor(rnd() * (R.cerealMax - R.cerealMin + 1));
        const idx = barajarBien([0, 1, 2, 3, 4, 5, 6]).slice(0, objetivo);
        const out = dias.map((d, i) => {
          let almC, cenC;
          if (idx.includes(i)) {
            // las menestras nunca de noche: van al almuerzo
            if (rnd() < 0.65) { almC = pick(menestras); cenC = pick(otrosCen); }
            else if (rnd() < 0.5) { almC = quinoaAlm; cenC = pick(otrosCen); }
            else { almC = pick(otrosAlm); cenC = quinoaCen; }
          } else { almC = pick(otrosAlm); cenC = pick(otrosCen); }
          return { ...d, almC, cenC };
        });
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
    function asignarDesayunos(dias, ultimo) {
      const sinHuevo = P.DESAYUNOS.filter(d => !d.tags.includes('huevos'));
      for (let intento = 0; intento < 6000; intento++) {
        const usados = new Set(); const out = []; let ok = true;
        for (let i = 0; i < 7 && ok; i++) {
          const d = dias[i];
          const gasto = d.lunchK === 'atun' || d.cena.tipo === 'omelette';
          const pool = (gasto ? sinHuevo : P.DESAYUNOS).filter(x => !usados.has(x.id));
          if (!pool.length) { ok = false; break; }
          const el = pick(pool); usados.add(el.id); out.push({ ...d, des: el });
        }
        if (!ok) continue;
        const pp = out.map(d => d.des.tags.includes('proteina_polvo'));
        if (pp.filter(Boolean).length > R.proteinaPolvoMax) continue;
        if (pp.some((v, i) => v && pp[i - 1])) continue;
        let choca = false;
        for (let i = 0; i < 7; i++) {
          const kDes = out[i].des.tags.includes('huevos') ? 'huevos'
            : out[i].des.tags.includes('pollo') ? 'pollo' : null;
          if (kDes && fam(kDes) === fam(out[i].lunchK)) { choca = true; break; }
          const prevCena = i === 0 ? ultimo.cenaK : out[i - 1].cena.k;
          if (kDes && fam(kDes) === fam(prevCena)) { choca = true; break; }
        }
        if (choca) continue;
        const fr = out.map(d => d.des.tags.includes('fruta'));
        if (fr.some((v, i) => !v && i > 0 && !fr[i - 1])) continue;
        if (out.filter(d => d.des.tags.includes('huevos')).length < V.huevoDesMin) continue;
        return out;
      }
      return null;
    }

    // ---------- Paso 4: armar los dias ----------
    const sinRepetir = (pool, anterior, campo) => {
      const c = campo || 'id';
      const libres = pool.filter(x => !anterior || x[c] !== anterior[c]);
      return pick(libres.length ? libres : pool);
    };

    const dias = [];
    let ultimaCenaK = null;
    let prevVerdAlm = null, prevVerdCen = null, prevGrasa = null;
    let prevMM = null, prevMer = null, prevPostre = null, prevProtAlm = null, prevProtCen = null;

    for (let w = 0; w < 4; w++) {
      // Los tres pasos estan acoplados: si los desayunos no entran contra el
      // patron de proteinas, se descarta la semana entera y se vuelve a empezar.
      let semana = null;
      for (let vuelta = 0; vuelta < 300 && !semana; vuelta++) {
        const patron = patronSemana(ultimaCenaK);
        if (!patron) continue;
        const conCarbos = asignarCarbos(patron);
        if (!conCarbos) continue;
        semana = asignarDesayunos(conCarbos, { cenaK: ultimaCenaK });
      }
      if (!semana) throw new Error(`No se pudo armar la semana ${w + 1} con esas reglas`);

      semana.forEach((d, i) => {
        const protAlm = sinRepetir(P.PROT_ALM.filter(p => p.k === d.lunchK), prevProtAlm);
        prevProtAlm = protAlm;
        const verdAlm = sinRepetir(P.VERDURAS, prevVerdAlm); prevVerdAlm = verdAlm;
        const grasa = sinRepetir(P.GRASA_ALM, prevGrasa); prevGrasa = grasa;

        let cena;
        if (d.cena.tipo === 'omelette') {
          const om = pick(P.OMELETTES);
          cena = { tipo: 'omelette', protK: 'huevos', titulo: om.t, corto: om.corto, detalle: om.d, ing: om.ing,
            partes: { omelette: { id: om.id, titulo: om.t, corto: om.corto, detalle: om.d, ing: om.ing } } };
        } else {
          const protCen = sinRepetir(P.PROT_CEN.filter(p => p.k === d.cena.k), prevProtCen);
          prevProtCen = protCen;
          const verdCen = sinRepetir(P.VERDURAS, prevVerdCen); prevVerdCen = verdCen;
          cena = {
            tipo: 'plato', protK: d.cena.k,
            titulo: protCen.t, corto: protCen.corto, verdura: verdCen.t, carbo: d.cenC.t,
            detalle: 'Sin grasa extra: basta el aceite de oliva de las verduras',
            ing: [].concat(protCen.ing, verdCen.ing, d.cenC.ing),
            partes: {
              prot: { id: protCen.id, k: protCen.k, titulo: protCen.t, corto: protCen.corto, ing: protCen.ing },
              verdura: { id: verdCen.id, titulo: verdCen.t, ing: verdCen.ing },
              carbo: { id: d.cenC.id, k: d.cenC.k, titulo: d.cenC.t, ing: d.cenC.ing },
            },
          };
        }

        const postre = sinRepetir(P.POSTRES, prevPostre, 't'); prevPostre = postre;
        const mm = sinRepetir(P.MEDIA_MANANA, prevMM, 't'); prevMM = mm;
        const mer = sinRepetir(P.MERIENDA, prevMer, 't'); prevMer = mer;

        dias.push({
          dia: w * 7 + i + 1,
          semana: w + 1,
          desayuno: { id: d.des.id, titulo: d.des.t, detalle: d.des.d, tags: d.des.tags, ing: d.des.ing },
          mediaManana: { titulo: mm.t, ing: mm.ing },
          almuerzo: {
            titulo: protAlm.t, corto: protAlm.corto, protK: protAlm.k,
            verdura: verdAlm.t, carbo: d.almC.t, carboK: d.almC.k, grasa: grasa.t,
            ing: [].concat(protAlm.ing, verdAlm.ing, d.almC.ing, grasa.ing),
            partes: {
              prot: { id: protAlm.id, k: protAlm.k, titulo: protAlm.t, corto: protAlm.corto, ing: protAlm.ing },
              verdura: { id: verdAlm.id, titulo: verdAlm.t, ing: verdAlm.ing },
              carbo: { id: d.almC.id, k: d.almC.k, titulo: d.almC.t, ing: d.almC.ing },
              grasa: { id: grasa.id, titulo: grasa.t, ing: grasa.ing },
            },
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

  return { generar, fam };
}));
