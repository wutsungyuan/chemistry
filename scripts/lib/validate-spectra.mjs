// 驗證「元素光譜」資料(src/data/db/spectra.json,來自 NIST ASD;由 scripts/fetch-spectra.mjs 產生)。
import { ELEMENTS } from '../../src/data/elements.js';
import { VISIBLE, HC_EV_NM } from './asd.mjs';

export function validateSpectra(SPEC, { err, warns }) {
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
