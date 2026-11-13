// 反應劇場依階段:反應清單、說明用語、原子守恆摘要、反應熱(用標準生成熱獨立驗算)。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { atomCounts, conservation, countText, storyFor, sortedSyms } from '../src/game/rxfacts.js';
import { REACTIONS, checkBalance } from '../src/data/reactions.js';
import { forLevel } from '../src/ui/level.js';
import PACK from '../src/i18n/packs/reaction.js';
import { validateReactions } from '../scripts/lib/validate-reactions.mjs';
import { MOL } from '../src/data/molecules.js';

const CJK = /[一-鿿]/;

test('原子守恆摘要:水的合成 4 H、2 O;每個反應左右相同,且與 checkBalance 一致', () => {
  const water = REACTIONS.find(r => r.id === 'water');
  assert.deepEqual(atomCounts(water.reactants), { H: 4, O: 2 }); assert.equal(countText(conservation(water).left), 'H 4、O 2');
  assert.deepEqual(sortedSyms({ O: 1, H: 2, C: 3 }), ['C', 'H', 'O']);
  for (const r of REACTIONS) { const c = conservation(r); assert.equal(c.ok, true, r.id); assert.equal(c.ok, checkBalance(r)); assert.equal(countText(c.left), countText(c.right), r.id); }
});

test('反應清單依階段:國小 6 個、國中 8 個、高中 9 個,國小 ⊂ 國中 ⊂ 高中', () => {
  const kid = forLevel(REACTIONS, 'kid'), teen = forLevel(REACTIONS, 'teen'), high = forLevel(REACTIONS, 'high');
  assert.deepEqual([kid.length, teen.length, high.length], [6, 8, 9]);
  for (const r of kid) assert.ok(teen.includes(r) && high.includes(r));
  assert.ok(!kid.some(r => r.id === 'ozone') && !teen.some(r => r.id === 'ozone') && high.some(r => r.id === 'ozone'));
});

test('說明依階段:三個階段取到不同的文字;國中/高中沒有童語、英文沒有中文字', () => {
  for (const r of REACTIONS) {
    assert.equal(storyFor(r, 'kid'), r.story); assert.equal(storyFor(r, 'teen'), r.storyTeen); assert.equal(storyFor(r, 'high'), r.storyHigh);
    assert.notEqual(r.storyTeen.zh, r.story.zh, r.id); assert.notEqual(r.storyHigh.zh, r.storyTeen.zh, r.id);
    for (const f of [r.storyTeen, r.storyHigh, r.type, r.cond]) {
      assert.ok(!/[!!]|喔|唷|耶|牽手|變成了!/.test(f.zh), `${r.id} 中文語氣:${f.zh}`);
      assert.ok(!/!/.test(f.en) && !CJK.test(f.en), `${r.id} 英文:${f.en}`);
    }
  }
  assert.equal(storyFor({ story: 'a' }, 'high'), 'a'); assert.equal(storyFor({ story: 'a', storyTeen: 'b' }, 'high'), 'b');
});

test('反應熱 dH:正負號與吸放熱一致,且和標準生成熱(教科書數值)算出的結果相符(誤差 < 10 kJ)', () => {
  // 標準生成熱 ΔfH°(kJ/mol,25 °C):水為液態;元素的穩定單質為 0
  const HF = { H2O: -285.83, CO2: -393.51, CH4: -74.81, C3H8: -104.7, C6H12O6: -1274.4, Fe2O3p: -824.2, NaClp: -411.15, O3: 142.7, H2: 0, O2: 0, Fe: 0, Na: 0, Cl2: 0 };
  let checked = 0;
  for (const r of REACTIONS) {
    assert.ok(r.heat === 'exo' || r.heat === 'endo', r.id);
    if (r.dH === undefined) { assert.equal(r.id, 'bakingsoda'); continue; }          // 小蘇打+醋沒有可靠的標準值,所以不寫
    assert.equal(r.dH < 0, r.heat === 'exo', r.id);
    const sum = side => side.reduce((s, [id, n]) => { assert.ok(id in HF, `${r.id} 缺 ${id} 的生成熱`); return s + n * HF[id]; }, 0);
    const calc = sum(r.products) - sum(r.reactants);
    assert.ok(Math.abs(calc - r.dH) < 10, `${r.id}:算出 ${calc.toFixed(1)} kJ,資料寫 ${r.dH}`);
    checked++;
  }
  assert.equal(checked, 8);
});

test('驗證腳本:缺國中版說明、dH 正負號與 heat 不一致、英文含中文字,都會被擋下', () => {
  const R = JSON.parse(fs.readFileSync(new URL('../src/data/db/reactions.json', import.meta.url), 'utf8'));
  const bad = f => { const x = JSON.parse(JSON.stringify(R)); f(x); const errs = []; validateReactions(x, MOL, { err: (id, m) => errs.push(id + ': ' + m) }); return errs; };
  assert.deepEqual(bad(() => {}), []);
  assert.ok(bad(x => { delete x.reactions[0].storyTeen; }).some(e => /storyTeen/.test(e)));
  assert.ok(bad(x => { x.reactions[0].dH = 100; }).some(e => /正負號/.test(e)));
  assert.ok(bad(x => { x.reactions[0].storyHigh.en = '氫氣'; }).some(e => /中文字/.test(e)));
  assert.ok(bad(x => { x.reactions[0].level = 'x'; }).some(e => /level/.test(e)));
});

test('語言包 reaction.js:中英文 key 完全對應', () => {
  assert.deepEqual(Object.keys(PACK.zh).sort(), Object.keys(PACK.en).sort());
});
