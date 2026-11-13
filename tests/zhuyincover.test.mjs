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

// ---- 輕聲與破音字:台灣國語的讀法(國小一律顯示注音,不能漏字也不能念錯)----
const plain = html => [...html.matchAll(/<span class="zy"><span class="zh">(.)<\/span><span class="zp"><span class="zs">([^<]*)<\/span>(?:<span class="zt">([^<]*)<\/span>)?/g)].map(m => m[1] + m[2] + (m[3] || '')).join(' ');
const zy = t => plain(rubyHTML(t));

test('輕聲字有注音(的、了、著、得、個…):以前輕聲被 pinyin-pro 寫成 0 而整個漏掉', () => {
  assert.equal(zy('我的'), '我ㄨㄛˇ 的˙ㄉㄜ');
  assert.equal(zy('燒完了'), '燒ㄕㄠ 完ㄨㄢˊ 了˙ㄌㄜ');
  assert.equal(zy('跟著水'), '跟ㄍㄣ 著˙ㄓㄜ 水ㄕㄨㄟˇ');
  assert.equal(zy('變得又香'), '變ㄅㄧㄢˋ 得˙ㄉㄜ 又ㄧㄡˋ 香ㄒㄧㄤ');
  assert.equal(zy('幾個'), '幾ㄐㄧˇ 個˙ㄍㄜ');
  for (const [t, ch] of [['好嗎', '嗎'], ['走吧', '吧'], ['是呢', '呢'], ['的', '的'], ['看了', '了']]) assert.ok(zy(t).includes(ch + '˙'), `${t} 的「${ch}」沒有輕聲注音:${zy(t)}`);
});

test('破音字用台灣的讀法:還(ㄏㄞˊ)、幾(ㄐㄧˇ)、只(ㄓˇ)、乾(ㄍㄢ)、調(ㄊㄧㄠˊ)、著、得、了不起', () => {
  assert.equal(zy('還沒'), '還ㄏㄞˊ 沒ㄇㄟˊ');
  assert.equal(zy('還能'), '還ㄏㄞˊ 能ㄋㄥˊ');
  assert.equal(zy('歸還'), '歸ㄍㄨㄟ 還ㄏㄨㄢˊ');                                    // 歸還仍是 huán
  assert.equal(zy('好幾年'), '好ㄏㄠˇ 幾ㄐㄧˇ 年ㄋㄧㄢˊ');
  assert.equal(zy('幾乎'), '幾ㄐㄧ 乎ㄏㄨ');                                          // 幾乎 jī hū
  assert.equal(zy('只有'), '只ㄓˇ 有ㄧㄡˇ');
  assert.equal(zy('保持乾燥'), '保ㄅㄠˇ 持ㄔˊ 乾ㄍㄢ 燥ㄗㄠˋ');
  assert.equal(zy('洗不乾淨'), '洗ㄒㄧˇ 不ㄅㄨˋ 乾ㄍㄢ 淨ㄐㄧㄥˋ');
  assert.equal(zy('調出五顏六色'), '調ㄊㄧㄠˊ 出ㄔㄨ 五ㄨˇ 顏ㄧㄢˊ 六ㄌㄧㄡˋ 色ㄙㄜˋ');
  assert.equal(zy('調查'), '調ㄉㄧㄠˋ 查ㄔㄚˊ');                                      // 調查仍是 diào
  assert.equal(zy('著火'), '著ㄓㄠˊ 火ㄏㄨㄛˇ');
  assert.equal(zy('得到'), '得ㄉㄜˊ 到ㄉㄠˋ');                                        // 得到仍是 dé
  assert.equal(zy('了不起'), '了ㄌㄧㄠˇ 不ㄅㄨˋ 起ㄑㄧˇ');
  assert.equal(zy('為什麼'), '為ㄨㄟˋ 什ㄕㄣˊ 麼˙ㄇㄜ');                             // 什麼的「麼」是輕聲 ㄇㄜ˙
  assert.equal(zy('因為'), '因ㄧㄣ 為ㄨㄟˋ'); assert.equal(zy('成為'), '成ㄔㄥˊ 為ㄨㄟˊ');   // 因為 wèi、成為 wéi
  assert.equal(zy('房間'), '房ㄈㄤˊ 間ㄐㄧㄢ'); assert.equal(zy('間隔'), '間ㄐㄧㄢˋ 隔ㄍㄜˊ');     // 房間 jiān、間隔 jiàn
});

test('所有化學故事:輕聲字都有注音,且故事裡的破音字讀法正確', () => {
  const fs2 = fs.readFileSync(new URL('../src/data/db/stories.json', import.meta.url), 'utf8');
  const S = JSON.parse(fs2).stories;
  for (const s of S) for (const t of [...s.body.zh, s.quiz.q.zh, s.quiz.explain.zh]) {
    const zs = [...rubyHTML(t).matchAll(/<span class="zs">([^<]*)<\/span>/g)];
    assert.ok(zs.every(x => x[1] !== ''), `${s.id} 有字的注音是空的:${t.slice(0, 20)}`);          // 輕聲字(的、了、著…)以前會是空的
  }
  const all = S.flatMap(s => [...s.body.zh, s.quiz.q.zh, s.quiz.explain.zh]).join('');
  for (const [w, want] of [['還沒', '還ㄏㄞˊ'], ['好幾年', '幾ㄐㄧˇ'], ['只有', '只ㄓˇ'], ['保持乾燥', '乾ㄍㄢ'], ['調出', '調ㄊㄧㄠˊ'], ['著火', '著ㄓㄠˊ']]) if (all.includes(w)) assert.ok(zy(w).includes(want), `${w} → ${zy(w)}`);
});
