// 反應劇場依階段的資料:原子守恆(反應前後各元素的原子數)、吸放熱、反應熱,以及說明依階段取用。純函式。
import { MOL } from '../data/molecules.js';

/** 一邊(反應物或生成物)的原子總數,例:[['H2',2],['O2',1]] → { H: 4, O: 2 } */
export function atomCounts(side) {
  const c = {};
  for (const [id, n] of side) for (const a of MOL[id].atoms) c[a[0]] = (c[a[0]] || 0) + n;
  return c;
}
/** 元素排序:C 在前、H 次之、其餘依字母(像化學式的寫法) */
const rank = s => (s === 'C' ? 0 : s === 'H' ? 1 : 2);
export const sortedSyms = c => Object.keys(c).sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1));
/** 「C 1、H 4、O 4」這樣的文字(元素符號 + 個數) */
export const countText = c => sortedSyms(c).map(s => `${s} ${c[s]}`).join('、');

/** 反應前後原子守恆的摘要:{ left, right, ok } */
export function conservation(r) {
  const left = atomCounts(r.reactants), right = atomCounts(r.products);
  const ok = sortedSyms(left).join() === sortedSyms(right).join() && sortedSyms(left).every(s => left[s] === right[s]);
  return { left, right, ok };
}

/** 說明依階段:storyTeen / storyHigh 優先,沒有就用 story(國小說法);高中版沒寫時退回國中版 */
export const storyFor = (r, level) => (level === 'high' && (r.storyHigh || r.storyTeen)) || (level === 'teen' && r.storyTeen) || r.story;
