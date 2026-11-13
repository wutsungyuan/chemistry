// 國小版的範圍:不提供分子實驗室、反應劇場、光譜與電子雲(其他階段都有)。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sceneAllowed, featureOn } from '../src/ui/level.js';
import { BADGES, badgesFor } from '../src/game/store.js';
import { KINDS } from '../src/game/questions.js';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('sceneAllowed / featureOn:國小沒有 lab、reaction、光譜;國中與高中全部都有', () => {
  for (const s of ['table', 'atom', 'gallery', 'matter', 'quiz', 'nucleus']) assert.equal(sceneAllowed(s, 'kid'), true, s);
  for (const s of ['lab', 'reaction', 'cloud']) { assert.equal(sceneAllowed(s, 'kid'), false, s); assert.equal(sceneAllowed(s, 'teen'), true); assert.equal(sceneAllowed(s, 'high'), true); }
  assert.equal(featureOn('spectrum', 'kid'), false); assert.equal(featureOn('spectrum', 'teen'), true); assert.equal(featureOn('spectrum', 'high'), true);
  assert.equal(featureOn('anything-else', 'kid'), true);
});

test('主程式:導覽依階段過濾、直接改網址到被擋的頁面會回週期表;原子頁與週期表依功能開關決定要不要光譜', () => {
  const main = read('src/main.js');
  assert.ok(main.includes('NAV.filter(([key]) => sceneAllowed(key))'));
  assert.ok(main.includes('SCENES[h] && sceneAllowed(h) ? h : \'table\''));
  assert.ok(read('src/scenes/AtomView.js').includes("featureOn('spectrum')"));
  assert.ok(read('src/scenes/PeriodicTable.js').includes("if (featureOn('spectrum')) legend.appendChild(specBtn)"));
});

test('小測驗:國小沒有光譜題(題型本來就沒有),與「國小沒有光譜」一致', () => {
  assert.ok(!KINDS.kid.includes('spectrum'));
});

test('徽章:國小只列得到的(靠實驗室/反應劇場/光譜才拿得到的不列);國中與高中全部', () => {
  const kid = badgesFor('kid').map(b => b.id);
  assert.deepEqual(kid.sort(), ['change10', 'first-el', 'streak5', 'ten-el']);
  assert.equal(badgesFor('teen').length, BADGES.length); assert.equal(badgesFor('high').length, BADGES.length);
  // 國小列出的徽章,解鎖條件只能來自國小有的功能(看元素、小測驗連對、物質變化答題),不能是實驗室/反應/光譜的欄位
  const unlockedByOthers = { built: [], reactions: [], spectraSeen: [], spectrumRight: 0 };
  const data = { elements: [], bestStreak: 0, quizRight: 0, changeRight: 0, ...unlockedByOthers };
  assert.equal(badgesFor('kid').some(b => b.test({ ...data })), false);
  const maxed = { elements: Array.from({ length: 12 }, (_, i) => 'x' + i), bestStreak: 9, quizRight: 9, changeRight: 20, ...unlockedByOthers };
  assert.equal(badgesFor('kid').every(b => b.test(maxed)), true);
});
