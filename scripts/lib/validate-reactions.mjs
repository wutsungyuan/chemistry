// 驗證反應資料(db/reactions.json):欄位、分子 id、原子守恆。需要分子資料,所以在 build-db 產生分子之後才跑(scripts/check-reactions.mjs)。
const isText = o => o && typeof o.zh === 'string' && o.zh.trim() && typeof o.en === 'string' && o.en.trim();
export const EFFECTS = ['spark', 'electric', 'fire', 'light', 'slow', 'bubble'];   // ReactionTheater 有對應動畫的效果

export function validateReactions(R, MOL, { err }) {
  const m = R.meta || {};
  for (const k of ['source', 'note', 'retrieved']) if (!m[k]) err('reactions', `meta 缺少 ${k}(必須標示資料出處與限制)`);
  const ids = new Set();
  for (const r of R.reactions || []) {
    const id = 'reaction:' + r.id;
    if (ids.has(r.id)) err(id, 'id 重複'); ids.add(r.id);
    if (!isText(r.name) || !isText(r.story)) err(id, 'name/story 要有中英文');
    if (!EFFECTS.includes(r.effect)) err(id, `effect ${r.effect} 沒有對應的動畫(可用:${EFFECTS.join('、')})`);
    const count = side => {
      const c = {};
      for (const [mid, n] of side) {
        if (!MOL[mid]) { err(id, `分子 ${mid} 不存在`); continue; }
        if (!Number.isInteger(n) || n < 1) err(id, `係數 ${n} 要是正整數`);
        for (const a of MOL[mid].atoms) c[a[0]] = (c[a[0]] || 0) + n;
      }
      return c;
    };
    if (!r.reactants?.length || !r.products?.length) { err(id, '要有反應物與生成物'); continue; }
    // 圖鑑裡的晶體小塊(例如 Fe2O3 的 20 顆原子)不能拿來當反應動畫的單元,要用專用的 hidden 分子(如 Fe2O3p)
    const a = count(r.reactants), b = count(r.products);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) err(id, `${k} 原子不守恆:反應物 ${a[k] || 0}、生成物 ${b[k] || 0}`);
  }
}
