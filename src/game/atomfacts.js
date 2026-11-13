// 元素的「位置與粒子數」:週期、族、價電子、質子/電子/中子數、分類說明依階段取用。純函式,原子頁、週期表、小測驗共用。
import { CATEGORIES } from '../data/elements.js';

const F_BLOCK = new Set(['lanthanide', 'actinide']);

/** 主族元素:第 1、2、13~18 族(不含鑭系、錒系、過渡金屬);它們的價電子數 = 最外層電子數 */
export const isMainGroupEl = e => !F_BLOCK.has(e.cat) && (e.col <= 2 || e.col >= 13) && e.row <= 7;
/** 最外層電子數(殼層陣列最後一項) */
export const valenceOf = e => e.shells[e.shells.length - 1];

/**
 * 例:Fe → { period: 4, group: 8, valence: null, protons: 26, electrons: 26, neutrons: 30 }
 * group:鑭系、錒系是 null(它們不在 1~18 族的欄位裡);valence:只有主族有;
 * neutrons:原子量四捨五入 − 原子序(同位素有多種,所以只是「約」)。
 */
export function atomFacts(e) {
  return {
    period: e.shells.length,
    group: F_BLOCK.has(e.cat) ? null : e.col,
    valence: isMainGroupEl(e) ? valenceOf(e) : null,
    protons: e.z, electrons: e.z,
    neutrons: Math.max(0, Math.round(e.mass) - e.z),
  };
}

/** 分類說明:國小 desc、國中 descTeen、高中 descHigh(沒寫就用 desc) */
export function catDesc(cat, level) {
  const c = typeof cat === 'string' ? CATEGORIES[cat] : cat;
  return (level === 'teen' && c.descTeen) || (level === 'high' && c.descHigh) || c.desc;
}

/** 元素的生活小知識與用途依階段:factTeen / factHigh(useTeen / useHigh)優先,沒有就退回國中版、再退回 fact / use(國小說法) */
const pickEl = (e, level, base) => (level === 'high' && (e[base + 'High'] || e[base + 'Teen'])) || (level === 'teen' && e[base + 'Teen']) || e[base];
export const elFact = (e, level) => pickEl(e, level, 'fact');
export const elUse = (e, level) => pickEl(e, level, 'use');
