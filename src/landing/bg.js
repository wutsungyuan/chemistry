// 入口頁的背景:三種風格共用同一批「分子/原子/元素格」的位置與運動,
// 每種風格各自畫法,依權重疊在一起,所以切換風格時是平順地漸變(不是硬切)。
// 只用 2D canvas,不載入 3D 引擎。粒子數依畫面大小決定,太慢時會自動減量;分頁看不到時暫停。

export const THEMES = ['kid', 'teen', 'high'];

const MOLS = [
  { label: 'H₂O', atoms: [['O', 0, 0], ['H', -.95, .75], ['H', .95, .75]], bonds: [[0, 1, 1], [0, 2, 1]] },
  { label: 'CO₂', atoms: [['C', 0, 0], ['O', -1.35, 0], ['O', 1.35, 0]], bonds: [[0, 1, 2], [0, 2, 2]] },
  { label: 'CH₄', atoms: [['C', 0, 0], ['H', -.95, -.95], ['H', .95, -.95], ['H', -.95, .95], ['H', .95, .95]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
  { label: 'O₂', atoms: [['O', -.75, 0], ['O', .75, 0]], bonds: [[0, 1, 2]] },
  { label: 'NH₃', atoms: [['N', 0, 0], ['H', -1, .7], ['H', 1, .7], ['H', 0, -1.05]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
];
const RAD = { H: .5, C: .8, O: .75, N: .72 };
const PAL = {
  kid: { H: '#ffd23f', C: '#4cc9ff', O: '#ff6b81', N: '#9b8cff' },
  teen: { H: '#dfe6ee', C: '#5b6b7f', O: '#d9645b', N: '#5a7fc4' },
};
const CELLS = [['H', 1], ['He', 2], ['Li', 3], ['C', 6], ['N', 7], ['O', 8], ['Na', 11], ['Cl', 17], ['Fe', 26], ['Cu', 29], ['Au', 79], ['Ne', 10]];
const KID_COLORS = ['#ff8fa3', '#ffb703', '#4cc9ff', '#9b8cff', '#6fdc8c', '#ff9f68'];

const rnd = (a, b) => a + Math.random() * (b - a);
const lighten = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.round(c + (255 - c) * k);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

function line(ctx, ax, ay, bx, by, order, w, color, gap) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = -dy / d * gap, ny = dx / d * gap;
  const offs = order === 2 ? [-.5, .5] : [0];
  for (const o of offs) { ctx.beginPath(); ctx.moveTo(ax + nx * o, ay + ny * o); ctx.lineTo(bx + nx * o, by + ny * o); ctx.stroke(); }
}

const DRAW = {
  mol: {
    kid(ctx, e) {
      const s = e.s;
      for (const [a, b, o] of e.m.bonds) { const A = e.m.atoms[a], B = e.m.atoms[b]; line(ctx, A[1] * s, A[2] * s, B[1] * s, B[2] * s, o, s * (o === 2 ? .16 : .3), 'rgba(255,255,255,.95)', s * .26); }
      for (const [el, x, y] of e.m.atoms) {
        const r = RAD[el] * s, g = ctx.createRadialGradient(x * s - r * .3, y * s - r * .35, r * .1, x * s, y * s, r);
        g.addColorStop(0, lighten(PAL.kid[el], .6)); g.addColorStop(1, PAL.kid[el]);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x * s, y * s, r, 0, 6.2832); ctx.fill();
      }
    },
    teen(ctx, e) {
      const s = e.s;
      for (const [a, b, o] of e.m.bonds) { const A = e.m.atoms[a], B = e.m.atoms[b]; line(ctx, A[1] * s, A[2] * s, B[1] * s, B[2] * s, o, s * .09, 'rgba(70,90,120,.45)', s * .2); }
      for (const [el, x, y] of e.m.atoms) {
        const r = RAD[el] * s * .85;
        ctx.fillStyle = PAL.teen[el]; ctx.strokeStyle = 'rgba(40,60,90,.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x * s, y * s, r, 0, 6.2832); ctx.fill(); ctx.stroke();
      }
    },
    high(ctx, e) {
      const s = e.s;
      for (const [a, b, o] of e.m.bonds) { const A = e.m.atoms[a], B = e.m.atoms[b]; line(ctx, A[1] * s, A[2] * s, B[1] * s, B[2] * s, o, 1, 'rgba(150,205,255,.55)', s * .16); }
      ctx.font = `${Math.max(9, s * .5)}px ui-monospace,Menlo,Consolas,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const [el, x, y] of e.m.atoms) {
        const r = RAD[el] * s * .75;
        ctx.fillStyle = 'rgba(8,18,44,.9)'; ctx.strokeStyle = 'rgba(150,205,255,.7)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x * s, y * s, r, 0, 6.2832); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(190,225,255,.85)'; ctx.save(); ctx.translate(x * s, y * s); ctx.rotate(-e.rot); ctx.fillText(el, 0, 1); ctx.restore();
      }
    },
  },
  atom: {
    kid(ctx, e, t) { orbits(ctx, e, t, 'rgba(255,255,255,.95)', 2.6, '#4cc9ff', 3.4, '#ffb703', true); },
    teen(ctx, e, t) { orbits(ctx, e, t, 'rgba(70,90,120,.3)', 1.2, '#5a7fc4', 2.6, '#5a7fc4', false); },
    high(ctx, e, t) { orbits(ctx, e, t, 'rgba(150,205,255,.4)', .9, '#bfe3ff', 2, null, false); },
  },
  cell: {
    kid(ctx, e) {
      const s = e.s * 1.7, c = KID_COLORS[e.k % KID_COLORS.length];
      ctx.fillStyle = c; rr(ctx, -s / 2, -s / 2, s, s, s * .28); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `800 ${s * .46}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.c[0], 0, 1);
    },
    teen(ctx, e) {
      const s = e.s * 1.6;
      ctx.strokeStyle = 'rgba(70,90,120,.3)'; ctx.lineWidth = 1; rr(ctx, -s / 2, -s / 2, s, s, 4); ctx.stroke();
      ctx.fillStyle = 'rgba(70,90,120,.45)'; ctx.font = `600 ${s * .38}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.c[0], 0, 1);
    },
    high(ctx, e) {
      const s = e.s * 1.6;
      ctx.strokeStyle = 'rgba(150,205,255,.35)'; ctx.lineWidth = .8; ctx.strokeRect(-s / 2, -s / 2, s, s);
      ctx.fillStyle = 'rgba(190,225,255,.7)'; ctx.font = `${s * .4}px ui-monospace,Menlo,Consolas,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.c[0], 0, 2);
      ctx.font = `${s * .2}px ui-monospace,Menlo,Consolas,monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(e.c[1], -s / 2 + 3, -s / 2 + 2);
    },
  },
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function orbits(ctx, e, t, stroke, sw, eColor, eR, nucColor, glow) {
  const s = e.s;
  ctx.lineWidth = sw; ctx.strokeStyle = stroke;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, s * 1.9, s * .7, i * Math.PI / 3, 0, 6.2832); ctx.stroke(); }
  if (eColor) {
    ctx.fillStyle = eColor;
    for (let i = 0; i < 3; i++) {
      const a = t * (.9 + i * .25) + e.ph + i * 2, ex = Math.cos(a) * s * 1.9, ey = Math.sin(a) * s * .7, r = i * Math.PI / 3;
      ctx.beginPath(); ctx.arc(ex * Math.cos(r) - ey * Math.sin(r), ex * Math.sin(r) + ey * Math.cos(r), eR, 0, 6.2832); ctx.fill();
    }
  }
  if (nucColor) {
    if (glow) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * .7); g.addColorStop(0, nucColor); g.addColorStop(1, 'rgba(255,183,3,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * .7, 0, 6.2832); ctx.fill(); }
    ctx.fillStyle = nucColor; ctx.beginPath(); ctx.arc(0, 0, s * .3, 0, 6.2832); ctx.fill();
  } else { ctx.strokeStyle = stroke; ctx.beginPath(); ctx.arc(0, 0, s * .25, 0, 6.2832); ctx.stroke(); }
}

export function createBackground(canvas, layers) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, ents = [], bubbles = [], stars = [], raf = 0, last = 0, t = 0, slow = 0, frames = 0, level = 1;
  const w = [1, 0, 0], target = [1, 0, 0];

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    seed();
  }
  function seed() {
    const n = Math.max(7, Math.min(24, Math.round(W * H / 45000 * level)));
    ents = [];
    for (let i = 0; i < n; i++) {
      const r = i % 10;
      const base = { x: rnd(0, W), y: rnd(0, H), vx: rnd(-9, 9), vy: rnd(-9, 9), rot: rnd(0, 6.28), vr: rnd(-.25, .25), ph: rnd(0, 6.28) };
      if (r < 6) ents.push({ ...base, type: 'mol', m: MOLS[i % MOLS.length], s: rnd(16, 28) });
      else if (r < 8) ents.push({ ...base, type: 'atom', s: rnd(14, 22), vr: rnd(-.12, .12) });
      else { const k = (i * 7) % CELLS.length; ents.push({ ...base, type: 'cell', c: CELLS[k], k, s: rnd(14, 20), vr: rnd(-.1, .1) }); }
    }
    bubbles = Array.from({ length: Math.round(10 * level) }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(5, 16), v: rnd(14, 34), ph: rnd(0, 6.28) }));
    stars = Array.from({ length: Math.round(9 * level) }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(5, 11), ph: rnd(0, 6.28) }));
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; t += dt;
    // 太慢就減量(只會減,不會加回來)
    if (dt > .028) slow++; else slow = Math.max(0, slow - 1);
    if (slow > 40 && level > .4) { level *= .7; slow = 0; seed(); }
    const k = 1 - Math.exp(-dt * 3.2);
    for (let i = 0; i < 3; i++) { w[i] += (target[i] - w[i]) * k; layers[i].style.opacity = Math.min(1, w[i]).toFixed(3); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    for (const e of ents) {
      e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.vr * dt;
      const m = 90; if (e.x < -m) e.x = W + m; if (e.x > W + m) e.x = -m; if (e.y < -m) e.y = H + m; if (e.y > H + m) e.y = -m;
    }
    THEMES.forEach((th, i) => {
      const a = w[i]; if (a < .02) return;
      ctx.globalAlpha = Math.min(1, a);
      for (const e of ents) {
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot);
        DRAW[e.type][th](ctx, e, t);
        ctx.restore();
        if (th === 'high' && e.type === 'mol') {
          ctx.fillStyle = 'rgba(150,205,255,.5)'; ctx.font = '10px ui-monospace,Menlo,Consolas,monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(e.m.label, e.x, e.y + e.s * 1.5);
        }
      }
      if (th === 'kid') drawKidExtras(a);
    });
    ctx.globalAlpha = 1;
  }

  function drawKidExtras() {
    for (const b of bubbles) {
      b.y -= b.v / 60; b.x += Math.sin(t + b.ph) * .25; if (b.y < -30) { b.y = H + 30; b.x = rnd(0, W); }
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(b.x - b.r * .35, b.y - b.r * .35, b.r * .2, 0, 6.2832); ctx.fill();
    }
    for (const s of stars) {
      const sc = (Math.sin(t * 2 + s.ph) + 1) / 2 * .9 + .1, r = s.s * sc;
      ctx.fillStyle = '#fff'; ctx.beginPath();
      ctx.moveTo(s.x, s.y - r); ctx.quadraticCurveTo(s.x, s.y, s.x + r, s.y); ctx.quadraticCurveTo(s.x, s.y, s.x, s.y + r);
      ctx.quadraticCurveTo(s.x, s.y, s.x - r, s.y); ctx.quadraticCurveTo(s.x, s.y, s.x, s.y - r); ctx.fill();
    }
  }

  const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', onVis);
  addEventListener('resize', size);
  size(); raf = requestAnimationFrame(frame);

  return {
    /** i = 0|1|2(kid/teen/high) */
    setTarget(i) { for (let j = 0; j < 3; j++) target[j] = j === i ? 1 : 0; },
    destroy() { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', size); },
  };
}
