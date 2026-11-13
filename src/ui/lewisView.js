// 路易斯結構的 SVG 畫法:元素符號、線(單/雙/叄鍵 = 共用電子對)、點(孤對電子與未成對電子)、形式電荷。
// 顏色全用 currentColor,跟著各版本的主題;資料來自 game/lewis.js。
const S = 46;                                    // 鍵長 1 → 46px
const rad = sym => (sym === 'H' ? 9 : 12);       // 符號的半徑(鍵線在這之外才開始畫)
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = Math.abs(a - b) % TAU; return d > Math.PI ? TAU - d : d; };

function freeDirections(taken, count) {
  const out = [], all = [...taken];
  for (let k = 0; k < count; k++) {
    let best = 0, bestD = -1;
    for (let c = 0; c < 24; c++) {
      const a = c * TAU / 24, d = all.length ? Math.min(...all.map(t => angDiff(a, t))) : 9;
      if (d > bestD + 1e-9) { bestD = d; best = a; }
    }
    out.push(best); all.push(best);
  }
  return out;
}

/** @param L game/lewis.js 的 lewisStructure() 結果 */
export function lewisSVG(L, { label = '' } = {}) {
  const pts = L.atoms.map(a => [a.x * S, a.y * S]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = 34;
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - Math.min(...xs) + pad * 2, h = Math.max(...ys) - Math.min(...ys) + pad * 2;
  const nbr = L.atoms.map(() => []);
  L.bonds.forEach(({ a, b }) => {
    nbr[a].push(Math.atan2(pts[b][1] - pts[a][1], pts[b][0] - pts[a][0]));
    nbr[b].push(Math.atan2(pts[a][1] - pts[b][1], pts[a][0] - pts[b][0]));
  });
  let g = '';
  for (const { a, b, order } of L.bonds) {
    const [ax, ay] = pts[a], [bx, by] = pts[b], d = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / d, uy = (by - ay) / d, nx = -uy, ny = ux;
    const r1 = rad(L.atoms[a].sym) + 3, r2 = rad(L.atoms[b].sym) + 3;
    const offs = order === 1 ? [0] : order === 2 ? [-3.2, 3.2] : [-5, 0, 5];
    for (const o of offs) g += `<line x1="${(ax + ux * r1 + nx * o).toFixed(1)}" y1="${(ay + uy * r1 + ny * o).toFixed(1)}" x2="${(bx - ux * r2 + nx * o).toFixed(1)}" y2="${(by - uy * r2 + ny * o).toFixed(1)}"/>`;
  }
  let dots = '', text = '';
  L.atoms.forEach((at, i) => {
    const [x, y] = pts[i];
    text += `<text x="${x.toFixed(1)}" y="${(y + 1).toFixed(1)}" font-size="${at.sym === 'H' ? 16 : 20}">${at.sym}</text>`;
    const taken = [...nbr[i]]; if (at.charge) taken.push(-Math.PI / 4);
    const dirs = freeDirections(taken, at.lone + at.unpaired);
    dirs.forEach((a, k) => {
      const R = rad(at.sym) + 7, cx = x + Math.cos(a) * R, cy = y + Math.sin(a) * R, px = -Math.sin(a) * 3.2, py = Math.cos(a) * 3.2;
      if (k < at.lone) dots += `<circle cx="${(cx + px).toFixed(1)}" cy="${(cy + py).toFixed(1)}" r="2.5"/><circle cx="${(cx - px).toFixed(1)}" cy="${(cy - py).toFixed(1)}" r="2.5"/>`;
      else dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.5"/>`;
    });
    if (at.charge) {
      const c = Math.abs(at.charge), s = (c > 1 ? c : '') + (at.charge > 0 ? '+' : '−');
      text += `<text class="lw-ch" x="${(x + 14).toFixed(1)}" y="${(y - 12).toFixed(1)}" font-size="12">${s}</text>`;
    }
  });
  const aria = label ? ` aria-label="${label.replace(/"/g, '&quot;')}"` : '';
  return `<svg class="lewis-svg" viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" role="img"${aria} style="max-width:${Math.min(360, Math.round(w * 1.5))}px">`
    + `<g stroke="currentColor" stroke-width="2" stroke-linecap="round">${g}</g><g fill="currentColor">${dots}</g>`
    + `<g fill="currentColor" font-family="ui-monospace,Menlo,Consolas,'Courier New',monospace" font-weight="700" text-anchor="middle" dominant-baseline="central">${text}</g></svg>`;
}
