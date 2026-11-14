// 實驗動畫腳本(db/experiments.json):與故事原文對得起來、字幕雙語與長度、動畫只給有故事的國小版。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EXPERIMENTS, EXPERIMENT_BY_STORY, EXPERIMENTS_META } from '../src/data/experiments.js';
import { STORY_BY_ID } from '../src/data/stories.js';
import { validateExperiments, LIMITS } from '../scripts/lib/validate-experiments.mjs';

const rawX = () => JSON.parse(fs.readFileSync(new URL('../src/data/db/experiments.json', import.meta.url), 'utf8'));
const rawS = () => JSON.parse(fs.readFileSync(new URL('../src/data/db/stories.json', import.meta.url), 'utf8'));
const run = (X, S) => { const errs = []; validateExperiments(X, S, { err: (id, m) => errs.push(id + ': ' + m) }); return errs; };

test('現有的實驗動畫腳本通過驗證,有出處與限制說明', () => {
  assert.deepEqual(run(rawX(), rawS()), []);
  assert.ok(EXPERIMENTS_META.source && EXPERIMENTS_META.note && EXPERIMENTS_META.retrieved);
  assert.deepEqual(Object.keys(EXPERIMENTS).sort(), ['air', 'cabbage', 'candle', 'fireworks', 'iron', 'mendeleev', 'salt']);
});

test('每個動畫對應一則國小版故事;可以用故事 id 找到動畫', () => {
  for (const [key, e] of Object.entries(EXPERIMENTS)) {
    assert.ok(STORY_BY_ID[e.storyId], key + ' 的故事存在');
    assert.equal(STORY_BY_ID[e.storyId].level, 'kid');
    assert.equal(EXPERIMENT_BY_STORY[e.storyId].key, key);
  }
});

test('每一步:中英文名稱與字幕都有,長度在上限內,英文不含中文字', () => {
  for (const [key, e] of Object.entries(EXPERIMENTS)) for (const s of e.steps) {
    assert.ok(s.nZh && s.nEn && s.capZh && s.capEn, key + ' ' + s.key);
    assert.ok(Array.from(s.capZh).length <= LIMITS.zhChars, key + ' ' + s.key + ' 中文字幕太長');
    assert.ok(s.capEn.trim().split(/\s+/).length <= LIMITS.enWords, key + ' ' + s.key + ' 英文字幕太長');
    assert.ok(!/[一-鿿]/.test(s.capEn + s.nEn), key + ' ' + s.key + ' 英文含中文字');
  }
});

test('動畫與故事對不起來時會被擋下:引用找不到、與動畫矛盾的說法、缺英文字幕、字幕太長', () => {
  const bad1 = rawS(); bad1.stories.find(s => s.id === 'cabbage').body.zh[1] = '滴一點醋進去，菜汁會變成黃色。';
  assert.ok(run(rawX(), bad1).some(m => /找不到引用/.test(m)));
  const bad2 = rawS(); bad2.stories.find(s => s.id === 'fire').body.zh[2] = '這是因為杯子裡的氧氣被燒完了。';
  assert.ok(run(rawX(), bad2).some(m => /與動畫矛盾/.test(m)));
  const bad3 = rawX(); delete bad3.experiments.candle.steps[2].capEn;
  assert.ok(run(bad3, rawS()).some(m => /缺少中文或英文/.test(m)));
  const bad4 = rawX(); bad4.experiments.candle.steps[2].capZh = '很長'.repeat(20);
  assert.ok(run(bad4, rawS()).some(m => /中文字幕超過/.test(m)));
  const bad5 = rawX(); bad5.experiments.candle.afterPara = 9;
  assert.ok(run(bad5, rawS()).some(m => /afterPara/.test(m)));
});

test('蠟燭故事不再說「氧氣被燒完」(動畫顯示氧氣只是變少,火熄時還剩約 75%)', () => {
  const s = STORY_BY_ID.fire, all = [...s.body.zh, s.quiz.explain.zh, ...s.quiz.options.map(o => o.zh)].join('');
  assert.ok(!/燒完|用完/.test(all));
  assert.ok(/變少/.test(all));
});
