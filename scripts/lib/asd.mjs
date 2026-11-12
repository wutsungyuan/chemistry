// NIST 原子光譜資料庫(ASD)的資料處理:解析 Tab 分隔輸出 → 合併重疊譜線 → 估算強度 → 挑出最強的譜線。
// 純函式,不碰網路與檔案,方便單元測試。抓取見 scripts/fetch-spectra.mjs。
//
// 資料來源:NIST Atomic Spectra Database (Kramida, Ralchenko, Reader & NIST ASD Team),
//          https://physics.nist.gov/asd , DOI 10.18434/T4W30F

export const VISIBLE = [380, 780];                       // 可見光範圍(nm)
export const ASD_KT_PER_K = 0.6950348;
export const CM1_TO_EV = 1.239841984e-4;                // 1 cm⁻¹ = 1.2398e-4 eV
export const HC_EV_NM = 1239.841984;                     // 光子能量(eV)= 1239.84 / 波長(nm)
/** 能階(cm⁻¹,從基態算起)→ eV(取到 0.001);沒有資料回傳 null。上下能階缺一就都不存(避免畫出半條箭頭) */
const CAPACITY = { s: 2, p: 6, d: 10, f: 14, g: 18 };
/**
 * 能階的簡短標籤:只標「已填滿的內層 + 恰好一個外層電子」的能階,例如 2p6.3s → 3s、1s2.2p → 2p、3d10.4s → 4s。
 * 內層電子被激發(2p5…)、兩個以上電子同時在動(3d6.4s.4p)、全部填滿(4s2)的複雜組態不硬標,回傳 null。
 * mode 'nl':3s、3p、4d(第幾層 + 子層);mode 'n':n=3(氫:同一層的子層能量幾乎一樣,只標第幾層)
 */
export function levelLabel(conf, mode = 'nl') {
  const tokens = String(conf ?? '').replace(/\([^)]*\)/g, '.').split('.').map(t => t.trim()).filter(Boolean);
  const open = [];
  for (const t of tokens) {
    const m = /^(\d+)([spdfg])(\d*)$/.exec(t);
    if (!m) return null;                                           // 看不懂的寫法 → 不標
    const count = m[3] ? +m[3] : 1;
    if (count !== CAPACITY[m[2]]) open.push({ n: m[1], l: m[2], count });         // 沒填滿的
  }
  if (open.length !== 1 || open[0].count !== 1) return null;
  return mode === 'n' ? `n=${open[0].n}` : open[0].n + open[0].l;
}
const toEV = cm => (Number.isFinite(cm) ? +(cm * CM1_TO_EV).toFixed(3) : null);                  // 波茲曼常數:cm⁻¹ / K

const num = s => { const m = /[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/.exec(String(s ?? '').replace(/[\[\]"()]/g, '')); return m ? parseFloat(m[0]) : NaN; };
const frac = s => { const t = String(s ?? '').replace(/[\[\]"()?]/g, '').trim(); const m = /^(\d+)\/(\d+)$/.exec(t); return m ? +m[1] / +m[2] : /^\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NaN; };

/** 解析 ASD 的 Tab 分隔輸出(format=3)。欄位依「標題名稱」找,因為不同元素的欄位順序/數量不一樣。 */
export function parseAsd(tsv) {
  const rows = String(tsv).replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!rows.length || !/^obs_wl/.test(rows[0])) return null;               // 不是表格(例如「No lines are available」)
  const head = rows[0].split('\t').map(h => h.trim()), col = n => head.findIndex(h => h.startsWith(n));
  const iObs = col('obs_wl'), iRitz = col('ritz_wl'), iI = col('intens'), iA = col('Aki'), iEi = col('Ei'), iEk = col('Ek'), iJk = col('J_k'), iCi = col('conf_i'), iCk = col('conf_k');
  const cell = (c, i) => (i >= 0 ? (c[i] ?? '').replace(/^"|"$/g, '') : '');
  return rows.slice(1).map(l => {
    const c = l.split('\t');
    const obs = num(cell(c, iObs)), ritz = num(cell(c, iRitz));
    const J = frac(cell(c, iJk));
    return { wl: Number.isFinite(obs) ? obs : ritz, intens: num(cell(c, iI)), A: num(cell(c, iA)), Ei: num(cell(c, iEi)), Ek: num(cell(c, iEk)), confI: cell(c, iCi), confK: cell(c, iCk), g: Number.isFinite(J) ? 2 * J + 1 : NaN };
  }).filter(r => Number.isFinite(r.wl));
}

/** 沒有實測強度時的估算:發出的能量 ∝ g·A·exp(−Ek/kT)/λ(假設熱平衡,T 以資料驗證挑選,見 spectra.json 的 meta) */
export const estimateIntensity = (r, T) => (r.A > 0 && Number.isFinite(r.Ek) && r.g > 0 ? (r.g * r.A * Math.exp(-r.Ek / (ASD_KT_PER_K * T))) / r.wl : NaN);

/** 把 0.08 nm 內的譜線合併(精細結構/重疊),強度相加;波長取較強的那條 */
export function mergeLines(lines, tol = 0.08) {
  const s = [...lines].sort((a, b) => a.wl - b.wl), out = [];
  for (const l of s) {
    const last = out[out.length - 1];
    if (last && l.wl - last.wl <= tol) { if (l.I > last.maxI) { last.wl = l.wl; last.maxI = l.I; last.Ei = l.Ei; last.Ek = l.Ek; last.ci = l.ci; last.ck = l.ck; } last.I += l.I; }
    else out.push({ wl: l.wl, I: l.I, maxI: l.I, Ei: l.Ei, Ek: l.Ek, ci: l.ci, ck: l.ck });
  }
  return out;
}

/**
 * 從一個元素的所有譜線,產生要存進專案的精簡光譜。
 * - 實測強度的譜線 ≥ minMeasured 條 → 用實測強度(estimated=false),沒有強度的譜線丟掉
 * - 否則用 estimateIntensity 估算(estimated=true)
 * 回傳 {estimated, lines:[[波長nm, 相對強度0~1],...] 依波長排序};沒有可用譜線時 lines 為空
 */
export function deriveSpectrum(rows, { T = 6000, top = 40, minMeasured = 8, minLines = 3, labelMode = 'nl' } = {}) {
  const vis = (rows || []).filter(r => r.wl >= VISIBLE[0] && r.wl <= VISIBLE[1]);
  const measured = vis.filter(r => r.intens > 0).map(r => ({ wl: r.wl, I: r.intens, Ei: r.Ei, Ek: r.Ek, ci: r.confI, ck: r.confK }));
  const estimated = vis.map(r => ({ wl: r.wl, I: estimateIntensity(r, T), Ei: r.Ei, Ek: r.Ek, ci: r.confI, ck: r.confK })).filter(r => r.I > 0);
  // 優先順序:實測夠多 → 實測;否則能估算 → 估算;再不行,實測少也比沒有好
  const pick = measured.length >= minMeasured ? { est: false, s: measured }
    : estimated.length >= minLines ? { est: true, s: estimated }
    : measured.length >= minLines ? { est: false, s: measured } : null;
  if (!pick) return { estimated: false, lines: [] };
  const merged = mergeLines(pick.s);
  const max = Math.max(...merged.map(l => l.I));
  const best = merged.sort((a, b) => b.I - a.I).slice(0, top).sort((a, b) => a.wl - b.wl);
  return { estimated: pick.est, lines: best.map(l => { const lo = toEV(l.Ei), hi = toEV(l.Ek), ok = lo != null && hi != null; return [+l.wl.toFixed(3), +Math.max(l.I / max, 1e-4).toPrecision(3) * 1, lo, hi, ok ? levelLabel(l.ci, labelMode) : null, ok ? levelLabel(l.ck, labelMode) : null]; }) };
}

/** 斯皮爾曼等級相關(用來驗證「估算強度」和「實測強度」的順序是否一致) */
export function spearman(x, y) {
  const rank = a => { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = Array(a.length); for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const m = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = m; i = j + 1; } return r; };
  const rx = rank(x), ry = rank(y), n = x.length, mx = rx.reduce((s, v) => s + v, 0) / n, my = ry.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (rx[i] - mx) * (ry[i] - my); sxx += (rx[i] - mx) ** 2; syy += (ry[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
}

/**
 * 用「同時有實測強度與躍遷機率」的元素,比較估算與實測的順序一致程度,挑出最合適的溫度 T。
 * allRows: { 元素符號: parseAsd 的結果 };回傳 {T, medianRho, n, table:[{T,medianRho}]}
 */
export function calibrateTemperature(allRows, Ts = [3000, 4000, 5000, 6000, 8000, 10000, 15000, 25000], minLines = 12) {
  const sets = Object.values(allRows).filter(Boolean).map(rows => rows.filter(r => r.wl >= VISIBLE[0] && r.wl <= VISIBLE[1] && r.intens > 0 && r.A > 0 && Number.isFinite(r.Ek) && r.g > 0)).filter(b => b.length >= minLines);
  const median = v => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const table = Ts.map(T => ({ T, medianRho: +median(sets.map(b => spearman(b.map(r => Math.log(r.intens)), b.map(r => Math.log(estimateIntensity(r, T)))))).toFixed(3) }));
  const best = table.reduce((a, b) => (b.medianRho > a.medianRho ? b : a));
  return { T: best.T, medianRho: best.medianRho, n: sets.length, table };
}
