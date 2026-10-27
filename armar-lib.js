/* El catalogo del armado: cada ingrediente del plan de Alexia con su grupo
   por comida, su porcion y lo que suma a la lista de compras.

   Vive aparte de armar.js porque lo leen dos lados: el tablero, que arma el
   plato, y el servidor de avisos, que tiene que poder decir "pollo con quinoa"
   cuando cambiaste la trucha del plan por lo que habia en la refri. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ArmarLib = factory();
}(typeof self !== 'undefined' ? self : this, function () {
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
// un icono propio por ingrediente (img/ing/<id>.webp): antes se usaba el dibujo de un PLATO
// ("Huevos" mostraba revueltos con jamon) y 26 de 54 no tenian ninguno
const imgDe = x => x && x.g ? `img/ing/${x.id}.webp` : null;

/* De un insumo de la lista de compras al ingrediente que se arma con el:
   marcar "Bonito" como comprado dice que hay pescado en casa. */
const DE_COMPRA = {};
Object.values(ING).forEach(x => (x.it || []).slice(0, 1).forEach(([k]) => { if (!DE_COMPRA[k]) DE_COMPRA[k] = []; DE_COMPRA[k].push(x.id); }));

/* El plato en una frase, como se dice en voz alta: lo usa el aviso del
   telefono y el informe. "Pollo con quinoa, brócoli y zanahoria" */
const junta = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
function textoPlato(plato, c) {
  if (!plato) return '';
  const n = id => ING[id] ? ING[id].n.toLowerCase() : id;
  const prot = (plato.prot || []).map(n), resto = [...(plato.carb || []), ...(plato.acomp || []), ...(plato.verd || []), ...(plato.grasa || [])].map(n);
  const cabeza = prot.length ? junta(prot) : resto.shift();
  if (!cabeza) return '';
  const t = resto.length ? `${cabeza} con ${junta(resto)}` : cabeza;
  return t[0].toUpperCase() + t.slice(1);
}

return { ING, DESDE_MENU, DE_COMPRA, LETRA, COMIDAS_AR, SLOTS, GNOM, MULTI, grupoEn, porcion, imgDe, textoPlato, junta };
}));
