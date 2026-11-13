// 手機版版面(src/mobile.css)的靜態檢查:確保手機樣式不會外漏到 iPad / 桌面。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'src/mobile.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** 把 CSS 切成最上層的區塊(忽略巢狀大括號) */
function topLevelBlocks(src) {
  const out = []; let depth = 0, start = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { out.push(src.slice(start, i + 1).trim()); start = i + 1; } }
  }
  return out;
}

test('mobile.css:最上層只有 @media(手機寬度/橫放矮螢幕)與 @keyframes,沒有會影響桌面的裸規則', () => {
  for (const b of topLevelBlocks(css)) {
    const head = b.slice(0, b.indexOf('{')).trim();
    assert.match(head, /^@(media\s*\((max-width:\s*(?:600|900)px\)(\s*and\s*\(max-height:\s*640px\))?, \(pointer:\s*coarse\)\s*and\s*\(max-width:\s*1400px\)|max-width:\s*600px\)$|max-height:\s*480px\)\s*and\s*\(max-width:\s*950px)|keyframes\s)/, `會影響所有裝置的規則:${head.slice(0, 60)}`);
  }
});

test('mobile.css 在 style.css 之後載入(才能覆蓋)', () => {
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  assert.ok(main.indexOf("import './style.css'") >= 0 && main.indexOf("import './mobile.css'") > main.indexOf("import './style.css'"));
});

test('手機版:底部導覽、3D 分區、觸控目標等關鍵規則存在', () => {
  assert.match(css, /#nav\s*\{[^}]*position:\s*fixed/);
  assert.match(css, /#app:has\(> \.canvas-wrap\)/);
  assert.match(css, /min-height:\s*4[4-8]px/);                              // 觸控目標至少 44px
  assert.match(css, /env\(safe-area-inset-bottom\)/);                       // 避開 iPhone 底部橫條
});

test('底部導覽的文字有獨立包裝(.lbl),避免彈性容器把注音字拆成一字一行', () => {
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  assert.match(main, /<span class="lbl">/);
});

test('手機版光譜分頁:一頁、不用捲動(三個圖同時可見):3D 取景區、縮放滑桿與提示列隱藏、階梯圖吃掉剩下的高度', () => {
  assert.match(css, /#app:has\(> \.side\[data-tab=spec\]\) > \.canvas-wrap \{ flex: 0 0 clamp\(150px, 26%, 340px\); min-height: 150px; \}/);
  assert.match(css, /#app:has\(> \.side\[data-tab=spec\]\) > \.zoombar \{ display: none; \}/);        // 滑桿位置用百分比算,畫布有最小高度時會對不上而蓋住原子
  assert.match(css, /#head #tipbar \{ display: none; \}/);
  assert.match(css, /\.spec-ladder \{ --fit: 1; flex: 1 1 0; min-height: 100px;/);                         // 階梯圖配合剩餘高度
  assert.match(css, /\.spec-strip \{[^}]*--fit: 1;/);
  assert.match(css, /\.spec-ladder svg \{ position: absolute; inset: 0;/);                                 // svg 不撐開版面,才不會和 ResizeObserver 互相拉扯
  assert.match(css, /\.spec-read \.rd-sub \{ display: none; \}/);
  assert.ok(!/#back[^{]*\{[^}]*display: none/.test(css), '回週期表/念給我聽不能在光譜分頁被隱藏(兩個分頁的按鈕要一致)');
});

test('說明面板(手機):不是會把版面撐開、疊在圖上的 <details>,而是蓋住下方面板的實心面板;有 ✕、Esc 可關閉', () => {
  assert.match(css, /\.spec-more\.open \{[^}]*position: absolute; inset: 0; z-index: 30;[^}]*background: #1b2350;/);   // 絕對定位 + 實心背景 = 不會疊影
  assert.match(css, /\.spec-more \{ display: none; \}/);
  assert.match(css, /\.spec-more-head \{ position: sticky; top: 0;/);                                      // 標題列(含 ✕)固定在最上面,捲動時也一直在
  assert.match(css, /\.spec-more-close \{ min-width: 44px; min-height: 44px;/);                             // 關閉鈕要夠大
  const av = fs.readFileSync(path.join(root, 'src/scenes/AtomView.js'), 'utf8');
  assert.ok(!/<details class="spec-more">/.test(av), '不要再用 <details>(展開時會疊在階梯圖上、關閉鈕被壓住)');
  assert.match(av, /class="spec-more-close"/); assert.match(av, /e\.key === 'Escape'/); assert.match(av, /aria-expanded/);
  assert.match(av, /removeEventListener\('keydown', onKey\)/);                                              // 離開頁面要拆掉監聽
});

test('3D 取景:光譜分頁依畫布大小自動取景(fitRing + ResizeObserver),切回原子資訊會恢復原本取景', () => {
  const av = fs.readFileSync(path.join(root, 'src/scenes/AtomView.js'), 'utf8');
  assert.match(av, /function fitRing\(r\)/); assert.match(av, /\.project\(stage\.camera\)/);              // 用實際投影到畫面上的範圍,不是猜
  assert.match(av, /new ResizeObserver\(\(\) => reframe\(\)\)/); assert.match(av, /frameWatcher\.disconnect\(\)/);
  assert.match(av, /if \(b\.dataset\.tab === 'info'\) setDist\(dist0\)/);
});

test('操作列:順序是 ◀ 回週期表 念給我聽 ▶;按 ◀ ▶ 換元素會停留在目前的分頁(原子資訊 / 光譜)', () => {
  const av = fs.readFileSync(path.join(root, 'src/scenes/AtomView.js'), 'utf8');
  const ids = [...av.matchAll(/<button class="btn[^"]*" id="(prev|back|say|next)"/g)].map(m => m[1]);
  assert.deepEqual(ids, ['prev', 'back', 'say', 'next']);
  assert.match(av, /#prev'\)\.onclick = \(\) => \{ pendingTab = side\.dataset\.tab; go\(/);
  assert.match(av, /#next'\)\.onclick = \(\) => \{ pendingTab = side\.dataset\.tab; go\(/);
  assert.match(av, /side\.dataset\.tab = specOn && pendingTab === 'spec' \? 'spec' : 'info'; pendingTab = null;/);   // 用過就清掉:從週期表進來仍從原子資訊開始
  assert.match(css, /#prev, #app > \.side:not\(\.mission\) > div:last-child #next \{ flex: none;/);   // 箭頭固定在兩側
});

test('iPad(觸控、寬度 ≤ 1400px)與手機共用同一套版面;JS 判斷(layout.js)和 CSS 條件要一致', () => {
  const lay = fs.readFileSync(path.join(root, 'src/ui/layout.js'), 'utf8');
  assert.match(lay, /PHONE_QUERY = '\(max-width: 900px\), \(pointer: coarse\) and \(max-width: 1400px\)'/);
  assert.match(lay, /isNarrow = \(\) => window\.innerWidth <= NARROW_MAX \|\| matchMedia\(PHONE_QUERY\)\.matches/);
  const raw = fs.readFileSync(path.join(root, 'src/mobile.css'), 'utf8');
  const heads = [...raw.matchAll(/^@media ([^{]+)\{/gm)].map(m => m[1].trim()).filter(h => !/max-height:\s*480px/.test(h));
  assert.ok(heads.length >= 5);
  const phoneOnly = heads.filter(h => h === '(max-width: 600px)');
  assert.equal(phoneOnly.length, 1, '只有週期表那一段是「只有手機」');
  for (const h of heads.filter(h => h !== '(max-width: 600px)')) assert.match(h, /\(pointer: coarse\) and \(max-width: 1400px\)/, `這個區塊沒有涵蓋 iPad:${h}`);
  // 週期表的小格子只能出現在「只有手機」的區塊;iPad 與桌面要顯示中文名稱與注音
  const tableBlock = raw.slice(raw.indexOf('@media (max-width: 600px) {\n  .pt-wrap'));
  assert.match(tableBlock, /\.pt-grid \{ grid-template-columns: repeat\(18, 40px\)/);
  assert.ok(!raw.slice(0, raw.indexOf('@media (max-width: 600px) {\n  .pt-wrap')).includes('.pt-grid'), '.pt-grid 的小格子規則不能在涵蓋 iPad 的區塊裡');
  const pt = fs.readFileSync(path.join(root, 'src/scenes/PeriodicTable.js'), 'utf8');
  assert.match(pt, /phoneOnly = matchMedia\('\(max-width: 600px\)'\)\.matches/); assert.match(pt, /phoneOnly && level !== 'kid' \? L\(e\.name\) : LH\(e\.name\)/);   // 少一個就會造成 iPad 版面一半是手機、一半是桌面
});

test('週期表:手機只顯示符號;iPad 直式放大格子(可左右滑)顯示中文名稱與注音;桌面不變', () => {
  const st = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
  assert.match(st, /@media \(min-width:601px\) and \(max-width:1100px\)\{\s*\.pt-wrap\{min-width:1060px\}\s*\.pt-grid \.el \.nm\{font-size:\.74rem\}/);
  const pt = fs.readFileSync(path.join(root, 'src/scenes/PeriodicTable.js'), 'utf8');
  assert.ok(!/isNarrow/.test(pt), '週期表顯示中文名稱不能再看 isNarrow(iPad 也是 isNarrow)');
});
