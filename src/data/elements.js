// 元素資料:全部寫在 db/elements.json(含出處),這裡只負責讀進來、補上預設值,不再寫死任何元素。
// 驗證在 scripts/lib/validate-elements.mjs(npm run dev / build 前會自動執行)。
import DB from './db/elements.json' with { type: 'json' };

export const CATEGORIES = Object.fromEntries(Object.entries(DB.categories).map(([k, v]) => [k, { color: v.color, zh: v.name.zh, en: v.name.en, desc: v.desc, descTeen: v.descTeen ?? v.desc, descHigh: v.descHigh ?? v.desc }]));

export const ELEMENTS = DB.elements.map(e => ({
  z: e.z, sym: e.sym, name: e.name, mass: e.mass, cat: e.cat, row: e.row, col: e.col, shells: e.shells,
  color: e.color ?? CATEGORIES[e.cat].color,                       // 沒有 CPK 配色的元素用分類色
  radius: e.radius ?? 0.5 + 0.06 * e.shells.length,                // 示意大小:沒寫的依殼層數估算
  fact: e.fact ?? null,
  // 英文版把「知識+用途」寫成同一句放在 fact,所以 use 的英文留空(不重複顯示)
  use: e.use ? { zh: e.use.zh, en: '' } : null,
}));

export const BY_SYMBOL = Object.fromEntries(ELEMENTS.map(e => [e.sym, e]));
export const BY_Z = Object.fromEntries(ELEMENTS.map(e => [e.z, e]));
