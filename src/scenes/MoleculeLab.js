import * as THREE from 'three';
import { isNarrow } from '../ui/layout.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { BY_SYMBOL } from '../data/elements.js';
import { LAB_TARGETS, VALENCE, composition, matchMolecule } from '../data/molecules.js';
import { createStage } from '../three/stage.js';
import { atomMaterial, atomRadius, sphereGeo, cylGeo, bondMat, ionicMat, burst } from '../three/mol.js';
import { T, Tp, L, LH, formulaHTML, state } from '../i18n/index.js';
import { update, addUnique, progress } from '../game/store.js';
import { toast } from '../ui/toast.js';

const TRAY = ['H', 'C', 'N', 'O', 'Na', 'Cl'];
const SIZE = 1.5;           // 實驗室裡原子放大倍率
const MAX_ATOMS = 40;
const UP = new THREE.Vector3(0, 1, 0);

// 空手光暈貼圖(黃色柔光)
const glowMat = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 14, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.0)'); grd.addColorStop(0.55, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
})();

export function mount(container) {
  const stage = createStage(container, { camPos: [0, 0, 12], controls: false });
  const atoms = [];   // {id, sym, mesh, vel, r}
  const bonds = [];   // {a, b, order, group}
  let nextId = 1, dragging = null, scissors = false, hintOpen = false;
  let missionOpen = !isNarrow();   // 手機預設收合,留空間給原子
  const bursts = [];
  const celebrated = new Set();   // 已慶祝過的組成(以原子 id 排序做 key)
  const labels = new Map();       // comp key → CSS2DObject

  const built = new Set(progress().built);

  // ---------- UI ----------
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.innerHTML = `<span>${T('lab.hint')}</span>`;
  const mission = document.createElement('div');
  mission.className = 'side mission';
  const tray = document.createElement('div');
  tray.className = 'tray';
  container.append(hint, mission, tray);

  TRAY.forEach(sym => {
    const b = document.createElement('button');
    b.className = 'atom-btn'; b.textContent = sym;
    b.style.background = BY_SYMBOL[sym].color;
    b.title = L(BY_SYMBOL[sym].name);
    b.onclick = () => { if (scissors) setScissors(false); spawn(sym); };
    tray.appendChild(b);
  });
  const sep = document.createElement('span'); sep.style.flex = '1'; tray.appendChild(sep);
  const bScissors = document.createElement('button');
  bScissors.className = 'btn alt'; bScissors.innerHTML = '✂️<span class="lbl"> ' + T('lab.scissors') + '</span>'; bScissors.setAttribute('aria-label', Tp('lab.scissors'));
  // 剪刀模式:開啟時按鈕變黃;加新原子、清空、點畫面空白處都會自動關閉,不用再點一次剪刀
  function setScissors(on, say = false) {
    scissors = on;
    bScissors.className = 'btn ' + (on ? '' : 'alt');
    stage.el.style.cursor = on ? 'crosshair' : '';
    if (on && say) dispatchEvent(new CustomEvent('mascot', { detail: { type: 'say', text: Tp('lab.scissors.on'), ms: 7000 } }));
  }
  bScissors.onclick = () => setScissors(!scissors, true);
  const bClear = document.createElement('button');
  bClear.className = 'btn alt'; bClear.innerHTML = '🗑️<span class="lbl"> ' + T('lab.clear') + '</span>'; bClear.setAttribute('aria-label', Tp('lab.clear'));
  bClear.onclick = () => { setScissors(false); clearAll(); };
  tray.append(bScissors, bClear);

  /** 組裝提示:有手寫的 howto 就用,否則依化學鍵自動列出「誰要牽誰」 */
  function howTo(m) {
    if (m.howto) return L(m.howto);
    const cnt = new Map();
    m.bonds.forEach(([i, j]) => { const k = [m.atoms[i][0], m.atoms[j][0]].sort().join('–'); cnt.set(k, (cnt.get(k) || 0) + 1); });
    const list = [...cnt].map(([k, n]) => k + (n > 1 ? '×' + n : '')).join(state.lang === 'zh' ? '、' : ', ');
    return Tp('lab.howto', { list });
  }
  function renderMission() {
    const items = LAB_TARGETS.map(m => {
      const comp = composition(m.labPair ? m.labPair.atoms : m.atoms.map(a => a[0]));
      const recipe = Object.entries(comp).map(([s, n]) => `${s}${n > 1 ? '×' + n : ''}`).join(' + ');
      const done = built.has(m.id);
      return `<button class="btn m-card ${done ? '' : 'alt'}" data-id="${m.id}"><span class="m-name">${done ? '⭐' : '❓'} ${LH(m.name)}</span>${done ? `<small>${formulaHTML(m.display || m.formula)}</small>` : ''}${hintOpen ? `<small class="m-recipe">${recipe}</small>` : ''}</button>`;
    }).join('');
    mission.innerHTML = `<b id="m-head" style="cursor:pointer">🎯 ${T('lab.missions')} ${built.size}/${LAB_TARGETS.length} ${missionOpen ? '▾' : '▸'}</b>
      <div class="progress"><i style="width:${(built.size / LAB_TARGETS.length) * 100}%"></i></div>
      <div style="display:${missionOpen ? 'block' : 'none'}">
      <label style="font-size:.85rem"><input type="checkbox" id="hint-chk" ${hintOpen ? 'checked' : ''}> ${T('lab.showrecipe')}</label><div class="m-grid">${items}</div></div>`;
    mission.querySelector('#m-head').onclick = () => { missionOpen = !missionOpen; renderMission(); };
    mission.querySelector('#hint-chk').onchange = e => { hintOpen = e.target.checked; renderMission(); };
    mission.querySelectorAll('[data-id]').forEach(b => {
      b.onclick = () => {
        const m = LAB_TARGETS.find(x => x.id === b.dataset.id);
        const comp = composition(m.labPair ? m.labPair.atoms : m.atoms.map(a => a[0]));
        toast(`${L(m.name)}:` + Object.entries(comp).map(([s, n]) => `${s}×${n}`).join(' ') + (built.has(m.id) ? ' ✔' : ''), 3200);
        if (built.has(m.id)) { setScissors(false); showMolecule(m); }   // 已完成:直接把分子擺出來看
        dispatchEvent(new CustomEvent('mascot', { detail: { type: 'say', text: howTo(m), ms: 12000 } }));
      };
    });
  }
  renderMission();

  // ---------- 原子與鍵 ----------
  function spawn(sym) {
    if (atoms.length >= MAX_ATOMS) { toast(Tp('lab.full')); return; }
    const el = BY_SYMBOL[sym];
    const mesh = new THREE.Mesh(sphereGeo, atomMaterial(el.color));
    const r = atomRadius(sym, 'ball') * SIZE;
    mesh.scale.setScalar(r);
    const vw = view();
    mesh.position.set(vw.hl + 0.8 + Math.random() * Math.max(1, vw.hw - vw.hl - 1.6), (Math.random() - 0.5) * 3 + 0.5, (Math.random() - 0.5) * 0.6);
    const div = document.createElement('div');
    div.className = 'label3d'; div.textContent = sym; div.style.fontSize = '18px';
    mesh.add(new CSS2DObject(div));
    const a = { id: nextId++, sym, mesh, vel: new THREE.Vector3(), r };
    mesh.userData.atom = a;
    // 空手提示光暈:已經牽手但還沒牽滿的原子會發光呼吸
    a.glow = new THREE.Sprite(glowMat.clone());
    a.glow.material.color.set(0xffe150);
    a.glow.visible = false; a.glow.scale.set(3, 3, 1); a.glow.renderOrder = -1;
    mesh.add(a.glow);
    stage.scene.add(mesh); atoms.push(a);
  }
  function clearAll() {
    atoms.forEach(a => { a.mesh.children.forEach(c => c.element?.remove()); stage.scene.remove(a.mesh); });
    bonds.forEach(b => stage.scene.remove(b.group));
    atoms.length = 0; bonds.length = 0;
    labels.forEach(l => { l.parent?.remove(l); l.element.remove(); }); labels.clear();
    celebrated.clear();
  }
  const degree = a => bonds.filter(b => b.a === a || b.b === a).length;
  const neighbors = a => bonds.filter(b => b.a === a || b.b === a).map(b => (b.a === a ? b.b : b.a));
  const valence = a => VALENCE[a.sym] ?? 1;

  function components() {
    const parent = new Map(atoms.map(a => [a, a]));
    const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    bonds.forEach(b => parent.set(find(b.a), find(b.b)));
    const groups = new Map();
    atoms.forEach(a => { const r = find(a); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(a); });
    return [...groups.values()];
  }

  /** 鍵級:先全部單鍵,再把剩餘價數用來升級為雙鍵/三鍵 */
  function computeOrders() {
    bonds.forEach(b => { b.order = 1; });
    const free = new Map(atoms.map(a => [a, valence(a) - degree(a)]));
    let changed = true;
    while (changed) {
      changed = false;
      for (const b of bonds) {
        if (b.order < 3 && free.get(b.a) > 0 && free.get(b.b) > 0) {
          b.order++; free.set(b.a, free.get(b.a) - 1); free.set(b.b, free.get(b.b) - 1); changed = true;
        }
      }
    }
    bonds.forEach(b => rebuildBondMeshes(b));
    free.forEach((v, a) => { a.free = v; });          // 記下每顆原子還有幾隻空手(給發光提示用)
    return free;
  }
  function rebuildBondMeshes(b) {
    b.group?.clear();
    if (!b.group) { b.group = new THREE.Group(); stage.scene.add(b.group); }
    const ionic = b.a.sym === 'Na' || b.b.sym === 'Na';
    const n = ionic ? 1 : b.order;
    for (let k = 0; k < n; k++) b.group.add(new THREE.Mesh(cylGeo, ionic ? ionicMat : bondMat));
    b.ionic = ionic;
  }
  function addBond(a, b) {
    const bond = { a, b, order: 1, group: null };
    bonds.push(bond);
    const free = computeOrders();
    evaluate(a, free);
  }
  function removeBondsOf(a) {
    for (let i = bonds.length - 1; i >= 0; i--) {
      if (bonds[i].a === a || bonds[i].b === a) { stage.scene.remove(bonds[i].group); bonds.splice(i, 1); }
    }
    computeOrders();
  }

  // ---------- 辨識分子 ----------
  function compKey(comp) { return comp.map(a => a.id).sort((x, y) => x - y).join(','); }
  // 文字引導只走原子博士這一個管道(3D 標籤只標示算式/名稱,光暈負責視覺提示,toast 只用於「完成」等事件)
  function coach(text) { dispatchEvent(new CustomEvent('mascot', { detail: { type: 'say', text, ms: 6000 } })); }
  function evaluate(seed, free) {
    const comp = components().find(c => c.includes(seed));
    if (!comp) return;
    const syms = comp.map(a => a.sym);
    const idx = new Map(comp.map((a, i) => [a, i]));
    const cb = bonds.filter(b => idx.has(b.a)).map(b => [idx.get(b.a), idx.get(b.b)]);
    const incomplete = comp.filter(a => free.get(a) > 0);
    const m = matchMolecule(syms, cb);
    if (m) {
      const key = compKey(comp);
      if (!celebrated.has(key)) {
        celebrated.add(key);
        const c = centroid(comp);
        bursts.push(burst(stage.scene, c, 0xffd23f, 60));
        const wasNew = !built.has(m.id);
        built.add(m.id);
        const news = update(d => addUnique(d.built, m.id));
        toast(`🎉 ${Tp('lab.made')}${L(m.name)}!`, 3500);
        const spare = comp.some(a => free.get(a) > 0);   // 本來就有空手的分子(如 NO2):只在剛完成時短暫說明,光暈幾秒後消失
        if (spare) comp.forEach(a => { a.glowUntil = performance.now() + 4500; });
        dispatchEvent(new CustomEvent('mascot', { detail: { type: 'cheer', text: `${Tp('lab.made')}${L(m.name)}!` + (spare ? ' ' + Tp('lab.spare') : '') } }));
        news.forEach(b => setTimeout(() => toast(`${b.icon} ${Tp('badge.new')}${L(b.name)}`), 1800));
        if (wasNew) renderMission();
      }
    } else if (incomplete.length) {
      const a = incomplete.sort((x, y) => free.get(y) - free.get(x))[0];
      coach(Tp('lab.wants', { sym: a.sym, n: free.get(a) }));
    } else if (comp.length > 1) {
      coach(Tp('lab.unknown'));
    }
  }
  const centroid = comp => { const c = new THREE.Vector3(); comp.forEach(a => c.add(a.mesh.position)); return c.divideScalar(comp.length); };

  function idealAngle(center) {
    const d = degree(center);
    if (d === 2) return center.sym === 'C' ? 180 : (center.sym === 'O' && neighbors(center).every(n => n.sym === 'O') ? 117 : 105);
    if (d === 3) return center.sym === 'C' ? 120 : 107;
    if (d >= 4) return 109.5;
    return 0;
  }

  // ---------- 物理 ----------
  const tmp = new THREE.Vector3();
  function physics(dt) {
    const f = new Map(atoms.map(a => [a, new THREE.Vector3()]));
    // 鍵長彈簧
    bonds.forEach(b => {
      const rest = (b.a.r + b.b.r) * 1.25 * (b.order > 1 ? 0.92 : 1);
      tmp.subVectors(b.b.mesh.position, b.a.mesh.position);
      const d = tmp.length() || 1e-3;
      tmp.multiplyScalar(((d - rest) * 70) / d);
      f.get(b.a).add(tmp); f.get(b.b).sub(tmp);
    });
    // 鍵角:同一中心的兩個鄰居保持理想距離
    atoms.forEach(c => {
      const nb = neighbors(c);
      if (nb.length < 2) return;
      const ang = (idealAngle(c) * Math.PI) / 180;
      for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) {
        const d1 = (c.r + nb[i].r) * 1.25, d2 = (c.r + nb[j].r) * 1.25;
        const target = Math.sqrt(d1 * d1 + d2 * d2 - 2 * d1 * d2 * Math.cos(ang));
        tmp.subVectors(nb[j].mesh.position, nb[i].mesh.position);
        const d = tmp.length() || 1e-3;
        tmp.multiplyScalar(((d - target) * 30) / d);
        f.get(nb[i]).add(tmp); f.get(nb[j]).sub(tmp);
      }
    });
    // 互斥 + 邊界
    for (let i = 0; i < atoms.length; i++) {
      const A = atoms[i];
      for (let j = i + 1; j < atoms.length; j++) {
        const B = atoms[j];
        tmp.subVectors(B.mesh.position, A.mesh.position);
        const d = tmp.length() || 1e-3, min = (A.r + B.r) * 1.15;
        if (d < min) { tmp.multiplyScalar(((min - d) * 120) / d); f.get(A).sub(tmp); f.get(B).add(tmp); }
      }
      const p = A.mesh.position;
      f.get(A).z -= p.z * 6;
      const { hw, hl, hh } = view();
      if (p.x > hw) f.get(A).x -= (p.x - hw) * 80; else if (p.x < hl) f.get(A).x -= (p.x - hl) * 80;
      if (p.y > hh.top) f.get(A).y -= (p.y - hh.top) * 80; else if (p.y < hh.bot) f.get(A).y -= (p.y - hh.bot) * 80;
    }
    atoms.forEach(a => {
      if (a === dragging) { a.vel.set(0, 0, 0); return; }
      a.vel.addScaledVector(f.get(a), dt).multiplyScalar(0.86);
      a.vel.clampLength(0, 12);
      a.mesh.position.addScaledVector(a.vel, dt);
    });
  }
  function view() {
    const h = 2 * stage.camera.position.z * Math.tan((stage.camera.fov * Math.PI) / 360);
    const full = (h * stage.camera.aspect) / 2, hw = full - 0.9;
    // 桌面版任務面板在左側,把左邊界往右推,避免原子被面板蓋住
    let hl = -hw;
    if (!isNarrow() && mission.offsetWidth) {
      const wpp = (2 * full) / (stage.el.clientWidth || 1);
      hl = -full + (mission.offsetWidth + 24) * wpp + 0.9;
    }
    return { hw, hl, hh: { top: h / 2 - 1.2, bot: -h / 2 + 2.4 } };
  }

  const right = new THREE.Vector3(), a2 = new THREE.Vector3();
  stage.onFrame(dt => {
    const pulse = 3.1 + Math.sin(performance.now() / 160) * 0.35;
    atoms.forEach(a => {
      const on = a.free > 0 && degree(a) > 0 && (!a.matched || performance.now() < (a.glowUntil || 0));
      a.glow.visible = on;
      if (on) { a.glow.scale.set(pulse, pulse, 1); a.glow.material.color.set(a.matched ? 0xff9ad5 : 0xffe150); }   // 黃=還想牽手;粉紅=已完成(本來就有空手)
    });
    const steps = 3;
    for (let i = 0; i < steps; i++) physics(dt / steps);
    // 更新鍵的圓柱
    bonds.forEach(b => {
      const pa = b.a.mesh.position, pb = b.b.mesh.position;
      tmp.subVectors(pb, pa);
      const len = tmp.length(); if (len < 1e-4) return;
      tmp.normalize();
      right.crossVectors(tmp, Math.abs(tmp.z) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)).normalize();   // 並排方向留在畫面平面內,雙/三鍵才看得到
      const n = b.group.children.length;
      b.group.children.forEach((m, k) => {
        m.position.copy(pa).add(pb).multiplyScalar(0.5).addScaledVector(right, (k - (n - 1) / 2) * 0.17);
        m.quaternion.setFromUnitVectors(UP, tmp);
        const r = b.ionic ? 0.05 : n === 1 ? 0.1 : 0.07;
        m.scale.set(r, len, r);
      });
    });
    // 分子標籤
    const seen = new Set();
    components().forEach(comp => {
      if (comp.length < 2) return;
      const key = compKey(comp); seen.add(key);
      const idx = new Map(comp.map((a, i) => [a, i]));
      const m = matchMolecule(comp.map(a => a.sym), bonds.filter(b => idx.has(b.a)).map(b => [idx.get(b.a), idx.get(b.b)]));
      comp.forEach(a => { a.matched = !!m; });
      let lab = labels.get(key);
      let text;
      if (m) text = `${formulaHTML(m.display || m.formula)} · ${LH(m.name)}`;
      else {
        // 還不認識的組合:一樣顯示算式,並說明還缺什麼(不要讓小朋友看到空白)
        const cnt = {};
        comp.forEach(a => { cnt[a.sym] = (cnt[a.sym] || 0) + 1; });
        const order = Object.keys(cnt).sort((x, y) => (x === 'C' ? -1 : y === 'C' ? 1 : x === 'H' ? -1 : y === 'H' ? 1 : x < y ? -1 : 1));
        const formula = order.map(s => s + (cnt[s] > 1 ? cnt[s] : '')).join('');
        text = formulaHTML(formula);
      }
      if (!lab) {
        const div = document.createElement('div'); div.className = 'label3d';
        div.style.cssText = 'background:rgba(27,35,80,.85);padding:4px 10px;border-radius:999px;font-size:16px';
        lab = new CSS2DObject(div); stage.scene.add(lab); labels.set(key, lab);
      }
      lab.element.innerHTML = text; lab.element.style.display = text ? '' : 'none';
      const c = centroid(comp); lab.position.set(c.x, c.y + 1.7, c.z);
    });
    labels.forEach((lab, key) => { if (!seen.has(key)) { stage.scene.remove(lab); lab.element.remove(); labels.delete(key); } });
    for (let i = bursts.length - 1; i >= 0; i--) if (!bursts[i].update(dt)) bursts.splice(i, 1);
  });

  // ---------- 指標互動 ----------
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  function setRay(ev) {
    const r = stage.el.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, stage.camera);
  }
  stage.el.style.touchAction = 'none';
  stage.el.addEventListener('pointerdown', ev => {
    setRay(ev);
    const h = ray.intersectObjects(atoms.map(a => a.mesh))[0];
    if (!h) { if (scissors) setScissors(false); return; }
    const a = h.object.userData.atom;
    if (scissors) {
      celebrated.clear();
      if (degree(a)) { removeBondsOf(a); toast(Tp('lab.cut')); }       // 有牽手:先剪斷
      else {                                                            // 已經是單獨一顆:再剪一次就移除
        a.mesh.children.forEach(c => c.element?.remove());
        stage.scene.remove(a.mesh);
        atoms.splice(atoms.indexOf(a), 1);
        bursts.push(burst(stage.scene, a.mesh.position, 0xffffff, 24));
      }
      return;
    }
    dragging = a; plane.constant = -a.mesh.position.z;
    stage.el.setPointerCapture(ev.pointerId);
  });
  stage.el.addEventListener('pointermove', ev => {
    if (!dragging) return;
    setRay(ev);
    if (ray.ray.intersectPlane(plane, hit)) dragging.mesh.position.copy(hit);
    // 靠近提示:放大可連接的對象
    const c = candidate(dragging);
    atoms.forEach(a => a.mesh.scale.setScalar(a.r * (a === c ? 1.18 : 1)));
  });
  const end = () => {
    if (!dragging) return;
    const a = dragging; dragging = null;
    atoms.forEach(x => x.mesh.scale.setScalar(x.r));
    const c = candidate(a);
    if (c) addBond(a, c);
  };
  stage.el.addEventListener('pointerup', end);
  stage.el.addEventListener('pointercancel', end);

  function candidate(a) {
    if (degree(a) >= valence(a)) return null;
    let best = null, bd = 1e9;
    const comp = components().find(c => c.includes(a));
    atoms.forEach(o => {
      if (o === a || comp.includes(o) || degree(o) >= valence(o)) return;
      const d = o.mesh.position.distanceTo(a.mesh.position);
      if (d < (a.r + o.r) * 2.0 && d < bd) { best = o; bd = d; }
    });
    return best;
  }

  /** 把已完成的分子直接擺到畫面上(點「已完成」的任務卡片時用) */
  function showMolecule(m) {
    clearAll();
    const src = m.labPair ? m.labPair.atoms.map((s, i) => [s, i * 1.6, 0, 0]) : m.atoms;
    const bd = m.labPair ? m.labPair.bonds : m.bonds;
    const vw = view(), cx = (vw.hl + vw.hw) / 2, cy = (vw.hh.top + vw.hh.bot) / 2;
    const mid = src.reduce((p, a) => [p[0] + a[1] / src.length, p[1] + a[2] / src.length, p[2] + a[3] / src.length], [0, 0, 0]);
    const list = src.map(a => {
      spawn(a[0]);
      const at = atoms[atoms.length - 1];
      at.mesh.position.set(cx + (a[1] - mid[0]) * 1.9, cy + (a[2] - mid[1]) * 1.9, (a[3] - mid[2]) * 1.9);
      return at;
    });
    bd.forEach(([i, j]) => bonds.push({ a: list[i], b: list[j], order: 1, group: null }));
    computeOrders();
    celebrated.add(compKey(list));
  }

  // 一開始是空白的實驗桌:自己從下方托盤選原子,或點已完成的任務看分子長相

  return {
    dispose() {
      labels.forEach(l => l.element.remove());
      stage.dispose(); hint.remove(); mission.remove(); tray.remove();
    },
  };
}
