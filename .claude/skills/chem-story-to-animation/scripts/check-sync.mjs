#!/usr/bin/env node
// 檢查「實驗腳本 ↔ 故事」是否對得起來。
// 用法:node check-sync.mjs --script <exp-scripts.json> [--stories <stories.json>]
// 檢查:① 每個 refs 的引用都在故事該段原文裡 ② 中英文名稱與字幕都有 ③ 字幕長度(中文 ≤ 30 字、英文 ≤ 20 個字)
//       ④ 標為 match 的步驟必須有引用 ⑤ 故事文字不能含有 forbidden 裡與動畫矛盾的說法 ⑥ uncovered 的引用也要在故事裡
// 全部通過 exit 0;否則列出所有問題並 exit 1。只用 Node 內建模組。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const scriptFile = opt('script'), storiesFile = opt('stories', path.join(root, 'src/data/db/stories.json'));
if (!scriptFile) { console.error('用法:node check-sync.mjs --script <exp-scripts.json> [--stories <stories.json>]'); process.exit(2); }
const LIMITS = { zhChars: 30, enWords: 20 };
let EXP = JSON.parse(fs.readFileSync(scriptFile, 'utf8'));
if (EXP.experiments) EXP = EXP.experiments;                                   // 整份 experiments.json
else if (EXP.steps) EXP = { [path.basename(scriptFile, '.json')]: EXP };        // 單一實驗的片段(set-exp.mjs 用的格式)
const S = JSON.parse(fs.readFileSync(storiesFile, 'utf8'));
const errors = []; let nSteps = 0, nRefs = 0;
for (const [name, E] of Object.entries(EXP)) {
  if (name.startsWith('_')) continue;
  const story = S.stories.find(s => s.id === E.storyId);
  if (!story) { errors.push(`${name}: 找不到故事 ${E.storyId}`); continue; }
  const text = p => p === 'safety' ? (story.safety && story.safety.zh) : story.body.zh[p - 1];
  const all = [...story.body.zh, story.safety && story.safety.zh, story.quiz.q.zh, story.quiz.explain.zh, ...story.quiz.options.map(o => o.zh)].filter(Boolean).join('\n');
  for (const bad of (E.forbidden || [])) if (all.includes(bad)) errors.push(`${name}: 故事文字含有與動畫矛盾的說法「${bad}」`);
  E.steps.forEach((s, i) => {
    nSteps++;
    const at = `${name} 步驟 ${i + 1}(${s.nZh || s.key})`;
    if (!s.capZh || !s.capEn || !s.nZh || !s.nEn) errors.push(`${at}: 缺少中文或英文的名稱/字幕`);
    if (Array.from(s.capZh || '').length > LIMITS.zhChars) errors.push(`${at}: 中文字幕超過 ${LIMITS.zhChars} 字`);
    if ((s.capEn || '').trim().split(/\s+/).length > LIMITS.enWords) errors.push(`${at}: 英文字幕超過 ${LIMITS.enWords} 個字`);
    (s.refs || []).forEach(r => { nRefs++; const para = text(r.para); if (!para || !para.includes(r.quote)) errors.push(`${at}: 故事第 ${r.para} 段找不到引用「${r.quote}」`); });
    if (!(s.refs || []).length && (s.status || 'match') === 'match') errors.push(`${at}: 標為「一致」卻沒有引用故事原文`);
    if (['diff', 'missing'].includes(s.status)) errors.push(`${at}: 狀態是「${s.status}」,交付前必須處理`);
  });
  (E.uncovered || []).forEach(u => { const para = text(u.para); if (!para || !para.includes(u.quote)) errors.push(`${name}: 「未涵蓋」的引用在故事第 ${u.para} 段找不到「${u.quote}」`); });
}
if (errors.length) { console.error('故事 ↔ 動畫 檢查未通過:\n - ' + errors.join('\n - ')); process.exit(1); }
console.log(`通過:${nSteps} 個步驟、${nRefs} 處引用,全部在故事原文找得到;字幕雙語齊全且在長度上限內。`);
