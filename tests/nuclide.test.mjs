// 核種資料與換算:守恆、夸克電荷、原子量加權平均、半衰期的人話、衰變統計。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NUCLIDES, NUCLIDE_META } from '../src/data/generated/nuclides.js';
import { ELEMENTS, BY_Z } from '../src/data/elements.js';
import { nuclide, daughter, quarks, averageMass, fractionLeft, lambda, meanLife, decayTimes, countLeft, humanHalfLife, listFor, defaultNuclide, useOf, USES } from '../src/data/nuclide.js';

const all = z => NUCLIDES[z].map(r => nuclide(z, r));
const find = (z, a) => all(z).find(x => x.a === a);

test('資料有標示出處,118 個元素都有核種', () => {
  assert.ok(NUCLIDE_META.source.includes('IAEA') && NUCLIDE_META.url.startsWith('https://') && NUCLIDE_META.retrieved);
  for (const { z } of ELEMENTS) assert.ok(NUCLIDES[z]?.length, 'Z=' + z);
});

test('子核:質量數與電荷守恆(β⁻、β⁺、α、質子/中子發射),碳-14 → 氮-14,碳-11 → 硼-11', () => {
  for (const [mode, dz, dn] of [['B-', 1, -1], ['B+', -1, 1], ['A', -2, -2], ['P', -1, 0], ['N', 0, -1]]) {
    const d = daughter(6, 8, mode); assert.deepEqual([d.z - 6, d.n - 8], [dz, dn], mode);
  }
  assert.deepEqual(daughter(6, 8, 'B-'), { z: 7, n: 7 });               // 碳-14 → 氮-14(7 質子、7 中子)
  assert.deepEqual(daughter(6, 5, 'B+'), { z: 5, n: 6 });               // 碳-11 → 硼-11
  assert.deepEqual(daughter(92, 146, 'A'), { z: 90, n: 144 });          // 鈾-238 → 釷-234
  assert.equal(daughter(92, 146, 'SF'), null);
});

test('資料裡每個 β⁻/β⁺/α 衰變的子核,都真的存在於資料裡(或是半衰期極短的共振態而沒收錄)', () => {
  let checked = 0, missing = 0;
  for (const { z } of ELEMENTS) for (const x of all(z)) {
    if (x.stable || !['B-', 'B+', 'A'].includes(x.mode) || x.pct < 50) continue;
    const d = daughter(z, x.n, x.mode); if (!d || !BY_Z[d.z]) continue;
    checked++; if (!NUCLIDES[d.z]?.some(r => r[0] === d.n)) missing++;
  }
  assert.ok(checked > 2000, '檢查數 ' + checked);
  assert.ok(missing / checked < 0.1, `子核不在資料裡的比例 ${(missing / checked * 100).toFixed(1)}%`);
});

test('夸克:質子 uud、中子 udd;總夸克數 = 3A;電荷 = 質子數(碳-14:u=20、d=22)', () => {
  assert.deepEqual(quarks(1, 0), { u: 2, d: 1, total: 3, charge: 1 });     // 質子
  assert.deepEqual(quarks(0, 1), { u: 1, d: 2, total: 3, charge: 0 });     // 中子
  const q = quarks(6, 8); assert.deepEqual([q.u, q.d, q.total, q.charge], [20, 22, 42, 6]);
  for (const { z } of ELEMENTS) for (const x of all(z)) { const k = quarks(z, x.n); assert.equal(k.total, 3 * x.a); assert.ok(Math.abs(k.charge - z) < 1e-9); }
});

test('原子量 = 各同位素質量按天然豐度的加權平均:和週期表上的值一致(氯 35.45、碳 12.011、銅 63.546)', () => {
  assert.ok(Math.abs(averageMass(all(17)) - 35.45) < 0.01);
  assert.ok(Math.abs(averageMass(all(6)) - 12.011) < 0.002);
  assert.ok(Math.abs(averageMass(all(29)) - 63.546) < 0.005);
  for (const z of [1, 8, 12, 26, 47, 82]) assert.ok(Math.abs(averageMass(all(z)) - BY_Z[z].mass) / BY_Z[z].mass < 5e-4, BY_Z[z].sym);
});

test('資料裡的值:碳-14 約 5700 年(β⁻)、碳-11 約 20 分鐘(β⁺)、鈾-238 約 45 億年(α)、氚約 12.3 年', () => {
  const y = x => x.hl / (365.25 * 86400);
  assert.ok(Math.abs(y(find(6, 14)) - 5700) / 5700 < 0.01 && find(6, 14).mode === 'B-');
  assert.ok(Math.abs(find(6, 11).hl / 60 - 20.36) < 0.1 && find(6, 11).mode === 'B+');
  assert.ok(Math.abs(y(find(92, 238)) / 4.468e9 - 1) < 0.01 && find(92, 238).mode === 'A');
  assert.ok(Math.abs(y(find(1, 3)) - 12.32) < 0.05);
  assert.equal(find(6, 12).mass, 12); assert.ok(find(6, 12).stable && find(6, 13).stable);
});

test('半衰期:剩下 (1/2)^t;λ = ln2/T;τ = T/ln2;一個半衰期剩一半、五個剩 1/32', () => {
  assert.equal(fractionLeft(1), 0.5); assert.equal(fractionLeft(5), 1 / 32);
  assert.ok(Math.abs(lambda(5700) * meanLife(5700) - 1) < 1e-12);
  assert.ok(Math.abs(meanLife(5700) / 5700 - 1 / Math.LN2) < 1e-12);
});

test('一堆原子的衰變:亂數固定(每次一樣)、時間越久剩越少;很多顆時剩下比例接近 (1/2)^t', () => {
  const a = decayTimes(100, 7), b = decayTimes(100, 7); assert.deepEqual(a, b);
  let prev = 101; for (const t of [0, 0.5, 1, 2, 3, 5, 8]) { const c = countLeft(a, t); assert.ok(c <= prev); prev = c; }
  assert.equal(countLeft(a, 0), 100);
  const big = decayTimes(40000, 3);
  for (const t of [0.5, 1, 2, 4]) assert.ok(Math.abs(countLeft(big, t) / 40000 - fractionLeft(t)) < 0.01, 't=' + t);
});

test('半衰期的人話(中英)', () => {
  const y = 365.25 * 86400;
  assert.equal(humanHalfLife(0), null);
  assert.equal(humanHalfLife(5700 * y), '5700 年'); assert.equal(humanHalfLife(5700 * y, 'en'), '5700 years');
  assert.equal(humanHalfLife(4.468e9 * y), '44.7 億年'); assert.equal(humanHalfLife(4.468e9 * y, 'en'), '4.47 billion years');
  assert.equal(humanHalfLife(1221.84), '20.36 分鐘'); assert.equal(humanHalfLife(8.0252 * 86400), '8.025 天');
  assert.equal(humanHalfLife(0.0061), '6.1 毫秒'); assert.equal(humanHalfLife(2.449), '2.449 秒');
  assert.equal(humanHalfLife(2.449, 'en'), '2.449 seconds');
});

test('各階段的核種清單:國小只看穩定與半衰期 ≥ 1 天;高中看全部;沒有穩定核種時退而列最長壽的', () => {
  const c = all(6), kid = listFor('kid', c).map(x => x.a), high = listFor('high', c);
  assert.deepEqual(kid, [12, 13, 14]); assert.equal(high.length, c.length);
  assert.ok(listFor('teen', c).map(x => x.a).includes(15) && !listFor('teen', c).map(x => x.a).includes(22));
  const og = all(118); assert.ok(listFor('kid', og).length >= 1 && listFor('kid', og).length <= 3);
  assert.equal(defaultNuclide(c).a, 12); assert.equal(defaultNuclide(all(92)).a, 238);
});

test('用途說明的核種都真的存在,而且是放射性的或有特別意義', () => {
  for (const k of Object.keys(USES)) { const [z, a] = k.split('-').map(Number); assert.ok(find(z, a), k); assert.ok(USES[k].zh && USES[k].en); }
  assert.ok(useOf(6, 14).zh.includes('定年') && useOf(6, 12) === null);
});

test('畫面上那 100 顆原子的抽樣(固定種子)很典型:每過一個半衰期約剩一半(誤差 ≤ 1 顆)', () => {
  const src = fs.readFileSync(new URL('../src/scenes/NuclearView.js', import.meta.url), 'utf8');
  const seed = +/TYPICAL_SEED = (\d+)/.exec(src)[1], t = decayTimes(100, seed);
  for (const k of [1, 2, 3, 4, 5]) assert.ok(Math.abs(countLeft(t, k) - 100 * 0.5 ** k) <= 1, `t=${k}:${countLeft(t, k)}`);
});
