// 國中/高中版的文字補齊:元素的生活小知識、光譜說明、小標籤、徽章名稱。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ELEMENTS } from '../src/data/elements.js';
import { elFact, elUse } from '../src/game/atomfacts.js';
import { BADGES, badgeName } from '../src/game/store.js';
import { raw } from '../src/i18n/index.js';
import SPECTRUM from '../src/i18n/packs/spectrum.js';
import UI from '../src/i18n/packs/ui.js';
import { validateElements } from '../scripts/lib/validate-elements.mjs';

const CJK = /[一-鿿]/;
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const withFact = ELEMENTS.filter(e => e.fact);

test('有生活小知識的 36 個元素:國中版與高中版都有(中英文),用途成對;語氣不再是童語', () => {
  assert.equal(withFact.length, 36);
  for (const e of withFact) {
    for (const sfx of ['Teen', 'High']) {
      const f = e['fact' + sfx];
      assert.ok(f?.zh && f?.en, `${e.sym} 缺 fact${sfx}`);
      assert.ok(!CJK.test(f.en), `${e.sym} fact${sfx}.en 含中文字`);
      assert.ok(!/[!!]|喔|唷|耶|哦|牽手/.test(f.zh) && !/!/.test(f.en), `${e.sym} fact${sfx} 語氣:${f.zh}`);
      assert.equal(!!e.use, !!e['use' + sfx], `${e.sym} use${sfx} 要和 use 一起有`);
      if (e.use) assert.ok(e['use' + sfx].zh && !/[!!]|喔/.test(e['use' + sfx].zh), `${e.sym} use${sfx}`);
    }
    assert.notEqual(e.factTeen.zh, e.fact.zh, e.sym); assert.notEqual(e.factHigh.zh, e.factTeen.zh, e.sym);
    assert.equal(elFact(e, 'kid'), e.fact); assert.equal(elFact(e, 'teen'), e.factTeen); assert.equal(elFact(e, 'high'), e.factHigh);
    assert.equal(elUse(e, 'kid'), e.use);
  }
  assert.equal(elFact({ fact: 'a' }, 'high'), 'a'); assert.equal(elFact({ fact: 'a', factTeen: 'b' }, 'high'), 'b');   // 沒有高中版 → 國中版 → 國小版
});

test('元素驗證:有生活小知識卻沒有高中版、或英文含中文字,會被擋下', () => {
  const E = JSON.parse(read('src/data/db/elements.json'));
  const bad = f => { const x = JSON.parse(JSON.stringify(E)); f(x); const errs = []; validateElements(x, { err: (id, m) => errs.push(id + ': ' + m) }); return errs; };
  assert.deepEqual(bad(() => {}), []);
  const o = x => x.elements.find(e => e.sym === 'O');
  assert.ok(bad(x => { delete o(x).factHigh; }).some(e => /factHigh/.test(e)));
  assert.ok(bad(x => { o(x).factTeen.en = '氧氣'; }).some(e => /中文字/.test(e)));
  assert.ok(bad(x => { delete o(x).useTeen; }).some(e => /useTeen/.test(e)));
});

test('語言包 spectrum.js 與 ui.js:中英文 key 完全對應;每個 @ 說法都有國小預設(zh.js / en.js)', () => {
  for (const [name, P] of [['spectrum', SPECTRUM], ['ui', UI]]) {
    assert.deepEqual(Object.keys(P.zh).sort(), Object.keys(P.en).sort(), name);
    for (const k of Object.keys(P.zh)) assert.ok(P.zh[k].length > 0 && P.en[k].length > 0, k);
  }
  const zh = read('src/i18n/zh.js'), en = read('src/i18n/en.js');
  for (const k of [...Object.keys(SPECTRUM.zh), ...Object.keys(UI.zh)]) {
    const base = k.replace(/@(teen|high)$/, '');
    assert.ok(zh.includes(`'${base}'`) && en.includes(`'${base}'`), `${base} 缺少國小預設(zh.js / en.js)`);
  }
});

test('用語依階段不同:光譜「樓層」→「能階」→「躍遷、光子」;小標籤與徽章名稱也跟著階段變', () => {
  assert.match(raw('sp.ladder.emit', 'zh', 'kid'), /樓層/); assert.ok(!/樓層/.test(raw('sp.ladder.emit', 'zh', 'teen')) && /能階/.test(raw('sp.ladder.emit', 'zh', 'teen')));
  assert.match(raw('sp.ladder.emit', 'zh', 'high'), /光子/); assert.match(raw('sp.ladder.emit', 'en', 'high'), /photon/); assert.match(raw('sp.ladder.emit', 'en', 'kid'), /floor/);
  assert.equal(raw('sp.ground', 'zh', 'high'), '基態');
  assert.equal(raw('lab.made.msg', 'zh', 'kid').includes('!'), true); assert.ok(!/!/.test(raw('lab.made.msg', 'zh', 'high')) && !/!/.test(raw('lab.made.msg', 'en', 'high')));
  assert.equal(raw('lab.made.msg', 'zh', 'high').replace('{n}', '水'), '已完成:水。');
  assert.notEqual(raw('quiz.badges', 'zh', 'kid'), raw('quiz.badges', 'zh', 'high'));
});

test('徽章名稱依階段:國小是原本的名字,國中/高中各有名稱(中英文)', () => {
  assert.ok(BADGES.length >= 11);
  for (const b of BADGES) {
    assert.equal(badgeName(b, 'kid'), b.name);
    for (const lv of ['teen', 'high']) { const n = badgeName(b, lv); assert.ok(n.zh && n.en && !CJK.test(n.en), `${b.id} ${lv}`); }
    assert.notEqual(badgeName(b, 'high').zh, b.name.zh, `${b.id} 高中名稱和國小一樣`);
  }
});
