// 電子雲場景:路由、入口(只有氫)、國小/國中兩層、切開看、中英文字串完整。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const cloud = read('src/scenes/ElectronCloud.js'), main = read('src/main.js'), atom = read('src/scenes/AtomView.js'), zh = read('src/i18n/zh.js'), en = read('src/i18n/en.js');

test('場景註冊;從底部導覽看起來仍屬於「元素週期表」(同原子頁);換語言/注音會重載', () => {
  assert.match(main, /cloud: ElectronCloud/);
  assert.match(main, /name === 'atom' \|\| name === 'cloud'/);
});

test('入口只在氫的光譜分頁(氫有精確解);回光譜會回到氫的光譜分頁', () => {
  assert.match(atom, /sym === 'H' \? `<button class="chip cloud-link"/);
  assert.match(atom, /location\.hash = '#cloud\/1s'/);
  assert.match(cloud, /setNextTab\('spec'\); location\.hash = '#atom\/1'/);
  assert.match(atom, /export function setNextTab/);
});

test('週期表光譜模式下點元素,直接進原子頁的光譜分頁;一般模式進原子資訊', () => {
  const pt = read('src/scenes/PeriodicTable.js');
  assert.match(pt, /setNextTab\(specMode && SPECTRA\[e\.sym\]\?\.lines\.length \? 'spec' : 'info'\)/);
});

test('國小/國中/高中三層;預設立體,可切換「切開看」;切開時鏡頭正對剖面、不自動旋轉', () => {
  assert.match(cloud, /const LEVELS = \['kid', 'teen', 'high'\]/);
  assert.match(cloud, /slice = false/);                                        // 預設立體;切開看是選項
  assert.match(cloud, /if \(sliced\) stage\.camera\.position\.set\(0, 0, L\)/);       // 切開看時鏡頭正對剖面,不用再轉
  assert.match(cloud, /localClippingEnabled = true/);
  assert.match(cloud, /autoRotate = !reduced && !sliced/);
  assert.match(cloud, /camera\.position\.set\(0, 0,/);
});

test('點雲數據來自物理公式取樣(同一狀態同一個種子,每次一樣),節點與正負號用顏色表示', () => {
  assert.match(cloud, /sampleCloud\(id, MAX_POINTS, makeRng\(1000 \+ \[\.\.\.STATE_IDS, \.\.\.COMPLEX_IDS\]\.indexOf\(id\)\)\)/);
  assert.match(cloud, /cur\.sign\[i\] > 0 \? WARM : COOL/);
  assert.match(cloud, /HUES\[Math\.floor/);                                       // 複數軌域用相位色環
});

test('所有 cloud.* 文字中英文都有,而且沒有漏掉的變數', () => {
  const keys = s => new Set([...s.matchAll(/'(cloud\.[\w.]+)':/g)].map(m => m[1]));
  const kz = keys(zh), ke = keys(en);
  assert.deepEqual([...kz].sort(), [...ke].sort());
  assert.ok(kz.size >= 35, 'cloud 文字數量 ' + kz.size);
  for (const k of cloud.matchAll(/T\('(cloud\.[\w.]+)'/g)) if (!k[1].endsWith('.')) assert.ok(kz.has(k[1]), '程式用到但沒有定義:' + k[1]);   // 結尾是 . 的是動態組合的,下面逐一檢查
  for (const k of ['lead.kid', 'lead.teen', 'level.kid', 'level.teen', 'l.s', 'l.p', 'l.d', 'solid', 'teen.slice', 'teen.solid']) assert.ok(kz.has('cloud.' + k), 'cloud.' + k);
  for (const id of ['1s', '2s', '2p', '3d']) for (const p of ['name', 'desc', 'node']) assert.ok(kz.has(`cloud.${p}.${id}`), `cloud.${p}.${id}`);
});

test('誠實說明:電子雲頁有「亮點只是找到電子的位置」與「只有氫能這麼精確」的提醒', () => {
  assert.match(zh, /'cloud\.honest': '想一想:這些亮點是「如果去找電子,會在哪裡找到它」/);
  assert.match(zh, /只有氫能畫得這麼精確/);
});

test('T() 的變數裡不能再放 T():T 的結果已經是 HTML,再丟進 T 會被轉義,畫面上就會出現一段 <span class=...> 的原始碼(要用 Tp)', () => {
  const walk = d => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.js$/.test(e.name) ? [path.join(d, e.name)] : []);
  const bad = [];
  for (const f of walk('src').filter(f => !/generated/.test(f))) read(f).split('\n').forEach((line, i) => { if (/[^p]T\('[^']+', \{[^}]*[^p]T\(/.test(line)) bad.push(`${f}:${i + 1}`); });
  assert.deepEqual(bad, []);
});

test('電子雲面板的子元素不會被 flex 壓扁(底部按鈕列要有完整高度)', () => {
  assert.match(read('src/style.css'), /\.cloud-side > \*\{flex:none\}/);
});

test('第二期:2p+3d 疊加——有滑桿與播放鈕;光波強度 = 2ab(純態為 0);每個點的亮度 = (1 + c·cos φ)/2;光是 Hα 紅色', () => {
  assert.match(cloud, /data-state="mix"/); assert.match(cloud, /class="cl-mixrange"/); assert.match(cloud, /data-act="play"/);
  assert.match(cloud, /strength = \(\) => 2 \* Math\.sqrt\(mixFrac \* \(1 - mixFrac\)\)/);
  assert.match(cloud, /0\.5 \* \(1 \+ cur\.c\[i\] \* cs\)/);
  assert.match(cloud, /cssColor\(656\.3\)/);
  assert.match(cloud, /composeMix\(pools\.p2, pools\.p3, MIX_POINTS, mixFrac\)/);
  assert.match(cloud, /!reduced && !sliced && !cur\.mix/);                       // 疊加態不自動旋轉
  assert.match(cloud, /playing = !reduced/);                                      // 減少動態效果:不自動播放,使用者按了才播
});

test('第二期:放慢倍率有誠實標示(約 10¹⁵ 倍),並說明這裡的混合比例是固定的、真實發光要幾奈秒', () => {
  assert.match(zh, /'cloud\.mix\.slow': '為了看得見,這裡放慢了約 \{x\} 倍。'/);
  assert.match(cloud, /x: '10¹⁵'/);
  assert.match(zh, /真實的原子發光大約要幾奈秒/);
});

test('按鈕文字不能用 inline-flex(含注音的 ruby 會被拆開跑版):播放鈕與切開看鈕改用 inline-block', () => {
  const st = read('src/style.css');
  assert.match(st, /\[data-act=play\]\{display:inline-block\}/);
  assert.ok(!/\[data-act=play\]\{display:inline-flex\}/.test(st));
  assert.match(st, /\.cl-slice\{display:inline-block\}/);
});

test('暫停鈕不用 ⏸ 表情符號(各平台畫成帶底色的方塊,高度和文字不同,會讓注音文字跑版),改用純文字符號 ❚❚', () => {
  const c = read('src/scenes/ElectronCloud.js');
  assert.ok(!c.includes('⏸'));
  assert.match(c, /data-act="play">❚❚/);
  assert.match(read('src/style.css'), /\.cloud-side \.cl-actions \.btn\{white-space:nowrap/);
});
