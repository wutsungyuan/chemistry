// 共價分子的「電子帳」:價電子總數、共用電子對數、孤對電子對數、有沒有未成對電子。純函式,給分子實驗室的國中/高中說明用。
// 只算共價分子:含金屬原子、或有標成離子鍵('ionic')的(例如氯化鈉)不是共價分子,回傳 null,免得教錯。
import { BY_SYMBOL } from '../data/elements.js';

const METALS = new Set(['alkali', 'alkaline', 'transition', 'post', 'lanthanide', 'actinide']);

/** 單個原子的價電子數(主族 = 最外層電子數,從電子殼層資料取) */
export const valenceElectrons = sym => { const e = BY_SYMBOL[sym]; return e ? e.shells[e.shells.length - 1] : 0; };

/**
 * @param {{atoms: Array<[string, ...number[]]>, bonds: Array<[number, number, number?, string?]>}} m
 * 例:H₂O → { electrons: 8, pairs: 2, lone: 2, unpaired: 0 }(2 個 O–H 鍵共用 4 個電子,剩下 4 個電子 = 2 對孤對電子)
 */
export function bondFacts(m) {
  if (!m?.atoms?.length || !m.bonds?.length) return null;
  if (m.atoms.some(a => !BY_SYMBOL[a[0]] || METALS.has(BY_SYMBOL[a[0]].cat))) return null;
  if (m.bonds.some(b => b[3] === 'ionic')) return null;
  const electrons = m.atoms.reduce((s, a) => s + valenceElectrons(a[0]), 0);
  const pairs = m.bonds.reduce((s, b) => s + (b[2] ?? 1), 0);
  const left = electrons - 2 * pairs;
  if (left < 0) return null;
  return { electrons, pairs, lone: Math.floor(left / 2), unpaired: left % 2 };
}
