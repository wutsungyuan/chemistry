// 原子寶寶的星際飛船:Starship 風格的火箭。
//   機身:不鏽鋼圓筒 + 拱形機頭;腹部那半邊貼黑色隔熱瓦。
//   襟翼:前後各一對斜梯形薄板,長在「腹部與背部交界」的兩側;朝腹部的那一面是隔熱瓦(黑),朝背部的那一面是不鏽鋼。
//   引擎:尾部三具,三道火焰;在太空中可以熄火滑行、重新點火,噴口會擺動(推力向量控制)來改變軌道。
//   舷窗:在背部,裡面坐著原子寶寶(藍色小球、會眨眼、身旁有一顆繞著跑的電子)。
// 飛船的座標:機頭 +x(飛行方向)、背部 +y、腹部 −y、兩側 ±z。姿態由 space.js 決定(腹部朝向星球),
// 所以繞行時有時看到腹部的隔熱瓦,有時看到背部與原子寶寶。
import * as THREE from 'three';

const TAU2 = Math.PI * 2;
const lathe = (pts, seg = 36, phiStart = 0, phiLength = TAU2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLength);
const steel = (extra = {}) => new THREE.MeshStandardMaterial({ color: 0xe4e8f0, roughness: 0.34, metalness: 0.18, ...extra });
const matte = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...extra });
const TILE = 0x16181d;                                                              // 隔熱瓦的顏色

export function buildShip() {
  // rocket 的內部座標:+y 是機頭(旋轉曲面的軸)、+x 是腹部、−x 是背部、±z 是兩側;整個轉 −90° 後變成上面說的飛船座標
  const ship = new THREE.Group(), rocket = new THREE.Group(); rocket.rotation.z = -Math.PI / 2; ship.add(rocket);
  const BODY_R = 0.2, TOP = 0.42, BOT = -0.62;
  const ogive = [[BODY_R, TOP], [0.196, 0.5], [0.182, 0.6], [0.155, 0.71], [0.115, 0.82], [0.07, 0.915], [0.03, 0.975], [0, 1.0]];
  rocket.add(new THREE.Mesh(lathe([[0, BOT], [BODY_R, BOT], ...ogive]), steel()));
  // 腹部的隔熱瓦:剛好蓋住腹部那半圈(內部 +x 側),一路貼到機頭
  rocket.add(new THREE.Mesh(lathe([[BODY_R, BOT], ...ogive].map(([r, y]) => [r * 1.012 + 0.001, y]), 28, 0, Math.PI), matte(TILE, { roughness: 0.75 })));
  // 銲接環線(不鏽鋼筒身的分節)
  for (const y of [-0.38, -0.14, 0.1, 0.34]) { const w = new THREE.Mesh(new THREE.TorusGeometry(BODY_R * 0.999, 0.0035, 6, 48), steel({ color: 0x9aa1ae })); w.rotation.x = Math.PI / 2; w.position.y = y; rocket.add(w); }

  // 襟翼:斜梯形薄板。外形的座標 = (沿機身 y, 往外伸出多少);厚度方向是內部 x:背部那一層是不鏽鋼,腹部那一層是隔熱瓦
  const T = 0.016, flapQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  function flaps(pts, root) {
    const shape = new THREE.Shape(); pts.forEach(([a, b], i) => (i ? shape.lineTo(a, b) : shape.moveTo(a, b))); shape.closePath();
    const layer = z0 => { const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false }); g.translate(0, 0, z0); return g; };
    for (const sz of [1, -1]) {
      const g = new THREE.Group(); g.quaternion.copy(flapQ); g.position.z = sz * root; g.scale.y = sz;       // 另一側用鏡射(厚度方向不變,所以腹背兩面的材質不會顛倒)
      g.add(new THREE.Mesh(layer(-T), steel({ color: 0xd6dbe5 })), new THREE.Mesh(layer(0), matte(TILE, { roughness: 0.75 })));
      rocket.add(g);
    }
  }
  flaps([[-0.6, 0], [-0.6, 0.27], [-0.4, 0.27], [-0.2, 0]], 0.17);                  // 尾部一對(大):後緣垂直機身,前緣往後斜
  flaps([[0.44, 0], [0.44, 0.16], [0.55, 0.16], [0.72, 0]], 0.125);                 // 機頭一對(小)

  // 尾部三具引擎(排成三角形)。每具引擎以自己的安裝點為支點擺動(推力向量控制);可以熄火、重新點火。
  // 火焰(甲烷:外緣橘、中心藍白)掛在噴口下方的 jet 群組,長度跟著推力伸縮;點火瞬間噴口有一下閃光。
  const engines = [], additive = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  rocket.add(new THREE.Mesh(lathe([[BODY_R, BOT], [BODY_R * 0.96, BOT - 0.03], [0, BOT - 0.03]]), matte(0x2c303b, { metalness: 0.4 })));
  for (let k = 0; k < 3; k++) {
    const ang = Math.PI / 2 + k * TAU2 / 3, eng = new THREE.Group(); eng.position.set(Math.cos(ang) * 0.095, BOT - 0.03, Math.sin(ang) * 0.095); rocket.add(eng);
    eng.add(new THREE.Mesh(lathe([[0.03, 0], [0.045, -0.05], [0.066, -0.11]], 20), matte(0x4a505e, { metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide })));
    const jet = new THREE.Group(); jet.position.y = -0.11; eng.add(jet);                                  // 噴口出口;火焰從這裡往後長
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.5, 18, 1, true), additive(0xff9a47, 0.8)); flame.rotation.x = Math.PI; flame.position.y = -0.25;
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.3, 14, 1, true), additive(0xbfe6ff, 0.95)); core.rotation.x = Math.PI; core.position.y = -0.15;
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), additive(0xfff1c4, 0)); flash.position.y = -0.04;
    jet.add(flame, core, flash); engines.push({ eng, jet, flash, ph: k * 2.1 });
  }

  // 背部的舷窗:金色圓框 + 玻璃罩;裡面是原子寶寶(臉朝外,頭朝機頭方向)
  const port = new THREE.Group(); port.position.set(0.16, 0.172, 0); port.scale.setScalar(0.74);
  port.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)));   // 舷窗的 +z(朝外)= 飛船的 +y(背部)
  ship.add(port);
  port.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.026, 14, 40), steel({ color: 0xffc21f, metalness: 0.3 })));
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 20, 0, TAU2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1 }));
  glass.rotation.x = Math.PI / 2; port.add(glass);
  const baby = new THREE.Group(); baby.position.z = -0.02; port.add(baby);
  baby.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 28, 20), matte(0x3fb5ff, { roughness: 0.4 })));
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(sx * 0.04, 0.025, 0.095);
    e.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), new THREE.MeshBasicMaterial({ color: 0x1a1f4a })); pupil.position.z = 0.02; e.add(pupil);
    baby.add(e); eyes.push(e);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff8fb8, transparent: true, opacity: 0.8 })); cheek.scale.z = 0.4; cheek.position.set(sx * 0.07, -0.03, 0.09); baby.add(cheek);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x7a1f3d })); smile.rotation.z = Math.PI; smile.position.set(0, -0.025, 0.105); baby.add(smile);
  // 電子:繞著寶寶的小圈
  const eRing = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.004, 6, 48), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.8 })); eRing.rotation.x = 1.15; eRing.rotation.y = 0.3; baby.add(eRing);
  const electron = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffd23f })); baby.add(electron);

  const tmp = new THREE.Vector3(), q = new THREE.Quaternion();
  const st = { throttle: 0, flash: 0, burning: false, gy: 0, gz: 0 };
  ship.userData = {
    /** t:時間;dt:這一格多長;ctl:{ burn 引擎是否點火, gy/gz 噴口擺角(弧度;gy 讓推力偏向背/腹,gz 偏向左右) } */
    update(t, dt = 0.016, ctl = {}) {
      const burn = !!ctl.burn; if (burn && !st.burning) st.flash = 1;                  // 重新點火的瞬間:閃一下
      st.burning = burn; st.throttle += ((burn ? 1 : 0) - st.throttle) * (1 - Math.exp(-(burn ? 9 : 6) * dt)); st.flash *= Math.exp(-6 * dt);
      st.gy += ((ctl.gy || 0) - st.gy) * (1 - Math.exp(-8 * dt)); st.gz += ((ctl.gz || 0) - st.gz) * (1 - Math.exp(-8 * dt));
      for (const e of engines) {
        e.eng.rotation.z = st.gy; e.eng.rotation.x = st.gz;                            // 噴口擺動(三具一起)
        const f = 1 + Math.sin(t * 38 + e.ph) * 0.08 + Math.sin(t * 23 + e.ph * 1.7) * 0.06, th = st.throttle;
        e.jet.visible = th > 0.02 || st.flash > 0.02; e.jet.scale.set(0.55 + 0.45 * th, Math.max(0.001, th * (0.92 + (f - 1) * 2.6)), 0.55 + 0.45 * th);
        const fs = 0.03 + st.flash * 0.11; e.flash.scale.set(fs / e.jet.scale.x, fs / e.jet.scale.y, fs / e.jet.scale.z); e.flash.material.opacity = st.flash * 0.9;
      }
      baby.position.y = Math.sin(t * 2.2) * 0.008;
      const blink = (t % 3.4) > 3.25 ? 0.1 : 1; eyes.forEach(e => { e.scale.y = blink; });
      const an = t * 3;                                                              // 電子沿著傾斜的軌道圈跑
      tmp.set(Math.cos(an) * 0.135, Math.sin(an) * 0.135, 0); q.setFromEuler(eRing.rotation); tmp.applyQuaternion(q); electron.position.copy(tmp);
    },
    get throttle() { return st.throttle; },
    dispose() { ship.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => m.dispose()); }); },
  };
  return ship;
}
