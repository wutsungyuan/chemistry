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

test('國小/國中兩層;國中預設「切開看」並可切回立體;切開時鏡頭正對剖面、不自動旋轉', () => {
  assert.match(cloud, /const LEVELS = \['kid', 'teen'\]/);
  assert.match(cloud, /slice = true/);
  assert.match(cloud, /localClippingEnabled = true/);
  assert.match(cloud, /autoRotate = !reduced && !sliced/);
  assert.match(cloud, /camera\.position\.set\(0, 0,/);
});

test('點雲數據來自物理公式取樣(同一狀態同一個種子,每次一樣),節點與正負號用顏色表示', () => {
  assert.match(cloud, /sampleCloud\(id, MAX_POINTS, makeRng\(1000 \+ STATE_IDS\.indexOf\(id\)\)\)/);
  assert.match(cloud, /cur\.sign\[i\] > 0 \? WARM : COOL/);
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
