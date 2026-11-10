// 分子資料:atoms [符號, x, y, z](單位≈埃),bonds [i, j, 鍵級, 'ionic'?]
// lab: true → 可在「分子實驗室」組出來; labPair → 以此圖形(骨架)比對
const TET = 0.629; // 甲烷 C-H 1.09 Å / √3

function autoBonds(atoms, maxD, minD = 0.5, order = 1) {
  const b = [];
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
    const d = Math.hypot(atoms[i][1] - atoms[j][1], atoms[i][2] - atoms[j][2], atoms[i][3] - atoms[j][3]);
    if (d >= minD && d <= maxD) b.push([i, j, order]);
  }
  return b;
}

function glucose() {
  const atoms = [], bonds = [];
  const add = (s, x, y, z) => { atoms.push([s, x, y, z]); return atoms.length - 1; };
  const R = 1.45, ring = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3, y = k % 2 ? -0.25 : 0.25;
    ring.push(add(k === 5 ? 'O' : 'C', R * Math.cos(a), y, R * Math.sin(a)));
  }
  for (let k = 0; k < 6; k++) bonds.push([ring[k], ring[(k + 1) % 6], 1]);
  // 取代基:C1~C4 各接 -OH 和 -H,C5 接 CH2OH 和 -H
  const upDown = [1, -1, 1, -1];
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI) / 3, cx = Math.cos(a), cz = Math.sin(a), cy = atoms[ring[k]][2];
    const s = k < 4 ? upDown[k] : 1;
    const x = atoms[ring[k]][1], z = atoms[ring[k]][3], y = atoms[ring[k]][2];
    if (k < 4) {
      const o = add('O', x + cx * 0.75, y + s * 1.05, z + cz * 0.75); bonds.push([ring[k], o, 1]);
      const h = add('H', x + cx * 1.25, y + s * 1.4, z + cz * 1.25); bonds.push([o, h, 1]);
      const h2 = add('H', x + cx * 0.55, y - s * 0.9, z + cz * 0.55); bonds.push([ring[k], h2, 1]);
    } else {
      const c6 = add('C', x + cx * 0.8, y + 1.2, z + cz * 0.8); bonds.push([ring[k], c6, 1]);
      const o6 = add('O', x + cx * 1.6, y + 1.75, z + cz * 1.6); bonds.push([c6, o6, 1]);
      const ho = add('H', x + cx * 2.35, y + 1.45, z + cz * 2.35); bonds.push([o6, ho, 1]);
      const h61 = add('H', x + cx * 0.6 + cz * 0.8, y + 1.7, z + cz * 0.6 - cx * 0.8); bonds.push([c6, h61, 1]);
      const h62 = add('H', x + cx * 0.6 - cz * 0.8, y + 1.7, z + cz * 0.6 + cx * 0.8); bonds.push([c6, h62, 1]);
      const h5 = add('H', x + cx * 0.55, y - 0.9, z + cz * 0.55); bonds.push([ring[k], h5, 1]);
    }
  }
  return { atoms, bonds };
}

function diamond() {
  const D = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], s = 0.889;
  const atoms = [['C', 0, 0, 0]], bonds = [];
  D.forEach((d, i) => {
    atoms.push(['C', d[0] * s, d[1] * s, d[2] * s]); bonds.push([0, atoms.length - 1, 1]);
    const parent = atoms.length - 1;
    D.forEach((e, j) => {
      if (j === i) return;
      atoms.push(['C', (d[0] - e[0]) * s, (d[1] - e[1]) * s, (d[2] - e[2]) * s]);
      bonds.push([parent, atoms.length - 1, 1]);
    });
  });
  return { atoms, bonds };
}

function graphite() {
  const a = 1.42, atoms = [];
  const pts = [];
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
    const ox = a * Math.sqrt(3) * (i + j / 2), oz = a * 1.5 * j;
    pts.push([ox, oz], [ox, oz + a]);
  }
  pts.filter(p => Math.hypot(p[0], p[1] - a / 2) < 3.3).forEach(p => atoms.push(['C', p[0], 0, p[1] - a / 2]));
  return { atoms, bonds: autoBonds(atoms, 1.5, 1.2) };
}

function nacl() {
  const atoms = [], d = 1.4;
  for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++)
    atoms.push([(x + y + z) % 2 ? 'Cl' : 'Na', (x - 0.5) * d * 1.9, (y - 0.5) * d * 1.9, (z - 0.5) * d * 1.9]);
  return { atoms, bonds: autoBonds(atoms, d * 1.9 + 0.1, 1).map(b => [b[0], b[1], 1, 'ionic']) };
}

const G = glucose(), DIA = diamond(), GRA = graphite(), NAC = nacl();

export const MOLECULES = [
  { id: 'H2', formula: 'H2', name: { zh: '氫氣', en: 'Hydrogen gas' }, lab: true,
    atoms: [['H', -0.37, 0, 0], ['H', 0.37, 0, 0]], bonds: [[0, 1, 1]],
    fact: { zh: '兩個氫原子手牽手,是宇宙中最輕的氣體。', en: 'Two hydrogen atoms holding hands: the lightest gas of all.' },
    use: { zh: '燃料電池車的燃料,燃燒後只會變成水!', en: 'Fuel-cell car fuel. It burns into plain water!' } },
  { id: 'O2', formula: 'O2', name: { zh: '氧氣', en: 'Oxygen gas' }, lab: true,
    atoms: [['O', -0.6, 0, 0], ['O', 0.6, 0, 0]], bonds: [[0, 1, 2]],
    fact: { zh: '兩個氧原子用「雙鍵」抓得緊緊的。', en: 'Two oxygen atoms joined by a double bond.' },
    use: { zh: '我們每一口呼吸都需要它,火也需要它才會燃燒。', en: 'Every breath needs it, and fire needs it to burn.' } },
  { id: 'O3', formula: 'O3', name: { zh: '臭氧', en: 'Ozone' }, lab: true,
    atoms: [['O', 0, 0, 0], ['O', -1.09, -0.67, 0], ['O', 1.09, -0.67, 0]], bonds: [[0, 1, 2], [0, 2, 1]],
    fact: { zh: '三個氧原子彎彎的排在一起,有一點特別的味道。', en: 'Three oxygen atoms in a bent shape, with a sharp smell.' },
    use: { zh: '高空的臭氧層像大雨傘,幫我們擋住太陽的紫外線。', en: 'The ozone layer is a giant umbrella blocking the Sun\'s UV rays.' } },
  { id: 'N2', formula: 'N2', name: { zh: '氮氣', en: 'Nitrogen gas' }, lab: true,
    atoms: [['N', -0.55, 0, 0], ['N', 0.55, 0, 0]], bonds: [[0, 1, 3]],
    fact: { zh: '兩個氮原子用「三鍵」緊緊相連,非常穩定。', en: 'Two nitrogen atoms joined by a very strong triple bond.' },
    use: { zh: '佔空氣的 78%;洋芋片包裝充氮氣,可以保持酥脆。', en: '78% of air. Chip bags are filled with it to stay crunchy.' } },
  { id: 'H2O', formula: 'H2O', name: { zh: '水', en: 'Water' }, lab: true,
    atoms: [['O', 0, 0, 0], ['H', -0.757, 0.586, 0], ['H', 0.757, 0.586, 0]], bonds: [[0, 1, 1], [0, 2, 1]],
    fact: { zh: '一個氧原子加兩個氫原子,像一張小小的笑臉。', en: 'One oxygen and two hydrogens, like a tiny smiley face.' },
    use: { zh: '生命的泉源!我們身體約有 60% 是水。', en: 'The source of life! About 60% of your body is water.' } },
  { id: 'H2O2', formula: 'H2O2', name: { zh: '雙氧水(過氧化氫)', en: 'Hydrogen peroxide' }, lab: true,
    atoms: [['O', -0.73, 0, 0], ['O', 0.73, 0, 0], ['H', -1.05, 0.85, 0.25], ['H', 1.05, -0.25, 0.85]], bonds: [[0, 1, 1], [0, 2, 1], [1, 3, 1]],
    fact: { zh: '比水多一個氧原子。', en: 'Water with one extra oxygen.' },
    use: { zh: '稀釋後可以幫傷口消毒、漂白衣服(請大人幫忙使用)。', en: 'Diluted, it disinfects and bleaches (ask a grown-up).' } },
  { id: 'CO2', formula: 'CO2', name: { zh: '二氧化碳', en: 'Carbon dioxide' }, lab: true,
    atoms: [['C', 0, 0, 0], ['O', -1.16, 0, 0], ['O', 1.16, 0, 0]], bonds: [[0, 1, 2], [0, 2, 2]],
    fact: { zh: '一個碳原子抱著兩個氧原子,排成一直線。', en: 'A carbon atom holding two oxygens in a straight line.' },
    use: { zh: '汽水的氣泡就是它!植物也用它來做光合作用。', en: 'The bubbles in soda! Plants use it for photosynthesis.' } },
  { id: 'CO', formula: 'CO', name: { zh: '一氧化碳', en: 'Carbon monoxide' }, lab: false,
    atoms: [['C', -0.56, 0, 0], ['O', 0.56, 0, 0]], bonds: [[0, 1, 3]],
    fact: { zh: '燃燒不完全時會產生,無色無味但有毒。', en: 'Made when fuel burns incompletely. Colorless, odorless and poisonous.' },
    use: { zh: '使用瓦斯熱水器要保持通風,避免中毒。', en: 'Keep rooms ventilated when using gas heaters.' } },
  { id: 'NH3', formula: 'NH3', name: { zh: '氨(阿摩尼亞)', en: 'Ammonia' }, lab: true,
    atoms: [['N', 0, 0, 0], ['H', 0.94, -0.33, 0], ['H', -0.47, -0.33, 0.81], ['H', -0.47, -0.33, -0.81]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]],
    fact: { zh: '一個氮原子加三個氫原子,像一座小金字塔。', en: 'A nitrogen with three hydrogens, shaped like a little pyramid.' },
    use: { zh: '用來製造肥料,味道很刺鼻。', en: 'Used to make fertilizer. It has a sharp smell.' } },
  { id: 'CH4', formula: 'CH4', name: { zh: '甲烷', en: 'Methane' }, lab: true,
    atoms: [['C', 0, 0, 0], ['H', TET, TET, TET], ['H', TET, -TET, -TET], ['H', -TET, TET, -TET], ['H', -TET, -TET, TET]],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
    fact: { zh: '一個碳原子被四個氫原子圍住,形狀像小金字塔(正四面體)。', en: 'A carbon surrounded by four hydrogens in a tetrahedron.' },
    use: { zh: '天然氣的主要成分,家裡煮飯的瓦斯就是它。', en: 'The main part of natural gas, used for cooking.' } },
  { id: 'HCl', formula: 'HCl', name: { zh: '氯化氫(鹽酸)', en: 'Hydrogen chloride' }, lab: true,
    atoms: [['H', -0.64, 0, 0], ['Cl', 0.64, 0, 0]], bonds: [[0, 1, 1]],
    fact: { zh: '溶在水裡就是鹽酸,我們的胃液裡也有它!', en: 'Dissolved in water it is hydrochloric acid, which is also in your stomach!' },
    use: { zh: '幫助胃消化食物(濃度很低);工廠用來清除鐵鏽。', en: 'Helps digest food; factories use it to remove rust.' } },
  { id: 'NaCl', formula: 'NaCl', name: { zh: '食鹽(氯化鈉)', en: 'Table salt' }, lab: true,
    labPair: { atoms: ['Na', 'Cl'], bonds: [[0, 1]] },
    atoms: NAC.atoms, bonds: NAC.bonds,
    fact: { zh: '鈉和氯整齊地交錯排列成方塊晶體。', en: 'Sodium and chlorine alternate in a neat cubic crystal.' },
    use: { zh: '每天的調味料。鈉遇水會爆炸,氯有毒,結合後卻很安全!', en: 'Our everyday seasoning. Sodium and chlorine are dangerous alone, yet safe together!' } },
  { id: 'C2H5OH', formula: 'C2H5OH', name: { zh: '酒精(乙醇)', en: 'Ethanol' }, lab: true,
    atoms: [['C', -1.2, -0.25, 0], ['C', 0.25, 0.2, 0], ['O', 1.2, -0.8, 0], ['H', -1.3, -0.9, 0.89], ['H', -1.3, -0.9, -0.89], ['H', -1.95, 0.5, 0],
      ['H', 0.35, 0.85, 0.89], ['H', 0.35, 0.85, -0.89], ['H', 2.05, -0.5, 0]],
    bonds: [[0, 1, 1], [1, 2, 1], [0, 3, 1], [0, 4, 1], [0, 5, 1], [1, 6, 1], [1, 7, 1], [2, 8, 1]],
    fact: { zh: '碳、氫、氧三種原子一起組成。', en: 'Built from carbon, hydrogen and oxygen.' },
    use: { zh: '酒精消毒液可以殺死細菌(兒童不能喝含酒精飲料)。', en: 'Rubbing alcohol kills germs.' } },
  { id: 'CH3COOH', formula: 'CH3COOH', name: { zh: '醋酸', en: 'Acetic acid' }, lab: true,
    atoms: [['C', 0, 0, 0], ['O', 0.2, 1.2, 0], ['O', 1.05, -0.75, 0], ['H', 1.9, -0.4, 0], ['C', -1.5, -0.1, 0],
      ['H', -1.85, 0.45, 0.88], ['H', -1.85, 0.45, -0.88], ['H', -1.55, -1.15, 0]],
    bonds: [[0, 1, 2], [0, 2, 1], [2, 3, 1], [0, 4, 1], [4, 5, 1], [4, 6, 1], [4, 7, 1]],
    fact: { zh: '食用醋酸酸的味道就是它。', en: 'The sour taste of vinegar.' },
    use: { zh: '廚房的醋,可以拿來調味、清除水垢。', en: 'Kitchen vinegar for seasoning and cleaning limescale.' } },
  { id: 'C3H8', formula: 'C3H8', name: { zh: '丙烷(桶裝瓦斯)', en: 'Propane' }, lab: true,
    atoms: [['C', -1.27, -0.25, 0], ['C', 0, 0.5, 0], ['C', 1.27, -0.25, 0],
      ['H', 0, 1.15, 0.89], ['H', 0, 1.15, -0.89], ['H', -1.27, -0.9, 0.89], ['H', -1.27, -0.9, -0.89], ['H', -2.17, 0.35, 0],
      ['H', 1.27, -0.9, 0.89], ['H', 1.27, -0.9, -0.89], ['H', 2.17, 0.35, 0]].slice(0, 3).concat([
      ['H', 0, 1.15, 0.89], ['H', 0, 1.15, -0.89], ['H', -1.27, -0.9, 0.89], ['H', -1.27, -0.9, -0.89], ['H', -2.17, 0.35, 0],
      ['H', 1.27, -0.9, 0.89], ['H', 1.27, -0.9, -0.89], ['H', 2.17, 0.35, 0]]),
    bonds: [[0, 1, 1], [1, 2, 1], [1, 3, 1], [1, 4, 1], [0, 5, 1], [0, 6, 1], [0, 7, 1], [2, 8, 1], [2, 9, 1], [2, 10, 1]],
    fact: { zh: '三個碳排成一排,身上穿著八件氫外套。', en: 'Three carbons in a row wearing eight hydrogens.' },
    use: { zh: '桶裝瓦斯、露營瓦斯爐的燃料。', en: 'Fuel for gas bottles and camping stoves.' } },
  { id: 'NaHCO3', formula: 'NaHCO3', name: { zh: '小蘇打(碳酸氫鈉)', en: 'Baking soda' }, lab: true,
    atoms: [['C', 0, 0, 0], ['O', 0, 1.22, 0], ['O', 1.05, -0.62, 0], ['O', -1.1, -0.65, 0], ['H', 1.95, -0.2, 0.2], ['Na', -2.6, -0.4, 0]],
    bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [2, 4, 1], [3, 5, 1, 'ionic']],
    howto: { zh: '拼法:先讓 C 在中間,牽上 3 個 O。再把 H 牽在其中一個 O 上,Na 牽在另一個 O 上,最後一個 O 不用再牽別人。', en: 'How to build: put C in the middle and attach 3 O atoms. Then attach H to one O and Na to another O. The last O stays as it is.' },
    fact: { zh: '白色粉末,遇到酸會冒出氣泡。', en: 'A white powder that fizzes with acid.' },
    use: { zh: '做蛋糕、饅頭讓麵團膨起來,也能去除異味。', en: 'Makes cakes rise and removes odors.' } },
  { id: 'CaCO3', formula: 'CaCO3', name: { zh: '碳酸鈣(蛋殼、貝殼)', en: 'Calcium carbonate' }, lab: false,
    atoms: [['C', 0, 0, 0], ['O', 0, 0, 1.29], ['O', 1.12, 0, -0.64], ['O', -1.12, 0, -0.64], ['Ca', 0, 2.0, -0.2]],
    bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [4, 2, 1, 'ionic'], [4, 3, 1, 'ionic'], [4, 1, 1, 'ionic']],
    fact: { zh: '雞蛋殼、貝殼、珍珠、石灰岩都是它。', en: 'Eggshells, seashells, pearls and limestone.' },
    use: { zh: '補鈣片、粉筆、水泥的原料。', en: 'Calcium tablets, chalk and cement.' } },
  { id: 'SO2', formula: 'SO2', name: { zh: '二氧化硫', en: 'Sulfur dioxide' }, lab: false,
    atoms: [['S', 0, 0, 0], ['O', -1.24, -0.7, 0], ['O', 1.24, -0.7, 0]], bonds: [[0, 1, 2], [0, 2, 2]],
    fact: { zh: '火山和燃燒煤炭會產生的刺鼻氣體。', en: 'A sharp gas released by volcanoes and burning coal.' },
    use: { zh: '是造成酸雨的原因之一,所以要減少汙染。', en: 'A cause of acid rain, so we should cut pollution.' } },
  { id: 'NO2', formula: 'NO2', name: { zh: '二氧化氮', en: 'Nitrogen dioxide' }, lab: true,
    atoms: [['N', 0, 0.35, 0], ['O', -1.07, -0.25, 0], ['O', 1.07, -0.25, 0]], bonds: [[0, 1, 2], [0, 2, 1]],
    fact: { zh: '棕黃色的氣體。它有一隻手永遠牽不滿,所以特別活潑、容易跟別人反應!', en: 'A brown gas. One of its hands can never be filled, so it is very active!' },
    use: { zh: '汽車廢氣和工廠排放的空氣汙染物,是霧霾的原因之一。', en: 'A pollutant from car exhaust and factories that adds to smog.' } },
  { id: 'C6H12O6', formula: 'C6H12O6', name: { zh: '葡萄糖', en: 'Glucose' }, lab: false,
    atoms: G.atoms, bonds: G.bonds,
    fact: { zh: '植物用陽光、水和二氧化碳做出來的糖。', en: 'The sugar plants make from sunlight, water and CO2.' },
    use: { zh: '是我們身體和大腦的能量來源。', en: 'The energy source for your body and brain.' } },
  { id: 'diamond', formula: 'C(鑽石)', display: 'C', name: { zh: '鑽石', en: 'Diamond' }, lab: false,
    atoms: DIA.atoms, bonds: DIA.bonds,
    fact: { zh: '每個碳都跟四個碳手牽手,排成立體網格,所以超級硬。', en: 'Each carbon holds four others in a 3D grid, so it is super hard.' },
    use: { zh: '閃亮的寶石,也用來切割堅硬的東西。', en: 'Sparkling gems, and cutting tools for hard stuff.' } },
  { id: 'graphite', formula: 'C(石墨)', display: 'C', name: { zh: '石墨(鉛筆芯)', en: 'Graphite' }, lab: false,
    atoms: GRA.atoms, bonds: GRA.bonds,
    fact: { zh: '碳排成一層一層的蜂巢,層與層很容易滑開。', en: 'Carbon in honeycomb sheets that slide over each other.' },
    use: { zh: '鉛筆寫字時,一層層的石墨就留在紙上。', en: 'When you write, layers of graphite stay on the paper.' } },
  // ---- 只用於反應動畫 ----
  { id: 'Na', formula: 'Na', name: { zh: '鈉原子', en: 'Sodium atom' }, hidden: true, atoms: [['Na', 0, 0, 0]], bonds: [] },
  { id: 'Fe', formula: 'Fe', name: { zh: '鐵原子', en: 'Iron atom' }, hidden: true, atoms: [['Fe', 0, 0, 0]], bonds: [] },
  { id: 'Cl2', formula: 'Cl2', name: { zh: '氯氣', en: 'Chlorine gas' }, hidden: true, atoms: [['Cl', -0.99, 0, 0], ['Cl', 0.99, 0, 0]], bonds: [[0, 1, 1]] },
  { id: 'NaClp', formula: 'NaCl', name: { zh: '食鹽', en: 'Salt' }, hidden: true, atoms: [['Na', -1.2, 0, 0], ['Cl', 1.2, 0, 0]], bonds: [[0, 1, 1, 'ionic']] },
  { id: 'Fe2O3', formula: 'Fe2O3', name: { zh: '鐵鏽', en: 'Rust' }, hidden: true,
    atoms: [['Fe', -1.1, 0, 0], ['Fe', 1.1, 0, 0], ['O', 0, 0.9, 0], ['O', 0, -0.45, 0.8], ['O', 0, -0.45, -0.8]],
    bonds: [[0, 2, 1, 'ionic'], [1, 2, 1, 'ionic'], [0, 3, 1, 'ionic'], [1, 3, 1, 'ionic'], [0, 4, 1, 'ionic'], [1, 4, 1, 'ionic']] },
  { id: 'CH3COONa', formula: 'CH3COONa', name: { zh: '醋酸鈉', en: 'Sodium acetate' }, hidden: true,
    atoms: [['C', 0, 0, 0], ['O', 0.2, 1.2, 0], ['O', 1.05, -0.75, 0], ['Na', 2.9, -0.4, 0], ['C', -1.5, -0.1, 0],
      ['H', -1.85, 0.45, 0.88], ['H', -1.85, 0.45, -0.88], ['H', -1.55, -1.15, 0]],
    bonds: [[0, 1, 2], [0, 2, 1], [2, 3, 1, 'ionic'], [0, 4, 1], [4, 5, 1], [4, 6, 1], [4, 7, 1]] },
];

export const MOL = Object.fromEntries(MOLECULES.map(m => [m.id, m]));
export const GALLERY = MOLECULES.filter(m => !m.hidden);
export const LAB_TARGETS = MOLECULES.filter(m => m.lab);

/** 化學式正規化:{H:2, O:1} */
export function composition(syms) {
  const c = {}; syms.forEach(s => { c[s] = (c[s] || 0) + 1; }); return c;
}

/** 以「骨架」(鄰居種類)做簽章,忽略鍵級 */
export function skeletonSignature(syms, bonds) {
  const nb = syms.map(() => []);
  bonds.forEach(([i, j]) => { nb[i].push(syms[j]); nb[j].push(syms[i]); });
  return syms.map((s, i) => `${s}:${nb[i].sort().join('')}`).sort().join('|');
}

const SIGS = new Map();
LAB_TARGETS.forEach(m => {
  const syms = m.labPair ? m.labPair.atoms : m.atoms.map(a => a[0]);
  const bonds = m.labPair ? m.labPair.bonds : m.bonds;
  SIGS.set(skeletonSignature(syms, bonds), m);
});
export function matchMolecule(syms, bonds) { return SIGS.get(skeletonSignature(syms, bonds)) || null; }

export const VALENCE = { H: 1, C: 4, N: 3, O: 2, Na: 1, Cl: 1, F: 1, S: 2, Ca: 2 };
