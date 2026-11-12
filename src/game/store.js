// 學習進度與徽章(存在 localStorage)
const KEY = 'chem-progress-v1';
const blank = () => ({ elements: [], built: [], reactions: [], bestStreak: 0, quizRight: 0, spectraSeen: [], spectrumRight: 0 });
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
