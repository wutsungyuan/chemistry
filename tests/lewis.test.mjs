// 路易斯結構:電子分配、形式電荷、2D 排版與 SVG。
import test from 'node:test';
import assert from 'node:assert/strict';
import { lewisStructure } from '../src/game/lewis.js';
import { bondFacts } from '../src/game/bondfacts.js';
import { lewisSVG } from '../src/ui/lewisView.js';
import { MOL, GALLERY } from '../src/data/molecules.js';

const L = id => lewisStructure(MOL[id]);
const by = (s, sym) => s.atoms.filter(a => a.sym === sym);

test('水、二氧化碳、氮氣、氨、甲烷的孤對電子', () => {
  assert.deepEqual(by(L('H2O'), 'O').map(a => a.lone), [2]);
  assert.deepEqual(by(L('CO2'), 'O').map(a => a.lone), [2, 2]);
  assert.deepEqual(by(L('CO2'), 'C').map(a => a.lone), [0]);
  assert.deepEqual(by(L('N2'), 'N').map(a => a.lone), [1, 1]);
  assert.deepEqual(by(L('NH3'), 'N').map(a => a.lone), [1]);
  assert.deepEqual(by(L('CH4'), 'C').map(a => a.lone), [0]);
  for (const id of ['H2O', 'NH3', 'CH4']) for (const h of by(L(id), 'H')) assert.equal(h.lone + h.unpaired, 0);     // 氫沒有孤對電子
});

test('形式電荷:O₃ 的中心 O 是 +1、一端 O 是 −1;CO 的 C 是 −1、O 是 +1;水、二氧化碳都是 0', () => {
  const o3 = L('O3').atoms.map(a => a.charge).sort();
  assert.deepEqual(o3, [-1, 0, 1]);
  const co = L('CO'); assert.equal(by(co, 'C')[0].charge, -1); assert.equal(by(co, 'O')[0].charge, 1);
  for (const id of ['H2O', 'CO2', 'NH3', 'CH4', 'O2', 'N2']) assert.ok(L(id).atoms.every(a => a.charge === 0), id);
});

test('NO₂(奇數電子):留下 1 個未成對電子;SO₂:S 有 1 對孤對電子', () => {
  const no2 = L('NO2'); assert.equal(no2.atoms.reduce((s, a) => s + a.unpaired, 0), 1); assert.equal(by(no2, 'N')[0].unpaired, 1);
  assert.equal(by(L('SO2'), 'S')[0].lone, 1);
});

test('每個算得出電子帳的分子(≤14 個原子):電子守恆、總電荷 0、與 bondFacts 一致、排版沒有重疊', () => {
  let n = 0;
  for (const m of GALLERY) {
    const s = lewisStructure(m); if (!s) continue; n++;
    const f = bondFacts(m);
    assert.equal(s.atoms.reduce((t, a) => t + a.lone, 0), f.lone, m.id + ' 孤對電子數');
    assert.equal(s.atoms.reduce((t, a) => t + a.unpaired, 0), f.unpaired, m.id + ' 未成對電子數');
    assert.equal(s.atoms.reduce((t, a) => t + a.charge, 0), 0, m.id + ' 形式電荷總和');
    for (let i = 0; i < s.atoms.length; i++) for (let j = i + 1; j < s.atoms.length; j++) {
      const d = Math.hypot(s.atoms[i].x - s.atoms[j].x, s.atoms[i].y - s.atoms[j].y);
      assert.ok(d > 0.45, `${m.id} 原子 ${i},${j} 重疊 (d=${d.toFixed(2)})`);
    }
    assert.ok(s.atoms.every(a => Number.isFinite(a.x) && Number.isFinite(a.y)), m.id);
  }
  assert.ok(n >= 12, '至少 12 個分子畫得出路易斯結構:' + n);
});

test('離子化合物、金屬、太大的分子不畫(null);SVG 有符號、鍵線、電子點', () => {
  assert.equal(L('NaCl'), null); assert.equal(L('C6H12O6'), null); assert.equal(lewisStructure(null), null);
  const svg = lewisSVG(L('H2O'), { label: 'water' });
  assert.match(svg, /^<svg class="lewis-svg"/); assert.equal((svg.match(/<line /g) || []).length, 2); assert.equal((svg.match(/<circle /g) || []).length, 4);
  assert.match(svg, />O</); assert.equal((svg.match(/>H</g) || []).length, 2);
  assert.equal((lewisSVG(L('CO2')).match(/<line /g) || []).length, 4);                       // 兩個雙鍵 = 4 條線
  assert.equal((lewisSVG(L('N2')).match(/<line /g) || []).length, 3);                        // 叄鍵 = 3 條線
  assert.match(lewisSVG(L('O3')), /lw-ch/);                                                  // 有形式電荷標示
});
