/* Genera los PNG del icono. Se rasteriza en el navegador y no con PIL por dos
   razones: Pillow 9.5 sobre Python 3.12 revienta al medir texto en esta
   maquina, y aca la webfont esta cargada de verdad, asi que los digitos salen
   en Schibsted Grotesk y no en la letra que el sistema tenga a mano.

   El maskable de Android se recorta hasta un circulo inscrito, asi que su
   version lleva el numero al 76 % para caber en la zona segura del 80 %. */
const puppeteer = require('C:/Users/vinzl.VINZ/node_modules/puppeteer-core');
const REPO = 'C:/Users/vinzl.VINZ/suplementos';

const DX = -6.75, DY = -0.75;  // convergidos midiendo la tinta (afinar.js)
const pagina = (escala) => `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@800&display=block" rel="stylesheet">
<style>
  html,body{margin:0;padding:0;background:#0E7A5F}
  .c{width:180px;height:180px;background:#0E7A5F;position:relative;overflow:hidden}
  .n{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
     font-family:'Schibsted Grotesk';font-weight:800;font-size:${146 * escala}px;
     letter-spacing:${-12 * escala}px;color:#F7F8F7;line-height:1;
     /* medido sobre el PNG, no calculado de la metrica: el letter-spacing deja
        aire despues del ultimo digito y la caja de la fuente deja mas abajo */
     transform:translate(${DX * escala}px, ${DY * escala}px)}
</style>
<div class="c"><div class="n">84</div></div>`;

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new', args: ['--window-position=-32000,-32000', '--no-sandbox']
  });
  const salidas = [
    ['icon-180.png', 180, 1],      // apple-touch-icon
    ['icon-192.png', 192, 1],
    ['icon-512.png', 512, 1],
    ['icon-mask.png', 512, 0.76],  // maskable de Android
  ];
  for (const [nombre, px, escala] of salidas) {
    const p = await b.newPage();
    await p.setViewport({ width: 180, height: 180, deviceScaleFactor: px / 180 });
    await p.setContent(pagina(escala), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 400));
    const usa = await p.evaluate(() => document.fonts.check('800 174px "Schibsted Grotesk"'));
    if (!usa) throw new Error('la webfont no cargo: el numero saldria en otra letra');
    await p.screenshot({ path: REPO + '/' + nombre });
    await p.close();
    console.log(nombre, px + 'x' + px, 'escala ' + escala, '· fuente ok');
  }
  await b.close();
})();
