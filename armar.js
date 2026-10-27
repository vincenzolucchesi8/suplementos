/* Armar el plato con lo que hay en casa.

   El plan de Alexia no es una lista de platos: es un metodo (proteina,
   carbohidrato, verduras, grasa) con porciones fijas. Aqui cada comida del dia
   se puede rearmar por partes: si no hay yogurt, se cambia por otra proteina
   del desayuno y la porcion la pone el plan. Se busca escribiendo (predictivo y
   tolerante a errores), se escribe una lista como en notas, o se dicta.

   Lo armado se guarda por dia y comida en `fecha:AR:D|A|C` (JSON {grupo:[ids]}),
   en la misma estructura que se sincroniza entre aparatos. Mientras no se toque,
   la comida es la del menu. comidasDeDia() lo aplica, asi que las frecuencias
   de la semana, el calendario y la lista de compras cuentan lo que de verdad
   vas a comer. */

(function(){
'use strict';

const ING = {};
function I(id, n, o){ ING[id] = Object.assign({ id, n, a: [] }, o); }
const MANO = 'del tamaño de tu mano abierta';

I('pollo','Pollo',{a:['pechuga','filete de pollo','gallina'],img:'pollo',g:{d:'acomp',a:'prot',c:'prot'},it:[['pollo_filete',2]],
  p:{d:['Lo que entre en 1 wrap integral','deshilachado'],x:['2 filetes medianos','cada uno del tamaño de tu palma']}});
[['pescado','Pescado',['corvina','tilapia','lenguado','caballa','cojinova'],'bonito'],['bonito','Bonito',[],'bonito'],['trucha','Trucha',[],'trucha'],
 ['jurel','Jurel',[],'jurel'],['perico','Perico',[],'perico'],['merluza','Merluza',[],'merluza'],['salmon','Salmón',[],'trucha']
].forEach(([id,n,a,it]) => I(id,n,{a,img:'pescado',g:{a:'prot',c:'prot'},it:[[it,1]],p:{x:['1 filete grande',MANO]}}));
I('res','Carne de res',{a:['bistec','carne','asado','lomo','churrasco'],img:'carne',g:{a:'prot',c:'prot'},it:[['res_filete',1]],p:{x:['1 filete grande','máximo 2 veces por semana']}});
I('atun','Atún al natural',{a:['lata de atun'],img:'atun',huevo:1,g:{a:'prot',c:'prot'},it:[['atun_lata',1],['huevo',1]],p:{x:['1 lata + 1 huevo cocido','el atún escurrido']}});
I('huevo','Huevos',{a:['huevo','omelette','tortilla','revueltos'],img:'revueltos',huevo:1,g:{d:'prot',c:'prot'},it:[['huevo',3]],
  p:{d:['3 huevos','revueltos o en omelette'],c:['3 huevos enteros','en omelette']},no:{a:'En el almuerzo el huevo va solo con el atún'}});
I('yogurt','Yogurt proteico',{a:['yogur','vakimu','quark','skyr'],img:'bowl',g:{d:'prot'},it:[['yogurt_prot',8]],p:{x:['8 cdas grandes','Vakimu PRO o Quark']}});
I('whey','Proteína en polvo',{a:['whey','scoop','batido','proteina'],img:'batido',g:{d:'prot'},it:[['proteina',1]],p:{x:['1 scoop','en batido con 1 vaso grande de leche']}});
I('leche','Leche',{g:{d:'acomp'},it:[['leche',1]],p:{x:['1 vaso grande','para el batido']},pide:'whey'});
I('pavo','Pavo o jamón cocido',{a:['jamon','pavo','fiambre'],g:{d:'acomp'},it:[['pavo_lonchas',2]],p:{x:['2 lonchas','junto con los huevos']},pide:'huevo'});

I('quinoa','Quinoa',{img:'quinoa',g:{a:'carb',c:'carb'},it:[['quinoa',1]],p:{a:['1 taza cocida','como tu puño'],c:['3/4 de taza cocida','un poco menos que tu puño']}});
[['lentejas','Lentejas',['menestra'],'lenteja'],['garbanzos','Garbanzos',[],'garbanzo'],['frejol','Frejol',['frijol','porotos','canario'],'frejol']]
  .forEach(([id,n,a,it]) => I(id,n,{a,img:'menestras',noCena:1,g:{a:'carb',c:'carb'},it:[[it,1]],p:{x:['1 taza cocida','como tu puño']}}));
I('papa','Papa',{a:['papas','papa amarilla','papa blanca','papa huayro'],img:'papa',g:{a:'carb',c:'carb'},it:[['papa',1]],
  p:{a:['1 papa pequeña','como un huevo grande'],c:['Media papa pequeña','como medio huevo']}});
I('camote','Camote',{a:['batata'],img:'camote',noCena:1,g:{a:'carb',c:'carb'},it:[['camote',0.5]],p:{x:['Medio camote mediano','como tu puño']}});
I('noquis','Ñoquis',{a:['noquis','gnocchi'],img:'noquis',g:{a:'carb',c:'carb'},it:[['noquis',1]],p:{a:['1 taza','como tu puño'],c:['3/4 de taza','un poco menos que tu puño']}});
I('wrap','Wrap integral',{a:['tortilla integral','pan arabe'],img:'wrap',soloOmel:1,g:{d:'acomp',c:'carb'},it:[['wrap',1]],p:{d:['1 wrap integral',''],c:['1 wrap','solo si tienes hambre']}});
I('salmas','Salmas',{a:['galletas de arroz'],soloOmel:1,g:{d:'acomp',c:'carb'},it:[['salmas',1]],p:{x:['1 paquete','opcional']}});
I('granola','Granola',{a:['huella verde','amaru'],g:{d:'acomp'},it:[['granola',3]],p:{x:['3 cdas','Huella Verde o Amaru']},pide:'yogurt'});

[['manzana','Manzana',[],['1 manzana',''],'manzana'],['platano','Plátano',['banana','guineo'],['1 plátano',''],'platano'],
 ['mango','Mango',[],['3/4 de taza picado',''],'mango'],['papaya','Papaya',[],['1 porción','como tu puño'],'papaya'],
 ['uvas','Uvas',['uva'],['1 tupper chico',''],'uva'],['mandarina','Mandarina',[],['1 mandarina',''],'mandarina'],
 ['fresas','Fresas',['fresa','frutilla'],['1 porción','como tu puño'],null],['lucuma','Lúcuma',['pulpa de lucuma'],['Pulpa al gusto','en el batido'],'lucuma']
].forEach(([id,n,a,p,it]) => I(id,n,{a,fruta:1,g:{d:'acomp'},it:it?[[it,it==='mango'?0.75:1]]:[],p:{x:p},
  no:{a:'La fruta va en el desayuno o de snack',c:'La fruta va en el desayuno o de snack'}}));

[['lechuga','Lechuga','ensalada',[],'lechuga'],['tomate','Tomate','tomate',[],'tomate'],['pepino','Pepino',null,[],'pepino'],
 ['brocoli','Brócoli','brocoli',[],'brocoli'],['coliflor','Coliflor',null,[],'coliflor'],['zanahoria','Zanahoria',null,[],'zanahoria'],
 ['espinaca','Espinaca','espinaca',[],'espinaca'],['champinones','Champiñones',null,['hongos','champinon'],'champinon'],
 ['vainitas','Vainitas',null,[],'vainita'],['zapallito','Zapallito italiano',null,['zucchini','calabacin'],'zapallito'],
 ['esparragos','Espárragos','esparragos',[],'esparrago'],['betarraga','Betarraga',null,['remolacha'],'betarraga'],
 ['cebolla','Cebolla',null,[],'cebolla'],['pimiento','Pimiento',null,[],null],['caigua','Caigua',null,[],null],['rucula','Rúcula',null,[],'rucula']
].forEach(([id,n,img,a,it]) => I(id,n,{a,img,verd:1,g:{d:'verd',a:'verd',c:'verd'},it:it?[[it,1]]:[],
  p:{d:['Al gusto','dentro del omelette o del wrap'],x:['Un tercio del plato','junta todas las que quieras']}}));

I('palta','Palta',{a:['aguacate'],img:'palta',palta:1,g:{d:'grasa',a:'grasa',c:'grasa'},it:[['palta',0.5]],p:{x:['Media palta pequeña','o un cuarto de una mediana']}});
I('aceitunas','Aceitunas',{a:['aceituna'],img:'aceitunas',g:{a:'grasa'},it:[['aceituna',1]],p:{x:['6 a 8 aceitunas','en la ensalada']}});
I('queso','Mozzarella o gouda',{a:['queso','mozzarella','gouda'],g:{d:'grasa',c:'grasa'},it:[['mozzarella',2]],p:{x:['2 lonchas','']}});
I('mani','Mantequilla de maní',{a:['mani','peanut'],g:{d:'grasa'},it:[['mani',1]],p:{x:['1 cucharadita','natural']}});
I('chia','Chía o linaza',{a:['linaza'],g:{d:'grasa'},it:[['chia',1]],p:{x:['1 cucharada','en el batido']}});
I('aceite','Aceite de oliva',{a:['oliva'],info:'Ya va con las verduras: 1 cucharada'});

I('arroz','Arroz',{a:['arroz integral'],fuera:'No está en tu plan. Usa quinoa, papa o camote'});
I('fideos','Fideos',{a:['pasta','tallarin','spaghetti','tallarines'],fuera:'No está en tu plan. Usa quinoa, papa o ñoquis'});
I('pan','Pan',{a:['pan integral','tostada','pan de molde'],fuera:'No está en tu plan. En el desayuno usa un wrap integral'});
I('avena','Avena',{fuera:'No está en tu plan. En el bowl usa granola'});

/* del insumo del menu al ingrediente del buscador, para partir de lo que dice el plan */
const DESDE_MENU = { pollo_filete:'pollo', pollo_deshila:'pollo', res_filete:'res', lomo_filete:'res', atun_lata:'atun',
  yogurt_prot:'yogurt', proteina:'whey', pavo_lonchas:'pavo', jamon_lonchas:'pavo', lenteja:'lentejas', garbanzo:'garbanzos',
  uva:'uvas', cherry:'tomate', vainita:'vainitas', esparrago:'esparragos', champinon:'champinones', aceituna:'aceitunas',
  mozzarella:'queso', gouda:'queso' };

const LETRA = { Desayuno: 'd', Almuerzo: 'a', Cena: 'c' };
const COMIDAS_AR = ['Desayuno', 'Almuerzo', 'Cena'];
const SLOTS = {
  Desayuno: [['prot','Proteína',1],['acomp','Para acompañar',0],['verd','Verduras',0],['grasa','Grasa',0]],
  Almuerzo: [['prot','Proteína',1],['carb','Carbohidrato',1],['verd','Verduras',1],['grasa','Grasa',1]],
  Cena:     [['prot','Proteína',1],['carb','Carbohidrato',1],['verd','Verduras',1],['grasa','Grasa',0]],
};
const GNOM = { prot:'proteína', carb:'carbohidrato', verd:'verdura', grasa:'grasa', acomp:'cosa para acompañar' };
const MULTI = g => g === 'verd' || g === 'acomp';
const grupoEn = (x, c) => x.g && x.g[LETRA[c]];
const porcion = (x, c) => (x.p && (x.p[LETRA[c]] || x.p.x)) || ['', ''];
const imgDe = x => x && x.img ? `img/${x.img}.webp` : null;
const claveAR = (dia, c) => `${dsDiaG(dia)}:AR:${CLAVE_DE[c]}`;

/* El menu tal cual, sin lo armado encima: es el punto de partida. */
function menuSinArmar(dia){
  const ds = dsDiaG(dia);
  return MenuLib.resolverDia(MENU, dia, k => parseInt(valorDe(`${ds}:MO:${k}`) || '0', 10) || 0);
}
function desdeMenu(m, c){
  const out = {};
  if (!m || !m.ing) return out;
  const ids = m.ing.map(([k]) => DESDE_MENU[k] || k).filter(id => ING[id] && grupoEn(ING[id], c));
  // el atun del almuerzo ya trae su huevo cocido
  const limpio = ids.includes('atun') ? ids.filter(id => id !== 'huevo') : ids;
  limpio.forEach(id => { const g = grupoEn(ING[id], c); if (!(out[g] || []).includes(id)) out[g] = MULTI(g) ? [...(out[g] || []), id] : [id]; });
  return out;
}
function guardado(dia, c){
  const v = valorDe(claveAR(dia, c));
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}
function platoDe(dia, c){
  const g = guardado(dia, c);
  if (g) return g;
  const m = menuSinArmar(dia);
  return m ? desdeMenu(c === 'Desayuno' ? m.desayuno : c === 'Almuerzo' ? m.almuerzo : m.cena, c) : {};
}
function guardar(dia, c, plato){
  setMark(claveAR(dia, c), JSON.stringify(plato));
  refrescar(dia);
}
/* Hoy y, si esta abierto, el dia del calendario: los dos muestran lo mismo */
function refrescar(dia){
  if (typeof sincronizarFrecuencias === 'function') sincronizarFrecuencias(dia);
  render();
  if (typeof pintarHoja === 'function' && typeof hojaPila !== 'undefined' && hojaPila.length) pintarHoja();
}

/* ---------- las reglas del plan, sobre el dia entero ---------- */
const lleva = (plato, flag) => Object.values(plato).flat().some(id => ING[id] && ING[id][flag]);
const otros = (dia, c, flag) => COMIDAS_AR.filter(x => x !== c).some(x => lleva(platoDe(dia, x), flag));
const omelette = plato => (plato.prot || []).includes('huevo');

function bloqueo(x, c, dia, plato){
  if (x.fuera) return x.fuera;
  if (x.info) return x.info;
  const g = grupoEn(x, c);
  if (!g) return (x.no && x.no[LETRA[c]]) || `No va en ${c === 'Cena' ? 'la cena' : 'el ' + c.toLowerCase()}`;
  if (x.huevo && otros(dia, c, 'huevo')) return 'Ya comes huevo hoy: una vez al día';
  if (x.palta && otros(dia, c, 'palta')) return 'Ya comes palta hoy: media al día';
  if (c === 'Cena'){
    const om = omelette(plato) || x.id === 'huevo';
    if (g === 'grasa' && !om) return 'En la cena no va grasa, salvo con omelette';
    if (g === 'carb' && x.noCena) return 'En la cena: quinoa, papa o ñoquis';
    if (g === 'carb' && x.soloOmel && !om) return 'Va solo con el omelette';
    if (g === 'carb' && om && !x.soloOmel) return 'Con omelette, el carbohidrato es wrap o salmas';
  }
  return '';
}
/* Lo que el cambio deja fuera de regla o sin sentido se cae solo: la papa al
   pasar a omelette, la granola cuando se va el yogurt, la leche sin batido. */
function depurar(plato, c, dia){
  const todos = () => Object.values(plato).flat();
  for (let vuelta = 0; vuelta < 2; vuelta++)
    for (const g of Object.keys(plato))
      plato[g] = plato[g].filter(id => !bloqueo(ING[id], c, dia, plato) && (!ING[id].pide || todos().includes(ING[id].pide)));
  return plato;
}
function poner(dia, c, id, reemplaza){
  const plato = JSON.parse(JSON.stringify(platoDe(dia, c)));
  const x = ING[id], g = grupoEn(x, c);
  if (reemplaza) Object.keys(plato).forEach(k => { plato[k] = plato[k].filter(i => i !== reemplaza); });
  plato[g] = MULTI(g) ? [...new Set([...(plato[g] || []), id])] : [id];
  return depurar(plato, c, dia);
}

/* ---------- lo que el resto de la app lee: el plato armado como "comida" ---------- */
function aplicarArmado(r, dia){
  COMIDAS_AR.forEach(c => {
    const plato = guardado(dia, c);
    if (!plato) return;
    const k = c === 'Desayuno' ? 'desayuno' : c === 'Almuerzo' ? 'almuerzo' : 'cena';
    const ids = Object.values(plato).flat();
    const fam = { pollo:'pollo', res:'carne', atun:'atun', huevo:'huevos', pescado:'pescado', bonito:'pescado', trucha:'pescado',
      jurel:'pescado', perico:'pescado', merluza:'pescado', salmon:'pescado' };
    const prot = (plato.prot || [])[0], carb = (plato.carb || [])[0], grasa = (plato.grasa || [])[0];
    const n = id => ING[id].n.toLowerCase();
    const junta = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
    const om = c === 'Cena' && prot === 'huevo';
    // los mismos campos que un plato del menu: asi el calendario, el PDF del
    // menu y la imagen del riel lo leen sin saber que fue armado
    const corto = c === 'Desayuno'
      ? (junta([...(plato.prot || []), ...(plato.acomp || [])].map(n)) || 'Desayuno armado')
      : om ? 'Omelette' + ((plato.verd || []).length ? ' con ' + junta(plato.verd.map(n)) : '')
      : prot ? ING[prot].n : 'Plato armado';
    const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
    const conPorcion = id => { const [p] = porcion(ING[id], c); return `${n(id)} (${p.toLowerCase()})`; };
    r[k] = { ...r[k], id: 'armado', armado: true,
      tipo: om ? 'omelette' : (c === 'Desayuno' ? r[k].tipo : 'plato'),
      titulo: cap(corto), corto: cap(corto), detalle: '',
      protK: fam[prot] || (c === 'Desayuno' ? r[k].protK : undefined),
      carboK: carb ? ({ quinoa:'quinoa', lentejas:'menestras', garbanzos:'menestras', frejol:'menestras' }[carb] || 'otro') : undefined,
      verdura: (plato.verd || []).length ? cap(junta(plato.verd.map(n))) : 'Sin verduras',
      carbo: carb ? cap(conPorcion(carb)) : 'Sin carbohidrato',
      grasa: grasa ? cap(conPorcion(grasa)) : undefined,
      ing: ids.flatMap(i => (ING[i].it || []).map(([key, q]) => [key, c === 'Cena' && grupoEn(ING[i], c) === 'carb' && q === 1 ? 0.75 : q])) };
  });
  return r;
}

/* ---------- el bloque dentro de cada comida de Hoy ---------- */
function bloqueArmado(c, diaPedido){
  const dia = diaPedido || selDia, plato = platoDe(dia, c), tocado = !!guardado(dia, c);
  const el = document.createElement('div');
  el.className = 'ar-plato';
  let primeraVerd = true;
  const filas = SLOTS[c].flatMap(([g]) => (plato[g] || []).map(id => {
    const x = ING[id];
    let cuanto;
    if (g === 'verd' && c !== 'Desayuno'){
      cuanto = primeraVerd ? '<b>Un tercio del plato</b> <span>· todas juntas, con 1 cda de aceite</span>' : '<span>junto con las demás verduras</span>';
      primeraVerd = false;
    } else { const [p, m] = porcion(x, c); cuanto = `<b>${esc(p)}</b>${m ? ` <span>· ${esc(m)}</span>` : ''}`; }
    const im = imgDe(x);
    return `<div class="ar-it">${im ? `<img src="${im}" alt="" loading="lazy">` : '<i class="ar-vacio"></i>'}
      <div><div class="ar-nom">${esc(x.n)}</div><div class="ar-cuanto">${cuanto}</div></div>
      <button type="button" class="ar-cambiar" data-ar-cambiar="${c}|${g}|${id}|${dia}">Cambiar</button></div>`;
  })).join('');
  const falta = SLOTS[c].filter(([g,, r]) => r && !(c === 'Cena' && g === 'carb' && omelette(plato)) && !(plato[g] || []).length).map(([, n]) => n.toLowerCase());
  const regla = c === 'Cena' && !omelette(plato) ? '<p class="ar-regla">Sin grasa en la cena y el carbohidrato en porción menor.</p>' : '';
  el.innerHTML = regla + (filas || '<p class="ar-regla">Todavía no hay nada. Agrega lo que vas a comer.</p>') +
    (falta.length ? `<p class="ar-regla ar-falta">Falta: ${falta.join(', ')}</p>` : '') +
    `<div class="ar-pie"><button type="button" class="ar-agregar" data-ar-abrir="${c}|${dia}">+ Agregar</button>` +
    (tocado ? `<button type="button" class="ar-plan" data-ar-plan="${c}|${dia}">Volver al plan</button>` : '') + `</div>`;
  return el;
}

/* ---------- busqueda predictiva ---------- */
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function lev(a, b){
  const d = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++){ let p = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++){ const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } }
  return d[b.length];
}
/* "agua" encuentra la palta (aguacate), "polo" encuentra pollo */
function puntaje(x, q){
  let best = 0;
  [x.n, ...x.a].forEach((s, i) => {
    const t = norm(s), pen = i ? 6 : 0;
    let v = 0;
    if (t.startsWith(q)) v = 100;
    else if (t.split(/\s+/).some(w => w.startsWith(q))) v = 85;
    else if (t.includes(q)) v = 60;
    else if (q.length >= 4) for (const w of t.split(/\s+/)){
      const d = lev(q, w.slice(0, q.length));
      if (d <= (q.length >= 7 ? 2 : 1)) v = Math.max(v, 45 - d * 5);
    }
    best = Math.max(best, v ? v - pen : 0);
  });
  return best;
}
function resaltar(n, q){
  const i = norm(n).indexOf(q);
  return i < 0 ? esc(n) : esc(n.slice(0, i)) + '<mark>' + esc(n.slice(i, i + q.length)) + '</mark>' + esc(n.slice(i + q.length));
}
const CANT = /^(\d+([.,/]\d+)?|un|una|uno|unos|unas|dos|tres|cuatro|cinco|media|medio|mitad de|un poco de|poco de)\s+/;
function parsear(txt){
  return txt.split(/,|;|\n|\+|\by\b|\bcon\b|\bmas\b|\bmás\b/i).map(t => t.trim()).filter(t => t.length > 1).map(t => {
    const q = norm(t).replace(CANT, '').replace(/^(taza|tazas|cda|cdas|cucharada|cucharadas|filete|filetes|porcion)\s+(de\s+)?/, '').replace(/^(de|del|la|el|los|las)\s+/, '');
    let best = null, bs = 0;
    for (const x of Object.values(ING)){
      const s = Math.max(puntaje(x, q), ...q.split(/\s+/).filter(w => w.length >= 3).map(w => puntaje(x, w) - 10));
      if (s > bs){ bs = s; best = x; }
    }
    return { t, x: bs >= 40 ? best : null };
  });
}

/* ---------- la hoja: buscar, escribir lista o dictar ---------- */
const AR = { dia: null, c: null, forma: 'buscar', q: '', lista: '', cambio: null };
const ICO = {
  buscar: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  lista: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
  voz: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
};
const SUGS = {
  Desayuno: [
    { t:'Bowl de yogurt con granola y manzana', img:'img/platos/d_bowl_manzana.webp', ids:['yogurt','granola','manzana'] },
    { t:'Omelette con espinaca y queso', img:'img/platos/d_omelette_esp.webp', ids:['huevo','espinaca','queso','palta'] },
    { t:'Batido de proteína con plátano', img:'img/platos/d_batido_platano.webp', ids:['whey','leche','chia','platano'] },
    { t:'Huevos revueltos con pavo', img:'img/platos/d_revueltos_pavo.webp', ids:['huevo','pavo','palta','mandarina'] },
  ],
  Almuerzo: [
    { t:'Pescado con quinoa y ensalada', img:'img/pescado.webp', ids:['pescado','quinoa','lechuga','tomate','palta'] },
    { t:'Pollo con papa y brócoli', img:'img/platos/p_pollo_horno.webp', ids:['pollo','papa','brocoli','aceitunas'] },
    { t:'Lomo con lentejas y ensalada', img:'img/platos/p_lomo.webp', ids:['res','lentejas','lechuga','pepino','aceitunas'] },
  ],
  Cena: [
    { t:'Pollo sudado con papa y brócoli', img:'img/platos/p_pollo_sudado.webp', ids:['pollo','papa','brocoli'] },
    { t:'Trucha con quinoa y espárragos', img:'img/platos/p_trucha.webp', ids:['trucha','quinoa','esparragos'] },
    { t:'Omelette con champiñones', img:'img/platos/o_champ.webp', ids:['huevo','champinones','queso'] },
  ],
};
function montarHoja(){
  if (document.getElementById('arHoja')) return;
  document.body.insertAdjacentHTML('beforeend',
    '<div class="ar-velo" id="arVelo"></div><div class="ar-hoja" id="arHoja" role="dialog" aria-modal="true"></div><div class="ar-toast" id="arToast" role="status"></div>');
}
const $ar = s => document.querySelector(s);
let arT; function arToast(t){ const e = $ar('#arToast'); e.textContent = t; e.classList.add('ver'); clearTimeout(arT); arT = setTimeout(() => e.classList.remove('ver'), 2200); }

function itemRes(x, c, q, attr, sinMas){
  const plato = platoDe(AR.dia, c), b = bloqueo(x, c, AR.dia, plato), [p, m] = b ? ['', ''] : porcion(x, c), im = imgDe(x);
  return `<button type="button" class="ar-res" ${attr}="${x.id}" ${b ? 'disabled' : ''}>
    ${im ? `<img src="${im}" alt="">` : '<i class="ar-vacio"></i>'}<div><div class="ar-nom">${q ? resaltar(x.n, q) : esc(x.n)}</div>
    ${b ? `<div class="ar-aviso">${esc(b)}</div>` : `<div class="ar-cuanto"><b>${esc(p)}</b>${m ? ` <span>· ${esc(m)}</span>` : ''}</div>`}</div>
    ${b || sinMas ? '' : '<span class="ar-mas" aria-hidden="true">+</span>'}</button>`;
}
function pintarRes(){
  const c = AR.c, q = norm(AR.q), r = $ar('#arRes'); if (!r) return;
  if (!q){
    const plato = platoDe(AR.dia, c);
    const falta = SLOTS[c].find(([g,, req]) => req && !(plato[g] || []).length) || SLOTS[c].find(([g]) => !(plato[g] || []).length);
    const ops = falta ? Object.values(ING).filter(x => grupoEn(x, c) === falta[0] && !bloqueo(x, c, AR.dia, plato)).slice(0, 8) : [];
    r.innerHTML = (ops.length ? `<p class="ar-sug">Te falta ${GNOM[falta[0]]}. Toca lo que tengas:</p>
      <div class="ar-chips">${ops.map(x => `<button type="button" class="ar-chip" data-ar-add="${x.id}">${esc(x.n)}</button>`).join('')}</div>` : '') +
      `<p class="ar-sug">O usa un plato de tu plan</p><div class="ar-carrusel">${SUGS[c].map((s, i) => `<div class="ar-receta">
        <div class="ar-foto"><img src="${s.img}" alt="" loading="lazy"></div><div class="ar-cuerpo"><h3>${esc(s.t)}</h3>
        <p>${s.ids.map(id => esc(ING[id].n)).join(', ')}</p><button type="button" class="ar-btn" data-ar-sug="${i}">Usar este plato</button></div></div>`).join('')}</div>`;
    return;
  }
  const plato = platoDe(AR.dia, c);
  const res = Object.values(ING).filter(x => puntaje(x, q) > 0)
    .map(x => [x, puntaje(x, q) - (bloqueo(x, c, AR.dia, plato) ? 30 : 0)]).sort((a, b) => b[1] - a[1]).slice(0, 7);
  r.innerHTML = res.length ? `<div class="ar-lista">${res.map(([x]) => itemRes(x, c, q, 'data-ar-add')).join('')}</div>`
    : '<p class="ar-sug">No lo encuentro. Prueba con otro nombre.</p>';
}
function pintarParse(){
  const c = AR.c, p = $ar('#arParse'), b = $ar('#arAddLista'); if (!p) return;
  const plato = platoDe(AR.dia, c), r = parsear(AR.lista), ok = r.filter(i => i.x && !bloqueo(i.x, c, AR.dia, plato));
  p.innerHTML = r.map(i => i.x ? itemRes(i.x, c, '', 'data-x', true) : `<p class="ar-nada">No reconozco «${esc(i.t)}»</p>`).join('');
  p.hidden = !r.length;
  b.disabled = !ok.length;
  b.textContent = ok.length ? `Agregar ${ok.length} ${ok.length === 1 ? 'alimento' : 'alimentos'}` : 'Agregar';
}
function hojaHTML(){
  const c = AR.c, f = AR.forma;
  const cuerpo = f === 'buscar'
    ? `<input class="ar-buscar" id="arQ" type="search" value="${esc(AR.q)}" placeholder="Pollo, quinoa, palta..." autocomplete="off" enterkeyhint="search" aria-label="Buscar ingrediente"><div id="arRes"></div>`
    : `<textarea class="ar-texto" id="arLista" placeholder="Escribe como en notas: 2 huevos, palta y un plátano">${esc(AR.lista)}</textarea>
       <div id="arParse" class="ar-lista" hidden></div><button type="button" class="ar-btn" id="arAddLista" disabled>Agregar</button>`;
  return `<div class="ar-asa"></div>
    <div class="ar-top"><h2>Agregar ${c === 'Desayuno' ? 'al desayuno' : c === 'Almuerzo' ? 'al almuerzo' : 'a la cena'}</h2><button type="button" class="ar-listo" data-ar-cerrar>Listo</button></div>
    <div class="ar-formas">
      <button type="button" class="ar-forma" data-ar-forma="buscar" aria-pressed="${f === 'buscar'}">${ICO.buscar}Buscar</button>
      <button type="button" class="ar-forma" data-ar-forma="lista" aria-pressed="${f === 'lista'}">${ICO.lista}Escribir lista</button>
      <button type="button" class="ar-forma" data-ar-forma="voz" id="arVoz" aria-pressed="false">${ICO.voz}Hablar</button>
    </div>${cuerpo}`;
}
function abrirHoja(html){
  montarHoja();
  $ar('#arHoja').innerHTML = html;
  $ar('#arHoja').classList.add('abierta'); $ar('#arVelo').classList.add('abierto');
}
function rehacer(foco){
  $ar('#arHoja').innerHTML = hojaHTML(); pintarRes(); pintarParse();
  if (foco){ const e = $ar(foco); if (e){ e.focus(); const n = e.value.length; if (e.setSelectionRange) e.setSelectionRange(n, n); } }
}
function abrirAgregar(c){
  AR.c = c; AR.q = ''; AR.lista = ''; AR.cambio = null;
  abrirHoja(hojaHTML()); pintarRes(); pintarParse();
}
function abrirCambio(c, g, id){
  AR.c = c; AR.cambio = id;
  const plato = platoDe(AR.dia, c);
  const alts = Object.values(ING).filter(x => grupoEn(x, c) === g && x.id !== id && !(plato[g] || []).includes(x.id))
    .sort((a, b) => (bloqueo(a, c, AR.dia, plato) ? 1 : 0) - (bloqueo(b, c, AR.dia, plato) ? 1 : 0));
  abrirHoja(`<div class="ar-asa"></div>
    <div class="ar-top"><h2>¿No hay ${esc(ING[id].n.toLowerCase())}?</h2><button type="button" class="ar-listo" data-ar-cerrar>Cerrar</button></div>
    <p class="ar-sub">Cámbialo por otra ${GNOM[g]} que tengas. La cantidad ya viene puesta.</p>
    <div class="ar-lista">${alts.map(x => itemRes(x, c, '', 'data-ar-swap')).join('')}</div>
    <button type="button" class="ar-quitar" data-ar-quitar="${g}|${id}">No lo voy a comer, quitarlo</button>`);
}
function cerrarHoja(){
  pararVoz();
  const h = $ar('#arHoja'); if (!h) return;
  h.classList.remove('abierta'); $ar('#arVelo').classList.remove('abierto');
}

/* ---------- dictar ---------- */
let rec = null;
function pararVoz(){ if (rec){ try { rec.stop(); } catch (e) {} rec = null; } const b = $ar('#arVoz'); if (b) b.classList.remove('grabando'); }
function hablar(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR){ arToast('Este teléfono no deja dictar aquí. Escribe la lista.'); AR.forma = 'lista'; rehacer('#arLista'); return; }
  if (rec){ pararVoz(); return; }
  AR.forma = 'lista'; rehacer();
  const base = AR.lista ? AR.lista + ', ' : '';
  rec = new SR(); rec.lang = 'es-PE'; rec.interimResults = true; rec.continuous = false;
  rec.onresult = e => { AR.lista = base + [...e.results].map(r => r[0].transcript).join(' '); const t = $ar('#arLista'); if (t) t.value = AR.lista; pintarParse(); };
  rec.onend = () => pararVoz();
  rec.onerror = () => { pararVoz(); arToast('No te escuché. Prueba otra vez.'); };
  rec.start(); $ar('#arVoz').classList.add('grabando'); arToast('Te escucho: di lo que vas a comer');
}

/* ---------- toques ---------- */
document.addEventListener('input', e => {
  if (e.target.id === 'arQ'){ AR.q = e.target.value; pintarRes(); }
  if (e.target.id === 'arLista'){ AR.lista = e.target.value; pintarParse(); }
});
document.addEventListener('keydown', e => {
  if (e.target.id === 'arQ' && e.key === 'Enter'){ const b = document.querySelector('#arRes .ar-res:not([disabled])'); if (b) b.click(); }
});
document.addEventListener('click', e => {
  const on = s => e.target.closest(s);
  let t;
  if ((t = on('[data-ar-abrir]'))){ const [c, d] = t.dataset.arAbrir.split('|'); AR.dia = +d; return abrirAgregar(c); }
  if ((t = on('[data-ar-cambiar]'))){ const [c, g, id, d] = t.dataset.arCambiar.split('|'); AR.dia = +d; return abrirCambio(c, g, id); }
  if ((t = on('[data-ar-plan]'))){ const [c, d] = t.dataset.arPlan.split('|'); AR.dia = +d; setMark(claveAR(AR.dia, c), '0'); refrescar(AR.dia); return arToast('Volviste al plato del plan'); }
  if (on('[data-ar-cerrar]') || on('#arVelo')) return cerrarHoja();
  if ((t = on('[data-ar-forma]'))){
    if (t.dataset.arForma === 'voz') return hablar();
    pararVoz(); AR.forma = t.dataset.arForma; return rehacer(AR.forma === 'buscar' ? '#arQ' : '#arLista');
  }
  if ((t = on('[data-ar-add]'))){
    if (t.disabled) return;
    const c = AR.c, id = t.dataset.arAdd, g = grupoEn(ING[id], c), antes = MULTI(g) ? null : (platoDe(AR.dia, c)[g] || [])[0];
    guardar(AR.dia, c, poner(AR.dia, c, id));
    arToast(antes && antes !== id ? `Cambié ${ING[antes].n} por ${ING[id].n}` : `Agregado: ${ING[id].n}`);
    AR.q = ''; return rehacer('#arQ');
  }
  if ((t = on('#arAddLista'))){
    const c = AR.c; let plato = platoDe(AR.dia, c), n = 0;
    parsear(AR.lista).forEach(i => { if (i.x && !bloqueo(i.x, c, AR.dia, plato) && !Object.values(plato).flat().includes(i.x.id)){ setMark(claveAR(AR.dia, c), JSON.stringify(plato)); plato = poner(AR.dia, c, i.x.id); setMark(claveAR(AR.dia, c), JSON.stringify(plato)); n++; } });
    guardar(AR.dia, c, plato); arToast(n ? `Agregué ${n} ${n === 1 ? 'alimento' : 'alimentos'}` : 'Eso ya estaba en tu plato'); AR.lista = ''; return cerrarHoja();
  }
  if ((t = on('[data-ar-sug]'))){
    const c = AR.c; let plato = {};
    setMark(claveAR(AR.dia, c), JSON.stringify(plato));
    SUGS[c][+t.dataset.arSug].ids.forEach(id => { if (!bloqueo(ING[id], c, AR.dia, plato)){ plato = poner(AR.dia, c, id); setMark(claveAR(AR.dia, c), JSON.stringify(plato)); } });
    guardar(AR.dia, c, plato); arToast('Listo, ese es tu plato'); return cerrarHoja();
  }
  if ((t = on('[data-ar-swap]'))){
    if (t.disabled) return;
    const c = AR.c, viejo = AR.cambio, nuevo = t.dataset.arSwap;
    guardar(AR.dia, c, poner(AR.dia, c, nuevo, viejo));
    arToast(`Cambié ${ING[viejo].n} por ${ING[nuevo].n}`); return cerrarHoja();
  }
  if ((t = on('[data-ar-quitar]'))){
    const c = AR.c, [g, id] = t.dataset.arQuitar.split('|');
    const plato = JSON.parse(JSON.stringify(platoDe(AR.dia, c)));
    plato[g] = (plato[g] || []).filter(x => x !== id);
    guardar(AR.dia, c, depurar(plato, c, AR.dia)); arToast(`Quitado: ${ING[id].n}`); return cerrarHoja();
  }
});

// lo unico que el resto de la app necesita ver
window.aplicarArmado = aplicarArmado;
window.bloqueArmado = bloqueArmado;
})();
