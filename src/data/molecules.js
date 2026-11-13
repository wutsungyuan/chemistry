// 分子資料(執行時):文字、實驗室旗標來自 db/molecules.json,結構(座標與鍵)來自 db/structures.json。
// 兩者在建置時由 scripts/build-db.mjs 展開、驗證後,寫成 generated/db.js(自動產生,請勿手改)。
// 要新增或修正分子:改 src/data/db/*.json,再執行 npm run build-db(npm run dev / build 會自動執行)。
import { MOLECULE_RECORDS, STRUCTURES } from './generated/db.js';
import { skeletonSignature, composition } from './graph.js';

export { skeletonSignature, composition };

/** atoms [符號, x, y, z](單位≈埃),bonds [i, j, 鍵級, 'ionic'?]
 *  lab: true → 可在「分子實驗室」組出來;labPair → 以此圖形(骨架)比對
 *  source: 結構資料出處;schem: 簡化示意/晶體小塊的說明;crystal: 這是從晶體取出的一小塊 */
export const MOLECULES = MOLECULE_RECORDS.map(r => {
  const s = STRUCTURES[r.id];
  return {
    ...r, atoms: s.atoms, bonds: s.bonds, source: s.source, sourceEn: s.sourceEn,
    ...(s.note ? { schem: s.note } : {}),
    ...(s.kind === 'crystal' ? { crystal: true } : {}),
  };
});

export const MOL = Object.fromEntries(MOLECULES.map(m => [m.id, m]));
export const GALLERY = MOLECULES.filter(m => !m.hidden);
export const LAB_TARGETS = MOLECULES.filter(m => m.lab);

const SIGS = new Map();
LAB_TARGETS.forEach(m => {
  const syms = m.labPair ? m.labPair.atoms : m.atoms.map(a => a[0]);
  const bonds = m.labPair ? m.labPair.bonds : m.bonds;
  SIGS.set(skeletonSignature(syms, bonds), m);
});
export function matchMolecule(syms, bonds) { return SIGS.get(skeletonSignature(syms, bonds)) || null; }

export const VALENCE = { H: 1, C: 4, N: 3, O: 2, Na: 1, Cl: 1, F: 1, S: 2, Ca: 2 };
