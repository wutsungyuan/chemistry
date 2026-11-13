// 圖鑑依階段:分子數據(由座標算出)、每個階段看得到哪些分子、國中/高中版說明文字。
import test from 'node:test';
import assert from 'node:assert/strict';
import { molFacts, hasGeometry, factFor, molarMass, formulaMass } from '../src/game/molfacts.js';
import { MOL, GALLERY, MOLECULES } from '../src/data/molecules.js';
import { forLevel } from '../src/ui/level.js';
import PACK from '../src/i18n/packs/gallery.js';

const near = (x, y, tol) => assert.ok(Math.abs(x - y) <= tol, `${x} 與 ${y} 差超過 ${tol}`);
const bond = (f, a, b) => f.bonds.find(x => x.a === a && x.b === b);
const ang = (f, a, c, b) => f.angles.find(x => x.a === a && x.center === c && x.b === b);

test('已知分子的分子量、鍵長、鍵角(與文獻值相符)', () => {
  const w = molFacts(MOL.H2O);
  near(w.mass, 18.015, 0.02); assert.equal(bond(w, 'O', 'H').count, 2); near(bond(w, 'O', 'H').length, 0.958, 0.02); near(ang(w, 'H', 'O', 'H').deg, 104.5, 1);
  const c = molFacts(MOL.CO2);
  near(c.mass, 44.009, 0.02); assert.equal(bond(c, 'C', 'O').order, 2); assert.equal(bond(c, 'C', 'O').count, 2); near(bond(c, 'C', 'O').length, 1.16, 0.02); near(ang(c, 'O', 'C', 'O').deg, 180, 1);
  const m = molFacts(MOL.CH4);
  assert.equal(bond(m, 'C', 'H').count, 4); near(bond(m, 'C', 'H').length, 1.09, 0.02); const hch = ang(m, 'H', 'C', 'H'); assert.equal(hch.count, 6); near(hch.deg, 109.5, 1);
  const n = molFacts(MOL.NH3); near(bond(n, 'N', 'H').length, 1.01, 0.02); near(ang(n, 'H', 'N', 'H').deg, 107, 1.5);
  near(ang(molFacts(MOL.O3), 'O', 'O', 'O').deg, 117, 1.5);
  near(bond(molFacts(MOL.N2), 'N', 'N').length, 1.10, 0.02); assert.equal(bond(molFacts(MOL.N2), 'N', 'N').order, 3);
});

test('晶體、離子化合物、簡化示意沒有鍵長鍵角(只有分子量/式量),避免誤導', () => {
  const nacl = molFacts(MOL.NaCl); assert.equal(nacl.bonds.length, 0); assert.equal(nacl.angles.length, 0); assert.equal(nacl.kind, 'formula'); near(nacl.mass, 58.44, 0.05);   // 晶體畫的是一小塊,質量要由化學式算
  near(formulaMass('Fe2O3'), 159.69, 0.02); assert.equal(formulaMass('Ca(OH)2'), null); assert.equal(molFacts(MOL.H2O).kind, 'molecular');
  assert.equal(hasGeometry(MOL.NaCl), false); assert.equal(hasGeometry(MOL.diamond), false); assert.equal(hasGeometry(MOL.H2O), true);
  assert.equal(molFacts(null), null);
});

test('所有有幾何數據的分子:鍵長 0.7~2.8 Å、鍵角 20~180°、各組數量加起來 = 鍵數', () => {
  let n = 0;
  for (const m of MOLECULES) {
    if (!hasGeometry(m)) continue; n++;
    const f = molFacts(m);
    assert.equal(f.bonds.reduce((s, b) => s + b.count, 0), m.bonds.length, m.id);
    for (const b of f.bonds) assert.ok(b.length > 0.7 && b.length < 2.8, `${m.id} ${b.a}${b.sign}${b.b} 鍵長 ${b.length.toFixed(2)}`);
    for (const a of f.angles) assert.ok(a.deg > 20 && a.deg <= 180.0001, `${m.id} 鍵角 ${a.deg.toFixed(1)}`);
    near(f.mass, molarMass(m), 1e-9);
  }
  assert.ok(n >= 25, '有幾何數據的分子數:' + n);
});

test('圖鑑依階段:每筆都有合法 level;國小 ⊂ 國中 ⊂ 高中;每個階段至少 10 個可見分子', () => {
  for (const m of MOLECULES) assert.ok(['kid', 'teen', 'high'].includes(m.level), m.id);
  const kid = forLevel(GALLERY, 'kid'), teen = forLevel(GALLERY, 'teen'), high = forLevel(GALLERY, 'high');
  assert.ok(kid.length >= 15 && kid.length < teen.length && teen.length < high.length);
  assert.equal(high.length, GALLERY.length);
  for (const m of kid) assert.ok(teen.includes(m) && high.includes(m));
  for (const id of ['H2O', 'O2', 'CO2', 'CH4', 'NaCl']) assert.ok(kid.some(m => m.id === id), id + ' 應該是國小就看得到');
  for (const id of ['UO2', 'WC', 'HgS']) assert.ok(!kid.some(m => m.id === id) && !teen.some(m => m.id === id), id + ' 應該只有高中');
});

test('說明文字依階段:用「手牽手」比喻的分子,國中/高中版改用正式說法;沒有專屬版本的退回 fact', () => {
  for (const id of ['H2', 'O2', 'NO2', 'diamond', 'Cl2', 'HF', 'H3PO4', 'a-He', 'C2H2']) {
    const m = MOL[id];
    assert.ok(m.factTeen?.zh && m.factTeen?.en && m.factHigh?.zh && m.factHigh?.en, id);
    for (const f of [m.factTeen, m.factHigh]) assert.ok(!/手牽手|牽手|牽了|抓得/.test(f.zh), `${id} 國中/高中說明還有手牽手的說法`);
    assert.equal(factFor(m, 'kid'), m.fact); assert.equal(factFor(m, 'teen'), m.factTeen); assert.equal(factFor(m, 'high'), m.factHigh);
  }
  assert.equal(factFor({ fact: 'a' }, 'high'), 'a'); assert.equal(factFor({ fact: 'a', factTeen: 'b' }, 'high'), 'b');   // 沒有高中版 → 國中版 → 國小版
});

test('語言包 gallery.js:中英文 key 完全對應', () => {
  assert.deepEqual(Object.keys(PACK.zh).sort(), Object.keys(PACK.en).sort());
});
