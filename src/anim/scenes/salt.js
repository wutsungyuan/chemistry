// 場景:食鹽的大祕密——用放大鏡看鹽粒,再「放大」到鈉離子與氯離子的晶格。
// 步驟(與 experiments.json 的 salt 一致):0 開頭、1 放大鏡、2 再放大、3 電子轉移、4 晶格、5 結尾。
// 兩層規則:① 放大鏡出場、鏡頭推進、閃白轉場、離子「彈出來」排成晶格是影片效果;② 離子的大小比例、電子轉移的守恆、晶格的排列(岩鹽結構)符合科學。
export function build(ctx, E0) {
  const E = (ctx.EXP && ctx.EXP.salt) || E0;   // 引擎目前傳進來的 E 可能不是這支的腳本(見回報),所以直接取 ctx.EXP.salt
  const { T, scene, cam } = ctx;
  const { clamp, lerp, ease, mj, seg01, kf, ramp, pop, popS, lerp3, V, canvasTex, segIdx } = ctx.h;
  const { lathe } = ctx.props;
  const BENCH = ctx.BENCH, ENV = ctx.env(), A = ctx.adult, K = ctx.kid;
  const grp = new T.Group(); scene.add(grp);
  const SEG = E.steps.map(s => ({ n: s.nZh, d: s.d0, io: s.io, cap: s.capZh }));
  const ST = []; SEG.reduce((a, s) => { ST.push(a); return a + s.d; }, 0);
  const iLook = 1, iZoom = 2, iIon = 3, iLat = 4, iEnd = 5;
  const bg0 = scene.background;

  // ---------------------------------------------------------------- 共用零件
  // 微倒角的立方體(鹽的結晶本來就是立方體):盒子頂點推到「內縮盒 + 圓角半徑」上,法線用解析式
  function roundedCube(r, seg) {
    const g = new T.BoxGeometry(1, 1, 1, seg, seg, seg), p = g.attributes.position, n = g.attributes.normal, h = 0.5 - r, q = V(0, 0, 0), d = V(0, 0, 0);
    for (let i = 0; i < p.count; i++) {
      q.set(clamp(p.getX(i), -h, h), clamp(p.getY(i), -h, h), clamp(p.getZ(i), -h, h));
      d.set(p.getX(i) - q.x, p.getY(i) - q.y, p.getZ(i) - q.z).normalize();
      p.setXYZ(i, q.x + d.x * r, q.y + d.y * r, q.z + d.z * r); n.setXYZ(i, d.x, d.y, d.z);
    }
    return g;
  }
  const cubeG = roundedCube(0.07, 6);
  const saltMat = new T.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.42, envMap: ENV, envMapIntensity: 0.55 });

  // ---------------------------------------------------------------- 桌上:深色小碟子 + 粗鹽粒
  const CX = 0.15, CZ = -0.05;
  const dishG = new T.Group(); dishG.position.set(CX, BENCH, CZ); grp.add(dishG);
  const dish = new T.Mesh(lathe([[0, 0], [0.5, 0], [0.7, 0.06], [0.8, 0.15], [0.83, 0.18], [0.79, 0.19], [0.74, 0.14], [0.62, 0.095], [0.4, 0.075], [0, 0.075]]), new T.MeshStandardMaterial({ color: 0x2d3556, roughness: 0.3, metalness: 0.1, envMap: ENV, envMapIntensity: 0.6 }));
  dish.castShadow = true; dish.receiveShadow = true; dishG.add(dish);
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const grains = [];
  function addGrain(rad, ang, y, size, tilt) {
    const m = new T.Mesh(cubeG, saltMat); m.scale.setScalar(size);
    m.position.set(Math.cos(ang) * rad, y, Math.sin(ang) * rad);
    m.rotation.set((rnd() - 0.5) * tilt, rnd() * 6.28, (rnd() - 0.5) * tilt); m.castShadow = true; dishG.add(m); grains.push(m);
  }
  addGrain(0, 0, 0.075 + 0.1 + 0.1 + 0.075, 0.15, 0.1);                       // grains[0]:最上面那一顆(之後鏡頭推進的對象)
  for (let i = 0; i < 4; i++) addGrain(0.1 + rnd() * 0.12, i * 1.6 + 0.4, 0.075 + 0.05 + 0.1 + 0.02, 0.09 + rnd() * 0.05, 0.3);
  for (let i = 0; i < 9; i++) addGrain(0.12 + rnd() * 0.25, i * 0.7 + 0.2, 0.075 + 0.06 + 0.02, 0.09 + rnd() * 0.06, 0.2);
  for (let i = 0; i < 22; i++) addGrain(0.2 + rnd() * 0.4, i * 0.286 + rnd() * 0.2, 0.075 + 0.05, 0.08 + rnd() * 0.07, 0.08);

  // ---------------------------------------------------------------- 放大鏡:圓環鏡框 + 透明鏡片 + 握把(原點在鏡片中心,握點在 y = -0.85)
  const MS = 0.85, GRIPY = -0.85 * MS;
  const mag = new T.Group(); grp.add(mag);
  const goldM = new T.MeshStandardMaterial({ color: 0xd4a23a, metalness: 0.85, roughness: 0.28, envMap: ENV, envMapIntensity: 1.0 });
  const ring = new T.Mesh(new T.TorusGeometry(0.42, 0.05, 14, 48), goldM); ring.castShadow = true; mag.add(ring);
  const lens = new T.Mesh(new T.SphereGeometry(0.42, 32, 16), new T.MeshPhysicalMaterial({ color: 0xd5ecff, roughness: 0.04, transparent: true, opacity: 0.34, envMap: ENV, envMapIntensity: 1.2, clearcoat: 1, depthWrite: false }));
  lens.scale.z = 0.12; lens.renderOrder = 3; mag.add(lens);
  const neck = new T.Mesh(new T.CylinderGeometry(0.045, 0.06, 0.14, 12), goldM); neck.position.y = -0.5; mag.add(neck);
  const handle = new T.Mesh(lathe([[0, 0], [0.06, 0], [0.085, 0.03], [0.09, 0.3], [0.085, 0.55], [0.06, 0.63], [0, 0.65]], 24), new T.MeshStandardMaterial({ color: 0xb13a3a, roughness: 0.45, envMap: ENV, envMapIntensity: 0.4 }));
  handle.position.y = -1.16; handle.castShadow = true; mag.add(handle);
  mag.scale.setScalar(MS);
  const eul = new T.Euler(0, 0, 0, 'YXZ'), gv = V(0, 0, 0), LC = V(0, 0, 0), REST = V(0.86, BENCH + 0.05, 1.0), HOV = V(CX + 0.1, BENCH + 0.6, CZ + 0.15);
  const gripOff = (th, ps, out) => { eul.set(th, ps, 0, 'YXZ'); return out.set(0, GRIPY, 0).applyEuler(eul); };
  function poseAt(p, lcOut) { lerp3(lcOut, REST, HOV, p); return [lerp(-Math.PI / 2, -1.15, p), Math.PI / 2]; }

  // ---------------------------------------------------------------- 微觀世界(放在 y = 30 的地方,和桌子分開)
  const M = V(0, 30, 0);
  const micro = new T.Group(); micro.position.copy(M); grp.add(micro);
  const rotG = new T.Group(); rotG.rotation.order = 'YXZ'; micro.add(rotG);
  const bgTex = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a2a6a'); gr.addColorStop(0.55, '#101a4a'); gr.addColorStop(1, '#2a1246'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, true);
  // 鹽粒的結晶:大小不一的立方體(略半透明、微倒角)
  const bigMat = new T.MeshPhysicalMaterial({ color: 0xe4ecff, roughness: 0.2, transparent: true, opacity: 0.85, envMap: ENV, envMapIntensity: 0.9, clearcoat: 0.6 });
  const edgeMat = new T.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.8 });
  const bigCubes = [[2.0, 0, 0, 0, 0.5, 0.35, 0.1], [1.1, -2.6, -0.6, -1.5, 0.3, 0.9, 0.2], [0.75, 2.4, 0.9, -2.0, 0.8, 0.2, 0.6], [0.55, -1.8, 1.2, -2.6, 0.2, 0.5, 0.9]].map(c => { const m = new T.Mesh(cubeG, bigMat); m.scale.setScalar(c[0]); m.position.set(c[1], c[2], c[3]); m.userData = { rx: c[4], ry: c[5], rz: c[6], s: c[0] }; const ed = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1, 1, 1)), edgeMat); ed.scale.setScalar(0.995); m.add(ed); micro.add(m); return m; });

  // 離子大小(依離子半徑 Na⁺ 102 pm、Cl⁻ 181 pm;球棍風縮小後比例不變):相鄰離子中心距 = 1.0
  const KSC = 0.30 / 181;                                // 每 pm 的畫面長度
  const R_NAI = 102 * KSC, R_CLI = 181 * KSC, R_NAA = 186 * KSC, R_CLA = 99 * KSC;   // 離子半徑;原子半徑(Na 186 pm、Cl 約 99 pm,教科書共價/原子半徑)
  const C_NA = new T.Color(0x7b4fd8), C_CL = new T.Color(0x2fb457), C_NAA = new T.Color(0xa882e8), C_CLA = new T.Color(0xc4de6a), C_BAR = new T.Color(0xd0d4de), C_DIM = new T.Color(0x1d2440);
  const ballG = new T.SphereGeometry(1, 22, 14);
  const ballMat = new T.MeshStandardMaterial({ roughness: 0.28, envMap: ENV, envMapIntensity: 0.75 });
  // 3.1 電子轉移用的一對原子
  const PN = V(-0.5, -0.5, 0.5), PC = V(0.5, -0.5, 0.5), PM = V(0, -0.5, 0.5);
  const naA = new T.Mesh(ballG, new T.MeshStandardMaterial({ roughness: 0.28, envMap: ENV, envMapIntensity: 0.75 })), clA = new T.Mesh(ballG, new T.MeshStandardMaterial({ roughness: 0.28, envMap: ENV, envMapIntensity: 0.75 }));
  rotG.add(naA); rotG.add(clA);
  const eMesh = new T.Mesh(new T.SphereGeometry(0.075, 14, 10), new T.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb300, emissiveIntensity: 0.9, roughness: 0.3 })); rotG.add(eMesh);
  const eGlow = new T.Sprite(new T.SpriteMaterial({ map: ctx.props.glowTex, color: 0xffd23a, transparent: true, opacity: 0.8, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })); eGlow.scale.setScalar(0.45); eMesh.add(eGlow);
  const pairBar = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 1, 12), new T.MeshStandardMaterial({ color: C_BAR, roughness: 0.5 })); pairBar.rotation.z = -Math.PI / 2; pairBar.position.copy(PM); rotG.add(pairBar);

  // 3.2 晶格:4 × 4 × 4,鈉離子與氯離子一顆隔一顆(岩鹽結構,每個離子有 6 個相反電荷的最近鄰居)
  const NN = 4, OFF = 1.5, pts = [];
  for (let i = 0; i < NN; i++) for (let j = 0; j < NN; j++) for (let k = 0; k < NN; k++) pts.push({ i, j, k, x: i - OFF, y: j - OFF, z: k - OFF, na: (i + j + k) % 2 === 0 });
  const idx = (i, j, k) => i * 16 + j * 4 + k, IC = idx(1, 1, 2), IP = idx(2, 1, 2);
  const HI = new Set([IC, idx(0, 1, 2), idx(2, 1, 2), idx(1, 0, 2), idx(1, 2, 2), idx(1, 1, 1), idx(1, 1, 3)]);
  const balls = new T.InstancedMesh(ballG, ballMat, pts.length); balls.instanceMatrix.setUsage(T.DynamicDrawUsage); balls.frustumCulled = false; rotG.add(balls);
  balls.setColorAt(0, C_NA); for (let n = 0; n < pts.length; n++) balls.setColorAt(n, C_NA);
  const bars = []; pts.forEach((p, a) => { [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((d, ax) => { const i = p.i + d[0], j = p.j + d[1], k = p.k + d[2]; if (i < NN && j < NN && k < NN) bars.push({ a, b: idx(i, j, k), ax }); }); });
  const barI = new T.InstancedMesh(new T.CylinderGeometry(0.045, 0.045, 1, 10), new T.MeshStandardMaterial({ roughness: 0.5 }), bars.length); barI.instanceMatrix.setUsage(T.DynamicDrawUsage); barI.frustumCulled = false; rotG.add(barI);
  for (let n = 0; n < bars.length; n++) barI.setColorAt(n, C_BAR);
  const dummy = new T.Object3D(), qx = new T.Quaternion().setFromEuler(new T.Euler(0, 0, -Math.PI / 2)), qz = new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, 0, 0)), q0 = new T.Quaternion(), tmpC = new T.Color();

  // 標籤:畫布貼圖,中英兩張;parts = [[文字, 是否上標], …]
  function labTex(parts, col, w, h, fs) {
    return canvasTex(w, h, (g, W, H) => {
      g.fillStyle = 'rgba(14,20,50,0.85)'; const rr = 20; g.beginPath(); g.moveTo(rr, 4); g.arcTo(W - 4, 4, W - 4, H - 4, rr); g.arcTo(W - 4, H - 4, 4, H - 4, rr); g.arcTo(4, H - 4, 4, 4, rr); g.arcTo(4, 4, W - 4, 4, rr); g.fill(); g.lineWidth = 5; g.strokeStyle = col; g.stroke();
      g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#fff'; let tw = 0;
      const font = sup => 'bold ' + (sup ? fs * 0.66 : fs) + 'px "Noto Sans TC",sans-serif';
      parts.forEach(p => { g.font = font(p[1]); tw += g.measureText(p[0]).width; });
      let x = (W - tw) / 2; parts.forEach(p => { g.font = font(p[1]); g.fillText(p[0], x, H / 2 + (p[1] ? -fs * 0.3 : 2)); x += g.measureText(p[0]).width; });
    }, true);
  }
  function mkLab(states, col, w, h, fs) {
    const tex = states.map(s => ({ zh: labTex(s[0], col, w, h, fs), en: labTex(s[1], col, w, h, fs) }));
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex[0].zh, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false }));
    sp.renderOrder = 600; sp.visible = false; sp.userData = { tex, asp: w / h }; grp.add(sp); return sp;
  }
  function setLab(sp, st, width, op) { sp.material.map = sp.userData.tex[st][ctx.lang()]; sp.scale.set(width, width / sp.userData.asp, 1); sp.material.opacity = op; sp.visible = op > 0.01; }
  const labNa = mkLab([[[['鈉原子 Na', 0]], [['Sodium atom Na', 0]]], [[['鈉離子 Na', 0], ['+', 1]], [['Na', 0], ['+', 1], [' ion', 0]]]], '#a882e8', 380, 88, 40);
  const labCl = mkLab([[[['氯原子 Cl', 0]], [['Chlorine atom Cl', 0]]], [[['氯離子 Cl', 0], ['−', 1]], [['Cl', 0], ['−', 1], [' ion', 0]]]], '#7fdc8a', 380, 88, 40);
  const labE = mkLab([[[['電子 e', 0], ['−', 1]], [['electron e', 0], ['−', 1]]]], '#ffd23a', 380, 88, 40);
  const legNa = mkLab([[[['鈉離子 Na', 0], ['+', 1], ['(較小)', 0]], [['Na', 0], ['+', 1], [' ion (smaller)', 0]]]], '#a882e8', 480, 84, 38);
  const legCl = mkLab([[[['氯離子 Cl', 0], ['−', 1], ['(較大)', 0]], [['Cl', 0], ['−', 1], [' ion (larger)', 0]]]], '#7fdc8a', 480, 84, 38);

  // 閃白轉場(影片效果):貼在鏡頭前的一片白
  const flash = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: false })); flash.renderOrder = 999; flash.frustumCulled = false; grp.add(flash);

  // ---------------------------------------------------------------- 時間軸
  const camF = V(0, 0, 0), camU = V(0, 0, 0), camR = V(0, 0, 0), tp = V(0, 0, 0), hand = V(0, 0, 0), kt = V(0, 0, 0), P0 = V(0.3, 5.0, 7.8), L0 = V(0.1, 2.45, 0.0), P1 = V(0.5, BENCH + 2.3, 6.2), L1 = V(0.3, BENCH + 0.55, -0.2), P2 = V(0, 0, 0), L2 = V(0, 0, 0), cp = V(0, 0, 0), cl = V(0, 0, 0), wv = V(0, 0, 0);
  function hudPlace(sp, fx, fy, dist, wFrac, op, st) {                            // 貼在畫面上的標籤(圖例):依鏡頭方向與目前可見範圍擺
    const hH = dist * Math.tan(20 * Math.PI / 180) / cam.zoom, hW = hH * cam.aspect;
    wv.copy(cam.position).addScaledVector(camF, dist).addScaledVector(camR, fx * hW).addScaledVector(camU, fy * hH); sp.position.copy(wv); setLab(sp, st, wFrac * hW, op);
  }
  function update(t, time) {
    const k = segIdx({ SEG, ST }, t), u = clamp((t - ST[k]) / SEG[k].d, 0, 1);
    const tSwap1 = ST[iZoom] + 0.55 * SEG[iZoom].d, tSwap2 = ST[iEnd] + 0.16;           // 兩次轉場:桌上 → 微觀、微觀 → 桌上
    const isMicro = t >= tSwap1 && t < tSwap2;
    ctx.room(!isMicro); scene.background = isMicro ? bgTex : bg0;
    micro.visible = isMicro;
    const grainW = V(CX, BENCH + 0.5, CZ);                                              // 最上面那一顆(世界座標)
    grainW.set(CX + grains[0].position.x, BENCH + grains[0].position.y, CZ + grains[0].position.z);

    // ---- 桌上:碟子與鹽粒彈出來(出場是轉場效果)
    pop(dishG, t - 0.1); if (isMicro) dishG.visible = false;
    // 放大鏡:0 開頭在桌上;1 小朋友拿起來移到鹽粒上方;2 鏡頭推進時收起
    const grab = k === iLook ? mj(seg01(u, 0.0, 0.18)) : (k === iZoom ? 1 : 0), p = k === iLook ? mj(seg01(u, 0.2, 0.55)) : (k === iZoom ? 1 : (k >= iIon && k < iEnd ? 1 : 0));
    const f1 = t >= tSwap2 ? 0 : (k === iLook ? mj(seg01(t, ST[iLook] + 0.35 * SEG[iLook].d, ST[iZoom])) : (k >= iZoom ? 1 : 0)), f2 = t >= tSwap2 ? 0 : mj(seg01(t, ST[iZoom] + 0.15, tSwap1));
    const [th, ps] = poseAt(p, LC);
    gripOff(th, ps, gv);

    // ---- 人物:大人在左、小朋友在右;小朋友用左側的手拿放大鏡
    A.root.position.set(-1.8, 0, -0.8); A.root.rotation.y = 0.3;
    K.root.position.set(1.5, 0, -0.15); K.root.rotation.y = -1.35;
    kt.copy(LC).add(gv);
    A.solve(() => { A.base(time, 0); A.root.updateMatrixWorld(true); if (k === 0) A.wave(-1, time); if (k === iEnd) { A.cheer(1, time); } });
    const hs = k === iEnd ? ctx.hopState(time, 0.26) : { crouch: 0, lift: 0, foot: 0 };
    K.solve(() => {
      K.base(time, 1.1); K.root.updateMatrixWorld(true);
      if (k === 0) K.wave(-1, time);
      if (k >= iLook && k < iEnd) { K.chest(-1); K.reach(1, kt, k >= iIon ? 0 : grab); }
      if (k === iEnd) { K.cheer(1, time); K.cheer(-1, time); }
    }, { crouch: hs.crouch, lift: hs.lift, footL: hs.foot, footR: hs.foot });
    K.root.updateMatrixWorld(true);
    if ((k === iLook && u > 0.2) || k === iZoom) { K.hand(1, hand); LC.copy(hand).sub(gv); }   // 握在手上:放大鏡跟著手
    mag.position.copy(LC); mag.rotation.set(th, ps, 0, 'YXZ');
    const magS = (k === 0 ? popS(t - 0.6) : (k >= iEnd ? 1 : 1 - ease(seg01(f2, 0, 0.35)))) * 1;
    mag.visible = !isMicro && magS > 0.002; mag.scale.setScalar(Math.max(MS * magS, 0.0001));
    K.look(V(CX, BENCH + 0.3, CZ), 0.9);                                              // 小朋友面向鹽粒(側面),頭只看碟子,不轉向鏡頭(頸部扭轉會超限)
    if (k >= iLook && k <= iZoom && !isMicro) A.look(V(CX, BENCH + 0.5, CZ), 0.9); else A.look(cam.position, 0.9);
    K.mouth(k === iLook ? 'oh' : 'smile');

    // ---- 微觀:ry 為整個微觀世界的緩慢自轉
    const tm = t - tSwap1;
    rotG.rotation.set(0.3, -0.4 - 0.03 * Math.max(0, tm) + 0.3 * Math.max(0, t - ST[iLat]), 0);
    rotG.updateMatrixWorld(true);
    // 鹽粒結晶:大小不一的立方體慢慢轉;進入第 4 步(離子)時被「放大穿過」而淡出
    const fade = ease(seg01(t, ST[iIon] - 0.2, ST[iIon] + 0.12 * SEG[iIon].d));
    bigMat.opacity = 0.85 * (1 - fade); edgeMat.opacity = 0.8 * (1 - fade);
    bigCubes.forEach(c => { c.visible = fade < 0.99; c.rotation.set(c.userData.rx + 0.2 * time * 0.5, c.userData.ry + 0.25 * time * 0.5, c.userData.rz); c.scale.setScalar(c.userData.s * (1 + 0.5 * fade)); });
    // 3 電子轉移:鈉原子與氯原子靠近(a)→ 鈉的最外層電子跳到氯(s)→ 變成 Na⁺ 與 Cl⁻,互相吸引形成離子鍵
    const inIon = k === iIon, uI = inIon ? u : (k > iIon ? 1 : 0);
    const a = mj(seg01(uI, 0.1, 0.42)), s = mj(seg01(uI, 0.5, 0.74)), se = ease(s);
    const pairOn = t >= ST[iIon] + 0.1 && k < iLat && isMicro;
    const pf = popS(t - (ST[iIon] + 0.1));
    naA.visible = clA.visible = pairOn;
    naA.position.set(PN.x - 0.9 * (1 - a), PN.y, PN.z); clA.position.set(PC.x + 0.9 * (1 - a), PC.y, PC.z);
    naA.scale.setScalar(Math.max(lerp(R_NAA, R_NAI, se) * pf, 0.0001)); clA.scale.setScalar(Math.max(lerp(R_CLA, R_CLI, se) * pf, 0.0001));
    naA.material.color.copy(C_NAA).lerp(C_NA, se); clA.material.color.copy(C_CLA).lerp(C_CL, se);
    const ea = t * 2.6, ER = 0.42;                                                    // 電子繞著所在原子的外層轉;轉移時沿弧線從鈉飛到氯
    const eN = V(naA.position.x + Math.cos(ea) * ER, naA.position.y + Math.sin(ea) * ER, naA.position.z), eC = V(clA.position.x + Math.cos(ea) * ER, clA.position.y + Math.sin(ea) * ER, clA.position.z);
    lerp3(eMesh.position, eN, eC, s); eMesh.position.y += 0.5 * Math.sin(Math.PI * s);
    eMesh.visible = pairOn; eMesh.scale.setScalar(Math.max(pf, 0.0001));
    const bs = ease(seg01(uI, 0.8, 0.94)) * (k < iLat ? 1 : 0); pairBar.visible = pairOn && bs > 0.01; pairBar.scale.set(Math.max(bs, 0.001), 1, Math.max(bs, 0.001)); pairBar.scale.y = 1;
    // 4 晶格:離子從中心那一對往外一層一層「彈出來」(影片效果),排好之後每個位置都固定
    const inLat = k === iLat, latOn = isMicro && k >= iLat;
    balls.visible = barI.visible = latOn;
    if (latOn) {
      const t0 = ST[iLat] + 0.12, F = pts.map((q, n) => n === IC || n === IP ? 1 : Math.max(0, popS(t - (t0 + Math.hypot(q.i - 1, q.j - 1, q.k - 2) * 0.12))));
      const dim = inLat ? mj(seg01(u, 0.62, 0.8)) : 1;
      pts.forEach((q, n) => {
        dummy.position.set(q.x, q.y, q.z); dummy.quaternion.copy(q0); dummy.scale.setScalar(Math.max((q.na ? R_NAI : R_CLI) * F[n], 0.0001)); dummy.updateMatrix(); balls.setMatrixAt(n, dummy.matrix);
        tmpC.copy(q.na ? C_NA : C_CL); if (!HI.has(n)) tmpC.lerp(C_DIM, 0.8 * dim); balls.setColorAt(n, tmpC);
      });
      bars.forEach((b, n) => {
        const A_ = pts[b.a], B_ = pts[b.b], f = Math.max(0.0001, Math.min(F[b.a], F[b.b]));
        dummy.position.set((A_.x + B_.x) / 2, (A_.y + B_.y) / 2, (A_.z + B_.z) / 2); dummy.quaternion.copy(b.ax === 0 ? qx : (b.ax === 2 ? qz : q0)); dummy.scale.setScalar(f); dummy.updateMatrix(); barI.setMatrixAt(n, dummy.matrix);
        tmpC.copy(C_BAR); if (!(HI.has(b.a) && HI.has(b.b) && (b.a === IC || b.b === IC))) tmpC.lerp(C_DIM, 0.8 * dim); barI.setColorAt(n, tmpC);
      });
      balls.instanceMatrix.needsUpdate = barI.instanceMatrix.needsUpdate = true; balls.instanceColor.needsUpdate = barI.instanceColor.needsUpdate = true;
    }

    // ---- 鏡頭
    if (!isMicro) {
      P2.set(grainW.x + 0.05, grainW.y + 0.3, grainW.z + 0.6); L2.copy(grainW);
      const wob = Math.sin(t * 0.25) * 0.3 * (1 - f1);
      lerp3(cp, P0, P1, f1); lerp3(cl, L0, L1, f1); cp.x += wob; lerp3(cp, cp, P2, f2); lerp3(cl, cl, L2, f2);
      cam.position.copy(cp); cam.lookAt(cl);
    } else {
      const dFoc = kf(t, [[ST[iIon] - 0.3, 0], [ST[iIon] + 0.9, 1], [ST[iLat] + 0.15, 1], [ST[iLat] + 0.55 * SEG[iLat].d, 0]]);
      const dist = kf(t, [[tSwap1, 5.6], [ST[iIon] + 0.9, 4.4], [ST[iLat] + 0.15, 4.4], [ST[iLat] + 0.6 * SEG[iLat].d, 9.2 * (cam.zoom > 1.1 ? 1.2 : 1)]]);
      tp.copy(PM).applyEuler(rotG.rotation).multiplyScalar(dFoc).add(M); tp.y -= 0.35 * ease(seg01(t, ST[iLat] + 0.15, ST[iLat] + 0.6 * SEG[iLat].d));
      const az = 0.4 + 0.03 * tm, el = 0.26;
      cam.position.set(tp.x + Math.sin(az) * Math.cos(el) * dist, tp.y + Math.sin(el) * dist, tp.z + Math.cos(az) * Math.cos(el) * dist); cam.lookAt(tp);
    }
    cam.updateMatrixWorld(true);
    camF.set(0, 0, -1).applyQuaternion(cam.quaternion); camU.set(0, 1, 0).applyQuaternion(cam.quaternion); camR.set(1, 0, 0).applyQuaternion(cam.quaternion);

    // ---- 標籤
    const mDist = Math.max(3, cam.position.distanceTo(tp.lengthSq() ? tp : M));
    if (isMicro && k === iIon && uI > 0.28) {
      const wW = 0.3 * mDist, st = s > 0.5 ? 1 : 0, lo = Math.min(1, (uI - 0.28) / 0.1);
      wv.copy(naA.position).applyEuler(rotG.rotation).add(M).addScaledVector(camU, -0.62).addScaledVector(camR, -0.35); labNa.position.copy(wv); setLab(labNa, st, wW, lo);
      wv.copy(clA.position).applyEuler(rotG.rotation).add(M).addScaledVector(camU, -0.62).addScaledVector(camR, 0.35); labCl.position.copy(wv); setLab(labCl, st, wW, lo);
      const eo = ramp(uI, 0.46, 0.52, 0.76, 0.82);
      wv.copy(eMesh.position).applyEuler(rotG.rotation).add(M).addScaledVector(camU, 0.5); labE.position.copy(wv); setLab(labE, 0, 0.26 * mDist, eo);
    } else { labNa.visible = labCl.visible = labE.visible = false; }
    if (isMicro && k === iLat) { const lo = ease(seg01(u, 0.55, 0.7)); hudPlace(legNa, -0.56, 0.84, 5, 0.76, lo, 0); hudPlace(legCl, -0.56, 0.64, 5, 0.76, lo, 0); } else { legNa.visible = legCl.visible = false; }

    // ---- 閃白轉場:桌上 ↔ 微觀
    const fl = Math.max(1 - Math.abs(t - tSwap1) / 0.4, 1 - Math.abs(t - tSwap2) / 0.3, 0);
    flash.visible = fl > 0.01; flash.material.opacity = ease(fl);
    flash.position.copy(cam.position).addScaledVector(camF, 0.5); flash.quaternion.copy(cam.quaternion); flash.scale.set(3, 2, 1);
    ctx.hemi.intensity = 0.85 * ctx.LI; ctx.key.intensity = 2.0 * ctx.LI;
  }
  return { grp, SEG, ST, update, title: E.titleZh, leg: E.legZh, room: true, people: true };
}
