// 入口頁三顆星球的軌道:真正的三體 8 字形解,要穩定、會週期重複、星球之間不會撞在一起。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFigureEight, T0 } from '../src/landing/orbit.js';

test('能量守恆:跑 10 圈相對誤差 < 1e-5', () => {
  const o = createFigureEight(), e0 = o.energy();
  o.step(10 * T0);
  assert.ok(Math.abs(o.energy() - e0) / Math.abs(e0) < 1e-5);
});

test('跑一圈後回到出發的位置(週期 T0)', () => {
  const o = createFigureEight(); o.step(T0);
  assert.ok(Math.hypot(o.pos(0)[0] + 0.97000436, o.pos(0)[1] - 0.24308753) < 1e-3);
});

test('三顆星球最近也有 0.6 以上的距離、軌道範圍在 8 字內(畫面上的星球大小以此為準)', () => {
  const o = createFigureEight(); let minSep = Infinity, maxX = 0, maxY = 0;
  for (let k = 0; k < 3000; k++) {
    o.step(T0 / 3000); minSep = Math.min(minSep, o.minSeparation());
    for (let i = 0; i < 3; i++) { maxX = Math.max(maxX, Math.abs(o.pos(i)[0])); maxY = Math.max(maxY, Math.abs(o.pos(i)[1])); }
  }
  assert.ok(minSep > 0.6, 'minSep=' + minSep);
  assert.ok(maxX < 1.1 && maxY < 0.4, `maxX=${maxX} maxY=${maxY}`);
});

test('一次走很大的時間步(例如分頁切回來)也不會發散', () => {
  const o = createFigureEight(); o.step(0.5); o.step(0.5);
  for (let i = 0; i < 3; i++) assert.ok(Number.isFinite(o.pos(i)[0]) && Math.abs(o.pos(i)[0]) < 1.2);
});
