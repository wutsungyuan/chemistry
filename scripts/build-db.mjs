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
import { ELEMENTS } from '../src/data/elements.js';
import { VISIBLE, HC_EV_NM } from './lib/asd.mjs';

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

// ---- 5) 元素光譜(src/data/db/spectra.json,來自 NIST ASD;由 scripts/fetch-spectra.mjs 產生)----
const SPEC = JSON.parse(fs.readFileSync(path.join(root, 'src/data/db/spectra.json'), 'utf8'));
{
  const m = SPEC.meta || {};
  for (const k of ['source', 'url', 'doi', 'retrieved']) if (!m[k]) err('spectra', `meta 缺少 ${k}(必須標示資料出處)`);
  if (!(m.calibration?.medianSpearman >= 0.7)) err('spectra', `估算強度的驗證相關度 ${m.calibration?.medianSpearman} 低於 0.7`);
  const syms = ELEMENTS.map(e => e.sym);
  for (const sym of syms) if (!SPEC.elements[sym]) err('spectra', `缺少元素 ${sym}`);
  for (const k of Object.keys(SPEC.elements)) if (!syms.includes(k)) err('spectra', `多出不存在的元素 ${k}`);
  let withLines = 0;
  for (const [sym, e] of Object.entries(SPEC.elements)) {
    if (!e.lines.length) continue;
    withLines++;
    if (typeof e.estimated !== 'boolean') err('spectra:' + sym, '缺少 estimated 旗標(強度是實測還是估算)');
    if (e.lines.length > 60) err('spectra:' + sym, `譜線太多(${e.lines.length})`);
    let prev = -1, max = 0;
    for (const [wl, I, ei, ek, li, lk] of e.lines) {
      if (!(wl >= VISIBLE[0] && wl <= VISIBLE[1])) err('spectra:' + sym, `波長 ${wl} 不在可見光範圍`);
      if (!(I > 0 && I <= 1)) err('spectra:' + sym, `強度 ${I} 必須在 (0,1]`);
      if (wl <= prev) err('spectra:' + sym, '譜線沒有依波長由小到大排序');
      // 能階(eV):上下都有或都沒有;上 > 下 ≥ 0;能量差必須等於光子能量 hc/λ(物理一致性檢查,誤差 < 2%)
      for (const lab of [li, lk]) if (lab != null && !/^(n=\d+|\d+[spdfg])$/.test(lab)) err('spectra:' + sym, `波長 ${wl} 的能階標籤 "${lab}" 格式不對`);
      if ((li != null || lk != null) && ei == null) err('spectra:' + sym, `波長 ${wl} 有標籤但沒有能階`);
      if (sym === 'H') for (const [lab, E] of [[li, ei], [lk, ek]]) {                  // 氫的 n 標籤必須符合玻爾公式 E = 13.6057(1 − 1/n²)
        const n = lab && /^n=(\d+)$/.exec(lab)?.[1];
        if (n && Math.abs(13.6057 * (1 - 1 / (n * n)) - E) > 0.02) err('spectra:H', `波長 ${wl} 的 ${lab} 能量 ${E} eV 與玻爾公式不符`);
      }
      if ((ei == null) !== (ek == null)) err('spectra:' + sym, `波長 ${wl} 只有一個能階`);
      else if (ei != null) {
        const pred = HC_EV_NM / wl;
        if (!(ei >= 0 && ek > ei)) err('spectra:' + sym, `波長 ${wl} 的能階順序不對(${ei} → ${ek})`);
        else if (Math.abs(ek - ei - pred) / pred > 0.02) err('spectra:' + sym, `波長 ${wl} 的能階差 ${(ek - ei).toFixed(3)} eV 與光子能量 ${pred.toFixed(3)} eV 不符`);
      }
      prev = wl; max = Math.max(max, I);
    }
    if (max !== 1) err('spectra:' + sym, `最強的線強度應為 1(目前 ${max})`);
  }
  if (withLines < 95) err('spectra', `只有 ${withLines} 個元素有光譜資料(預期 ≥ 95)`);
  warns.push(`光譜:${withLines}/${syms.length} 個元素有可見光譜線`);
}

// ---- 6) 輸出 ----
if (errors.length) {
  console.error(`\n結構資料庫驗證失敗(${errors.length} 項):\n` + errors.join('\n') + '\n');
  process.exit(1);
}
const genDir = path.join(root, 'src/data/generated');
fs.mkdirSync(genDir, { recursive: true });
const header = '// 自動產生,請勿手動修改。來源:src/data/db/*.json;產生器:scripts/build-db.mjs(npm run build-db)\n';
const body = header + `export const MOLECULE_RECORDS = ${JSON.stringify(records)};\nexport const STRUCTURES = ${JSON.stringify(out)};\n`;
fs.writeFileSync(path.join(genDir, 'db.js'), body);
// 光譜另存一個模組(只有元素頁會用到)
fs.writeFileSync(path.join(genDir, 'spectra.js'), header.replace('src/data/db/*.json', 'src/data/db/spectra.json') + `export const SPECTRA_META = ${JSON.stringify({ source: SPEC.meta.source, url: SPEC.meta.url, doi: SPEC.meta.doi, retrieved: SPEC.meta.retrieved, temperatureK: SPEC.meta.temperatureK })};\nexport const SPECTRA = ${JSON.stringify(SPEC.elements)};\n`);
console.log(`結構資料庫 OK:${records.length} 個分子、${structs.length} 筆結構`, stats, warns.length ? `\n${warns.join('\n')}` : '');
