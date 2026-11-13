import * as THREE from 'three';
import { isNarrow } from '../ui/layout.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { REACTIONS, checkBalance } from '../data/reactions.js';
import { MOL } from '../data/molecules.js';
import { BY_SYMBOL } from '../data/elements.js';
import { createStage } from '../three/stage.js';
import { buildMolecule, molRadius, atomMaterial, atomRadius, sphereGeo } from '../three/mol.js';
import { T, Tp, L, LH, formulaHTML } from '../i18n/index.js';
import { update, addUnique, badgeName } from '../game/store.js';
import { toast } from '../ui/toast.js';
import { speak, canSpeak, stopSpeaking } from '../ui/speech.js';
import { getLevel, forLevel } from '../ui/level.js';
import { storyFor, conservation, countText } from '../game/rxfacts.js';

// 時間軸(秒)
const TA = 2.6, TB = 3.6, TC = 6.4, TEND = 9.5;
const ease = x => THREE.MathUtils.smoothstep(x, 0, 1);      // 0~1 的平滑曲線(three.js 內建,自動夾在 0~1)
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

if (import.meta.env?.DEV) REACTIONS.forEach(r => { if (!checkBalance(r)) console.warn('反應未平衡', r.id); });

export function mount(container, startId) {
  const stage = createStage(container, { camPos: [0, 1.5, 14] });
  // 反應清單依階段:國小 6 個最常見的、國中多 2 個、高中全部;從別處指定的反應即使超出階段也放進清單
  const level = getLevel(), items = forLevel(REACTIONS, level);
  let cur = REACTIONS.find(r => r.id === startId) || items[0];
  if (!items.includes(cur)) items.push(cur);
  let scene3 = null;        // 目前反應的 3D 物件集合
  let t = 0, playing = true, finished = false;

  const list = document.createElement('div'); list.className = 'list rx';
  const bar = document.createElement('div'); bar.className = 'stage-bar';
  container.append(list, bar);

  // ---- 建立某個反應的場景 ----
  function build(r) {
    const root = new THREE.Group(); stage.scene.add(root);
    const expand = side => side.flatMap(([id, n]) => Array.from({ length: n }, () => id));
    const rIds = expand(r.reactants), pIds = expand(r.products);
    const n = Math.max(rIds.length, pIds.length);
    const sc = n > 8 ? 0.55 : n > 4 ? 0.8 : 1;

    const mk = (id, labelOn) => {
      const g = buildMolecule(MOL[id], { style: 'ball' });
      g.scale.setScalar(sc); root.add(g);
      const div = document.createElement('div'); div.className = 'label3d';
      div.style.cssText = 'background:rgba(27,35,80,.85);padding:2px 10px;border-radius:999px;font-size:15px';
      div.innerHTML = formulaHTML(MOL[id].formula);
      const lab = new CSS2DObject(div); lab.position.set(0, (molRadius(g) + 0.7) , 0); g.add(lab);
      g.userData.label = lab; g.userData.R = molRadius(g) * sc;
      return g;
    };
    const react = rIds.map(id => mk(id)), prods = pIds.map(id => mk(id));
    const rand = rng(r.id.length * 997 + 13);

    // 版面:大分子放中央,其餘排成橢圓
    const layout = (groups, radius) => groups.map((g, i) => {
      const big = g.userData.R > 3.2;
      const others = groups.filter(x => !(x.userData.R > 3.2));
      if (big) return new THREE.Vector3(0, 0, 0);
      const k = others.indexOf(g), m = others.length;
      if (groups.length === 1) return new THREE.Vector3(0, 0, 0);
      const a = -Math.PI / 2 + (k / m) * Math.PI * 2 + 0.4;
      return new THREE.Vector3(Math.cos(a) * radius * 1.45, Math.sin(a) * radius * 0.8, Math.sin(a * 2) * 0.8);
    });
    const hasBig = react.concat(prods).some(g => g.userData.R > 3.2);
    const S = layout(react, hasBig ? 7 : 5.2).map(p => p.clone().multiplyScalar(1.0));
    const C = layout(react, hasBig ? 3.8 : 1.4 + react.length * 0.25);
    const F = layout(prods, hasBig ? 5.2 : 3.2 + prods.length * 0.2);
    if (prods.length === 2 && !hasBig) { F[0].set(-3, 0.5, 0); F[1].set(3, -0.5, 0); }
    if (react.length === 2) { S[0].set(-6.5, 0.5, 0); S[1].set(6.5, -0.5, 0); C[0].set(-1.4, 0, 0); C[1].set(1.4, 0, 0); }
    if (react.length === 1) { S[0].set(0, 0, 0); C[0].set(0, 0, 0); }

    const rot0 = react.map(() => new THREE.Vector3(rand() * 6, rand() * 6, rand() * 6));
    const spinAt = (i, time) => { const s = Math.min(time, TA); return [rot0[i].x + s * 0.8, rot0[i].y + s * 1.1, rot0[i].z]; };

    // 計算碰撞時反應物原子的世界座標 W,產物最終座標 P,並配對
    react.forEach((g, i) => { g.position.copy(C[i]); g.rotation.set(...spinAt(i, TA)); g.updateMatrixWorld(true); });
    prods.forEach((g, j) => { g.position.copy(F[j]); g.rotation.set(0, 0, 0); g.updateMatrixWorld(true); });
    const W = [], P = [];
    react.forEach(g => g.userData.atoms.forEach(m => W.push({ sym: m.userData.sym, pos: m.getWorldPosition(new THREE.Vector3()) })));
    prods.forEach(g => g.userData.atoms.forEach(m => P.push({ sym: m.userData.sym, pos: m.getWorldPosition(new THREE.Vector3()) })));
    const used = new Set(), pair = [];
    P.forEach(p => {
      let best = -1, bd = 1e9;
      W.forEach((w, k) => { if (!used.has(k) && w.sym === p.sym) { const d = w.pos.distanceTo(p.pos); if (d < bd) { bd = d; best = k; } } });
      used.add(best); pair.push(best);
    });
    const fliers = P.map((p, idx) => {
      const w = W[pair[idx]];
      const m = new THREE.Mesh(sphereGeo, atomMaterial(BY_SYMBOL[p.sym].color));
      m.scale.setScalar(atomRadius(p.sym, 'ball') * sc);
      root.add(m);
      const swirl = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(5);
      return { m, from: w.pos, to: p.pos, swirl };
    });
    react.concat(prods).forEach(g => { g.userData.label.visible = true; });

    // ---- 特效 ----
    const fxObjs = [];
    const center = new THREE.Vector3(0, 0, 0);
    const points = (count, color, size) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
      const mat = new THREE.PointsMaterial({ color, size, transparent: true, depthWrite: false, opacity: 1 });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.visible = false; root.add(pts);
      return { pts, geo, mat, count, seed: Array.from({ length: count }, () => [rand(), rand(), rand(), rand()]) };
    };
    // 碰撞爆發
    const bursts = points(80, r.effect === 'fire' ? 0xff8a2a : r.effect === 'electric' ? 0x6ad4ff : 0xffd23f, 0.22);
    fxObjs.push(t2 => {
      const tau = t2 - TA;
      bursts.pts.visible = tau > 0 && tau < 1.6;
      if (!bursts.pts.visible) return;
      const p = bursts.geo.attributes.position;
      bursts.seed.forEach((s, i) => {
        const th = s[0] * 6.283, ph = Math.acos(2 * s[1] - 1), sp = 1.2 + s[2] * 3.5;
        p.setXYZ(i, Math.sin(ph) * Math.cos(th) * sp * tau, Math.sin(ph) * Math.sin(th) * sp * tau, Math.cos(ph) * sp * tau);
      });
      p.needsUpdate = true; bursts.mat.opacity = 1 - tau / 1.6;
    });
    if (r.effect === 'fire') {
      const fire = points(90, 0xff6a1a, 0.3);
      fxObjs.push(t2 => {
        fire.pts.visible = t2 > TA && t2 < TC + 0.6;
        if (!fire.pts.visible) return;
        const p = fire.geo.attributes.position;
        fire.seed.forEach((s, i) => {
          const ph = ((t2 * (0.5 + s[2] * 0.6) + s[3]) % 1);
          p.setXYZ(i, (s[0] - 0.5) * 3.5, -1 + ph * 4.5, (s[1] - 0.5) * 2);
        });
        p.needsUpdate = true; fire.mat.opacity = 0.9;
        fire.mat.color.setHex(Math.floor(t2 * 8) % 2 ? 0xff6a1a : 0xffc233);
      });
    }
    if (r.effect === 'electric') {
      const bolts = [0, 1, 2].map(() => {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 10 }, () => new THREE.Vector3())),
          new THREE.LineBasicMaterial({ color: 0x9be8ff }));
        line.visible = false; root.add(line); return line;
      });
      fxObjs.push(t2 => {
        const on = t2 > 0.4 && t2 < TB + 0.6;
        const rr = rng(Math.floor(t2 * 14) + 5);
        bolts.forEach((b, k) => {
          b.visible = on; if (!on) return;
          const a = rr() * 6.283, pts = [];
          for (let i = 0; i < 10; i++) {
            const f = i / 9;
            pts.push(new THREE.Vector3(Math.cos(a + k * 2.1) * 6 * (1 - f) + (rr() - 0.5) * 0.9, Math.sin(a + k * 2.1) * 3.5 * (1 - f) + (rr() - 0.5) * 0.9, (rr() - 0.5) * 0.8));
          }
          b.geometry.setFromPoints(pts);
        });
      });
    }
    if (r.effect === 'light') {
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
      sun.position.set(-7, 4.2, -1); root.add(sun);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.25 }));
      halo.position.copy(sun.position); root.add(halo);
      const beams = [0, 1, 2].map(k => {
        const geo = new THREE.BufferGeometry().setFromPoints([sun.position.clone(), new THREE.Vector3((k - 1) * 1.5, (k - 1) * 0.6, 0)]);
        const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.8 })); root.add(l); return l;
      });
      fxObjs.push(t2 => {
        const on = t2 < TC;
        sun.visible = halo.visible = on; beams.forEach(b => { b.visible = on; });
        halo.scale.setScalar(1 + Math.sin(t2 * 5) * 0.12);
      });
    }
    if (r.effect === 'bubble' || r.id === 'bubble') {
      const bub = Array.from({ length: 16 }, (_, i) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.18 + rand() * 0.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.45 }));
        m.visible = false; root.add(m); return { m, x: (rand() - 0.5) * 5, ph: rand(), sp: 0.3 + rand() * 0.4, z: (rand() - 0.5) * 2 };
      });
      fxObjs.push(t2 => bub.forEach(b => {
        b.m.visible = t2 > TB;
        if (!b.m.visible) return;
        const k = ((t2 - TB) * b.sp + b.ph) % 1;
        b.m.position.set(b.x + Math.sin(t2 * 3 + b.ph * 9) * 0.2, -2 + k * 7, b.z);
      }));
    }
    const note = r.effect === 'slow';

    function apply(time) {
      react.forEach((g, i) => {
        g.visible = time < TB;
        const u = ease(time / TA);
        g.position.lerpVectors(S[i], C[i], u);
        const [rx, ry, rz] = spinAt(i, time); g.rotation.set(rx, ry, rz);
        if (time > TA) {
          const k = THREE.MathUtils.clamp((time - TA) / (TB - TA), 0, 1), amp = Math.sin(Math.PI * k) * 0.14, q = Math.floor(time * 30) + i * 7;
          const rr = rng(q);
          g.position.add(new THREE.Vector3(rr() - 0.5, rr() - 0.5, rr() - 0.5).multiplyScalar(amp * 2));
          g.userData.bonds.scale.setScalar(Math.max(0.001, 1 - k));
        } else g.userData.bonds.scale.setScalar(1);
        g.userData.label.visible = time < TA + 0.3;
      });
      fliers.forEach(f => {
        f.m.visible = time >= TB && time < TC;
        if (!f.m.visible) return;
        const u = ease((time - TB) / (TC - TB));
        f.m.position.lerpVectors(f.from, f.to, u).addScaledVector(f.swirl, Math.sin(Math.PI * u) * 0.7 * (1 - u * 0.2));
      });
      prods.forEach((g, j) => {
        g.visible = time >= TC;
        g.position.copy(F[j]);
        g.position.y += Math.sin(time * 2 + j) * 0.08 * ease((time - TC) / 1.2);
        g.rotation.set(0, 0, 0);
        const k = ease((time - TC) / 0.9);
        g.userData.bonds.scale.setScalar(Math.max(0.001, k));
        g.userData.label.visible = time >= TC + 0.5;
      });
      fxObjs.forEach(fn => fn(time));
    }
    function dispose() {
      [...react, ...prods].forEach(g => { g.userData.label.element.remove(); });
      stage.scene.remove(root);
      root.traverse(o => { if (o.isMesh || o.isPoints || o.isLine) { if (o.geometry !== sphereGeo) o.geometry?.dispose?.(); } });
    }
    return { apply, dispose, note };
  }

  function select(r) {
    scene3?.dispose();
    cur = r; scene3 = build(r); t = 0; playing = true; finished = false;
    renderList(); renderBar();
  }

  function eqHTML(r) {
    const side = s => s.map(([id, n]) => `${n > 1 ? n + ' ' : ''}${formulaHTML(MOL[id].formula)}`).join(' + ');
    return `${side(r.reactants)} → ${side(r.products)}`;
  }
  function renderList() {
    list.innerHTML = '';
    items.forEach(r => {
      const b = document.createElement('button');
      if (r.id === cur.id) b.className = 'active';
      b.innerHTML = LH(r.name);
      b.onclick = () => select(r);
      list.appendChild(b);
    });
  }
  /** 國中/高中:原子守恆、吸放熱;高中再加反應類型、條件、反應熱。國小不顯示 */
  function infoHTML(r) {
    if (level === 'kid') return '';
    const c = conservation(r), rows = [], hi = level === 'high';
    const heatName = Tp('rx.heat.' + r.heat);
    if (hi) {
      rows.push(T('rx.type', { t: L(r.type) }), T('rx.cond', { c: L(r.cond) }));
      rows.push(r.dH !== undefined ? `${T('rx.heat', { h: heatName })}:${T('rx.dH', { v: (r.dH > 0 ? '+' : '−') + Math.abs(r.dH) })}` : T('rx.heat', { h: heatName }));
    } else rows.push(T('rx.heat', { h: heatName, d: Tp('rx.heat.d.' + r.heat) }));
    rows.push(T('rx.cons', { l: countText(c.left), r: countText(c.right) }));
    return `<div class="rx-info">${rows.map(x => '📊 ' + x).join('<br>')}</div>`;
  }
  let slider, playBtn, noteEl;
  function renderBar() {
    bar.innerHTML = `
      <div class="equation">${eqHTML(cur)}</div>
      <div style="margin:4px 0"><b>${LH(cur.name)}</b> — ${LH(storyFor(cur, level))}</div>
      ${infoHTML(cur)}
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn" id="play"></button>
        <button class="btn alt" id="replay">↺ ${T('rx.replay')}</button>
        <input type="range" id="seek" min="0" max="${TEND * 100}" value="0" style="flex:1;min-width:120px">
        ${canSpeak() ? '<button class="btn alt" id="say">🔊</button>' : ''}
        <span id="note" style="display:none">⏩ ${T('rx.slow')}</span>
      </div>`;
    slider = bar.querySelector('#seek'); playBtn = bar.querySelector('#play'); noteEl = bar.querySelector('#note');
    playBtn.onclick = () => { if (finished) { t = 0; finished = false; } playing = !playing; setPlayLabel(); };
    bar.querySelector('#replay').onclick = () => { t = 0; playing = true; finished = false; setPlayLabel(); };
    slider.oninput = () => { t = slider.value / 100; playing = false; finished = false; setPlayLabel(); };
    bar.querySelector('#say')?.addEventListener('click', () => speak(`${L(cur.name)}。${L(storyFor(cur, level))}`));
    setPlayLabel();
  }
  function setPlayLabel() { if (playBtn) playBtn.innerHTML = playing ? '⏸ ' + T('rx.pause') : '▶ ' + T('rx.play'); }

  const desk = () => !isNarrow();
  // 桌面版:右側清單、下方控制列會遮住畫面,把畫面中心移到剩餘空間的中央
  stage.setCenterShift(() => (desk() ? [-list.offsetWidth / 2, bar.offsetHeight / 2] : 0));
  let lastSize = '';
  stage.onFrame(dt => {
    if (!scene3) return;
    const W = stage.el.clientWidth, H = stage.el.clientHeight;
    if (lastSize !== W + 'x' + H) { // 依可用空間調整相機距離,確保整個舞台都看得到
      lastSize = W + 'x' + H;
      const t = Math.tan((stage.camera.fov * Math.PI) / 360);
      const uw = W - (desk() ? list.offsetWidth + 30 : 0), uh = H - (desk() ? bar.offsetHeight + 20 : 0);
      const zw = 12.5 / (t * Math.max(0.3, uw / H)), zh = 5.6 / (t * Math.max(0.3, uh / H));
      stage.camera.position.setLength(Math.max(14, zw, zh));
    }
    if (playing) {
      t += dt * (scene3.note && t > TA && t < TC ? 0.6 : 1);
      if (t >= TEND) { t = TEND; playing = false; if (!finished) { finished = true; done(); } setPlayLabel(); }
    }
    scene3.apply(t);
    if (slider && document.activeElement !== slider) slider.value = t * 100;
    if (noteEl) noteEl.style.display = scene3.note && t > TA && t < TC ? '' : 'none';
  });
  function done() {
    const news = update(d => addUnique(d.reactions, cur.id));
    news.forEach(b => toast(`${b.icon} ${Tp('badge.new')}${L(badgeName(b, getLevel()))}`, 3000));
  }

  select(cur);
  return { dispose() { stopSpeaking(); scene3?.dispose(); stage.dispose(); list.remove(); bar.remove(); } };
}
