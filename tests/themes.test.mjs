// 三個版本的視覺主題(src/themes.css):國小是預設外觀,國中/高中只用 html[data-level=...] 覆蓋,不能影響國小版。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

function topLevelBlocks(src) {
  const out = []; let depth = 0, start = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { out.push(src.slice(start, i + 1).trim()); start = i + 1; } }
  }
  return out;
}

test('themes.css:每條規則的選擇器都限定在國中或高中,所以國小版的預設外觀不受影響', () => {
  const css = read('src/themes.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = topLevelBlocks(css);
  assert.ok(blocks.length > 20);
  const sels = [];
  for (const b of blocks) {
    if (b.startsWith('@media')) for (const m of b.slice(b.indexOf('{') + 1, -1).matchAll(/([^{}]+)\{[^}]*\}/g)) sels.push(m[1]);
    else sels.push(b.slice(0, b.indexOf('{')));
  }
  const all = sels.join(',').split(',').map(x => x.trim()).filter(Boolean);
  assert.ok(all.length > 50);
  for (const s of all) assert.match(s, /^html\[data-level=(teen|high)\]/, '會影響國小版的規則:' + s);
});

test('themes.css 在 mobile.css 之後載入(才能覆蓋),且國中/高中各有色票與裝飾開關', () => {
  const main = read('src/main.js');
  assert.ok(main.indexOf("import './themes.css'") > main.indexOf("import './mobile.css'"));
  const css = read('src/themes.css');
  for (const lv of ['teen', 'high']) {
    assert.match(css, new RegExp(`html\\[data-level=${lv}\\] \\{[^}]*--accent`));            // 色票(CSS 變數)
    assert.match(css, new RegExp(`html\\[data-level=${lv}\\] #deco \\.bench`));              // 不要國小的木頭實驗桌
  }
  assert.match(css, /html\[data-level=high\] \.m-body \{ display: none/);                     // 高中沒有吉祥物
});
