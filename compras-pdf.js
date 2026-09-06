/* =============================================================================
   El PDF de compras.

   Este documento NO se lee en pantalla: se usa en el mercado, con un lapicero.
   De ahi salen todas sus decisiones y ninguna es decorativa:
   - las secciones van en el orden en que se camina un mercado (verduleria,
     frutas, carnes, lacteos, abarrotes), no en el orden interno del catalogo;
   - la casilla mide 3,4 mm, que es lo que necesita una marca de lapicero;
   - la cantidad va en negrita y alineada a la derecha con una guia punteada,
     porque es el unico dato que se lee de reojo estando parado;
   - dos columnas, para que un mes entre en una hoja.
   ============================================================================= */

// ORDEN_MERCADO vive en nutricion.js: lo comparten la pantalla y el PDF

const TINTA = [16, 26, 44];
const GRIS = [88, 100, 119];
const CLARO = [205, 216, 230];
const ACENTO = [15, 165, 137];

/* Junta los ingredientes de un rango de semanas del programa, ya con los
   platos que Vinz eligio. Se redondea al final, no semana por semana. */
function comprasDeRango(w1, w2) {
  const total = {};
  for (let w = w1; w <= w2; w++) {
    for (let n = (w - 1) * 7 + 1; n <= w * 7; n++) {
      const c = comidasDeDia(n);
      if (!c) continue;
      [c.desayuno, c.mediaManana, c.almuerzo, c.merienda, c.cena, c.postre].forEach(m => {
        (m.ing || []).forEach(([clave, cant]) => { total[clave] = (total[clave] || 0) + cant; });
      });
    }
  }
  const porCat = {};
  Object.entries(total).forEach(([clave, cant]) => {
    const it = MENU.items[clave];
    if (!it) return;
    const c = MenuLib.compraDe(MENU.items, clave, cant);
    (porCat[it.cat] = porCat[it.cat] || []).push({ nombre: it.n, q: c.q, u: c.u });
  });
  Object.values(porCat).forEach(a => a.sort((x, y) => x.nombre.localeCompare(y.nombre, 'es')));
  return porCat;
}

const unidadDe = (q, u) => {
  const par = UNIDADES[u] || ['', ''];
  return q === 1 ? par[0] : par[1];
};

const fechaLarga = ds => new Date(Date.parse(ds + 'T00:00:00Z'))
  .toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'UTC' });

function generarPDF(w1, w2, devolver) {
  if (!MENU || !window.jspdf) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  const MARGEN = 16, ANCHO = 210, ALTO = 297;
  const COLS = [MARGEN, 110];
  const ANCHO_COL = 84;
  const PIE = ALTO - 18;

  const porCat = comprasDeRango(w1, w2);
  const desde = dsDiaG((w1 - 1) * 7 + 1), hasta = dsDiaG(w2 * 7);
  const semanas = w2 - w1 + 1;
  const cuantos = Object.values(porCat).reduce((n, l) => n + l.length, 0);

  let pagina = 0, col = 0, y = 0;

  function cabecera() {
    pagina++;
    doc.setFillColor(255, 255, 255);
    if (pagina === 1) {
      doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...ACENTO);
      doc.text('LISTA PARA COMPRAR', MARGEN, 20, { charSpace: 0.8 });
      doc.setFont('helvetica', 'bold').setFontSize(23).setTextColor(...TINTA);
      doc.text(`${fechaLarga(desde)} al ${fechaLarga(hasta)}`, MARGEN, 31);
      doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...GRIS);
      doc.text(
        `${semanas === 1 ? 'Una semana' : semanas + ' semanas'} del plan de alimentación · ${cuantos} cosas`,
        MARGEN, 37.5
      );
      doc.setDrawColor(...ACENTO).setLineWidth(0.7);
      doc.line(MARGEN, 42, ANCHO - MARGEN, 42);
      y = 52;
    } else {
      doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GRIS);
      doc.text(`Lista para comprar · ${fechaLarga(desde)} al ${fechaLarga(hasta)}`, MARGEN, 16);
      doc.setDrawColor(...CLARO).setLineWidth(0.3);
      doc.line(MARGEN, 19, ANCHO - MARGEN, 19);
      y = 28;
    }
    col = 0;
  }

  function pie() {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GRIS);
    doc.text('Sale del plan de Alexia Macher · protocolo.papelito.online', MARGEN, PIE + 6);
    doc.text(String(pagina), ANCHO - MARGEN, PIE + 6, { align: 'right' });
  }

  /* Pide sitio: cambia de columna, y si no hay, de pagina */
  function sitio(alto) {
    if (y + alto <= PIE) return;
    if (col === 0) { col = 1; y = pagina === 1 ? 52 : 28; return; }
    pie();
    doc.addPage();
    cabecera();
  }

  function seccion(titulo, n) {
    sitio(14);
    const x = COLS[col];
    doc.setFillColor(...ACENTO);
    doc.rect(x, y - 3.1, 2.4, 3.4, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TINTA);
    doc.text(titulo.toUpperCase(), x + 4.6, y, { charSpace: 0.4 });
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GRIS);
    doc.text(String(n), x + ANCHO_COL, y, { align: 'right' });
    y += 5.2;
  }

  function fila(item) {
    sitio(6.4);
    const x = COLS[col];
    const cant = `${item.q} ${unidadDe(item.q, item.u)}`;

    doc.setDrawColor(...CLARO).setLineWidth(0.28);
    doc.rect(x, y - 2.9, 3.4, 3.4);                       // casilla para el lapicero

    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...TINTA);
    const anchoCant = doc.getTextWidth(cant);
    doc.text(cant, x + ANCHO_COL, y, { align: 'right' });

    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...TINTA);
    let nombre = item.nombre;
    const disponible = ANCHO_COL - 5.4 - anchoCant - 4;
    while (doc.getTextWidth(nombre) > disponible && nombre.length > 4) nombre = nombre.slice(0, -2);
    if (nombre !== item.nombre) nombre = nombre.trim() + '…';
    doc.text(nombre, x + 5.4, y);

    // guia punteada entre el nombre y la cantidad
    const desdeX = x + 5.4 + doc.getTextWidth(nombre) + 1.6;
    const hastaX = x + ANCHO_COL - anchoCant - 1.6;
    if (hastaX - desdeX > 3) {
      doc.setDrawColor(...CLARO).setLineWidth(0.25).setLineDashPattern([0.35, 1.1], 0);
      doc.line(desdeX, y - 0.8, hastaX, y - 0.8);
      doc.setLineDashPattern([], 0);
    }
    y += 6.2;
  }

  cabecera();
  ORDEN_MERCADO.forEach(cat => {
    const lista = porCat[cat];
    if (!lista || !lista.length) return;
    seccion(MENU.cats[cat] || cat, lista.length);
    lista.forEach(fila);
    y += 3.4;
  });
  pie();

  const nombre = `Compras ${fechaLarga(desde)} al ${fechaLarga(hasta)}.pdf`.replace(/\s+/g, ' ');
  if (devolver) return { cuantos, semanas, nombre, datos: doc.output('datauristring') };
  doc.save(nombre);
  return { cuantos, semanas, nombre };
}

/* ---------- Botones ---------- */
function montarBotonesPDF() {
  const mes = document.getElementById('pdfMes');
  const sem = document.getElementById('pdfSemana');
  const nota = document.getElementById('pdfNota');
  if (!mes || !sem) return;

  const w = selSemana();
  const listo = !!(MENU && window.jspdf);
  mes.disabled = !listo; sem.disabled = !listo;

  if (listo && nota) {
    const d1 = dsDiaG((w - 1) * 7 + 1), d4 = dsDiaG((w + 3) * 7);
    nota.textContent = `El del mes cubre del ${fechaLarga(d1)} al ${fechaLarga(d4)}. Sale de los platos que elegiste, agrupado por sección del mercado y con casillas para marcar.`;
  }
  mes.onclick = () => generarPDF(w, w + 3);
  sem.onclick = () => generarPDF(w, w);
}
