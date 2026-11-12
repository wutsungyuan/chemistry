// 結構資料庫的單元測試(Node 內建 node:test,執行:npm test)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadCif, withTypeSymbols } from '../scripts/lib/cif.mjs';
import { buildStructure, zmat } from '../src/data/structureDB.js';
import { bondLength, angleAt } from '../src/data/geom.js';
import { skeletonSignature, composition } from '../src/data/graph.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIF_DIR = path.join(root, 'src/data/db/cif');
const ctx = { loadCif: id => loadCif(CIF_DIR, id) };
const near = (actual, expected, tol, msg) => assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} 期望 ${expected}±${tol},實際 ${actual.toFixed(3)}`);
const db = () => JSON.parse(fs.readFileSync(path.join(root, 'src/data/db/structures.json'), 'utf8'));
const rec = id => db().find(r => r.id === id);

test('CIF 前處理:補上缺少的元素欄、去掉電荷、大小寫容錯', () => {
  const noType = '_atom_site_label\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\nAL1 0 0 0\nO-H3 .1 .2 .3\n\nloop_\n';
  const fixed = withTypeSymbols(noType);
  assert.match(fixed, /_atom_site_type_symbol/);
  assert.match(fixed, /^AL1 Al 0 0 0$/m);
  assert.match(fixed, /^O-H3 O \.1 \.2 \.3$/m);
  const charged = '_atom_site_label\n_atom_site_type_symbol\n_atom_site_fract_x\nSn1 Sn4+ 0\nO1 O2- 0.3\n';
  assert.match(withTypeSymbols(charged), /^Sn1 Sn 0$/m);
  assert.match(withTypeSymbols(charged), /^O1 O 0\.3$/m);
});

test('CIF 載入:辰砂的晶胞原子數、出處資訊、COD 編號與檔名一致', () => {
  const c = loadCif(CIF_DIR, '9012082');
  assert.equal(c.atoms.length, 6);                                   // Z=3,Hg 與 S 各 3 顆(對稱操作由 crystcif-parse 套用)
  assert.deepEqual([...new Set(c.atoms.map(a => a.type))].sort(), ['Hg', 'S']);
  assert.equal(c.meta.cod, '9012082');
  assert.match(c.meta.authors[0], /Auvray/);
  assert.equal(c.meta.year, 1973);
});

test('每個 CIF 都能載入,且編號與檔名一致', () => {
  for (const f of fs.readdirSync(CIF_DIR).filter(f => f.endsWith('.cif'))) {
    const id = f.replace('.cif', '');
    const c = loadCif(CIF_DIR, id);
    assert.equal(c.meta.cod, id, f);
    assert.ok(c.atoms.length > 0, f);
  }
});

test('Z-matrix:水的鍵長與鍵角', () => {
  const atoms = zmat(rec('H2O').rows);
  near(bondLength(atoms, 0, 1), 0.958, 0.002, 'O–H');
  near(angleAt(atoms[0], atoms[1], atoms[2]), 104.5, 0.1, 'H–O–H');
});

test('Z-matrix:雙氧水的 O–O–H 鍵角與二面角', () => {
  const a = zmat(rec('H2O2').rows);
  near(bondLength(a, 0, 1), 1.475, 0.002, 'O–O');
  near(angleAt(a[0], a[1], a[2]), 94.8, 0.1, 'O–O–H');
});

test('岩鹽結構:食鹽的小立方有 8 顆原子、12 條鍵、Na–Cl = 晶格常數/2', () => {
  const r = buildStructure(rec('NaCl'), ctx);
  assert.equal(r.atoms.length, 8);
  assert.equal(r.bonds.length, 12);
  near(bondLength(r.atoms, r.bonds[0][0], r.bonds[0][1]), 2.82, 0.05, 'Na–Cl');
  const c = composition(r.atoms.map(a => a[0]));
  assert.deepEqual(c, { Na: 4, Cl: 4 });
});

test('晶體小塊:方解石的鈣被 6 個碳酸根的氧圍住(Ca–O ≈ 2.36 Å、C–O ≈ 1.29 Å)', () => {
  const r = buildStructure(rec('CaCO3'), ctx);
  const ca = r.atoms.findIndex(a => a[0] === 'Ca');
  const caO = r.bonds.filter(b => b[3] === 'ionic').map(([i, j]) => bondLength(r.atoms, i, j));
  assert.equal(caO.length, 6);
  caO.forEach(d => near(d, 2.36, 0.03, 'Ca–O'));
  r.bonds.filter(b => !b[3]).forEach(([i, j]) => near(bondLength(r.atoms, i, j), 1.29, 0.03, 'C–O'));
  assert.equal(r.atoms.filter(a => a[0] === 'C').length, 6);
  assert.ok(ca >= 0);
});

test('晶體小塊:剛玉的 Al–O 有兩種距離(≈1.85 與 ≈1.97 Å)', () => {
  const r = buildStructure(rec('Al2O3'), ctx);
  const ds = r.bonds.map(([i, j]) => bondLength(r.atoms, i, j));
  assert.ok(ds.some(d => Math.abs(d - 1.85) < 0.03) && ds.some(d => Math.abs(d - 1.97) < 0.03));
});

test('金屬:銅是面心立方,中心原子有 12 個最近鄰(Cu–Cu ≈ 2.55 Å)', () => {
  const r = buildStructure(rec('m-Cu'), ctx);
  assert.equal(r.atoms.length, 13);
  near(bondLength(r.atoms, r.bonds[0][0], r.bonds[0][1]), 2.55, 0.05, 'Cu–Cu');
  const deg = r.atoms.map((_, i) => r.bonds.filter(b => b[0] === i || b[1] === i).length);
  assert.equal(Math.max(...deg), 12);
});

test('金屬:鐵是體心立方,中心原子有 8 個最近鄰', () => {
  const r = buildStructure(rec('m-Fe'), ctx);
  assert.equal(r.atoms.length, 9);
  const deg = r.atoms.map((_, i) => r.bonds.filter(b => b[0] === i || b[1] === i).length);
  assert.equal(Math.max(...deg), 8);
});

test('合金:黃銅在銅的晶格上換入 4 顆鋅,結果固定、中心原子不換', () => {
  const a = buildStructure(rec('m-Cu-Zn'), ctx), b = buildStructure(rec('m-Cu-Zn'), ctx);
  assert.deepEqual(composition(a.atoms.map(x => x[0])), { Cu: 9, Zn: 4 });
  assert.deepEqual(a.atoms, b.atoms);                                 // 每次都一樣
  assert.equal(a.atoms[0][0], 'Cu');
});

test('小蘇打:由真實晶體取出 HCO3⁻ 與 Na⁺,原子順序固定,氫在合理位置', () => {
  const r = buildStructure(rec('NaHCO3'), ctx);
  assert.deepEqual(r.atoms.map(a => a[0]), ['C', 'O', 'O', 'O', 'H', 'Na']);   // 實驗室依賴這個順序
  assert.ok(r.estimatedH);
  near(bondLength(r.atoms, 2, 4), 0.98, 0.01, 'O–H');
  assert.ok(bondLength(r.atoms, 0, 4) > 1.5, 'H 不能擠在碳旁邊');
  near(angleAt(r.atoms[2], r.atoms[0], r.atoms[4]), 112, 8, 'C–O–H');
});

test('建置腳本:資料庫驗證與反應守恆檢查都通過', () => {
  for (const script of ['scripts/build-db.mjs', 'scripts/check-reactions.mjs']) {
    const r = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  }
});

test('實驗室配方:每個任務的骨架簽章都不同', async () => {
  const { LAB_TARGETS } = await import('../src/data/molecules.js');
  const sigs = new Set(LAB_TARGETS.map(m => skeletonSignature(m.labPair ? m.labPair.atoms : m.atoms.map(a => a[0]), m.labPair ? m.labPair.bonds : m.bonds)));
  assert.equal(sigs.size, LAB_TARGETS.length);
  assert.equal(LAB_TARGETS.length, 16);
});
