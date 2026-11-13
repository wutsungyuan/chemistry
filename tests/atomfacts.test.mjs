// 原子頁與週期表依階段:週期/族/價電子/粒子數、分類說明三個階段版本、語言包。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { atomFacts, catDesc, isMainGroupEl } from '../src/game/atomfacts.js';
import { ELEMENTS, BY_SYMBOL, CATEGORIES } from '../src/data/elements.js';
import { raw } from '../src/i18n/index.js';
import PACK from '../src/i18n/packs/atom.js';
import { validateElements } from '../scripts/lib/validate-elements.mjs';

test('已知元素:週期、族、價電子、粒子數', () => {
  assert.deepEqual(atomFacts(BY_SYMBOL.Fe), { period: 4, group: 8, valence: null, protons: 26, electrons: 26, neutrons: 30 });
  assert.deepEqual(atomFacts(BY_SYMBOL.O), { period: 2, group: 16, valence: 6, protons: 8, electrons: 8, neutrons: 8 });
  assert.deepEqual(atomFacts(BY_SYMBOL.Na), { period: 3, group: 1, valence: 1, protons: 11, electrons: 11, neutrons: 12 });
  assert.equal(atomFacts(BY_SYMBOL.Cl).valence, 7); assert.equal(atomFacts(BY_SYMBOL.Cl).group, 17);
  assert.equal(atomFacts(BY_SYMBOL.He).valence, 2); assert.equal(atomFacts(BY_SYMBOL.He).group, 18);
  assert.equal(atomFacts(BY_SYMBOL.H).group, 1); assert.equal(atomFacts(BY_SYMBOL.H).neutrons, 1 - 1);
  assert.equal(atomFacts(BY_SYMBOL.La).group, null); assert.equal(atomFacts(BY_SYMBOL.U).group, null);          // 鑭系、錒系沒有 1~18 族
});

test('118 個元素:週期 1~7、族 1~18 或 null、中子數 ≥ 0;主族的價電子 1~8,過渡金屬沒有價電子欄', () => {
  for (const e of ELEMENTS) {
    const f = atomFacts(e);
    assert.ok(f.period >= 1 && f.period <= 7, e.sym);
    assert.ok(f.group === null || (f.group >= 1 && f.group <= 18), e.sym);
    assert.ok(f.neutrons >= 0, e.sym);
    if (isMainGroupEl(e)) { assert.ok(f.valence >= 1 && f.valence <= 8, e.sym); assert.equal(f.valence, e.sym === 'He' ? 2 : e.col <= 2 ? e.col : e.col - 10, e.sym); }
    else assert.equal(f.valence, null, e.sym);
    if (e.cat === 'transition') assert.equal(f.valence, null, e.sym);
  }
});

test('分類說明:國小、國中、高中各一份,三份不同,且中英文都有', () => {
  for (const [k, c] of Object.entries(CATEGORIES)) {
    const a = catDesc(k, 'kid'), b = catDesc(k, 'teen'), h = catDesc(c, 'high');
    for (const d of [a, b, h]) assert.ok(d.zh.length > 10 && d.en.length > 10, k);
    assert.notEqual(a.zh, b.zh, k); assert.notEqual(b.zh, h.zh, k); assert.notEqual(b.en, h.en, k);
  }
});

test('驗證腳本:分類少了國中/高中說明會被擋下', () => {
  const E = JSON.parse(fs.readFileSync(new URL('../src/data/db/elements.json', import.meta.url), 'utf8'));
  const errs = []; const x = JSON.parse(JSON.stringify(E)); delete x.categories.noble.descHigh;
  validateElements(x, { err: (id, m) => errs.push(id + ': ' + m) });
  assert.ok(errs.some(e => /descHigh/.test(e)));
});

test('語言包 atom.js:中英文 key 對應;@ 說法都有國小預設;用語依階段不同', () => {
  assert.deepEqual(Object.keys(PACK.zh).sort(), Object.keys(PACK.en).sort());
  const zh = fs.readFileSync(new URL('../src/i18n/zh.js', import.meta.url), 'utf8');
  for (const k of Object.keys(PACK.zh)) {
    const base = k.replace(/@(teen|high)$/, '');
    if (base.startsWith('atom.facts')) continue;                                            // 這幾個只在國中/高中使用
    assert.ok(zh.includes(`'${base}'`), `${base} 沒有國小預設`);
  }
  assert.notEqual(raw('atom.z.tip', 'zh', 'kid'), raw('atom.z.tip', 'zh', 'high'));
  assert.notEqual(raw('atom.mass.tip', 'en', 'teen'), raw('atom.mass.tip', 'en', 'high'));
  assert.match(raw('atom.facts.pos', 'zh', 'high'), /價電子|\{v\}/);
});
