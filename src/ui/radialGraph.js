// 徑向機率圖(高中層):P(r) = r²R²(r) —— 在「距離原子核 r 的那一層薄殼」找到電子的機率密度。
// 純函式,回傳 SVG 字串;數值都來自 hydrogenOrbital(精確解),不是示意。
import { radialProb, meanRadius, peakRadius, integrate, STATES } from '../data/hydrogenOrbital.js';

/** 畫圖的 r 範圍(a₀):包含 99.5% 機率的最小整數 */
export function viewRadius(id) {
  for (let R = 2; R < 120; R++) if (integrate(r => radialProb(id, r), 0, R, 2000) >= 0.995) return R;
  return 120;
}

/** 刻度間隔(a₀):讓刻度數不超過 ~8 個 */
export const tickStep = R => [1, 2, 5, 10, 20].find(s => R / s <= 8) ?? 20;

/**
 * 畫圖。傳回 { svg, meta }:meta 給測試用(<r> 與 r_mp 在圖上的 x 座標、節點數)。
 * 標籤文字用 a₀ 為單位;width/height 是 viewBox 大小(實際寬度 100%)。
 */
export function radialGraph(id, { width = 320, height = 130, labelMean = '⟨r⟩', labelPeak = 'r_mp' } = {}) {
  const R = viewRadius(id), padL = 8, padR = 10, padT = 16, padB = 32, W = width - padL - padR, H = height - padT - padB;
  const N = 240, pts = Array.from({ length: N + 1 }, (_, i) => { const r = (i / N) * R; return [r, radialProb(id, r)]; });
  const pmax = Math.max(...pts.map(p => p[1])), x = r => padL + (r / R) * W, y = p => padT + (1 - p / pmax) * H;
  const d = pts.map(([r, p], i) => `${i ? 'L' : 'M'}${x(r).toFixed(1)},${y(p).toFixed(1)}`).join('');
  const area = `${d}L${x(R).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`;
  const mean = meanRadius(id), rmp = peakRadius(id), nodes = STATES[id].nodesR, step = tickStep(R);
  const ticks = []; for (let r = 0; r <= R; r += step) ticks.push(`<line x1="${x(r).toFixed(1)}" x2="${x(r).toFixed(1)}" y1="${y(0)}" y2="${y(0) + 4}" stroke="#b8c0ee"/><text x="${x(r).toFixed(1)}" y="${y(0) + 15}" text-anchor="middle" font-size="9" fill="#b8c0ee">${r}</text>`);
  const svg = `<svg class="radial-graph" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="radial probability">`
    + `<path d="${area}" fill="#7fd6f5" fill-opacity="0.22"/><path d="${d}" fill="none" stroke="#7fd6f5" stroke-width="1.8"/>`
    + `<line x1="${padL}" x2="${padL + W}" y1="${y(0)}" y2="${y(0)}" stroke="#b8c0ee" stroke-opacity=".6"/>${ticks.join('')}`
    + `<line class="rg-mean" x1="${x(mean).toFixed(1)}" x2="${x(mean).toFixed(1)}" y1="${padT - 4}" y2="${y(0)}" stroke="#ffd23f" stroke-dasharray="4 3"/>`
    + `<text x="${(x(mean) + (mean > R * 0.6 ? -4 : 4)).toFixed(1)}" y="${y(0) - 5}" text-anchor="${mean > R * 0.6 ? 'end' : 'start'}" font-size="9" fill="#ffd23f">${labelMean} = ${mean} a₀</text>`
    + `<circle class="rg-peak" cx="${x(rmp).toFixed(1)}" cy="${y(radialProb(id, rmp)).toFixed(1)}" r="3.4" fill="#ff9d5c"/>`
    + `<text x="${x(rmp).toFixed(1)}" y="${(y(radialProb(id, rmp)) - 6).toFixed(1)}" text-anchor="middle" font-size="9" fill="#ff9d5c">${labelPeak} = ${rmp.toFixed(rmp % 1 ? 2 : 0)}</text>`
    + nodes.map(r => `<circle class="rg-node" cx="${x(r).toFixed(1)}" cy="${y(0)}" r="3.6" fill="none" stroke="#fff" stroke-width="1.4"/>`).join('')
    + `<text x="${padL + W}" y="${y(0) + 27}" text-anchor="end" font-size="9" fill="#b8c0ee">r (a₀)</text></svg>`;
  return { svg, meta: { R, mean, rmp, nodes: nodes.length, xMean: x(mean), xPeak: x(rmp), xOf: x } };
}
