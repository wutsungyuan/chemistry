// 分子實驗室依階段:電子帳(價電子/共用電子對/孤對電子)的計算,以及階段用語包。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bondFacts, valenceElectrons } from '../src/game/bondfacts.js';
import { MOL, LAB_TARGETS } from '../src/data/molecules.js';
import { raw } from '../src/i18n/index.js';
import PACK from '../src/i18n/packs/lab.js';

test('已知分子的電子帳:H₂O、CO₂、N₂、NH₃、CH₄、O₂', () => {
  const f = id => bondFacts(MOL[id]);
  assert.deepEqual(f('H2O'), { electrons: 8, pairs: 2, lone: 2, unpaired: 0 });
  assert.deepEqual(f('CO2'), { electrons: 16, pairs: 4, lone: 4, unpaired: 0 });      // 兩個 C=O 雙鍵 = 4 對共用,每個 O 有 2 對孤對
  assert.deepEqual(f('N2'), { electrons: 10, pairs: 3, lone: 2, unpaired: 0 });       // 叄鍵 + 各一對孤對
  assert.deepEqual(f('NH3'), { electrons: 8, pairs: 3, lone: 1, unpaired: 0 });
  assert.deepEqual(f('CH4'), { electrons: 8, pairs: 4, lone: 0, unpaired: 0 });
  assert.deepEqual(f('O2'), { electrons: 12, pairs: 2, lone: 4, unpaired: 0 });
});

test('離子化合物與含金屬的分子沒有電子帳(不能說成共價鍵)', () => {
  const ionic = Object.values(MOL).filter(m => m.bonds.some(b => b[3] === 'ionic'));
  assert.ok(ionic.length > 0);
  for (const m of ionic) assert.equal(bondFacts(m), null, m.id);
  assert.equal(bondFacts(null), null);
});

test('所有實驗室任務:有電子帳的都合理(孤對/共用對不為負、價電子 = 2×共用 + 2×孤對 + 未成對),奇數個價電子才會有未成對', () => {
  let n = 0;
  for (const m of LAB_TARGETS) {
    const f = bondFacts(m); if (!f) continue; n++;
    assert.ok(f.pairs > 0 && f.lone >= 0, m.id);
    assert.equal(f.electrons, 2 * f.pairs + 2 * f.lone + f.unpaired, m.id);
    assert.equal(f.unpaired, f.electrons % 2, m.id);
  }
  assert.ok(n >= 10, '至少要有 10 個任務算得出電子帳:' + n);
  assert.equal(valenceElectrons('O'), 6); assert.equal(valenceElectrons('Cl'), 7); assert.equal(valenceElectrons('Xx'), 0);
});

test('語言包 lab.js:中英文 key 完全對應;每個 @level 說法都有對應的預設 key(國小用)', () => {
  assert.deepEqual(Object.keys(PACK.zh).sort(), Object.keys(PACK.en).sort());
  const zh = fs.readFileSync(new URL('../src/i18n/zh.js', import.meta.url), 'utf8');
  for (const k of Object.keys(PACK.zh)) {
    const base = k.replace(/@(teen|high)$/, '');
    if (base.startsWith('lab.facts') || base.startsWith('lab.lewis')) continue;              // 這幾個只在國中/高中使用
    assert.ok(zh.includes(`'${base}'`), `${base} 沒有國小預設`);
  }
});

test('用語依階段不同:國小「牽手」、國中「形成鍵」、高中「共價鍵/價電子」', () => {
  assert.match(raw('lab.wants', 'zh', 'kid'), /手/);
  assert.match(raw('lab.wants', 'zh', 'teen'), /鍵/); assert.ok(!/手/.test(raw('lab.wants', 'zh', 'teen')));
  assert.match(raw('lab.wants', 'zh', 'high'), /價電子/);
  assert.match(raw('lab.wants', 'en', 'kid'), /hand/); assert.match(raw('lab.wants', 'en', 'high'), /valence/);
});
