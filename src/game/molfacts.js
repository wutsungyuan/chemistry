// 分子的數據:分子量(莫耳質量)、鍵的種類與鍵長、鍵角。全部由結構座標與元素原子量算出來,不另外手寫。
// 只算「真實分子」:晶體的一小塊、簡化示意、離子化合物(有 'ionic' 鍵)不算鍵長與鍵角(那樣會誤導)。
import { BY_SYMBOL } from '../data/elements.js';

const SIGN = { 1: '–', 2: '=', 3: '≡' };
const ORDER = (a, b) => (a === b ? 0 : a === 'C' ? -1 : b === 'C' ? 1 : a === 'H' ? 1 : b === 'H' ? -1 : a < b ? -1 : 1);   // C 在前、H 在後,其餘依字母
const pair = (a, b) => (ORDER(a, b) <= 0 ? [a, b] : [b, a]);
const dist = (p, q) => Math.hypot(p[1] - q[1], p[2] - q[2], p[3] - q[3]);
const angle = (c, a, b) => {
  const u = [a[1] - c[1], a[2] - c[2], a[3] - c[3]], v = [b[1] - c[1], b[2] - c[2], b[3] - c[3]];
  const d = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v));
  return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
};

/** 這個分子能不能算鍵長、鍵角(真實的獨立分子、沒有離子鍵、不是簡化示意) */
export const hasGeometry = m => !!m && !m.crystal && !m.schem && !m.display && m.atoms.length >= 2 && m.atoms.length <= 30 && !m.bonds.some(b => b[3] === 'ionic');

/** 分子量(g/mol):各原子原子量加起來(只用在獨立的分子;晶體畫的是一小塊,不能這樣加) */
export const molarMass = m => m.atoms.reduce((s, a) => s + (BY_SYMBOL[a[0]]?.mass ?? 0), 0);

/** 由化學式算式量,例:'Fe2O3' → 159.69;有括號等看不懂的寫法回傳 null */
export function formulaMass(f) {
  if (!/^([A-Z][a-z]?\d*)+$/.test(String(f))) return null;
  let s = 0;
  for (const [, sym, n] of String(f).matchAll(/([A-Z][a-z]?)(\d*)/g)) { if (!BY_SYMBOL[sym]) return null; s += BY_SYMBOL[sym].mass * (n ? +n : 1); }
  return s;
}

/**
 * @returns { mass, kind, bonds:[{a,b,order,count,length}], angles:[{a,center,b,count,deg}] }
 * kind:'molecular'(獨立分子,分子量)或 'formula'(晶體、離子化合物,式量);mass 算不出來時為 null。
 * bonds 依「元素組合+鍵級」分組(例如水:O–H ×2),length 是平均鍵長(Å);angles 依「兩端元素+中心元素」分組,deg 是平均鍵角。
 * 沒有幾何數據時 bonds/angles 為空陣列。
 */
export function molFacts(m) {
  if (!m?.atoms?.length) return null;
  const molecular = !m.crystal && !m.bonds.some(b => b[3] === 'ionic');
  const out = { mass: molecular ? molarMass(m) : formulaMass(m.formula), kind: molecular ? 'molecular' : 'formula', bonds: [], angles: [] };
  if (!hasGeometry(m)) return out;
  const groups = new Map();
  for (const [i, j, o = 1] of m.bonds) {
    const [a, b] = pair(m.atoms[i][0], m.atoms[j][0]), k = `${a}|${b}|${o}`, g = groups.get(k) || { a, b, order: o, count: 0, sum: 0 };
    g.count++; g.sum += dist(m.atoms[i], m.atoms[j]); groups.set(k, g);
  }
  out.bonds = [...groups.values()].map(g => ({ a: g.a, b: g.b, order: g.order, sign: SIGN[g.order] ?? '–', count: g.count, length: g.sum / g.count }))
    .sort((x, y) => y.count - x.count || (x.a + x.b < y.a + y.b ? -1 : 1));
  const nbr = m.atoms.map(() => []); m.bonds.forEach(([i, j]) => { nbr[i].push(j); nbr[j].push(i); });
  const ag = new Map();
  nbr.forEach((ns, c) => {
    for (let x = 0; x < ns.length; x++) for (let y = x + 1; y < ns.length; y++) {
      const [a, b] = pair(m.atoms[ns[x]][0], m.atoms[ns[y]][0]), k = `${a}|${m.atoms[c][0]}|${b}`, g = ag.get(k) || { a, center: m.atoms[c][0], b, count: 0, sum: 0 };
      g.count++; g.sum += angle(m.atoms[c], m.atoms[ns[x]], m.atoms[ns[y]]); ag.set(k, g);
    }
  });
  out.angles = [...ag.values()].map(g => ({ a: g.a, center: g.center, b: g.b, count: g.count, deg: g.sum / g.count }))
    .sort((x, y) => y.count - x.count || (x.a + x.center + x.b < y.a + y.center + y.b ? -1 : 1));
  return out;
}

/** 說明與用途依階段:factTeen / factHigh(useTeen / useHigh)優先,沒有就用 fact / use(國小說法);高中版沒寫時退回國中版 */
const pick = (m, level, base) => (level === 'high' && (m[base + 'High'] || m[base + 'Teen'])) || (level === 'teen' && m[base + 'Teen']) || m[base];
export const factFor = (m, level) => pick(m, level, 'fact');
export const useFor = (m, level) => pick(m, level, 'use');
