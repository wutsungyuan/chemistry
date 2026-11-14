// 驗證實驗動畫腳本(db/experiments.json)與故事(db/stories.json)對得起來。
// 檢查:每步中英名稱與字幕齊全、字幕長度、refs 的引用真的在故事該段原文、標 match 的步驟要有引用、
//       故事文字不含與動畫矛盾的說法(forbidden)、未涵蓋(uncovered)的引用也在故事裡、英文字幕不含中文字。
const CJK = /[一-鿿]/;
export const LIMITS = { zhChars: 30, enWords: 20 };

/** @param X 讀進來的 experiments.json;@param S 讀進來的 stories.json;@param { err } 回報錯誤 */
export function validateExperiments(X, S, { err }) {
  const m = X.meta || {};
  for (const k of ['source', 'note', 'retrieved']) if (!m[k]) err('experiments', `meta 缺少 ${k}`);
  const used = new Set();
  for (const [key, E] of Object.entries(X.experiments || {})) {
    const id = 'experiment:' + key;
    const story = S.stories.find(s => s.id === E.storyId);
    if (!story) { err(id, `找不到故事 ${E.storyId}`); continue; }
    if (used.has(E.storyId)) err(id, `故事 ${E.storyId} 已經有另一個動畫`); used.add(E.storyId);
    if (story.level !== 'kid') err(id, '動畫目前只給國小版的故事');
    if (!Number.isInteger(E.afterPara) || E.afterPara < 1 || E.afterPara > story.body.zh.length) err(id, 'afterPara 要是故事的段落編號(動畫卡片放在這一段後面)');
    for (const k of ['titleZh', 'titleEn', 'legZh', 'legEn']) if (!E[k]) err(id, `缺少 ${k}`);
    if (CJK.test(E.titleEn || '') || CJK.test(E.legEn || '')) err(id, 'titleEn / legEn 含中文字');
    if (!Array.isArray(E.steps) || E.steps.length < 3) { err(id, 'steps 至少要有開頭、一個以上的步驟、結尾'); continue; }
    if (!E.steps[0].io || !E.steps[E.steps.length - 1].io) err(id, '第一步(開頭)與最後一步(結尾)要標 io: 1');
    const text = p => p === 'safety' ? story.safety && story.safety.zh : story.body.zh[p - 1];
    const all = [...story.body.zh, story.safety && story.safety.zh, story.quiz.q.zh, story.quiz.explain.zh, ...story.quiz.options.map(o => o.zh)].filter(Boolean).join('\n');
    for (const bad of E.forbidden || []) if (all.includes(bad)) err(id, `故事文字含有與動畫矛盾的說法「${bad}」`);
    E.steps.forEach((s, i) => {
      const at = `${id} 步驟 ${i + 1}(${s.nZh || s.key})`;
      if (!s.capZh || !s.capEn || !s.nZh || !s.nEn) err(at, '缺少中文或英文的名稱/字幕');
      if (Array.from(s.capZh || '').length > LIMITS.zhChars) err(at, `中文字幕超過 ${LIMITS.zhChars} 字`);
      if ((s.capEn || '').trim().split(/\s+/).length > LIMITS.enWords) err(at, `英文字幕超過 ${LIMITS.enWords} 個字`);
      if (CJK.test(s.capEn || '') || CJK.test(s.nEn || '')) err(at, '英文含中文字');
      if (!(s.d0 > 0)) err(at, 'd0(動作最短秒數)要大於 0');
      for (const r of s.refs || []) { const p = text(r.para); if (!p || !p.includes(r.quote)) err(at, `故事第 ${r.para} 段找不到引用「${r.quote}」`); }
      if (!(s.refs || []).length && (s.status || 'match') === 'match') err(at, '標為「一致」卻沒有引用故事原文');
      if (['diff', 'missing'].includes(s.status)) err(at, `狀態是「${s.status}」,交付前必須處理`);
    });
    for (const u of E.uncovered || []) { const p = text(u.para); if (!p || !p.includes(u.quote)) err(id, `「未涵蓋」的引用在故事第 ${u.para} 段找不到「${u.quote}」`); }
  }
}
