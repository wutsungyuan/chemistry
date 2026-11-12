// 沒有能階記錄的譜線(NIST 有 28% 可見線沒有)也要有躍遷動畫:對得出來用真的,否則畫示意並明講。
import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECTRA } from '../src/data/generated/spectra.js';
import { completeLines, hasLevels, hasAnyLevels, isApprox, ladderLines, ladderSVG } from '../src/ui/spectrum.js';
import { jumpPlan } from '../src/ui/orbitJump.js';

const HC = 1239.84198;

test('completeLines:每一條線都有能階可畫;原資料不被修改', () => {
  for (const [sym, sp] of Object.entries(SPECTRA)) {
    const before = JSON.stringify(sp.lines), out = completeLines(sp.lines);
    assert.equal(JSON.stringify(sp.lines), before, sym + ' 原資料被改了');
    assert.equal(out.length, sp.lines.length);
    out.forEach((l, i) => {
      assert.ok(hasAnyLevels(l), `${sym} ${l[0]}`);
      assert.ok(l[3] > l[2], `${sym} ${l[0]} 上能階要比下能階高`);
      assert.ok(Math.abs(l[3] - l[2] - HC / l[0]) < 0.006, `${sym} ${l[0]} 能量差要等於 hc/λ`);   // 真的或示意的,能量差都必須和光子能量一致
      if (sp.lines[i][2] != null) assert.deepEqual(l, sp.lines[i]);                                  // 本來就有的不動
    });
  }
});

test('有對出來的是「真實」能階(不標示意),對不出來的才標示意;P 的 619.9 是示意', () => {
  const P = completeLines(SPECTRA.P.lines), l = P.find(x => Math.abs(x[0] - 619.902) < 0.01);
  assert.ok(isApprox(l) && !hasLevels(l));
  let real = 0, approx = 0;
  for (const sp of Object.values(SPECTRA)) for (const [i, l] of completeLines(sp.lines).entries()) if (sp.lines[i][2] == null) isApprox(l) ? approx++ : real++;
  assert.ok(real > 50 && approx > 500, `real=${real} approx=${approx}`);
});

test('示意的線不會混進「最亮的幾條線」階梯圖,只有被選到時才畫(虛線);而且 3D 躍遷算得出兩個軌道', () => {
  const P = completeLines(SPECTRA.P.lines), i = P.findIndex(x => isApprox(x));
  assert.ok(!ladderLines(P, -1).some(k => isApprox(P[k])));
  assert.ok(ladderLines(P, i).includes(i));
  assert.match(ladderSVG(P, { selected: i }), /stroke-dasharray="4 3"/);
  const plan = jumpPlan(P[i], { baseR: 3, nGround: 3 });
  assert.ok(plan && plan.rHi > plan.rLo);
});

test('說明裡有「為什麼跳的是最外層電子」的解釋(中英文都有),並顯示在說明面板', async () => {
  const fs = await import('node:fs');
  const zh = fs.readFileSync(new URL('../src/i18n/zh.js', import.meta.url), 'utf8'), en = fs.readFileSync(new URL('../src/i18n/en.js', import.meta.url), 'utf8');
  const av = fs.readFileSync(new URL('../src/scenes/AtomView.js', import.meta.url), 'utf8');
  assert.match(zh, /'sp\.why': '為什麼跳的是最外層的電子/); assert.match(en, /'sp\.why': 'Why is it the outermost/);
  assert.match(av, /<p class="spec-why">\$\{T\('sp\.why'\)\}<\/p>/);
});

test('下層不是平常那一圈時(氫的巴耳末線等),3D 會把原本那圈標成「平常位置」並解釋,不會像憑空多出軌道', async () => {
  const fs = await import('node:fs');
  const av = fs.readFileSync(new URL('../src/scenes/AtomView.js', import.meta.url), 'utf8');
  assert.match(av, /plan\.rLo > outerShell\.R \+ 0\.05/); assert.match(av, /T\('sp\.ground'\)/); assert.match(av, /T\('sp\.ladder\.excited'\)/);
  // 氫:所有可見線的下能階都不是基態,所以每一條都會走到這個分支
  const H = SPECTRA.H.lines; assert.ok(H.every(l => l[2] > 0.01));
});

test('手機:階梯圖下方說明放不下時整行收起來(.tight),不會被切掉一半(開注音後字比較高)', async () => {
  const fs = await import('node:fs');
  const av = fs.readFileSync(new URL('../src/scenes/AtomView.js', import.meta.url), 'utf8'), css = fs.readFileSync(new URL('../src/mobile.css', import.meta.url), 'utf8');
  assert.match(av, /function fitRead\(\)/); assert.match(av, /ladderBox\.clientHeight < 100 \+ ladderRead\.scrollHeight/);   // 只看格子高度和說明自然高度,不看階梯圖現在多高 → 不會來回跳動
  assert.match(av, /ro\.observe\(ladderBox\)/);
  assert.match(css, /\.spec-ladder-box\.tight \.spec-ladder-read \{ display: none; \}/);
});
