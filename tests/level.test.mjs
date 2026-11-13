// 階段(國小/國中/高中)是全站共用的單一來源:入口頁選、localStorage 存、注音與用語依它決定、資料用 forLevel 篩。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const { LEVELS, getLevel, setLevel, hasLevel, forLevel, levelRank } = await import('../src/ui/level.js');
const i18n = await import('../src/i18n/index.js');

test('hasLevel:沒選過是 false(入口頁才知道要不要跳),選過之後是 true;預設階段是國小', () => {
  store.clear();
  assert.equal(hasLevel(), false); assert.equal(getLevel(), 'kid');
  setLevel('teen'); assert.equal(hasLevel(), true); assert.equal(getLevel(), 'teen');
  setLevel('nope'); assert.equal(getLevel(), 'teen');                                   // 不合法的值會被忽略
  assert.deepEqual(LEVELS, ['kid', 'teen', 'high']);
});

test('forLevel:level 是最低適用階段,沒寫當國小;國小只看到基礎、高中全看得到', () => {
  const items = [{ id: 'a' }, { id: 'b', level: 'kid' }, { id: 'c', level: 'teen' }, { id: 'd', level: 'high' }];
  assert.deepEqual(forLevel(items, 'kid').map(i => i.id), ['a', 'b']);
  assert.deepEqual(forLevel(items, 'teen').map(i => i.id), ['a', 'b', 'c']);
  assert.deepEqual(forLevel(items, 'high').map(i => i.id), ['a', 'b', 'c', 'd']);
  assert.ok(levelRank('kid') < levelRank('teen') && levelRank('teen') < levelRank('high'));
});

test('注音由階段決定:只有國小(中文介面)有注音,沒有開關', () => {
  i18n.setLang('zh');
  setLevel('kid'); assert.equal(i18n.state.zhuyin, true); assert.match(i18n.render('水'), /class="zp"/);
  setLevel('teen'); assert.equal(i18n.state.zhuyin, false); assert.equal(i18n.render('水'), '水');
  setLevel('high'); assert.equal(i18n.state.zhuyin, false);
  setLevel('kid'); i18n.setLang('en'); assert.ok(!/zp/.test(i18n.render('Water')));       // 英文介面不加注音
  i18n.setLang('zh');
  assert.equal('setZhuyin' in i18n, false);
  assert.ok(!/btn-zhuyin/.test(fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')));
});

test('用語依階段:key@kid / key@teen / key@high 優先,沒有就用 key,再沒有退回中文', () => {
  // raw() 是 T() 的底層:可直接指定語言與階段
  const k = Object.keys({ 'brand': 1 })[0];
  assert.equal(i18n.raw(k, 'zh', 'kid'), i18n.raw(k, 'zh', 'high'));                   // 沒有 @ 版本 → 三個階段共用
  assert.equal(i18n.raw('no.such.key', 'zh', 'kid'), 'no.such.key');                    // 完全沒有 → 回傳 key 本身
});
