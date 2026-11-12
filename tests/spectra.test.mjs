// 元素光譜:資料處理(scripts/lib/asd.mjs)、已收錄的資料正確性、畫面邏輯(src/ui/spectrum.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAsd, estimateIntensity, mergeLines, deriveSpectrum, spearman, calibrateTemperature } from '../scripts/lib/asd.mjs';
import { SPECTRA, SPECTRA_META } from '../src/data/generated/spectra.js';
import { wavelengthToRGB, colorKey, nearestLine, brightest, spectrumSVG, xOf, nmOf, lineStyle, RANGE } from '../src/ui/spectrum.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} 期望 ${b}±${tol},實際 ${a}`);
const strongest = (sym, n = 1) => [...SPECTRA[sym].lines].sort((a, b) => b[1] - a[1]).slice(0, n).map(l => l[0]);

// ---------- 資料解析 ----------
const HEAD_FULL = 'obs_wl_air(nm)\tunc_obs_wl\tritz_wl_air(nm)\tunc_ritz_wl\tintens\tAki(s^-1)\tAcc\tEi(cm-1)\tEk(cm-1)\tconf_i\tterm_i\tJ_i\tconf_k\tterm_k\tJ_k\tType\ttp_ref\tline_ref';
const HEAD_SHORT = 'obs_wl_air(nm)\tritz_wl_air(nm)\tintens\tAki(s^-1)\tAcc\tEi(cm-1)\tEk(cm-1)\tconf_i\tterm_i\tJ_i\tconf_k\tterm_k\tJ_k\tType\ttp_ref\tline_ref';
const row = a => a.map(x => `"${x}"`).join('\t');

test('parseAsd:依標題名稱找欄位(不同元素的欄位數量不同)', () => {
  const full = parseAsd([HEAD_FULL, row(['589.592', '0.001', '589.5924', '0.0001', '100', '6.1e+07', 'AA', '0', '16973.366', '3s', '2S', '1/2', '3p', '2P*', '1/2', '', '', ''])].join('\n'));
  const short = parseAsd([HEAD_SHORT, row(['589.592', '589.5924', '100', '6.1e+07', 'AA', '0', '16973.366', '3s', '2S', '1/2', '3p', '2P*', '1/2', '', '', ''])].join('\n'));
  for (const r of [full[0], short[0]]) { near(r.wl, 589.592, 1e-6); assert.equal(r.intens, 100); near(r.A, 6.1e7, 1); near(r.Ek, 16973.366, 1e-6); assert.equal(r.g, 2); }
});

test('parseAsd:沒有資料的回應(HTML 錯誤頁)回傳 null;缺強度、括號能階與分數 J 能解析', () => {
  assert.equal(parseAsd('<html>No lines are available in ASD</html>'), null);
  const r = parseAsd([HEAD_FULL, row(['', '', '656.2852', '0.0001', '', '4.4e+07', 'AAA', '82258.9', '[97492.2]', '2p', '2P*', '1/2', '3d', '2D', '3/2', '', '', ''])].join('\n'))[0];
  near(r.wl, 656.2852, 1e-6); assert.ok(Number.isNaN(r.intens)); near(r.Ek, 97492.2, 1e-6); assert.equal(r.g, 4);
});

// ---------- 強度估算 ----------
test('estimateIntensity:A 越大越亮、能階越高越暗;缺資料回傳 NaN', () => {
  const base = { wl: 500, A: 1e7, Ek: 30000, g: 3 };
  assert.ok(estimateIntensity({ ...base, A: 2e7 }, 6000) > estimateIntensity(base, 6000));
  assert.ok(estimateIntensity({ ...base, Ek: 60000 }, 6000) < estimateIntensity(base, 6000));
  assert.ok(estimateIntensity(base, 12000) > estimateIntensity(base, 4000) * 1);         // 越熱,高能階越容易發光
  assert.ok(Number.isNaN(estimateIntensity({ wl: 500, A: NaN, Ek: 1, g: 1 }, 6000)));
});

test('spearman:完全同序 = 1、完全反序 = -1', () => {
  near(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1, 1e-9);
  near(spearman([1, 2, 3, 4], [40, 30, 20, 10]), -1, 1e-9);
});

test('mergeLines:0.08 nm 內的精細結構合併(強度相加、波長取較強者),相隔較遠的不合併', () => {
  const m = mergeLines([{ wl: 589.0, I: 10 }, { wl: 589.05, I: 30 }, { wl: 589.6, I: 15 }]);
  assert.equal(m.length, 2);
  near(m[0].wl, 589.05, 1e-9); assert.equal(m[0].I, 40); assert.equal(m[1].I, 15);
});

// ---------- 挑選最強的譜線 ----------
const mk = (wl, intens, A = NaN, Ek = NaN, g = NaN) => ({ wl, intens, A, Ek, g });

test('deriveSpectrum:實測強度夠多就用實測(estimated=false),依波長排序、最強 = 1、只取前 N 條', () => {
  const rows = Array.from({ length: 30 }, (_, i) => mk(400 + i * 10, 10 + i));
  const d = deriveSpectrum(rows, { top: 12 });
  assert.equal(d.estimated, false); assert.equal(d.lines.length, 12);
  assert.deepEqual(d.lines.map(l => l[0]), [...d.lines.map(l => l[0])].sort((a, b) => a - b));
  assert.equal(Math.max(...d.lines.map(l => l[1])), 1);
});

test('deriveSpectrum:沒有實測強度時用 g·A·exp(−E/kT)/λ 估算(estimated=true);超出可見光的線會被濾掉', () => {
  const rows = [mk(656.3, NaN, 4.4e7, 97492, 5), mk(486.1, NaN, 8.4e6, 102824, 3), mk(434.0, NaN, 2.5e6, 105292, 5), mk(121.6, NaN, 6e8, 82259, 3), mk(1000, NaN, 1e7, 50000, 3)];
  const d = deriveSpectrum(rows);
  assert.equal(d.estimated, true);
  assert.deepEqual(d.lines.map(l => l[0]), [434, 486.1, 656.3]);                          // 121.6(紫外)與 1000(紅外)被濾掉
  assert.equal(d.lines.find(l => l[0] === 656.3)[1], 1);
});

test('deriveSpectrum:實測很少、又無法估算時,仍使用實測的幾條(像砷、釙);完全沒有則為空', () => {
  assert.equal(deriveSpectrum([mk(450, 10), mk(500, 20), mk(600, 5), mk(700, 8)]).lines.length, 4);
  assert.deepEqual(deriveSpectrum([mk(450, NaN), mk(500, NaN)]).lines, []);
  assert.deepEqual(deriveSpectrum(null).lines, []);
});

test('calibrateTemperature:能從資料挑出溫度,並回報估算與實測的一致程度', () => {
  const rows = Array.from({ length: 20 }, (_, i) => { const Ek = 20000 + i * 3000, A = 1e7, g = 3, wl = 500; return mk(wl, estimateIntensity({ wl, A, Ek, g }, 6000) * 1e3, A, Ek, 1); });
  rows.forEach(r => { r.g = 3; });
  const c = calibrateTemperature({ X: rows.map(r => ({ ...r, wl: 400 + Math.random() * 0 + 100 })) });
  assert.equal(c.n, 1); assert.ok(c.medianRho > 0.99);
});

// ---------- 已收錄的光譜資料(來自 NIST ASD)----------
test('收錄資料:出處完整(NIST、DOI、日期),估算強度的驗證相關度達標', () => {
  assert.match(SPECTRA_META.source, /NIST/); assert.equal(SPECTRA_META.doi, '10.18434/T4W30F'); assert.match(SPECTRA_META.retrieved, /^\d{4}-\d{2}-\d{2}$/);
});

test('收錄資料:98 個元素有可見光譜線;砈與鐨以後(Z≥100)NIST 沒有資料', () => {
  const none = Object.entries(SPECTRA).filter(([, e]) => !e.lines.length).map(([s]) => s).sort();
  assert.equal(Object.values(SPECTRA).filter(e => e.lines.length).length, 98);
  assert.deepEqual(none, ['At', 'Bh', 'Cn', 'Db', 'Ds', 'Fl', 'Fm', 'Hs', 'Lr', 'Lv', 'Mc', 'Md', 'Mt', 'Nh', 'No', 'Og', 'Rf', 'Rg', 'Sg', 'Ts'].sort());
});

test('已知譜線:氫的巴耳末系(656.3、486.1、434.0、410.2 nm)都在,且 656.3 最亮', () => {
  const wls = SPECTRA.H.lines.map(l => l[0]);
  for (const w of [656.3, 486.1, 434.0, 410.2]) assert.ok(wls.some(x => Math.abs(x - w) < 0.15), `氫缺少 ${w} nm`);
  near(strongest('H')[0], 656.3, 0.15);
  assert.equal(SPECTRA.H.estimated, true);                                              // 氫在 NIST 沒有實測強度,是估算的
});

test('已知譜線:鈉的黃色雙線 D 線(589.0 與 589.6 nm)最亮、強度比約 2:1', () => {
  const [a, b] = strongest('Na', 2).sort((x, y) => x - y);
  near(a, 589.0, 0.1); near(b, 589.6, 0.1);
  const I = w => SPECTRA.Na.lines.find(l => Math.abs(l[0] - w) < 0.1)[1];
  near(I(589.6) / I(589.0), 0.5, 0.1);
  assert.equal(SPECTRA.Na.estimated, false);
});

test('已知譜線:汞的 546.1(綠)與 435.8(藍)、鋰的 670.8(紅)、鉀的 766.5 與 769.9、鍶的 460.7、鋇的 553.5', () => {
  const has = (s, w) => SPECTRA[s].lines.some(l => Math.abs(l[0] - w) < 0.15);
  assert.ok(has('Hg', 546.07) && has('Hg', 435.83) && has('Hg', 404.66));
  near(strongest('Li')[0], 670.8, 0.15);
  assert.ok(has('K', 766.49) && has('K', 769.9));
  near(strongest('Sr')[0], 460.7, 0.15); near(strongest('Ba')[0], 553.5, 0.15);
});

test('收錄資料格式:每個元素的譜線依波長排序、在可見光內、強度 0~1 且最強為 1、不超過 60 條', () => {
  for (const [sym, e] of Object.entries(SPECTRA)) {
    if (!e.lines.length) continue;
    assert.ok(e.lines.length <= 60, sym);
    assert.equal(Math.max(...e.lines.map(l => l[1])), 1, sym);
    e.lines.forEach(([wl, I], i) => { assert.ok(wl >= RANGE[0] && wl <= RANGE[1] && I > 0 && I <= 1, `${sym} ${wl}`); if (i) assert.ok(wl > e.lines[i - 1][0], `${sym} 未排序`); });
  }
});

// ---------- 畫面邏輯 ----------
test('波長轉顏色:紅、綠、藍各自的分量最大;可見光外的兩端比較暗', () => {
  const [r, g, b] = wavelengthToRGB(650), [r2, g2, b2] = wavelengthToRGB(530), [r3, g3, b3] = wavelengthToRGB(460);
  assert.ok(r > 200 && g < 40 && b < 40); assert.ok(g2 > 200 && g2 > r2 && g2 > b2); assert.ok(b3 > 200 && b3 > r3 && b3 > g3);
  assert.ok(wavelengthToRGB(385)[2] < wavelengthToRGB(450)[2]); assert.ok(wavelengthToRGB(775)[0] < wavelengthToRGB(650)[0]);
});

test('顏色名稱:589 nm 黃、656 nm 紅、486 nm 青、434 nm 紫、546 nm 綠、610 nm 橙、460 nm 藍', () => {
  assert.deepEqual([589, 656, 486, 434, 546, 610, 460].map(colorKey), ['sp.c.yellow', 'sp.c.red', 'sp.c.cyan', 'sp.c.violet', 'sp.c.green', 'sp.c.orange', 'sp.c.blue']);
});

test('點選:nearestLine 在容許範圍內選最近的線,太遠回傳 -1;距離相同選較強的', () => {
  const lines = [[589.0, 1], [589.6, 0.5], [500, 0.2]];
  assert.equal(nearestLine(lines, 589.1, 1), 0); assert.equal(nearestLine(lines, 589.5, 1), 1); assert.equal(nearestLine(lines, 540, 5), -1);
  assert.equal(nearestLine([[500, 0.2], [502, 0.9]], 501, 1.5), 1);
  assert.deepEqual(brightest([[400, 0.1], [500, 1], [600, 0.5]], 2), [1, 2]);
});

test('座標換算:xOf 與 nmOf 互為反函數,並限制在可見光範圍內', () => {
  for (const nm of [380, 450, 589, 780]) near(nmOf(xOf(nm, 360), 360), nm, 1e-9);
  assert.equal(nmOf(-50, 360), RANGE[0]); assert.equal(nmOf(999, 360), RANGE[1]);
});

test('線寬與亮度:越強的線越粗越亮(但弱線仍看得見)', () => {
  assert.ok(lineStyle(1).width > lineStyle(0.01).width && lineStyle(1).opacity > lineStyle(0.01).opacity);
  assert.ok(lineStyle(0.001).width >= 1.6 && lineStyle(0.001).opacity >= 0.5);
});

test('spectrumSVG:發光=黑底彩色亮線、吸收=彩虹底黑線;每條線一個元素;選取時有標示;只含數字與固定字串', () => {
  const lines = [[589.0, 1], [589.6, 0.5], [500, 0.2]];
  const emit = spectrumSVG(lines, { mode: 'emit', width: 360, selected: 0, uid: 't' });
  const absorb = spectrumSVG(lines, { mode: 'absorb', width: 360, uid: 't' });
  const count = svg => (svg.match(/<line x1="[\d.]+" x2="[\d.]+" y1="0"/g) || []).length;
  assert.equal(count(absorb), 3);              // 沒選取:每條譜線一個 <line>
  assert.equal(count(emit), 4);                // 選取時多一條白色標示線
  assert.match(emit, /fill="#05060f"/); assert.match(emit, /<polygon/); assert.match(emit, /filter="url\(#glow-t\)"/);
  assert.match(absorb, /fill="url\(#bg-t\)"/); assert.match(absorb, /<linearGradient id="bg-t"/); assert.ok(!/<polygon/.test(absorb));
  for (const s of [emit, absorb]) assert.ok(!/<script|onerror|javascript:/i.test(s));
});
