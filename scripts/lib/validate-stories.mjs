// 驗證化學故事(db/stories.json):欄位、長度、測驗選項、連結的元素與分子、英文欄位不含中文字、有危險內容一定要有安全提醒。
const isText = o => o && typeof o.zh === 'string' && o.zh.trim() && typeof o.en === 'string' && o.en.trim();
const CJK = /[一-鿿]/;
const DANGER = /火|磷|輻射|煙火|鈉|氯|爆炸|有毒/;     // 故事裡出現這些字,就要有 safety(安全提醒)
const LEVELS = ['kid', 'teen', 'high'];

/** @param S 讀進來的 stories.json;@param ctx { elements: 元素符號集合, molecules: 分子 id 集合 };@param { err } 回報錯誤 */
export function validateStories(S, ctx, { err }) {
  const m = S.meta || {};
  for (const k of ['source', 'note', 'retrieved']) if (!m[k]) err('stories', `meta 缺少 ${k}(必須標示資料出處與限制)`);
  const ids = new Set();
  if (!Array.isArray(S.stories) || S.stories.length < 1) err('stories', '沒有任何故事');
  for (const s of S.stories || []) {
    const id = 'story:' + s.id;
    if (!/^[a-z][a-z0-9-]*$/.test(s.id || '')) err(id, 'id 要是小寫英數與連字號');
    if (ids.has(s.id)) err(id, 'id 重複'); ids.add(s.id);
    if (!LEVELS.includes(s.level)) err(id, 'level 要是 kid / teen / high');
    if (!isText(s.title)) err(id, 'title 要有中英文'); else if (CJK.test(s.title.en)) err(id, 'title.en 含中文字');
    const zh = s.body?.zh, en = s.body?.en;
    if (!Array.isArray(zh) || !Array.isArray(en) || zh.length < 2 || zh.length > 5 || zh.length !== en.length) { err(id, 'body.zh 與 body.en 要各有 2~5 段,且段數相同'); continue; }
    if ([...zh, ...en].some(p => typeof p !== 'string' || !p.trim())) err(id, 'body 有空白的段落');
    const zhLen = zh.join('').length, enWords = en.join(' ').split(/\s+/).length;
    if (zhLen < 120 || zhLen > 300) err(id, `中文長度 ${zhLen} 字不在 120~300 之間(要給國小生聽,不能太短也不能太長)`);
    if (enWords < 50 || enWords > 260) err(id, `英文長度 ${enWords} 個字不在 50~260 之間`);
    if (en.some(p => CJK.test(p))) err(id, 'body.en 含中文字');
    const q = s.quiz;
    if (!q || !isText(q.q) || !isText(q.explain)) err(id, 'quiz 要有 q 與 explain(中英文)');
    else {
      if (CJK.test(q.q.en) || CJK.test(q.explain.en)) err(id, 'quiz 的英文含中文字');
      if (!Array.isArray(q.options) || q.options.length !== 3) err(id, 'quiz 要剛好 3 個選項');
      else {
        if (q.options.filter(o => o.ok).length !== 1) err(id, 'quiz 要剛好 1 個正確選項');
        for (const o of q.options) { if (!isText(o)) err(id, 'quiz 選項要有中英文'); else if (CJK.test(o.en)) err(id, 'quiz 選項英文含中文字'); }
        if (new Set(q.options.map(o => o.zh)).size !== 3) err(id, 'quiz 選項重複');
      }
    }
    for (const sym of s.elements || []) if (!ctx.elements.has(sym)) err(id, `連結的元素 ${sym} 不存在`);
    for (const mid of s.molecules || []) if (!ctx.molecules.has(mid)) err(id, `連結的分子 ${mid} 不存在`);
    if (!Array.isArray(s.elements) || !Array.isArray(s.molecules)) err(id, 'elements 與 molecules 要是陣列(可以是空的)');
    if (!Array.isArray(s.checks) || !s.checks.length || s.checks.some(c => typeof c !== 'string' || !c.trim())) err(id, 'checks 要列出故事裡的史實與數字(給審稿者逐項查證)');
    if (s.safety !== undefined) { if (!isText(s.safety)) err(id, 'safety 要有中英文'); else if (CJK.test(s.safety.en)) err(id, 'safety.en 含中文字'); }
    if (DANGER.test(zh.join('')) && s.safety === undefined) err(id, '故事提到火、磷、輻射、鈉、氯、煙火等危險的東西,要有 safety(安全提醒)');
  }
  for (const lv of LEVELS.slice(0, 1)) if (!(S.stories || []).some(s => s.level === lv)) err('stories', `階段 ${lv} 沒有任何故事`);
}
