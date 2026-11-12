// 建置結構資料庫:讀 src/data/db/*.json → 展開 → 驗證 → 寫出 src/data/generated/db.js
// 用法:node scripts/build-db.mjs   (npm run dev / build 會自動先執行;有錯誤時會中止)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStructure } from '../src/data/structureDB.js';
import { skeletonSignature, composition } from '../src/data/graph.js';
import { BY_SYMBOL } from '../src/data/elements.js';
import { bondLength, angleAt } from '../src/data/geom.js';
import { loadCif } from './lib/cif.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB = p => JSON.parse(fs.readFileSync(path.join(root, 'src/data/db', p), 'utf8'));
const records = DB('molecules.json'), structs = DB('structures.json');
const CIF_DIR = path.join(root, 'src/data/db/cif');

const errors = [], warns = [];
const err = (id, msg) => errors.push(`✗ ${id}: ${msg}`);
const warn = (id, msg) => warns.push(`! ${id}: ${msg}`);

// ---- 1) 清單一致 ----
const ids = records.map(r => r.id);
ids.forEach((id, i) => { if (ids.indexOf(id) !== i) err(id, 'molecules.json 裡 id 重複'); });
const sIds = structs.map(s => s.id);
sIds.forEach((id, i) => { if (sIds.indexOf(id) !== i) err(id, 'structures.json 裡 id 重複'); });
ids.forEach(id => { if (!sIds.includes(id)) err(id, '沒有對應的結構記錄'); });
sIds.forEach(id => { if (!ids.includes(id)) err(id, '結構記錄沒有對應的分子'); });
for (const r of records) for (const k of ['id', 'formula', 'name']) if (!r[k]) err(r.id, `缺少欄位 ${k}`);

// ---- 2) CIF:原始資料檔(COD)。解析交給 crystcif-parse,出處由 CIF 內容自動組成 ----
const cifCache = new Map();
const cifOf = id => { if (!cifCache.has(id)) cifCache.set(id, loadCif(CIF_DIR, id)); return cifCache.get(id); };
const ctx = { loadCif: cifOf };
const usedCif = new Set();
const sourceOf = s => {
  const { meta } = cifOf(s.cif);
  const who = meta.authors.length ? (meta.authors[0].split(',')[0].trim() + (meta.authors.length > 1 ? ' 等' : '')) : '作者不詳';
  const t = typeof meta.temperature === 'number' ? `${meta.temperature} K` : '溫度未標明';
  return [s.label, `COD ${s.cif}`, `${who} ${meta.year ?? ''}`.trim(), t, s.sourceNote].filter(Boolean).join(' · ');
};
for (const s of structs.filter(x => x.cif)) {
  usedCif.add(s.cif);
  if (!fs.existsSync(path.join(CIF_DIR, s.cif + '.cif'))) { err(s.id, `找不到 CIF 檔 db/cif/${s.cif}.cif`); continue; }
  try {
    const { meta, atoms } = cifOf(s.cif);
    if (meta.cod !== s.cif) err(s.id, `CIF 裡的 COD 編號 ${meta.cod} 和檔名 ${s.cif} 不一致`);
    if (typeof meta.pressure === 'number' && meta.pressure > 200) err(s.id, `CIF 的壓力 ${meta.pressure} kPa 不是常壓`);
    if (typeof meta.temperature === 'number' && (meta.temperature < 270 || meta.temperature > 320)) err(s.id, `CIF 的溫度 ${meta.temperature} K 不是室溫`);
    if (!atoms.length) err(s.id, 'CIF 沒有原子');
  } catch (e) { err(s.id, 'CIF 解析失敗:' + e.message); }
}
for (const f of fs.readdirSync(CIF_DIR).filter(f => f.endsWith('.cif'))) if (!usedCif.has(f.replace('.cif', ''))) err(f, '這個 CIF 檔沒有被任何結構記錄使用(請刪除或補上記錄)');

// ---- 3) 展開 + 逐筆驗證 ----
const out = {};
const stats = {};
for (const s of structs) {
  let res;
  try { res = buildStructure(s, ctx); } catch (e) { err(s.id, '展開失敗:' + e.message); continue; }
  const { atoms, bonds } = res;
  stats[s.kind] = (stats[s.kind] || 0) + 1;
  const source = s.cif ? sourceOf(s) : s.source;
  if (!source) err(s.id, '缺少資料出處 source');
  if (/[<>]/.test(source || '')) err(s.id, '資料出處含有 < 或 >(來自 CIF 的外部文字不可含 HTML)');
  if (!atoms.length) { err(s.id, '沒有原子'); continue; }
  atoms.forEach((a, i) => {
    if (!BY_SYMBOL[a[0]]) err(s.id, `原子 ${i} 的元素 ${a[0]} 不存在`);
    if (a.slice(1).some(x => !Number.isFinite(x))) err(s.id, `原子 ${i} 座標不是數字`);
  });
  const seen = new Set();
  for (const b of bonds) {
    const [i, j] = b;
    if (!atoms[i] || !atoms[j] || i === j) { err(s.id, `鍵 ${i}-${j} 的原子不存在`); continue; }
    const k = Math.min(i, j) + ',' + Math.max(i, j);
    if (seen.has(k)) err(s.id, `鍵 ${k} 重複`); seen.add(k);
    const d = bondLength(atoms, i, j), ionic = b[3] === 'ionic';
    if (!ionic && (d < 0.65 || d > 3.2)) err(s.id, `共價鍵 ${atoms[i][0]}-${atoms[j][0]} 長度 ${d.toFixed(2)} Å 不合理`);
    if (ionic && (d < 1.5 || d > 5.0)) err(s.id, `離子鍵 ${atoms[i][0]}-${atoms[j][0]} 長度 ${d.toFixed(2)} Å 不合理`);
  }
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {   // 沒有鍵連著的原子不能擠在一起
    if (seen.has(i + ',' + j)) continue;
    const d = bondLength(atoms, i, j);
    if (d < 0.9) err(s.id, `原子 ${i}(${atoms[i][0]}) 與 ${j}(${atoms[j][0]}) 距離只有 ${d.toFixed(2)} Å`);
  }
  // 文獻值檢查
  for (const [A, B, lo, hi, only] of s.check?.bonds || []) {      // only='cov' 時只檢查共價鍵(不含氫鍵/離子接觸)
    const hit = bonds.filter(bd => { const [i, j] = bd; if (only === 'cov' && bd[3] === 'ionic') return false; return (atoms[i][0] === A && atoms[j][0] === B) || (atoms[i][0] === B && atoms[j][0] === A); });
    if (!hit.length) { err(s.id, `找不到 ${A}-${B} 鍵可檢查`); continue; }
    hit.forEach(([i, j]) => { const d = bondLength(atoms, i, j); if (d < lo || d > hi) err(s.id, `${A}-${B} 鍵長 ${d.toFixed(3)} Å 超出文獻範圍 ${lo}–${hi}`); });
  }
  for (const [A, C, B, lo, hi] of s.check?.angles || []) {
    let n = 0;
    atoms.forEach((c, ci) => {
      if (c[0] !== C) return;
      const nb = bonds.filter(b => b[0] === ci || b[1] === ci).map(b => (b[0] === ci ? b[1] : b[0]));
      for (let x = 0; x < nb.length; x++) for (let y = x + 1; y < nb.length; y++) {
        const a1 = atoms[nb[x]], a2 = atoms[nb[y]];
        if (!((a1[0] === A && a2[0] === B) || (a1[0] === B && a2[0] === A))) continue;
        n++; const g = angleAt(c, a1, a2); if (g < lo || g > hi) err(s.id, `${A}-${C}-${B} 鍵角 ${g.toFixed(1)}° 超出文獻範圍 ${lo}–${hi}`);
      }
    });
    if (!n) err(s.id, `找不到 ${A}-${C}-${B} 鍵角可檢查`);
  }
  // 化學式與原子數一致(只檢查「整個分子」類型的記錄)
  const rec = records.find(r => r.id === s.id);
  if (rec && ['explicit', 'zmat', 'crystalPick'].includes(s.kind) && /^[A-Za-z0-9]+$/.test(rec.formula)) {
    const want = {};
    for (const [, sym, n] of rec.formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) want[sym] = (want[sym] || 0) + (n ? +n : 1);
    const have = composition(atoms.map(a => a[0]));
    if (Object.keys(want).length !== Object.keys(have).length || Object.entries(want).some(([k, v]) => have[k] !== v)) {
      if (!rec.hidden && !/^(NaClp)$/.test(rec.id)) err(s.id, `化學式 ${rec.formula} 與原子數 ${JSON.stringify(have)} 不一致`);
    }
  }
  out[s.id] = { kind: s.kind, source, ...(s.note ? { note: s.note } : {}), ...(res.estimatedH ? { estimatedH: true } : {}), atoms, bonds };
}

// ---- 4) 實驗室配方:骨架簽章不可重複,而且要能比對回自己 ----
const sig = new Map();
for (const r of records.filter(r => r.lab)) {
  const st = out[r.id]; if (!st) continue;
  const syms = r.labPair ? r.labPair.atoms : st.atoms.map(a => a[0]);
  const bonds = r.labPair ? r.labPair.bonds : st.bonds;
  const k = skeletonSignature(syms, bonds);
  if (sig.has(k)) err(r.id, `實驗室骨架簽章與 ${sig.get(k)} 相同,會被誤認`); else sig.set(k, r.id);
}

// ---- 5) 輸出 ----
if (errors.length) {
  console.error(`\n結構資料庫驗證失敗(${errors.length} 項):\n` + errors.join('\n') + '\n');
  process.exit(1);
}
const genDir = path.join(root, 'src/data/generated');
fs.mkdirSync(genDir, { recursive: true });
const header = '// 自動產生,請勿手動修改。來源:src/data/db/*.json;產生器:scripts/build-db.mjs(npm run build-db)\n';
const body = header + `export const MOLECULE_RECORDS = ${JSON.stringify(records)};\nexport const STRUCTURES = ${JSON.stringify(out)};\n`;
fs.writeFileSync(path.join(genDir, 'db.js'), body);
console.log(`結構資料庫 OK:${records.length} 個分子、${structs.length} 筆結構`, stats, warns.length ? `\n${warns.join('\n')}` : '');
