// 氫原子電子雲的物理驗證:歸一化、平均半徑、節點、取樣統計,以及和光譜(656.3 nm)的連結。
import test from 'node:test';
import assert from 'node:assert/strict';
import { STATES, STATE_IDS, psiAt, radialProb, meanRadius, integrate, cloudRadius, sampleCloud, makeRng, levelEV, photonNm } from '../src/data/hydrogenOrbital.js';
import { SPECTRA } from '../src/data/generated/spectra.js';

test('徑向機率歸一化:∫ r²R² dr = 1(含雲的截斷半徑內 ≥ 99.9%)', () => {
  for (const id of STATE_IDS) {
    const total = integrate(r => radialProb(id, r), 0, 200, 20000), inside = integrate(r => radialProb(id, r), 0, cloudRadius(id), 20000);
    assert.ok(Math.abs(total - 1) < 1e-4, `${id} 總機率 ${total}`);
    assert.ok(inside > 0.999, `${id} 雲半徑內只有 ${inside}`);
  }
});

test('角度部分歸一化:∫ Y² dΩ = 1', () => {
  for (const id of STATE_IDS) {
    const ang = integrate(c => psiAt(id, 1, c) ** 2 / radialProb(id, 1), -1, 1, 4000) * 2 * Math.PI;   // psi² = R²Y²,radialProb(1)=R(1)²
    assert.ok(Math.abs(ang - 1) < 1e-4, `${id} 角度歸一化 ${ang}`);
  }
});

test('平均半徑符合解析式 <r> = (3n² − l(l+1))/2:1s 1.5、2s 6、2p 5、3d 10.5 a0', () => {
  const want = { '1s': 1.5, '2s': 6, '2p': 5, '3d': 10.5 };
  for (const id of STATE_IDS) {
    assert.equal(meanRadius(id), want[id]);
    const num = integrate(r => r * radialProb(id, r), 0, 200, 20000);
    assert.ok(Math.abs(num - want[id]) < 1e-3, `${id} 數值 ${num}`);
  }
});

test('節點:2s 在 r = 2 a0 為零(球面);2p 在 z = 0 為零(平面);3d 在 cosθ = ±1/√3 為零(兩個圓錐)', () => {
  assert.ok(Math.abs(psiAt('2s', 2, 0.3)) < 1e-12);
  assert.ok(Math.abs(psiAt('2p', 5, 0)) < 1e-12);
  assert.ok(Math.abs(psiAt('3d', 5, 1 / Math.sqrt(3))) < 1e-12 && Math.abs(psiAt('3d', 5, -1 / Math.sqrt(3))) < 1e-12);
  assert.ok(Math.abs(psiAt('1s', 0, 1)) > 0);                               // 1s 在原子核位置不為零
  assert.deepEqual(STATES['2s'].nodesR, [2]);
});

test('取樣:大量取樣的統計和理論一致(平均半徑、2p 上下對稱、3d 的正負號比例),且可重現', () => {
  const N = 60000;
  for (const id of STATE_IDS) {
    const { pos } = sampleCloud(id, N, makeRng(7));
    let sr = 0; for (let i = 0; i < N; i++) sr += Math.hypot(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
    const mean = sr / N; assert.ok(Math.abs(mean - meanRadius(id)) < 0.04 * meanRadius(id) + 0.02, `${id} 平均半徑 ${mean}`);
  }
  const p = sampleCloud('2p', N, makeRng(3)); let up = 0; for (let i = 0; i < N; i++) if (p.pos[3 * i + 2] > 0) up++;
  assert.ok(Math.abs(up / N - 0.5) < 0.01);                                     // 2p 上下兩朵一樣大
  assert.ok(Math.abs(p.sign.reduce((a, b) => a + b, 0)) / N < 0.02);           // 兩朵的正負號各半(上正下負)
  const a = sampleCloud('3d', 100, makeRng(5)), b = sampleCloud('3d', 100, makeRng(5));
  assert.deepEqual([...a.pos], [...b.pos]);
  let node = 0; const q = sampleCloud('2s', N, makeRng(9)); for (let i = 0; i < N; i++) { const r = Math.hypot(q.pos[3 * i], q.pos[3 * i + 1], q.pos[3 * i + 2]); if (Math.abs(r - 2) < 0.05) node++; }
  assert.ok(node / N < 0.004, '2s 在節點球面(r=2)附近幾乎沒有點');
});

test('2p 的雲沿 z 軸(上下兩朵);1s、2s 是球對稱', () => {
  const N = 40000, p = sampleCloud('2p', N, makeRng(1)); let sz = 0, sx = 0; for (let i = 0; i < N; i++) { sz += p.pos[3 * i + 2] ** 2; sx += p.pos[3 * i] ** 2; }
  assert.ok(Math.abs(sz / sx - 3) < 0.15, '2p:<z²>/<x²> 理論值 = 3,實際 ' + sz / sx);
  const s = sampleCloud('1s', N, makeRng(1)); let a = 0, b = 0; for (let i = 0; i < N; i++) { a += s.pos[3 * i] ** 2; b += s.pos[3 * i + 2] ** 2; }
  assert.ok(Math.abs(a / b - 1) < 0.03);
});

test('和光譜連結:氫的能階 −13.6/n² eV;3→2 的光 ≈ 656 nm(NIST 空氣中 656.3),就是光譜分頁的第一條紅線', () => {
  assert.ok(Math.abs(levelEV(1) + 13.6057) < 1e-3 && Math.abs(levelEV(2) + 3.4014) < 1e-3);
  assert.ok(Math.abs(photonNm(3, 2) - 656.3) < 0.5, `3→2 = ${photonNm(3, 2)}`);
  assert.ok(SPECTRA.H.lines.some(l => Math.abs(l[0] - 656.3) < 0.1), '光譜資料裡有 656.3 nm');
  for (const id of STATE_IDS) assert.ok(Math.abs(STATES[id].E - levelEV(STATES[id].n)) < 1e-3, id);
});
