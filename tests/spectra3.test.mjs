// 光譜第四輪:能階標籤(3s、3p、n=2…)、3D 原子的躍遷示範(軌道半徑與時間軸)
import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECTRA } from '../src/data/generated/spectra.js';
import { levelLabel, deriveSpectrum } from '../scripts/lib/asd.mjs';
import { ladderSVG, ladderLines } from '../src/ui/spectrum.js';
import { parseLabel, orbitRadius, jumpPlan, jumpState, CYCLE, ORBIT, TIMELINE } from '../src/ui/orbitJump.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} 期望 ${b}±${tol},實際 ${a}`);
const L = [[434, 0.04, 10.199, 13.055], [486.1, 0.13, 10.199, 12.749], [656.3, 1, 10.199, 12.088]];
const line = (sym, wl) => SPECTRA[sym].lines.find(l => Math.abs(l[0] - wl) < 0.2);

// ---------- 標籤規則 ----------
test('levelLabel:去掉已填滿的內層,剩下恰好一個外層電子才標(2p6.3s → 3s)', () => {
  assert.equal(levelLabel('2p6.3s'), '3s'); assert.equal(levelLabel('1s2.2p'), '2p'); assert.equal(levelLabel('3d10.4s'), '4s');
  assert.equal(levelLabel('3s'), '3s'); assert.equal(levelLabel('2p'), '2p');
});

test('levelLabel:複雜組態不硬標(內層被激發、兩顆電子同時在動、全部填滿、看不懂的寫法、空字串)', () => {
  for (const c of ['2p5.(2P*).3s.3p.(3P*)', '3d6.(5D).4s.4p', '4s2', '1s2.2s2', '3s.3p', '[Ne].3s', '', null, undefined]) assert.equal(levelLabel(c), null, String(c));
});

test('levelLabel:氫用 n 模式(2p → n=2,同一層的子層能量幾乎一樣)', () => {
  assert.equal(levelLabel('3d', 'n'), 'n=3'); assert.equal(levelLabel('2p', 'n'), 'n=2'); assert.equal(levelLabel('2p6.3s', 'n'), 'n=3');
});

test('deriveSpectrum:有能階才有標籤;labelMode 影響格式', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ wl: 500 + i, intens: 10 + i, A: NaN, Ei: 0, Ek: 16973 + i, confI: '2p6.3s', confK: '2p6.3p', g: NaN }));
  assert.deepEqual(deriveSpectrum(rows, { top: 1 }).lines[0].slice(4), ['3s', '3p']);
  assert.deepEqual(deriveSpectrum(rows, { top: 1, labelMode: 'n' }).lines[0].slice(4), ['n=3', 'n=3']);
  assert.deepEqual(deriveSpectrum(rows.map(r => ({ ...r, Ei: NaN })), { top: 1 }).lines[0].slice(4), [null, null]);   // 缺一個能階 → 不標
});

// ---------- 收錄資料上的標籤 ----------
test('標籤資料:氫的 n 標籤符合玻爾公式 E = 13.6057(1 − 1/n²)', () => {
  let n = 0;
  for (const [, , lo, hi, ll, hl] of SPECTRA.H.lines) for (const [lab, E] of [[ll, lo], [hl, hi]]) {
    const m = /^n=(\d+)$/.exec(lab ?? ''); if (!m) continue; n++;
    near(13.6057 * (1 - 1 / (m[1] * m[1])), E, 0.02, `氫 ${lab}`);
  }
  assert.ok(n >= 10);
  assert.deepEqual([line('H', 656.3)[4], line('H', 656.3)[5]], ['n=2', 'n=3']);            // Hα:3→2
  assert.deepEqual([line('H', 486.1)[4], line('H', 486.1)[5]], ['n=2', 'n=4']);            // Hβ:4→2
});

test('標籤資料:鈉的 D 線是 3s↔3p、鋰的 670.8 是 2s↔2p、鉀的 766.5 是 4s↔4p(都在「同一層」的不同子層)', () => {
  assert.deepEqual([line('Na', 589.0)[4], line('Na', 589.0)[5]], ['3s', '3p']);
  assert.deepEqual([line('Na', 589.6)[4], line('Na', 589.6)[5]], ['3s', '3p']);
  assert.deepEqual([line('Li', 670.8)[4], line('Li', 670.8)[5]], ['2s', '2p']);
  assert.deepEqual([line('K', 766.5)[4], line('K', 766.5)[5]], ['4s', '4p']);
});

test('標籤資料:格式正確、只出現在有能階的線上、全部標籤的元素至少 15 個', () => {
  const els = new Set();
  for (const [sym, e] of Object.entries(SPECTRA)) for (const [wl, , lo, hi, ll, hl] of e.lines) {
    for (const lab of [ll, hl]) if (lab != null) assert.match(lab, /^(n=\d+|\d+[spdfg])$/, `${sym} ${wl}`);
    if (ll != null || hl != null) { assert.ok(lo != null && hi != null, `${sym} ${wl} 有標籤卻沒有能階`); els.add(sym); }
  }
  assert.ok(els.size >= 15, `只有 ${els.size} 個元素有標籤`);
});

// ---------- 階梯圖上的標籤 ----------
test('ladderSVG:橫槓旁標出能階名稱(氫 n=2、n=3…;鈉 3s、3p);沒有標籤的元素不會亂標', () => {
  const h = ladderSVG(SPECTRA.H.lines, { selected: SPECTRA.H.lines.findIndex(l => Math.abs(l[0] - 656.3) < 0.2) });
  for (const n of ['n=2', 'n=3', 'n=4']) assert.ok(h.includes(`>${n}</text>`), `氫階梯圖缺少 ${n}`);
  const na = ladderSVG(SPECTRA.Na.lines, { selected: SPECTRA.Na.lines.findIndex(l => Math.abs(l[0] - 589.0) < 0.2) });
  assert.ok(na.includes('>3s</text>') && na.includes('>3p</text>'));
  const fe = ladderSVG(SPECTRA.Fe.lines, {});
  assert.ok(!/>(\d[spdf]|n=\d)<\/text>/.test(fe), '鐵的組態太複雜,不應該有標籤');
  const conflict = ladderSVG([[600, 1, 0, 2, '3s', '3p'], [500, 1, 0, 2.5, '4s', '3d']], { indices: [0, 1] });   // 同一橫槓(0 eV)有兩種名字 → 不標
  assert.ok(!conflict.includes('>3s</text>') && !conflict.includes('>4s</text>'));
});

// ---------- 軌道半徑(3D 示意)----------
test('parseLabel:3p → {n:3,l:1}、n=2 → {n:2,l:0}、看不懂 → null', () => {
  assert.deepEqual(parseLabel('3p'), { n: 3, l: 1 }); assert.deepEqual(parseLabel('n=2'), { n: 2, l: 0 }); assert.deepEqual(parseLabel('4f'), { n: 4, l: 3 });
  assert.equal(parseLabel('xyz'), null); assert.equal(parseLabel(null), null);
});

test('orbitRadius:層數越大越外面但越來越擠;同一層內 s < p < d;沒標籤時依能量;不超過上限', () => {
  const ctx = { baseR: 1.4, nGround: 1 }, r = n => orbitRadius({ label: `n=${n}` }, ctx);
  assert.equal(r(1), 1.4);
  for (let n = 2; n < 9; n++) assert.ok(r(n + 1) > r(n), `n=${n + 1} 應比 n=${n} 更外面`);
  assert.ok(r(3) - r(2) > r(9) - r(8), '高層的間距要越來越小(能階會收斂)');
  const c3 = { baseR: 4, nGround: 3 }, o = l => orbitRadius({ label: l }, c3);
  assert.ok(o('3s') < o('3p') && o('3p') < o('3d')); assert.ok(o('4s') > o('3d') - 0.5);
  assert.ok(orbitRadius({ label: null, E: 5 }, c3) > orbitRadius({ label: null, E: 1 }, c3));
  assert.equal(orbitRadius({ label: null, E: 0 }, c3), 4);
  assert.ok(orbitRadius({ label: 'n=99' }, ctx) <= ctx.baseR + ORBIT.maxExtra + 1e-9);
});

test('jumpPlan:上軌道一定比下軌道外面(至少差 minGap);沒有能階的線回傳 null;氫 Hα 的軌道是 n=3 → n=2', () => {
  const hα = jumpPlan(line('H', 656.3), { baseR: 1.4, nGround: 1 });
  assert.equal(hα.labelLo, 'n=2'); assert.equal(hα.labelHi, 'n=3'); assert.ok(hα.rHi > hα.rLo);
  const na = jumpPlan(line('Na', 589.0), { baseR: 4, nGround: 3 });
  assert.equal(na.rLo, 4); assert.ok(na.rHi - na.rLo >= ORBIT.minGap - 1e-9);                // 同一層內的小跳,但仍看得出來
  assert.equal(jumpPlan([500, 1, null, null, null, null], { baseR: 4, nGround: 3 }), null);
});

test('jumpPlan:每個有能階的線都能算出合理的軌道(抽查全部元素,半徑有限、上 > 下)', () => {
  for (const [sym, e] of Object.entries(SPECTRA)) for (const l of e.lines) {
    if (l[2] == null) continue;
    const p = jumpPlan(l, { baseR: 3, nGround: 3 });
    assert.ok(Number.isFinite(p.rLo) && Number.isFinite(p.rHi) && p.rHi > p.rLo && p.rHi <= 3 + ORBIT.maxExtra + ORBIT.minGap + 1e-9, `${sym} ${l[0]}`);
  }
});

// ---------- 動畫時間軸 ----------
test('jumpState:電子沒有「位置」,只有兩層各自的濃度,加起來永遠是 1(量子躍遷不會經過兩層中間)', () => {
  for (const mode of ['emit', 'absorb']) for (let t = 0; t < CYCLE * 2; t += 0.07) {
    const s = jumpState(mode, t);
    assert.ok(!('r' in s), '狀態裡不能有半徑');
    near(s.pUp + s.pLow, 1, 1e-9); assert.ok(s.pUp >= 0 && s.pUp <= 1);
  }
});

test('jumpState(發光):先停在上層、上層淡出下層淡入(單調)、落定後光子往外飛、結尾平順回到起點', () => {
  assert.equal(jumpState('emit', 0).pUp, 1); assert.equal(jumpState('emit', 0).photon, null);
  const [f0, f1] = TIMELINE.emit.fade; let prev = 1;
  for (let t = f0; t <= f1; t += 0.05) { const p = jumpState('emit', t).pUp; assert.ok(p <= prev + 1e-9, '上層應單調變淡'); prev = p; }
  assert.ok(jumpState('emit', (f0 + f1) / 2).pUp > 0.05 && jumpState('emit', (f0 + f1) / 2).pUp < 0.95, '過程中是混合');
  assert.equal(jumpState('emit', f1).pUp, 0);
  assert.equal(jumpState('emit', f1 - 0.2).photon, null);                  // 光子在躍遷完成之後才飛出去
  const ph = jumpState('emit', TIMELINE.emit.photon[0] + 0.5).photon; assert.ok(ph && ph.out === true && ph.u > 0 && ph.u < 1);
  assert.equal(jumpState('emit', TIMELINE.emit.photon[1] + 0.1).photon, null);
});

test('jumpState(吸收):光子先往內飛、被吃掉後上層淡入(單調)、停在上層', () => {
  assert.equal(jumpState('absorb', 0).pUp, 0);
  const ph = jumpState('absorb', 0.6).photon; assert.ok(ph && ph.out === false);
  const [f0, f1] = TIMELINE.absorb.fade; let prev = 0;
  assert.equal(jumpState('absorb', f0 - 0.05).pUp, 0);                     // 光子還在飛的時候,電子還沒開始升
  assert.equal(jumpState('absorb', f0 + 0.01).photon, null);               // 光子被吃掉之後,電子才開始升
  for (let t = f0; t <= f1; t += 0.05) { const p = jumpState('absorb', t).pUp; assert.ok(p >= prev - 1e-9, '上層應單調變濃'); prev = p; }
  assert.equal(jumpState('absorb', f1).pUp, 1);
});

test('jumpState:循環銜接(t=0 與 t=CYCLE 相同,結尾沒有突然跳變)', () => {
  for (const mode of ['emit', 'absorb']) {
    assert.deepEqual(jumpState(mode, 0.3), jumpState(mode, 0.3 + CYCLE));
    near(jumpState(mode, CYCLE - 1e-6).pUp, jumpState(mode, 0).pUp, 1e-3, mode + ' 循環結尾');
    let worst = 0; for (let t = 0; t < CYCLE; t += 0.01) worst = Math.max(worst, Math.abs(jumpState(mode, t + 0.01).pUp - jumpState(mode, t).pUp));
    assert.ok(worst < 0.08, `${mode} 濃度的變化太突然(單步 ${worst.toFixed(3)})`);
  }
});

test('階梯圖動畫的關鍵時間,與 3D 的 jumpState 時間軸完全一致(同一份 TIMELINE)', () => {
  for (const mode of ['emit', 'absorb']) {
    const svg = ladderSVG(L, { indices: [2], selected: 2, mode, animate: true, uid: 'x' });
    const kt = /<animate attributeName="opacity" dur="([\d.]+)s" repeatCount="indefinite" keyTimes="([\d.;]+)" values="[01];[01];[01];[01];[01]"/.exec(svg);
    assert.ok(kt, mode + ' 找不到淡入淡出動畫');
    near(+kt[1], CYCLE, 1e-9);
    const [, f0, f1] = kt[2].split(';').map(Number);
    near(f0 * CYCLE, TIMELINE[mode].fade[0], 0.005); near(f1 * CYCLE, TIMELINE[mode].fade[1], 0.005);
  }
});

test('ladderLines + 標籤:氫預設畫出的線都有 n 標籤(階梯圖和 3D 原子才對得起來)', () => {
  for (const i of ladderLines(SPECTRA.H.lines, -1)) assert.ok(SPECTRA.H.lines[i][4] && SPECTRA.H.lines[i][5], `H ${SPECTRA.H.lines[i][0]}`);
});

test('ladderSVG:很擠的高階能階,名稱會錯開(相鄰名稱的垂直距離 ≥ 12px),但被選取那條線的兩個名稱一定在', () => {
  const na = SPECTRA.Na.lines, sel = na.findIndex(l => Math.abs(l[0] - 589.0) < 0.2);
  const svg = ladderSVG(na, { selected: sel });
  const ys = [...svg.matchAll(/<text x="[\d.]+" y="([\d.]+)" text-anchor="end" font-size="10" font-weight="700" fill="#ffe9a8">([^<]+)</g)].map(m => [+m[1], m[2]]);
  assert.ok(ys.some(([, n]) => n === '3s') && ys.some(([, n]) => n === '3p'));            // 選取線的上下能階
  const sorted = ys.map(y => y[0]).sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] >= 11.5, `名稱太近:${sorted[i - 1]} 與 ${sorted[i]}`);
});
