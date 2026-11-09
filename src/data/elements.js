// [原子序, 符號, 中文名, 英文名, 原子量]
const RAW = [
[1,'H','氫','Hydrogen',1.008],[2,'He','氦','Helium',4.0026],[3,'Li','鋰','Lithium',6.94],[4,'Be','鈹','Beryllium',9.0122],
[5,'B','硼','Boron',10.81],[6,'C','碳','Carbon',12.011],[7,'N','氮','Nitrogen',14.007],[8,'O','氧','Oxygen',15.999],
[9,'F','氟','Fluorine',18.998],[10,'Ne','氖','Neon',20.18],[11,'Na','鈉','Sodium',22.99],[12,'Mg','鎂','Magnesium',24.305],
[13,'Al','鋁','Aluminium',26.982],[14,'Si','矽','Silicon',28.085],[15,'P','磷','Phosphorus',30.974],[16,'S','硫','Sulfur',32.06],
[17,'Cl','氯','Chlorine',35.45],[18,'Ar','氬','Argon',39.948],[19,'K','鉀','Potassium',39.098],[20,'Ca','鈣','Calcium',40.078],
[21,'Sc','鈧','Scandium',44.956],[22,'Ti','鈦','Titanium',47.867],[23,'V','釩','Vanadium',50.942],[24,'Cr','鉻','Chromium',51.996],
[25,'Mn','錳','Manganese',54.938],[26,'Fe','鐵','Iron',55.845],[27,'Co','鈷','Cobalt',58.933],[28,'Ni','鎳','Nickel',58.693],
[29,'Cu','銅','Copper',63.546],[30,'Zn','鋅','Zinc',65.38],[31,'Ga','鎵','Gallium',69.723],[32,'Ge','鍺','Germanium',72.63],
[33,'As','砷','Arsenic',74.922],[34,'Se','硒','Selenium',78.971],[35,'Br','溴','Bromine',79.904],[36,'Kr','氪','Krypton',83.798],
[37,'Rb','銣','Rubidium',85.468],[38,'Sr','鍶','Strontium',87.62],[39,'Y','釔','Yttrium',88.906],[40,'Zr','鋯','Zirconium',91.224],
[41,'Nb','鈮','Niobium',92.906],[42,'Mo','鉬','Molybdenum',95.95],[43,'Tc','鎝','Technetium',98],[44,'Ru','釕','Ruthenium',101.07],
[45,'Rh','銠','Rhodium',102.91],[46,'Pd','鈀','Palladium',106.42],[47,'Ag','銀','Silver',107.87],[48,'Cd','鎘','Cadmium',112.41],
[49,'In','銦','Indium',114.82],[50,'Sn','錫','Tin',118.71],[51,'Sb','銻','Antimony',121.76],[52,'Te','碲','Tellurium',127.6],
[53,'I','碘','Iodine',126.9],[54,'Xe','氙','Xenon',131.29],[55,'Cs','銫','Caesium',132.91],[56,'Ba','鋇','Barium',137.33],
[57,'La','鑭','Lanthanum',138.91],[58,'Ce','鈰','Cerium',140.12],[59,'Pr','鐠','Praseodymium',140.91],[60,'Nd','釹','Neodymium',144.24],
[61,'Pm','鉕','Promethium',145],[62,'Sm','釤','Samarium',150.36],[63,'Eu','銪','Europium',151.96],[64,'Gd','釓','Gadolinium',157.25],
[65,'Tb','鋱','Terbium',158.93],[66,'Dy','鏑','Dysprosium',162.5],[67,'Ho','鈥','Holmium',164.93],[68,'Er','鉺','Erbium',167.26],
[69,'Tm','銩','Thulium',168.93],[70,'Yb','鐿','Ytterbium',173.05],[71,'Lu','鎦','Lutetium',174.97],[72,'Hf','鉿','Hafnium',178.49],
[73,'Ta','鉭','Tantalum',180.95],[74,'W','鎢','Tungsten',183.84],[75,'Re','錸','Rhenium',186.21],[76,'Os','鋨','Osmium',190.23],
[77,'Ir','銥','Iridium',192.22],[78,'Pt','鉑','Platinum',195.08],[79,'Au','金','Gold',196.97],[80,'Hg','汞','Mercury',200.59],
[81,'Tl','鉈','Thallium',204.38],[82,'Pb','鉛','Lead',207.2],[83,'Bi','鉍','Bismuth',208.98],[84,'Po','釙','Polonium',209],
[85,'At','砈','Astatine',210],[86,'Rn','氡','Radon',222],[87,'Fr','鍅','Francium',223],[88,'Ra','鐳','Radium',226],
[89,'Ac','錒','Actinium',227],[90,'Th','釷','Thorium',232.04],[91,'Pa','鏷','Protactinium',231.04],[92,'U','鈾','Uranium',238.03],
[93,'Np','錼','Neptunium',237],[94,'Pu','鈽','Plutonium',244],[95,'Am','鋂','Americium',243],[96,'Cm','鋦','Curium',247],
[97,'Bk','鉳','Berkelium',247],[98,'Cf','鉲','Californium',251],[99,'Es','鑀','Einsteinium',252],[100,'Fm','鐨','Fermium',257],
[101,'Md','鍆','Mendelevium',258],[102,'No','鍩','Nobelium',259],[103,'Lr','鐒','Lawrencium',266],[104,'Rf','鑪','Rutherfordium',267],
[105,'Db','𨧀','Dubnium',268],[106,'Sg','𨭎','Seaborgium',269],[107,'Bh','𨨏','Bohrium',270],[108,'Hs','𨭆','Hassium',277],
[109,'Mt','䥑','Meitnerium',278],[110,'Ds','鐽','Darmstadtium',281],[111,'Rg','錀','Roentgenium',282],[112,'Cn','鎶','Copernicium',285],
[113,'Nh','鉨','Nihonium',286],[114,'Fl','鈇','Flerovium',289],[115,'Mc','鏌','Moscovium',290],[116,'Lv','鉝','Livermorium',293],
[117,'Ts','鿬','Tennessine',294],[118,'Og','鿫','Oganesson',294],
];

export const CATEGORIES = {
  nonmetal:   { color: '#7ee8a2', zh: '非金屬', en: 'Nonmetal',
    desc: { zh: '不是金屬的元素,摸起來不閃亮、不太會導電。我們呼吸的氧、水裡的氫、鉛筆芯的碳都是非金屬,它們是生命的基本材料!', en: 'Elements that are not metals: not shiny and they do not carry electricity well. Oxygen we breathe, hydrogen in water and carbon in pencils are nonmetals - the building blocks of life!' } },
  noble:      { color: '#c9a7ff', zh: '稀有氣體', en: 'Noble gas',
    desc: { zh: '最「害羞」的氣體家族,幾乎不跟別人牽手(不起反應)。氦氣讓氣球飄起來,氖氣讓招牌發光!', en: 'The shy gas family: they almost never bond with others. Helium lifts balloons and neon makes signs glow!' } },
  alkali:     { color: '#ff8a80', zh: '鹼金屬', en: 'Alkali metal',
    desc: { zh: '又軟又活潑的金屬,軟到可以用刀切,遇到水會噗噗冒泡甚至爆炸!像鈉(食鹽裡有它)、鉀。', en: 'Soft, super-active metals you can cut with a knife. In water they fizz or even explode! Like sodium (in table salt) and potassium.' } },
  alkaline:   { color: '#ffb36b', zh: '鹼土金屬', en: 'Alkaline earth',
    desc: { zh: '比鹼金屬穩重一點的金屬家族,像鈣(骨頭和牙齒)、鎂(煙火的亮白光)。', en: 'Metals a bit calmer than the alkali family, like calcium (bones and teeth) and magnesium (bright white fireworks).' } },
  transition: { color: '#7cc4ff', zh: '過渡金屬', en: 'Transition metal',
    desc: { zh: '我們最熟悉的硬金屬,又硬又亮又會導電。鐵、銅、金、銀都在這一家,可以做成房子、電線和珠寶!', en: 'The hard, shiny metals we know best. Iron, copper, gold and silver are here - used for buildings, wires and jewelry!' } },
  post:       { color: '#9fd6c9', zh: '貧金屬', en: 'Post-transition metal',
    desc: { zh: '比較軟、熔點比較低的金屬,像鋁(鋁罐、鋁箔紙)、錫、鉛。', en: 'Softer metals that melt more easily, like aluminum (cans and foil), tin and lead.' } },
  metalloid:  { color: '#e6e07a', zh: '類金屬', en: 'Metalloid',
    desc: { zh: '一半像金屬、一半像非金屬的「混血兒」。矽就是它,電腦和手機的晶片都靠它!', en: 'Half metal, half nonmetal! Silicon is one - computer and phone chips are made from it.' } },
  halogen:    { color: '#ffe066', zh: '鹵素', en: 'Halogen',
    desc: { zh: '很愛搶別人電子的活潑元素,會跟金屬變成鹽。氯可以幫游泳池殺菌,氟會保護牙齒。', en: 'Active elements that love grabbing electrons and make salts with metals. Chlorine cleans pools and fluorine protects teeth.' } },
  lanthanide: { color: '#f7a8d8', zh: '鑭系', en: 'Lanthanide',
    desc: { zh: '一群長得很像的稀土金屬,手機螢幕和強力磁鐵會用到它們。', en: 'A group of similar rare-earth metals used in phone screens and strong magnets.' } },
  actinide:   { color: '#e58bb0', zh: '錒系', en: 'Actinide',
    desc: { zh: '很重、大多帶有放射性的金屬,像鈾(核能發電的燃料)。很多是人造的,要小心使用!', en: 'Heavy, mostly radioactive metals like uranium (fuel for nuclear power). Many are man-made and must be handled carefully!' } },
};

function category(z) {
  if ([1, 6, 7, 8, 15, 16, 34].includes(z)) return 'nonmetal';
  if ([2, 10, 18, 36, 54, 86, 118].includes(z)) return 'noble';
  if ([3, 11, 19, 37, 55, 87].includes(z)) return 'alkali';
  if ([4, 12, 20, 38, 56, 88].includes(z)) return 'alkaline';
  if ([9, 17, 35, 53, 85, 117].includes(z)) return 'halogen';
  if ([5, 14, 32, 33, 51, 52].includes(z)) return 'metalloid';
  if (z >= 57 && z <= 71) return 'lanthanide';
  if (z >= 89 && z <= 103) return 'actinide';
  if ([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116].includes(z)) return 'post';
  return 'transition';
}

/** 週期表座標 [row, col]:row 1-7 為主表, 9/10 為鑭系/錒系列 */
function position(z) {
  if (z === 1) return [1, 1];
  if (z === 2) return [1, 18];
  if (z <= 10) return [2, z <= 4 ? z - 2 : z + 8];          // 3,4 → 1,2 ; 5..10 → 13..18
  if (z <= 18) return [3, z <= 12 ? z - 10 : z];            // 11,12 → 1,2 ; 13..18 → 13..18
  if (z <= 36) return [4, z - 18];
  if (z <= 54) return [5, z - 36];
  if (z <= 56) return [6, z - 54];                          // 55,56
  if (z <= 71) return [9, z - 57 + 3];                      // 鑭系 15 個,從第 3 欄開始
  if (z <= 86) return [6, z - 72 + 4];
  if (z <= 88) return [7, z - 86];
  if (z <= 103) return [10, z - 89 + 3];                    // 錒系
  return [7, z - 104 + 4];
}

// 副殼層填充順序 [n, l]
const ORDER = [[1,0],[2,0],[2,1],[3,0],[3,1],[4,0],[3,2],[4,1],[5,0],[4,2],[5,1],[6,0],[4,3],[5,2],[6,1],[7,0],[5,3],[6,2],[7,1]];
const SHELL_EXC = {
  24:[2,8,13,1],29:[2,8,18,1],41:[2,8,18,12,1],42:[2,8,18,13,1],44:[2,8,18,15,1],45:[2,8,18,16,1],46:[2,8,18,18],
  47:[2,8,18,18,1],57:[2,8,18,18,9,2],58:[2,8,18,19,9,2],64:[2,8,18,25,9,2],78:[2,8,18,32,17,1],79:[2,8,18,32,18,1],
  89:[2,8,18,32,18,9,2],90:[2,8,18,32,18,10,2],91:[2,8,18,32,20,9,2],92:[2,8,18,32,21,9,2],93:[2,8,18,32,22,9,2],
  96:[2,8,18,32,25,9,2],103:[2,8,18,32,32,8,3],
};
function shells(z) {
  if (SHELL_EXC[z]) return SHELL_EXC[z];
  let left = z; const out = [];
  for (const [n, l] of ORDER) {
    if (left <= 0) break;
    const put = Math.min(left, 2 * (2 * l + 1));
    out[n - 1] = (out[n - 1] || 0) + put; left -= put;
  }
  return out.map(x => x || 0);
}

const CPK = { H:'#ffffff', C:'#5a5a5a', N:'#3050f8', O:'#ff2a2a', F:'#90e050', Cl:'#1ff01f', S:'#ffee33', P:'#ff8000',
  Na:'#ab5cf2', Mg:'#8aff00', Ca:'#3dff00', Fe:'#e06633', K:'#8f40d4', Cu:'#c88033', Zn:'#7d80b0', Au:'#ffd123', Ag:'#d0d0d0',
  He:'#d9ffff', Ne:'#b3e3f5', Ar:'#80d1e3', Br:'#a62929', I:'#940094', Al:'#bfa6a6', Si:'#f0c8a0', Li:'#cc80ff', B:'#ffb5b5' };
const RADIUS = { H:0.42, He:0.5, C:0.72, N:0.68, O:0.66, F:0.6, Cl:0.9, S:0.88, P:0.88, Na:1.0, K:1.15, Ca:1.05, Mg:0.95, Fe:0.85, Cu:0.8,
  Si:0.85, Al:0.9, Li:0.8, Zn:0.8, Ag:0.85, Au:0.85, Br:0.95, I:1.05, Ne:0.55, Ar:0.75 };

// 趣味小知識:[中文知識, 中文用途, 英文] (用途可省略 → 長度 2)
const FACTS = {
  H: ['宇宙裡最多、最輕的元素!太陽就是靠氫變成氦在發光。', '氫氣可以讓氣球飄起來,也能當燃料電池的能量來源。', 'The most common element in the universe. The Sun shines by turning hydrogen into helium.'],
  He: ['吸了氦氣聲音會變成唐老鴨!它比空氣輕,也不會燒起來。', '用來灌氣球、冷卻醫院的核磁共振儀。', 'Breathe it in and your voice sounds like a duck! Lighter than air and never burns.'],
  Li: ['最輕的金屬,輕到可以浮在水上。', '手機和電動車的電池都靠它。', 'The lightest metal. It powers phone and electric car batteries.'],
  C: ['鉛筆芯和鑽石都是碳,排列方式不同就差好多!', '所有生物都含有碳,碳是生命的骨架。', 'Pencil lead and diamond are both carbon, just arranged differently. Carbon is the backbone of life.'],
  N: ['空氣有 78% 是氮氣。', '植物需要氮才能長得綠油油,肥料裡就有它。', '78% of air is nitrogen. Plants need it to grow, so fertilizer contains it.'],
  O: ['我們呼吸靠它!空氣約有 21% 是氧氣。', '火要燃燒也需要氧氣,所以蓋住蠟燭火就熄了。', 'We breathe it! Fire needs oxygen too, so covering a candle puts it out.'],
  F: ['牙膏裡的氟可以讓牙齒更堅固,防蛀牙。', '它是最活潑的非金屬元素。', 'Fluoride in toothpaste makes teeth stronger. It is the most reactive nonmetal.'],
  Ne: ['霓虹燈的紅橙色光就是氖氣發出來的。', '氖幾乎不跟別的元素交朋友。', 'The red-orange glow of neon signs! It almost never makes compounds.'],
  Na: ['食鹽的一半是鈉。純鈉丟進水裡會劇烈冒泡!', '鈉是很軟的銀色金屬,可以用刀切開。', 'Half of table salt. Pure sodium fizzes wildly in water!'],
  Mg: ['煙火和閃光燈裡的白亮光來自鎂燃燒。', '葉綠素的中心就是鎂原子。', 'Burning magnesium makes brilliant white light. Chlorophyll has a magnesium atom at its center.'],
  Al: ['鋁罐、鋁箔紙都是它,又輕又不容易生鏽。', '地殼中最多的金屬元素。', "Cans and foil are aluminium: light and rust-resistant. The most common metal in Earth's crust."],
  Si: ['沙子和玻璃的主角,電腦晶片也是矽做的!', '台灣的半導體產業就靠它。', 'Sand, glass and computer chips are made from silicon.'],
  P: ['火柴頭裡有磷,摩擦就會點燃。', '骨頭和牙齒需要磷,DNA 也含有磷。', 'Match heads contain phosphorus. Bones, teeth and DNA need it too.'],
  S: ['溫泉的特殊味道和火山口黃色結晶都是硫。', '硫黃曾被用來做火藥和橡膠硬化。', 'Hot-spring smell and yellow volcano crystals are sulfur.'],
  Cl: ['游泳池消毒用的氯,和鈉結合就變成食鹽。', '單獨的氯氣是有毒的黃綠色氣體。', 'Pools are disinfected with chlorine; with sodium it makes salt. Chlorine gas itself is toxic.'],
  Ar: ['燈泡裡充的氣體,保護燈絲不被燒壞。', '空氣裡排第三多的氣體。', 'Filled in light bulbs to protect the filament. The third most common gas in air.'],
  K: ['香蕉含有很多鉀,對肌肉和心臟很重要。', '鉀比鈉更活潑,碰水會燒起紫色火焰。', 'Bananas are rich in potassium, which muscles and hearts need.'],
  Ca: ['骨頭、牙齒、貝殼和蛋殼都含有鈣,多喝牛奶補充鈣!', '石灰岩和粉筆也是鈣的化合物。', 'Bones, teeth, shells and eggshells contain calcium. Drink milk!'],
  Ti: ['又輕又強壯,眼鏡框和人工關節常用鈦。', 'Strong and light: used in glasses frames and artificial joints.'],
  Cr: ['讓水龍頭亮晶晶的電鍍就是鉻,不鏽鋼也含鉻。', 'Chrome plating makes faucets shine, and stainless steel contains chromium.'],
  Fe: ['地球核心主要是鐵,血液裡的血紅素也含鐵。', '鐵碰到水和空氣會生鏽。', "Earth's core is mostly iron, and so is the heart of your blood's hemoglobin. Iron rusts in damp air."],
  Ni: ['硬幣和不鏽鋼裡常見的銀白色金屬。', 'A silvery metal in coins and stainless steel.'],
  Cu: ['紅色的金屬,導電很好,電線都用銅。', '銅製的硬幣表面久了會變綠色(銅綠)。', 'A red metal that conducts electricity well, so wires use copper.'],
  Zn: ['鍍在鐵上防止生鏽(鍍鋅),也是乾電池的材料。', 'Coats iron against rust (galvanizing) and is used in batteries.'],
  Br: ['常溫下是紅棕色液體的非金屬,味道很刺鼻。', 'One of only two elements that are liquid at room temperature (with mercury).'],
  Kr: ['有些閃光燈和雷射使用氪氣。', 'Used in some flash lamps and lasers.'],
  Ag: ['導電導熱最好的金屬,也拿來做飾品與餐具。', 'The best conductor of heat and electricity; used for jewelry and cutlery.'],
  Sn: ['罐頭的「馬口鐵」就是鐵皮鍍上一層錫。', 'Tin cans are iron coated with a thin layer of tin.'],
  I: ['碘酒用來消毒傷口,海帶富含碘。', 'Iodine disinfects cuts, and seaweed is rich in it.'],
  Xe: ['汽車的亮白色氙氣大燈。', 'Makes the bright white light of xenon car headlights.'],
  W: ['熔點最高的金屬,老式燈泡的燈絲就是鎢。', 'The highest melting point of any metal: old light-bulb filaments.'],
  Pt: ['珍貴又不易變質的白金,常用在首飾與催化器。', 'Precious and non-reactive; used in jewelry and catalytic converters.'],
  Au: ['黃澄澄的黃金,幾乎不會生鏽,幾千年前的金飾依然閃亮。', 'Shiny gold hardly ever tarnishes, so ancient gold still gleams.'],
  Hg: ['唯一常溫下是液體的金屬,但有毒,舊式溫度計裡有它。', 'The only metal that is liquid at room temperature, but toxic.'],
  Pb: ['又重又軟的金屬,但對身體有害,現在很少用了。', 'Heavy and soft but harmful to health, so it is rarely used now.'],
  U: ['核能發電的燃料。', 'Fuel for nuclear power plants.'],
};

export const ELEMENTS = RAW.map(([z, sym, zh, en, mass]) => {
  const cat = category(z);
  const [row, col] = position(z);
  const f = FACTS[sym];
  const sh = shells(z);
  return {
    z, sym, name: { zh, en }, mass, cat, row, col,
    shells: sh,
    color: CPK[sym] || CATEGORIES[cat].color,
    radius: RADIUS[sym] ?? (0.5 + 0.06 * sh.length),
    fact: f ? { zh: f[0], en: f[f.length - 1] } : null,
    // 英文版把「知識+用途」寫成同一句放在 fact,所以 use 的英文留空(不重複顯示)
    use: f && f.length === 3 ? { zh: f[1], en: '' } : null,
  };
});

export const BY_SYMBOL = Object.fromEntries(ELEMENTS.map(e => [e.sym, e]));
export const BY_Z = Object.fromEntries(ELEMENTS.map(e => [e.z, e]));
