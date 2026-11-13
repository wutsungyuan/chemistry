// 分子圖鑑(scenes/MoleculeGallery.js)的階段用語與「分子數據」。國中看鍵的種類,高中再加上鍵長與鍵角(都由結構座標算出來,見 game/molfacts.js)。
export default {
  zh: {
    'gal.tip@teen': '拖曳可以旋轉分子,滾輪縮放,點原子會彈跳。切換球棍模型與空間填充,比較分子的形狀。',
    'gal.tip@high': '拖曳旋轉、滾輪縮放。球棍模型適合看鍵與鍵角,空間填充適合看分子的整體大小與形狀。',
    'gal.facts.mass@teen': '分子量:{m}',
    'gal.facts.mass@high': '莫耳質量:{m} g/mol',
    'gal.facts.mass': '分子量:{m}',
    'gal.facts.fmass@teen': '式量:{m}',
    'gal.facts.fmass@high': '式量:{m}(g/mol)',
    'gal.facts.fmass': '式量:{m}',
    'gal.facts.bonds': '鍵結:{list}',
    'gal.facts.angles': '鍵角:{list}',
    'gal.order.1': '單鍵', 'gal.order.2': '雙鍵', 'gal.order.3': '叄鍵',
  },
  en: {
    'gal.tip@teen': 'Drag to rotate, scroll to zoom, tap an atom to make it bounce. Switch between ball-and-stick and space-filling to compare shapes.',
    'gal.tip@high': 'Drag to rotate, scroll to zoom. Ball-and-stick shows bonds and angles; space-filling shows overall size and shape.',
    'gal.facts.mass@teen': 'Molecular mass: {m}',
    'gal.facts.mass@high': 'Molar mass: {m} g/mol',
    'gal.facts.mass': 'Molecular mass: {m}',
    'gal.facts.fmass@teen': 'Formula mass: {m}',
    'gal.facts.fmass@high': 'Formula mass: {m} (g/mol)',
    'gal.facts.fmass': 'Formula mass: {m}',
    'gal.facts.bonds': 'Bonds: {list}',
    'gal.facts.angles': 'Bond angles: {list}',
    'gal.order.1': 'single', 'gal.order.2': 'double', 'gal.order.3': 'triple',
  },
};
