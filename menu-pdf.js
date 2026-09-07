/* =============================================================================
   El PDF del menu.

   Distinto del de compras: este no se usa en el mercado sino en la cocina, y
   se lee de pie a un metro de distancia, pegado en la refri. De ahi salen sus
   decisiones: el dia en grande a la izquierda, las tres comidas rotuladas con
   una inicial, y NADA que no se pueda leer sin acercarse.

   La semana va comoda, un dia por bloque. El mes va apretado en dos columnas,
   porque su trabajo es otro: ver la forma del mes y saber que comprar.
   ============================================================================= */

const DOW_PDF = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function generarMenuPDF(desde, hasta, devolver) {
  if (!MENU || !window.jspdf) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  const M = 16, ANCHO = 210, PIE = 297 - 16;
  const dias = [];
  for (let n = desde; n <= hasta; n++) {
    const c = comidasDeDia(n);
    if (c) dias.push({ n, c, ds: dsDiaG(n) });
  }
  if (!dias.length) return;
  const esMes = dias.length > 7;

  const fecha = ds => {
    const f = new Date(Date.parse(ds + 'T00:00:00Z'));
    return { dow: DOW_PDF[f.getUTCDay()], num: f.getUTCDate() };
  };

  // ---- Cabecera
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...ACENTO);
  doc.text(esMes ? 'MENÚ DEL MES' : 'MENÚ DE LA SEMANA', M, 19, { charSpace: 0.8 });
  doc.setFont('helvetica', 'bold').setFontSize(21).setTextColor(...TINTA);
  doc.text(`${fechaLarga(dias[0].ds)} al ${fechaLarga(dias[dias.length - 1].ds)}`, M, 29.5);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GRIS);
  doc.text(`${dias.length} días · plan de Alexia Macher`, M, 35.5);
  doc.setDrawColor(...ACENTO).setLineWidth(0.7);
  doc.line(M, 39.5, ANCHO - M, 39.5);

  function pie() {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GRIS);
    doc.text('Cambia en protocolo.papelito.online y este papel deja de valer.', M, PIE + 5);
    doc.text('protocolo.papelito.online', ANCHO - M, PIE + 5, { align: 'right' });
  }

  /* Una comida: la inicial en el margen y el plato al lado. La inicial hace de
     rotulo sin gastar una linea, que es lo que permite que el mes entre. */
  function comida(letra, texto, x, y, anchoTxt, tam, maxLineas) {
    doc.setFont('helvetica', 'bold').setFontSize(tam - 1.5).setTextColor(...ACENTO);
    doc.text(letra, x, y);
    doc.setFont('helvetica', 'normal').setFontSize(tam).setTextColor(...TINTA);
    let lineas = doc.splitTextToSize(texto, anchoTxt);
    // Quedarse con la primera linea recortaba en silencio los almuerzos largos,
    // que son justo los que traen la verdura y el carbohidrato.
    const tope = maxLineas || 3;
    if (lineas.length > tope) {
      lineas = lineas.slice(0, tope);
      lineas[tope - 1] = lineas[tope - 1].replace(/\s+\S*$/, '') + '…';
    }
    const alto = tam * 0.42;
    lineas.forEach((l, i) => doc.text(l, x + 4.4, y + i * alto));
    return lineas.length * alto;
  }

  if (!esMes) {
    // ---- Semana: un bloque por dia, comodo
    let y = 51;
    dias.forEach(d => {
      const f = fecha(d.ds);
      doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...TINTA);
      doc.text(String(f.num), M, y);
      doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...GRIS);
      doc.text(f.dow.toUpperCase(), M, y + 4.6, { charSpace: 0.4 });

      const x = M + 20, w = ANCHO - M - x - 2;
      let yy = y - 1;
      yy += comida('D', d.c.desayuno.titulo, x, yy, w, 10, 2) + 1.8;
      yy += comida('A', `${d.c.almuerzo.corto || d.c.almuerzo.titulo} · ${d.c.almuerzo.verdura.toLowerCase()} · ${d.c.almuerzo.carbo.toLowerCase()}`, x, yy, w, 10, 2) + 1.8;
      yy += comida('C', d.c.cena.corto || d.c.cena.titulo, x, yy, w, 10, 2);

      const abajo = Math.max(yy + 3.4, y + 18.5);
      doc.setDrawColor(...CLARO).setLineWidth(0.25);
      doc.line(M, abajo, ANCHO - M, abajo);
      y = abajo + 7;
    });
  } else {
    // ---- Mes: dos columnas, catorce filas
    const COLS = [M, 110], W = 84;
    const filas = Math.ceil(dias.length / 2);
    dias.forEach((d, i) => {
      const col = i < filas ? 0 : 1;
      const fila = i % filas;
      const x = COLS[col];
      const y = 51 + fila * 11.6;
      const f = fecha(d.ds);

      doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...TINTA);
      doc.text(String(f.num), x, y);
      doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...GRIS);
      doc.text(f.dow.slice(0, 3), x + (f.num > 9 ? 6.4 : 3.4), y);

      const xt = x + 15, w = W - 15;
      comida('A', d.c.almuerzo.corto || d.c.almuerzo.titulo, xt, y, w, 8.5, 1);
      comida('C', d.c.cena.corto || d.c.cena.titulo, xt, y + 4.6, w, 8.5, 1);

      doc.setDrawColor(238, 243, 249).setLineWidth(0.2);
      doc.line(x, y + 7.6, x + W, y + 7.6);
    });
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GRIS);
    doc.text('A almuerzo · C cena. Los desayunos y los snacks van en el menú de la semana.', M, 51 + filas * 11.6 + 4);
  }

  pie();
  const nombre = `Menú ${fechaLarga(dias[0].ds)} al ${fechaLarga(dias[dias.length - 1].ds)}.pdf`;
  if (devolver) return { nombre, dias: dias.length, datos: doc.output('datauristring') };
  doc.save(nombre);
  return { nombre, dias: dias.length };
}

function montarBotonesMenuPDF() {
  const btn = document.getElementById('pdfMenu');
  if (!btn) return;
  btn.disabled = !(MENU && window.jspdf);
  btn.onclick = () => {
    if (rangoPDF === 'mes') {
      const base = (typeof mesBase === 'number' && mesBase) || 1;
      generarMenuPDF(base, base + 27);
    } else {
      const w = selSemana();
      generarMenuPDF((w - 1) * 7 + 1, w * 7);
    }
  };
}
