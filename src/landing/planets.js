// 入口頁的三顆星球:國小(糖果色、圓潤)、國中(藍灰、有星環)、高中(深色、經緯網格與城市燈光)。
// 材質全部用 canvas 程式畫出來(不載入圖檔);每顆都有一圈大氣光暈。星球是真正的球體(SphereGeometry),有光影與透視。
import * as THREE from 'three';

const TAU = Math.PI * 2;
const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);   // 固定種子的亂數(每次開啟長得一樣)

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = THREE.RepeatWrapping; return t;
}

/** 沿緯度的波浪條紋:每一條是一個填色的路徑(邊緣有抗鋸齒);上下各多畫一條,波浪才不會露出底色 */
function bands(ctx, w, h, colors, wave = 6) {
  const n = colors.length, bh = h / n, amp = wave * 1.6;
  const edge = (k, x) => k * bh + Math.sin(x / w * TAU * 2 + k * 1.3) * amp + Math.sin(x / w * TAU * 5 + k * 2.1) * amp * 0.35;
  ctx.fillStyle = colors[n - 1]; ctx.fillRect(0, 0, w, h);
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = colors[k]; ctx.beginPath(); ctx.moveTo(0, edge(k, 0));
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, edge(k, x));
    for (let x = w; x >= 0; x -= 8) ctx.lineTo(x, edge(k + 1, x));
    ctx.closePath(); ctx.fill();
  }
}

const LOOK = {
  kid: {
    glow: 0xff9ad0, rough: 0.38,
    map: () => canvasTex(512, 256, (ctx, w, h) => {
      const r = rng(7); bands(ctx, w, h, ['#ff8fb8', '#ffd23f', '#8fe6c8', '#8cc9ff', '#ffb36b'], 8);
      for (let i = 0; i < 46; i++) {                                        // 泡泡/糖果點點
        const x = r() * w, y = h * (0.12 + r() * 0.76), s = 3 + r() * 9;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.35})`; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x - s * .3, y - s * .3, s * .28, 0, TAU); ctx.fill();
      }
    }),
  },
  teen: {
    glow: 0x7fb0ff, rough: 0.55,
    map: () => canvasTex(512, 256, (ctx, w, h) => {
      const r = rng(21); bands(ctx, w, h, ['#4f74a8', '#6f8fbd', '#9db5d6', '#6f8fbd', '#c9d6e8', '#5a7fb5'], 4);
      ctx.globalAlpha = .18; for (let i = 0; i < 14; i++) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 20 + r() * 40, 3 + r() * 5, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    }),
  },
  high: {
    glow: 0x4f8dff, rough: 0.7,
    map: () => canvasTex(512, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#12255e'); g.addColorStop(.5, '#0b1a47'); g.addColorStop(1, '#10224f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(143,200,255,.55)'; ctx.lineWidth = 1;                       // 經緯網格
      for (let i = 0; i <= 12; i++) { const x = i / 12 * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let j = 1; j < 6; j++) { const y = j / 6 * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    }),
    emissive: () => canvasTex(512, 256, (ctx, w, h) => {                                  // 城市燈光(發光貼圖)
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); const r = rng(99);
      for (let i = 0; i < 260; i++) { const x = r() * w, y = h * (0.15 + r() * 0.7); ctx.fillStyle = r() > .5 ? '#ffd98a' : '#8fd0ff'; ctx.fillRect(x, y, 1.6, 1.6); }
    }),
  },
};

/** 星球外圈的大氣光暈(邊緣亮、中間透明,疊加混合) */
function atmosphere(radius, color, power = 4) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius * 1.14, 40, 28), new THREE.ShaderMaterial({
    uniforms: { glow: { value: new THREE.Color(color) }, power: { value: power } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vN; uniform vec3 glow; uniform float power; void main(){ float i = pow(max(0.0, 0.68 - dot(vN, vec3(0.0, 0.0, 1.0))), power); gl_FragColor = vec4(glow * i * 0.85, i); }',
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  }));
}

/** 國中星球的星環:一片很薄的圓環,躺在星球的赤道面上(和自轉軸垂直),跟著自轉軸一起傾斜;環上的條紋沿半徑方向(把 uv.x 改成「離中心多遠」)。
 *  前半圈在星球前面、後半圈被星球擋住,由深度緩衝處理。 */
function ring(radius, U) {
  const inner = radius * 1.35, outer = radius * 1.78, geo = new THREE.RingGeometry(inner, outer, 96, 1), uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - inner) / (outer - inner), 0.5);
  const tex = canvasTex(256, 4, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    [[0, 'rgba(220,232,255,0)'], [.08, 'rgba(220,232,255,.75)'], [.3, 'rgba(180,200,235,.35)'], [.42, 'rgba(230,240,255,.8)'], [.7, 'rgba(170,190,225,.5)'], [.92, 'rgba(220,232,255,.6)'], [1, 'rgba(220,232,255,0)']].forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  // 星球投在星環上的影子:環上的一點如果在星球「背向恆星」的那一側,而且離「星球中心沿光線方向的那條線」不到一個星球半徑,就在影子裡
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uCenter: U.uCenter, uLight: U.uLight, uRadius: { value: radius } },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D map; uniform vec3 uCenter; uniform vec3 uLight; uniform float uRadius; varying vec2 vUv; varying vec3 vW;
      void main(){ vec4 t = texture2D(map, vUv); vec3 d = vW - uCenter; float al = dot(d, uLight);
        float lit = al < 0.0 ? smoothstep(uRadius * 0.9, uRadius * 1.06, length(d - al * uLight)) : 1.0;
        gl_FragColor = vec4(t.rgb * mix(0.07, 1.0, lit), t.a);
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide, transparent: true, depthWrite: false }));
  m.rotation.x = Math.PI / 2;                                  // 赤道面 = 垂直自轉軸(y)
  return m;
}

// 自轉軸的傾角 [朝鏡頭傾, 往側邊傾](弧度)。國中星球像土星,傾得比較多(約 27°),星環才看得出是一個橢圓
const AXIS = { kid: [0.22, -0.2], teen: [0.42, 0.47], high: [0.28, 0.24] };

/** level: 'kid' | 'teen' | 'high';low:true 時貼圖與面數減半(省電、低階裝置) */
export function buildPlanet(level, radius, { low = false } = {}) {
  const look = LOOK[level], group = new THREE.Group(), axis = new THREE.Group(), spin = new THREE.Group();
  axis.rotation.set(AXIS[level][0], 0, AXIS[level][1]);          // 自轉軸的傾角固定在空間裡(不跟著軌道的擺放轉)
  const mat = new THREE.MeshStandardMaterial({ map: look.map(), roughness: look.rough, metalness: 0.02 });
  // 影子用的資料(世界座標):星球中心、朝向恆星的方向、星環所在的平面(法線 = 自轉軸)與內外半徑
  const U = { uCenter: { value: new THREE.Vector3() }, uLight: { value: new THREE.Vector3(0, 0, 1) }, uRingN: { value: new THREE.Vector3(0, 1, 0).applyEuler(axis.rotation) }, uRingIn: { value: radius * 1.35 }, uRingOut: { value: radius * 1.78 } };
  if (level === 'teen') mat.onBeforeCompile = sh => {             // 星環投在星球表面的影子:從表面這一點朝恆星走,如果會穿過星環,就比較暗
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
varying vec3 vWPos;`).replace('#include <begin_vertex>', `#include <begin_vertex>
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWPos; uniform vec3 uCenter; uniform vec3 uLight; uniform vec3 uRingN; uniform float uRingIn; uniform float uRingOut;`)
      .replace('#include <opaque_fragment>', `float rdn = dot(uLight, uRingN); if (abs(rdn) > 0.001) { float tt = dot(uCenter - vWPos, uRingN) / rdn; if (tt > 0.0) { float rr = length(vWPos + uLight * tt - uCenter); outgoingLight *= 1.0 - 0.5 * smoothstep(uRingIn, uRingIn * 1.05, rr) * (1.0 - smoothstep(uRingOut * 0.96, uRingOut, rr)); } }
#include <opaque_fragment>`);
  };
  if (look.emissive) { mat.emissive = new THREE.Color(0xffffff); mat.emissiveMap = look.emissive(); mat.emissiveIntensity = 1.1; }
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, low ? 32 : 56, low ? 22 : 40), mat);
  spin.add(body); axis.add(spin); group.add(axis);
  group.add(atmosphere(radius, look.glow, level === 'high' ? 3 : 4));
  if (level === 'teen') axis.add(ring(radius, U));
  group.userData = { level, radius, spin, setSun(dir) { U.uLight.value.copy(dir); }, update(dt) { U.uCenter.value.copy(group.position); spin.rotation.y += dt * (level === 'kid' ? 0.5 : level === 'teen' ? 0.3 : 0.2); }, dispose() { group.traverse(o => { o.geometry?.dispose(); const ms = o.material ? [].concat(o.material) : []; ms.forEach(m => { m.map?.dispose(); m.emissiveMap?.dispose(); m.uniforms?.map?.value?.dispose(); m.dispose(); }); }); } };
  return group;
}

export const PLANET_GLOW = { kid: 0xff9ad0, teen: 0x7fb0ff, high: 0x4f8dff };
