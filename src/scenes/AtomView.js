import * as THREE from 'three';
import { isNarrow } from '../ui/layout.js';
import { BY_Z, CATEGORIES } from '../data/elements.js';
import { GALLERY } from '../data/molecules.js';
import { createStage } from '../three/stage.js';
import { T, Tp, L, LH, render } from '../i18n/index.js';
import { update, addUnique } from '../game/store.js';
import { toast } from '../ui/toast.js';
import { speak, canSpeak } from '../ui/speech.js';

const protonMat = new THREE.MeshStandardMaterial({ color: 0xff5a5a, roughness: 0.4 });
const neutronMat = new THREE.MeshStandardMaterial({ color: 0xb0b6d0, roughness: 0.4 });
const electronMat = new THREE.MeshStandardMaterial({ color: 0x4cc9ff, emissive: 0x1a6aa0, roughness: 0.3 });
const valenceMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x9a7a00, roughness: 0.3 });
const sph = new THREE.SphereGeometry(1, 20, 14);

export function mount(container, z, { go }) {
  const el = BY_Z[z || 1];
  const stage = createStage(container, { camPos: [0, 4, 12] });
  stage.camera.fov = 30;            // 窄視角:近看原子核時透視變形較小
  stage.camera.updateProjectionMatrix();

  // ---- 原子核:依實際數量畫出全部質子與中子(InstancedMesh,幾百顆也很輕) ----
  const nP = el.z, nN = Math.max(0, Math.round(el.mass) - el.z), total = nP + nN;
  const rad = Math.min(0.16, 1.0 / Math.cbrt(total / 0.5));          // 核越大,球越小,核半徑最多約 1
  const packR = total === 1 ? 0 : rad * Math.cbrt(total / 0.5);
  const nucleusR = packR + rad;
  const nucleus = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.4 }), total);
  {
    const kinds = Array.from({ length: total }, (_, i) => (i < nP ? 0 : 1));
    for (let i = total - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    // 一部分球排在外層球面(輪廓才會圓),其餘填在內部
    const shellN = Math.min(Math.floor(total * 0.7), Math.floor((4 * Math.PI * packR * packR) / (3.0 * rad * rad)));
    const inner = total - shellN;
    for (let i = 0; i < total; i++) {
      const onShell = i < shellN, n = onShell ? shellN : inner, k = onShell ? i : i - shellN;
      const phi = Math.acos(1 - 2 * ((k + 0.5) / n)), th = Math.PI * (1 + Math.sqrt(5)) * k + (onShell ? 0 : 1.3);
      const r = total === 1 ? 0 : onShell ? packR : packR * 0.78 * Math.cbrt((k + 0.5) / n);
      dummy.position.set(r * Math.sin(phi) * Math.cos(th), r * Math.sin(phi) * Math.sin(th), r * Math.cos(phi));
      dummy.scale.setScalar(rad);
      dummy.updateMatrix();
      nucleus.setMatrixAt(i, dummy.matrix);
      nucleus.setColorAt(i, col.set(kinds[i] === 0 ? 0xff5a5a : 0xb0b6d0));
    }
    nucleus.instanceMatrix.needsUpdate = true;
    nucleus.instanceColor.needsUpdate = true;
  }
  stage.scene.add(nucleus);

  // ---- 電子殼層(最內層軌道會避開原子核) ----
  const R0 = Math.max(1.4, nucleusR + 0.7);
  const shellGroups = [];
  el.shells.forEach((count, i) => {
    const R = R0 + i * 1.15;
    const g = new THREE.Group();
    g.rotation.set(((i * 0.9) % 1.2) - 0.4, 0, ((i * 0.7) % 1.0) - 0.3);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 6, 96), new THREE.MeshBasicMaterial({ color: 0x8fa0ff, transparent: true, opacity: 0.55 }));
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const outer = i === el.shells.length - 1;
    const electrons = [];
    for (let k = 0; k < count; k++) {
      const m = new THREE.Mesh(sph, outer && el.shells.length > 1 ? valenceMat : electronMat);
      m.scale.setScalar(0.12);
      g.add(m); electrons.push({ m, a: (k / count) * Math.PI * 2 });
    }
    stage.scene.add(g);
    shellGroups.push({ g, electrons, R, speed: 0.9 / (1 + i * 0.55) });
  });
  stage.onFrame(dt => {
    shellGroups.forEach(s => s.electrons.forEach(e => {
      e.a += dt * s.speed;
      e.m.position.set(Math.cos(e.a) * s.R, 0, Math.sin(e.a) * s.R);
    }));
    nucleus.rotation.y += dt * 0.4;
  });
  if (stage.controls) { stage.controls.autoRotate = true; stage.controls.autoRotateSpeed = 0.6; }

  // ---- 相機初始距離:依可用空間(扣掉左側面板)讓整個原子入鏡 ----
  const outerR = R0 + (el.shells.length - 1) * 1.15 + 0.8;
  const usableW = stage.el.clientWidth - (isNarrow() ? 0 : 400);
  const fit = Math.tan((stage.camera.fov * Math.PI) / 360) * Math.min(1, usableW / Math.max(1, stage.el.clientHeight));
  const dist0 = (outerR / fit) * 1.1;
  stage.camera.position.set(0, dist0 * 0.2, dist0).setLength(dist0);

  // ---- 右側縮放條 ----
  const minD = Math.max(2.5, nucleusR * 2.4), maxD = dist0 * 2.2;
  if (stage.controls) { stage.controls.minDistance = minD; stage.controls.maxDistance = maxD; }
  const zoombar = document.createElement('div');
  zoombar.className = 'zoombar';
  zoombar.innerHTML = `<button class="zb" id="zin" title="${Tp('atom.zoomin')}">＋</button>
    <div class="zr-wrap"><input type="range" id="zrange" min="0" max="1000" step="1" aria-label="${Tp('atom.zoom')}"></div>
    <button class="zb" id="zout" title="${Tp('atom.zoomout')}">－</button>`;
  container.appendChild(zoombar);
  const zr = zoombar.querySelector('#zrange');
  const lnR = Math.log(maxD / minD);
  const dist = () => stage.camera.position.distanceTo(stage.controls.target);
  const setDist = d => {
    d = Math.min(maxD, Math.max(minD, d));
    const dir = stage.camera.position.clone().sub(stage.controls.target).normalize();
    stage.camera.position.copy(stage.controls.target).addScaledVector(dir, d);
  };
  const valueToDist = v => maxD * Math.exp(-lnR * (v / 1000));      // 往上拉 = 放大(距離變小)
  zr.oninput = () => setDist(valueToDist(+zr.value));
  zoombar.querySelector('#zin').onclick = () => setDist(dist() / 1.35);
  zoombar.querySelector('#zout').onclick = () => setDist(dist() * 1.35);
  stage.onFrame(() => { // 滾輪、雙指縮放時,讓滑桿跟著動
    if (document.activeElement !== zr) zr.value = Math.round((Math.log(maxD / dist()) / lnR) * 1000);
  });

  // 資訊面板
  const side = document.createElement('div');
  side.className = 'side';
  const cat = CATEGORIES[el.cat];
  const inMols = GALLERY.filter(m => m.atoms.some(a => a[0] === el.sym)).slice(0, 8);
  side.innerHTML = `
    <h2><span style="color:${cat.color}">${el.sym}</span> ${LH(el.name)}</h2>
    <button class="chip tipchip" data-tip="cat" title="${Tp('atom.tapme')}" style="background:${cat.color};color:#111">${render(L(cat))} ⓘ</button>
    <button class="chip tipchip" data-tip="z" title="${Tp('atom.tapme')}">${T('atom.z')} ${el.z} ⓘ</button>
    <button class="chip tipchip" data-tip="mass" title="${Tp('atom.tapme')}">${T('atom.mass')} ${el.mass} ⓘ</button>
    <div class="tipbox" id="tipbox" hidden></div>
    <p>${T('atom.shells')}:<b> ${el.shells.join(' , ')}</b></p>
    <ul class="legend">
      <li><i class="ball" style="--c:#ff5a5a"></i>${T('legend.proton')}</li>
      <li><i class="ball" style="--c:#b0b6d0"></i>${T('legend.neutron')}</li>
      <li><i class="ball" style="--c:#4cc9ff"></i>${T('legend.electron')}</li>
      <li><i class="ball" style="--c:#ffd23f"></i>${T('legend.valence')}</li>
    </ul>
    ${el.fact ? `<p>💡 ${LH(el.fact)}</p>` : `<p style="color:var(--muted)">${T('atom.nofact')}</p>`}
    ${el.use && L(el.use) ? `<p>🏠 ${LH(el.use)}</p>` : ''}
    ${inMols.length ? `<p>${T('atom.in')}:<br>${inMols.map(m => `<button class="btn alt" data-mol="${m.id}">${LH(m.name)}</button>`).join('')}</p>` : ''}
    <div>
      <button class="btn alt" id="prev">◀</button><button class="btn alt" id="next">▶</button>
      <button class="btn alt" id="back">${T('atom.back')}</button>
      ${canSpeak() ? `<button class="btn" id="say">🔊 ${T('atom.say')}</button>` : ''}
    </div>`;
  container.appendChild(side);
  // 為避開左側面板而平移畫面中心;越放大越減少平移,避免近距離時球體被拉歪
  stage.setCenterShift(() => {
    if (isNarrow()) return 0;
    const f = Math.min(1, Math.max(0, (dist() - minD * 1.6) / (dist0 * 0.7 - minD * 1.6)));
    return (side.offsetWidth / 2) * f;
  });
  const tipbox = side.querySelector('#tipbox');
  let tipOpen = null;
  side.querySelectorAll('.tipchip').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.tip;
      tipOpen = tipOpen === k ? null : k;
      tipbox.hidden = !tipOpen;
      if (tipOpen) tipbox.innerHTML = k === 'z' ? T('atom.z.tip', { name: L(el.name), n: el.z }) : k === 'cat' ? LH(cat.desc) : T('atom.mass.tip');
    };
  });
  side.querySelector('#prev').onclick = () => go('atom', el.z > 1 ? el.z - 1 : 118);
  side.querySelector('#next').onclick = () => go('atom', el.z < 118 ? el.z + 1 : 1);
  side.querySelector('#back').onclick = () => go('table');
  side.querySelector('#say')?.addEventListener('click', () =>
    speak(`${L(el.name)}。${el.fact ? L(el.fact) : ''}${el.use ? L(el.use) : ''}`));
  side.querySelectorAll('[data-mol]').forEach(b => { b.onclick = () => go('gallery', b.dataset.mol); });

  const news = update(d => addUnique(d.elements, el.z));
  news.forEach(b => toast(`${b.icon} ${Tp('badge.new')}${L(b.name)}`));

  return { dispose() { window.speechSynthesis?.cancel?.(); stage.dispose(); side.remove(); zoombar.remove(); } };
}
