/* Mide menu.json contra las reglas del PDF de Alexia Macher.
   Es independiente del generador a proposito: no importa platos.js ni
   construir.js, solo lee el JSON y lo audita como lo haria un tercero.

   Uso:  node menu/validar.js      -> sale 0 si pasa, 1 si falla
*/
const fs = require('fs');
const path = require('path');

const M = JSON.parse(fs.readFileSync(path.join(__dirname, 'menu.json'), 'utf8'));
const dias = M.dias;
const fallas = [];
const notas = [];
const falla = (regla, detalle) => fallas.push(`${regla}: ${detalle}`);

const fam = k => (k === 'atun' ? 'pescado' : k);
const catDe = clave => (M.items[clave] || {}).cat;
const ingDelDia = d => []
  .concat(d.desayuno.ing, d.mediaManana.ing, d.almuerzo.ing, d.merienda.ing, d.cena.ing, d.postre.ing);

// ---- 0. Integridad basica
if (dias.length !== 28) falla('Estructura', `se esperaban 28 dias, hay ${dias.length}`);
dias.forEach((d, i) => {
  if (d.dia !== i + 1) falla('Estructura', `el dia en la posicion ${i} dice ${d.dia}`);
  ['desayuno', 'almuerzo', 'cena', 'postre'].forEach(k => {
    if (!d[k] || !d[k].titulo) falla('Estructura', `dia ${d.dia} sin ${k}`);
  });
  ingDelDia(d).forEach(([clave]) => {
    if (!M.items[clave]) falla('Estructura', `dia ${d.dia} usa el insumo desconocido "${clave}"`);
  });
});

// ---- Por semana del programa
for (let w = 1; w <= 4; w++) {
  const sem = dias.filter(d => d.semana === w);
  if (sem.length !== 7) { falla('Estructura', `la semana ${w} tiene ${sem.length} dias`); continue; }

  // 1. Pescado 3 a 4 dias
  const pescado = sem.filter(d => fam(d.almuerzo.protK) === 'pescado' || fam(d.cena.protK) === 'pescado').length;
  if (pescado < 3 || pescado > 4) falla('Pescado 3-4 dias', `semana ${w} tiene ${pescado}`);

  // 2. Menestras o quinoa 2 a 3 dias
  const cereal = sem.filter(d =>
    d.almuerzo.carboK === 'menestras' || d.almuerzo.carboK === 'quinoa' || d.cena.carboK === 'quinoa').length;
  if (cereal < 2 || cereal > 3) falla('Menestras o quinoa 2-3 dias', `semana ${w} tiene ${cereal}`);

  // 4. Carne roja maximo 2 dias
  const carne = sem.filter(d => d.almuerzo.protK === 'carne' || d.cena.protK === 'carne').length;
  if (carne > 2) falla('Carne roja maximo 2', `semana ${w} tiene ${carne}`);

  notas.push(`Semana ${w}: pescado ${pescado} · menestras o quinoa ${cereal} · carne roja ${carne}`);
}

dias.forEach(d => {
  // 3. Las menestras nunca de noche
  if (d.cena.carboK === 'menestras') falla('Menestras nunca de noche', `dia ${d.dia}`);

  // 5. Huevos en una sola toma del dia
  const tomasHuevo = [
    d.desayuno.ing.some(([c]) => c === 'huevo'),
    d.almuerzo.ing.some(([c]) => c === 'huevo'),
    d.cena.ing.some(([c]) => c === 'huevo'),
  ].filter(Boolean).length;
  if (tomasHuevo > 1) falla('Huevos en 1 sola toma', `dia ${d.dia} tiene ${tomasHuevo}`);

  // 6. Verduras en almuerzo y cena todos los dias
  const verdAlm = d.almuerzo.ing.some(([c]) => catDe(c) === 'verduras');
  const verdCen = d.cena.ing.some(([c]) => catDe(c) === 'verduras');
  if (!verdAlm) falla('Verduras en el almuerzo', `dia ${d.dia}`);
  if (!verdCen) falla('Verduras en la cena', `dia ${d.dia}`);

  // 7. Carbo de la cena en porcion reducida
  if (d.cena.tipo === 'plato') {
    const ok = /tres cuartos de taza de quinoa|media papa|tres cuartos de taza de ñoquis/i.test(d.cena.carbo || '');
    if (!ok) falla('Carbo reducido en la cena', `dia ${d.dia}: "${d.cena.carbo}"`);
  }

  // 8. Sin grasa extra en la cena opcion plato
  if (d.cena.tipo === 'plato') {
    const grasa = d.cena.ing.find(([c]) => ['palta', 'aceituna', 'gouda', 'mozzarella'].includes(c));
    if (grasa) falla('Sin grasa extra en la cena', `dia ${d.dia} trae ${grasa[0]}`);
  }

  // 9. Un solo postre al dia
  if (!d.postre || !d.postre.titulo) falla('1 postre al dia', `dia ${d.dia} sin postre`);
  const postresExtra = ['desayuno', 'almuerzo', 'cena'].filter(k => /postre|dulce/i.test(d[k].titulo || ''));
  if (postresExtra.length) falla('1 postre al dia', `dia ${d.dia} trae postre tambien en ${postresExtra.join(', ')}`);
});

// 10. Fruta al menos interdiario
const conFruta = dias.map(d => ingDelDia(d).some(([c]) => catDe(c) === 'frutas'));
conFruta.forEach((v, i) => {
  if (!v && i > 0 && !conFruta[i - 1]) falla('Fruta interdiario', `dias ${i} y ${i + 1} sin fruta`);
});

// 11. La misma proteina no se repite en comidas seguidas
const cadena = [];
dias.forEach(d => {
  const kDes = d.desayuno.ing.some(([c]) => c === 'huevo') ? 'huevos'
    : d.desayuno.ing.some(([c]) => c === 'pollo_deshila') ? 'pollo' : null;
  if (kDes) cadena.push([`dia ${d.dia} desayuno`, kDes]);
  cadena.push([`dia ${d.dia} almuerzo`, d.almuerzo.protK]);
  cadena.push([`dia ${d.dia} cena`, d.cena.protK]);
});
for (let i = 1; i < cadena.length; i++) {
  if (fam(cadena[i][1]) === fam(cadena[i - 1][1])) {
    falla('Sin repetir proteina seguida', `${cadena[i - 1][0]} y ${cadena[i][0]} son ${fam(cadena[i][1])}`);
  }
}

// ---- Informe
console.log('\nMENU DE 28 DIAS · auditoria contra el plan de Alexia Macher\n');
notas.forEach(n => console.log('  ' + n));
console.log('');
if (fallas.length) {
  console.log(`  FALLA con ${fallas.length} incumplimiento(s):\n`);
  fallas.forEach(f => console.log('   - ' + f));
  console.log('');
  process.exit(1);
}
console.log('  PASA las 11 reglas en las 4 semanas.\n');
