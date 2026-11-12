// 光譜與 3D 原子的聯動:選一條亮線,最外層電子在 3D 原子裡示範那次躍遷。
// 這個檔案只算「軌道半徑」與「動畫時間軸」(純函式,方便測試);畫面由 AtomView 負責。
//
// 要誠實的簡化:真實的電子沒有固定軌道(是機率雲),玻爾圈只是示意。這裡的半徑是「示意用」:
//   能階越高(第 n 層越大、子層 s<p<d<f 越大),電子離原子核平均越遠 —— 這個趨勢是真的,數值是壓縮過的。
import { MathUtils } from 'three';

const L_INDEX = { s: 0, p: 1, d: 2, f: 3, g: 4 };

/** '3p' → {n:3, l:1};'n=2' → {n:2, l:0};看不懂 → null */
export function parseLabel(label) {
  const m = /^(?:n=(\d+)|(\d+)([spdfg]))$/.exec(String(label ?? ''));
  return m ? { n: +(m[1] ?? m[2]), l: m[3] ? L_INDEX[m[3]] : 0 } : null;
}

export const ORBIT = { nSpan: 2.2, nCurve: 1.2, perL: 0.28, perEV: 0.35, maxExtra: 2.4, minGap: 0.3 };

/**
 * 電子在某個能階時的軌道半徑。
 * - 有標籤(3s、3p、n=2…):依「第幾層」與「子層」;層數越大越外面,但越來越擠(能階會收斂)
 * - 沒標籤:依能量(eV,從基態算起),越高越外面
 * baseR = 最外層(基態)軌道半徑;nGround = 基態最外層是第幾層
 */
export function orbitRadius({ label, E }, { baseR, nGround }) {
  const q = parseLabel(label);
  let extra;
  if (q) extra = (q.n > nGround ? ORBIT.nSpan * (1 - Math.pow(nGround / q.n, ORBIT.nCurve)) : 0) + q.l * ORBIT.perL;
  else extra = E > 0 ? 0.4 + ORBIT.perEV * E : 0;
  return baseR + MathUtils.clamp(extra, 0, ORBIT.maxExtra);
}

/** 一條譜線 [波長, 強度, 下能階eV, 上能階eV, 下標籤, 上標籤] → 兩個軌道半徑(上一定比下外面,至少差 minGap) */
export function jumpPlan(line, ctx) {
  const [wl, , lo, hi, ll, hl] = line;
  if (lo == null || hi == null) return null;
  const rLo = orbitRadius({ label: ll, E: lo }, ctx);
  const rHi = Math.max(orbitRadius({ label: hl, E: hi }, ctx), rLo + ORBIT.minGap);
  return { wl, rLo, rHi, labelLo: ll ?? null, labelHi: hl ?? null };
}

/**
 * 動畫時間軸(循環 CYCLE 秒)。依量子力學:電子不會經過兩層「中間」的位置,
 * 躍遷時它是「上層與下層的混合」—— 上層的成分(機率)逐漸減少、下層逐漸增加。所以這裡不算半徑,只算兩層各自的「濃度」。
 *   發光:停在上層 → 上層淡出、下層淡入 → 光子往外飛;吸收:光子往內飛 → 上層淡入、下層淡出 → 停住
 * 真實的躍遷約幾奈秒(鈉的 3p 壽命約 16 奈秒),這裡放慢到約 1 秒,大約一億倍。
 */
export const CYCLE = 4.2;
export const RESET = 0.5;                                              // 循環結尾,用 0.5 秒平順地回到起點
export const TIMELINE = { emit: { fade: [0.6, 1.8], photon: [1.8, 3.3] }, absorb: { photon: [0, 1.2], fade: [1.2, 2.4] } };
export function jumpState(mode, t) {
  const ph = ((t % CYCLE) + CYCLE) % CYCLE, tl = TIMELINE[mode], e = MathUtils.smoothstep;
  const k = e(ph, tl.fade[0], tl.fade[1]);                                // 0 → 1:躍遷進行到哪裡
  let pUp = mode === 'emit' ? 1 - k : k;                                  // 上層的濃度(在上層的機率)
  const reset = e(ph, CYCLE - RESET, CYCLE);                              // 結尾平順回到起點(發光:回到上層;吸收:回到下層)
  pUp = mode === 'emit' ? Math.max(pUp, reset) : Math.min(pUp, 1 - reset);
  const [p0, p1] = tl.photon;
  return { pUp, pLow: 1 - pUp, photon: ph >= p0 && ph < p1 ? { u: (ph - p0) / (p1 - p0), out: mode === 'emit' } : null };
}
