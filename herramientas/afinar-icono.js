/* Ajusta tamano y desplazamiento hasta que el numero tenga el mismo aire a los
   dos lados. Mide la TINTA del PNG renderizado, no la metrica de la fuente:
   el letter-spacing negativo y el bearing de cada digito no son simetricos. */
const puppeteer = require('C:/Users/vinzl.VINZ/node_modules/puppeteer-core');
const pg = (fs, dx, dy) => `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@800&display=block" rel="stylesheet">
<style>html,body{margin:0;padding:0}.c{width:180px;height:180px;background:#0E7A5F;position:relative;overflow:hidden}
.n{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
   font-family:'Schibsted Grotesk';font-weight:800;font-size:${fs}px;letter-spacing:-12px;
   color:#F7F8F7;line-height:1;transform:translate(${dx}px,${dy}px)}</style>
<div class="c"><div class="n">84</div></div>`;

const medir = async (p, fs, dx, dy) => {
  await p.setContent(pg(fs, dx, dy), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 180));
  const buf = await p.screenshot({ encoding: 'base64' });
  return await p.evaluate(async b64 => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64;
    await im.decode();
    const cv = new OffscreenCanvas(im.width, im.height), cx = cv.getContext('2d');
    cx.drawImage(im, 0, 0);
    const d = cx.getImageData(0, 0, im.width, im.height).data;
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
      const i = (y * im.width + x) * 4;
      if (d[i] > 200 && d[i + 1] > 200) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const e = im.width / 180;
    return { izq: x0 / e, der: (im.width - 1 - x1) / e, arr: y0 / e, aba: (im.height - 1 - y1) / e };
  }, buf);
};

(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new', args: ['--window-position=-32000,-32000', '--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 180, height: 180, deviceScaleFactor: 2 });
  let mejor = null;
  for (const fs of [134, 138, 142, 146]) {
    let dx = 0, dy = 0;
    for (let i = 0; i < 4; i++) {                    // converge en cuatro pasadas
      const m = await medir(p, fs, dx, dy);
      dx += (m.der - m.izq) / 2; dy += (m.aba - m.arr) / 2;
    }
    const m = await medir(p, fs, dx, dy);
    console.log(`fs=${fs}  dx=${dx.toFixed(2)} dy=${dy.toFixed(2)}  aire izq/der ${m.izq.toFixed(1)}/${m.der.toFixed(1)}  arriba/abajo ${m.arr.toFixed(1)}/${m.aba.toFixed(1)}`);
    if (m.izq >= 5 && m.izq <= 10 && (!mejor || Math.abs(m.izq - 7) < mejor.d)) mejor = { fs, dx, dy, d: Math.abs(m.izq - 7) };
  }
  console.log('\nelegido:', JSON.stringify(mejor));
  await b.close();
})();
