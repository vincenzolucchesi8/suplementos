/* ============================================================================
   Genera los PNG del icono de la app.

   La marca es una PALTA DE MALLA: la malla de color la genero FLUX en local
   (marca/malla.png) porque esas cintas fluidas no salen de un degradado escrito
   a mano, y la SILUETA va codeada, para que el borde siga limpio a 20 px en vez
   de ensuciarse como se ensucia una imagen generada al achicarla. Las vetas de
   la malla se leen como la pulpa real de una palta; eso no se busco, salio del
   material.

   Se rasteriza en el navegador y no con PIL porque Pillow 9.5 sobre Python 3.12
   revienta en esta maquina, y porque asi el antialias es el mismo que despues
   vera el telefono.

   El maskable de Android se recorta hasta un circulo inscrito: su version lleva
   la figura al 78 % para caber en la zona segura del 80 %.
   ============================================================================ */
const puppeteer = require('C:/Users/vinzl.VINZ/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const MALLA = 'data:image/png;base64,' + fs.readFileSync(path.join(REPO, 'marca', 'malla.png')).toString('base64');

// La lagrima: cuello angosto arriba, panza abajo. Sin el pellizco de arriba la
// forma se lee como huevo frito, que fue el primer intento fallado.
const SILUETA = 'M90 12c19 0 30 24 36 49 7 29 22 47 22 69 0 32-26 54-58 54s-58-22-58-54c0-22 15-40 22-69 6-25 17-49 36-49z';
const TINTA = '#0B1210';
const PEPA = '#F2A33A';

const pagina = (escala) => `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:${TINTA}}svg{display:block}</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <defs><clipPath id="c" clipPathUnits="userSpaceOnUse"><path d="${SILUETA}"/></clipPath></defs>
  <rect width="180" height="180" fill="${TINTA}"/>
  <g transform="translate(90 90) scale(${escala}) translate(-90 -90)">
    <!-- la figura nace tocando el borde de abajo: se encoge y se sube para que
         respire por los dos lados y la mascara squircle no la muerda -->
    <g transform="translate(90 90) scale(.955) translate(-90 -96)">
    <g clip-path="url(#c)"><image href="${MALLA}" x="-14" y="-14" width="208" height="208" preserveAspectRatio="xMidYMid slice"/></g>
    <circle cx="90" cy="118" r="30" fill="${TINTA}"/>
    <circle cx="90" cy="118" r="23" fill="${PEPA}"/>
    </g>
  </g>
</svg>`;

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new', args: ['--window-position=-32000,-32000', '--no-sandbox']
  });
  const salidas = [
    ['icon-180.png', 180, 1],      // apple-touch-icon
    ['icon-192.png', 192, 1],
    ['icon-512.png', 512, 1],
    ['icon-mask.png', 512, 0.78],  // maskable de Android
  ];
  for (const [nombre, px, escala] of salidas) {
    const p = await b.newPage();
    await p.setViewport({ width: 180, height: 180, deviceScaleFactor: px / 180 });
    await p.setContent(pagina(escala), { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 350));
    await p.screenshot({ path: path.join(REPO, nombre) });
    await p.close();
    console.log(nombre, px + 'x' + px, 'escala ' + escala);
  }
  await b.close();
})();
