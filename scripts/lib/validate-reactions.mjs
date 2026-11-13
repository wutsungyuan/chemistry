// 驗證反應資料(db/reactions.json):欄位、分子 id、原子守恆。需要分子資料,所以在 build-db 產生分子之後才跑(scripts/check-reactions.mjs)。
const isText = o => o && typeof o.zh === 'string' && o.zh.trim() && typeof o.en === 'string' && o.en.trim();
export const EFFECTS = ['spark', 'electric', 'fire', 'light', 'slow', 'bubble'];   // ReactionTheater 有對應動畫的效果

export function validateReactions(R, MOL, { err }) {
  const m = R.meta || {};
  for (const k of ['source', 'note', 'retrieved']) if (!m[k]) err('reactions', `meta 缺少 ${k}(必須標示資料出處與限制)`);
  const ids = new Set();
  for (const lv of ['kid', 'teen', 'high']) if (!(R.reactions || []).some(r => r.level === lv)) err('reactions', `階段 ${lv} 沒有任何反應`);
  for (const r of R.reactions || []) {
    const id = 'reaction:' + r.id;
    if (ids.has(r.id)) err(id, 'id 重複'); ids.add(r.id);
    if (!isText(r.name) || !isText(r.story)) err(id, 'name/story 要有中英文');
    // 階段:level 是最低適用階段;國中/高中版的說明、反應類型、條件都要有中英文,英文欄位不可含中文字
    if (!['kid', 'teen', 'high'].includes(r.level)) err(id, 'level 要是 kid / teen / high');
    for (const f of ['storyTeen', 'storyHigh', 'type', 'cond']) {
      if (!isText(r[f])) err(id, `${f} 要有中英文`);
      else if (/[一-鿿]/.test(r[f].en)) err(id, `${f}.en 不可含中文字`);
    }
    if (!['exo', 'endo'].includes(r.heat)) err(id, 'heat 要是 exo(放熱)或 endo(吸熱)');
    if (r.dH !== undefined) {
      if (typeof r.dH !== 'number' || !Number.isFinite(r.dH)) err(id, 'dH 要是數字(kJ)');
      else if ((r.dH < 0) !== (r.heat === 'exo')) err(id, `dH ${r.dH} 的正負號和 heat ${r.heat} 不一致(放熱 < 0、吸熱 > 0)`);
    }
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
