// 分子實驗室的任務提示:要依鍵級寫出單鍵/雙鍵/三鍵(乙炔的 C≡C 不能寫成 C–C)。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MOL } from '../src/data/molecules.js';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('任務提示依鍵級標示,中英文都有說明', () => {
  assert.match(read('src/scenes/MoleculeLab.js'), /SIGN = \{ 1: '–', 2: '=', 3: '≡' \}/);
  for (const f of ['zh', 'en']) { const t = read(`src/i18n/${f}.js`); assert.match(t, /'lab\.order\.2'/); assert.match(t, /'lab\.order\.3'/); }
});

test('乙炔的資料裡 C–C 是三鍵(提示的依據)', () => {
  const c2h2 = Object.values(MOL).find(m => m.formula === 'C2H2');
  assert.ok(c2h2.bonds.some(([, , o]) => o === 3));
});
