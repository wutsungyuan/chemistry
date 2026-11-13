// 物質的變化:資料與換算(三態的滑桿對應、平台、吸熱量)、物理/化學變化題庫、驗證腳本、場景與文字齊全。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBSTANCES, CHANGES, substance, phases, stateAt, positionOf, heatNeeded, changeKind, poolFor, pickRound, HEAT_VALID_MAX_C } from '../src/data/matter.js';
import { validateMatter } from '../scripts/lib/validate-matter.mjs';
import PACK from '../src/i18n/packs/matter.js';
import { BADGES } from '../src/game/store.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('每個物質的狀態依序相接:溫度由低到高,固態 → 液態 → 氣態(乾冰直接升華)(+ 電漿)', () => {
  for (const sub of SUBSTANCES) for (const plasma of [false, true]) {
    const ph = phases(sub, plasma);
    assert.equal(ph[0].phase, 'solid');
    for (let i = 0; i < ph.length; i++) { assert.ok(ph[i].lo < ph[i].hi, `${sub.id} ${ph[i].phase}`); if (i) assert.equal(ph[i].lo, ph[i - 1].hi); }
    assert.equal(ph.some(p => p.phase === 'plasma'), plasma);
  }
  assert.deepEqual(phases(substance('co2')).map(p => p.phase), ['solid', 'gas']);
  assert.deepEqual(phases(substance('water')).map(p => p.phase), ['solid', 'liquid', 'gas']);
});

test('滑桿 ↔ 溫度:單調上升;變化時溫度停在熔點/沸點(平台);室溫的水是液態,位置可以反推回來', () => {
  const w = substance('water');
  let prev = -Infinity, plateau = new Set();
  for (let i = 0; i <= 1000; i++) {
    const st = stateAt(w, i / 1000); assert.ok(st.tempC >= prev - 1e-9, 'i=' + i); prev = st.tempC;
    if (st.to) { plateau.add(st.tempC); assert.ok(st.progress >= 0 && st.progress <= 1); }
  }
  assert.deepEqual([...plateau].sort((a, b) => a - b), [0, 100]);                    // 融化停在 0 °C、沸騰停在 100 °C
  assert.equal(stateAt(w, 0).tempC, -273.15);
  const room = positionOf(w, 20); assert.equal(stateAt(w, room).phase, 'liquid'); assert.ok(Math.abs(stateAt(w, room).tempC - 20) < 1e-6);
  assert.equal(stateAt(substance('iron'), positionOf(substance('iron'), 20)).phase, 'solid');
  assert.equal(stateAt(substance('mercury'), positionOf(substance('mercury'), 20)).phase, 'liquid');
  assert.equal(stateAt(substance('nitrogen'), positionOf(substance('nitrogen'), 20)).phase, 'gas');
  assert.equal(stateAt(substance('co2'), positionOf(substance('co2'), 20)).phase, 'gas');
  assert.equal(stateAt(w, 1, true).phase, 'plasma');
});

test('狀態變化的名稱與吸熱/放熱:融化、汽化、升華吸熱;凝固、凝結、凝華放熱', () => {
  const k = (a, b) => changeKind(a, b);
  assert.deepEqual(k('solid', 'liquid'), { kind: 'melt', heat: 'absorb' });
  assert.deepEqual(k('liquid', 'gas'), { kind: 'vaporize', heat: 'absorb' });
  assert.deepEqual(k('solid', 'gas'), { kind: 'sublime', heat: 'absorb' });
  assert.deepEqual(k('liquid', 'solid'), { kind: 'freeze', heat: 'release' });
  assert.deepEqual(k('gas', 'liquid'), { kind: 'condense', heat: 'release' });
  assert.deepEqual(k('gas', 'solid'), { kind: 'deposit', heat: 'release' });
});

test('水的加熱能量:−20 °C 的冰到 100 °C 的水蒸氣 = 2.03×20 + 333.55 + 4.184×100 + 2257 J/g;只在比熱當定值合理的溫度內算', () => {
  const w = substance('water'), at = (s) => heatNeeded(w, stateAt(w, s));
  const liquid50 = heatNeeded(w, { tempC: 50, phase: 'liquid', to: null, progress: 0 });
  assert.ok(Math.abs(liquid50.total - (2.03 * 20 + 333.55 + 4.184 * 50)) < 1e-9);
  const steam = heatNeeded(w, { tempC: 100, phase: 'gas', to: null, progress: 0 });
  assert.ok(Math.abs(steam.total - (2.03 * 20 + 333.55 + 418.4 + 2257)) < 1e-9);
  const half = heatNeeded(w, { tempC: 0, phase: 'solid', to: 'liquid', progress: 0.5 });
  assert.ok(Math.abs(half.total - (2.03 * 20 + 333.55 / 2)) < 1e-9);                       // 融化到一半:吸了一半的熔化熱
  assert.equal(heatNeeded(w, { tempC: -50, phase: 'solid', to: null, progress: 0 }), null);
  assert.equal(heatNeeded(w, { tempC: HEAT_VALID_MAX_C + 1, phase: 'gas', to: null, progress: 0 }), null);
  assert.equal(heatNeeded(substance('iron'), { tempC: 100, phase: 'solid', to: null, progress: 0 }), null);   // 其他物質沒有比熱資料
  assert.ok(at(0.5).total > at(0.34).total);                                         // 越熱,吸的熱越多
});

test('物理/化學變化題庫:每個階段兩種答案都有;國小只出國小題,高中全部;一輪 8 題、答案兩種都有、不重複', () => {
  assert.ok(CHANGES.length >= 30);
  for (const l of ['kid', 'teen', 'high']) for (const a of ['physical', 'chemical']) assert.ok(CHANGES.some(c => c.level === l && c.answer === a), l + a);
  assert.ok(poolFor('kid').every(c => c.level === 'kid')); assert.equal(poolFor('high').length, CHANGES.length);
  for (const level of ['kid', 'teen', 'high']) {
    const r = pickRound(level, 8);
    assert.equal(r.length, 8); assert.equal(new Set(r.map(c => c.id)).size, 8);
    assert.ok(r.some(c => c.answer === 'physical') && r.some(c => c.answer === 'chemical'));
    assert.ok(r.every(c => poolFor(level).includes(c)));
  }
  for (const c of CHANGES) assert.ok(c.why.zh.length > 6 && c.why.en.length > 6, c.id);
});

test('驗證腳本會擋下壞資料:熔點高於沸點、答案不是兩種之一、缺英文、題目太少', () => {
  const run = M => { const errs = []; validateMatter(M, { err: (id, m) => errs.push(`${id}: ${m}`), warns: [] }); return errs; };
  const good = JSON.parse(read('src/data/db/matter.json'));
  assert.deepEqual(run(good), []);
  const bad = (f) => { const x = JSON.parse(JSON.stringify(good)); f(x); return run(x); };
  assert.ok(bad(x => { x.substances[1].mp = 999; }).some(e => /熔點.*必須低於沸點/.test(e)));
  assert.ok(bad(x => { x.changes[0].answer = 'both'; }).some(e => /answer/.test(e)));
  assert.ok(bad(x => { delete x.changes[0].why.en; }).some(e => /中英文/.test(e)));
  assert.ok(bad(x => { x.changes = x.changes.filter(c => c.level !== 'high'); }).some(e => /high/.test(e)));
  assert.ok(bad(x => { x.substances[0].mp = 5; }).some(e => /水的熔點/.test(e)));
});

test('場景接上:路由、底部導覽、共用的階段選擇與粒子元件、不理會「減少動態效果」', () => {
  const main = read('src/main.js'), scene = read('src/scenes/MatterView.js'), parts = read('src/ui/particles.js');
  assert.match(main, /matter: MatterView/); assert.match(main, /\['matter', 'nav\.matter'/);
  assert.match(scene, /import \{ levelChipsHTML, bindLevelChips \} from '\.\.\/ui\/levelBar\.js'/);
  assert.match(scene, /import \{ createParticleBox \} from '\.\.\/ui\/particles\.js'/);
  assert.ok(!/reduced-motion/.test(scene + parts));
  assert.ok(BADGES.some(b => b.id === 'change10'));
});

test('所有 matter.* 文字中英文都有,程式用到的(含動態組合的)都有定義', () => {
  const kz = new Set(Object.keys(PACK.zh)), ke = new Set(Object.keys(PACK.en));
  assert.deepEqual([...kz].sort(), [...ke].sort());
  const scene = read('src/scenes/MatterView.js');
  for (const k of scene.matchAll(/T[p]?\('(matter\.[\w.]+)'/g)) if (!k[1].endsWith('.')) assert.ok(kz.has(k[1]), '程式用到但沒有定義:' + k[1]);
  for (const k of ['solid', 'liquid', 'gas', 'plasma']) for (const p of ['phase', 'desc']) assert.ok(kz.has(`matter.${p}.${k}`), `${p}.${k}`);
  for (const k of ['melt', 'freeze', 'vaporize', 'condense', 'sublime', 'deposit', 'ionize', 'recombine']) assert.ok(kz.has('matter.kind.' + k), k);
  for (const k of ['kid', 'teen', 'high']) assert.ok(kz.has('matter.lead.' + k), k);
  for (const k of ['physical', 'chemical']) for (const p of ['matter.quiz.', 'matter.quiz.clue.']) assert.ok(kz.has(p + k), p + k);
  for (const k of ['solid', 'fusion', 'liquid', 'vaporization', 'gas']) assert.ok(kz.has('matter.part.' + k), k);
});
