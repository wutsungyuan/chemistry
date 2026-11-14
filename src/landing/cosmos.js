// 入口頁的宇宙背景:星空(一次畫完的 Points)、遠方的星雲光(會隨選到的星球變色)、恆星、以及繞著恆星的「星塵帶」。
// 星塵帶:化學元素與分子的小方塊混在大量的細小塵粒裡,排成一條繞著恆星運轉的環帶——元素本來就是恆星製造出來的。
import * as THREE from 'three';

// 元素(顏色大致沿用週期表分類)與常見分子;分子用下標數字
const TILES = [
  ['H', '#4cc9ff'], ['He', '#b79bff'], ['C', '#6fd6a0'], ['N', '#6fd6a0'], ['O', '#ff6b81'], ['Ne', '#b79bff'], ['Na', '#ff8a7a'], ['Mg', '#ffb36b'],
  ['Al', '#8ec5ff'], ['Si', '#9fe0cf'], ['P', '#6fd6a0'], ['S', '#6fd6a0'], ['Cl', '#ffd23f'], ['K', '#ff8a7a'], ['Ca', '#ffb36b'], ['Fe', '#5aa9ff'],
  ['Cu', '#5aa9ff'], ['Zn', '#5aa9ff'], ['Ag', '#5aa9ff'], ['Au', '#ffd23f'], ['H₂O', '#4cc9ff'], ['CO₂', '#6fd6a0'], ['O₂', '#ff6b81'], ['O₃', '#ff6b81'],
  ['NH₃', '#6fd6a0'], ['CH₄', '#6fd6a0'], ['NaCl', '#ffb36b'], ['HCl', '#ffd23f'], ['H₂', '#4cc9ff'], ['N₂', '#6fd6a0'],
];
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };

/** 小方塊正面的貼圖:整張都是方塊(不留邊),圓角由 3D 外形負責;文字沿用元素色邊框 */
function tileTexture(label, color) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
  ctx.fillStyle = '#0e183c'; ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = color; ctx.lineWidth = 9; rr(ctx, 9, 9, 110, 110, 20); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const size = label.length > 3 ? 32 : label.length > 2 ? 40 : 54; ctx.font = `800 ${size}px system-ui,"Segoe UI","Noto Sans TC",sans-serif`; ctx.fillText(label, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.offset.set(0.5, 0.5); return t;   // ExtrudeGeometry 的正面 uv 就是外形座標(-0.5~0.5),偏移 0.5 對齊
}

/** 小方塊的外形:圓角、有厚度、有斜邊(所有方塊共用一份,用縮放決定大小) */
function tileGeometry() {
  const shape = new THREE.Shape(), hw = 0.5, cr = 0.2;
  shape.moveTo(-hw + cr, -hw); shape.lineTo(hw - cr, -hw); shape.quadraticCurveTo(hw, -hw, hw, -hw + cr); shape.lineTo(hw, hw - cr); shape.quadraticCurveTo(hw, hw, hw - cr, hw);
  shape.lineTo(-hw + cr, hw); shape.quadraticCurveTo(-hw, hw, -hw, hw - cr); shape.lineTo(-hw, -hw + cr); shape.quadraticCurveTo(-hw, -hw, -hw + cr, -hw);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6 }); geo.translate(0, 0, -0.08);
  const n = geo.attributes.normal, uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) if (n.getZ(i) < -0.9) uv.setX(i, -uv.getX(i));   // 背面的貼圖左右對調,翻到背面時字才不會是鏡像
  return geo;
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}

const NEBULA = { kid: [0xff7fb5, 0xffc857], teen: [0x4f7fe0, 0x7fd0ff], high: [0x2b4fd8, 0x35b6ff] };

/** 星空與星雲 */
export function buildCosmos({ stars = 1100 } = {}) {
  const root = new THREE.Group(), disposables = [];
  // 星空:一個大球殼裡隨機的點
  const pos = new Float32Array(stars * 3), col = new Float32Array(stars * 3);
  for (let i = 0; i < stars; i++) {
    const r = 40 + Math.random() * 60, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7, -Math.abs(r * Math.sin(ph) * Math.sin(th)) - 8], i * 3);
    const k = 0.55 + Math.random() * 0.45, warm = Math.random() < 0.18; col.set(warm ? [k, k * 0.85, k * 0.6] : [k * 0.8, k * 0.9, k], i * 3);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const sm = new THREE.PointsMaterial({ size: 0.28, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false });
  root.add(new THREE.Points(sg, sm)); disposables.push(sg, sm);

  // 星雲光:兩個很大的柔光,隨選到的星球變色
  const gt = glowTexture(); disposables.push(gt);
  const nebs = [[-9, 3, -34, 46], [11, -4, -38, 52]].map(([x, y, z, s]) => {
    const m = new THREE.SpriteMaterial({ map: gt, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending }); disposables.push(m);
    const sp = new THREE.Sprite(m); sp.position.set(x, y, z); sp.scale.set(s, s, 1); root.add(sp); return m;
  });
  const lerpColor = new THREE.Color();
  return {
    group: root,
    /** 星雲顏色隨選到的星球(或 null = 預設)慢慢變 */
    tint(level, k) { const [a, b] = NEBULA[level] || NEBULA.high; nebs[0].color.lerp(lerpColor.set(a), k); nebs[1].color.lerp(lerpColor.set(b), k); },
    dispose() { disposables.forEach(d => d.dispose()); },
  };
}

/** 恆星:這個小宇宙的光源。一顆發亮的球 + 三層光暈,會微微脈動。星球的明暗與影子都以它的方向為準。 */
export function buildStar(radius = 1.3) {
  const group = new THREE.Group(), tex = glowTexture(), disposables = [tex];
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), new THREE.MeshBasicMaterial({ color: 0xfffbee })); group.add(core); disposables.push(core.geometry, core.material);
  const glow = (size, color, opacity) => { const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }); disposables.push(m); const sp = new THREE.Sprite(m); sp.scale.set(size, size, 1); group.add(sp); return sp; };
  glow(radius * 3.4, 0xfff6dc, 1);
  const corona = glow(radius * 7, 0xffc861, 0.95), halo = glow(radius * 18, 0xff8f3a, 0.34);
  return {
    group,
    update(t) { const k = 1 + Math.sin(t * 1.7) * 0.04, a = radius * 7 * k, b = radius * 18 * (2 - k); corona.scale.set(a, a, 1); halo.scale.set(b, b, 1); },
    dispose() { disposables.forEach(d => d.dispose()); },
  };
}

/** 星塵帶:繞著恆星的一條傾斜環帶(本地座標:環在 xz 平面、繞 y 軸轉)。分成幾圈,內圈轉得快、外圈轉得慢(克卜勒:角速度 ∝ 半徑的 −1.5 次方)。
 *  每一圈 = 一大把細小的塵粒(一個 Points)+ 幾顆元素/分子的 3D 小方塊(各自慢慢翻轉)。
 *  setCenter(恆星位置):把環帶的中心放在恆星上,平面朝我們這邊傾斜;靠近我們的那一段落在恆星與三顆星球之間的深度。
 *  tiles:方塊數量;dust:塵粒數量(低階裝置都會少一點) */
export function buildBelt({ tiles = 44, dust = 1000, inner = 8, outer = 15.5, bands = 5 } = {}) {
  const group = new THREE.Group(), disposables = [], rings = [], spinning = [];
  const geo = tileGeometry(), dot = glowTexture(); disposables.push(geo, dot);
  const labels = TILES.slice().sort(() => Math.random() - 0.5), width = (outer - inner) / bands;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;      // 大約 −1~1,集中在中間
  for (let b = 0; b < bands; b++) {
    const ring = new THREE.Group(), r0 = inner + b * width, rMid = r0 + width / 2; group.add(ring);
    rings.push({ ring, omega: 0.055 * Math.pow(inner / rMid, 1.5) });
    // 塵粒
    const n = Math.round(dust / bands), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = r0 + Math.random() * width, k = 0.35 + Math.random() * 0.65, warm = Math.random() < 0.5;
      pos.set([Math.cos(a) * r, gauss() * 0.3, Math.sin(a) * r], i * 3); col.set(warm ? [k, k * 0.82, k * 0.55] : [k * 0.75, k * 0.88, k], i * 3);
    }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pm = new THREE.PointsMaterial({ size: 0.24, map: dot, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    ring.add(new THREE.Points(pg, pm)); disposables.push(pg, pm);
    // 元素/分子小方塊
    const count = Math.round(tiles / bands);
    for (let i = 0; i < count; i++) {
      const [label, color] = labels[(b * count + i) % labels.length], tex = tileTexture(label, color);
      const face = new THREE.MeshBasicMaterial({ map: tex }), edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), metalness: 0.4, roughness: 0.4 }); disposables.push(tex, face, edge);
      const mesh = new THREE.Mesh(geo, [face, edge]), a = (i + Math.random() * 0.7) / count * Math.PI * 2, r = r0 + (0.15 + Math.random() * 0.7) * width;
      mesh.scale.setScalar(0.75 + Math.random() * 0.55); mesh.position.set(Math.cos(a) * r, gauss() * 0.22, Math.sin(a) * r); mesh.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
      ring.add(mesh); spinning.push({ mesh, spin: [(Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3] });
    }
  }
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nrm = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), basis = new THREE.Matrix4();
  return {
    group,
    setCenter(starPos, tilt = 0.75) {
      e1.copy(starPos).multiplyScalar(-1).normalize();                               // 從恆星指向三顆星球(世界原點)
      nrm.copy(up).multiplyScalar(Math.cos(tilt)).addScaledVector(e1, Math.sin(tilt)).normalize();   // 環帶平面的法線:從正上方朝我們這邊倒約 43°,所以看到的是一個攤開的橢圓(像俯看土星環),不是一條線
      e1.addScaledVector(nrm, -e1.dot(nrm)).normalize();                             // 本地 x:環帶平面裡最朝向星球的方向
      basis.makeBasis(e1, nrm, e2.crossVectors(e1, nrm));                            // 本地 y = 法線、z = x × y
      group.quaternion.setFromRotationMatrix(basis); group.position.copy(starPos);
    },
    update(dt) {
      for (const r of rings) r.ring.rotation.y += r.omega * dt;
      for (const it of spinning) { it.mesh.rotation.x += it.spin[0] * dt; it.mesh.rotation.y += it.spin[1] * dt; it.mesh.rotation.z += it.spin[2] * dt; }
    },
    dispose() { disposables.forEach(d => d.dispose()); },
  };
}
