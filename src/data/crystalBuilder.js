// 晶體小塊的「長出器」:輸入已經由 crystcif-parse 解析並套用對稱操作的晶胞(scripts/lib/cif.mjs 的 loadCif),
// 以某個原子為中心、沿「鍵規則」往外長出一小塊晶體。CIF 解析與對稱操作展開都交給套件,這裡只做幾何與挑選。
// 向量運算一律用 three.js(見 geom.js)。
import { centered } from './geom.js';

/**
 * rec.rules: [[元素A, 元素B, 最大距離Å | 'nn', 'cov'|'ion', 是否往外延伸(預設 true), 受體標籤的正規表示式, 'fwd'(只從 A 端往外長)]]
 *   'nn' = 該元素對的最近鄰距離 × 1.05(金屬、岩鹽用,不必手填數字);'nn:1.1' 可自訂倍率(例如鋅有兩層鄰居)
 * rec.center: 中心原子的 CIF 標籤;rec.depth: 往外幾層;rec.centerOnly: 這些元素只有中心那一顆;rec.cap: 某元素最多收幾顆
 * rec.finish: {complete:[補齊整個基團的元素], drop:'標籤正規表示式'};rec.placeH: CIF 沒有氫座標時,依氫鍵方向推算
 * cif: loadCif 的結果 {cell: [Vector3×3], atoms: [{label,type,pos}]}
 */
export function buildCrystal(rec, cif) {
  const R = rec.range ?? 2, [a1, a2, a3] = cif.cell, centerLabel = rec.center ?? cif.atoms[0].label;   // 沒指定中心就用 CIF 的第一個原子
  const all = [];
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) for (let k = -R; k <= R; k++) {
    const t = a1.clone().multiplyScalar(i).addScaledVector(a2, j).addScaledVector(a3, k);
    for (const a of cif.atoms) all.push({ label: a.label, type: a.type, tile: [i, j, k], pos: a.pos.clone().add(t) });
  }
  // 資料裡沒有氫的位置時,依「氫鍵」推算:沿著供氫的氧指向最近的受氫氧原子
  for (const h of rec.placeH || []) {
    for (const d of all.filter(a => a.label === h.label)) {
      let best = null, bd = Infinity;
      for (const o of all) {
        if (o === d || o.type !== h.to) continue;
        const dd = o.pos.distanceTo(d.pos);
        if (dd > (h.minD ?? 2.4) && dd < bd) { bd = dd; best = o; }
      }
      if (best && bd < (h.maxD ?? 3)) all.push({ label: 'H*', type: 'H', tile: d.tile, estimated: true, pos: d.pos.clone().addScaledVector(best.pos.clone().sub(d.pos).normalize(), h.len) });
    }
  }
  // 'nn':用資料本身算出最近鄰距離
  const rules = rec.rules.map(r => {
    if (!String(r[2]).startsWith('nn')) return r;
    const tol = parseFloat(String(r[2]).split(':')[1] ?? 1.05);      // 'nn' = 最近鄰×1.05;'nn:1.1' = 最近鄰×1.1
    let dmin = Infinity;
    for (const a of cif.atoms) for (const b of all) if (a.type === r[0] && b.type === r[1]) { const d = a.pos.distanceTo(b.pos); if (d > 0.4 && d < dmin) dmin = d; }
    return [r[0], r[1], dmin * tol, ...r.slice(3)];
  });
  // 逐條檢查規則(同一對元素可以有「共價鍵」和「氫鍵」等多條規則)
  const linked = (a, b, growOnly) => {
    const d = a.pos.distanceTo(b.pos);
    if (d <= 0.4) return null;
    for (const r of rules) {
      if (!((r[0] === a.type && r[1] === b.type) || (r[0] === b.type && r[1] === a.type))) continue;
      if (growOnly && (r[4] === false || (r[6] === 'fwd' && a.type !== r[0]))) continue;
      if (r[5] && !new RegExp(r[5]).test((a.type === r[1] ? a : b).label)) continue;
      if (d <= r[2]) return r;
    }
    return null;
  };
  // 中心原子:同標籤、在原點那一格裡最靠近晶胞中央的,這樣往四面長都不會被生成範圍截掉
  const mid = a1.clone().add(a2).add(a3).multiplyScalar(0.5);
  const cands = all.filter(a => a.label === centerLabel && a.tile.every(t => t === 0)).sort((p, q) => p.pos.distanceTo(mid) - q.pos.distanceTo(mid));
  if (!cands.length) throw new Error(`CIF 裡找不到標籤 ${centerLabel}`);
  const center = cands[0];
  const picked = [center], inSet = new Set(picked), count = { [center.type]: 1 };
  let frontier = [center];
  for (let d = 0; d < (rec.depth ?? 1); d++) {
    const cand = all.filter(a => !inSet.has(a) && !(rec.centerOnly || []).includes(a.type) && frontier.some(f => linked(f, a, true)))
      .sort((p, q) => p.pos.distanceTo(center.pos) - q.pos.distanceTo(center.pos));
    const next = [];
    for (const a of cand) {
      if (rec.cap?.[a.type] !== undefined && (count[a.type] || 0) >= rec.cap[a.type]) continue;
      inSet.add(a); picked.push(a); next.push(a); count[a.type] = (count[a.type] || 0) + 1;
    }
    frontier = next;
  }
  // 收尾:把「整個基團」補完整(例如硫酸根要有 4 個氧),並丟掉沒有歸屬的基團原子
  if (rec.finish) {
    const { complete = [], drop } = rec.finish;
    const covLinked = (a, b) => linked(a, b, false)?.[3] === 'cov';
    for (const a of [...picked]) if (complete.includes(a.type)) for (const o of all) if (!inSet.has(o) && covLinked(a, o)) { inSet.add(o); picked.push(o); }
    if (drop) {
      const re = new RegExp(drop);
      for (let i = picked.length - 1; i > 0; i--) if (re.test(picked[i].label) && !picked.some(o => complete.includes(o.type) && covLinked(o, picked[i]))) picked.splice(i, 1);
    }
  }
  const bonds = [];
  for (let i = 0; i < picked.length; i++) for (let j = i + 1; j < picked.length; j++) {
    const r = linked(picked[i], picked[j], false);
    if (r) bonds.push(r[3] === 'ion' ? [i, j, 1, 'ionic'] : [i, j, 1]);
  }
  const atoms = picked.map(a => [a.type, a.pos.x, a.pos.y, a.pos.z]);
  return { atoms: centered(atoms), bonds, picked, estimatedH: picked.some(a => a.estimated) };
}

/** 從展開結果中,依指定順序挑出一個小單元(實驗室的小蘇打:保留原本的原子順序與連接) */
export function pickUnit(res, pick) {
  const chosen = [];
  for (const sel of pick) {
    const base = (sel.near !== undefined ? chosen[sel.near] : res.picked[0]).pos;
    let best = null, bd = Infinity;
    for (const a of res.picked) {
      if (chosen.includes(a) || (sel.label && a.label !== sel.label) || (sel.type && a.type !== sel.type)) continue;
      const d = a.pos.distanceTo(base); if (d < bd) { bd = d; best = a; }
    }
    if (!best) return null;
    chosen.push(best);
  }
  return centered(chosen.map(a => [a.type, a.pos.x, a.pos.y, a.pos.z]));
}

