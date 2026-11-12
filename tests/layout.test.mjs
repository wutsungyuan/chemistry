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
    assert.match(head, /^@(media\s*\((max-width:\s*600px|max-height:\s*480px\)\s*and\s*\(max-width:\s*950px)|keyframes\s)/, `會影響所有裝置的規則:${head.slice(0, 60)}`);
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
