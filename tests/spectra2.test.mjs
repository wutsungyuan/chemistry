// 光譜第二、三階段:能階階梯圖、週期表光譜模式、光譜偵探出題、徽章、中英文文字一致
import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECTRA } from '../src/data/generated/spectra.js';
import { ELEMENTS } from '../src/data/elements.js';
import { ladderLines, ladderSVG, mergeLevels, hasLevels, miniSpectrumSVG } from '../src/ui/spectrum.js';
import { spectrumPool, makeSpectrumQuestion, similarity, binVector, MAX_SIMILARITY, MIN_LINES } from '../src/game/spectrumQuiz.js';
import { pick, shuffle } from '../src/ui/util.js';
import { BADGES } from '../src/game/store.js';
import zh from '../src/i18n/zh.js';
import en from '../src/i18n/en.js';
import { HC_EV_NM } from '../scripts/lib/asd.mjs';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} 期望 ${b}±${tol},實際 ${a}`);
// 固定亂數(mulberry32),讓出題測試每次結果一樣
const rngOf = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---------- 能階資料 ----------
test('能階資料:有能階的譜線,上能階 > 下能階 ≥ 0,而且能量差等於光子能量 hc/λ(誤差 < 2%)', () => {
  let n = 0;
  for (const [sym, e] of Object.entries(SPECTRA)) for (const [wl, , lo, hi] of e.lines) {
    assert.equal(lo == null, hi == null, `${sym} ${wl} 只有一個能階`);
    if (lo == null) continue;
    n++; assert.ok(lo >= 0 && hi > lo, `${sym} ${wl}`); near(hi - lo, HC_EV_NM / wl, (HC_EV_NM / wl) * 0.02, `${sym} ${wl} nm 能階差`);
  }
  assert.ok(n > 2000, `有能階的譜線只有 ${n} 條`);
});

test('氫:Hα(656.3 nm)是 n=3→n=2,下能階 10.20 eV、上能階 12.09 eV(物理常識驗證)', () => {
  const l = SPECTRA.H.lines.find(x => Math.abs(x[0] - 656.3) < 0.15);
  near(l[2], 10.199, 0.005); near(l[3], 12.088, 0.005);
  near(13.6057 * (1 - 1 / 4), l[2], 0.01);               // E₂ = 13.6(1−1/2²) eV
  near(13.6057 * (1 - 1 / 9), l[3], 0.01);               // E₃ = 13.6(1−1/3²) eV
});

// ---------- 階梯圖 ----------
const L = [[434, 0.04, 10.199, 13.055], [486.1, 0.13, 10.199, 12.749], [656.3, 1, 10.199, 12.088], [500, 0.5, null, null], [410, 0.02, 10.199, 13.221]];

test('ladderLines:只挑有能階的線、最亮優先、被選取的線一定在內、依波長排序', () => {
  assert.deepEqual(ladderLines(L, -1, 2), [1, 2]);                        // 486.1 與 656.3 最亮(有能階的裡面)
  assert.ok(!ladderLines(L, -1, 8).includes(3));                          // 沒有能階的 500 nm 不會出現
  assert.ok(ladderLines(L, 4, 2).includes(4));                            // 選取的 410 nm 即使不夠亮也要畫
  assert.ok(!ladderLines(L, 3, 8).includes(3));                           // 選到沒能階的線不會硬畫
  assert.equal(hasLevels(L[3]), false);
});

test('ladderLines:鈉的內層電子弱線(能階 30 eV 以上)不會把 D 線壓扁;使用者自己選的線例外', () => {
  const ids = ladderLines(SPECTRA.Na.lines, -1);
  assert.ok(ids.length >= 4);
  for (const i of ids) assert.ok(SPECTRA.Na.lines[i][3] < 6, `Na ${SPECTRA.Na.lines[i][0]} nm 的上能階 ${SPECTRA.Na.lines[i][3]} eV 太高`);
  const inner = SPECTRA.Na.lines.findIndex(l => hasLevels(l) && l[3] > 30);
  if (inner >= 0) assert.ok(ladderLines(SPECTRA.Na.lines, inner).includes(inner));      // 選了就一定畫出來
});

test('ladderLines:每個元素預設畫出的線,能量範圍都不會大到讓亮線擠成一團(最高上能階 < 最亮線的 2 倍或 +3 eV)', () => {
  for (const [sym, e] of Object.entries(SPECTRA)) {
    const ids = ladderLines(e.lines, -1); if (!ids.length) continue;
    const first = e.lines.filter(hasLevels).sort((a, b) => b[1] - a[1])[0];
    for (const i of ids) assert.ok(e.lines[i][3] <= Math.max(2 * first[3], first[3] + 3) + 1e-9, `${sym} ${e.lines[i][0]} nm`);
  }
});

test('mergeLevels:很接近的能階視為同一階', () => {
  assert.deepEqual(mergeLevels([10.199, 10.2, 12.088, 12.089, 13.0]), [10.199, 12.088, 13.0]);
});

test('ladderSVG:每條線一個箭頭;發光箭頭往下、吸收箭頭往上;選取的有電子;可關閉動畫;沒有可畫的線回傳空字串', () => {
  const on = ladderSVG(L, { selected: 2, mode: 'emit', animate: true, uid: 't' }), off = ladderSVG(L, { selected: 2, mode: 'emit', animate: false, uid: 't' });
  assert.equal((on.match(/<polygon/g) || []).length, 4);                  // 410、434、486、656 共 4 條(500 沒能階)
  assert.ok(!/attributeName="cy"|attributeName="y"|attributeName="cx"/.test(on), '電子不能有任何位置動畫(量子躍遷不會經過中間)');
  assert.equal((on.match(/<circle[^>]*fill="#4cc9ff"[^>]*><animate attributeName="opacity"/g) || []).length, 2, '上下兩層各一個淡入淡出的電子影子');
  assert.ok(!/<animate/.test(off));                                       // 減少動態時不放動畫
  assert.equal((off.match(/<circle[^>]*fill="#4cc9ff"[^>]*opacity="0.5"/g) || []).length, 2);   // 但仍標示兩層各一半濃(混合)
  const emit = ladderSVG(L, { indices: [2], selected: 2, mode: 'emit' }), absorb = ladderSVG(L, { indices: [2], selected: 2, mode: 'absorb' });
  const tip = svg => +/<polygon points="[\d.]+,([\d.]+) [\d.]+,([\d.]+) ([\d.]+),([\d.]+)"/.exec(svg).slice(1).pop();   // 箭頭尖端的 y
  assert.ok(tip(emit) > tip(absorb), '發光時箭頭尖端在下方(y 較大)');
  assert.equal(ladderSVG([[500, 1, null, null]], {}), '');
  assert.ok(!/<script|onerror|javascript:/i.test(on));
});

test('ladderSVG:縱軸只涵蓋用到的能量範圍,氫的高階能階不會全擠在一起;用到基態時才畫 0', () => {
  const y = (svg, E) => { const m = new RegExp(`y="([\\d.]+)"[^>]*text-anchor="end"[^>]*>${E}</text>`).exec(svg); return m ? +m[1] : null; };
  const h = ladderSVG(L, { indices: [0, 1, 2], selected: 2 });
  assert.ok(Math.abs(y(h, '13.06') - y(h, '12.75')) > 8, '12.75 與 13.06 eV 的橫槓/標籤應分得開');
  assert.ok(!/>0<\/text>/.test(h), '氫的 n=2 以上不含基態');
  const na = ladderSVG([[589, 1, 0, 2.104]], { selected: 0 });
  assert.match(na, />0<\/text>/);                                         // 鈉 D 線的下能階是基態
});

// ---------- 週期表光譜模式 ----------
test('miniSpectrumSVG:每條譜線一條細線、黑底、不含座標軸文字', () => {
  const svg = miniSpectrumSVG([[589, 1], [500, 0.2]], { width: 40, height: 40 });
  assert.equal((svg.match(/<line /g) || []).length, 2); assert.match(svg, /class="mini-spec"/); assert.ok(!/<text/.test(svg));
});

// ---------- 光譜偵探出題 ----------
const pool = spectrumPool(SPECTRA, ELEMENTS);

test('題庫:36 個學過的元素、每個都有足夠的譜線', () => {
  assert.equal(pool.length, 36);
  for (const e of pool) assert.ok(SPECTRA[e.sym].lines.length >= MIN_LINES && e.fact, e.sym);
});

test('similarity:自己與自己 = 1;氫與氦、鋰與鉀很不像;鐵比起鈉更像鎳', () => {
  near(similarity(SPECTRA.Na.lines, SPECTRA.Na.lines), 1, 1e-9);
  assert.ok(similarity(SPECTRA.H.lines, SPECTRA.He.lines) < 0.3);
  assert.ok(similarity(SPECTRA.Li.lines, SPECTRA.K.lines) < 0.3);
  assert.ok(similarity(SPECTRA.Fe.lines, SPECTRA.Ni.lines) > similarity(SPECTRA.Fe.lines, SPECTRA.Na.lines));
  assert.equal(binVector([[400, 1]]).length, 40);
});

test('出題:4 個不重複的選項、含正確答案、選項彼此不會太像、答案的最亮線正確(抽樣 500 題)', () => {
  assert.ok(MAX_SIMILARITY <= 0.5, `相似度上限 ${MAX_SIMILARITY} 太寬鬆,鐵/鎳/銅這類看不出差別的光譜會被放在同一題`);
  const rng = rngOf(12345);
  for (let i = 0; i < 500; i++) {
    const q = makeSpectrumQuestion(pool, SPECTRA, rng);
    assert.equal(q.options.length, 4); assert.equal(new Set(q.options.map(o => o.sym)).size, 4);
    assert.ok(q.options.includes(q.answer));
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++)
      assert.ok(similarity(SPECTRA[q.options[a].sym].lines, SPECTRA[q.options[b].sym].lines) < MAX_SIMILARITY, `${q.options[a].sym}-${q.options[b].sym} 太像`);
    assert.equal(q.brightest, [...SPECTRA[q.answer.sym].lines].sort((x, y) => y[1] - x[1])[0][0]);
  }
});

test('出題:固定亂數結果可重現;每個元素都有機會成為答案', () => {
  const a = makeSpectrumQuestion(pool, SPECTRA, rngOf(7)), b = makeSpectrumQuestion(pool, SPECTRA, rngOf(7));
  assert.equal(a.answer.sym, b.answer.sym); assert.deepEqual(a.options.map(o => o.sym), b.options.map(o => o.sym));
  const seen = new Set(); const rng = rngOf(99);
  for (let i = 0; i < 2000; i++) seen.add(makeSpectrumQuestion(pool, SPECTRA, rng).answer.sym);
  assert.equal(seen.size, pool.length);
});

test('出題:正確答案在四個位置出現的機率差不多(不固定在某個位置)', () => {
  const pos = [0, 0, 0, 0], rng = rngOf(2024);
  for (let i = 0; i < 2000; i++) { const q = makeSpectrumQuestion(pool, SPECTRA, rng); pos[q.options.indexOf(q.answer)]++; }
  for (const c of pos) assert.ok(c > 400 && c < 600, `位置分布不均:${pos}`);
});

test('出題:題庫太小會明確報錯;放寬機制能在選項很像時仍湊滿 4 個', () => {
  assert.throws(() => makeSpectrumQuestion(pool.slice(0, 3), SPECTRA), /題庫/);
  const same = { sym: 'X', fact: {}, name: {} }, fake = Object.fromEntries('ABCDE'.split('').map(s => [s, { lines: SPECTRA.Fe.lines }]));
  const q = makeSpectrumQuestion('ABCDE'.split('').map(s => ({ ...same, sym: s })), fake, rngOf(1));
  assert.equal(q.options.length, 4);                                      // 全都一樣像 → 放寬後照樣出得了題
});

test('util:pick / shuffle 可注入亂數,洗牌不改動原陣列、結果是同一批元素', () => {
  const arr = [1, 2, 3, 4, 5, 6];
  assert.equal(pick(arr, () => 0), 1); assert.equal(pick(arr, () => 0.999), 6);
  const s = shuffle(arr, rngOf(3)); assert.deepEqual([...s].sort(), arr); assert.deepEqual(arr, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(shuffle(arr, rngOf(3)), s);
});

// ---------- 徽章 ----------
test('徽章:彩虹觀察員(看過 5 個元素的光譜)、光譜偵探(答對 3 題光譜題)', () => {
  const badge = id => BADGES.find(b => b.id === id);
  const base = { elements: [], built: [], reactions: [], bestStreak: 0, quizRight: 0, spectraSeen: [], spectrumRight: 0 };
  assert.ok(!badge('rainbow').test(base) && badge('rainbow').test({ ...base, spectraSeen: ['H', 'He', 'Li', 'Na', 'K'] }));
  assert.ok(!badge('spec3').test({ ...base, spectrumRight: 2 }) && badge('spec3').test({ ...base, spectrumRight: 3 }));
  assert.equal(new Set(BADGES.map(b => b.id)).size, BADGES.length);
});

// ---------- 中英文文字一致 ----------
test('i18n:中文與英文的文字鍵完全一致,而且每個鍵用到的 {變數} 相同(新增文字最容易漏翻譯)', () => {
  const zk = Object.keys(zh).sort(), ek = Object.keys(en).sort();
  assert.deepEqual(zk.filter(k => !(k in en)), [], '英文缺少這些鍵');
  assert.deepEqual(ek.filter(k => !(k in zh)), [], '中文缺少這些鍵');
  const vars = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
  for (const k of zk) assert.equal(vars(zh[k]), vars(en[k]), `${k} 的 {變數} 在中英文不同`);
});

test('i18n:光譜相關文字都存在(含 7 種顏色名稱)', () => {
  for (const k of ['sp.title', 'sp.ladder', 'sp.ladder.emit', 'sp.ladder.absorb', 'sp.ladder.sel.emit', 'sp.ladder.sel.absorb', 'sp.ladder.none', 'pt.spec', 'quiz.q.spectrum', 'quiz.spec.hint', 'atom.tab.info', 'atom.tab.spec',
    ...['violet', 'blue', 'cyan', 'green', 'yellow', 'orange', 'red'].map(c => 'sp.c.' + c)]) { assert.ok(zh[k], 'zh ' + k); assert.ok(en[k], 'en ' + k); }
});
