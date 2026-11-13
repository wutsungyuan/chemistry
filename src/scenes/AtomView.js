import * as THREE from 'three';
import { isNarrow } from '../ui/layout.js';
import { BY_Z, CATEGORIES } from '../data/elements.js';
import { GALLERY } from '../data/molecules.js';
import { ELEMENT_USES } from '../data/elementUses.js';
import { SPECTRA, SPECTRA_META } from '../data/generated/spectra.js';
import { spectrumSVG, ladderSVG, hasLevels, hasAnyLevels, isApprox, completeLines, nearestLine, brightest, nmOf, colorKey, cssColor, RANGE } from '../ui/spectrum.js';
import { jumpPlan, jumpState, parseLabel } from '../ui/orbitJump.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createStage } from '../three/stage.js';
import { T, Tp, L, LH, render, formulaHTML } from '../i18n/index.js';
import { update, addUnique } from '../game/store.js';
import { toast } from '../ui/toast.js';
import { speak, canSpeak } from '../ui/speech.js';

const protonMat = new THREE.MeshStandardMaterial({ color: 0xff5a5a, roughness: 0.4 });
const neutronMat = new THREE.MeshStandardMaterial({ color: 0xb0b6d0, roughness: 0.4 });
const electronMat = new THREE.MeshStandardMaterial({ color: 0x4cc9ff, emissive: 0x1a6aa0, roughness: 0.3 });
const valenceMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x9a7a00, roughness: 0.3 });
const sph = new THREE.SphereGeometry(1, 20, 14);

/** 元素頁的「光譜指紋」:光譜條(發光/吸收)+ 點選或滑過亮線 + 最亮的幾條線 */
function mountSpectrum(box, sym, onSelect = () => {}) {
  const sp = SPECTRA[sym];
  if (!sp || !sp.lines.length) {
    box.innerHTML = `<h3 class="spec-h">🌈 ${T('sp.title')}</h3><div class="tipbox">${T('sp.none')}</div>`;
    return () => {};
  }
  const lines = completeLines(sp.lines), top = brightest(lines, 5), uid = 'sp' + sym;   // 沒有能階記錄的線也補上(對得出來就用真的,否則畫示意),每一條線都有躍遷動畫
  let mode = 'emit', sel = -1, dragging = false, lastW = 0, lastLH = 0, seen = false, lastKey = '';
  const reduced = false;   // 不理會系統的「減少動態效果」
  const anyLevels = lines.some(hasLevels);
  box.innerHTML = `
    <h3 class="spec-h">🌈 ${T('sp.title')}</h3>
    <div class="spec-modes"><button class="chip" data-mode="emit"></button><button class="chip" data-mode="absorb"></button></div>
    <div class="spec-strip"></div>
    <div class="spec-read"></div>
    <div class="spec-top"><span>${T('sp.top')}:</span>${sym === 'H' ? `<button class="chip cloud-link" title="${Tp('cloud.title')}">${T('cloud.link')}</button>` : ''}${top.map(i => `<button class="chip" data-i="${i}"><i class="swatch" style="color:${cssColor(lines[i][0])}"></i>${lines[i][0].toFixed(1)}</button>`).join('')}</div>
    ${anyLevels ? `<div class="spec-ladder-box"><h4 class="spec-h2">🪜 ${T('sp.ladder')}</h4><div class="spec-ladder"></div><div class="spec-ladder-read"></div></div>` : ''}
    <button class="spec-info-btn" aria-expanded="false" aria-label="${Tp('sp.more')}">ⓘ</button>
    <div class="spec-more">
      <div class="spec-more-head"><b>ⓘ ${T('sp.more')}</b><button class="spec-more-close" aria-label="${Tp('sp.close')}">✕</button></div>
      <div class="spec-tip"></div>
      <p class="spec-sub">${T('sp.sub')}</p>
      <p class="spec-tip2"></p>
      <p class="spec-3d"></p>
      <p class="spec-why">${T('sp.why')}</p>
      <p class="spec-note">${sp.estimated ? T('sp.est') : T('sp.meas')} ${T('sp.note')}<a href="${SPECTRA_META.url}" target="_blank" rel="noopener noreferrer">NIST ASD</a> (DOI ${SPECTRA_META.doi})</p>
    </div>`;
  const strip = box.querySelector('.spec-strip'), read = box.querySelector('.spec-read'), tip = box.querySelector('.spec-tip');
  const ladder = box.querySelector('.spec-ladder'), ladderRead = box.querySelector('.spec-ladder-read'), tip2 = box.querySelector('.spec-tip2'), note3d = box.querySelector('.spec-3d');
  // 說明:桌面直接顯示在區塊下方;手機是一張蓋住下方面板的獨立面板(實心背景,不會和圖疊在一起),有 ✕ 可以關閉,也能按 Esc
  const more = box.querySelector('.spec-more'), infoBtn = box.querySelector('.spec-info-btn'), closeBtn = box.querySelector('.spec-more-close');
  const setMore = open => { more.classList.toggle('open', open); infoBtn.setAttribute('aria-expanded', String(open)); };
  infoBtn.onclick = () => setMore(!more.classList.contains('open'));
  closeBtn.onclick = () => setMore(false);
  const onKey = e => { if (e.key === 'Escape') setMore(false); };
  addEventListener('keydown', onKey);
  const modeBtns = [...box.querySelectorAll('[data-mode]')];
  modeBtns.forEach(b => { b.innerHTML = T('sp.' + b.dataset.mode); });
  // 手機的光譜分頁是「一頁、不用捲動」的版面(見 mobile.css,--fit:1):光譜條與階梯圖要配合可用空間決定大小
  const fit = () => getComputedStyle(strip).getPropertyValue('--fit').trim() === '1';
  /** 手機(一頁版面):階梯圖至少要 100px,下面那行說明如果放不下(開注音後字比較高、或手機比較矮)就整行收起來,而不是被切掉一半。
   *  只看「格子高度」和「說明自然高度」,不看階梯圖現在多高,所以不會因為收起來又變高而來回跳動。 */
  const ladderBox = box.querySelector('.spec-ladder-box');
  function fitRead() {
    if (!ladderBox || !fit()) { ladderBox?.classList.remove('tight'); return; }
    ladderBox.classList.remove('tight');
    if (ladderRead.scrollHeight && ladderBox.clientHeight < 100 + ladderRead.scrollHeight + 4) ladderBox.classList.add('tight');
  }
  function draw() {
    const f = fit();
    lastW = strip.clientWidth || 320;
    lastLH = ladder ? (f ? Math.max(100, ladder.clientHeight) : 190) : 0;
    strip.innerHTML = spectrumSVG(lines, { mode, width: lastW, height: f ? 44 : 64, selected: sel, uid });
    const key = `${sel}|${mode}`;                           // 只在「選取的線或模式」改變時通知 3D(縮放視窗重畫時不要重新開始動畫)
    if (key !== lastKey) { lastKey = key; onSelect(sel >= 0 && hasAnyLevels(lines[sel]) ? { line: lines[sel], mode } : null); }
    modeBtns.forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
    tip.innerHTML = T('sp.tip.' + mode);
    if (ladder) {                                           // 能階階梯圖:最亮的幾條線 + 被選取的線
      ladder.innerHTML = ladderSVG(lines, { selected: sel, mode, width: f ? ladder.clientWidth || lastW : lastW, height: lastLH, uid, animate: !reduced });
      tip2.innerHTML = T('sp.ladder.' + mode);
      if (sel < 0) { ladderRead.innerHTML = T('sp.ladder.pick'); note3d.innerHTML = ''; }
      else if (isApprox(lines[sel])) {                      // 只知道能量差,不知道在哪兩層:明講「位置是示意」
        const [wl, , , dE] = lines[sel];
        ladderRead.innerHTML = T('sp.ladder.approx.' + mode, { nm: wl.toFixed(1), dE: dE.toFixed(2), c: Tp(colorKey(wl)) }); note3d.innerHTML = T('sp.ladder.3d');
      } else {
        const [wl, , lo, hi] = lines[sel];
        const q1 = parseLabel(lines[sel][4]), q2 = parseLabel(lines[sel][5]);
        ladderRead.innerHTML = T('sp.ladder.sel.' + mode, { nm: wl.toFixed(1), lo: lo.toFixed(2), hi: hi.toFixed(2), c: Tp(colorKey(wl)) });
        note3d.innerHTML = (lo > 0.01 ? T('sp.ladder.excited') + ' ' : '') + (q1 && q2 && q1.n === q2.n && q1.l !== q2.l ? T('sp.ladder.same', { n: q1.n }) + ' ' : '') + T('sp.ladder.3d');     // 長的說明放進「ⓘ 說明」
      }
    }
    fitRead();
    if (sel < 0) read.innerHTML = `<span class="rd-main">${T('sp.tap')}</span>`;
    else {
      const [wl, I] = lines[sel], strength = I > 0.5 ? 'strong' : I > 0.1 ? 'mid' : 'weak';
      read.innerHTML = `<span class="rd-main"><i class="swatch" style="color:${cssColor(wl)}"></i><b>${Tp('sp.line', { nm: wl.toFixed(1) })}</b> · ${T(colorKey(wl))} · ${T('sp.b.' + strength)}</span><span class="rd-sub">${T('sp.read.' + mode)}</span>`;
    }
  }
  function pickAt(clientX) {
    const r = strip.getBoundingClientRect();
    const i = nearestLine(lines, nmOf(clientX - r.left, r.width), (18 / r.width) * (RANGE[1] - RANGE[0]));   // 手指容許誤差約 18px
    if (i !== sel) { sel = i; draw(); markSeen(); }
  }
  /** 第一次互動時記一筆「看過這個元素的光譜」(徽章用) */
  function markSeen() {
    if (seen || sel < 0) return;
    seen = true;
    update(d => addUnique(d.spectraSeen, sym)).forEach(b => toast(`${b.icon} ${Tp('badge.new')}${L(b.name)}`, 3200));
  }
  strip.addEventListener('pointerdown', e => { dragging = true; strip.setPointerCapture?.(e.pointerId); pickAt(e.clientX); });
  strip.addEventListener('pointermove', e => { if (dragging || e.pointerType === 'mouse') pickAt(e.clientX); });
  const stop = () => { dragging = false; };
  strip.addEventListener('pointerup', stop); strip.addEventListener('pointercancel', stop);
  modeBtns.forEach(b => { b.onclick = () => { mode = b.dataset.mode; draw(); }; });
  box.querySelector('.cloud-link')?.addEventListener('click', () => { location.hash = '#cloud/1s'; });   // 只有氫:電子雲(氫有精確解)
  box.querySelectorAll('.spec-top [data-i]').forEach(b => { b.onclick = () => { sel = +b.dataset.i; draw(); markSeen(); }; });
  draw();
  // 面板大小改變(切分頁、說明展開/收起、旋轉手機)時,依新的大小重畫
  const ro = new ResizeObserver(() => {
    const f = fit(); fitRead();
    if (Math.abs((strip.clientWidth || 320) - lastW) >= 1 || (ladder && Math.abs((f ? Math.max(100, ladder.clientHeight) : 190) - lastLH) >= 1)) draw();
  });
  ro.observe(strip); if (ladder) { ro.observe(ladder); ro.observe(ladderBox); }
  return () => { ro.disconnect(); removeEventListener('keydown', onKey); onSelect(null); };
}

/** 按 ◀ ▶ 換元素時,要停留在目前的分頁(原子資訊 / 光譜);從週期表等其他地方進來則一律從「原子資訊」開始 */
let pendingTab = null;
/** 從別的頁面(例如電子雲)回到原子頁時,指定要停在哪個分頁 */
export function setNextTab(t) { pendingTab = t; }

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
      const r = e.R ?? s.R;                       // 躍遷動畫時,最外層電子的半徑由 jump 控制
      e.m.position.set(Math.cos(e.a) * r, 0, Math.sin(e.a) * r);
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

  // ---- 光譜聯動:選一條亮線,最外層電子在 3D 原子裡示範那次躍遷 ----
  // 依量子力學,電子不會經過兩層「中間」的位置:同一顆電子在上、下兩條軌道各有一個半透明的影子,
  // 影子的濃淡 = 在那一層的機率(躍遷時一層變淡、另一層變濃)。軌道半徑只是示意,見 ui/orbitJump.js。
  const outerShell = shellGroups[shellGroups.length - 1], outerElectron = outerShell?.electrons[0];
  const jump = { plan: null, mode: 'emit', t0: 0, color: null, rings: [], labels: [], photon: null, ghost: null, origMat: null, matLow: null, matUp: null };
  const wv = new THREE.Vector3(), reducedMotion = false;
  function clearJump() {
    jump.rings.forEach(r => { outerShell.g.remove(r); r.geometry.dispose(); r.material.dispose(); });
    jump.labels.forEach(o => { outerShell.g.remove(o); o.element.remove(); });
    if (jump.photon) { stage.scene.remove(jump.photon); jump.photon.geometry.dispose(); jump.photon.material.dispose(); }
    if (jump.ghost) { outerShell.g.remove(jump.ghost); jump.matUp.dispose(); }
    if (jump.origMat && outerElectron) { outerElectron.m.material = jump.origMat; jump.matLow.dispose(); }
    Object.assign(jump, { rings: [], labels: [], photon: null, ghost: null, plan: null, origMat: null, matLow: null, matUp: null });
    if (outerElectron) outerElectron.R = undefined;
  }
  const ringOf = (r, color, opacity) => {
    const pts = Array.from({ length: 96 }, (_, k) => new THREE.Vector3(Math.cos((k / 96) * Math.PI * 2) * r, 0, Math.sin((k / 96) * Math.PI * 2) * r));
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color, dashSize: 0.14, gapSize: 0.09, transparent: true, opacity }));
    line.computeLineDistances();
    return line;
  };
  const specTab = () => side?.dataset.tab === 'spec' && isNarrow();   // 取景調整只給手機/平板(3D 區域小);桌機的光譜分頁不動鏡頭
  /** 讓半徑 r 的軌道(含傾斜,實際投影到畫面上)填滿 3D 區域約 88%:算軌道投影後的最大範圍,據此調整鏡頭距離,重複幾次就會收斂 */
  function fitRing(r) {
    const pts = Array.from({ length: 36 }, (_, k) => new THREE.Vector3(Math.cos((k / 36) * Math.PI * 2) * r, 0, Math.sin((k / 36) * Math.PI * 2) * r));
    for (let i = 0; i < 4; i++) {
      stage.camera.updateMatrixWorld(true);
      let mx = 0;
      for (const p of pts) { const q = outerShell.g.localToWorld(p.clone()).project(stage.camera); mx = Math.max(mx, Math.abs(q.x), Math.abs(q.y)); }
      if (!mx) return;
      const before = dist(); setDist(before * (mx / 0.88));
      if (Math.abs(dist() - before) < 0.01) break;
    }
  }
  /** 只有手機的光譜分頁(3D 區域很小)才依畫布大小取景;其他情況維持原本的取景與使用者的縮放 */
  function reframe() {
    if (!specTab() || !outerShell) return;
    fitRing(jump.plan ? jump.plan.rHi + 0.15 : outerShell.R + 0.3);        // 有選線:取景到上軌道;沒選:取景到最外層軌道
  }
  const frameWatcher = new ResizeObserver(() => reframe());
  frameWatcher.observe(stage.el);
  function startJump(sel) {
    clearJump();
    if (!sel || !outerElectron) { reframe(); return; }
    const plan = jumpPlan(sel.line, { baseR: outerShell.R, nGround: el.shells.length });
    if (!plan) return;
    const color = new THREE.Color(cssColor(plan.wl));
    [[plan.rLo, new THREE.Color(0x8fa0ff), 0.55, plan.labelLo, 1], [plan.rHi, color, 0.95, plan.labelHi, -1]].forEach(([r, c, op, label, side]) => {     // 兩個標籤放在軌道的相反側,軌道很近時才不會疊在一起
      const ring = ringOf(r, c, op); outerShell.g.add(ring); jump.rings.push(ring);
      if (label) {                                                // 軌道旁標出能階名稱(3s、3p、n=2…)
        const d = document.createElement('div'); d.className = 'label3d'; d.textContent = label; d.style.cssText = 'font-size:13px;color:#ffe9a8';
        const o = new CSS2DObject(d); o.position.set(side * r, 0, 0); outerShell.g.add(o); jump.labels.push(o);
      }
    });
    if (plan.rLo > outerShell.R + 0.05) {                          // 這條線的「下層」不是電子平常待的那一圈(例如氫的可見光是 n=3,4…→2,不是回到 n=1):把原本那一圈標成「平常位置」,才不會像是憑空多出軌道
      const d = document.createElement('div'); d.className = 'label3d'; d.innerHTML = T('sp.ground'); d.style.cssText = 'font-size:12px;color:#bfe3ff';
      const o = new CSS2DObject(d); o.position.set(0, 0, outerShell.R); outerShell.g.add(o); jump.labels.push(o);
      plan.ground = true;
    }
    // 同一顆電子的兩個影子:原本的電子留在下軌道,另外在上軌道放一個(材質各自複製,才能各自調濃淡)
    jump.origMat = outerElectron.m.material;
    jump.matLow = jump.origMat.clone(); jump.matLow.transparent = true; outerElectron.m.material = jump.matLow;
    jump.matUp = jump.origMat.clone(); jump.matUp.transparent = true;
    jump.ghost = new THREE.Mesh(outerElectron.m.geometry, jump.matUp); jump.ghost.scale.copy(outerElectron.m.scale); outerShell.g.add(jump.ghost);
    outerElectron.R = plan.rLo;
    jump.photon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    stage.scene.add(jump.photon);
    Object.assign(jump, { plan, mode: sel.mode, color, t0: performance.now() / 1000 });
    if (specTab()) reframe();                                      // 手機光譜分頁:取景到剛好填滿
    else { const need = plan.rHi + 0.9; if (need > outerR) { const want = dist0 * (need / outerR); if (dist() < want) setDist(want); } }   // 其他:軌道比畫面大才把鏡頭拉遠
  }
  stage.onFrame(() => {
    if (!jump.plan || !outerElectron) return;
    const st = jumpState(jump.mode, performance.now() / 1000 - jump.t0);   // 淡入淡出只是明暗變化、沒有位移,「減少動態效果」的裝置也照常播放;只是不飛光子
    if (reducedMotion) st.photon = null;
    jump.matLow.opacity = st.pLow; jump.matUp.opacity = st.pUp;
    jump.ghost.visible = st.pUp > 0.01; outerElectron.m.visible = st.pLow > 0.01;
    jump.ghost.position.set(Math.cos(outerElectron.a) * jump.plan.rHi, 0, Math.sin(outerElectron.a) * jump.plan.rHi);   // 影子跟著同一顆電子繞行
    const ph = jump.photon;
    if (st.photon) {                                               // 光子:發光時從(下層的)電子往外飛、吸收時從外面飛向電子
      outerElectron.m.getWorldPosition(wv);
      const dir = wv.clone().normalize(), far = jump.plan.rHi + 2.6, here = wv.length();
      const u = st.photon.u, d = st.photon.out ? here + (far - here) * u : far + (here - far) * u;
      ph.position.copy(dir.multiplyScalar(d)); ph.material.opacity = st.photon.out ? 1 - u * u : 0.35 + 0.65 * u; ph.scale.setScalar(1 + 0.6 * Math.sin(u * Math.PI));
    } else ph.material.opacity = 0;
  });

  // 資訊面板
  const side = document.createElement('div');
  side.className = 'side';
  const cat = CATEGORIES[el.cat];
  // 「它在生活中的樣子」:圖鑑裡有的分子(可點進去看 3D)+ 其他常見物質
  const norm = f => String(f).replace(/\(.*\)/, '');
  const found = [], seen = new Set();
  GALLERY.filter(m => !m.extra && m.atoms.some(a => a[0] === el.sym) && m.id !== 'diamond' && m.id !== 'graphite').forEach(m => {
    seen.add(norm(m.formula)); found.push({ id: m.id, formula: m.display || m.formula, name: m.name });
  });
  (ELEMENT_USES[el.sym] || []).forEach(([f, zh, en]) => { if (!seen.has(norm(f))) { seen.add(norm(f)); found.push({ id: GALLERY.find(m => norm(m.formula) === norm(f))?.id, formula: f, name: { zh, en } }); } });
  const foundItem = x => {
    const tag = x.id ? 'button' : 'span';
    return `<${tag} class="found-item${x.id ? ' link' : ''}" ${x.id ? `data-mol="${x.id}"` : ''}><b>${formulaHTML(x.formula)}</b><em class="fi-name">${LH(x.name)}</em></${tag}>`;
  };
  const foundHTML = found.length ? `<h3 class="found-h">🔎 ${T('atom.found')}</h3><div class="found-list">${found.map(foundItem).join('')}</div>` : '';
  side.innerHTML = `
    <h2><span style="color:${cat.color}">${el.sym}</span> ${LH(el.name)}</h2>
    <div class="side-tabs"><button class="chip on" data-tab="info">${T('atom.tab.info')}</button><button class="chip" data-tab="spec">🌈 ${T('atom.tab.spec')}</button></div>
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
    <p><button class="chip nuc-link" title="${Tp('nuc.title')}">${T('nuc.link')}</button></p>
    <div class="spec" id="spec"></div>
    ${isNarrow() && foundHTML ? `<div class="found">${foundHTML}</div>` : ''}
    <div>
      <button class="btn alt" id="prev" aria-label="${Tp('atom.prev')}">◀</button>
      <button class="btn alt" id="back">${T('atom.back')}</button>
      ${canSpeak() ? `<button class="btn" id="say">🔊 ${T('atom.say')}</button>` : ''}
      <button class="btn alt" id="next" aria-label="${Tp('atom.next')}">▶</button>
    </div>`;
  container.appendChild(side);
  const unmountSpectrum = mountSpectrum(side.querySelector('#spec'), el.sym, startJump);
  // 手機:面板頂部分頁(原子資訊 | 光譜),切到光譜就是完整一頁;桌面版這排分頁隱藏,兩者上下並列
  side.dataset.tab = pendingTab === 'spec' ? 'spec' : 'info'; pendingTab = null;
  side.querySelectorAll('.side-tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === side.dataset.tab));
  side.querySelectorAll('.side-tabs [data-tab]').forEach(b => {
    b.onclick = () => {
      side.dataset.tab = b.dataset.tab;
      if (!isNarrow()) { /* 桌機:3D 取景不變 */ } else if (b.dataset.tab === 'info') setDist(dist0); else requestAnimationFrame(() => requestAnimationFrame(reframe));   // 回到原子資訊:恢復原本取景;進光譜分頁:等版面套用完再取景
      side.querySelectorAll('.side-tabs [data-tab]').forEach(x => x.classList.toggle('on', x === b));
      side.scrollTop = 0;
    };
  });
  // 桌面:獨立成右邊的區塊;手機/平板:放在左側面板最下方
  let foundBox = null;
  if (!isNarrow() && foundHTML) {
    foundBox = document.createElement('div');
    foundBox.className = 'side found-box';
    foundBox.innerHTML = foundHTML;
    container.appendChild(foundBox);
    zoombar.style.right = (foundBox.offsetWidth + 28) + 'px';   // 縮放條貼著原子動畫這一側,生活用品區塊放最右邊
  }
  // 為避開左側面板而平移畫面中心;越放大越減少平移,避免近距離時球體被拉歪
  stage.setCenterShift(() => {
    if (isNarrow()) return 0;
    const f = Math.min(1, Math.max(0, (dist() - minD * 1.6) / (dist0 * 0.7 - minD * 1.6)));
    return ((side.offsetWidth - (foundBox ? foundBox.offsetWidth + 70 : 0)) / 2) * f;
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
  side.querySelector('#prev').onclick = () => { pendingTab = side.dataset.tab; go('atom', el.z > 1 ? el.z - 1 : 118); };
  side.querySelector('#next').onclick = () => { pendingTab = side.dataset.tab; go('atom', el.z < 118 ? el.z + 1 : 1); };
  side.querySelector('#back').onclick = () => go('table');
  side.querySelector('.nuc-link').onclick = () => go('nucleus', el.z);
  side.querySelector('#say')?.addEventListener('click', () =>
    speak(`${L(el.name)}。${el.fact ? L(el.fact) : ''}${el.use ? L(el.use) : ''}`));
  container.querySelectorAll('[data-mol]').forEach(b => { b.onclick = () => go('gallery', b.dataset.mol); });

  const news = update(d => addUnique(d.elements, el.z));
  news.forEach(b => toast(`${b.icon} ${Tp('badge.new')}${L(b.name)}`));

  return { dispose() { window.speechSynthesis?.cancel?.(); unmountSpectrum(); clearJump(); frameWatcher.disconnect(); stage.dispose(); side.remove(); foundBox?.remove(); zoombar.remove(); } };
}
