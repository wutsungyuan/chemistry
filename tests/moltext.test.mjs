// 分子說明依階段(國小 / 國中 / 高中)的文字,以及英文版的資料出處。
import test from 'node:test';
import assert from 'node:assert/strict';
import { factFor, useFor } from '../src/game/molfacts.js';
import { MOLECULES, MOL, GALLERY } from '../src/data/molecules.js';

const CJK = /[一-鿿]/;
const visible = GALLERY.filter(m => m.fact);

test('每個看得到的分子:高中版有自己的說明與用途(中英文);國小等級的分子也有國中版', () => {
  assert.ok(visible.length >= 80);
  for (const m of visible) {
    for (const k of ['factHigh', 'useHigh']) assert.ok(m[k]?.zh && m[k]?.en, `${m.id} 缺 ${k}`);
    if (m.level === 'kid') for (const k of ['factTeen', 'useTeen']) assert.ok(m[k]?.zh && m[k]?.en, `${m.id} 缺 ${k}`);
  }
});

test('三個階段取到的文字不同(沒有專屬版本時才退回國小說法);國中/高中的說法跟國小不一樣', () => {
  for (const m of visible) {
    assert.equal(factFor(m, 'kid'), m.fact); assert.equal(useFor(m, 'kid'), m.use);
    assert.equal(factFor(m, 'high'), m.factHigh); assert.equal(useFor(m, 'high'), m.useHigh);
    assert.equal(factFor(m, 'teen'), m.factTeen || m.fact);
    assert.notEqual(m.factHigh.zh, m.fact.zh, `${m.id} 高中版說明和國小版一樣`);
    assert.notEqual(m.useHigh.zh, m.use.zh, `${m.id} 高中版用途和國小版一樣`);
    if (m.level === 'kid') { assert.notEqual(m.factTeen.zh, m.fact.zh, m.id); assert.notEqual(m.useTeen.zh, m.use.zh, m.id); }
  }
});

test('國中/高中版的語氣:不用感嘆號、語助詞或「手牽手」之類的童語(中英文)', () => {
  for (const m of visible) {
    for (const k of ['factTeen', 'useTeen', 'factHigh', 'useHigh']) {
      if (!m[k]) continue;
      assert.ok(!/[!!]|喔|唷|耶|哦|牽手|手牽手|小小的|像一張/.test(m[k].zh), `${m.id}.${k} 中文語氣:${m[k].zh}`);
      assert.ok(!/!/.test(m[k].en), `${m.id}.${k} 英文有驚嘆號:${m[k].en}`);
      assert.ok(!CJK.test(m[k].en), `${m.id}.${k} 英文欄位含中文字`);
    }
  }
});

test('英文版的資料出處:每個有出處的分子都有 sourceEn,不含中文字,也不等於中文版', () => {
  for (const m of MOLECULES) {
    if (!m.source) continue;
    assert.ok(m.sourceEn && m.sourceEn.length > 5, `${m.id} 缺 sourceEn`);
    assert.ok(!CJK.test(m.sourceEn), `${m.id} sourceEn 含中文字:${m.sourceEn}`);
    assert.notEqual(m.sourceEn, m.source);
    assert.ok(!/[<>]/.test(m.sourceEn), m.id);
  }
  assert.match(MOL.UO2.sourceEn, /^uraninite · COD \d+/);                 // 由 CIF 自動組成:礦物名 · COD 編號 · 作者 年份 · 溫度 · 備註
  assert.match(MOL.NaHCO3.sourceEn, /temperature not stated/);
  assert.match(MOL.H2O.sourceEn, /NIST CCCBDB/);
});
