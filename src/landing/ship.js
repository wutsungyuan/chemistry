// 原子寶寶的星際飛船:Starship 風格的火箭。
//   機身:不鏽鋼圓筒 + 拱形機頭;腹部那半邊貼黑色隔熱瓦。
//   襟翼:前後各一對斜梯形薄板,長在「腹部與背部交界」的兩側;朝腹部的那一面是隔熱瓦(黑),朝背部的那一面是不鏽鋼。
//   引擎:和真的星艦上面級一樣是 3 + 3 共六具猛禽(Raptor),都收在機尾的不鏽鋼裙筒裡面,不是裸露在外:
//     中間三具是海平面型(噴口小、可以擺動 = 推力向量控制),回到大氣層裡降落、被機械臂接住時用這三具;
//     外圈三具是真空型(RVac,噴口大很多、固定不能擺動),在太空中效率高,所以在太空裡變軌(入口頁)只點這三具。
//     (真的星艦只有在升空、需要大推力衝上軌道的那一段才六具一起點;已經在太空裡之後不趕推力,要的是省燃料。)
//     離軌只需要輕輕減速,只點一具(報導說 Flight 15 的離軌點火只用一具猛禽,沒有說是哪一具;這裡用中間的一具)。
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
  rocket.add(new THREE.Mesh(lathe([[BODY_R, BOT], ...ogive]), steel()));                       // 筒身一路到機尾,底部是開口的:最下面那一段就是罩住引擎的裙筒
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

  // 機尾:裙筒內側(深色)+ 引擎艙的頂板;六具引擎掛在頂板下,噴口大約和裙筒下緣齊平,從側面看幾乎看不到引擎,要從機尾方向才看得到。
  // 中間三具(海平面型)各自以安裝點為支點擺動;外圈三具(真空型)固定。每一具都可以單獨熄火、點火。
  // 火焰(甲烷:外緣橘、中心藍白)掛在噴口下方的 jet 群組,長度跟著推力伸縮;點火瞬間噴口有一下閃光。真空型的火焰比較寬、比較淡(在真空中會散開)。
  const engines = [], additive = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const BAY = BOT + 0.125, bayMat = matte(0x23262f, { metalness: 0.4, side: THREE.DoubleSide });
  rocket.add(new THREE.Mesh(lathe([[BODY_R * 0.985, BOT], [BODY_R * 0.985, BAY], [0, BAY]]), bayMat));
  const addEngine = (kind, ang, ring, rExit, len) => {
    const eng = new THREE.Group(); eng.position.set(Math.cos(ang) * ring, BAY, Math.sin(ang) * ring); rocket.add(eng);
    eng.add(new THREE.Mesh(lathe([[rExit * 0.4, 0], [rExit * 0.62, -len * 0.4], [rExit, -len]], 20), matte(kind === 'vac' ? 0x5a5f6c : 0x4a505e, { metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide })));
    const jet = new THREE.Group(); jet.position.y = -len; eng.add(jet);                                    // 噴口出口;火焰從這裡往後長
    const fl = kind === 'vac' ? 0.42 : 0.5, flame = new THREE.Mesh(new THREE.ConeGeometry(rExit * 1.05, fl, 18, 1, true), additive(kind === 'vac' ? 0xffb37a : 0xff9a47, kind === 'vac' ? 0.5 : 0.8)); flame.rotation.x = Math.PI; flame.position.y = -fl / 2;
    const core = new THREE.Mesh(new THREE.ConeGeometry(rExit * 0.55, fl * 0.6, 14, 1, true), additive(0xbfe6ff, kind === 'vac' ? 0.7 : 0.95)); core.rotation.x = Math.PI; core.position.y = -fl * 0.3;
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), additive(0xfff1c4, 0)); flash.position.y = -0.03;
    jet.add(flame, core, flash); engines.push({ kind, eng, jet, flash, ph: engines.length * 2.1, th: 0, fl: 0, on: false });
  };
  for (let k = 0; k < 3; k++) addEngine('sl', Math.PI / 2 + k * TAU2 / 3, 0.056, 0.036, 0.11);           // 中間三具:海平面型
  for (let k = 0; k < 3; k++) addEngine('vac', Math.PI / 2 + (k + 0.5) * TAU2 / 3, 0.132, 0.06, 0.118);  // 外圈三具:真空型(錯開 60°)

  // 姿態控制噴氣(掉頭時用):機頭與機尾各一小團白色氣體,一個噴向腹部、一個噴向背部,把機身垂直翻過去
  const puffs = new THREE.Group(); ship.add(puffs);
  for (const [x, y] of [[0.8, -0.14], [-0.56, 0.25]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), additive(0xffffff, 0)); m.scale.set(1, 2.4, 1); m.position.set(x, y, 0); puffs.add(m); }

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
  const st = { gy: 0, gz: 0, rcs: 0 };
  // 哪幾具引擎點火:'vac' = 外圈三具(在太空裡變軌);'sl' = 中間三具(大氣層內降落);'one' = 只點中間的一具(離軌);true 或 'all' = 六具(升空衝上軌道時才會這樣,目前沒有用到)
  const lit = (burn, e, i) => burn === true || burn === 'all' || burn === e.kind || (burn === 'one' && i === 0);
  ship.userData = {
    /** t:時間;dt:這一格多長;ctl:{ burn 哪幾具引擎點火(見上), gy/gz 中間三具噴口的擺角(弧度;gy 讓推力偏向背/腹,gz 偏向左右), rcs 姿態控制噴氣(+1/−1 = 往哪一邊轉,0 = 沒有) } */
    update(t, dt = 0.016, ctl = {}) {
      st.gy += ((ctl.gy || 0) - st.gy) * (1 - Math.exp(-8 * dt)); st.gz += ((ctl.gz || 0) - st.gz) * (1 - Math.exp(-8 * dt));
      engines.forEach((e, i) => {
        const on = !!ctl.burn && lit(ctl.burn, e, i); if (on && !e.on) e.fl = 1;                            // 重新點火的瞬間:閃一下
        e.on = on; e.th += ((on ? 1 : 0) - e.th) * (1 - Math.exp(-(on ? 9 : 6) * dt)); e.fl *= Math.exp(-6 * dt);
        if (e.kind === 'sl') { e.eng.rotation.z = st.gy; e.eng.rotation.x = st.gz; }                     // 只有中間三具會擺動
        const f = 1 + Math.sin(t * 38 + e.ph) * 0.08 + Math.sin(t * 23 + e.ph * 1.7) * 0.06, th = e.th;
        e.jet.visible = th > 0.02 || e.fl > 0.02; e.jet.scale.set(0.55 + 0.45 * th, Math.max(0.001, th * (0.92 + (f - 1) * 2.6)), 0.55 + 0.45 * th);
        const fs = 0.02 + e.fl * 0.09; e.flash.scale.set(fs / e.jet.scale.x, fs / e.jet.scale.y, fs / e.jet.scale.z); e.flash.material.opacity = e.fl * 0.9;
      });
      st.rcs += ((ctl.rcs ? 1 : 0) - st.rcs) * (1 - Math.exp(-10 * dt)); if (ctl.rcs) puffs.scale.y = ctl.rcs;      // 反方向轉就噴另一側
      puffs.children.forEach((m, i) => { m.material.opacity = st.rcs * (0.55 + 0.3 * Math.sin(t * 50 + i * 2)); });
      baby.position.y = Math.sin(t * 2.2) * 0.008;
      const blink = (t % 3.4) > 3.25 ? 0.1 : 1; eyes.forEach(e => { e.scale.y = blink; });
      const an = t * 3;                                                              // 電子沿著傾斜的軌道圈跑
      tmp.set(Math.cos(an) * 0.135, Math.sin(an) * 0.135, 0); q.setFromEuler(eRing.rotation); tmp.applyQuaternion(q); electron.position.copy(tmp);
    },
    get throttle() { return Math.max(...engines.map(e => e.th)); },
    dispose() { ship.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => m.dispose()); }); },
  };
  return ship;
}
