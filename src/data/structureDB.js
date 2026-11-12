// 結構資料庫:把 db/structures.json 的每筆記錄(依 kind)轉成 3D 的 atoms / bonds。只在建置時執行(scripts/build-db.mjs)。
// kind:
//   explicit    座標直接列出
//   zmat        用鍵長/鍵角/二面角(Z-matrix)計算座標
//   crystal     原始 CIF(db/cif/<COD 編號>.cif)→ crystcif-parse 解析並展開 → 取中心原子周圍一小塊(金屬、化合物都用這個)
//   crystalPick 由 CIF 晶體取出一個小單元(保留指定的原子順序,給實驗室任務用)
//   rocksalt    CIF 的岩鹽結構,畫成 2×2×2 的小立方(最近陰陽離子距離 = 晶格常數 / 2)
// 向量運算一律用 three.js(見 geom.js);CIF 解析用 crystcif-parse(見 scripts/lib/cif.mjs)。
import { Vector3, MathUtils } from 'three';
import { buildCrystal, pickUnit } from './crystalBuilder.js';
import { centered, bondLength } from './geom.js';

// ---------- Z-matrix ----------
/** rows: [符號, 鍵結原子c, 鍵長, 角度原子b, 鍵角, 二面角原子a, 二面角];前三個原子可省略後面的欄位 */
export function zmat(rows) {
  const P = [];
  rows.forEach(([, c, len, b, ang, a, dih], i) => {
    if (i === 0) return P.push(new Vector3());
    if (i === 1) return P.push(new Vector3(len, 0, 0));
    const C = P[c], B = P[b], t = MathUtils.degToRad(ang);
    if (a === undefined) {                                   // 第 3 個原子:放在 xy 平面
      const u = B.clone().sub(C).normalize(), n = new Vector3(0, 0, 1).cross(u).normalize();
      return P.push(C.clone().addScaledVector(u, len * Math.cos(t)).addScaledVector(n, len * Math.sin(t)));
    }
    const d = MathUtils.degToRad(dih);
    const bc = C.clone().sub(B).normalize();
    const n = B.clone().sub(P[a]).cross(bc).normalize(), m = n.clone().cross(bc);
    return P.push(C.clone().addScaledVector(bc, -len * Math.cos(t)).addScaledVector(m, len * Math.sin(t) * Math.cos(d)).addScaledVector(n, len * Math.sin(t) * Math.sin(d)));
  });
  return centered(rows.map((r, i) => [r[0], P[i].x, P[i].y, P[i].z]));
}

/** 以座標找最近鄰(距離 ≤ 最短距離 × tol)連成淡藍細線 */
function nearestBonds(atoms, tol) {
  let dmin = Infinity;
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) dmin = Math.min(dmin, bondLength(atoms, i, j));
  const b = [];
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) if (bondLength(atoms, i, j) <= dmin * tol) b.push([i, j, 1, 'ionic']);
  return b;
}

/** 岩鹽結構的 2×2×2 小立方:前後左右上下交錯排列陽離子與陰離子 */
function rocksalt(cif) {
  const types = [...new Set(cif.atoms.map(a => a.type))];
  if (types.length !== 2) throw new Error('rocksalt 需要剛好兩種元素');
  const d = cif.cell[0].length() / 2;                         // 最近鄰 = a / 2
  const atoms = [];
  for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++)
    atoms.push([types[(x + y + z) % 2], (x - 0.5) * d, (y - 0.5) * d, (z - 0.5) * d]);
  const placed = centered(atoms);
  return { atoms: placed, bonds: nearestBonds(placed, 1.05) };
}

/** 把部分原子換成別的元素(合金示意):{Zn: 4} = 換 4 顆;位置平均分散、結果固定;中心原子不換 */
function swapAtoms(atoms, swap) {
  const out = atoms.map(a => [...a]), used = new Set([0]);
  for (const [el, n] of Object.entries(swap)) {
    for (let k = 0; k < n; k++) {
      let i = 1 + Math.floor(((k + 0.5) * (atoms.length - 1)) / n);
      while (used.has(i)) i = (i % (atoms.length - 1)) + 1;
      used.add(i); out[i][0] = el;
    }
  }
  return out;
}

/** 依記錄種類,產生 {atoms, bonds}。ctx.loadCif(id) 由建置腳本提供(讀 CIF 檔) */
export function buildStructure(rec, ctx) {
  switch (rec.kind) {
    case 'explicit': return { atoms: rec.atoms, bonds: rec.bonds };
    case 'zmat': return { atoms: zmat(rec.rows), bonds: rec.bonds };
    case 'rocksalt': return rocksalt(ctx.loadCif(rec.cif));
    case 'crystal': {
      const r = buildCrystal(rec, ctx.loadCif(rec.cif));
      return { atoms: rec.swap ? swapAtoms(r.atoms, rec.swap) : r.atoms, bonds: r.bonds, estimatedH: r.estimatedH };
    }
    case 'crystalPick': {
      const cif = ctx.loadCif(rec.cif), res = buildCrystal(rec, cif);
      const atoms = pickUnit(res, rec.pick);
      if (!atoms) throw new Error('pickUnit failed: ' + rec.id);
      return { atoms, bonds: rec.bonds, estimatedH: res.estimatedH };
    }
    default: throw new Error('unknown kind ' + rec.kind);
  }
}
