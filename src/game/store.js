// 學習進度與徽章(存在 localStorage)
const KEY = 'chem-progress-v1';
const blank = () => ({ elements: [], built: [], reactions: [], bestStreak: 0, quizRight: 0, spectraSeen: [], spectrumRight: 0, changeRight: 0 });
let data = blank();
try { data = { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} };

export const BADGES = [
  { id: 'first-el',  icon: '🔭', name: { zh: '小小探險家', en: 'Little Explorer' }, desc: { zh: '看過第一個元素', en: 'View your first element' }, test: d => d.elements.length >= 1 },
  { id: 'ten-el',    icon: '🧪', name: { zh: '元素收藏家', en: 'Element Collector' }, desc: { zh: '看過 10 個元素', en: 'View 10 elements' }, test: d => d.elements.length >= 10 },
  { id: 'first-mol', icon: '💧', name: { zh: '分子建築師', en: 'Molecule Builder' }, desc: { zh: '組出第一個分子', en: 'Build your first molecule' }, test: d => d.built.length >= 1 },
  { id: 'five-mol',  icon: '🏗️', name: { zh: '化學小達人', en: 'Chemistry Whiz' }, desc: { zh: '組出 5 種分子', en: 'Build 5 molecules' }, test: d => d.built.length >= 5 },
  { id: 'water',     icon: '🌊', name: { zh: '水的魔法師', en: 'Water Wizard' }, desc: { zh: '組出水 H₂O', en: 'Build water' }, test: d => d.built.includes('H2O') },
  { id: 'ozone',     icon: '☂️', name: { zh: '臭氧守護者', en: 'Ozone Guardian' }, desc: { zh: '組出臭氧 O₃', en: 'Build ozone' }, test: d => d.built.includes('O3') },
  { id: 'react3',    icon: '🔥', name: { zh: '反應觀察員', en: 'Reaction Watcher' }, desc: { zh: '看過 3 種化學反應', en: 'Watch 3 reactions' }, test: d => d.reactions.length >= 3 },
  { id: 'rainbow',   icon: '🌈', name: { zh: '彩虹觀察員', en: 'Rainbow Watcher' }, desc: { zh: '看過 5 個元素的光譜指紋', en: 'Explore the light fingerprint of 5 elements' }, test: d => d.spectraSeen.length >= 5 },
  { id: 'spec3',     icon: '🕵️', name: { zh: '光譜偵探', en: 'Spectrum Detective' }, desc: { zh: '小測驗答對 3 題光譜指紋', en: '3 correct spectrum questions in the quiz' }, test: d => d.spectrumRight >= 3 },
  { id: 'streak5',   icon: '🏆', name: { zh: '答題高手', en: 'Quiz Master' }, desc: { zh: '小測驗連續答對 5 題', en: '5 correct quiz answers in a row' }, test: d => d.bestStreak >= 5 },
  { id: 'change10',  icon: '🧊', name: { zh: '變化偵探', en: 'Change Detective' }, desc: { zh: '判斷對 10 題物理/化學變化', en: '10 correct physical/chemical change answers' }, test: d => d.changeRight >= 10 },
];

export const progress = () => data;
export const badgeIds = () => BADGES.filter(b => b.test(data)).map(b => b.id);

/** 更新進度,回傳新獲得的徽章 */
export function update(fn) {
  const before = new Set(badgeIds());
  fn(data); save();
  return BADGES.filter(b => b.test(data) && !before.has(b.id));
}
export const addUnique = (arr, v) => { if (!arr.includes(v)) arr.push(v); };

// 徽章名稱依階段:國小是原本的名字(BADGES 裡),國中、高中換成比較平實/正式的說法
const BADGE_NAMES = {
  'first-el': { teen: { zh: '元素探索者', en: 'Element Explorer' }, high: { zh: '元素初探', en: 'First Look at Elements' } },
  'ten-el': { teen: { zh: '元素蒐集者', en: 'Element Collector' }, high: { zh: '元素通', en: 'Element Expert' } },
  'first-mol': { teen: { zh: '分子建構者', en: 'Molecule Builder' }, high: { zh: '初次合成', en: 'First Synthesis' } },
  'five-mol': { teen: { zh: '化學能手', en: 'Chemistry Pro' }, high: { zh: '分子合成能手', en: 'Synthesis Specialist' } },
  water: { teen: { zh: '水分子達人', en: 'Water Molecule Master' }, high: { zh: 'H₂O 合成者', en: 'H₂O Assembler' } },
  ozone: { teen: { zh: '臭氧觀察者', en: 'Ozone Observer' }, high: { zh: 'O₃ 合成者', en: 'O₃ Assembler' } },
  react3: { teen: { zh: '反應觀察員', en: 'Reaction Observer' }, high: { zh: '反應分析者', en: 'Reaction Analyst' } },
  rainbow: { teen: { zh: '光譜觀察員', en: 'Spectrum Observer' }, high: { zh: '光譜分析者', en: 'Spectrum Analyst' } },
  spec3: { teen: { zh: '光譜偵探', en: 'Spectrum Detective' }, high: { zh: '光譜鑑定者', en: 'Spectrum Identifier' } },
  streak5: { teen: { zh: '答題高手', en: 'Quiz Master' }, high: { zh: '連續答對 5 題', en: '5 Correct in a Row' } },
  change10: { teen: { zh: '變化判斷者', en: 'Change Judge' }, high: { zh: '物理/化學變化辨識者', en: 'Physical/Chemical Change Identifier' } },
};
/** 徽章名稱 {zh,en}:依階段(國小 = BADGES 裡的 name;沒有專屬名稱的退回 name) */
export const badgeName = (b, level) => BADGE_NAMES[b.id]?.[level] || b.name;

// 國小版沒有分子實驗室、反應劇場與光譜(ui/level.js 的 sceneAllowed / featureOn),靠這些功能才拿得到的徽章不列給國小,免得出現永遠解不開的鎖
const KID_UNREACHABLE = new Set(['first-mol', 'five-mol', 'water', 'ozone', 'react3', 'rainbow', 'spec3']);
export const badgesFor = level => (level === 'kid' ? BADGES.filter(b => !KID_UNREACHABLE.has(b.id)) : BADGES);
