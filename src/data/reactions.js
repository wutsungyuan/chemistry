import { MOL } from './molecules.js';

// reactants / products: [分子 id, 係數]
export const REACTIONS = [
  { id: 'water', reactants: [['H2', 2], ['O2', 1]], products: [['H2O', 2]], effect: 'spark',
    name: { zh: '氫氣和氧氣變成水', en: 'Hydrogen + oxygen = water' },
    story: { zh: '氫氣遇到氧氣再加上一點火花,啪!氫原子和氧原子重新牽手,變成了水。氫氣燃燒後只會產生水,所以是很乾淨的能源。',
             en: 'Add a spark and hydrogen meets oxygen. Pop! The atoms swap partners and make water. Burning hydrogen only gives water, so it is clean energy.' } },
  { id: 'electrolysis', reactants: [['H2O', 2]], products: [['H2', 2], ['O2', 1]], effect: 'electric',
    name: { zh: '電解水', en: 'Splitting water with electricity' },
    story: { zh: '通電後,水分子被拆開,氫原子和氧原子各自重新組合,變成氫氣和氧氣。氫氣的量剛好是氧氣的兩倍!',
             en: 'Electricity splits water molecules. The atoms regroup into hydrogen and oxygen gas, twice as much hydrogen as oxygen!' } },
  { id: 'methane', reactants: [['CH4', 1], ['O2', 2]], products: [['CO2', 1], ['H2O', 2]], effect: 'fire',
    name: { zh: '瓦斯(甲烷)燃燒', en: 'Burning gas (methane)' },
    story: { zh: '煮飯的瓦斯和氧氣一起燃燒,產生二氧化碳和水,同時放出熱量讓食物變熟。',
             en: 'Cooking gas burns with oxygen, making carbon dioxide and water, and releasing heat to cook food.' } },
  { id: 'propane', reactants: [['C3H8', 1], ['O2', 5]], products: [['CO2', 3], ['H2O', 4]], effect: 'fire',
    name: { zh: '桶裝瓦斯燃燒', en: 'Burning propane' },
    story: { zh: '一個丙烷分子需要 5 個氧分子才能燒乾淨,變成 3 個二氧化碳和 4 個水。',
             en: 'One propane needs five oxygen molecules to burn completely, making three CO2 and four water.' } },
  { id: 'photosynthesis', reactants: [['CO2', 6], ['H2O', 6]], products: [['C6H12O6', 1], ['O2', 6]], effect: 'light',
    name: { zh: '植物的光合作用', en: 'Photosynthesis' },
    story: { zh: '植物吸收陽光,把二氧化碳和水變成葡萄糖(養分),還送給我們滿滿的氧氣!',
             en: 'Plants use sunlight to turn carbon dioxide and water into glucose (food) and give us oxygen!' } },
  { id: 'rust', reactants: [['Fe', 4], ['O2', 3]], products: [['Fe2O3p', 2]], effect: 'slow',
    name: { zh: '鐵生鏽', en: 'Iron rusting' },
    story: { zh: '鐵遇到空氣中的氧氣,慢慢變成紅褐色的鐵鏽。這個反應很慢,要好幾天甚至好幾年。',
             en: 'Iron slowly meets oxygen in the air and turns into reddish-brown rust. It takes days or years.' } },
  { id: 'bakingsoda', reactants: [['NaHCO3', 1], ['CH3COOH', 1]], products: [['CH3COONa', 1], ['H2O', 1], ['CO2', 1]], effect: 'bubble',
    name: { zh: '小蘇打 + 醋 = 冒泡泡', en: 'Baking soda + vinegar = bubbles' },
    story: { zh: '小蘇打遇到醋就會冒出二氧化碳氣泡,這就是「火山爆發」科學實驗的秘密。',
             en: 'Baking soda meets vinegar and makes carbon dioxide bubbles: the secret of the volcano experiment.' } },
  { id: 'ozone', reactants: [['O2', 3]], products: [['O3', 2]], effect: 'light',
    name: { zh: '氧氣變臭氧', en: 'Oxygen becomes ozone' },
    story: { zh: '打雷閃電或紫外線的能量,能把 3 個氧分子重新排成 2 個臭氧分子。雷雨後空氣有種特別的味道,就是臭氧!',
             en: 'Lightning or UV light can regroup three O2 into two O3. That fresh smell after a thunderstorm is ozone!' } },
  { id: 'salt', reactants: [['Na', 2], ['Cl2', 1]], products: [['NaClp', 2]], effect: 'spark',
    name: { zh: '鈉和氯變成食鹽', en: 'Sodium + chlorine = salt' },
    story: { zh: '活潑的鈉和有毒的氯相遇,居然變成每天吃的食鹽!化學變化會讓物質變成完全不一樣的東西。',
             en: 'Wild sodium meets poisonous chlorine and becomes the salt we eat every day. Chemistry can change things completely!' } },
];

// 開發時檢查原子守恆
export function checkBalance(r) {
  const count = side => {
    const c = {};
    side.forEach(([id, n]) => MOL[id].atoms.forEach(a => { c[a[0]] = (c[a[0]] || 0) + n; }));
    return c;
  };
  const a = count(r.reactants), b = count(r.products);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every(k => a[k] === b[k]);
}
