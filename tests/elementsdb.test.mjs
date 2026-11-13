// 元素、元素用途、反應:資料在 db/*.json,驗證腳本要擋下壞資料;程式讀進來的形狀不能變。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateElements, validateElementUses } from '../scripts/lib/validate-elements.mjs';
import { validateReactions } from '../scripts/lib/validate-reactions.mjs';
import { ELEMENTS, BY_SYMBOL, BY_Z, CATEGORIES } from '../src/data/elements.js';
import { ELEMENT_USES } from '../src/data/elementUses.js';
import { REACTIONS, checkBalance } from '../src/data/reactions.js';
import { MOL } from '../src/data/molecules.js';

const read = p => JSON.parse(fs.readFileSync(new URL('../src/data/db/' + p, import.meta.url), 'utf8'));
const run = (fn) => { const errs = []; fn({ err: (id, m) => errs.push(`${id}: ${m}`) }); return errs; };
const clone = o => JSON.parse(JSON.stringify(o));

test('現有資料通過驗證', () => {
  const E = read('elements.json');
  assert.deepEqual(run(c => validateElements(E, c)), []);
  assert.deepEqual(run(c => validateElementUses(read('element-uses.json'), E, c)), []);
  assert.deepEqual(run(c => validateReactions(read('reactions.json'), MOL, c)), []);
});

test('元素驗證會擋下壞資料:殼層加起來不等於原子序、位置重疊、分類不存在、少元素、缺出處', () => {
  const E = read('elements.json');
  const bad = f => { const x = clone(E); f(x); return run(c => validateElements(x, c)); };
  assert.ok(bad(x => { x.elements[7].shells = [2, 7]; }).some(e => /電子殼層加起來/.test(e)));
  assert.ok(bad(x => { x.elements[1].row = x.elements[0].row; x.elements[1].col = x.elements[0].col; }).some(e => /重疊/.test(e)));
  assert.ok(bad(x => { x.elements[5].cat = 'nope'; }).some(e => /分類/.test(e)));
  assert.ok(bad(x => { x.elements.pop(); }).some(e => /118/.test(e)));
  assert.ok(bad(x => { delete x.meta.source; }).some(e => /出處/.test(e)));
  assert.ok(bad(x => { delete x.elements[0].name.en; }).some(e => /中英文/.test(e)));
});

test('元素用途驗證:元素符號不存在、重複、缺英文都會被擋', () => {
  const E = read('elements.json'), U = read('element-uses.json');
  const bad = f => { const x = clone(U); f(x); return run(c => validateElementUses(x, E, c)); };
  assert.ok(bad(x => { x.uses[0].sym = 'Xx'; }).some(e => /不存在/.test(e)));
  assert.ok(bad(x => { x.uses.push(clone(x.uses[0])); }).some(e => /兩次/.test(e)));
  assert.ok(bad(x => { delete x.uses[0].items[0].en; }).some(e => /中英文/.test(e)));
});

test('反應驗證:原子不守恆、分子不存在、沒有動畫的效果都會被擋', () => {
  const R = read('reactions.json');
  const bad = f => { const x = clone(R); f(x); return run(c => validateReactions(x, MOL, c)); };
  assert.ok(bad(x => { x.reactions[0].products[0][1] = 3; }).some(e => /不守恆/.test(e)));
  assert.ok(bad(x => { x.reactions[0].reactants[0][0] = 'NOPE'; }).some(e => /不存在/.test(e)));
  assert.ok(bad(x => { x.reactions[0].effect = 'laser'; }).some(e => /effect/.test(e)));
});

test('程式讀到的形狀沒變:元素有殼層/位置/顏色/半徑,分類有中英文與顏色,用途是 [公式, 中文, 英文]', () => {
  assert.equal(ELEMENTS.length, 118);
  assert.equal(BY_Z[8].sym, 'O'); assert.deepEqual(BY_SYMBOL.O.shells, [2, 6]);
  for (const e of ELEMENTS) { assert.ok(/^#/.test(e.color)); assert.ok(e.radius > 0); assert.ok(CATEGORIES[e.cat]); }
  assert.equal(BY_SYMBOL.Ra.color, CATEGORIES.alkaline.color);                           // 沒有 CPK 配色 → 用分類色
  for (const c of Object.values(CATEGORIES)) assert.ok(c.zh && c.en && c.desc.zh && c.desc.en && c.color);
  assert.deepEqual(ELEMENT_USES.He[0].length, 3);
  assert.ok(REACTIONS.length >= 9 && REACTIONS.every(checkBalance));
});
