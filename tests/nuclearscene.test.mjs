// 「原子核與同位素」場景:路由、入口、三階段、文字齊全、誠實說明。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const scene = read('src/scenes/NuclearView.js'), main = read('src/main.js'), atom = read('src/scenes/AtomView.js'), zh = read('src/i18n/zh.js'), en = read('src/i18n/en.js');

test('場景註冊;從底部導覽看起來仍屬於「元素週期表」;原子頁有入口;核種資料動態載入(不拖慢其他頁)', () => {
  assert.match(main, /nucleus: NuclearView/);
  assert.match(main, /name === 'nucleus'/);
  assert.match(atom, /class="chip nuc-link"/);
  assert.match(atom, /go\('nucleus', el\.z\)/);
  assert.match(scene, /import\('\.\.\/data\/generated\/nuclides\.js'\)/);
  assert.ok(!/^import .*generated\/nuclides/m.test(scene), '核種資料要用動態 import');
});

test('三個階段共用 ui/level.js;國小/國中/高中各有專屬內容', () => {
  assert.match(scene, /import \{ LEVELS, getLevel, setLevel \} from '\.\.\/ui\/level\.js'/);
  assert.match(scene, /level === 'kid'/); assert.match(scene, /level !== 'kid'/); assert.match(scene, /level === 'high'/);
  assert.match(scene, /quarks\(cur\.z, cur\.n\)/);                    // 高中:夸克
  assert.match(scene, /lambda\(cur\.hl\)/);                             // 高中:衰變定律
  assert.match(scene, /averageMass\(nat\)/);                            // 國中以上:原子量是加權平均
  assert.match(scene, /chartCanvas/);                                   // 高中:核種圖
});

test('衰變動畫:β⁻ 中子變質子並射出電子、β⁺ 質子變中子並射出正電子、α 射出 2 質子 + 2 中子;子核由守恆計算', () => {
  assert.match(scene, /m === 'B-'[\s\S]*nuc\.kinds\[anim\.who\[0\]\] = 0/);
  assert.match(scene, /m === 'B\+'[\s\S]*nuc\.kinds\[anim\.who\[0\]\] = 1/);
  assert.match(scene, /\.\.\.nearest\(0, 2\), \.\.\.nearest\(1, 2\)/);
  assert.match(scene, /daughter\(cur\.z, cur\.n, anim\.m\)/);
});

test('不理會「減少動態效果」:這個頁面不看 prefers-reduced-motion', () => {
  assert.ok(!/reduced-motion/.test(scene));
});

test('所有 nuc.* 文字中英文都有,而且程式用到的都有定義', () => {
  const keys = s => new Set([...s.matchAll(/'(nuc\.[\w.+-]+)':/g)].map(m => m[1]));
  const kz = keys(zh), ke = keys(en);
  assert.deepEqual([...kz].sort(), [...ke].sort());
  assert.ok(kz.size >= 55, 'nuc 文字數量 ' + kz.size);
  for (const k of scene.matchAll(/T\('(nuc\.[\w.+-]+)'/g)) if (!k[1].endsWith('.')) assert.ok(kz.has(k[1]), '程式用到但沒有定義:' + k[1]);   // 結尾是 . 的是動態組合的,下面逐一檢查
  for (const k of ['nuc.mode.', 'nuc.high.mode.']) for (const m of ['B-', 'B+', 'A', 'P', 'N', 'SF', 'IT']) assert.ok(kz.has(k + m), k + m);
  for (const k of ['nuc.lead.']) for (const l of ['kid', 'teen', 'high']) assert.ok(kz.has(k + l), k + l);
});

test('誠實說明:原子核不是整齊的彩色小球;衰變是一瞬間、畫面放慢;資料有出處;單顆原子的衰變時間無法預測', () => {
  assert.match(zh, /真正的原子核不是一顆顆整齊、有顏色的小球/);
  assert.match(zh, /真實的衰變只是一瞬間的事/);
  assert.match(zh, /沒有人能預測某一顆/);
  assert.match(zh, /IAEA 核資料組 LiveChart/);
  assert.match(scene, /NUCLIDE_META\.extraction/);
});
