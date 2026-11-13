// 物質的狀態與變化:純函式(不碰畫面),方便測試。資料在 db/matter.json(經 build-db 驗證後輸出到 generated/matter.js)。
import { SUBSTANCES, CHANGES, PLASMA_START_C, MATTER_META } from './generated/matter.js';

export { SUBSTANCES, CHANGES, MATTER_META };
export const ABS_ZERO = -273.15;                      // °C
export const substance = id => SUBSTANCES.find(s => s.id === id) ?? SUBSTANCES[0];

const BAND = 0.035;                                   // 滑桿上「正在變化」的那一小段寬度(整條的比例,分界點兩側各一半)

/** 這個物質由冷到熱經過哪些狀態:[{phase, lo, hi}](溫度 °C)。plasma=false 時,氣態只畫到「氣態最上緣」 */
export function phases(sub, plasma = false) {
  const top = sub.bp ?? sub.sub, bottom = sub.mp ?? ABS_ZERO;
  const gasTop = plasma ? PLASMA_START_C : top + Math.max(100, 0.5 * (top - bottom));
  const list = sub.sub != null
    ? [{ phase: 'solid', lo: ABS_ZERO, hi: sub.sub }, { phase: 'gas', lo: sub.sub, hi: gasTop }]
    : [{ phase: 'solid', lo: ABS_ZERO, hi: sub.mp }, { phase: 'liquid', lo: sub.mp, hi: sub.bp }, { phase: 'gas', lo: sub.bp, hi: gasTop }];
  if (plasma) list.push({ phase: 'plasma', lo: PLASMA_START_C, hi: PLASMA_START_C * 2 });
  return list;
}

/** 「由狀態 a 變到 b」叫什麼 + 吸熱還是放熱 */
export function changeKind(a, b) {
  const order = { solid: 0, liquid: 1, gas: 2, plasma: 3 };
  const up = order[b] > order[a];
  const name = `${a}>${b}`;
  const KIND = { 'solid>liquid': 'melt', 'liquid>solid': 'freeze', 'liquid>gas': 'vaporize', 'gas>liquid': 'condense', 'solid>gas': 'sublime', 'gas>solid': 'deposit', 'gas>plasma': 'ionize', 'plasma>gas': 'recombine' };
  return { kind: KIND[name], heat: up ? 'absorb' : 'release' };
}

/**
 * 滑桿位置 s(0~1)→ 狀態。每個狀態占一樣寬;分界點附近有一小段「正在變化」,溫度固定在分界溫度
 * (這就是加熱曲線的「平台」:變化的時候溫度不再上升,熱用來拆開分子之間的吸引力)。
 * 回傳 { tempC, phase, to, progress }:正在變化時 phase→to,progress 0~1;否則 to=null。
 */
export function stateAt(sub, s, plasma = false) {
  const ph = phases(sub, plasma), n = ph.length, w = 1 / n;
  s = Math.min(1, Math.max(0, s));
  for (let k = 0; k < n - 1; k++) {                                  // 在第 k 個分界的變化帶裡?
    const edge = (k + 1) * w;
    if (Math.abs(s - edge) <= BAND / 2) return { tempC: ph[k].hi, phase: ph[k].phase, to: ph[k + 1].phase, progress: (s - (edge - BAND / 2)) / BAND };
  }
  const i = Math.min(n - 1, Math.floor(s / w));
  const lo = i * w + (i > 0 ? BAND / 2 : 0), hi = (i + 1) * w - (i < n - 1 ? BAND / 2 : 0);
  const f = Math.min(1, Math.max(0, (s - lo) / (hi - lo)));
  return { tempC: ph[i].lo + f * (ph[i].hi - ph[i].lo), phase: ph[i].phase, to: null, progress: 0 };
}

/** 反過來:某個溫度(°C)在滑桿上的位置(超出範圍就夾在兩端);用來決定一開始停在室溫 */
export function positionOf(sub, tempC, plasma = false) {
  const ph = phases(sub, plasma), n = ph.length, w = 1 / n;
  const found = ph.findIndex(p => tempC <= p.hi), i = found < 0 ? n - 1 : found;
  const lo = i * w + (i > 0 ? BAND / 2 : 0), hi = (i + 1) * w - (i < n - 1 ? BAND / 2 : 0);
  const f = Math.min(1, Math.max(0, (tempC - ph[i].lo) / (ph[i].hi - ph[i].lo)));
  return lo + f * (hi - lo);
}

/** 1 克的物質從 fromC 加熱到目前狀態,需要吸收多少熱(J/g)。只有資料裡有比熱與潛熱的物質(水)才算;不是就回 null */
export const HEAT_VALID_MAX_C = 400;                // 比熱當成固定值,只在這個溫度以下合理(更熱時比熱會變,分子本身也會先被拆開)
export function heatNeeded(sub, st, fromC = -20) {
  const h = sub.heat;
  if (!h || sub.mp == null || st.tempC < fromC || st.tempC > HEAT_VALID_MAX_C) return null;
  const parts = [], add = (key, J) => { if (J > 0) parts.push({ key, J }); };
  const meltDone = st.phase === 'solid' ? (st.to === 'liquid' ? st.progress : 0) : 1;     // 熔化這一步完成了幾成
  const boilDone = st.phase === 'gas' ? 1 : st.phase === 'liquid' && st.to === 'gas' ? st.progress : 0;
  add('solid', h.cpSolid * Math.max(0, Math.min(sub.mp, st.tempC) - fromC));
  add('fusion', h.latentFusion * meltDone);
  add('liquid', h.cpLiquid * Math.max(0, Math.min(sub.bp, st.tempC) - sub.mp) * (st.phase === 'solid' ? 0 : 1));
  add('vaporization', h.latentVaporization * boilDone);
  add('gas', h.cpGas * Math.max(0, st.tempC - sub.bp) * (st.phase === 'gas' ? 1 : 0));
  return { total: parts.reduce((x, q) => x + q.J, 0), parts };
}

// ---------- 「物理變化還是化學變化?」----------
const LEVEL_RANK = { kid: 0, teen: 1, high: 2 };
/** 這個階段的題庫:國小只有國小題;國中加上國中題;高中全部 */
export const poolFor = level => CHANGES.filter(c => LEVEL_RANK[c.level] <= LEVEL_RANK[level]);
/** 出一輪題:盡量讓兩種答案都有(不會全是同一種),順序隨機 */
export function pickRound(level, n = 8, rand = Math.random) {
  const shuffle = a => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const pool = poolFor(level);
  // 這個階段自己的題目優先(最難的那一層多一點),其餘從較低階段補
  const own = shuffle(pool.filter(c => c.level === level)), rest = shuffle(pool.filter(c => c.level !== level));
  const phys = [], chem = [];
  for (const c of [...own, ...rest]) (c.answer === 'physical' ? phys : chem).push(c);
  const half = Math.floor(n / 2), picked = [...phys.slice(0, half), ...chem.slice(0, n - half)];
  return shuffle(picked.length >= n ? picked : [...picked, ...[...phys.slice(half), ...chem.slice(n - half)].slice(0, n - picked.length)]);
}
