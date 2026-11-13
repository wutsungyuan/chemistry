// 驗證「核種」資料(src/data/db/nuclides.json,來自 IAEA LiveChart;由 scripts/fetch-nuclides.mjs 產生)。
import { ELEMENTS } from '../../src/data/elements.js';

export function validateNuclides(NUC, { err, warns }) {
  const m = NUC.meta || {};
  for (const k of ['source', 'url', 'retrieved', 'extraction']) if (!m[k]) err('nuclides', `meta 缺少 ${k}(必須標示資料出處)`);
  let total = 0;
  for (const { z, sym } of ELEMENTS) {
    const l = NUC.nuclides[z];
    if (!l?.length) { err('nuclides', `缺少元素 ${sym}(Z=${z}) 的核種`); continue; }
    total += l.length;
    let prev = -1, ab = 0;
    for (const [n, hl, a, dec, pct, mass] of l) {
      if (!(Number.isInteger(n) && n > prev)) err('nuclides:' + sym, `中子數 ${n} 沒有由小到大排序`);
      if (!(hl >= 0)) err('nuclides:' + sym, `${z + n} 的半衰期 ${hl} 不合理`);
      if (hl === 0 && dec) err('nuclides:' + sym, `${z + n} 穩定卻有衰變方式`);
      if (hl > 0 && !dec) warns.push(`核種 ${sym}-${z + n} 沒有衰變方式資料`);
      if (a != null) { if (!(a > 0 && a <= 100)) err('nuclides:' + sym, `${z + n} 的豐度 ${a} 不合理`); ab += a; }
      if (mass != null && Math.abs(mass - (z + n)) > 0.3 * Math.max(1, (z + n) / 10) + 1) err('nuclides:' + sym, `${z + n} 的原子質量 ${mass} u 與質量數差太多`);
      prev = n;
    }
    if (ab && Math.abs(ab - 100) > 0.5) err('nuclides:' + sym, `天然豐度總和 ${ab.toFixed(3)}% 不等於 100%`);
  }
  // 錨點:幾個大家熟知的值,資料被改壞時會立刻發現
  const find = (z, a) => NUC.nuclides[z]?.find(x => x[0] === a - z);
  const chk = (c, msg) => { if (!c) err('nuclides', '錨點不符:' + msg); };
  chk(find(1, 1)?.[1] === 0, 'H-1 應穩定'); chk(find(6, 12)?.[5] === 12 && find(6, 12)?.[1] === 0, 'C-12 質量應為 12 u(定義)且穩定');
  const c14 = find(6, 14)?.[1]; chk(c14 > 1.7e11 && c14 < 1.9e11 && find(6, 14)?.[3] === 'B-', 'C-14 半衰期約 5700 年,β⁻ 衰變');
  const c11 = find(6, 11)?.[1]; chk(c11 > 1100 && c11 < 1300 && find(6, 11)?.[3] === 'B+', 'C-11 半衰期約 20 分鐘,β⁺ 衰變');
  const u238 = find(92, 238)?.[1]; chk(u238 > 1.3e17 && u238 < 1.5e17 && find(92, 238)?.[3] === 'A', 'U-238 半衰期約 45 億年,α 衰變');
  chk(Math.abs(find(17, 35)?.[2] - 75.8) < 0.5 && Math.abs(find(17, 37)?.[2] - 24.2) < 0.5, 'Cl-35/37 天然豐度約 75.8% / 24.2%');
  if (total < 2500) err('nuclides', `只有 ${total} 個核種(預期 ≥ 2500)`);
  warns.push(`核種:${total} 個(${ELEMENTS.length} 個元素)`);
}
