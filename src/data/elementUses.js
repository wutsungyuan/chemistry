// 各元素在生活中常見的物質 [公式, 中文, English]:資料在 db/element-uses.json。
// 分子圖鑑裡有的分子會自動合併,而且可以點進去看 3D。
import DB from './db/element-uses.json' with { type: 'json' };

export const ELEMENT_USES = Object.fromEntries(DB.uses.map(u => [u.sym, u.items.map(i => [i.mol, i.zh, i.en])]));
