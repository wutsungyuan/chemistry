import * as THREE from 'three';
import { createStage } from '../three/stage.js';
import { T, Tp, L, LH, state } from '../i18n/index.js';
import { BY_Z } from '../data/elements.js';
import { nuclide, daughter, quarks, averageMass, fractionLeft, lambda, meanLife, decayTimes, countLeft, humanHalfLife, listFor, defaultNuclide, useOf } from '../data/nuclide.js';
import { getLevel } from '../ui/level.js';
import { levelChipsHTML, bindLevelChips } from '../ui/levelBar.js';
import { isNarrow } from '../ui/layout.js';
import { setNextTab } from './AtomView.js';
import { escapeHtml as esc } from '../ui/util.js';

// 原子核與同位素:質子(紅)/中子(灰)的原子核、同位素、半衰期(一大群原子)、衰變動畫;高中再加夸克、衰變定律、核種圖。
// 國小:同位素 = 中子數不同的兄弟;會變身(放射性)與半衰期。國中:質量數與符號、原子量是加權平均、衰變曲線。
// 高中:夸克組成、衰變的原因(弱力/強力)、N(t) = N₀(½)^(t/T)、核種圖。三個階段共用 ui/level.js 記住使用者選的。
const DOTS = 100;                          // 「一大群原子」的顆數
const TYPICAL_SEED = 480;                  // 100 顆原子的一次隨機抽樣。挑了一組「很典型」的(每過一個半衰期剛好約少一半),孩子才看得出規律;種子固定,每次畫面一樣
const T_MAX = 6;                           // 時間軸最多幾個半衰期
const ANIM = 2.6;                          // 衰變動畫秒數(真實是一瞬間,放慢)
const RED = 0xff5a5a, GRAY = 0xb0b6d0;
const fmtPct = x => (x >= 10 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x.toFixed(2));
const fmtAb = x => (x >= 1 ? String(+x.toFixed(2)) : String(+x.toPrecision(2)));

export function mount(container, startZ, { go } = {}) {
  const stage = createStage(container, { camPos: [0, 1.2, 7.2] });
  stage.controls.autoRotate = true; stage.controls.autoRotateSpeed = 0.8; stage.controls.enablePan = false;
  const side = document.createElement('div');
  side.className = 'side nuc-side';
  container.appendChild(side);
  let dead = false, off = null;

  import('../data/generated/nuclides.js').then(({ NUCLIDES, NUCLIDE_META }) => {
    if (dead) return;
    // ---------- 狀態 ----------
    let z = BY_Z[startZ] ? startZ : 6, level = getLevel(), n = 0, t = 0;
    const all = zz => NUCLIDES[zz].map(r => nuclide(zz, r));
    let list = all(z), cur = null, times = decayTimes(DOTS, TYPICAL_SEED);
    let anim = null, ejecta = [], nuc = null;            // anim:衰變動畫狀態;ejecta:飛出去的粒子;nuc:目前的原子核(3D)
    const group = new THREE.Group(); stage.scene.add(group);
    const sph = new THREE.SphereGeometry(1, 16, 12);

    // ---------- 3D 原子核:所有質子與中子(InstancedMesh);排法同原子頁,縮放到固定大小 ----------
    function buildNucleus(p, nn) {
      if (nuc) { group.remove(nuc.mesh); nuc.mesh.dispose(); }
      const total = Math.max(1, p + nn), rad = Math.min(0.16, 1.0 / Math.cbrt(total / 0.5)), packR = total === 1 ? 0 : rad * Math.cbrt(total / 0.5);
      const mesh = new THREE.InstancedMesh(sph, new THREE.MeshStandardMaterial({ roughness: 0.4 }), total);
      const kinds = Array.from({ length: total }, (_, i) => (i < p ? 0 : 1)), rng = Math.random;
      for (let i = total - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
      const pos = [], shellN = Math.min(Math.floor(total * 0.7), Math.floor((4 * Math.PI * packR * packR) / (3.0 * rad * rad))), inner = total - shellN;
      for (let i = 0; i < total; i++) {
        const onShell = i < shellN, m = onShell ? shellN : inner, k = onShell ? i : i - shellN;
        const phi = Math.acos(1 - 2 * ((k + 0.5) / m)), th = Math.PI * (1 + Math.sqrt(5)) * k + (onShell ? 0 : 1.3), r = total === 1 ? 0 : onShell ? packR : packR * 0.78 * Math.cbrt((k + 0.5) / m);
        pos.push(new THREE.Vector3(r * Math.sin(phi) * Math.cos(th), r * Math.sin(phi) * Math.sin(th), r * Math.cos(phi)));
      }
      nuc = { mesh, kinds, pos, rad, total, hidden: new Set(), R: packR + rad };
      paintNucleus();
      group.add(mesh);
      group.scale.setScalar(1.5 / nuc.R);
    }
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    function paintNucleus(shake = new Map()) {
      for (let i = 0; i < nuc.total; i++) {
        const s = shake.get(i);
        dummy.position.copy(nuc.pos[i]); if (s) dummy.position.add(s.off);
        dummy.scale.setScalar(nuc.hidden.has(i) ? 0 : nuc.rad * (s?.scale ?? 1)); dummy.updateMatrix();
        nuc.mesh.setMatrixAt(i, dummy.matrix);
        nuc.mesh.setColorAt(i, col.set(s?.color ?? (nuc.kinds[i] === 0 ? RED : GRAY)));
      }
      nuc.mesh.instanceMatrix.needsUpdate = true; nuc.mesh.instanceColor.needsUpdate = true;
    }
    const clearEjecta = () => { ejecta.forEach(e => { group.parent?.remove(e.mesh); stage.scene.remove(e.mesh); e.mesh.material.dispose(); }); ejecta = []; };
    const spawn = (color, size, from, dir, speed, opacity = 1, life = 2.4) => {
      const mesh = new THREE.Mesh(sph, new THREE.MeshBasicMaterial({ color, transparent: true, opacity }));
      mesh.scale.setScalar(size); mesh.position.copy(from); stage.scene.add(mesh);
      ejecta.push({ mesh, dir: dir.clone().normalize(), speed, life, age: 0, o: opacity });
    };
    const world = i => group.localToWorld(nuc.pos[i].clone());

    // ---------- 選核種 ----------
    function select(zz, nn, keepLevel = true, ghostFrom = null) {
      z = zz; list = all(z); n = nn; cur = list.find(x => x.n === n) ?? (ghostFrom ? { z, n, a: z + n, hl: 0, stable: false, mode: '', pct: null, ab: null, mass: null, ghost: ghostFrom } : defaultNuclide(list)); n = cur.n;
      if (!keepLevel) level = getLevel();
      anim = null; clearEjecta(); t = 0;
      buildNucleus(cur.z, cur.n);
      history.replaceState(null, '', `#nucleus/${z}`);
      render();
    }

    // ---------- 衰變動畫 ----------
    function startDecay() {
      if (!cur || cur.stable || !cur.mode || anim) return;
      clearEjecta(); nuc.hidden.clear();
      const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      const idx = want => { const ids = nuc.kinds.map((k, i) => i).filter(i => nuc.kinds[i] === want); return ids.reduce((b, i) => (nuc.pos[i].dot(d) > nuc.pos[b].dot(d) ? i : b), ids[0]); };
      const nearest = (want, k) => nuc.kinds.map((kk, i) => i).filter(i => nuc.kinds[i] === want).sort((a, b) => nuc.pos[b].dot(d) - nuc.pos[a].dot(d)).slice(0, k);
      const m = cur.mode;
      anim = { t: 0, m, d, fired: false, who: m === 'B-' ? [idx(1)] : m === 'B+' ? [idx(0)] : m === 'A' ? [...nearest(0, 2), ...nearest(1, 2)] : m === 'P' ? [idx(0)] : m === 'N' ? [idx(1)] : [], done: false };
      render();
    }
    function stepAnim(dt) {
      if (!anim || anim.done) return;
      anim.t += dt; const u = anim.t / ANIM, m = anim.m, shake = new Map();
      const wob = (a = 1) => new THREE.Vector3(Math.sin(anim.t * 40 + a) * 0.025, Math.cos(anim.t * 37 + a * 2) * 0.025, Math.sin(anim.t * 33 + a * 3) * 0.025);
      anim.who.forEach((i, k) => { if (!nuc.hidden.has(i)) shake.set(i, { off: wob(k + 1), scale: 1 + 0.5 * Math.sin(Math.min(1, u / 0.3) * Math.PI), color: u < 0.3 ? 0xffe066 : undefined }); });
      if (u >= 0.3 && !anim.fired) {
        anim.fired = true;
        const o = anim.who.length ? world(anim.who[0]) : group.position.clone(), out = anim.d.clone(), s = group.scale.x;
        if (m === 'B-') { nuc.kinds[anim.who[0]] = 0; spawn(0x4cc9ff, 0.14, o, out, 3.4); if (level === 'high') spawn(0xffffff, 0.07, o, out.clone().negate(), 5.5, 0.45); }
        if (m === 'B+') { nuc.kinds[anim.who[0]] = 1; spawn(0x7dffb0, 0.14, o, out, 3.4); if (level === 'high') spawn(0xffffff, 0.07, o, out.clone().negate(), 5.5, 0.45); }
        if (m === 'A') anim.who.forEach((i, k) => { nuc.hidden.add(i); spawn(nuc.kinds[i] === 0 ? RED : GRAY, nuc.rad * s * 1.1, world(i), out, 2.6); });
        if (m === 'P' || m === 'N') { nuc.hidden.add(anim.who[0]); spawn(m === 'P' ? RED : GRAY, nuc.rad * s * 1.3, o, out, 3.2); }
        if (m === 'SF') for (let k = 0; k < 3; k++) spawn(GRAY, 0.12, group.position.clone(), new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5), 3.5);
        if (m === 'IT') spawn(0xffe066, 0.25, group.position.clone(), out, 4, 0.8, 1.2);
      }
      if (m === 'SF' && u > 0.3) { const k = Math.min(1, (u - 0.3) / 0.5); for (let i = 0; i < nuc.total; i++) shake.set(i, { off: anim.d.clone().multiplyScalar(nuc.pos[i].dot(anim.d) >= 0 ? 0.9 * k : -0.9 * k), scale: 1 }); }
      paintNucleus(shake);
      if (u >= 1) { anim.done = true; paintNucleus(); render(); }
    }
    off = stage.onFrame(dt => {
      stepAnim(dt);
      for (const e of ejecta) { e.age += dt; e.mesh.position.addScaledVector(e.dir, e.speed * dt); e.mesh.material.opacity = e.o * Math.max(0, 1 - e.age / e.life); }
      ejecta = ejecta.filter(e => { if (e.age < e.life) return true; stage.scene.remove(e.mesh); e.mesh.material.dispose(); return false; });
    });

    // ---------- 面板 ----------
    const el = () => BY_Z[z], nm = x => `${L(BY_Z[x.z].name)}-${x.a}`;
    const sym = x => `<span class="nuc-sym"><sup>${x.a}</sup><sub>${x.z}</sub>${esc(BY_Z[x.z].sym)}</span>`;
    const hlText = x => humanHalfLife(x.hl, state.lang);
    const dau = () => (anim?.done ? daughter(cur.z, cur.n, anim.m) : null);
    const dauNuclide = () => { const d = dau(); return d && BY_Z[d.z] && NUCLIDES[d.z]?.some(r => r[0] === d.n) ? nuclide(d.z, NUCLIDES[d.z].find(r => r[0] === d.n)) : null; };

    const dauGhost = () => { const d = dau(); return d && BY_Z[d.z] && !dauNuclide() ? d : null; };
    function isoChips() {
      const shown = listFor(level, list); if (!shown.some(x => x.n === cur.n)) shown.push(cur), shown.sort((a, b) => a.n - b.n);
      return `<div class="nuc-iso">${shown.map(x => `<button class="chip ${x.stable ? 'st' : 'ra'}${x.n === cur.n ? ' on' : ''}" data-n="${x.n}" title="${esc(x.ghost ? '' : x.stable ? Tp('nuc.kid.stable', { el: L(el().name) }) : hlText(x))}">${x.a}</button>`).join('')}</div>`;
    }
    function resultHTML() {
      if (!anim?.done) return '';
      const d = dau(), dn = dauNuclide();
      const res = d && BY_Z[d.z] ? `<p class="nuc-res">➜ ${T('nuc.result', { nm: `${L(BY_Z[d.z].name)}-${d.z + d.n}`, p: d.z, n: d.n })}</p>` : `<p class="nuc-res">${T('nuc.result.sf')}</p>`;
      return `<div class="nuc-result">${res}<p>${T('nuc.mode.' + anim.m)}</p></div>`;
    }
    function dotsHTML() {
      if (cur.stable) return '';                       // 穩定:沒有東西可看(底下的操作列已經說明了)
      const slider = level === 'kid'
        ? `<div class="nuc-row"><button class="btn" data-act="next">⏩ ${T('nuc.dots.next')}</button><button class="btn alt" data-act="reset">↺ ${T('nuc.dots.reset')}</button></div>`
        : `<label class="nuc-slider">${T('nuc.dots.slider')} <input type="range" min="0" max="${T_MAX}" step="0.05" value="${t}" aria-label="${Tp('nuc.dots.slider')}"></label><button class="btn alt" data-act="reset">↺ ${T('nuc.dots.reset')}</button>`;
      return `<div class="nuc-dotsbox"><b>${T('nuc.dots.title', { iso: nm(cur) })}</b><div class="nuc-dots">${Array.from({ length: DOTS }, (_, i) => `<i data-i="${i}"></i>`).join('')}</div><div class="nuc-dotread"></div>${slider}<p class="nuc-note">${T('nuc.dots.rand')}</p></div>`;
    }
    function paintDots() {
      if (cur.stable) return;
      side.querySelectorAll('.nuc-dots i').forEach((d, i) => d.classList.toggle('gone', times[i] <= t));
      const left = countLeft(times, t), k = +t.toFixed(2);
      side.querySelector('.nuc-dotread').innerHTML = `<div>${T('nuc.dots.left', { n: left, total: DOTS, pct: left })}</div><div>${T('nuc.dots.time', { k, t: humanHalfLife(cur.hl * t, state.lang) || '0' })}</div>${level !== 'kid' ? `<div class="nuc-theory">${T('nuc.dots.theory', { k, pct: fmtPct(fractionLeft(t) * 100) })}</div>` : ''}`;
      const cv = side.querySelector('.nuc-curve circle.mk'); if (cv) { cv.setAttribute('cx', (6 + (t / T_MAX) * 288).toFixed(1)); cv.setAttribute('cy', (8 + (1 - fractionLeft(t)) * 82).toFixed(1)); const q = side.querySelector('.nuc-curve rect.sm'); if (q) { q.setAttribute('x', (3 + (t / T_MAX) * 288).toFixed(1)); q.setAttribute('y', (5 + (1 - left / DOTS) * 82).toFixed(1)); } }
    }
    function curveHTML() {
      const X = v => 6 + (v / T_MAX) * 288, Y = f => 8 + (1 - f) * 82;
      const path = Array.from({ length: 61 }, (_, i) => { const v = (i / 60) * T_MAX; return `${i ? 'L' : 'M'}${X(v).toFixed(1)},${Y(fractionLeft(v)).toFixed(1)}`; }).join('');
      const grid = Array.from({ length: T_MAX + 1 }, (_, k) => `<line x1="${X(k)}" x2="${X(k)}" y1="8" y2="90" stroke="#ffffff22"/><text x="${X(k)}" y="103" font-size="9" fill="#b8c0ee" text-anchor="middle">${k}</text>`).join('')
        + [[1, '1'], [0.5, '½'], [0.25, '¼'], [0.125, '⅛']].map(([f, s]) => `<line x1="6" x2="294" y1="${Y(f)}" y2="${Y(f)}" stroke="#ffffff22"/><text x="3" y="${Y(f) - 2}" font-size="9" fill="#b8c0ee">${s}</text>`).join('');
      return `<svg class="nuc-curve" viewBox="0 0 300 108" role="img" aria-label="decay curve">${grid}<path d="${path}" fill="none" stroke="#7fd6f5" stroke-width="1.8"/><rect class="sm" x="3" y="5" width="6" height="6" fill="#ffd23f" fill-opacity=".9"/><circle class="mk" cx="6" cy="8" r="3.4" fill="#ff9d5c"/></svg>`;
    }
    function avgHTML() {
      const nat = list.filter(x => x.ab != null);
      if (!nat.length) return `<p>${T('nuc.teen.avg.none', { el: L(el().name) })}</p>`;
      const hue = i => ['#5b7cff', '#ffb84d', '#4ddb9a', '#ff7aa8', '#b58cff', '#6fd3ff', '#ffe066'][i % 7];
      const bar = `<div class="nuc-bar">${nat.map((x, i) => `<span style="flex:${Math.max(x.ab, 0.8)} 1 0;background:${hue(i)}"></span>`).join('')}</div>` +
        `<ul class="nuc-ablist">${nat.map((x, i) => `<li><i style="background:${hue(i)}"></i><b>${L(el().name)}-${x.a}</b><span>${fmtAb(x.ab)}%</span></li>`).join('')}</ul>`;
      if (nat.length === 1) return `<p><b>${T('nuc.teen.nat')}</b></p>${bar}<p>${T('nuc.teen.avg.one', { el: L(el().name), a: nat[0].a })}</p>`;
      const avg = averageMass(nat), terms = nat.map(x => `${x.mass.toFixed(x.mass >= 100 ? 2 : 3)}×${+x.ab.toFixed(2)}%`).join(' + ');
      return `<p><b>${T('nuc.teen.nat')}</b></p>${bar}<p>${T('nuc.teen.avg')}</p><div class="nuc-formula">${terms} = ${avg.toFixed(avg >= 100 ? 2 : 3)} u<br>${T('nuc.teen.tablevalue', { m: el().mass })}</div>`;
    }
    function chartCanvas() {
      const W = 300, H = 210, cv = document.createElement('canvas'); cv.className = 'nuc-chart'; cv.width = W * 2; cv.height = H * 2; cv.style.aspectRatio = `${W}/${H}`;
      const g = cv.getContext('2d'); g.scale(2, 2);
      const maxN = 180, maxZ = 120, X = nn => 14 + (nn / maxN) * (W - 18), Y = zz => H - 12 - (zz / maxZ) * (H - 18), cw = (W - 18) / maxN, ch = (H - 18) / maxZ;
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(14, 6, W - 18, H - 18);
      g.fillStyle = 'rgba(255,210,63,.18)'; g.fillRect(14, Y(z + 0.5), W - 18, ch);
      for (const zz of Object.keys(NUCLIDES)) for (const r of NUCLIDES[zz]) {
        const hl = r[1]; g.fillStyle = hl === 0 ? '#4ade80' : `hsl(${Math.max(0, Math.min(50, 8 * (Math.log10(hl) + 6) / 2.6))} 90% 58%)`;
        g.fillRect(X(r[0]), Y(+zz + 0.5), Math.max(1.4, cw), Math.max(1.4, ch));
      }
      g.strokeStyle = '#ffd23f'; g.lineWidth = 1; g.strokeRect(14, Y(z + 0.5) - 0.5, W - 18, ch + 1);
      g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.arc(X(cur.n) + cw / 2, Y(z + 0.5) + ch / 2, 4.4, 0, 7); g.stroke();
      g.fillStyle = '#b8c0ee'; g.font = '8px sans-serif'; g.textAlign = 'center';
      for (const v of [0, 50, 100, 150]) g.fillText(v, X(v), H - 2);
      g.textAlign = 'right'; for (const v of [0, 40, 80, 118]) g.fillText(v, 11, Y(v) + 3);
      g.textAlign = 'left'; g.fillText('N →', W - 28, H - 14); g.fillText('Z ↑', 15, 14);
      return cv;
    }
    function ghostHTML() {
      const g = cur.ghost, extra = cur.z === 4 && cur.n === 4 ? ` ${T('nuc.ghost.be8')}` : '';
      return `<p class="nuc-state"><b>${nm(cur)}</b> ${level !== 'kid' ? sym(cur) : ''} — ${T('nuc.count', { p: cur.z, n: cur.n, a: cur.a })}</p><p>${T('nuc.ghost', { nm: nm(cur) })}${extra}</p>`;
    }
    function infoHTML() {
      const p = [`<p class="nuc-lead">${T('nuc.lead.' + level)}</p>`];
      p.push(`<p class="nuc-state"><b>${nm(cur)}</b> ${level !== 'kid' ? sym(cur) : ''} — ${T('nuc.count', { p: cur.z, n: cur.n, a: cur.a })}</p>`);
      if (level !== 'kid') p.push(`<p class="nuc-note">${T('nuc.symnote', { sym: esc(el().sym), a: cur.a, z: cur.z })}</p>`);
      if (level === 'kid') p.push(`<p>${T('nuc.kid.same', { el: L(el().name), p: cur.z })}</p>`);
      p.push(`<p>${cur.stable ? T('nuc.kid.stable', { el: L(el().name) }) : T('nuc.kid.radio', { el: L(el().name) })} ${cur.stable ? '' : T('nuc.kid.hl', { t: hlText(cur) })}</p>`);
      const use = useOf(cur.z, cur.a); if (use) p.push(`<p class="nuc-use">💡 ${esc(use[state.lang] ?? use.zh)}</p>`);
      if (level !== 'kid') p.push(`<p>${T('nuc.teen.chem')}</p>`, avgHTML());
      if (level === 'high') {
        const q = quarks(cur.z, cur.n);
        p.push(`<p><b>${T('nuc.high.quark.t')}</b></p><p>${T('nuc.high.quark', { u: q.u, d: q.d, q: q.total, z: q.charge })}</p><p class="nuc-note">${T('nuc.high.quark.note')}</p>`);
        if (!cur.stable) {
          const lam = lambda(cur.hl), tau = meanLife(cur.hl), sci = v => { const e = Math.floor(Math.log10(v)); return `${(v / 10 ** e).toFixed(3)}×10<sup>${e}</sup>`; };
          p.push(`<p><b>${T('nuc.high.law')}</b></p><div class="nuc-formula">N(t) = N₀ · (½)<sup>t/T</sup> = N₀ · e<sup>−λt</sup><br>λ = ln 2 / T = ${sci(lam)} s⁻¹<br>τ = 1/λ = T / ln 2 ≈ ${humanHalfLife(tau, state.lang)}</div><p class="nuc-note">${T('nuc.high.law.note')}</p>`);
        }
        p.push(`<p><b>${T('nuc.high.why')}</b></p><p>${cur.stable ? T('nuc.high.stable') : cur.mode ? T('nuc.high.mode.' + cur.mode) : ''}</p>`);
      }
      if (level === 'teen' && cur.z === 6 && cur.a === 14) p.push(`<p>${T('nuc.teen.dating')}</p>`);
      if (level === 'high' && cur.z === 6 && cur.a === 14) p.push(`<p>${T('nuc.teen.dating')}</p>`);
      p.push(`<p class="nuc-note">${T('nuc.honest')}</p>`);
      if (!cur.stable && cur.hl < 1) p.push(`<p class="nuc-note">${T('nuc.rare')}</p>`);
      if (anim) p.push(`<p class="nuc-note">${T('nuc.honest.decay')}</p>`);
      p.push(`<p class="nuc-src">${T('nuc.source', { d: NUCLIDE_META.extraction })} <a href="${NUCLIDE_META.url}" target="_blank" rel="noopener noreferrer">IAEA</a></p>`);
      return p.join('');
    }

    function render() {
      const e = el(), dn = dauNuclide(), gd = dauGhost(), gh = cur.ghost;
      side.dataset.level = level;
      side.innerHTML = `
        <h2>⚛️ ${LH(e.name)} <small>${T('nuc.title')}</small></h2>
        <div class="cl-bar"><button class="chip nuc-back" aria-label="${Tp('nuc.back')}">←<span class="lbl"> ${T('nuc.back')}</span></button>${levelChipsHTML(level)}</div>
        <div><b>${T('nuc.iso')}</b> ${isoChips()}</div>
        ${gh ? '' : resultHTML()}
        <div class="nuc-info">${gh ? ghostHTML() : infoHTML()}</div>
        ${gh ? '' : dotsHTML()}
        ${level !== 'kid' && !cur.stable && !gh ? `<div class="nuc-curvebox">${curveHTML()}<p class="nuc-note">${T('nuc.teen.curve')}</p></div>` : ''}
        ${level === 'high' && !gh ? `<div class="nuc-chartbox"><b>${T('nuc.high.chart.t')}</b><div class="nuc-chartslot"></div><p class="nuc-note">${T('nuc.high.chart')}</p></div>` : ''}
        <div class="nuc-actions">
          ${gh ? `<button class="btn alt" data-act="ghostback">↺ ${T('nuc.ghost.back', { nm: `${L(BY_Z[cur.ghost.z].name)}-${cur.ghost.z + cur.ghost.n}` })}</button>` : cur.stable ? `<span class="nuc-note">${T('nuc.stable.note')}</span>` : anim?.done ? `<button class="btn alt" data-act="again">↺ ${T('nuc.act.again')}</button>` : `<button class="btn" data-act="decay"${anim ? ' disabled' : ''}>⚛️ ${T('nuc.act.decay')}</button>`}
          ${dn || gd ? `<button class="btn" data-act="daughter">➜ ${T('nuc.go.daughter')}</button>` : ''}
        </div>`;
      const iso = side.querySelector('.nuc-iso'), on = iso.querySelector('.on');   // 清單很長時,讓選到的那一顆停在可見的位置(只捲清單自己,不動整個面板)
      if (on) {                                                    // 對齊整排,不會露出半排:最後一排也要能捲到最上面,所以底部補一排的空間
        const rowH = on.offsetHeight + 5;
        if (iso.scrollHeight > iso.clientHeight) iso.style.paddingBottom = `${Math.max(4, iso.clientHeight - on.offsetHeight - 4)}px`;
        iso.scrollTop = Math.floor((on.offsetTop - iso.offsetTop - 4) / rowH) * rowH;
      }
      side.querySelector('.nuc-chartslot')?.appendChild(chartCanvas());
      side.querySelector('.nuc-back').onclick = () => { setNextTab('info'); go('atom', z); };
      bindLevelChips(side, l => { level = l; render(); });
      side.querySelectorAll('.nuc-iso [data-n]').forEach(b => b.onclick = () => select(z, +b.dataset.n));
      side.querySelector('[data-act=decay]')?.addEventListener('click', startDecay);
      side.querySelector('[data-act=again]')?.addEventListener('click', () => { anim = null; clearEjecta(); buildNucleus(cur.z, cur.n); render(); });
      side.querySelector('[data-act=daughter]')?.addEventListener('click', () => { const d = dau(); select(d.z, d.n, true, dn ? null : { z: cur.z, n: cur.n }); });
      side.querySelector('[data-act=ghostback]')?.addEventListener('click', () => select(cur.ghost.z, cur.ghost.n));
      side.querySelector('[data-act=next]')?.addEventListener('click', () => { t = Math.min(T_MAX, Math.floor(t + 1e-9) + 1); paintDots(); });
      side.querySelectorAll('[data-act=reset]').forEach(b => b.addEventListener('click', () => { t = 0; const s = side.querySelector('.nuc-slider input'); if (s) s.value = 0; paintDots(); }));
      side.querySelector('.nuc-slider input')?.addEventListener('input', ev => { t = +ev.target.value; paintDots(); });
      paintDots();
    }

    stage.setCenterShift(() => (isNarrow() ? 0 : side.offsetWidth / 2));
    select(z, BY_Z[startZ] ? (all(z).find(x => x.a === (z === 6 ? 14 : -1)) ? 8 : defaultNuclide(all(z)).n) : 8);
  });

  return { dispose() { dead = true; off?.(); stage.dispose(); } };
}
