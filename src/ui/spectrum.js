// 光譜條的繪製與互動邏輯(純函式,不碰 DOM,方便單元測試)。
// 譜線資料:[[波長 nm, 相對強度 0~1], ...](由 src/data/db/spectra.json 產生,來源 NIST ASD)。
import { MathUtils } from 'three';
import { CYCLE, RESET, TIMELINE } from './orbitJump.js';

export const RANGE = [380, 780];                           // 可見光(nm)

/** 波長 → RGB(0~255)。常見的近似演算法(Dan Bruton):螢幕無法重現單色光,顏色只是近似。 */
export function wavelengthToRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 780) { r = 1; }
  // 視覺靈敏度:兩端(近紫外、近紅外)看起來比較暗
  const f = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1;
  const c = v => Math.round(255 * Math.pow(Math.max(0, v) * f, 0.8));
  return [c(r), c(g), c(b)];
}
export const cssColor = nm => { const [r, g, b] = wavelengthToRGB(nm); return `rgb(${r},${g},${b})`; };

/** 波長 → 顏色名稱的 i18n 鍵(sp.c.*) */
export function colorKey(nm) {
  return nm < 450 ? 'sp.c.violet' : nm < 485 ? 'sp.c.blue' : nm < 500 ? 'sp.c.cyan' : nm < 565 ? 'sp.c.green' : nm < 590 ? 'sp.c.yellow' : nm < 625 ? 'sp.c.orange' : 'sp.c.red';
}

/** 強度跨好幾個數量級,用 I^0.35 壓縮後再決定亮度與線寬;線畫得比實際粗,方便手指點 */
export const display = I => Math.pow(Math.min(1, Math.max(0, I)), 0.35);
export const lineStyle = I => { const d = display(I); return { width: +(1.6 + 2.4 * d).toFixed(2), opacity: +(0.5 + 0.5 * d).toFixed(2) }; };

export const xOf = (nm, width) => ((nm - RANGE[0]) / (RANGE[1] - RANGE[0])) * width;
export const nmOf = (x, width) => MathUtils.clamp(RANGE[0] + (x / width) * (RANGE[1] - RANGE[0]), RANGE[0], RANGE[1]);

/** 離某個波長最近的譜線(索引);超過容許距離(nm)回傳 -1。距離相同時選較強的。 */
export function nearestLine(lines, nm, tolNm) {
  let best = -1, bd = Infinity;
  lines.forEach(([wl, I], i) => {
    const d = Math.abs(wl - nm);
    if (d <= tolNm && (d < bd - 1e-9 || (Math.abs(d - bd) < 1e-9 && I > lines[best][1]))) { best = i; bd = d; }
  });
  return best;
}

/** 最亮的 n 條線(回傳 [索引, ...],由亮到暗) */
export const brightest = (lines, n = 5) => lines.map((l, i) => [l[1], i]).sort((a, b) => b[0] - a[0]).slice(0, n).map(x => x[1]);

/**
 * 產生光譜條的 SVG 字串。mode: 'emit'(黑底亮線)| 'absorb'(彩虹底黑線)
 * selected: 被選取的譜線索引(畫出白色標示),uid: 同一頁有多個光譜條時避免 id 重複
 */
export function spectrumSVG(lines, { mode = 'emit', width = 320, height = 64, selected = -1, uid = 's' } = {}) {
  const W = Math.max(120, Math.round(width)), H = height, axisH = 20;
  const stops = []; for (let nm = RANGE[0]; nm <= RANGE[1]; nm += 20) stops.push(`<stop offset="${((nm - RANGE[0]) / (RANGE[1] - RANGE[0]) * 100).toFixed(1)}%" stop-color="${cssColor(nm)}"/>`);
  const bg = mode === 'absorb' ? `url(#bg-${uid})` : '#05060f';
  const ls = lines.map(([wl, I], i) => {
    const x = xOf(wl, W).toFixed(1), st = lineStyle(I);
    return mode === 'absorb'
      ? `<line x1="${x}" x2="${x}" y1="0" y2="${H}" stroke="#05060f" stroke-width="${st.width}" stroke-opacity="${Math.min(1, st.opacity + 0.15)}"/>`
      : `<line x1="${x}" x2="${x}" y1="0" y2="${H}" stroke="${cssColor(wl)}" stroke-width="${st.width}" stroke-opacity="${st.opacity}"/>`;
  }).join('');
  let sel = '';
  if (selected >= 0 && lines[selected]) {
    const x = xOf(lines[selected][0], W);
    sel = `<rect x="${(x - 7).toFixed(1)}" y="0" width="14" height="${H}" fill="#fff" fill-opacity=".14"/><line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="0" y2="${H}" stroke="#fff" stroke-width="1" stroke-opacity=".9"/><polygon points="${(x - 5).toFixed(1)},${H + 1} ${(x + 5).toFixed(1)},${H + 1} ${x.toFixed(1)},${H - 7}" fill="#ffd23f"/>`;
  }
  let axis = '';
  for (let nm = 400; nm <= 750; nm += 50) {
    const x = xOf(nm, W).toFixed(1), major = nm % 100 === 0;
    axis += `<line x1="${x}" x2="${x}" y1="${H}" y2="${H + (major ? 6 : 3)}" stroke="#b8c0ee" stroke-width="1"/>`;
    if (major) axis += `<text x="${x}" y="${H + 17}" text-anchor="middle" font-size="10" fill="#b8c0ee">${nm}</text>`;
  }
  axis += `<text x="${W - 2}" y="${H + 17}" text-anchor="end" font-size="10" fill="#b8c0ee">nm</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + axisH}" viewBox="0 0 ${W} ${H + axisH}" role="img" aria-label="spectrum">`
    + `<defs><linearGradient id="bg-${uid}" x1="0" x2="1" y1="0" y2="0">${stops.join('')}</linearGradient>`
    + `<filter id="glow-${uid}" x="-50%" y="-5%" width="200%" height="110%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    + `<rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="${bg}"/>`
    + `<g ${mode === 'emit' ? `filter="url(#glow-${uid})"` : ''}>${ls}</g>${sel}${axis}</svg>`;
}

// ============================================================
// 能階階梯圖:電子在「樓層」(能階)之間跳,放出(或吸收)剛好等於樓層差的光。
// 譜線格式:[波長 nm, 強度, 下能階 eV, 上能階 eV](能階可能是 null)
// ============================================================

/** 有「真實」能階資料的譜線(NIST 有記錄,或能用其他線的能階對出來) */
export const hasLevels = l => l && l[2] != null && l[3] != null && l[6] !== 'approx';
/** 有能階可畫(含示意的)—— 選到沒有能階資料的線時,也要有電子躍遷動畫 */
export const hasAnyLevels = l => l && l[2] != null && l[3] != null;
export const isApprox = l => !!l && l[6] === 'approx';

/**
 * 補上缺的能階,讓「每一條線」都能做躍遷動畫。NIST 有 28% 的可見線沒有記錄能階,做法:
 *  1. 光子能量 ΔE = hc/λ;若這個元素「已知的能階」裡剛好有一對相差 ΔE(誤差 < 0.004 eV)且只有這一對 → 就是它(真實,連名稱一起帶上)
 *  2. 否則只知道「跳多高」(ΔE),不知道「在哪兩層」→ 以基態為起點畫一個示意躍遷,標記 'approx',畫面上會明講是示意
 * 回傳新的陣列,不改原資料。
 */
export function completeLines(lines) {
  const known = new Map();
  for (const l of lines) if (l[2] != null && l[3] != null) { if (!known.has(l[2])) known.set(l[2], l[4] ?? null); if (!known.has(l[3])) known.set(l[3], l[5] ?? null); }
  const es = [...known.keys()];
  return lines.map(l => {
    if (hasAnyLevels(l)) return l;
    const dE = 1239.84198 / l[0], hits = [];
    for (const a of es) for (const b of es) if (b > a && Math.abs(b - a - dE) < 0.004) hits.push([a, b]);
    if (hits.length === 1) { const [a, b] = hits[0]; return [l[0], l[1], a, b, known.get(a), known.get(b)]; }
    return [l[0], l[1], 0, +dE.toFixed(3), null, null, 'approx'];
  });
}

/** 階梯圖要畫哪幾條線:最亮的 n 條(要有能階、且能量不能遠高於最亮的線)+ 被選取的那條(若有能階),依波長由短到長排序 */
export function ladderLines(lines, selected = -1, n = 8) {
  const withLv = lines.map((l, i) => [l[1], i]).filter(([, i]) => hasLevels(lines[i])).sort((a, b) => b[0] - a[0]);
  // 有些元素(例如鈉)的弱線來自內層電子,能階高達 30 eV 以上,會把縱軸拉得太長、真正的亮線被壓扁。
  // 所以只取「上能階不超過最亮那條線上能階的 2 倍(且至少多 3 eV)」的線;使用者自己選的線例外。
  const cap = withLv.length ? Math.max(2 * lines[withLv[0][1]][3], lines[withLv[0][1]][3] + 3) : Infinity;
  const idx = withLv.filter(([, i]) => lines[i][3] <= cap).slice(0, n).map(x => x[1]);
  if (selected >= 0 && hasAnyLevels(lines[selected]) && !idx.includes(selected)) idx.push(selected);
  return idx.sort((a, b) => lines[a][0] - lines[b][0]);
}

/** 把很接近的能階(< tol eV)視為同一階,回傳由低到高排序的能階清單 */
export function mergeLevels(values, tol = 0.015) {
  const out = [];
  for (const v of [...values].sort((a, b) => a - b)) if (!out.length || v - out[out.length - 1] > tol) out.push(v);
  return out;
}

/**
 * 產生能階階梯圖的 SVG 字串。mode: 'emit'(電子往下跳、放出光)| 'absorb'(電子往上跳、吸走光)
 * indices: ladderLines 的結果;selected: 被選取的譜線索引;animate: 是否加上電子跳躍動畫(SMIL;減少動態時請關閉)
 */
export function ladderSVG(lines, { indices, selected = -1, mode = 'emit', width = 320, height = 190, uid = 's', animate = false } = {}) {
  const ids = indices || ladderLines(lines, selected);
  if (!ids.length) return '';
  const W = Math.max(160, Math.round(width)), H = height, padL = 38, padR = 8, padT = 22, padB = 10;
  const ens = ids.flatMap(i => [lines[i][2], lines[i][3]]);
  // 縱軸只畫用到的能量範圍(氫的高階能階很擠,從 0 畫起會全部疊在一起);用到基態或離它很近時才包含 0
  const lowE = Math.min(...ens), highE = Math.max(...ens), span = Math.max(highE - lowE, 0.5);
  const withGround = lowE <= 0.25 * span || lowE < 0.5;
  const bottom = withGround ? 0 : Math.max(0, lowE - 0.12 * span), topE = highE + 0.08 * span;
  const levels = mergeLevels(withGround ? [0, ...ens] : ens);
  const yOf = E => padT + (1 - (E - bottom) / (topE - bottom)) * (H - padT - padB);
  const snap = E => levels.reduce((b, v) => (Math.abs(v - E) < Math.abs(b - E) ? v : b), levels[0]);       // 對齊到最近的橫槓
  // 橫槓的名字(3s、3p、n=2…):同一橫槓上若有不同的標籤(資料不一致)就不標,寧可不標也不標錯
  const nameAt = new Map();
  for (const i of ids) {
    const [, , lo, hi, ll, hl] = lines[i];
    for (const [E, lab] of [[snap(lo), ll], [snap(hi), hl]]) { if (!lab) continue; const prev = nameAt.get(E); nameAt.set(E, prev && prev !== lab ? '' : lab); }
  }
  // 被選取那條線的兩個橫槓,名稱一定要顯示;其他的橫槓名稱太近就跳過,避免疊在一起
  const must = new Set(selected >= 0 && lines[selected] && hasAnyLevels(lines[selected]) && ids.includes(selected) ? [snap(lines[selected][2]), snap(lines[selected][3])] : []);
  let lastLabelY = -99, lastNameY = -99;                  // 標籤太近就跳過較高的那個,避免疊在一起
  const approxE = new Set(ids.filter(i => isApprox(lines[i])).flatMap(i => [snap(lines[i][2]), snap(lines[i][3])]).filter(E => E !== 0));
  const rungs = levels.map(E => {
    const showLabel = Math.abs(yOf(E) - lastLabelY) >= 11; if (showLabel) lastLabelY = yOf(E);
    const showName = !!nameAt.get(E) && (must.has(E) || Math.abs(yOf(E) - lastNameY) >= 12); if (showName) lastNameY = yOf(E);
    return `<line x1="${padL}" x2="${W - padR}" y1="${yOf(E).toFixed(1)}" y2="${yOf(E).toFixed(1)}" stroke="#7d89e6" stroke-opacity="${E === 0 ? 0.35 : 0.6}" stroke-width="1.2"${E === 0 || approxE.has(E) ? ' stroke-dasharray="4 3"' : ''}/>${showLabel ? `<text x="${padL - 4}" y="${(yOf(E) + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#b8c0ee">${E === 0 ? '0' : E.toFixed(2)}</text>` : ''}${showName ? `<text x="${W - padR - 2}" y="${(yOf(E) - 3).toFixed(1)}" text-anchor="end" font-size="10" font-weight="700" fill="#ffe9a8">${nameAt.get(E)}</text>` : ''}`;
  }).join('');
  const step = (W - padL - padR) / ids.length;
  const arrows = ids.map((i, k) => {
    const [wl, , lo, hi] = lines[i], x = padL + (k + 0.5) * step, yLo = yOf(snap(lo)), yHi = yOf(snap(hi)), on = i === selected;
    const [y1, y2] = mode === 'emit' ? [yHi, yLo] : [yLo, yHi], dir = y2 > y1 ? 1 : -1, c = cssColor(wl);
    const w = on ? 3.4 : 2, op = selected < 0 || on ? 1 : 0.45;
    let s = `<g opacity="${op}"${on ? ` filter="url(#glow-${uid})"` : ''}><line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${y1.toFixed(1)}" y2="${(y2 - dir * 5).toFixed(1)}" stroke="${c}" stroke-width="${w}"/>`
      + `<polygon points="${(x - 4.5).toFixed(1)},${(y2 - dir * 7).toFixed(1)} ${(x + 4.5).toFixed(1)},${(y2 - dir * 7).toFixed(1)} ${x.toFixed(1)},${y2.toFixed(1)}" fill="${c}"/></g>`
      + `<text x="${x.toFixed(1)}" y="${padT - 8}" text-anchor="middle" font-size="9" font-weight="${on ? 800 : 400}" fill="${c}" fill-opacity="${op}">${Math.round(wl)}</text>`;
    if (on) {                                               // 被選取的線:電子是「上下兩層的混合」,一層淡出、另一層淡入,不會經過中間
      const yUp = Math.min(y1, y2), yDn = Math.max(y1, y2), C = CYCLE, tl = TIMELINE[mode], f0 = tl.fade[0] / C, f1 = tl.fade[1] / C, r0 = (C - RESET) / C;
      const f = n => n.toFixed(3), kt = `0;${f(f0)};${f(f1)};${f(r0)};1`;
      const up = mode === 'emit' ? '1;1;0;0;1' : '0;0;1;1;0', low = mode === 'emit' ? '0;0;1;1;0' : '1;1;0;0;1';
      const dot = (y, vals) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#4cc9ff" stroke="#fff" stroke-width="1"${animate ? '' : ' opacity="0.5"'}>${animate ? `<animate attributeName="opacity" dur="${C}s" repeatCount="indefinite" keyTimes="${kt}" values="${vals}"/>` : ''}</circle>`;
      s += dot(yUp, up) + dot(yDn, low);                    // 靜態(減少動態效果)時兩層各畫一半濃 = 「混合」
      if (animate) {                                          // 光子:發光時在落地後出現、吸收時一開始就在、被吃掉後消失
        const [p0, p1] = tl.photon, yPh = yDn;
        const keyT = mode === 'emit' ? `0;${f(p0 / C)};${f(p0 / C + 0.03)};${f(p1 / C - 0.06)};${f(p1 / C)};1` : `0;${f(p1 / C - 0.06)};${f(p1 / C)};1`, vals = mode === 'emit' ? '0;0;1;1;0;0' : '1;1;0;0';
        s += `<path d="M${(x + 8).toFixed(1)},${yPh.toFixed(1)} q4,-7 8,0 t8,0 t8,0" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"><animate attributeName="opacity" dur="${C}s" repeatCount="indefinite" keyTimes="${keyT}" values="${vals}"/></path>`;
      }
    }
    return s;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="energy levels">`
    + `<defs><filter id="glow-${uid}" x="-80%" y="-10%" width="260%" height="120%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    + `<text x="${padL - 4}" y="${padT - 8}" text-anchor="end" font-size="9" fill="#b8c0ee">eV</text>${rungs}${arrows}</svg>`;
}

/** 週期表格子裡的迷你光譜條(黑底彩色亮線,沒有座標軸) */
export function miniSpectrumSVG(lines, { width = 40, height = 40 } = {}) {
  const ls = lines.map(([wl, I]) => `<line x1="${xOf(wl, width).toFixed(1)}" x2="${xOf(wl, width).toFixed(1)}" y1="0" y2="${height}" stroke="${cssColor(wl)}" stroke-width="${(0.9 + 1.1 * display(I)).toFixed(2)}" stroke-opacity="${(0.55 + 0.45 * display(I)).toFixed(2)}"/>`).join('');
  return `<svg class="mini-spec" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><rect width="${width}" height="${height}" fill="#05060f"/>${ls}</svg>`;
}
