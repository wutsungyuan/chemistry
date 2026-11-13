import { MOL } from './molecules.js';
import DB from './db/reactions.json' with { type: 'json' };

// reactants / products: [分子 id, 係數]。資料在 db/reactions.json;驗證在 scripts/lib/validate-reactions.mjs。
export const REACTIONS = DB.reactions;

// 檢查原子守恆(用實際結構的原子數)
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
