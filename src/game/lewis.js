// 路易斯結構(電子點式):每個原子的孤對電子、未成對電子、形式電荷,以及 2D 排版。純函式,畫面由 ui/lewisView.js 負責。
// 電子怎麼分:
//   1. 鍵:每個鍵共用 2×鍵級 個電子(鍵級 1/2/3)。
//   2. 非鍵結電子的總數 = 全部價電子 − 2×鍵級總和(與 game/bondfacts.js 的「共用電子對/孤對電子」一致)。
//   3. 先讓每個非氫原子補滿八隅體(氫是二隅體),不夠或多出來時再調整:
//      多的電子(超過八隅體,如 SO₂ 的 S)給電負度最低的原子;不夠的(奇數電子,如 NO₂)從電負度最低的原子拿走,留下未成對電子。
//   4. 形式電荷 = 價電子 − 非鍵結電子 − 鍵級總和(例:O₃ 的中心 O 是 +1、CO 的 C 是 −1、O 是 +1)。
import { bondFacts, valenceElectrons } from './bondfacts.js';

const EN = { H: 2.2, C: 2.55, N: 3.04, O: 3.44, F: 3.98, S: 2.58, Cl: 3.16, P: 2.19, Br: 2.96, I: 2.66 };
const en = s => EN[s] ?? 2.5;

/** 3×3 對稱矩陣的前兩個主軸(冪次法 + 去除),用來把 3D 座標壓成 2D */
function principalAxes(pts) {
  const n = pts.length, c = [0, 1, 2].map(k => pts.reduce((s, p) => s + p[k], 0) / n);
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pts) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += (p[i] - c[i]) * (p[j] - c[j]);
  const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
  const mul = (M, v) => M.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  const top = (M, start) => { let v = norm(start); for (let i = 0; i < 80; i++) v = norm(mul(M, v)); return v; };
  const v1 = top(C, [1, 0.37, 0.11]);
  const l1 = mul(C, v1).reduce((s, x, i) => s + x * v1[i], 0);
  const D = C.map((r, i) => r.map((x, j) => x - l1 * v1[i] * v1[j]));
  let v2 = top(D, [0.13, 1, 0.41]);
  if (Math.hypot(...mul(D, v2)) < 1e-9) {                                   // 線形分子:第二軸隨便取一個與第一軸垂直的方向
    v2 = norm([-v1[1], v1[0], 0]); if (Math.hypot(...v2) < 1e-9) v2 = [0, 1, 0];
  }
  return { c, v1, v2 };
}

/** 2D 排版:3D 座標投影到主平面,縮放成鍵長 ≈ 1,再把靠太近的原子推開(例如甲烷的四個 H) */
export function layout2D(atoms, bonds) {
  const pts = atoms.map(a => [a[1], a[2], a[3]]);
  const { c, v1, v2 } = principalAxes(pts);
  let P = pts.map(p => { const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; return [d[0] * v1[0] + d[1] * v1[1] + d[2] * v1[2], d[0] * v2[0] + d[1] * v2[1] + d[2] * v2[2]]; });
  const bl = bonds.length ? bonds.reduce((s, [i, j]) => s + Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]), 0) / bonds.length : 1;
  const k = bl > 1e-6 ? 1 / bl : 1;
  P = P.map(p => [p[0] * k, p[1] * k]);
  for (let it = 0; it < 120; it++) {
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      let dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1], d = Math.hypot(dx, dy);
      if (d < 1e-6) { dx = 0.01 * (j - i); dy = 0.01; d = Math.hypot(dx, dy); }
      const bonded = bonds.some(b => (b[0] === i && b[1] === j) || (b[0] === j && b[1] === i));
      let f = 0;
      if (bonded) f = (d - 1) * 0.15;                                      // 鍵:拉向長度 1(正值 = 互相靠近)
      else if (d < 0.95) f = -(0.95 - d) * 0.3;                           // 沒鍵但太近:推開
      if (f) { const ux = dx / d, uy = dy / d; P[i][0] += ux * f; P[i][1] += uy * f; P[j][0] -= ux * f; P[j][1] -= uy * f; }
    }
  }
  return P;
}

/**
 * @returns null(不是共價分子/太大/算不出來)或
 *   { atoms:[{sym,x,y,lone,unpaired,charge}], bonds:[{a,b,order}] }
 */
export function lewisStructure(m, { maxAtoms = 14 } = {}) {
  if (!m || m.atoms.length > maxAtoms || !bondFacts(m)) return null;
  const n = m.atoms.length, bs = new Array(n).fill(0), bonds = m.bonds.map(([a, b, o = 1]) => ({ a, b, order: o }));
  bonds.forEach(({ a, b, order }) => { bs[a] += order; bs[b] += order; });
  const V = m.atoms.map(a => valenceElectrons(a[0])), sym = m.atoms.map(a => a[0]);
  const budget = V.reduce((s, x) => s + x, 0) - 2 * bonds.reduce((s, b) => s + b.order, 0);
  const nb = sym.map((s, i) => (s === 'H' ? 0 : Math.max(0, 8 - 2 * bs[i])));
  let diff = budget - nb.reduce((s, x) => s + x, 0);
  const lowEN = pred => sym.map((s, i) => i).filter(i => sym[i] !== 'H' && pred(i)).sort((x, y) => en(sym[x]) - en(sym[y]) || nb[y] - nb[x])[0];
  while (diff < 0) { const i = lowEN(j => nb[j] > 0); if (i === undefined) return null; nb[i]--; diff++; }
  while (diff > 0) { const i = lowEN(() => true); if (i === undefined) return null; const add = diff >= 2 ? 2 : 1; nb[i] += add; diff -= add; }
  const P = layout2D(m.atoms, m.bonds);
  return {
    atoms: sym.map((s, i) => ({ sym: s, x: P[i][0], y: P[i][1], lone: Math.floor(nb[i] / 2), unpaired: nb[i] % 2, charge: V[i] - nb[i] - bs[i] })),
    bonds,
  };
}
