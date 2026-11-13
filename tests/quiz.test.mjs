// 小測驗依階段出題:題型、題目格式、價電子等資料一致性、每個階段的用語都有中英文。
import test from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, makeQuestion, isMainGroup, valenceOf } from '../src/game/questions.js';
import { ELEMENTS } from '../src/data/elements.js';
import { raw } from '../src/i18n/index.js';
import PACK from '../src/i18n/packs/quiz.js';

const LEVELS = ['kid', 'teen', 'high'];

test('題型:國小沒有光譜與進階題;高中有週期/價電子,且不出最基礎的符號題', () => {
  assert.ok(!KINDS.kid.includes('spectrum') && !KINDS.kid.includes('z2sym') && !KINDS.kid.includes('period'));
  assert.ok(KINDS.teen.includes('z2sym') && KINDS.teen.includes('cat') && KINDS.teen.includes('spectrum'));
  assert.ok(KINDS.high.includes('period') && KINDS.high.includes('valence'));
  assert.ok(!KINDS.high.includes('sym2name') && !KINDS.high.includes('name2sym') && !KINDS.high.includes('fact'));
});

test('每個階段隨機出 400 題:都有 2~4 個選項、恰好一個正確、答案文字存在,題型不超出該階段', () => {
  for (const lv of LEVELS) {
    const seen = new Set();
    for (let i = 0; i < 400; i++) {
      const q = makeQuestion(lv);
      seen.add(q.kind);
      assert.ok(KINDS[lv].includes(q.kind), `${lv} 出了不屬於它的題型 ${q.kind}`);
      assert.ok(q.opts.length >= 2 && q.opts.length <= 4, `${lv}/${q.kind} 選項數 ${q.opts.length}`);
      assert.equal(q.opts.filter(o => o.ok).length, 1, `${lv}/${q.kind} 正確答案不是剛好一個`);
      assert.equal(new Set(q.opts.map(o => o.html)).size, q.opts.length, `${lv}/${q.kind} 選項重複`);
      assert.ok(q.answerText && q.answerText !== 'undefined');
      assert.ok(q.q.key);
    }
    assert.deepEqual([...seen].sort(), [...new Set(KINDS[lv])].sort(), `${lv} 有題型從沒出現`);
  }
});

test('價電子題的資料一致:主族元素最外層電子數 = 由欄位推出的族數(He 為 2)', () => {
  const mains = ELEMENTS.filter(isMainGroup);
  assert.ok(mains.length > 30);
  for (const e of mains) {
    const expect = e.sym === 'He' ? 2 : e.col <= 2 ? e.col : e.col - 10;
    assert.equal(valenceOf(e), expect, `${e.sym} 價電子`);
  }
});

test('每一題的題目文字在三個階段、中英文都找得到(不會顯示成 key 本身)', () => {
  const keys = new Set();
  for (const lv of LEVELS) for (let i = 0; i < 300; i++) keys.add(makeQuestion(lv).q.key);
  keys.add('quiz.right'); keys.add('quiz.wrong');
  for (const k of keys) for (const lang of ['zh', 'en']) for (const lv of LEVELS) assert.notEqual(raw(k, lang, lv), k, `${k} 缺少 ${lang}/${lv}`);
});

test('語言包 quiz.js:中英文的 key 完全對應;同一題的階段說法三種都不同於彼此時才寫 @', () => {
  assert.deepEqual(Object.keys(PACK.zh).sort(), Object.keys(PACK.en).sort());
  for (const k of Object.keys(PACK.zh)) assert.ok(PACK.zh[k].length > 0 && PACK.en[k].length > 0);
  assert.notEqual(raw('quiz.right', 'zh', 'kid'), raw('quiz.right', 'zh', 'high'));              // 用語確實依階段不同
  assert.notEqual(raw('quiz.q.sym2name', 'en', 'kid'), raw('quiz.q.sym2name', 'en', 'high'));
});
