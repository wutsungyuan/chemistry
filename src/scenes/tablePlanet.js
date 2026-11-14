// 週期表星球:把整張週期表當成一顆星球的「表皮」。18 個族繞星球一圈(每族 20° 經度),7 個週期由北往南排,鑭系與錒系在南半球。
// 拖曳可以轉動星球,點一格進入那個元素。第 18 族(稀有氣體)繞一圈後剛好接回第 1 族——週期表本來就是「繞一圈又回來」的規律。
// 表皮是用 canvas 畫的貼圖(分類顏色、原子序、符號、名稱);篩選分類時重畫。three.js 用動態載入(由 PeriodicTable.js 載入這個檔)。
import * as THREE from 'three';
import { ELEMENTS, CATEGORIES } from '../data/elements.js';

const COLS = 18, ROW_DEG = 12.5, SLOTS = 9.4;                 // 每一列佔 12.5° 緯度;7 個週期 + 0.4 的空隙 + 鑭系、錒系 = 9.4 列
const slotOf = row => (row <= 7 ? row - 1 : row - 1.6);       // 資料裡鑭系是第 9 列、錒系第 10 列 → 第 7.4、8.4 個位置
const LAT_TOP = SLOTS * ROW_DEG / 2;                          // 最上面一列的上緣(北緯)
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };

// 三顆星球各自的表皮,配色和入口頁的那顆星球一樣:國小星是棒棒糖(糖果色的波浪條紋 + 泡泡、粉紅色光暈),
// 國中星是藍灰色條紋 + 星環,高中星是深藍 + 青色經緯網格 + 城市燈光。
const TAU = Math.PI * 2;
function bands(ctx, w, h, colors, amp) {
  const n = colors.length, bh = h / n, edge = (k, x) => k * bh + Math.sin(x / w * TAU * 2 + k * 1.3) * amp + Math.sin(x / w * TAU * 5 + k * 2.1) * amp * 0.35;
  ctx.fillStyle = colors[n - 1]; ctx.fillRect(0, 0, w, h);
  for (let k = 0; k < n; k++) { ctx.fillStyle = colors[k]; ctx.beginPath(); ctx.moveTo(0, edge(k, 0)); for (let x = 0; x <= w; x += 16) ctx.lineTo(x, edge(k, x)); for (let x = w; x >= 0; x -= 16) ctx.lineTo(x, edge(k + 1, x)); ctx.closePath(); ctx.fill(); }
}
const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const SKINS = {
  kid: { glow: 0xff9ad0, grid: 'rgba(255,255,255,.55)', base(ctx, w, h) {
    bands(ctx, w, h, ['#ff8fb8', '#ffd23f', '#8fe6c8', '#8cc9ff', '#ffb36b'], h * 0.035); const r = rng(7);
    for (let i = 0; i < 90; i++) { const x = r() * w, y = h * (0.06 + r() * 0.88), s = h * (0.006 + r() * 0.016); ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.3})`; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
  } },
  teen: { glow: 0x7fb0ff, grid: 'rgba(225,235,255,.4)', ring: true, base(ctx, w, h) { bands(ctx, w, h, ['#4f74a8', '#6f8fbd', '#9db5d6', '#6f8fbd', '#c9d6e8', '#5a7fb5'], h * 0.018); } },
  high: { glow: 0x4f8dff, grid: 'rgba(143,200,255,.6)', outline: true, base(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#12255e'); g.addColorStop(.5, '#0b1a47'); g.addColorStop(1, '#10224f'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const r = rng(99); for (let i = 0; i < 420; i++) { ctx.fillStyle = r() > .5 ? '#ffd98a' : '#8fd0ff'; ctx.fillRect(r() * w, h * (0.05 + r() * 0.9), w / 900, w / 900); }
  } },
};

/** opts:{ lang, level, onPick(element), filter(分類 id 或 null) };回傳 { setFilter, dispose } */
export function mountTablePlanet(host, opts) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const canvas = renderer.domElement; canvas.className = 'ptp-canvas'; host.appendChild(canvas);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x30305a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff4dc, 1.6); sun.position.set(-3, 2.5, 4); scene.add(sun);

  // ---- 表皮貼圖 ----
  const big = renderer.capabilities.maxTextureSize >= 4096 && Math.min(innerWidth, innerHeight) >= 360;
  const TW = big ? 4096 : 2048, TH = TW / 2, cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const ctx = cv.getContext('2d'), cw = TW / COLS, ch = ROW_DEG / 180 * TH, y0 = (90 - LAT_TOP) / 180 * TH;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.wrapS = THREE.RepeatWrapping;
  const byCell = new Map(); ELEMENTS.forEach(e => byCell.set(e.col + ':' + e.row, e));
  let filter = opts.filter || null; const SKIN = SKINS[opts.level] || SKINS.kid;
  function draw() {
    SKIN.base(ctx, TW, TH);
    // 經緯線:經線就是 18 個族的分界(每 20°),緯線對齊每一個週期的分界(每 12.5°),一路畫到兩極
    ctx.strokeStyle = SKIN.grid; ctx.lineWidth = TW / 1300;
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, TH); ctx.stroke(); }
    for (let lat = LAT_TOP + 2 * ROW_DEG; lat > -90; lat -= ROW_DEG) { const y = (90 - lat) / 180 * TH; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TW, y); ctx.stroke(); }
    const zh = opts.lang !== 'en', pad = cw * 0.035, font = '"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif';
    for (const e of ELEMENTS) {
      const x = (e.col - 1) * cw + pad, y = y0 + slotOf(e.row) * ch + pad, w = cw - pad * 2, h = ch - pad * 2, dim = filter && e.cat !== filter, rare = opts.level === 'kid' && !e.fact;
      ctx.globalAlpha = dim ? 0.16 : rare ? 0.6 : 1;
      if (SKIN.outline) {                                                                                   // 高中星:深色格子 + 分類色的細框(和星球表面的深藍網格一致)
        ctx.fillStyle = '#0c1a44'; rr(ctx, x, y, w, h, h * 0.1); ctx.fill(); ctx.strokeStyle = CATEGORIES[e.cat].color; ctx.lineWidth = h * 0.05; rr(ctx, x, y, w, h, h * 0.1); ctx.stroke();
        ctx.fillStyle = CATEGORIES[e.cat].color; ctx.fillRect(x + w * 0.08, y + h * 0.86, w * 0.84, h * 0.06);
      } else {
        if (!dim) { ctx.globalAlpha = 1; ctx.fillStyle = '#f4f6ff'; rr(ctx, x, y, w, h, h * 0.16); ctx.fill(); ctx.globalAlpha = rare ? 0.6 : 1; }   // 先墊一層白底:少見的元素是「顏色淡一點」,不是透出底下的條紋(字才看得清楚)
        ctx.fillStyle = CATEGORIES[e.cat].color; rr(ctx, x, y, w, h, h * 0.16); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(ctx, x, y, w, h * 0.42, h * 0.16); ctx.fill();          // 上半部一點亮面
      }
      if (!dim) ctx.globalAlpha = 1;                                                                        // 字一律不透明
      ctx.fillStyle = SKIN.outline ? '#eaf3ff' : '#14183a'; ctx.textBaseline = 'middle';
      ctx.textAlign = 'left'; ctx.font = `700 ${h * 0.24}px ${font}`; ctx.fillText(String(e.z), x + w * 0.07, y + h * 0.2);
      if (zh) {                                                                                             // 左:符號;右:中文名稱(大)
        ctx.textAlign = 'center'; ctx.font = `800 ${h * 0.46}px ${font}`; ctx.fillText(e.sym, x + w * 0.3, y + h * 0.63);
        ctx.font = `800 ${h * 0.56}px ${font}`; ctx.fillText(e.name.zh, x + w * 0.72, y + h * 0.55);
      } else { ctx.textAlign = 'center'; ctx.font = `800 ${h * 0.6}px ${font}`; ctx.fillText(e.sym, x + w * 0.56, y + h * 0.56); }
    }
    ctx.globalAlpha = 1; tex.needsUpdate = true;
  }
  draw();

  const planet = new THREE.Group(), tilt = new THREE.Group(); tilt.add(planet); scene.add(tilt);
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.42, roughness: 0.6, metalness: 0 });   // 自發光一點:背光那一側的字也看得清楚
  planet.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), mat));
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 32), new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(SKIN.glow) } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vN; uniform vec3 c; void main(){ float i = pow(max(0.0, 0.7 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.5); gl_FragColor = vec4(c * i, i); }',
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  scene.add(glow);
  let ring = null;
  if (SKIN.ring) {                                                // 國中星:和入口頁一樣有一圈星環。星球大小和另外兩顆一樣,星環超出畫面的部分被裁掉沒關係
    const geo = new THREE.RingGeometry(1.24, 1.5, 96, 1), uv = geo.attributes.uv, pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - 1.24) / 0.26, 0.5);
    const rc = document.createElement('canvas'); rc.width = 128; rc.height = 4; const rx = rc.getContext('2d'), rg = rx.createLinearGradient(0, 0, 128, 0);
    [[0, 'rgba(220,232,255,0)'], [.1, 'rgba(220,232,255,.6)'], [.35, 'rgba(180,200,235,.25)'], [.5, 'rgba(230,240,255,.65)'], [.8, 'rgba(170,190,225,.35)'], [1, 'rgba(220,232,255,0)']].forEach(([o, c]) => rg.addColorStop(o, c));
    rx.fillStyle = rg; rx.fillRect(0, 0, 128, 4); const rt = new THREE.CanvasTexture(rc); rt.colorSpace = THREE.SRGBColorSpace;
    ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: rt, side: THREE.DoubleSide, transparent: true, depthWrite: false })); ring.rotation.x = Math.PI / 2; tilt.add(ring);   // 星環在赤道面上(垂直自轉軸),跟著星球一起傾斜
  }

  // ---- 轉動:拖曳(左右轉經度、上下傾斜),放開後有慣性;沒碰之前慢慢自轉 ----
  let yaw = 0.2 * Math.PI, pitch = SKIN.ring ? 0.3 : 0.12, vy = 0, touched = false, down = null, moved = 0, R = 100, W = 1, H = 1;
  function size() {
    W = host.clientWidth || 300; H = host.clientHeight || 300; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    const fit = 1.12 / Math.tan(camera.fov / 2 * Math.PI / 180); camera.position.set(0, 0, W < H ? fit / camera.aspect : fit);           // 星球放進比較短的那一邊
    R = (H / 2) / (camera.position.z * Math.tan(camera.fov / 2 * Math.PI / 180));                                                           // 星球在螢幕上的半徑(px),拖曳多少就轉多少
  }
  const ro = new ResizeObserver(size); ro.observe(host); size();
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, id: e.pointerId }; moved = 0; vy = 0; touched = true; canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!down || e.pointerId !== down.id) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; down.x = e.clientX; down.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    yaw += dx / R; vy = dx / R * 60; pitch = Math.max(-0.95, Math.min(0.95, pitch + dy / R));
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const b = canvas.getBoundingClientRect(); ndc.set((clientX - b.left) / b.width * 2 - 1, -((clientY - b.top) / b.height * 2 - 1)); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(planet.children[0])[0]; if (!hit?.uv) return null;
    const col = Math.floor(((hit.uv.x % 1) + 1) % 1 * COLS) + 1, slot = ((1 - hit.uv.y) * TH - y0) / ch;
    for (const row of [1, 2, 3, 4, 5, 6, 7, 9, 10]) { const s = slotOf(row); if (slot >= s && slot < s + 1) return byCell.get(col + ':' + row) || null; }
    return null;
  }
  const up = e => { if (!down || e.pointerId !== down.id) return; const tap = moved < 8; down = null; if (tap) { vy = 0; const el = pick(e.clientX, e.clientY); if (el) opts.onPick(el); } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', () => { down = null; });

  let raf = 0, last = performance.now(), alive = true;
  (function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame); const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    if (document.hidden) return;
    if (!down) { if (!touched) yaw -= dt * 0.1; else if (Math.abs(vy) > 0.01) { yaw += vy * dt; vy *= Math.exp(-2.6 * dt); } }
    planet.rotation.y = yaw; tilt.rotation.x = pitch; renderer.render(scene, camera);
  })(last);

  canvas.__api = { pickAt: (x, y) => pick(x, y)?.sym || null, center: () => { const b = canvas.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, setYaw: v => { yaw = v; touched = true; vy = 0; } };   // 給 E2E 用
  return {
    setFilter(f) { filter = f || null; draw(); },
    dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); tex.dispose(); mat.dispose(); planet.children[0].geometry.dispose(); glow.geometry.dispose(); glow.material.dispose(); if (ring) { ring.geometry.dispose(); ring.material.map.dispose(); ring.material.dispose(); } renderer.dispose(); canvas.remove(); },
  };
}
