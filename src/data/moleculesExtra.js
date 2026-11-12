// 「它在生活中的樣子」補充的 3D 物質(分子圖鑑可看,但不進實驗室任務與測驗)。
// 金屬/合金用 2×2×2 的小晶格示意;稀有氣體是單獨一顆原子;化合物用簡化的單元表示。
const X = { extra: true, lab: false };
const T = (zh, en) => ({ zh, en });
const ION = 'ionic';

const pair = (id, a, b, name, fact, use, d = 1.0, order = 1, kind = ION) => ({
  id, formula: id, name, ...X, atoms: [[a, -d, 0, 0], [b, d, 0, 0]], bonds: [[0, 1, order, kind]], fact, use,
});
const single = (sym, name, fact, use) => ({
  id: 'a-' + sym, formula: sym, display: sym, name, ...X, atoms: [[sym, 0, 0, 0]], bonds: [], fact, use,
});
/** 金屬(或合金):2×2×2 小晶格,邊上用淡藍細線示意「金屬鍵」 */
const cluster = (formula, syms, name, fact, use, s = 1.05) => {
  const atoms = [];
  for (let k = 0; k < 8; k++) {
    const x = k & 1 ? s : -s, y = k & 2 ? s : -s, z = k & 4 ? s : -s;
    atoms.push([syms[(((k & 1) + ((k >> 1) & 1) + ((k >> 2) & 1)) % syms.length)], x, y, z]);
  }
  const bonds = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const d = (i ^ j); if (d === 1 || d === 2 || d === 4) bonds.push([i, j, 1, ION]); }
  return { id: 'm-' + formula, formula, display: formula, name, ...X, atoms, bonds, fact, use };
};
const tet = (k = 0.85) => [[k, k, k], [k, -k, -k], [-k, k, -k], [-k, -k, k]];
const unit = v => { const l = Math.hypot(...v); return v.map(x => x / l); };

// 硫酸 H2SO4:S 在中心,兩個 O 雙鍵、兩個 OH
const h2so4 = (() => {
  const t = tet(), atoms = [['S', 0, 0, 0]], bonds = [];
  t.forEach((p, i) => { atoms.push(['O', ...p]); bonds.push([0, i + 1, i < 2 ? 2 : 1]); });
  [3, 4].forEach(i => { const u = unit(atoms[i].slice(1)); atoms.push(['H', atoms[i][1] + u[0] * 0.96, atoms[i][2] + u[1] * 0.96, atoms[i][3] + u[2] * 0.96]); bonds.push([i, atoms.length - 1, 1]); });
  return { atoms, bonds };
})();
const h3po4 = (() => {
  const t = tet(0.9), atoms = [['P', 0, 0, 0]], bonds = [];
  t.forEach((p, i) => { atoms.push(['O', ...p]); bonds.push([0, i + 1, i === 0 ? 2 : 1]); });
  [2, 3, 4].forEach(i => { const u = unit(atoms[i].slice(1)); atoms.push(['H', atoms[i][1] + u[0] * 0.96, atoms[i][2] + u[1] * 0.96, atoms[i][3] + u[2] * 0.96]); bonds.push([i, atoms.length - 1, 1]); });
  return { atoms, bonds };
})();
const sulfate = metal => {
  const t = tet(), atoms = [['S', 0, 0, 0]], bonds = [];
  t.forEach((p, i) => { atoms.push(['O', ...p]); bonds.push([0, i + 1, i < 2 ? 2 : 1]); });
  const u = unit(atoms[3].slice(1));
  atoms.push([metal, u[0] * 3.2, u[1] * 3.2, u[2] * 3.2]); bonds.push([3, 5, 1, ION]);
  return { atoms, bonds };
};
const MGS = sulfate('Mg'), CUS = sulfate('Cu');
const p4 = (() => { const k = 0.78, atoms = tet(k).map(p => ['P', ...p]); const bonds = []; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) bonds.push([i, j, 1]); return { atoms, bonds }; })();
const s8 = (() => {
  const atoms = [], bonds = [];
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; atoms.push(['S', 2.6 * Math.cos(a), k % 2 ? 0.55 : -0.55, 2.6 * Math.sin(a)]); bonds.push([k, (k + 1) % 8, 1]); }
  return { atoms, bonds };
})();
const al2o3 = { atoms: [['Al', -1.2, 0, 0], ['Al', 1.2, 0, 0], ['O', 0, 0.95, 0], ['O', 0, -0.48, 0.85], ['O', 0, -0.48, -0.85]],
  bonds: [[0, 2, 1, ION], [1, 2, 1, ION], [0, 3, 1, ION], [1, 3, 1, ION], [0, 4, 1, ION], [1, 4, 1, ION]] };
const li2co3 = (() => {
  const r = 1.28, atoms = [['C', 0, 0, 0]], bonds = [];
  for (let k = 0; k < 3; k++) { const a = (k * 2 * Math.PI) / 3 + Math.PI / 2; atoms.push(['O', r * Math.cos(a), r * Math.sin(a), 0]); bonds.push([0, k + 1, k === 0 ? 2 : 1]); }
  [2, 3].forEach(i => { const u = unit(atoms[i].slice(1)); atoms.push(['Li', u[0] * 3.1, u[1] * 3.1, 0]); bonds.push([i, atoms.length - 1, 1, ION]); });
  return { atoms, bonds };
})();
const kno3 = (() => {
  const r = 1.24, atoms = [['N', 0, 0, 0]], bonds = [];
  for (let k = 0; k < 3; k++) { const a = (k * 2 * Math.PI) / 3 + Math.PI / 2; atoms.push(['O', r * Math.cos(a), r * Math.sin(a), 0]); bonds.push([0, k + 1, k === 0 ? 2 : 1]); }
  const u = unit(atoms[2].slice(1)); atoms.push(['K', u[0] * 3.6, u[1] * 3.6, 0]); bonds.push([2, 4, 1, ION]);
  return { atoms, bonds };
})();

export const EXTRA_MOLECULES = [
  // ---- 小分子 ----
  { id: 'HF', formula: 'HF', name: T('氟化氫', 'Hydrogen fluoride'), ...X, atoms: [['H', -0.46, 0, 0], ['F', 0.46, 0, 0]], bonds: [[0, 1, 1]],
    fact: T('氫和氟牽手,溶在水裡會變成能蝕刻玻璃的氫氟酸。', 'Hydrogen holds hands with fluorine. In water it etches glass.'), use: T('用來在玻璃上蝕刻花紋,需要大人在實驗室使用。', 'Used to etch glass, only by experts.') },
  { id: 'Br2', formula: 'Br2', name: T('溴', 'Bromine'), ...X, atoms: [['Br', -1.14, 0, 0], ['Br', 1.14, 0, 0]], bonds: [[0, 1, 1]],
    fact: T('紅棕色的液體,會冒出刺鼻的煙。', 'A red-brown liquid that gives off sharp fumes.'), use: T('用來製造藥品和阻燃劑。', 'Used to make medicines and flame retardants.') },
  { id: 'I2', formula: 'I2', name: T('碘', 'Iodine'), ...X, atoms: [['I', -1.33, 0, 0], ['I', 1.33, 0, 0]], bonds: [[0, 1, 1]],
    fact: T('紫黑色的晶體,加熱會直接變成紫色氣體。', 'Purple-black crystals that turn straight into purple gas.'), use: T('碘酒可以幫傷口消毒;身體需要一點點碘才能製造甲狀腺素。', 'Iodine tincture cleans wounds; your body needs a little iodine.') },
  { id: 'C2F4', formula: 'C2F4', name: T('鐵氟龍的小單元', 'Teflon unit'), ...X,
    atoms: [['C', -0.67, 0, 0], ['C', 0.67, 0, 0], ['F', -1.25, 1.05, 0], ['F', -1.25, -1.05, 0], ['F', 1.25, 1.05, 0], ['F', 1.25, -1.05, 0]],
    bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [1, 4, 1], [1, 5, 1]],
    fact: T('很多這種小單元連成長長的鏈子,就是鐵氟龍,超級滑。', 'Many of these units join into a long chain called Teflon - super slippery.'), use: T('不沾鍋的塗層,煎蛋不會黏。', 'The coating of non-stick pans.') },
  { id: 'NaOH', formula: 'NaOH', name: T('氫氧化鈉', 'Sodium hydroxide'), ...X, atoms: [['Na', -1.9, 0, 0], ['O', 0, 0, 0], ['H', 0.96, 0, 0]], bonds: [[0, 1, 1, ION], [1, 2, 1]],
    fact: T('很強的鹼,會讓皮膚受傷,要小心。', 'A strong base that can hurt skin.'), use: T('製作肥皂、通水管的原料(請大人使用)。', 'Used to make soap and unblock drains (adults only).') },
  { id: 'NaClO', formula: 'NaClO', name: T('次氯酸鈉(漂白水)', 'Sodium hypochlorite (bleach)'), ...X, atoms: [['Na', -2.1, 0.3, 0], ['O', 0, 0, 0], ['Cl', 1.3, 0.85, 0]], bonds: [[0, 1, 1, ION], [1, 2, 1]],
    fact: T('漂白水的主要成分,可以殺死細菌。', 'The main part of bleach, which kills germs.'), use: T('消毒、漂白衣服(不能和別的清潔劑混在一起)。', 'Disinfecting and bleaching (never mix with other cleaners).') },
  { id: 'H2SO4', formula: 'H2SO4', name: T('硫酸', 'Sulfuric acid'), ...X, atoms: h2so4.atoms, bonds: h2so4.bonds,
    fact: T('非常強的酸,會腐蝕東西,絕對不能亂碰。', 'A very strong acid that eats away materials.'), use: T('汽車電池裡有它,工廠也用它做肥料。', 'Found in car batteries and used to make fertilizer.') },
  { id: 'H3PO4', formula: 'H3PO4', name: T('磷酸', 'Phosphoric acid'), ...X, atoms: h3po4.atoms, bonds: h3po4.bonds,
    fact: T('磷在中間,抓著四個氧,其中三個還帶著氫。', 'Phosphorus holds four oxygens, three of them carrying hydrogens.'), use: T('可樂的酸味來源,也用在肥料裡。', 'Gives cola its tang and goes into fertilizer.') },
  { id: 'P4', formula: 'P4', name: T('白磷(磷)', 'White phosphorus'), ...X, atoms: p4.atoms, bonds: p4.bonds,
    fact: T('四個磷原子排成小金字塔。很容易著火,要泡在水裡保存。', 'Four phosphorus atoms in a tiny pyramid. It catches fire easily.'), use: T('磷是火柴頭的原料,也是骨頭和 DNA 需要的元素。', 'Phosphorus is in match heads, bones and DNA.') },
  { id: 'S8', formula: 'S8', name: T('硫磺', 'Sulfur'), ...X, atoms: s8.atoms, bonds: s8.bonds,
    fact: T('八個硫原子連成皺皺的皇冠環,是黃色粉末。', 'Eight sulfur atoms in a crown-shaped ring: a yellow powder.'), use: T('溫泉的味道、火柴和火藥都有它。', 'Found at hot springs, in matches and fireworks.') },
  { id: 'SiO2', formula: 'SiO2', name: T('二氧化矽(沙子、玻璃)', 'Silicon dioxide (sand)'), ...X, atoms: [['Si', 0, 0, 0], ['O', -1.62, 0, 0], ['O', 1.62, 0, 0]], bonds: [[0, 1, 2], [0, 2, 2]],
    fact: T('沙子、水晶和玻璃的主要成分。', 'The main part of sand, quartz and glass.'), use: T('蓋房子的玻璃、水晶球都是它。', 'Window glass and crystal balls.') },
  { id: 'TiO2', formula: 'TiO2', name: T('二氧化鈦', 'Titanium dioxide'), ...X, atoms: [['Ti', 0, 0, 0], ['O', -1.7, 0, 0], ['O', 1.7, 0, 0]], bonds: [[0, 1, 2], [0, 2, 2]],
    fact: T('超級白的粉末,會擋住紫外線。', 'A super-white powder that blocks UV light.'), use: T('白色顏料和防曬乳。', 'White paint and sunscreen.') },
  { id: 'SnO2', formula: 'SnO2', name: T('二氧化錫', 'Tin dioxide'), ...X, atoms: [['Sn', 0, 0, 0], ['O', -1.95, 0, 0], ['O', 1.95, 0, 0]], bonds: [[0, 1, 2], [0, 2, 2]],
    fact: T('透明又能導電的神奇材料。', 'A clear material that can carry electricity.'), use: T('觸控螢幕和太陽能板的透明導電層。', 'The transparent conductor in touchscreens.') },
  { id: 'UO2', formula: 'UO2', name: T('二氧化鈾', 'Uranium dioxide'), ...X, atoms: [['U', 0, 0, 0], ['O', -1.9, 0, 0], ['O', 1.9, 0, 0]], bonds: [[0, 1, 2], [0, 2, 2]],
    fact: T('黑色的陶瓷小顆粒,裡面藏著很大的能量。', 'Small black ceramic pellets full of energy.'), use: T('核能發電廠的燃料(有輻射,只有專家處理)。', 'Nuclear power fuel, handled only by experts.') },
  { id: 'Al2O3', formula: 'Al2O3', name: T('氧化鋁(紅藍寶石)', 'Aluminium oxide (ruby, sapphire)'), ...X, atoms: al2o3.atoms, bonds: al2o3.bonds,
    fact: T('混進一點別的金屬,就變成紅寶石或藍寶石。', 'A pinch of another metal turns it into ruby or sapphire.'), use: T('寶石、砂紙的磨料,鋁表面的保護膜也是它。', 'Gems, sandpaper grit and the skin on aluminium.') },
  { id: 'MgSO4', formula: 'MgSO4', name: T('硫酸鎂(瀉鹽)', 'Magnesium sulfate (Epsom salt)'), ...X, atoms: MGS.atoms, bonds: MGS.bonds,
    fact: T('白色的小晶體,泡在水裡很好溶解。', 'Small white crystals that dissolve in water.'), use: T('泡腳的浴鹽、植物的鎂肥。', 'Bath salts and plant fertilizer.') },
  { id: 'CuSO4', formula: 'CuSO4', name: T('硫酸銅(藍色晶體)', 'Copper sulfate (blue crystals)'), ...X, atoms: CUS.atoms, bonds: CUS.bonds,
    fact: T('美麗的藍色晶體,溶在水裡整杯水都變藍。', 'Beautiful blue crystals that turn water blue.'), use: T('科學實驗長晶體、農場殺菌(有毒,不能吃)。', 'Growing crystals and farm fungicide (poisonous!).') },
  { id: 'Li2CO3', formula: 'Li2CO3', name: T('碳酸鋰', 'Lithium carbonate'), ...X, atoms: li2co3.atoms, bonds: li2co3.bonds,
    fact: T('白色粉末,是做鋰電池的重要原料。', 'A white powder, key for making lithium batteries.'), use: T('手機、電動車的鋰電池。', 'Phone and electric-car batteries.') },
  { id: 'KNO3', formula: 'KNO3', name: T('硝酸鉀', 'Potassium nitrate'), ...X, atoms: kno3.atoms, bonds: kno3.bonds,
    fact: T('白色晶體,含有植物最愛的鉀和氮。', 'White crystals with the potassium and nitrogen plants love.'), use: T('肥料,也是煙火的材料。', 'Fertilizer and an ingredient in fireworks.') },
  // ---- 兩個原子配成對(離子化合物的最小單元) ----
  pair('NaF', 'Na', 'F', T('氟化鈉', 'Sodium fluoride'), T('鈉和氟配成一對。', 'A sodium and a fluorine pair.'), T('牙膏裡的氟,幫牙齒抵抗蛀蟲。', 'The fluoride in toothpaste that protects teeth.'), 1.0),
  pair('KCl', 'K', 'Cl', T('氯化鉀', 'Potassium chloride'), T('像食鹽,不過是鉀和氯配成對。', 'Like salt, but with potassium.'), T('代用鹽、植物肥料。', 'Salt substitute and fertilizer.'), 1.25),
  pair('KI', 'K', 'I', T('碘化鉀', 'Potassium iodide'), T('鉀和碘配成一對。', 'A potassium and an iodine pair.'), T('加碘鹽裡的碘,幫身體製造甲狀腺素。', 'The iodine in iodized salt.'), 1.4),
  pair('AgCl', 'Ag', 'Cl', T('氯化銀', 'Silver chloride'), T('白色粉末,照到光會慢慢變黑。', 'A white powder that slowly darkens in light.'), T('傳統相片的感光材料。', 'Used in old photo paper.'), 1.2),
  pair('AgBr', 'Ag', 'Br', T('溴化銀', 'Silver bromide'), T('照到光就會起變化的淡黃色粉末。', 'A pale powder that changes in light.'), T('傳統底片就是靠它拍出照片。', 'Old camera film used it to take pictures.'), 1.3),
  pair('MgO', 'Mg', 'O', T('氧化鎂', 'Magnesium oxide'), T('鎂在空氣中燃燒,發出刺眼白光後變成的白色粉末。', 'The white ash left when magnesium burns with a dazzling light.'), T('耐高溫的爐子材料、運動員手上的白粉。', 'Heat-proof furnace lining and climbers\' chalk.'), 1.0),
  pair('CaO', 'Ca', 'O', T('氧化鈣(生石灰)', 'Calcium oxide (quicklime)'), T('加水會發熱,冒出熱氣。', 'Adds heat when water is added.'), T('食品乾燥劑,蓋房子也用得到。', 'Food drying packs and building.'), 1.1),
  pair('ZnO', 'Zn', 'O', T('氧化鋅', 'Zinc oxide'), T('白色粉末,可以擋住紫外線。', 'A white powder that blocks UV.'), T('防曬乳、嬰兒痱子粉。', 'Sunscreen and baby powder.'), 1.0),
  pair('PbO', 'Pb', 'O', T('氧化鉛', 'Lead oxide'), T('黃色或紅色的粉末,有毒。', 'A yellow or red powder. Poisonous.'), T('做鉛玻璃和舊式電池,現在盡量少用。', 'Lead glass and old batteries; use is shrinking.'), 1.15),
  pair('HgS', 'Hg', 'S', T('硫化汞(朱砂)', 'Mercury sulfide (cinnabar)'), T('鮮紅色的礦石。', 'A bright red mineral.'), T('古時候的紅色顏料(有毒)。', 'Ancient red pigment (poisonous).'), 1.2),
  pair('WC', 'W', 'C', T('碳化鎢', 'Tungsten carbide'), T('比鋼鐵還硬很多。', 'Much harder than steel.'), T('超硬的鑽頭和刀具,原子筆筆尖。', 'Tough drill bits, cutters and ballpoint tips.'), 1.0, 1, null),
  // ---- 稀有氣體:一顆就夠了 ----
  single('He', T('氦原子', 'Helium atom'), T('只有一顆原子的氣體,不跟別人牽手。', 'A gas of single atoms that never hold hands.'), T('氣球、冷卻醫院的核磁共振儀。', 'Balloons and cooling MRI scanners.')),
  single('Ne', T('氖原子', 'Neon atom'), T('通電會發出紅橘色的光。', 'Glows red-orange with electricity.'), T('霓虹燈招牌。', 'Neon signs.')),
  single('Ar', T('氬原子', 'Argon atom'), T('空氣裡第三多的氣體,非常安靜。', 'The third most common gas in air, very calm.'), T('燈泡裡的保護氣體,不讓燈絲燒壞。', 'Protects light-bulb filaments.')),
  single('Kr', T('氪原子', 'Krypton atom'), T('稀少的氣體,會發出白光。', 'A rare gas that glows white.'), T('攝影用的閃光燈。', 'Photo flash lamps.')),
  single('Xe', T('氙原子', 'Xenon atom'), T('發出很亮的藍白光。', 'Glows with a bright blue-white light.'), T('汽車的氙氣大燈。', 'Xenon car headlights.')),
  // ---- 金屬與合金(小晶格示意) ----
  cluster('Li', ['Li'], T('鋰(金屬)', 'Lithium metal'), T('最輕的金屬,輕到可以浮在水上。', 'The lightest metal, floats on water.'), T('手機和電動車的電池。', 'Phone and car batteries.')),
  cluster('Mg', ['Mg'], T('鎂(金屬)', 'Magnesium metal'), T('燃燒時會發出刺眼的白光。', 'Burns with a dazzling white light.'), T('閃光燈、煙火、輕巧的筆電外殼。', 'Flash bulbs, fireworks and light laptop cases.')),
  cluster('Al', ['Al'], T('鋁(金屬)', 'Aluminium metal'), T('又輕又不容易生鏽的銀白色金屬。', 'A light, rust-proof silvery metal.'), T('鋁罐、鋁箔、飛機。', 'Cans, foil and planes.')),
  cluster('K', ['K'], T('鉀(金屬)', 'Potassium metal'), T('很軟的金屬,遇水會爆出火花。', 'A soft metal that sparks in water.'), T('植物和人體都需要它,香蕉裡也有。', 'Plants and people need it; bananas have it.')),
  cluster('Ti', ['Ti'], T('鈦(金屬)', 'Titanium metal'), T('像鋼鐵一樣強,卻輕得多。', 'As strong as steel yet much lighter.'), T('眼鏡架、飛機、人工關節。', 'Glasses frames, planes and joints.')),
  cluster('Cr', ['Cr'], T('鉻(金屬)', 'Chromium metal'), T('銀亮閃閃,不容易生鏽。', 'Shiny and hard to rust.'), T('水龍頭的電鍍,也是不鏽鋼的成員。', 'Tap plating and a part of stainless steel.')),
  cluster('Fe', ['Fe'], T('鐵(金屬)', 'Iron metal'), T('可以被磁鐵吸住,潮濕會生鏽。', 'Sticks to magnets; rusts when damp.'), T('鋼鐵蓋房子、造橋樑。', 'Steel for buildings and bridges.')),
  cluster('Ni', ['Ni'], T('鎳(金屬)', 'Nickel metal'), T('銀白色,也能被磁鐵吸住。', 'Silver-white and a bit magnetic.'), T('硬幣和電池。', 'Coins and batteries.')),
  cluster('Cu', ['Cu'], T('銅(金屬)', 'Copper metal'), T('紅橘色,很會導電和導熱。', 'Reddish and great at carrying electricity and heat.'), T('電線、銅鍋。', 'Electric wires and pots.')),
  cluster('Zn', ['Zn'], T('鋅(金屬)', 'Zinc metal'), T('藍白色金屬,可以保護鐵不生鏽。', 'A bluish metal that protects iron from rust.'), T('鍍鋅鐵皮、乾電池。', 'Galvanized steel and batteries.')),
  cluster('Ag', ['Ag'], T('銀(金屬)', 'Silver metal'), T('最會導電的金屬,亮晶晶。', 'The best electric conductor, very shiny.'), T('銀飾、餐具。', 'Jewelry and cutlery.')),
  cluster('Sn', ['Sn'], T('錫(金屬)', 'Tin metal'), T('很軟,熔點低,容易融化。', 'Soft and melts easily.'), T('焊錫、馬口鐵罐。', 'Solder and tin cans.')),
  cluster('W', ['W'], T('鎢(金屬)', 'Tungsten metal'), T('熔點最高的金屬,超級耐熱。', 'The metal with the highest melting point.'), T('舊式燈泡裡的燈絲。', 'Old light-bulb filaments.')),
  cluster('Pt', ['Pt'], T('鉑(白金)', 'Platinum metal'), T('銀白、稀有又不容易變色。', 'Rare, silvery and never tarnishes.'), T('白金戒指、汽車廢氣過濾器。', 'Rings and car exhaust cleaners.')),
  cluster('Au', ['Au'], T('金(金屬)', 'Gold metal'), T('金黃色,不會生鏽,很柔軟。', 'Golden, never rusts and very soft.'), T('金飾、電子零件。', 'Jewelry and electronics.')),
  cluster('Hg', ['Hg'], T('汞(水銀)', 'Mercury metal'), T('常溫下是液體的金屬,有毒。', 'A metal that is liquid at room temperature. Toxic.'), T('老式溫度計(現在已經少用了)。', 'Old thermometers (now rare).')),
  cluster('Pb', ['Pb'], T('鉛(金屬)', 'Lead metal'), T('又重又軟,有毒,不能亂碰。', 'Heavy, soft and toxic.'), T('舊式汽車電池。', 'Old car batteries.')),
  cluster('Si', ['Si'], T('矽(晶片)', 'Silicon'), T('像鑽石一樣排成網格的灰色硬物。', 'A hard grey solid, in a diamond-like grid.'), T('電腦和手機裡的晶片。', 'Chips in computers and phones.')),
  cluster('Fe-Cr', ['Fe', 'Cr'], T('不鏽鋼(鐵+鉻)', 'Stainless steel (iron + chromium)'), T('鐵加了鉻,就不容易生鏽。', 'Iron plus chromium resists rust.'), T('鍋子、餐具。', 'Pots and cutlery.')),
  cluster('Fe-Cr-Ni', ['Fe', 'Cr', 'Ni'], T('不鏽鋼(鐵+鉻+鎳)', 'Stainless steel (Fe, Cr, Ni)'), T('再加一點鎳,更亮更耐用。', 'A little nickel makes it shinier and tougher.'), T('廚房水槽、餐具。', 'Sinks and cutlery.')),
  cluster('Cu-Zn', ['Cu', 'Zn'], T('黃銅(銅+鋅)', 'Brass (copper + zinc)'), T('金黃色的合金,聲音很好聽。', 'A golden alloy with a lovely sound.'), T('門把、小喇叭和銅管樂器。', 'Door handles and brass instruments.')),
];
