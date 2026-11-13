// 國小版一律顯示注音,所以不能漏字:118 個元素的中文名稱每一個字都要有注音(含超重元素的罕用字)。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { rubyHTML } from '../src/i18n/zhuyin.js';
import { ELEMENTS } from '../src/data/elements.js';

const count = (html, re) => (html.match(re) || []).length;

test('118 個元素的中文名稱:每個字都有注音', () => {
  assert.equal(ELEMENTS.length, 118);
  for (const e of ELEMENTS) {
    const html = rubyHTML(e.name.zh);
    assert.equal(count(html, /class="zy"/g), [...e.name.zh].length, `${e.sym} ${e.name.zh} 有字沒有注音`);
    assert.ok(count(html, /class="zs"/g) === [...e.name.zh].length, `${e.sym} ${e.name.zh}`);
  }
});

test('超重元素的罕用字(105~109 號)注音正確', () => {
  const zs = ch => (rubyHTML(ch).match(/<span class="zs">([^<]*)<\/span>/) || [])[1];
  const tone = ch => (rubyHTML(ch).match(/<span class="zt">([^<]*)<\/span>/) || [])[1] || '';
  assert.deepEqual([zs('𨧀'), tone('𨧀')], ['ㄉㄨ', 'ˋ']);      // 鎶 Db:ㄉㄨˋ
  assert.deepEqual([zs('𨭎'), tone('𨭎')], ['ㄒㄧ', 'ˇ']);      // Sg:ㄒㄧˇ
  assert.deepEqual([zs('𨨏'), tone('𨨏')], ['ㄅㄛ', '']);       // Bh:ㄅㄛ(一聲)
  assert.deepEqual([zs('𨭆'), tone('𨭆')], ['ㄏㄟ', '']);       // Hs:ㄏㄟ(一聲)
  assert.deepEqual([zs('䥑'), tone('䥑')], ['ㄇㄞ', 'ˋ']);      // Mt:ㄇㄞˋ
  // 罕用字混在句子裡,不會讓後面的字對錯位
  assert.equal(count(rubyHTML('𨧀你好'), /class="zy"/g), 3);
});

test('手機版:國小(中文)的週期表格子顯示中文名稱與注音;其他階段與英文版仍只放符號', () => {
  const css = fs.readFileSync(new URL('../src/mobile.css', import.meta.url), 'utf8');
  assert.match(css, /html\[data-level=kid\]\[lang=zh-Hant\] \.pt-grid \.el \.nm \{ display: block;/);
  const pt = fs.readFileSync(new URL('../src/scenes/PeriodicTable.js', import.meta.url), 'utf8');
  assert.ok(pt.includes("phoneOnly && level !== 'kid' ? L(e.name) : LH(e.name)"));     // 國小在手機也走有注音的 LH
});
