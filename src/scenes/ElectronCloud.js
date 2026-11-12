import * as THREE from 'three';
import { createStage } from '../three/stage.js';
import { T, Tp } from '../i18n/index.js';
import { STATES, STATE_IDS, sampleCloud, makeRng } from '../data/hydrogenOrbital.js';
import { setNextTab } from './AtomView.js';
import { isNarrow } from '../ui/layout.js';

// 氫原子的電子雲。只做氫:氫只有一顆電子,波函數有精確解;多電子原子沒有精確解,畫出來會誤導。
// 兩個難度:🌱 國小(「拍照」:每按一次在電子可能出現的地方亮一個點,拍多了雲就浮現)、🔭 國中(完整的雲 + 節點 + 名稱 + 能量)。
const LEVELS = ['kid', 'teen'];
const MAX_POINTS = 24000;                 // 每個狀態預先取樣的點數
const FULL_POINTS = 9000;                 // 國中版預設顯示的點數
const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

export function mount(container, startId) {
  const stage = createStage(container, { camPos: [0, 1.2, 8.5] });
  stage.controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  stage.controls.autoRotateSpeed = 0.9;
  stage.controls.enablePan = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let level = LEVELS.includes(store.get('cloudLevel', 'kid')) ? store.get('cloudLevel', 'kid') : 'kid';
  let id = STATES[startId] ? startId : '1s';
  let shown = 0, cur = null, auto = false, flash = 0, slice = true;      // 國中版預設「切開看」:只留通過原子核的一薄片,才看得到裡面的節點(空洞)
  stage.renderer.localClippingEnabled = true;

  const group = new THREE.Group(); stage.scene.add(group);
  const nodes = new THREE.Group(); group.add(nodes);

  // ---------- 點雲 ----------
  // 圓形柔邊的點(預設是方塊,看起來像馬賽克)
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,.85)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const dotTex = new THREE.CanvasTexture(c);
  const geo = new THREE.BufferGeometry();
  const mat = new THREE.PointsMaterial({ size: 0.075, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, map: dotTex });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false; group.add(points);
  const hiGeo = new THREE.BufferGeometry();
  const hiMat = new THREE.PointsMaterial({ size: 0.34, color: 0xffe066, map: dotTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const hi = new THREE.Points(hiGeo, hiMat); hi.frustumCulled = false; group.add(hi);

  const CYAN = new THREE.Color(0x7fd6f5), WARM = new THREE.Color(0xffa63d), COOL = new THREE.Color(0x5db4ff);   // 疊加混色:點很多時中間不要整片死白,才看得出濃淡

  /** 換狀態:重新取樣(同一個狀態每次結果相同,不會每次都不一樣),並把雲縮放到剛好填滿畫面 */
  function load(newId) {
    id = newId;
    const { pos, sign } = sampleCloud(id, MAX_POINTS, makeRng(1000 + STATE_IDS.indexOf(id)));
    // 座標軸:波函數的 z 軸 → three.js 的向上(y)
    const p = new Float32Array(pos.length);
    for (let i = 0; i < MAX_POINTS; i++) { p[3 * i] = pos[3 * i]; p[3 * i + 1] = pos[3 * i + 2]; p[3 * i + 2] = pos[3 * i + 1]; }
    const rs = Array.from({ length: MAX_POINTS }, (_, i) => Math.hypot(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2])).sort((a, b) => a - b);
    const r95 = rs[Math.floor(MAX_POINTS * 0.95)];
    cur = { p, sign, scale: 2.4 / r95, r95 };
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    group.scale.setScalar(cur.scale);
    mat.size = 0.075 / cur.scale;                                   // 點的大小固定(畫面上),不隨雲的縮放變
    hiMat.size = 0.34 / cur.scale;
    recolor(); applyView(); hiMat.opacity = 0;
  }
  /** 國中版的「切開看 / 立體」:切開 = 只留一薄片(z=0 的剖面,像把蘋果切開看裡面);立體 = 整團雲。切開時鏡頭正對剖面、不自動旋轉 */
  const planes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)];
  function applyView() {
    const sliced = level === 'teen' && slice, t = 0.09 * cur.r95 * cur.scale;
    planes[0].constant = t; planes[1].constant = t;                    // 世界座標:厚度 = 雲半徑的 9%
    mat.clippingPlanes = sliced ? planes : [];
    mat.opacity = level === 'teen' ? (sliced ? 0.4 : 0.3) : 0.55;        // 點很多時用加法混色會整片發白:滿雲(立體)調淡,才看得出濃淡
    shown = level === 'teen' ? (sliced ? MAX_POINTS : FULL_POINTS) : 0;
    geo.setDrawRange(0, shown);
    buildNodes();
    stage.controls.autoRotate = !reduced && !sliced;
    if (sliced) stage.camera.position.set(0, 0, stage.camera.position.length()); else if (level === 'teen') stage.camera.position.set(0, 1.2, stage.camera.position.length());
    stage.controls.update();
  }
  function recolor() {
    const col = new Float32Array(MAX_POINTS * 3);
    for (let i = 0; i < MAX_POINTS; i++) { const c = level === 'teen' ? (cur.sign[i] > 0 ? WARM : COOL) : CYAN; col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  /** 節點:電子「絕不會出現」的地方(只有國中版畫出來) */
  function buildNodes() {
    nodes.clear();
    if (level !== 'teen') return;
    const s = STATES[id], sliced = slice, clip = sliced ? planes : [], lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.4, depthWrite: false, clippingPlanes: clip });
    for (const r of s.nodesR) nodes.add(new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), lineMat));                // 2s:一個球面
    if (id === '2p') nodes.add(new THREE.Mesh(new THREE.CircleGeometry(cur.r95 * 1.1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: clip })));   // 2p:腰部一個平面
    if (id === '3d') for (const sg of [1, -1]) {                                                                      // 3d:兩個圓錐(上下各一個,尖端在原子核)
      const h = cur.r95 * 0.9, ang = Math.acos(1 / Math.sqrt(3)), cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(ang) * h, h, 32, 1, true), lineMat);
      cone.position.y = sg * h / 2; if (sg > 0) cone.rotation.x = Math.PI; nodes.add(cone);
    }
  }

  // ---------- 面板 ----------
  const side = document.createElement('div');
  side.className = 'side cloud-side';
  container.appendChild(side);

  function infoHTML() {
    const s = STATES[id], k = id;
    const parts = [`<p class="cl-lead">${T('cloud.lead.' + level)}</p>`, `<p class="cl-state"><b>${T('cloud.name.' + k)}</b> — ${T('cloud.desc.' + k)}</p>`];
    if (level === 'teen') {
      parts.push(`<p>${T('cloud.teen.nl', { n: s.n, l: Tp('cloud.l.' + s.shape) })} ${T('cloud.teen.E', { E: s.E.toFixed(2) })}</p>`);
      parts.push(`<p>${T('cloud.node.' + k)}</p>`);
      parts.push(`<p>${T('cloud.teen.color')}</p>`);
      parts.push(`<p class="cl-scale">${T('cloud.teen.scale')}</p>`);
    }
    if (level === 'teen') parts.push(`<p>${T(slice ? 'cloud.teen.slice' : 'cloud.teen.solid')}</p>`);
    parts.push(`<p class="cl-honest">${T('cloud.honest')}</p>`);
    return parts.join('');
  }
  side.innerHTML = `
    <h2>🌫️ ${T('cloud.title')}</h2>
    <div class="cl-bar"><button class="chip cl-back">← ${T('cloud.back')}</button>
      <span class="cl-levels">${LEVELS.map(l => `<button class="chip" data-level="${l}">${T('cloud.level.' + l)}</button>`).join('')}</span></div>
    <div class="cl-states">${STATE_IDS.map(s => `<button class="chip" data-state="${s}">${s}</button>`).join('')}<button class="chip cl-slice" data-slice>✂️ ${T('cloud.slice')}</button></div>
    <div class="cl-count"></div>
    <div class="cl-info"></div>
    <div class="cl-actions">
      <button class="btn" data-act="one">📸 ${T('cloud.snap1')}</button>
      <button class="btn alt" data-act="hundred">📸×100</button>
      <button class="btn alt" data-act="auto">▶ ${T('cloud.auto')}</button>
      <button class="btn alt" data-act="all">✨ ${T('cloud.all')}</button>
      <button class="btn alt" data-act="clear">↺ ${T('cloud.clear')}</button>
    </div>`;
  const info = side.querySelector('.cl-info'), count = side.querySelector('.cl-count');
  const updateCount = () => { count.innerHTML = T('cloud.count', { n: shown }); };
  const btn = a => side.querySelector(`[data-act=${a}]`);

  function refresh() {
    info.innerHTML = infoHTML();
    side.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === level));
    side.querySelectorAll('[data-state]').forEach(b => b.classList.toggle('on', b.dataset.state === id));
    side.querySelector('[data-slice]').classList.toggle('on', slice);
    side.querySelector('[data-slice]').innerHTML = (slice ? '✂️ ' : '🧊 ') + T(slice ? 'cloud.slice' : 'cloud.solid');
    updateCount();
    side.dataset.level = level;
    btn('auto').classList.toggle('on', auto);
    btn('auto').innerHTML = `${auto ? '⏸' : '▶'} ${T('cloud.auto')}`;
    history.replaceState(null, '', `#cloud/${id}`);
  }
  function add(n) {
    const from = shown; shown = Math.min(MAX_POINTS, shown + n); geo.setDrawRange(0, shown);
    // 剛拍到的點用黃色大光點閃一下(最多 60 個)
    const k = Math.min(60, shown - from); if (k > 0) { hiGeo.setAttribute('position', new THREE.BufferAttribute(cur.p.slice(3 * (shown - k), 3 * shown), 3)); hiMat.opacity = 1; flash = 0.7; }
    if (shown >= MAX_POINTS && auto) { auto = false; refresh(); } else updateCount();      // 只更新數字;整個面板重畫只在換難度/狀態/連拍開關時
  }
  side.querySelector('.cl-back').onclick = () => { setNextTab('spec'); location.hash = '#atom/1'; };
  side.querySelectorAll('[data-level]').forEach(b => b.onclick = () => { level = b.dataset.level; store.set('cloudLevel', level); auto = false; load(id); refresh(); });
  side.querySelectorAll('[data-state]').forEach(b => b.onclick = () => { auto = false; load(b.dataset.state); refresh(); });
  side.querySelector('[data-slice]').onclick = () => { slice = !slice; auto = false; applyView(); refresh(); };
  btn('one').onclick = () => add(1);
  btn('hundred').onclick = () => add(100);
  btn('all').onclick = () => { auto = false; shown = 0; add(level === 'teen' && slice ? MAX_POINTS : FULL_POINTS); };
  btn('clear').onclick = () => { auto = false; shown = 0; geo.setDrawRange(0, 0); hiMat.opacity = 0; refresh(); };
  btn('auto').onclick = () => { if (reduced) { add(300); return; } auto = !auto; if (auto && shown >= MAX_POINTS) { shown = 0; geo.setDrawRange(0, 0); } refresh(); };

  let acc = 0;
  const off = stage.onFrame(dt => {
    if (auto) { acc += dt * (60 + shown * 0.05); const n = Math.floor(acc); if (n > 0) { acc -= n; add(n); } }       // 連拍:越拍越快
    if (flash > 0) { flash -= dt; hiMat.opacity = Math.max(0, flash / 0.7); }
  });

  stage.setCenterShift(() => (isNarrow() ? 0 : side.offsetWidth / 2));       // 桌面:左邊有面板,把雲移到剩下的空間中央
  load(id); refresh();
  // 手機面板在 3D 下方,桌面在右側;3D 取景由雲的 95% 半徑固定,不需要另外取景
  return { dispose() { off(); geo.dispose(); hiGeo.dispose(); mat.dispose(); hiMat.dispose(); dotTex.dispose(); stage.dispose(); } };
}
