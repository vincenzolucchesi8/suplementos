/* =============================================================================
   El informe para la consulta.

   Alexia cerro su plan con tres objetivos textuales para la proxima consulta:
   mantener las 3 ingestas, llegar a 6-8 vasos de agua mas una infusion, y un
   solo postre al dia. El tablero ya tenia esos tres datos y no los sabia
   mostrar. Este documento los pone primero, con sus palabras.

   La decision que lo hace confiable en una consulta: **un dia sin ningun
   registro no cuenta como incumplimiento**. La app no puede distinguir "no lo
   hice" de "no lo marque", y presentar lo segundo como lo primero seria
   mentirle a la nutricionista. Los dias sin registro se informan aparte.
   ============================================================================= */

// Un dia "con registro" es uno donde se marco algo, lo que sea
function diaTieneRegistro(dia) {
  const ds = dsDiaG(dia);
  const claves = Object.keys(localStorage).filter(k => k.startsWith(ds + ':'));
  return claves.length > 0;
}

function resumenDelPeriodo(hasta) {
  const dias = [];
  for (let d = 1; d <= hasta; d++) if (diaTieneRegistro(d)) dias.push(d);
  const sinRegistro = hasta - dias.length;

  const cuenta = (fn) => dias.filter(fn).length;
  const pct = n => dias.length ? Math.round(n / dias.length * 100) : 0;

  // Objetivo 1: las tres ingestas principales
  const tresComidas = cuenta(d => {
    const ds = dsDiaG(d);
    return ['m1', 'm2', 'm3'].every((id, i) =>
      marcado(`${ds}:${['Desayuno', 'Almuerzo', 'Cena'][i]}:${id}`));
  });

  // Objetivo 2: agua e infusion
  const seisVasos = cuenta(d => racionCount(dsDiaG(d), 'agua', 8) >= 6);
  const conInfusion = cuenta(d => racionCount(dsDiaG(d), 'inf', 1) >= 1);
  const totalVasos = dias.reduce((s, d) => s + racionCount(dsDiaG(d), 'agua', 8), 0);
  const promVasos = dias.length ? Math.round(totalVasos / dias.length * 10) / 10 : 0;

  // Objetivo 3: un solo postre al dia (pasarse es incumplir)
  const postreOk = cuenta(d => diaCount(dsDiaG(d), 'P', 'postre', 4) <= 1);

  // Suplementos: adherencia por producto, solo sobre los dias en que tocaba
  const supl = {};
  dias.forEach(d => {
    suplDeDia(d).items.forEach(it => {
      const s = supl[it.name] = supl[it.name] || { tocaba: 0, tomado: 0 };
      s.tocaba++;
      if (marcado(`${dsDiaG(d)}:${it.meal}:${it.id}`)) s.tomado++;
    });
  });

  // Frecuencias por semana del programa
  const semanas = [];
  for (let w = 1; w <= Math.ceil(hasta / 7); w++) {
    const fila = { w, valores: {} };
    SEMANALES.forEach(s => { fila.valores[s.id] = semanaCount(w, 'S', s.id, 9); });
    fila.completa = w * 7 <= hasta;
    semanas.push(fila);
  }

  return {
    dias: dias.length, sinRegistro, desde: dsDiaG(1), hasta: dsDiaG(hasta),
    objetivos: [
      { que: 'Las 3 comidas principales', n: tresComidas, pct: pct(tresComidas),
        nota: 'desayuno, almuerzo y cena' },
      { que: '6 vasos de agua o más', n: seisVasos, pct: pct(seisVasos),
        nota: `${promVasos} vasos al día en promedio` },
      { que: '1 infusión al día', n: conInfusion, pct: pct(conInfusion), nota: '' },
      { que: 'Un solo postre al día', n: postreOk, pct: pct(postreOk),
        nota: 'sin pasarse del permitido' },
    ],
    supl, semanas,
    pesos: pesajes(),
  };
}

function generarInforme(devolver) {
  if (!window.jspdf) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const R = resumenDelPeriodo(diaPrograma);

  const M = 16, ANCHO = 210, PIE = 297 - 18;
  let y = 0;

  // ---- Cabecera
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...ACENTO);
  doc.text('INFORME PARA LA CONSULTA', M, 20, { charSpace: 0.8 });
  doc.setFont('helvetica', 'bold').setFontSize(21).setTextColor(...TINTA);
  doc.text(`${fechaLarga(R.desde)} al ${fechaLarga(R.hasta)}`, M, 30.5);
  doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...GRIS);
  doc.text(
    `${R.dias} día${R.dias === 1 ? '' : 's'} con registro` +
    (R.sinRegistro ? ` · ${R.sinRegistro} sin registrar, que no se cuentan` : ''),
    M, 37);
  doc.setDrawColor(...ACENTO).setLineWidth(0.7);
  doc.line(M, 41.5, ANCHO - M, 41.5);
  y = 53;

  function titulo(t, sub) {
    doc.setFillColor(...ACENTO);
    doc.rect(M, y - 3.1, 2.4, 3.4, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TINTA);
    doc.text(t.toUpperCase(), M + 4.6, y, { charSpace: 0.4 });
    if (sub) {
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GRIS);
      doc.text(sub, ANCHO - M, y, { align: 'right' });
    }
    y += 7;
  }

  // ---- Los tres objetivos, con las palabras de Alexia
  titulo('Objetivos que dejaste para esta consulta', 'del plan del 1 de setiembre');
  const COL_NOTA = M + 60;     // columna fija: medir con una tipografia y
  R.objetivos.forEach(o => {   // escribir con otra hacia que los textos se pisaran
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...TINTA);
    doc.text(o.que, M + 1, y);
    if (o.nota) {
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GRIS);
      doc.text(o.nota, COL_NOTA, y);
    }
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GRIS);
    doc.text(`${o.n} de ${R.dias} días`, ANCHO - M - 24, y, { align: 'right' });

    // La barra dice de un vistazo lo que el numero dice exacto
    const x0 = ANCHO - M - 21, ancho = 12;
    doc.setFillColor(232, 238, 245);
    doc.roundedRect(x0, y - 2.6, ancho, 3.2, 1.6, 1.6, 'F');
    if (o.pct > 0) {
      doc.setFillColor(...ACENTO);
      doc.roundedRect(x0, y - 2.6, Math.max(1.6, ancho * o.pct / 100), 3.2, 1.6, 1.6, 'F');
    }
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...TINTA);
    doc.text(`${o.pct}%`, ANCHO - M, y, { align: 'right' });
    y += 7.4;
  });
  y += 4;

  // ---- Frecuencias de la semana
  titulo('Frecuencia por semana');
  const colW = 15;
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...GRIS);
  R.semanas.forEach((sm, i) => {
    doc.text(`SEM ${sm.w}` + (sm.completa ? '' : ' ·'),
      ANCHO - M - (R.semanas.length - 1 - i) * colW, y - 1.5, { align: 'right', charSpace: 0.3 });
  });
  y += 5;
  SEMANALES.forEach(reg => {
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...TINTA);
    doc.text(reg.name, M + 1, y);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GRIS);
    doc.text(reg.goal.split(' · ')[0], M + 1 + 45, y);
    R.semanas.forEach((sm, i) => {
      const v = sm.valores[reg.id];
      const ok = reg.tipo === 'max' ? v <= reg.meta : v >= reg.meta;
      doc.setFont('helvetica', 'bold').setFontSize(9.5);
      doc.setTextColor(...(sm.completa ? (ok ? ACENTO : [154, 111, 21]) : GRIS));
      doc.text(String(v), ANCHO - M - (R.semanas.length - 1 - i) * colW, y, { align: 'right' });
    });
    y += 6.6;
  });
  y += 4;

  // ---- Peso
  titulo('Peso', 'pesaje de los miércoles, en ayunas');
  if (R.pesos.length) {
    const ini = R.pesos[0], fin = R.pesos[R.pesos.length - 1];
    const delta = Math.round((fin.kg - ini.kg) * 10) / 10;
    doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...TINTA);
    doc.text(`${fin.kg} kg`, M + 1, y + 4);
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...GRIS);
    doc.text(
      R.pesos.length > 1
        ? `${delta > 0 ? '+' : ''}${delta} kg desde el primer pesaje · ${R.pesos.length} pesajes`
        : 'primer pesaje, todavía no hay tendencia',
      M + 40, y + 4);
    y += 12;
  } else {
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...GRIS);
    doc.text('Todavía no registraste ningún pesaje.', M + 1, y);
    y += 8;
  }
  y += 3;

  // ---- Suplementos
  titulo('Suplementos', 'sobre los días en que tocaba');
  Object.entries(R.supl).forEach(([nombre, s]) => {
    const p = s.tocaba ? Math.round(s.tomado / s.tocaba * 100) : 0;
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...TINTA);
    doc.text(nombre, M + 1, y);
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...GRIS);
    doc.text(`${s.tomado} de ${s.tocaba} tomas`, ANCHO - M - 24, y, { align: 'right' });
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...TINTA);
    doc.text(`${p}%`, ANCHO - M, y, { align: 'right' });
    y += 6.4;
  });

  // ---- Pie
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GRIS);
  doc.text('Sale de lo que Vinz marcó en su tablero. Los días sin registro quedan fuera del cálculo. La semana con · sigue en curso.', M, PIE + 6);
  doc.text('protocolo.papelito.online', ANCHO - M, PIE + 6, { align: 'right' });

  const nombre = `Informe consulta ${R.hasta}.pdf`;
  if (devolver) return { nombre, resumen: R, datos: doc.output('datauristring') };
  doc.save(nombre);
  return { nombre, resumen: R };
}

function montarBotonInforme() {
  const btn = document.getElementById('infBtn');
  const nota = document.getElementById('infNota');
  if (!btn) return;
  btn.disabled = !window.jspdf;
  const conRegistro = (() => { let n = 0; for (let d = 1; d <= diaPrograma; d++) if (diaTieneRegistro(d)) n++; return n; })();
  if (nota) {
    nota.textContent = conRegistro
      ? `Cubre tus ${conRegistro} día${conRegistro === 1 ? '' : 's'} con registro, del día 1 a hoy. Los días que no marcaste nada quedan fuera del cálculo, no cuentan como incumplidos.`
      : 'Todavía no hay nada marcado, así que el informe saldría vacío.';
  }
  btn.onclick = () => generarInforme();
}
