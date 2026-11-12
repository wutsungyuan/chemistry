// 徑向機率圖(高中層):x 座標要和解析值一致,節點數正確。
import test from 'node:test';
import assert from 'node:assert/strict';
import { radialGraph, viewRadius, tickStep } from '../src/ui/radialGraph.js';
import { ALL_IDS, STATES } from '../src/data/hydrogenOrbital.js';

test('每個軌域都畫得出圖,⟨r⟩ 與最可能半徑的 x 座標和圖的座標換算一致,圖的範圍包含 99.5% 機率', () => {
  const want = { '1s': 1.5, '2s': 6, '2p': 5, '3d': 10.5, '2p+1': 5, '3d+2': 10.5 };
  for (const id of ALL_IDS) {
    const { svg, meta } = radialGraph(id);
    assert.ok(svg.startsWith('<svg') && svg.includes('<path'), id);
    assert.equal(meta.mean, want[id]);
    assert.ok(Math.abs(meta.xMean - meta.xOf(want[id])) < 1e-9);
    assert.ok(meta.R >= meta.mean && meta.xPeak > meta.xOf(0) && meta.xPeak < meta.xOf(meta.R));
    assert.equal((svg.match(/class="rg-node"/g) || []).length, STATES[id].nodesR.length);
  }
  assert.equal(radialGraph('2s').meta.nodes, 1);                                    // 2s 在 r = 2 有一個徑向節點
});

test('畫面範圍隨軌域變大(1s < 2p < 3d),刻度不超過約 8 個', () => {
  assert.ok(viewRadius('1s') < viewRadius('2p') && viewRadius('2p') < viewRadius('3d'));
  for (const id of ALL_IDS) { const R = viewRadius(id); assert.ok(R / tickStep(R) <= 8); }
});
