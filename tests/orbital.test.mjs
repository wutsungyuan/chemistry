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

import { beat, composeMix, dipoleD } from '../src/data/hydrogenOrbital.js';

test('拍頻:3→2 的能量差 1.89 eV、頻率 ≈ 4.57×10¹⁴ Hz、波長 ≈ 656 nm,而且 頻率 × 波長 = 光速', () => {
  const b = beat(3, 2);
  assert.ok(Math.abs(b.dE - 1.8897) < 1e-3, `dE ${b.dE}`);
  assert.ok(Math.abs(b.freq / 1e14 - 4.569) < 0.01, `freq ${b.freq}`);
  assert.ok(Math.abs(b.nm - 656.1) < 0.3, `nm ${b.nm}`);
  assert.ok(Math.abs(b.freq * b.nm * 1e-9 - 299792458) < 1);
  assert.ok(Math.abs(b.period - 2.19e-15) < 0.01e-15);
});

test('2p 與 3d 正交(疊加後仍歸一化):角度部分 ∫Y_p·Y_d dΩ = 0,所以 ∫ψ₂p·ψ₃d dV = 0', () => {
  const angCross = integrate(c => psiAt('2p', 1, c) * psiAt('3d', 1, c), -1, 1, 4000);
  assert.ok(Math.abs(angCross) < 1e-9, `角度正交 ${angCross}`);
});

test('混合點雲:亮度因子 c 永遠在 [-1, 1],純 2p / 純 3d 時沒有晃動(c = 0),等比例時晃動最大', () => {
  const N = 6000, p2 = sampleCloud('2p', N, makeRng(11)), p3 = sampleCloud('3d', N, makeRng(12));
  for (const m of [0, 1]) { const { c } = composeMix(p2, p3, N, m); assert.ok(c.every(v => v === 0), `m=${m} 應該完全不晃`); }
  const amp = m => { const { c } = composeMix(p2, p3, N, m); let mx = 0, s = 0; for (const v of c) { assert.ok(Math.abs(v) <= 1 + 1e-6, 'c 超出範圍 ' + v); mx = Math.max(mx, Math.abs(v)); s += v * v; } return s / N; };
  const a50 = amp(0.5); assert.ok(a50 > amp(0.1) && a50 > amp(0.9), '50:50 時晃得最厲害');
});

test('晃動方向與大小:平均位置 <z>(t) = 2ab·D·cos(ωt)(只沿 z 軸),用取樣加權的結果和解析積分一致', () => {
  const N = 80000, p2 = sampleCloud('2p', N, makeRng(21)), p3 = sampleCloud('3d', N, makeRng(22)), D = dipoleD();
  assert.ok(Math.abs(D) > 1, `偶極矩陣元 ${D}`);
  for (const m of [0.25, 0.5, 0.75]) {
    const { pos, c, a, b } = composeMix(p2, p3, N, m);
    for (const [phase, f] of [[0, 1], [Math.PI / 2, 0], [Math.PI, -1]]) {
      let sz = 0, sx = 0, sy = 0; for (let i = 0; i < N; i++) { const w = 1 + c[i] * Math.cos(phase); sz += w * pos[3 * i + 2]; sx += w * pos[3 * i]; sy += w * pos[3 * i + 1]; }
      const want = 2 * a * b * D * f, got = sz / N;
      assert.ok(Math.abs(got - want) < 0.06 * Math.abs(2 * a * b * D) + 0.05, `m=${m} φ=${phase.toFixed(2)}: 取樣 <z> = ${got.toFixed(3)},解析 = ${want.toFixed(3)}`);
      assert.ok(Math.abs(sx / N) < 0.08 && Math.abs(sy / N) < 0.08, 'x、y 方向不該晃');
    }
  }
});

test('純態不晃:<z>(t) = 0;密度的時間平均 = 兩個狀態密度的加權和', () => {
  const N = 40000, p2 = sampleCloud('2p', N, makeRng(31)), p3 = sampleCloud('3d', N, makeRng(32));
  let sz = 0; const { pos } = composeMix(p2, p3, N, 0); for (let i = 0; i < N; i++) sz += pos[3 * i + 2]; assert.ok(Math.abs(sz / N) < 0.1);
  const { pos: pm, a, b } = composeMix(p2, p3, N, 0.5);
  let in2 = 0; for (let i = 0; i < N; i++) if (Math.hypot(pm[3 * i], pm[3 * i + 1], pm[3 * i + 2]) < 8) in2++;
  const want = a * a * integrate(r => radialProb('2p', r), 0, 8, 4000) + b * b * integrate(r => radialProb('3d', r), 0, 8, 4000);
  assert.ok(Math.abs(in2 / N - want) < 0.02, `半徑 8 內 ${in2 / N} vs ${want}`);
});

import { ALL_IDS, COMPLEX_IDS, STATES as ST, selectionTable, peakRadius, flowOmega } from '../src/data/hydrogenOrbital.js';

test('第三期:m ≠ 0 的複數軌域(2p₊₁、3d₊₂)同樣歸一化、平均半徑符合解析式,雲的半徑範圍足夠', () => {
  for (const id of COMPLEX_IDS) {
    assert.ok(Math.abs(integrate(r => radialProb(id, r), 0, 200, 20000) - 1) < 1e-4, id);
    assert.ok(Math.abs(integrate(c => psiAt(id, 1, c) ** 2 / radialProb(id, 1), -1, 1, 4000) * 2 * Math.PI - 1) < 1e-4, id + ' 角度歸一化');
    assert.ok(Math.abs(integrate(r => r * radialProb(id, r), 0, 200, 20000) - meanRadius(id)) < 1e-3, id + ' <r>');
    assert.ok(integrate(r => radialProb(id, r), 0, cloudRadius(id), 20000) > 0.999, id + ' 雲半徑');
  }
  assert.ok(ALL_IDS.length === 6 && ST['2p+1'].m === 1 && ST['3d+2'].m === 2);
});

test('最可能的半徑:l = n−1 的軌域 = n² a₀(1s:1、2p:4、3d:9);2s 有兩個峰,最高的在 (3+√5) = 5.24 a₀', () => {
  assert.ok(Math.abs(peakRadius('1s') - 1) < 0.01); assert.ok(Math.abs(peakRadius('2p') - 4) < 0.01); assert.ok(Math.abs(peakRadius('3d') - 9) < 0.02);
  assert.ok(Math.abs(peakRadius('2s') - (3 + Math.sqrt(5))) < 0.02);
  assert.ok(Math.abs(peakRadius('2p+1') - 4) < 0.01 && Math.abs(peakRadius('3d+2') - 9) < 0.02);        // 徑向部分只由 n、l 決定,和 m 無關
});

test('選擇定則:偶極矩陣元 |D|:1s↔2p = 0.7449、2s↔2p = 3、2p↔3d = 2.452;Δl ≠ ±1 的 D = 0;同一層(n 相同)能量相同,不會晃', () => {
  const t = Object.fromEntries(selectionTable().map(r => [r.a + '-' + r.b, r]));
  assert.ok(Math.abs(t['1s-2p'].D - 0.7449) < 1e-3, t['1s-2p'].D); assert.ok(Math.abs(t['2s-2p'].D - 3) < 1e-3); assert.ok(Math.abs(t['2p-3d'].D - 2.4519) < 2e-3);
  for (const k of ['1s-2s', '1s-3d', '2s-3d']) { assert.ok(t[k].D < 1e-6, k); assert.equal(t[k].reason, 'deltaL'); assert.equal(t[k].glows, false); }
  assert.equal(t['2s-2p'].reason, 'sameE'); assert.equal(t['2s-2p'].glows, false);
  assert.deepEqual(Object.entries(t).filter(([, r]) => r.glows).map(([k]) => k).sort(), ['1s-2p', '2p-3d']);
});

test('機率流與角動量:m = 1 的 2p 雲繞 z 軸、比 m = 0 的更貼近 xy 平面(<x²+y²>/<z²> = 4);ω = m/ρ² 時 L_z = ρ²ω = m', () => {
  const N = 60000, q = sampleCloud('2p+1', N, makeRng(41)); let sz = 0, sr = 0, sphi = 0, sphi2 = 0;
  for (let i = 0; i < N; i++) { const x = q.pos[3 * i], y = q.pos[3 * i + 1], z = q.pos[3 * i + 2]; sz += z * z; sr += x * x + y * y; const ph = Math.atan2(y, x); sphi += Math.cos(ph); sphi2 += Math.sin(ph); }
  assert.ok(Math.abs(sr / sz - 4) < 0.2, `比值 ${sr / sz}`);
  assert.ok(Math.abs(sphi / N) < 0.02 && Math.abs(sphi2 / N) < 0.02, 'φ 要均勻');
  for (const [m, rho] of [[1, 3], [2, 5.5], [-1, 0.8]]) assert.ok(Math.abs(rho * rho * flowOmega(m, rho) - m) < 1e-12);
  assert.ok(flowOmega(1, 2) > 0 && flowOmega(-1, 2) < 0, '方向由 m 的正負決定');
});
