import { MOL } from '../data/molecules.js';
import { BY_SYMBOL } from '../data/elements.js';

// 物質三態(固/液/氣)與電漿的粒子示意圖:2D canvas,幾十顆「分子」。
//  固態:排得整整齊齊,只在原地抖動;液態:擠在底部,貼在一起但會滑來滑去;氣態:離得很遠、四處亂飛;電漿:帶電的離子 + 自由電子。
//  setState({phase, to, progress, heat}):phase 是目前狀態;正在變化時 to 是下一個狀態、progress 0~1(這一成的分子已經變了);heat 0~1 是這個狀態裡的冷熱。
const COLS = 9, ROWS = 6, N = COLS * ROWS;
const rnd = (a, b) => a + Math.random() * (b - a);

/** 一個「分子」長什麼樣子:[{dx, dy, r, color}](單位:以分子最大範圍 = 1),加上鍵 [[i,j]] */
export function glyphOf(sub) {
  if (sub.glyph.atom) { const e = BY_SYMBOL[sub.glyph.atom]; return { atoms: [{ dx: 0, dy: 0, r: 1, color: e.color, sym: e.sym }], bonds: [] }; }
  const m = MOL[sub.glyph.mol], n = m.atoms.length;
  const mean = [1, 2, 3].map(k => m.atoms.reduce((s, a) => s + a[k] / n, 0));
  const spread = [0, 1, 2].map(k => Math.max(...m.atoms.map(a => Math.abs(a[k + 1] - mean[k]))));
  const [u, v] = [0, 1, 2].sort((p, q) => spread[q] - spread[p]).slice(0, 2).sort();        // 投影到分子「最攤開」的那個平面(結構的座標軸方向不一定是 x、y)
  const pos = a => [a[u + 1] - mean[u], a[v + 1] - mean[v]];
  const ext = Math.max(0.6, ...m.atoms.map(a => Math.hypot(...pos(a)) + (BY_SYMBOL[a[0]].radius ?? 0.7) * 0.5));
  return {
    atoms: m.atoms.map(a => { const [x, y] = pos(a); return { dx: x / ext, dy: y / ext, r: ((BY_SYMBOL[a[0]].radius ?? 0.7) * 0.5) / ext, color: BY_SYMBOL[a[0]].color, sym: a[0] }; }),
    bonds: m.bonds.map(b => [b[0], b[1]]),
  };
}

export function createParticleBox(wrap) {
  const cv = document.createElement('canvas'); wrap.appendChild(cv);
  const g = cv.getContext('2d');
  let W = 300, H = 300, d = 30, glyph = { atoms: [], bonds: [] }, st = { phase: 'solid', to: null, progress: 0, heat: 0.3 }, raf = 0, last = performance.now(), t = 0;
  const P = Array.from({ length: N }, (_, i) => ({ x: 0, y: 0, vx: 0, vy: 0, mode: 'solid', ph: rnd(0, 6.28), ph2: rnd(0, 6.28), rot: rnd(0, 6.28), spin: rnd(-1, 1), i }));
  const E = Array.from({ length: N }, () => ({ x: rnd(0, 1), y: rnd(0, 1), vx: rnd(-1, 1), vy: rnd(-1, 1) }));   // 電漿裡的自由電子(座標用 0~1 的比例)
  let placed = false;

  function resize() {
    const r = wrap.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(120, r.width); H = Math.max(120, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    d = Math.min((W * 0.84) / COLS, (H * 0.5) / ROWS);
    placed = false;
  }
  const home = p => ({ x: (W - COLS * d) / 2 + d / 2 + (p.i % COLS) * d, y: H - 0.06 * H - d / 2 - Math.floor(p.i / COLS) * d });
  const pool = () => { const m = W * 0.05, h = Math.min(H * 0.8, (N * d * d * 1.45) / (W - 2 * m)); return { x0: m, x1: W - m, y0: H - 0.06 * H - h, y1: H - 0.06 * H }; };
  const box = () => ({ x0: W * 0.04, x1: W * 0.96, y0: H * 0.05, y1: H * 0.94 });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const { phase, to, progress, heat } = st, lerpK = 1 - Math.exp(-9 * dt), r = d * 0.46;
    if (!placed) { P.forEach(p => { const h = home(p); p.x = h.x; p.y = h.y; }); placed = true; }
    // 背景:冷 → 藍、熱 → 橘
    g.clearRect(0, 0, W, H);
    const tint = { solid: 'rgba(90,150,255,.16)', liquid: 'rgba(80,200,230,.14)', gas: 'rgba(255,170,90,.12)', plasma: 'rgba(255,120,220,.2)' }[phase];
    g.fillStyle = tint; g.fillRect(0, 0, W, H);

    P.forEach(p => {                                         // 正在變化時,前 progress 比例的分子已經變好了
      const mode = to && p.i / N < progress ? to : phase;
      if (mode !== p.mode) { p.mode = mode; const a = rnd(0, 6.28), s = d * rnd(1, 3); p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; }
      if (mode === 'solid') {
        const h = home(p), A = d * (0.03 + 0.16 * heat);
        p.x += (h.x + Math.cos(t * 9 + p.ph) * A - p.x) * lerpK; p.y += (h.y + Math.sin(t * 8 + p.ph2) * A - p.y) * lerpK; p.rot += 0;
      } else {
        const b = mode === 'liquid' ? pool() : box(), speed = mode === 'liquid' ? d * (1.0 + 2.2 * heat) : mode === 'gas' ? W * (0.22 + 0.5 * heat) : W * 0.8;
        const sp = Math.hypot(p.vx, p.vy) || 1;
        p.vx += (p.vx / sp * speed - p.vx) * 2 * dt + rnd(-1, 1) * speed * 3 * dt; p.vy += (p.vy / sp * speed - p.vy) * 2 * dt + rnd(-1, 1) * speed * 3 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt * (mode === 'liquid' ? 1 : 3);
        if (p.x < b.x0 + r) { p.x = b.x0 + r; p.vx = Math.abs(p.vx); } else if (p.x > b.x1 - r) { p.x = b.x1 - r; p.vx = -Math.abs(p.vx); }
        if (p.y < b.y0 + r) { p.y = b.y0 + r; p.vy = Math.abs(p.vy); } else if (p.y > b.y1 - r) { p.y = b.y1 - r; p.vy = -Math.abs(p.vy); }
      }
    });
    // 液態的分子互相推開(不重疊)
    const liq = P.filter(p => p.mode === 'liquid');
    for (let a = 0; a < liq.length; a++) for (let b = a + 1; b < liq.length; b++) {
      const dx = liq[b].x - liq[a].x, dy = liq[b].y - liq[a].y, dist = Math.hypot(dx, dy) || 1, min = d * 0.9;
      if (dist < min) { const push = (min - dist) / 2 / dist; liq[a].x -= dx * push; liq[a].y -= dy * push; liq[b].x += dx * push; liq[b].y += dy * push; }
    }
    // 畫
    P.forEach(p => {
      if (p.mode === 'plasma') { drawIon(p, r); return; }
      g.save(); g.translate(p.x, p.y); g.rotate(p.mode === 'solid' ? 0 : p.rot);
      const s = r * 1.05;
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1.5, r * 0.14);
      glyph.bonds.forEach(([i, j]) => { const a = glyph.atoms[i], b = glyph.atoms[j]; g.beginPath(); g.moveTo(a.dx * s, a.dy * s); g.lineTo(b.dx * s, b.dy * s); g.stroke(); });
      glyph.atoms.forEach(a => { g.beginPath(); g.fillStyle = a.color; g.arc(a.dx * s, a.dy * s, Math.max(2, a.r * s), 0, 6.283); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); });
      g.restore();
    });
    if (phase === 'plasma' || to === 'plasma') drawElectrons(dt);
    raf = requestAnimationFrame(frame);
  }
  function drawIon(p, r) {
    const a = glyph.atoms[0] || { color: '#fff' };
    g.save(); g.shadowColor = '#ff7ae0'; g.shadowBlur = 14;
    g.beginPath(); g.fillStyle = a.color; g.arc(p.x, p.y, r * 0.7, 0, 6.283); g.fill(); g.restore();
    g.fillStyle = '#111'; g.font = `700 ${Math.round(r)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+', p.x, p.y + 1);
  }
  function drawElectrons(dt) {
    const k = st.phase === 'plasma' ? 1 : st.progress;
    g.save(); g.shadowColor = '#7ae6ff'; g.shadowBlur = 8; g.fillStyle = '#9ff0ff';
    E.forEach((e, i) => {
      if (i / N > k) return;
      e.x += e.vx * dt * 0.7; e.y += e.vy * dt * 0.7;
      if (e.x < 0.03 || e.x > 0.97) e.vx *= -1; if (e.y < 0.05 || e.y > 0.95) e.vy *= -1;
      g.beginPath(); g.arc(e.x * W, e.y * H, Math.max(2, d * 0.1), 0, 6.283); g.fill();
    });
    g.restore();
  }

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; ro?.observe(wrap);
  resize(); raf = requestAnimationFrame(frame);
  return {
    setGlyph(s) { glyph = glyphOf(s); },
    setState(s) { st = { ...st, ...s }; },
    dispose() { cancelAnimationFrame(raf); ro?.disconnect(); cv.remove(); },
  };
}
