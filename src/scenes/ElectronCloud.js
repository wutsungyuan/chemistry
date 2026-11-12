import * as THREE from 'three';
import { createStage } from '../three/stage.js';
import { T, Tp } from '../i18n/index.js';
import { STATES, STATE_IDS, COMPLEX_IDS, sampleCloud, makeRng, beat, composeMix, selectionTable, flowOmega } from '../data/hydrogenOrbital.js';
import { radialGraph } from '../ui/radialGraph.js';
import { cssColor } from '../ui/spectrum.js';
import { setNextTab } from './AtomView.js';
import { isNarrow } from '../ui/layout.js';

// 氫原子的電子雲。只做氫:氫只有一顆電子,波函數有精確解;多電子原子沒有精確解,畫出來會誤導。
// 兩個難度:🌱 國小(「拍照」:每按一次在電子可能出現的地方亮一個點,拍多了雲就浮現)、🔭 國中(完整的雲 + 節點 + 名稱 + 能量)。
const LEVELS = ['kid', 'teen', 'high'];
const advanced = l => l !== 'kid';          // 國中與高中:完整的雲、節點、切開看
const FLOW_POINTS = 500;                    // 高中:機率流的示蹤粒子數
const FLOW_SECONDS = 5;                     // 畫面上,離 z 軸一半雲半徑處的粒子繞一圈要幾秒(放慢)

// 波函數公式(原子單位:a₀ = 1)。顯示用的 HTML 字串(數學符號,不經過翻譯/注音)
const FORMULA = {
  '1s': { R: 'R<sub>10</sub>(r) = 2 e<sup>−r</sup>', Y: 'Y<sub>0</sub><sup>0</sup> = 1/√(4π)' },
  '2s': { R: 'R<sub>20</sub>(r) = (1/2√2)(2 − r) e<sup>−r/2</sup>', Y: 'Y<sub>0</sub><sup>0</sup> = 1/√(4π)' },
  '2p': { R: 'R<sub>21</sub>(r) = (1/2√6) r e<sup>−r/2</sup>', Y: 'Y<sub>1</sub><sup>0</sup> = √(3/4π) cosθ' },
  '3d': { R: 'R<sub>32</sub>(r) = (4/81√30) r² e<sup>−r/3</sup>', Y: 'Y<sub>2</sub><sup>0</sup> = √(5/16π)(3cos²θ − 1)' },
  '2p+1': { R: 'R<sub>21</sub>(r) = (1/2√6) r e<sup>−r/2</sup>', Y: 'Y<sub>1</sub><sup>1</sup> = −√(3/8π) sinθ e<sup>iφ</sup>' },
  '3d+2': { R: 'R<sub>32</sub>(r) = (4/81√30) r² e<sup>−r/3</sup>', Y: 'Y<sub>2</sub><sup>2</sup> = (1/4)√(15/2π) sin²θ e<sup>2iφ</sup>' },
};
const MAX_POINTS = 24000;                 // 每個狀態預先取樣的點數
const FULL_POINTS = 9000;                 // 國中版預設顯示的點數
const MIX_POINTS = 12000;                 // 疊加態的點數
const MIX_PERIOD = 2.4;                   // 疊加態:放慢後,畫面上晃一次要幾秒(真實是 2.19×10⁻¹⁵ 秒)
const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

export function mount(container, startId) {
  const stage = createStage(container, { camPos: [0, 1.2, 8.5] });
  stage.controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  stage.controls.autoRotateSpeed = 0.9;
  stage.controls.enablePan = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let level = LEVELS.includes(store.get('cloudLevel', 'kid')) ? store.get('cloudLevel', 'kid') : 'kid';
  let id = STATES[startId] || startId === 'mix' ? startId : '1s';
  if (COMPLEX_IDS.includes(id) && level !== 'high') id = '2p';       // m ≠ 0 的複數軌域只在高中層
  let mixFrac = 0.5, playing = false, phase = 0, pools = null;           // 疊加態:mixFrac = 在 3d 的機率;phase = 現在晃到哪(弧度)
  let shown = 0, cur = null, auto = false, flash = 0, slice = false;     // 預設「立體」;可以按「切開看」只留通過原子核的一薄片,看裡面的節點(空洞)
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

  // 發光:晃動的電荷像一根天線,在「水平面」(垂直晃動方向)往外送出光波(紅色 = Hα 656 nm)。沿著晃動方向(上下)不放光。
  const lightGroup = new THREE.Group(); lightGroup.visible = false; stage.scene.add(lightGroup);
  const lightColor = new THREE.Color(cssColor(656.3)), rings = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.955, 1, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: lightColor, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
    m.renderOrder = 10; lightGroup.add(m); return m;
  });
  const strength = () => 2 * Math.sqrt(mixFrac * (1 - mixFrac));          // 2ab:晃動(與發光)的大小,50:50 最大 = 1,純態 = 0
  // 複數軌域(m ≠ 0):每個點依相位 mφ 上色(色環),另外放一些示蹤粒子沿 z 軸環繞(機率流)。波函數的整體相位轉動看不出來,所以顏色固定。
  const HUES = Array.from({ length: 48 }, (_, i) => new THREE.Color().setHSL(i / 48, 0.9, 0.6));
  const flowGeo = new THREE.BufferGeometry();
  const flowMat = new THREE.PointsMaterial({ size: 0.12, color: 0xffffff, map: dotTex, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const flow = new THREE.Points(flowGeo, flowMat); flow.frustumCulled = false; flow.visible = false; group.add(flow);
  let flowM = 0, flowK = 0, flowRhoMin = 1;
  const CYAN = new THREE.Color(0x7fd6f5), WARM = new THREE.Color(0xffa63d), COOL = new THREE.Color(0x5db4ff);   // 疊加混色:點很多時中間不要整片死白,才看得出濃淡

  /** 換狀態:重新取樣(同一個狀態每次結果相同,不會每次都不一樣),並把雲縮放到剛好填滿畫面 */
  function load(newId) {
    id = newId;
    if (id === 'mix') return loadMix();
    lightGroup.visible = false;
    const { pos, sign } = sampleCloud(id, MAX_POINTS, makeRng(1000 + [...STATE_IDS, ...COMPLEX_IDS].indexOf(id)));
    // 座標軸:波函數的 z 軸 → three.js 的向上(y)
    const p = new Float32Array(pos.length);
    for (let i = 0; i < MAX_POINTS; i++) { p[3 * i] = pos[3 * i]; p[3 * i + 1] = pos[3 * i + 2]; p[3 * i + 2] = pos[3 * i + 1]; }
    const rs = Array.from({ length: MAX_POINTS }, (_, i) => Math.hypot(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2])).sort((a, b) => a - b);
    const r95 = rs[Math.floor(MAX_POINTS * 0.95)];
    cur = { p, sign, scale: 2.4 / r95, r95, complex: !!STATES[id].complex, m: STATES[id].m };
    if (cur.complex) { cur.phi = new Float32Array(MAX_POINTS); for (let i = 0; i < MAX_POINTS; i++) cur.phi[i] = Math.atan2(pos[3 * i + 1], pos[3 * i]); }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    group.scale.setScalar(cur.scale);
    mat.size = 0.075 / cur.scale;                                   // 點的大小固定(畫面上),不隨雲的縮放變
    hiMat.size = 0.34 / cur.scale; flowMat.size = 0.09 / cur.scale;
    setupFlow();
    recolor(); applyView(); hiMat.opacity = 0;
  }
  /** 機率流:複數軌域才有。示蹤粒子取自雲本身(所以疏密就是機率密度),繞 z 軸(three.js 的 y 軸)轉,角速度 ω = m/ρ²(ρ = 離 z 軸的距離) */
  function setupFlow() {
    flow.visible = false; flowM = 0;
    if (!cur.complex || level !== 'high') return;
    const p = new Float32Array(FLOW_POINTS * 3); p.set(cur.p.subarray(0, FLOW_POINTS * 3));
    flowGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const rho0 = 0.5 * cur.r95; flowM = cur.m; flowK = (2 * Math.PI / FLOW_SECONDS) * rho0 * rho0; flowRhoMin = 0.12 * cur.r95;   // 比例常數:ρ0 處(m=1)繞一圈 FLOW_SECONDS 秒;離軸太近的粒子限速
    flow.visible = true;
  }
  function stepFlow(dt) {
    if (!flow.visible) return;
    const a = flowGeo.attributes.position.array;
    for (let i = 0; i < FLOW_POINTS; i++) {
      const x = a[3 * i], z = a[3 * i + 2], rho = Math.max(Math.hypot(x, z), flowRhoMin), w = flowK * flowOmega(flowM, rho) * dt, c = Math.cos(w), sn = Math.sin(w);
      a[3 * i] = x * c - z * sn; a[3 * i + 2] = x * sn + z * c;           // 繞 y 軸轉(m > 0:逆時針,從 +z 軸看向原點)
    }
    flowGeo.attributes.position.needsUpdate = true;
  }
  /** 疊加態 2p + 3d:點由「時間平均密度」取樣,每個點的亮度隨時間 ∝ 1 + c·cos(ωt)(見 hydrogenOrbital.composeMix) */
  function loadMix() {
    pools ??= { p2: sampleCloud('2p', MIX_POINTS, makeRng(2001)), p3: sampleCloud('3d', MIX_POINTS, makeRng(2002)) };
    const rs = Array.from({ length: MIX_POINTS }, (_, i) => Math.hypot(pools.p3.pos[3 * i], pools.p3.pos[3 * i + 1], pools.p3.pos[3 * i + 2])).sort((a, b) => a - b);
    const r95 = rs[Math.floor(MIX_POINTS * 0.95)];                         // 固定用 3d 的大小取景,拖滑桿時畫面不會忽大忽小
    cur = { p: new Float32Array(MIX_POINTS * 3), c: null, sign: null, scale: 2.4 / r95, r95, mix: true };
    geo.setAttribute('position', new THREE.BufferAttribute(cur.p, 3));
    const col = new THREE.BufferAttribute(new Float32Array(MIX_POINTS * 3), 3); col.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('color', col);
    group.scale.setScalar(cur.scale); mat.size = 0.06 / cur.scale; hiMat.size = 0.34 / cur.scale; hiMat.opacity = 0;
    recomposeMix(); applyView(); lightGroup.visible = true;
    paintMix();
  }
  function recomposeMix() {
    const { pos, c } = composeMix(pools.p2, pools.p3, MIX_POINTS, mixFrac);
    for (let i = 0; i < MIX_POINTS; i++) { cur.p[3 * i] = pos[3 * i]; cur.p[3 * i + 1] = pos[3 * i + 2]; cur.p[3 * i + 2] = pos[3 * i + 1]; }   // ψ 的 z 軸 → 向上(y)
    cur.c = c; geo.attributes.position.needsUpdate = true;
  }
  /** 把目前的相位畫上去:每個點的亮度 = (1 + c·cos φ)/2,再乘上基本色 */
  function paintMix() {   // 亮度加一點對比(次方),晃動才看得清楚
    if (!cur?.mix) return;
    const col = geo.attributes.color.array, cs = Math.cos(phase), base = advanced(level) ? WARM : CYAN;
    for (let i = 0; i < MIX_POINTS; i++) { const k = Math.pow(0.5 * (1 + cur.c[i] * cs), 1.4); col[3 * i] = base.r * k; col[3 * i + 1] = base.g * k; col[3 * i + 2] = base.b * k; }
    geo.attributes.color.needsUpdate = true;
  }
  /** 國中版的「切開看 / 立體」:切開 = 只留一薄片(z=0 的剖面,像把蘋果切開看裡面);立體 = 整團雲。切開時鏡頭正對剖面、不自動旋轉 */
  const planes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)];
  function applyView() {
    const sliced = (advanced(level) || cur.mix) && slice, t = 0.09 * cur.r95 * cur.scale;
    planes[0].constant = t; planes[1].constant = t;                    // 世界座標:厚度 = 雲半徑的 9%
    mat.clippingPlanes = sliced ? planes : [];
    mat.opacity = cur.mix ? (sliced ? 0.35 : 0.22) : cur.complex ? (sliced ? 0.3 : 0.14) : advanced(level) ? (sliced ? 0.4 : 0.3) : 0.55;        // 點很多時用加法混色會整片發白:滿雲(立體)調淡,才看得出濃淡
    shown = cur.mix ? MIX_POINTS : advanced(level) ? (sliced ? MAX_POINTS : FULL_POINTS) : 0;
    geo.setDrawRange(0, shown);
    buildNodes();
    stage.controls.autoRotate = !reduced && !sliced && !cur.mix;      // 疊加態不自動轉,才看得清楚上下晃動
    const L = stage.camera.position.length();
    if (sliced) stage.camera.position.set(0, 0, L);                                  // 切開看:鏡頭正對剖面(不用再轉就看得到)
    else if (cur.complex) stage.camera.position.set(0, 0.82 * L, 0.57 * L);        // 複數軌域(繞 z 軸的甜甜圈):從斜上方往下看,才看得到圈和一圈的相位色環
    else if (cur.mix) stage.camera.position.set(0, 0.3 * L, 0.954 * L);             // 疊加態(立體):鏡頭略微從上往下看,水平面上的光波圈才看得出是圈(正面看只是一條線)
    else if (advanced(level)) stage.camera.position.set(0, 1.2, stage.camera.position.length());
    stage.controls.update();
  }
  function recolor() {
    if (cur.mix) { paintMix(); return; }
    const col = new Float32Array(MAX_POINTS * 3);
    for (let i = 0; i < MAX_POINTS; i++) { const c = cur.complex ? HUES[Math.floor((((cur.m * cur.phi[i]) / (2 * Math.PI)) % 1 + 1) % 1 * 48) % 48] : advanced(level) ? (cur.sign[i] > 0 ? WARM : COOL) : CYAN; col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  /** 節點:電子「絕不會出現」的地方(只有國中版畫出來) */
  function buildNodes() {
    nodes.clear();
    if (!advanced(level) || !STATES[id] || STATES[id].complex) return;
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

  /** 高中層:量子數、公式、徑向機率圖、相位與機率流 */
  function highHTML(parts) {
    const s = STATES[id], f = FORMULA[id], { svg } = radialGraph(id, { labelMean: Tp('cloud.high.mean'), labelPeak: Tp('cloud.high.peak') });
    parts.push(`<p>${T('cloud.high.qn', { n: s.n, l: s.l, m: s.m, sh: Tp('cloud.l.' + s.shape.replace(/\d/, '')) })} ${T('cloud.teen.E', { E: s.E.toFixed(2) })}</p>`);
    parts.push(`<div class="cl-formula"><div>ψ<sub>${s.n}${s.l}${s.m}</sub>(r,θ,φ) = R<sub>${s.n}${s.l}</sub>(r) · Y<sub>${s.l}</sub><sup>${s.m}</sup>(θ,φ)</div><div>${f.R}</div><div>${f.Y}</div><div>E<sub>n</sub> = −13.6 eV / n²</div></div>`);
    parts.push(`<p>${T('cloud.node.' + id)}</p>`);
    parts.push(`<p><b>${T('cloud.high.graph')}</b></p><div class="cl-graph">${svg}</div><p class="cl-scale">${T('cloud.high.graph.note')}</p>`);
    parts.push(`<p>${T(s.complex ? 'cloud.high.complex' : 'cloud.high.real')}</p>`);
    if (!s.complex) parts.push(`<p class="cl-scale">${T('cloud.high.try')}</p>`);
    parts.push(`<p>${T(slice ? 'cloud.teen.slice' : 'cloud.teen.solid')}</p>`, `<p class="cl-honest">${T('cloud.high.honest')}</p>`);
    return parts.join('');
  }
  /** 高中層的疊加態:含時間的波函數、拍頻、選擇定則表 */
  function highMixHTML(b, a2, b2) {
    const rows = selectionTable().map(r => `<tr class="${r.glows ? 'yes' : 'no'}"><td>${r.a} ↔ ${r.b}</td><td>Δl = ${r.dl}</td><td>${r.D.toFixed(2)}</td><td>${r.glows ? '✔' : '✘'} ${r.reason === 'sameE' ? Tp('cloud.high.sameE') : r.reason === 'deltaL' ? Tp('cloud.high.dl') : ''}</td></tr>`).join('');
    return `<div class="cl-formula"><div>ψ(t) = a·ψ<sub>2p</sub>e<sup>−iE₂t/ħ</sup> + b·ψ<sub>3d</sub>e<sup>−iE₃t/ħ</sup></div><div>|ψ|² = a²ψ<sub>2p</sub>² + b²ψ<sub>3d</sub>² + 2ab·ψ<sub>2p</sub>ψ<sub>3d</sub>·cos(ωt)</div><div>ω = (E₃ − E₂)/ħ,  f = ΔE/h = ${(b.freq / 1e14).toFixed(2)}×10¹⁴ Hz,  λ = c/f = ${Math.round(b.nm)} nm</div><div>⟨z⟩(t) = 2ab·D·cos(ωt),  D = ∫ψ<sub>2p</sub> z ψ<sub>3d</sub> dV</div></div>`
      + `<p><b>${T('cloud.high.rule')}</b></p><table class="cl-table"><thead><tr><th>${T('cloud.high.pair')}</th><th></th><th>|D| (a₀)</th><th></th></tr></thead><tbody>${rows}</tbody></table><p class="cl-scale">${T('cloud.high.rule.note')}</p>`;
  }
  function infoHTML() {
    if (id === 'mix') {
      const b = beat(3, 2), a2 = Math.round((1 - mixFrac) * 100), b2 = 100 - a2, st = strength();
      const parts = [`<p class="cl-lead">${T('cloud.mix.lead.' + level)}</p>`, `<p class="cl-state"><b>${T('cloud.name.mix')}</b> — ${T(st < 0.02 ? 'cloud.mix.pure' : 'cloud.mix.desc')}</p>`];
      if (level === 'high') parts.push(highMixHTML(b, a2, b2));
      if (advanced(level)) parts.push(`<p>${T('cloud.mix.teen', { a: a2, b: b2, dE: b.dE.toFixed(2), f: (b.freq / 1e14).toFixed(2), nm: Math.round(b.nm), T: (b.period * 1e15).toFixed(2) })}</p>`, `<p class="cl-scale">${T('cloud.mix.slow', { x: '10¹⁵' })}</p>`, `<p>${T(slice ? 'cloud.teen.slice' : 'cloud.teen.solid')}</p>`);
      parts.push(`<p class="cl-honest">${T('cloud.mix.honest')}</p>`);
      return parts.join('');
    }
    const s = STATES[id], k = id;
    const parts = [`<p class="cl-lead">${T('cloud.lead.' + level)}</p>`, `<p class="cl-state"><b>${T('cloud.name.' + k)}</b> — ${T('cloud.desc.' + k)}</p>`];
    if (level === 'high') return highHTML(parts);
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
    <div class="cl-states">${STATE_IDS.map(s => `<button class="chip" data-state="${s}">${s}</button>`).join('')}${COMPLEX_IDS.map(s => `<button class="chip cl-complex" data-state="${s}">${s.replace('+', '₊')}</button>`).join('')}<button class="chip cl-mixchip" data-state="mix">🌊 ${T('cloud.chip.mix')}</button><button class="chip cl-slice" data-slice>✂️ ${T('cloud.slice')}</button></div>
    <div class="cl-mix"><label>2p <input type="range" class="cl-mixrange" min="0" max="100" step="1" value="50" aria-label="${Tp('cloud.mix.slider')}"> 3d</label><span class="cl-mixread"></span></div>
    <div class="cl-count"></div>
    <div class="cl-info"></div>
    <div class="cl-actions">
      <button class="btn" data-act="play">❚❚ ${T('cloud.pause')}</button>
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
    side.dataset.level = level; side.dataset.mode = id === 'mix' ? 'mix' : 'single';
    side.querySelector('.cl-mixrange').value = Math.round(mixFrac * 100);
    updateMixRead();
    btn('play').innerHTML = (playing ? '❚❚ ' : '▶ ') + T(playing ? 'cloud.pause' : 'cloud.play');
    btn('auto').classList.toggle('on', auto);
    btn('auto').innerHTML = `${auto ? '❚❚' : '▶'} ${T('cloud.auto')}`;
    history.replaceState(null, '', `#cloud/${id}`);
  }
  const updateMixRead = () => { const a2 = Math.round((1 - mixFrac) * 100); side.querySelector('.cl-mixread').innerHTML = T('cloud.mix.read', { a: a2, b: 100 - a2, s: Math.round(strength() * 100) }); };
  function add(n) {
    const from = shown; shown = Math.min(MAX_POINTS, shown + n); geo.setDrawRange(0, shown);
    // 剛拍到的點用黃色大光點閃一下(最多 60 個)
    const k = Math.min(60, shown - from); if (k > 0) { hiGeo.setAttribute('position', new THREE.BufferAttribute(cur.p.slice(3 * (shown - k), 3 * shown), 3)); hiMat.opacity = 1; flash = 0.7; }
    if (shown >= MAX_POINTS && auto) { auto = false; refresh(); } else updateCount();      // 只更新數字;整個面板重畫只在換難度/狀態/連拍開關時
  }
  side.querySelector('.cl-back').onclick = () => { setNextTab('spec'); location.hash = '#atom/1'; };
  side.querySelectorAll('[data-level]').forEach(b => b.onclick = () => { level = b.dataset.level; store.set('cloudLevel', level); auto = false; if (COMPLEX_IDS.includes(id) && level !== 'high') id = '2p'; load(id); refresh(); });
  side.querySelectorAll('[data-state]').forEach(b => b.onclick = () => { auto = false; load(b.dataset.state); refresh(); });
  side.querySelector('[data-slice]').onclick = () => { slice = !slice; auto = false; applyView(); refresh(); };
  side.querySelector('.cl-mixrange').oninput = e => { mixFrac = +e.target.value / 100; recomposeMix(); paintMix(); updateMixRead(); info.innerHTML = infoHTML(); };
  btn('play').onclick = () => { playing = !playing; refresh(); };
  btn('one').onclick = () => add(1);
  btn('hundred').onclick = () => add(100);
  btn('all').onclick = () => { auto = false; shown = 0; add(advanced(level) && slice ? MAX_POINTS : FULL_POINTS); };
  btn('clear').onclick = () => { auto = false; shown = 0; geo.setDrawRange(0, 0); hiMat.opacity = 0; refresh(); };
  btn('auto').onclick = () => { if (reduced) { add(300); return; } auto = !auto; if (auto && shown >= MAX_POINTS) { shown = 0; geo.setDrawRange(0, 0); } refresh(); };

  let acc = 0;
  const off = stage.onFrame(dt => {
    if (auto) { acc += dt * (60 + shown * 0.05); const n = Math.floor(acc); if (n > 0) { acc -= n; add(n); } }       // 連拍:越拍越快
    if (flash > 0) { flash -= dt; hiMat.opacity = Math.max(0, flash / 0.7); }
    stepFlow(dt);
    if (cur?.mix) {
      if (playing) { phase += (dt * 2 * Math.PI) / MIX_PERIOD; paintMix(); }
      const st = strength();                                                  // 光波:每個週期送出一圈,大小隨晃動強度;純態沒有光
      rings.forEach((r, k) => {
        const u = ((phase / (2 * Math.PI)) + k / 3) % 1, rad = 1.3 + 4.2 * u;
        r.scale.set(rad, 1, rad); r.material.opacity = st * 0.95 * Math.pow(1 - u, 1.2);
      });
    }
  });

  stage.setCenterShift(() => (isNarrow() ? 0 : side.offsetWidth / 2));       // 桌面:左邊有面板,把雲移到剩下的空間中央
  playing = !reduced;
  load(id); refresh();
  // 手機面板在 3D 下方,桌面在右側;3D 取景由雲的 95% 半徑固定,不需要另外取景
  return { dispose() { off(); geo.dispose(); hiGeo.dispose(); mat.dispose(); hiMat.dispose(); flowGeo.dispose(); flowMat.dispose(); dotTex.dispose(); rings.forEach(r => { r.geometry.dispose(); r.material.dispose(); }); stage.dispose(); } };
}
