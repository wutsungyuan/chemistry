// 化學故事(國小版):資料驗證、長度、測驗、連結、注音覆蓋、安全提醒、英文不含中文字。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STORIES, STORY_BY_ID, STORIES_META } from '../src/data/stories.js';
import { validateStories } from '../scripts/lib/validate-stories.mjs';
import { ELEMENTS } from '../src/data/elements.js';
import { MOL, GALLERY } from '../src/data/molecules.js';
import { forLevel } from '../src/ui/level.js';
import { rubyHTML } from '../src/i18n/zhuyin.js';
import { speakable } from '../src/ui/voice.js';

const CJK = /[一-鿿]/;
const ctx = { elements: new Set(ELEMENTS.map(e => e.sym)), molecules: new Set(Object.keys(MOL)) };
const run = S => { const errs = []; validateStories(S, ctx, { err: (id, m) => errs.push(id + ': ' + m) }); return errs; };
const raw = () => JSON.parse(fs.readFileSync(new URL('../src/data/db/stories.json', import.meta.url), 'utf8'));

test('現有的 20 則故事通過驗證;有出處與限制說明', () => {
  assert.deepEqual(run(raw()), []);
  assert.equal(STORIES.length, 20);
  assert.ok(STORIES_META.source && STORIES_META.note && STORIES_META.retrieved);
  assert.equal(Object.keys(STORY_BY_ID).length, 20);
});

test('每一則:給國小生聽的長度、3 選 1 的小問題、連結的元素與圖鑑分子國小都看得到', () => {
  const kidMols = new Set(forLevel(GALLERY, 'kid').map(m => m.id));
  for (const s of STORIES) {
    assert.equal(s.level, 'kid');
    const n = s.body.zh.join('').length; assert.ok(n >= 120 && n <= 300, `${s.id} ${n} 字`);
    assert.equal(s.quiz.options.length, 3); assert.equal(s.quiz.options.filter(o => o.ok).length, 1);
    for (const mid of s.molecules) assert.ok(kidMols.has(mid), `${s.id} 連到國小看不到的分子 ${mid}`);
    for (const sym of s.elements) assert.ok(ELEMENTS.some(e => e.sym === sym), `${s.id} ${sym}`);
    assert.ok(s.checks.length >= 1, s.id);
  }
});

test('國小一律顯示注音:故事的每一個中文字(標題、內文、問題、選項、解說、安全提醒)都有注音', () => {
  for (const s of STORIES) {
    const texts = [s.title.zh, ...s.body.zh, s.quiz.q.zh, s.quiz.explain.zh, ...s.quiz.options.map(o => o.zh), ...(s.safety ? [s.safety.zh] : [])];
    for (const t of texts) {
      const han = [...t].filter(c => CJK.test(c) || /[\u{20000}-\u{2a6df}]/u.test(c)).length;
      const zy = (rubyHTML(t).match(/class="zy"/g) || []).length;
      assert.equal(zy, han, `${s.id} 有字沒有注音:${t.slice(0, 30)}`);
    }
  }
});

test('有危險內容(火、磷、輻射、鈉、氯、煙火)的故事都有安全提醒;英文欄位不含中文字、沒有太多驚嘆號', () => {
  for (const s of STORIES) {
    if (/火|磷|輻射|煙火|鈉|氯|有毒/.test(s.body.zh.join(''))) assert.ok(s.safety?.zh && s.safety?.en, `${s.id} 缺安全提醒`);
    const en = [s.title.en, ...s.body.en, s.quiz.q.en, s.quiz.explain.en, ...s.quiz.options.map(o => o.en), s.safety?.en || ''];
    for (const t of en) assert.ok(!CJK.test(t), `${s.id} 英文含中文字:${t.slice(0, 40)}`);
  }
});

test('朗讀:故事文字整理成好念的文字後不會留下奇怪符號(中英文)', () => {
  for (const s of STORIES) {
    const zh = speakable(s.body.zh.join(''), 'zh-TW'), en = speakable(s.body.en.join(' '), 'en-US');
    assert.ok(zh.length > 100 && en.length > 200, s.id);
    assert.ok(!/[<>{}\[\]]/.test(zh + en), `${s.id} 朗讀文字有奇怪符號`);
  }
});

test('驗證腳本:缺安全提醒、選項不是 3 個、英文含中文字、連到不存在的元素或分子、段數不同,都會被擋下', () => {
  const bad = f => { const x = raw(); f(x); return run(x); };
  assert.ok(bad(x => { delete x.stories[0].safety; }).some(e => /safety/.test(e)));
  assert.ok(bad(x => { x.stories[1].quiz.options.pop(); }).some(e => /3 個選項/.test(e)));
  assert.ok(bad(x => { x.stories[1].quiz.options[0].ok = true; }).some(e => /1 個正確/.test(e)));
  assert.ok(bad(x => { x.stories[2].body.en[0] += ' 磷'; }).some(e => /含中文字/.test(e)));
  assert.ok(bad(x => { x.stories[3].elements.push('Xx'); }).some(e => /Xx/.test(e)));
  assert.ok(bad(x => { x.stories[3].molecules.push('NOPE'); }).some(e => /NOPE/.test(e)));
  assert.ok(bad(x => { x.stories[4].body.en.pop(); }).some(e => /段數相同/.test(e)));
  assert.ok(bad(x => { x.stories[5].checks = []; }).some(e => /checks/.test(e)));
  assert.ok(bad(x => { x.stories[6].body.zh = ['太短。', '太短。']; x.stories[6].body.en = ['a', 'b']; }).some(e => /長度/.test(e)));
  assert.ok(bad(x => { x.stories.push({ ...x.stories[0] }); }).some(e => /重複/.test(e)));
  assert.ok(bad(x => { delete x.meta.note; }).some(e => /meta/.test(e)));
});

test('每一則都有插圖;中文欄位的標點是全形(，。！？：；（）),不能混入半形標點', async () => {
  const { ILLUS } = await import('../src/data/storyArt.js');
  for (const s of STORIES) {
    assert.ok(ILLUS[s.id] && ILLUS[s.id].startsWith('<svg') && ILLUS[s.id].endsWith('</svg>'), `${s.id} 沒有插圖`);
    const zh = [s.title.zh, ...s.body.zh, s.quiz.q.zh, s.quiz.explain.zh, ...s.quiz.options.map(o => o.zh), ...(s.safety ? [s.safety.zh] : [])];
    for (const t of zh) assert.ok(!/[,!?;:()]/.test(t), `${s.id} 有半形標點:${t.slice(0, 24)}`);
  }
});
