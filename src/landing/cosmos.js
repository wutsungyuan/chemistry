// 入口頁的宇宙背景:星空(一次畫完的 Points)、緩緩漂浮的化學元素與分子標籤(像週期表的小方塊)、遠方的星雲光(會隨選到的版本變色)。
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

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}

const NEBULA = { kid: [0xff7fb5, 0xffc857], teen: [0x4f7fe0, 0x7fd0ff], high: [0x2b4fd8, 0x35b6ff] };

/** count:標籤數量(低階裝置會少一點) */
export function buildCosmos({ count = 40, stars = 1100 } = {}) {
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

  // 星雲光:兩個很大的柔光,隨版本變色
  const gt = glowTexture(); disposables.push(gt);
  const nebs = [[-9, 3, -34, 46], [11, -4, -38, 52]].map(([x, y, z, s]) => {
    const m = new THREE.SpriteMaterial({ map: gt, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending }); disposables.push(m);
    const sp = new THREE.Sprite(m); sp.position.set(x, y, z); sp.scale.set(s, s, 1); root.add(sp); return m;
  });

  // 漂浮的元素/分子標籤:真正的 3D 小方塊(圓角、有厚度、有斜邊),在星球後方的大空間裡慢慢飄、慢慢翻轉;飄出邊界就從另一邊回來
  const shape = new THREE.Shape(), hw = 0.5, cr = 0.2;
  shape.moveTo(-hw + cr, -hw); shape.lineTo(hw - cr, -hw); shape.quadraticCurveTo(hw, -hw, hw, -hw + cr); shape.lineTo(hw, hw - cr); shape.quadraticCurveTo(hw, hw, hw - cr, hw);
  shape.lineTo(-hw + cr, hw); shape.quadraticCurveTo(-hw, hw, -hw, hw - cr); shape.lineTo(-hw, -hw + cr); shape.quadraticCurveTo(-hw, -hw, -hw + cr, -hw);
  const tileGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6 }); tileGeo.translate(0, 0, -0.08); disposables.push(tileGeo);
  { const n = tileGeo.attributes.normal, uv = tileGeo.attributes.uv; for (let i = 0; i < uv.count; i++) if (n.getZ(i) < -0.9) uv.setX(i, -uv.getX(i)); }   // 背面的貼圖左右對調,翻到背面時字才不會是鏡像
  const items = [], tiles = TILES.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < count; i++) {
    const [label, color] = tiles[i % tiles.length], tex = tileTexture(label, color);
    const face = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.6 + Math.random() * 0.35 });
    const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), metalness: 0.4, roughness: 0.4 }); disposables.push(tex, face, edge);
    const mesh = new THREE.Mesh(tileGeo, [face, edge]), s = 0.6 + Math.random() * 0.8; mesh.scale.setScalar(s);
    mesh.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 17, -3 - Math.random() * 16);
    mesh.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    items.push({ mesh, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.12, spin: [(Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3] });
    root.add(mesh);
  }
  const lerpColor = new THREE.Color();
  return {
    group: root,
    update(dt) {
      for (const it of items) {
        const p = it.mesh.position; p.x += it.vx * dt; p.y += it.vy * dt; it.mesh.rotation.x += it.spin[0] * dt; it.mesh.rotation.y += it.spin[1] * dt; it.mesh.rotation.z += it.spin[2] * dt;
        if (p.x > 16) p.x = -16; else if (p.x < -16) p.x = 16; if (p.y > 9.5) p.y = -9.5; else if (p.y < -9.5) p.y = 9.5;
      }
    },
    /** 星雲顏色隨選到的版本(或 null = 預設)慢慢變 */
    tint(level, k) { const [a, b] = NEBULA[level] || NEBULA.high; nebs[0].color.lerp(lerpColor.set(a), k); nebs[1].color.lerp(lerpColor.set(b), k); },
    dispose() { disposables.forEach(d => d.dispose()); },
  };
}

/** 恆星:這個小宇宙的光源。一顆發亮的球 + 兩層光暈(日冕、外圈柔光),會微微脈動。星球的明暗與影子都以它的方向為準。 */
export function buildStar(radius = 1.3) {
  const group = new THREE.Group(), tex = glowTexture(), disposables = [tex];
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), new THREE.MeshBasicMaterial({ color: 0xfffbee })); group.add(core); disposables.push(core.geometry, core.material);
  const glow = (size, color, opacity) => { const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }); disposables.push(m); const sp = new THREE.Sprite(m); sp.scale.set(size, size, 1); group.add(sp); return sp; };
  const inner = glow(radius * 3.4, 0xfff6dc, 1), corona = glow(radius * 7, 0xffc861, 0.95), halo = glow(radius * 18, 0xff8f3a, 0.34); void inner;
  return {
    group,
    update(t) { const k = 1 + Math.sin(t * 1.7) * 0.04, a = radius * 7 * k, b = radius * 18 * (2 - k); corona.scale.set(a, a, 1); halo.scale.set(b, b, 1); },
    dispose() { disposables.forEach(d => d.dispose()); },
  };
}
