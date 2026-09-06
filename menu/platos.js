/* Catalogo de platos del plan de Alexia Macher (PDF 1-09-2026).
   Nada de aca se inventa: cada opcion sale del plan. Lo que varia son las
   preparaciones concretas y las verduras, que el plan deja a eleccion.

   Cada plato declara:
     tags: que cuenta para las reglas de frecuencia
     ing:  ingredientes para la lista de compras, [clave, cantidad]
*/

// ---- Catalogo de insumos: define nombre visible, unidad y seccion de la tienda
const ITEMS = {
  // Carnes y pescado
  pollo_filete:   { n: 'Filete de pollo',            u: 'u',    cat: 'proteina' },
  pollo_deshila:  { n: 'Pollo para deshilachar',     u: 'g',    cat: 'proteina' },
  res_filete:     { n: 'Filete de res',              u: 'u',    cat: 'proteina' },
  lomo_filete:    { n: 'Lomo de res',                u: 'u',    cat: 'proteina' },
  bonito:         { n: 'Bonito en filete',           u: 'u',    cat: 'proteina' },
  trucha:         { n: 'Trucha en filete',           u: 'u',    cat: 'proteina' },
  perico:         { n: 'Perico en filete',           u: 'u',    cat: 'proteina' },
  jurel:          { n: 'Jurel en filete',            u: 'u',    cat: 'proteina' },
  merluza:        { n: 'Merluza en filete',          u: 'u',    cat: 'proteina' },
  atun_lata:      { n: 'Atun al natural (lata)',     u: 'lata', cat: 'proteina' },
  pavo_lonchas:   { n: 'Pavo en lonchas',            u: 'lon',  cat: 'proteina' },
  jamon_lonchas:  { n: 'Jamon cocido en lonchas',    u: 'lon',  cat: 'proteina' },

  // Huevos y lacteos
  huevo:          { n: 'Huevos',                     u: 'u',    cat: 'lacteos' },
  mozzarella:     { n: 'Mozzarella en lonchas',      u: 'lon',  cat: 'lacteos' },
  gouda:          { n: 'Gouda en lonchas',           u: 'lon',  cat: 'lacteos' },
  yogurt_prot:    { n: 'Yogurt proteico (Vakimu PRO o Quark)', u: 'cda', cat: 'lacteos' },
  yogurt_indiv:   { n: 'Yogurt proteico individual', u: 'u',    cat: 'lacteos' },
  leche:          { n: 'Leche',                      u: 'vaso', cat: 'lacteos' },

  // Verduras
  lechuga:        { n: 'Lechuga',                    u: 'porc', cat: 'verduras' },
  tomate:         { n: 'Tomate',                     u: 'u',    cat: 'verduras' },
  pepino:         { n: 'Pepino',                     u: 'u',    cat: 'verduras' },
  cebolla:        { n: 'Cebolla roja',               u: 'u',    cat: 'verduras' },
  rucula:         { n: 'Rucula',                     u: 'porc', cat: 'verduras' },
  cherry:         { n: 'Tomate cherry',              u: 'porc', cat: 'verduras' },
  brocoli:        { n: 'Brocoli',                    u: 'porc', cat: 'verduras' },
  zanahoria:      { n: 'Zanahoria',                  u: 'u',    cat: 'verduras' },
  vainita:        { n: 'Vainitas',                   u: 'porc', cat: 'verduras' },
  zapallito:      { n: 'Zapallito italiano',         u: 'u',    cat: 'verduras' },
  esparrago:      { n: 'Esparragos',                 u: 'porc', cat: 'verduras' },
  coliflor:       { n: 'Coliflor',                   u: 'porc', cat: 'verduras' },
  betarraga:      { n: 'Betarraga',                  u: 'u',    cat: 'verduras' },
  espinaca:       { n: 'Espinaca',                   u: 'porc', cat: 'verduras' },
  champinon:      { n: 'Champinones',                u: 'porc', cat: 'verduras' },
  palta:          { n: 'Palta pequena',              u: 'u',    cat: 'verduras' },
  aceituna:       { n: 'Aceitunas',                  u: 'porc', cat: 'verduras' },
  limon:          { n: 'Limon',                      u: 'u',    cat: 'verduras' },

  // Frutas
  manzana:        { n: 'Manzana',                    u: 'u',    cat: 'frutas' },
  platano:        { n: 'Platano',                    u: 'u',    cat: 'frutas' },
  mango:          { n: 'Mango',                      u: 'u',    cat: 'frutas' },
  uva:            { n: 'Uvas',                       u: 'porc', cat: 'frutas' },
  mandarina:      { n: 'Mandarina',                  u: 'u',    cat: 'frutas' },
  papaya:         { n: 'Papaya',                     u: 'porc', cat: 'frutas' },
  lucuma:         { n: 'Pulpa de lucuma',            u: 'porc', cat: 'frutas' },

  // Abarrotes
  quinoa:         { n: 'Quinoa',                     u: 'taza', cat: 'abarrotes' },
  lenteja:        { n: 'Lentejas',                   u: 'taza', cat: 'abarrotes' },
  garbanzo:       { n: 'Garbanzos',                  u: 'taza', cat: 'abarrotes' },
  frejol:         { n: 'Frejol canario',             u: 'taza', cat: 'abarrotes' },
  papa:           { n: 'Papa pequena',               u: 'u',    cat: 'abarrotes' },
  camote:         { n: 'Camote mediano',             u: 'u',    cat: 'abarrotes' },
  noquis:         { n: 'Noquis',                     u: 'taza', cat: 'abarrotes' },
  wrap:           { n: 'Wrap integral',              u: 'u',    cat: 'abarrotes' },
  salmas:         { n: 'Salmas (paquete)',           u: 'paq',  cat: 'abarrotes' },
  granola:        { n: 'Granola (Huella Verde o Amaru)', u: 'cda', cat: 'abarrotes' },
  proteina:       { n: 'Proteina en polvo',          u: 'scoop',cat: 'abarrotes' },
  chia:           { n: 'Chia o linaza',              u: 'cda',  cat: 'abarrotes' },
  mani:           { n: 'Mantequilla de mani natural',u: 'cdta', cat: 'abarrotes' },
  frutos_secos:   { n: 'Frutos secos',               u: 'pun',  cat: 'abarrotes' },
  chocolate:      { n: 'Chocolate >70% cacao',       u: 'troc', cat: 'abarrotes' },
  barrita:        { n: 'Barrita de proteina',        u: 'u',    cat: 'abarrotes' },
  aceite:         { n: 'Aceite de oliva virgen extra', u: 'cda',cat: 'abarrotes' },
  mayonesa:       { n: 'Mayonesa light',             u: 'pto',  cat: 'abarrotes' },
};

const CATS = {
  proteina:  'Carnes y pescado',
  verduras:  'Verduleria',
  frutas:    'Frutas',
  lacteos:   'Huevos y lacteos',
  abarrotes: 'Abarrotes',
};

// ---- Desayunos: las 6 opciones del plan, con sus variantes de fruta
const DESAYUNOS = [
  { id:'d_omelette_esp',  t:'Omelette de 3 huevos con mozzarella y espinaca',
    d:'Con media palta pequena y 1 paquete de salmas si te provoca',
    tags:['huevos'], ing:[['huevo',3],['mozzarella',2],['espinaca',1],['palta',0.5]] },
  { id:'d_omelette_champ',t:'Omelette de 3 huevos con mozzarella y champinones',
    d:'Con media palta pequena y 1 paquete de salmas si te provoca',
    tags:['huevos'], ing:[['huevo',3],['mozzarella',2],['champinon',1],['palta',0.5]] },
  { id:'d_revueltos_pavo',t:'Huevos revueltos con pavo',
    d:'3 huevos con 2 lonchas de pavo, media palta pequena y 1 fruta',
    tags:['huevos','fruta'], ing:[['huevo',3],['pavo_lonchas',2],['palta',0.5],['manzana',1]] },
  { id:'d_revueltos_jamon',t:'Huevos revueltos con jamon cocido',
    d:'3 huevos con 2 lonchas de jamon, media palta pequena y 1 fruta',
    tags:['huevos','fruta'], ing:[['huevo',3],['jamon_lonchas',2],['palta',0.5],['mandarina',2]] },
  { id:'d_wrap_pollo',    t:'Wrap integral de pollo deshilachado',
    d:'Con media palta, tomate en rodajas, lechuga, 1 punto de mayonesa light y 1 fruta',
    tags:['pollo','fruta'], ing:[['wrap',1],['pollo_deshila',80],['palta',0.5],['tomate',0.5],['lechuga',1],['mayonesa',1],['manzana',1]] },
  { id:'d_batido_platano',t:'Batido de proteina con platano y mani',
    d:'1 vaso grande de leche, 1 scoop de proteina, 1 cda de chia o linaza, 1 platano y 1 cdta de mantequilla de mani',
    tags:['proteina_polvo','fruta'], ing:[['leche',1],['proteina',1],['chia',1],['platano',1],['mani',1]] },
  { id:'d_batido_lucuma', t:'Batido de proteina con lucuma',
    d:'1 vaso grande de leche, 1 scoop de proteina, 1 cda de chia o linaza y pulpa de lucuma al gusto',
    tags:['proteina_polvo','fruta'], ing:[['leche',1],['proteina',1],['chia',1],['lucuma',1]] },
  { id:'d_bowl_mango',    t:'Bowl de yogurt proteico con granola y mango',
    d:'8 cdas de yogurt proteico, 3 cdas de granola y media taza de mango picado',
    tags:['lacteo','fruta'], ing:[['yogurt_prot',8],['granola',3],['mango',0.5]] },
  { id:'d_bowl_manzana',  t:'Bowl de yogurt proteico con granola y manzana',
    d:'8 cdas de yogurt proteico, 3 cdas de granola y 1 manzana picada',
    tags:['lacteo','fruta'], ing:[['yogurt_prot',8],['granola',3],['manzana',1]] },
  { id:'d_bowl_papaya',   t:'Bowl de yogurt proteico con granola y papaya',
    d:'8 cdas de yogurt proteico, 3 cdas de granola y papaya picada',
    tags:['lacteo','fruta'], ing:[['yogurt_prot',8],['granola',3],['papaya',1]] },
];

// ---- Proteinas del almuerzo (metodo del plato, pagina 5 del PDF)
const PROT_ALM = [
  { id:'p_pollo_plancha', k:'pollo',   t:'2 filetes medianos de pollo a la plancha', ing:[['pollo_filete',2]] },
  { id:'p_pollo_horno',   k:'pollo',   t:'2 filetes medianos de pollo al horno con hierbas', ing:[['pollo_filete',2]] },
  { id:'p_pollo_sudado',  k:'pollo',   t:'2 filetes medianos de pollo sudados con tomate y cebolla', ing:[['pollo_filete',2],['tomate',1],['cebolla',0.5]] },
  { id:'p_bonito',        k:'pescado', t:'1 filete grande de bonito a la plancha', ing:[['bonito',1]] },
  { id:'p_trucha',        k:'pescado', t:'1 filete grande de trucha al horno', ing:[['trucha',1]] },
  { id:'p_perico',        k:'pescado', t:'1 filete grande de perico a la plancha', ing:[['perico',1]] },
  { id:'p_jurel',         k:'pescado', t:'1 filete grande de jurel al horno', ing:[['jurel',1]] },
  { id:'p_merluza',       k:'pescado', t:'1 filete grande de merluza al vapor', ing:[['merluza',1]] },
  { id:'p_atun',          k:'atun',    t:'1 lata de atun al natural y 1 huevo cocido', ing:[['atun_lata',1],['huevo',1]] },
  { id:'p_res',           k:'carne',   t:'1 filete grande de res a la plancha', ing:[['res_filete',1]] },
  { id:'p_lomo',          k:'carne',   t:'1 filete grande de lomo a la plancha', ing:[['lomo_filete',1]] },
];

// ---- Proteinas de la cena, opcion plato. Mismas del almuerzo salvo el atun,
//      que trae huevo cocido y lo dejamos para el almuerzo.
const PROT_CEN = PROT_ALM.filter(p => p.k !== 'atun');

// ---- Carbohidratos. En la cena la porcion baja y las menestras no van (pagina 8 y 10)
const CARB_ALM = [
  { id:'c_quinoa',    k:'quinoa',    t:'1 taza de quinoa cocida',        ing:[['quinoa',1]] },
  { id:'c_lentejas',  k:'menestras', t:'1 taza de lentejas cocidas',     ing:[['lenteja',1]] },
  { id:'c_garbanzos', k:'menestras', t:'1 taza de garbanzos cocidos',    ing:[['garbanzo',1]] },
  { id:'c_frejol',    k:'menestras', t:'1 taza de frejol canario cocido',ing:[['frejol',1]] },
  { id:'c_papa',      k:'otro',      t:'1 papa pequena sancochada',      ing:[['papa',1]] },
  { id:'c_camote',    k:'otro',      t:'Medio camote mediano al horno',  ing:[['camote',0.5]] },
  { id:'c_noquis',    k:'otro',      t:'1 taza de noquis',               ing:[['noquis',1]] },
];
const CARB_CEN = [
  { id:'cc_quinoa', k:'quinoa', t:'Tres cuartos de taza de quinoa cocida', ing:[['quinoa',0.75]] },
  { id:'cc_papa',   k:'otro',   t:'Media papa pequena sancochada',         ing:[['papa',0.5]] },
  { id:'cc_noquis', k:'otro',   t:'Tres cuartos de taza de noquis',        ing:[['noquis',0.75]] },
];

// ---- Grasas del almuerzo. En la cena opcion plato NO va grasa extra (pagina 8)
const GRASA_ALM = [
  { id:'g_palta',     t:'Media palta pequena',  ing:[['palta',0.5]] },
  { id:'g_aceitunas', t:'6 a 8 aceitunas',      ing:[['aceituna',1]] },
];

// ---- Verduras: siempre un tercio del plato, con aceite de oliva, limon y sal
const VERDURAS = [
  { id:'v_mixta',     t:'Ensalada de lechuga, tomate y pepino',            ing:[['lechuga',1],['tomate',1],['pepino',0.5],['aceite',1],['limon',0.5]] },
  { id:'v_criolla',   t:'Ensalada criolla de cebolla, tomate y limon',     ing:[['cebolla',0.5],['tomate',1],['limon',1],['aceite',1]] },
  { id:'v_brocoli',   t:'Brocoli y zanahoria al vapor',                    ing:[['brocoli',1],['zanahoria',1],['aceite',1]] },
  { id:'v_zapallito', t:'Zapallito italiano y vainitas salteados',         ing:[['zapallito',1],['vainita',1],['aceite',1]] },
  { id:'v_rucula',    t:'Ensalada de rucula, tomate cherry y pepino',      ing:[['rucula',1],['cherry',1],['pepino',0.5],['aceite',1]] },
  { id:'v_esparrago', t:'Esparragos y zanahoria al horno',                 ing:[['esparrago',1],['zanahoria',1],['aceite',1]] },
  { id:'v_coliflor',  t:'Coliflor al horno con hojas verdes',              ing:[['coliflor',1],['lechuga',1],['aceite',1]] },
  { id:'v_betarraga', t:'Ensalada de betarraga rallada, lechuga y pepino', ing:[['betarraga',1],['lechuga',1],['pepino',0.5],['aceite',1]] },
  { id:'v_espinaca',  t:'Espinaca salteada con champinones',               ing:[['espinaca',1],['champinon',1],['aceite',1]] },
];

// ---- Cena opcion omelette (pagina 8)
const OMELETTES = [
  { id:'o_champ',   t:'Omelette de 3 huevos con champinones',
    d:'Con media palta pequena. Si tienes hambre, 1 wrap integral o 1 paquete de salmas',
    ing:[['huevo',3],['champinon',1],['palta',0.5]] },
  { id:'o_espinaca',t:'Omelette de 3 huevos con espinaca y tomate',
    d:'Con 2 lonchas de gouda. Si tienes hambre, 1 wrap integral o 1 paquete de salmas',
    ing:[['huevo',3],['espinaca',1],['tomate',1],['gouda',2]] },
  { id:'o_verduras',t:'Omelette de 3 huevos con zapallito y tomate',
    d:'Con media palta pequena. Si tienes hambre, 1 wrap integral o 1 paquete de salmas',
    ing:[['huevo',3],['zapallito',1],['tomate',1],['palta',0.5]] },
];

// ---- Postre: 1 al dia y el plan recomienda gastarlo en la cena
const POSTRES = [
  { t:'1 trocito de chocolate >70%', ing:[['chocolate',1]] },
  { t:'1 dulce o postre, el que se te antoje', ing:[] },
];

// ---- Snacks opcionales (paginas 4 y 7)
const MEDIA_MANANA = [
  { t:'1 fruta y 1 punado de frutos secos (12 a 15 unidades)', ing:[['manzana',1],['frutos_secos',1]] },
  { t:'1 trocito de chocolate >70% y 1 punado de frutos secos', ing:[['chocolate',1],['frutos_secos',1]] },
  { t:'1 yogurt proteico individual de sabor', ing:[['yogurt_indiv',1]] },
  { t:'1 cafe o infusion con 1 trocito de chocolate >70%', ing:[['chocolate',1]] },
];
const MERIENDA = [
  { t:'1 yogurt proteico de sabor', ing:[['yogurt_indiv',1]] },
  { t:'1 fruta y 1 barrita de proteina', ing:[['uva',1],['barrita',1]] },
  { t:'Preentreno: 1 platano', ing:[['platano',1]] },
  { t:'Preentreno: bowl de yogurt proteico con granola y medio platano', ing:[['yogurt_prot',6],['granola',3],['platano',0.5]] },
  { t:'Preentreno: jugo de lucuma con leche', ing:[['lucuma',1],['leche',0.5]] },
];

module.exports = {
  ITEMS, CATS, DESAYUNOS, PROT_ALM, PROT_CEN, CARB_ALM, CARB_CEN,
  GRASA_ALM, VERDURAS, OMELETTES, POSTRES, MEDIA_MANANA, MERIENDA,
};
