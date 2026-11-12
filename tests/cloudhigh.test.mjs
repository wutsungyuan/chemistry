// 電子雲第三期(🎓 高中層)的場景結構檢查。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const cloud = read('src/scenes/ElectronCloud.js'), zh = read('src/i18n/zh.js'), en = read('src/i18n/en.js'), css = read('src/style.css');

test('高中層:公式、徑向機率圖、複數軌域(相位色環 + 機率流)、選擇定則表;複數軌域只在高中層出現', () => {
  assert.match(cloud, /function highHTML\(parts\)/);
  assert.match(cloud, /radialGraph\(id,/);
  assert.match(cloud, /selectionTable\(\)/);
  assert.match(cloud, /COMPLEX_IDS\.includes\(id\) && level !== 'high'\) id = '2p'/);          // 低層級不會停在複數軌域
  assert.match(cloud, /flowOmega\(flowM, rho\)/);                                               // 機率流角速度用物理公式 ω = m/ρ²
  assert.match(css, /\.cloud-side:not\(\[data-level=high\]\) \.cl-complex\{display:none\}/);
  for (const id of ['1s', '2s', '2p', '3d', '2p+1', '3d+2']) assert.ok(cloud.includes(`'${id}': { R:`), 'FORMULA ' + id);
});

test('高中層的文字中英文都齊全', () => {
  for (const k of ['cloud.level.high', 'cloud.lead.high', 'cloud.mix.lead.high', 'cloud.high.graph', 'cloud.high.complex', 'cloud.high.real', 'cloud.high.honest', 'cloud.high.rule', 'cloud.name.2p+1', 'cloud.node.3d+2', 'cloud.desc.3d+2']) {
    assert.ok(zh.includes(`'${k}':`) && en.includes(`'${k}':`), k);
  }
});

test('誠實說明:白點是機率流的示蹤粒子,不是電子軌跡;整體相位不可觀測所以顏色不動', () => {
  assert.match(zh, /白點是機率流的示蹤粒子,不是電子的軌跡/);
  assert.match(zh, /整體相位不可觀測,所以不畫它隨時間的轉動/);
});
