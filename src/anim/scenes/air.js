// 場景:空氣裡有什麼?零食袋裡的氮氣。寫法與契約見 .claude/skills/chem-story-to-animation/references/scene-authoring.md
// 事實表:.claude/skills/chem-story-to-animation/references/science/air.md
// 分子運動:update(t) 是 t 的純函式,所以分子位置用「三角波」解析式(等速直線運動 + 碰到牆壁彈性反彈),不累積狀態。
export function build(ctx, E) {
  const { T, scene, cam } = ctx;
  const { clamp, lerp, ease, mj, seg01, kf, popS, canvasTex, segIdx } = ctx.h;
  const BENCH = ctx.BENCH, G = ctx.G, LI = ctx.LI, A = ctx.adult, K = ctx.kid, ENV = ctx.env();
  const grp = new T.Group(); scene.add(grp);
  E = (ctx.EXP && ctx.EXP.air) || E;   // 引擎若還沒依 key 傳入實驗資料,就直接取自己的腳本
  const SEG = E.steps.map(s => ({ n: s.nZh, d: s.d0, io: s.io, cap: s.capZh }));
  const ST = []; SEG.reduce((a, s) => { ST.push(a); return a + s.d; }, 0);

  // ---------------------------------------------------------------- 亂數(固定種子,每次都一樣)
  let seed = 20240607;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const tw = x => { let m = x % 2; if (m < 0) m += 2; return m < 1 ? m : 2 - m; };           // 三角波 0~1(彈性碰撞牆壁的一維解)
  const smax = (a, b, k) => 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k));
  const sstep = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0), 0, 1); return u * u * (3 - 2 * u); };

  // ---------------------------------------------------------------- 版面(世界座標)
  const CX = -0.5, CZ = 0.15;                       // 零食袋(中心在桌面上)
  const BA = 1.1, BB = 0.6, BH = 1.2, FIN = 0.35;    // 半長、半寬、最厚、封口長度
  const CUBE = { x: -1.3, y: BENCH + 0.92, z: 0.45, s: 1.8 };   // 100 個分子的透明立方體
  const MOUTH = { x: CX + BA + 0.1, y: BENCH + 0.48, z: CZ };    // 開袋後氣體跑出去的出口
  const ROOM = { x0: -3.4, x1: 2.4, y0: BENCH + 0.12, y1: BENCH + 2.0, z0: -0.2, z1: 1.8 };   // 氣體在房間裡活動的範圍

  const shX = u => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.6)), 0.5), shZ = v => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), 2.6)), 0.42);   // 枕頭形:中間飽滿、往封口與邊緣收攏
  const botH = sh => 0.03 + 0.3 * (1 - Math.pow(sh, 0.6));       // 袋底:中央平躺在桌上,往封口邊緣慢慢翹起(枕頭形的接縫在半高處)

  // ---------------------------------------------------------------- 分子(InstancedMesh:3 次繪製)
  const NN = 78, NO = 21, NA = 1, NM = 100, NB = 60, NESC = 45;   // 氮、氧、氬;袋內畫 60 個氮分子,其中 45 個開袋後跑出去
  const RAD = { N: 0.055, O: 0.058, A: 0.067 }, SEP = { N: 0.058, O: 0.06 };   // 球半徑、兩球中心到分子中心的距離(氬的原子比較大)
  const COL = { N: new T.Color('#3050f8'), O: new T.Color('#e0201f'), A: new T.Color('#aab2bd') };
  const sphG = new T.SphereGeometry(1, 12, 8);
  const molMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0, envMap: ENV, envMapIntensity: 0.7 });
  const meshN = new T.InstancedMesh(sphG, molMat, NN * 2), meshO = new T.InstancedMesh(sphG, molMat, NO * 2), meshA = new T.InstancedMesh(sphG, molMat, NA);
  [meshN, meshO, meshA].forEach(m => { m.frustumCulled = false; m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.castShadow = false; m.setColorAt(0, COL.N); grp.add(m); });
  const M = [];                                      // 每個分子的固定亂數(位置與速度都由它決定)
  for (let i = 0; i < NM; i++) {
    const kind = i < NN ? 'N' : i < NN + NO ? 'O' : 'A', vf = kind === 'N' ? 1 : kind === 'O' ? 0.935 : 0.84;   // 速率 ∝ 1/√質量(N2 28、O2 32、Ar 40)
    const dir = () => { const x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 2 - 1, l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
    const sp = (0.9 + rnd() * 0.9) * vf, d1 = dir(), d2 = dir(), ax = dir();
    const esc = i < NB && i < NESC;
    M.push({
      kind, c0: [rnd(), rnd(), rnd()], cv: d1.map(v => v * sp), b0: [rnd(), rnd(), rnd()], bv: d2.map(v => v * sp), ax: new T.Vector3(ax[0], ax[1], ax[2]), w: (1.2 + rnd() * 2.2) * (rnd() < 0.5 ? -1 : 1), ph: rnd() * 6.28,
      te: esc ? Math.pow(rnd(), 1.6) : -1, jd: dir(), jv: 2.4 + rnd() * 1.4, mz: (rnd() - 0.5) * 0.2, o0: [rnd(), rnd(), rnd()], ov: dir().map(v => v * (0.8 + rnd() * 0.5)),
      idx: i < NN ? i : i < NN + NO ? i - NN : 0
    });
  }
  // 餅乾(圓盤,略有弧度;只畫 3 片)。分子碰到餅乾會被「推開」(投影到餅乾外面),所以在餅乾之間繞著走。
  const COOK = [
    { x: -0.12, y: 0.2, z: 0.04, rx: 0.05, rz: 0.07 }, { x: 0.1, y: 0.54, z: -0.05, rx: -0.06, rz: -0.09 }, { x: -0.05, y: 0.88, z: 0.03, rx: 0.04, rz: 0.06 }];
  const CR = 0.45, CT = 0.05, CMARG = 0.05;
  const cookQ = COOK.map(c => new T.Quaternion().setFromEuler(new T.Euler(c.rx, 0, c.rz)));
  const cookQi = cookQ.map(q => q.clone().invert());

  // ---------------------------------------------------------------- 工具:標籤、貼圖
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function labelTex(txt, col, icon, big) {
    return canvasTex(512, 128, (g, w, h) => {
      if (!big) { g.fillStyle = 'rgba(14,20,50,0.86)'; rr(g, 6, 6, w - 12, h - 12, 30); g.fill(); g.lineWidth = 6; g.strokeStyle = col; g.stroke(); }
      let x0 = 40;
      if (icon) { g.fillStyle = icon.c; const r = 17; if (icon.n === 2) { g.beginPath(); g.arc(46, h / 2, r, 0, 7); g.fill(); g.beginPath(); g.arc(46 + 28, h / 2, r, 0, 7); g.fill(); x0 = 106; } else { g.beginPath(); g.arc(56, h / 2, 21, 0, 7); g.fill(); x0 = 96; } }
      g.fillStyle = '#fff'; g.font = (big ? 'bold 84px' : 'bold 46px') + ' "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.textBaseline = 'middle'; g.textAlign = big ? 'center' : 'left';
      if (big) { g.lineWidth = 10; g.strokeStyle = 'rgba(20,30,70,0.9)'; g.strokeText(txt, w / 2, h / 2 + 3); g.fillText(txt, w / 2, h / 2 + 3); } else {
        let fs = 46; while (g.measureText(txt).width > w - x0 - 28 && fs > 24) { fs -= 2; g.font = 'bold ' + fs + 'px "Noto Sans TC","Microsoft JhengHei",sans-serif'; } g.fillText(txt, x0, h / 2 + 3);
      }
    }, true);
  }
  function label(zh, en, col, icon, big, w) {
    const tz = labelTex(zh, col, icon, big), te = labelTex(en, col, icon, big);
    const s = new T.Sprite(new T.SpriteMaterial({ map: tz, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); s.userData = { zh: tz, en: te }; s.scale.set(w || 2.1, (w || 2.1) / 4, 1); s.renderOrder = 20; s.visible = false; grp.add(s); return s;
  }
  const lN = label('氮氣 N₂ 78', 'Nitrogen N₂ 78', '#3050f8', { n: 2, c: '#3050f8' });
  const lO = label('氧氣 O₂ 21', 'Oxygen O₂ 21', '#e0201f', { n: 2, c: '#e0201f' });
  const lA = label('氬、二氧化碳等 1', 'Argon, CO₂… 1', '#aab2bd', { n: 1, c: '#aab2bd' });
  const lBag = label('只畫氮氣 N₂', 'Only N₂ shown', '#3050f8', { n: 2, c: '#3050f8' }, false, 2.3);
  const lOut = label('氧氣被擋在外面', 'Oxygen stays out', '#e0201f', { n: 2, c: '#e0201f' }, false, 2.5);
  const lHiss = label('嘶——', 'Ssss!', '#fff', null, true, 1.6);
  const qTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h / 2, 56, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffd23f'; g.stroke(); g.fillStyle = '#2f3a9e'; g.font = 'bold 86px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h / 2 + 6); }, true);
  const lQ = new T.Sprite(new T.SpriteMaterial({ map: qTex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); lQ.userData = { zh: qTex }; lQ.renderOrder = 20; lQ.visible = false; grp.add(lQ);
  const lX = label('透明剖面', 'See-through view', '#8fb0ff', null, false, 2.3);

  // ---------------------------------------------------------------- 透明立方體(裝 100 個分子)
  const cubeG = new T.Group(); grp.add(cubeG); cubeG.position.set(CUBE.x, CUBE.y, CUBE.z);
  const cubeFace = new T.Mesh(new T.BoxGeometry(CUBE.s, CUBE.s, CUBE.s), new T.MeshPhysicalMaterial({ color: 0xdff0ff, roughness: 0.04, transparent: true, opacity: 0.1, envMap: ENV, envMapIntensity: 1.4, side: T.DoubleSide, depthWrite: false, clearcoat: 1 })); cubeFace.renderOrder = 4; cubeG.add(cubeFace);
  const edgeMat = new T.MeshStandardMaterial({ color: 0xe9f3ff, roughness: 0.2, metalness: 0.2, envMap: ENV, envMapIntensity: 1 });
  const hs = CUBE.s / 2, edgeG = new T.CylinderGeometry(0.022, 0.022, CUBE.s, 8), cornG = new T.SphereGeometry(0.03, 10, 8);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    for (const ori of ['x', 'y', 'z']) { const e = new T.Mesh(edgeG, edgeMat); if (ori === 'x') { e.rotation.z = Math.PI / 2; e.position.set(0, sx * hs, sy * hs); } else if (ori === 'y') e.position.set(sx * hs, 0, sy * hs); else { e.rotation.x = Math.PI / 2; e.position.set(sx * hs, sy * hs, 0); } cubeG.add(e); }
    for (const sz of [-1, 1]) { const c = new T.Mesh(cornG, edgeMat); c.position.set(sx * hs, sy * hs, sz * hs); cubeG.add(c); }
  }
  const ring = new T.Mesh(new T.TorusGeometry(0.19, 0.012, 8, 36), new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); ring.visible = false; grp.add(ring);

  // ---------------------------------------------------------------- 零食袋:枕頭形、鋁箔反光(用環境反射)
  const bagG = new T.Group(); grp.add(bagG); bagG.position.set(CX, BENCH, CZ);
  const printTex = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f2583a'); gr.addColorStop(1, '#d93a25'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(0, h * 0.7); for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.7 + Math.sin(x * 0.05) * 14); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h * 0.45, 66, 0, 7); g.fill();
    g.fillStyle = '#2f6df0'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 24 : 52, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(w / 2 + Math.cos(a) * r, h * 0.45 + Math.sin(a) * r); } g.closePath(); g.fill();
  }, true);
  const foil = new T.MeshStandardMaterial({ color: 0xffffff, map: printTex, metalness: 0.85, roughness: 0.28, envMap: ENV, envMapIntensity: 1.5, side: T.DoubleSide, transparent: true, opacity: 1, depthWrite: false });
  const NU = 44, NV = 24, NVT = (NU + 1) * (NV + 1);
  const bGeo = new T.BufferGeometry(), bPos = new Float32Array(NVT * 6), bUv = new Float32Array(NVT * 4), bIdx = [], PX = new Float32Array(NVT), PZ = new Float32Array(NVT), PS = new Float32Array(NVT), PSZ = new Float32Array(NVT);
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
    const vi = j * (NU + 1) + i, u = i / NU * 2 - 1, v = j / NV * 2 - 1; PX[vi] = u * BA; PZ[vi] = v * BB;
    const sx = shX(u), sz = shZ(v); PS[vi] = sx * sz; PSZ[vi] = sz;
    bUv[vi * 2] = (u + 1) / 2; bUv[vi * 2 + 1] = (v + 1) / 2; bUv[(NVT + vi) * 2] = (u + 1) / 2; bUv[(NVT + vi) * 2 + 1] = (v + 1) / 2;
    if (i < NU && j < NV) { const a = vi, b = vi + 1, c = vi + NU + 1, d = c + 1; bIdx.push(a, c, b, b, c, d, NVT + a, NVT + b, NVT + c, NVT + b, NVT + d, NVT + c); }
  }
  bGeo.setAttribute('position', new T.BufferAttribute(bPos, 3)); bGeo.setAttribute('uv', new T.BufferAttribute(bUv, 2)); bGeo.setIndex(bIdx);
  const rimIdx = []; for (let i = 0; i <= NU; i++) rimIdx.push(i); for (let j = 1; j <= NV; j++) rimIdx.push(j * (NU + 1) + NU); for (let i = NU - 1; i >= 0; i--) rimIdx.push(NV * (NU + 1) + i); for (let j = NV - 1; j > 0; j--) rimIdx.push(j * (NU + 1));
  const rimGeo = new T.BufferGeometry(); rimGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(rimIdx.length * 3), 3));
  const rimLine = new T.LineLoop(rimGeo, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, toneMapped: false })); rimLine.frustumCulled = false; rimLine.renderOrder = 7; bagG.add(rimLine);
  const bagMesh = new T.Mesh(bGeo, foil); bagMesh.frustumCulled = false; bagMesh.renderOrder = 6; bagG.add(bagMesh);
  function finGeo() { const g = new T.PlaneGeometry(FIN, BB * 2, 8, 30); g.rotateX(-Math.PI / 2); g.translate(FIN / 2, 0, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, 0.03 * Math.sin(p.getZ(i) * 30)); g.computeVertexNormals(); return g; }
  const finMat = new T.MeshStandardMaterial({ color: 0xd5dbe6, metalness: 1, roughness: 0.25, envMap: ENV, envMapIntensity: 1.6, side: T.DoubleSide });
  const finUp = new T.Mesh(finGeo(), finMat), finLo = new T.Mesh(finGeo(), finMat), finUpL = new T.Mesh(finGeo(), finMat), finLoL = new T.Mesh(finGeo(), finMat);   // 右端(開口)與左端(封死)的封口
  [finUp, finLo, finUpL, finLoL].forEach(f => { f.renderOrder = 6; bagG.add(f); });
  finUpL.rotation.y = Math.PI; finLoL.rotation.y = Math.PI; finUpL.position.set(-BA, botH(0) + 0.012, 0); finLoL.position.set(-BA, botH(0), 0);
  const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(10,10,30,0.55)'); gr.addColorStop(1, 'rgba(10,10,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, true), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(CX + 0.2, BENCH + 0.006, CZ); shadow.scale.set(BA * 2 + 1.5, BB * 2 + 0.9, 1); grp.add(shadow);

  // 餅乾:圓盤(旋轉曲面,邊緣圓滑)+ 微微凸起的頂面(巧克力豆貼圖)
  const cookSide = new T.MeshStandardMaterial({ color: 0xc98a3c, roughness: 0.8 });
  const chipTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d99a4a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(' + (150 + rnd() * 40) + ',' + (95 + rnd() * 30) + ',40,0.35)'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 5, 0, 7); g.fill(); }
    for (let i = 0; i < 14; i++) { g.fillStyle = '#4a2a18'; g.beginPath(); g.ellipse(30 + rnd() * 196, 30 + rnd() * 196, 9 + rnd() * 6, 7 + rnd() * 5, rnd() * 3, 0, 7); g.fill(); }
  }, true);
  const cookLathe = ctx.props.lathe([[0, -CT], [CR - 0.04, -CT], [CR, -CT * 0.4], [CR + 0.01, 0], [CR, CT * 0.5], [CR - 0.05, CT * 0.95], [0, CT * 0.95]], 40);
  const topG = new T.CircleGeometry(CR - 0.02, 40, 0, Math.PI * 2); topG.rotateX(-Math.PI / 2);
  { const p = topG.attributes.position; for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)) / CR; p.setY(i, CT * 0.95 + 0.04 * (1 - r * r)); } topG.computeVertexNormals(); }
  const cookM = new T.MeshStandardMaterial({ map: chipTex, roughness: 0.75 });
  const cooks = COOK.map((c, i) => {
    const g = new T.Group(); g.position.set(c.x, c.y, c.z); g.quaternion.copy(cookQ[i]); g.rotation.y = i * 1.9;
    const a = new T.Mesh(cookLathe, cookSide), b = new T.Mesh(topG, cookM); a.castShadow = b.castShadow = true; g.add(a); g.add(b); bagG.add(g); return g;
  });
  // 壓在袋子上的重物(小球):證明袋子像墊子,壓下去只微微凹、餅乾沒被壓到
  const ball = new T.Mesh(new T.SphereGeometry(0.3, 28, 20), new T.MeshStandardMaterial({ color: 0x2fa84f, roughness: 0.25, metalness: 0.1, envMap: ENV, envMapIntensity: 0.9 })); ball.castShadow = true; grp.add(ball);

  // ---------------------------------------------------------------- 袋子形狀(每格由 s=充氣程度、dent=被壓凹的深度、op=開口大小決定)
  const ENVH = 1.1, ENVR = 0.72;                      // 袋子消氣後,薄膜蓋在餅乾堆上的高度與寬度
  function thick(x, z, sh, sz, s, dent, op) {          // 袋子在 (x,z) 的厚度(袋底以上)
    const r2 = x * x + z * z, env = ENVH * Math.pow(Math.max(0, 1 - r2 / (ENVR * ENVR)), 0.7);
    let t = smax(s * BH * sh - dent * Math.exp(-r2 / (2 * 0.38 * 0.38)) * sh, env, 0.0006);
    t += op * 0.3 * sstep(0.55, 1, x / BA) * Math.sqrt(sz);   // 開口:上層薄膜被拉起來
    return t;
  }
  function setBag(s, dent, op) {
    for (let vi = 0; vi < NVT; vi++) {
      const x = PX[vi], z = PZ[vi], sh = PS[vi], bt = botH(sh), tp = bt + Math.max(0.004, thick(x, z, sh, PSZ[vi], s, dent, op));
      bPos[vi * 3] = x; bPos[vi * 3 + 1] = tp; bPos[vi * 3 + 2] = z; bPos[(NVT + vi) * 3] = x; bPos[(NVT + vi) * 3 + 1] = bt; bPos[(NVT + vi) * 3 + 2] = z;
    }
    bGeo.attributes.position.needsUpdate = true; bGeo.computeVertexNormals();
    const rp = rimGeo.attributes.position; rimIdx.forEach((vi, n) => rp.setXYZ(n, bPos[vi * 3], bPos[vi * 3 + 1] + 0.01, bPos[vi * 3 + 2])); rp.needsUpdate = true;
  }

  // ---------------------------------------------------------------- 分子位置
  const tmpP = new T.Vector3(), tmpQ = new T.Quaternion(), tmpO = new T.Vector3(), tmpS = new T.Vector3(), tmpM = new T.Matrix4(), tmpC = new T.Color(), tmpL = new T.Vector3();
  function pushOut(p, ra, rb, ci) {                    // 把落在餅乾(扁橢球)裡的點,沿橢球座標往外推到表面外(連續)
    const c = COOK[ci]; tmpL.set(p.x - (CX + c.x), p.y - (BENCH + c.y), p.z - (CZ + c.z)).applyQuaternion(cookQi[ci]);
    let qx = tmpL.x / ra, qy = tmpL.y / rb, qz = tmpL.z / ra, l = Math.hypot(qx, qy, qz);
    if (l >= 1) return; if (l < 1e-4) { qy = 1; l = 1; }
    qx /= l; qy /= l; qz /= l; tmpL.set(qx * ra, qy * rb, qz * ra).applyQuaternion(cookQ[ci]); p.set(CX + c.x + tmpL.x, BENCH + c.y + tmpL.y, CZ + c.z + tmpL.z);
  }
  function cubePos(m, t, out) {
    const L = CUBE.s - 0.2; return out.set(CUBE.x + (tw(m.c0[0] + m.cv[0] * t / L) - 0.5) * L, CUBE.y + (tw(m.c0[1] + m.cv[1] * t / L) - 0.5) * L, CUBE.z + (tw(m.c0[2] + m.cv[2] * t / L) - 0.5) * L);
  }
  function bagPos(m, t, s, dent, out) {                // 袋內:箱形區域的三角波,再對應到枕頭形的內部,最後把餅乾推開
    const xn = tw(m.b0[0] + m.bv[0] * t / (BA * 1.7)), zn = tw(m.b0[1] + m.bv[1] * t / (BB * 1.7)), wn = tw(m.b0[2] + m.bv[2] * t / 1.1);
    const x = (xn * 2 - 1) * (BA - 0.12), z = (zn * 2 - 1) * (BB - 0.1), u = x / BA, v = z / BB, sh = shX(u) * shZ(v), sz = shZ(v);
    const bt = botH(sh) + 0.07, tp = botH(sh) + Math.max(0.004, thick(x, z, sh, sz, s, dent, 0)) - 0.07, y = tp > bt ? bt + wn * (tp - bt) : (bt + tp) / 2;
    out.set(CX + x, BENCH + y, CZ + z); for (let c = 0; c < COOK.length; c++) pushOut(out, CR + CMARG, CT + CMARG + 0.01, c); return out;
  }
  function jetPos(m, tau, out) {                       // 開口後:噴流(初速大、很快變慢)+ 熱運動,碰到房間的牆彈回來
    const tau0 = 0.55, d = m.jv * tau0 * (1 - Math.exp(-tau / tau0)) + 0.45 * tau;
    const dx = m.jd[0] * 0.55 + 1.0, dy = m.jd[1] * 0.45 + 0.05, dz = m.jd[2] * 0.9, l = Math.hypot(dx, dy, dz);
    const px = MOUTH.x + dx / l * d, py = MOUTH.y + dy / l * d, pz = MOUTH.z + m.mz + dz / l * d;
    return out.set(ROOM.x0 + tw((px - ROOM.x0) / (ROOM.x1 - ROOM.x0)) * (ROOM.x1 - ROOM.x0), ROOM.y0 + tw((py - ROOM.y0) / (ROOM.y1 - ROOM.y0)) * (ROOM.y1 - ROOM.y0), ROOM.z0 + tw((pz - ROOM.z0) / (ROOM.z1 - ROOM.z0)) * (ROOM.z1 - ROOM.z0));
  }
  const OUTR = { a: 1.55, b: 1.2, c: 1.05 };           // 袋外的氧分子碰到袋子會被彈開:把點推到袋子外圍的橢球外面
  function outPos(m, t, out) {
    const x = -3.3 + tw(m.o0[0] + m.ov[0] * t / 3.9) * 3.9, y = BENCH + 0.12 + tw(m.o0[1] + m.ov[1] * t / 1.8) * 1.8, z = 0.2 + tw(m.o0[2] + m.ov[2] * t / 1.5) * 1.5;
    out.set(x, y, z); const qx = (x - CX) / OUTR.a, qy = (y - BENCH - 0.3) / OUTR.c, qz = (z - CZ) / OUTR.b, l = Math.hypot(qx, qy, qz);
    if (l < 1) { const k = 1 / Math.max(l, 1e-3); out.set(CX + qx * k * OUTR.a, BENCH + 0.3 + qy * k * OUTR.c, CZ + qz * k * OUTR.b); } return out;
  }
  function putMol(m, i, pos, sc, t, dim, glow) {       // 把一個分子(1 或 2 顆球)寫進 InstancedMesh
    const R = m.kind === 'A' ? RAD.A : m.kind === 'N' ? RAD.N : RAD.O; sc = Math.max(0, sc) * (glow || 1);
    tmpC.copy(COL[m.kind]).multiplyScalar(dim);
    if (m.kind === 'A') { tmpS.setScalar(Math.max(1e-4, R * sc)); tmpM.compose(pos, tmpQ.identity(), tmpS); meshA.setMatrixAt(0, tmpM); meshA.setColorAt(0, tmpC); return; }
    const mesh = m.kind === 'N' ? meshN : meshO, sp = SEP[m.kind] * sc; tmpQ.setFromAxisAngle(m.ax, m.w * t + m.ph); tmpS.setScalar(Math.max(1e-4, R * sc));
    for (let j = 0; j < 2; j++) { tmpO.set(j ? sp : -sp, 0, 0).applyQuaternion(tmpQ).add(pos); tmpM.compose(tmpO, tmpQ, tmpS); mesh.setMatrixAt(m.idx * 2 + j, tmpM); mesh.setColorAt(m.idx * 2 + j, tmpC); }
  }

  // ---------------------------------------------------------------- 人物與鏡頭的小工具
  const tA = new T.Vector3(), tB = new T.Vector3(), tC = new T.Vector3(), hand = new T.Vector3(), kHead = new T.Vector3(3.0, 2.2, -0.75);
  const camK = { x: [[0, 0.3], [1, -1.2], [2, -0.9], [3, 0.3], [4, 1.3], [5, 0.6]], y: [[0, 6.2], [1, 5.3], [2, 4.7], [3, 4.8], [4, 4.2], [5, 6.0]], z: [[0, 10.6], [1, 8.4], [2, 7.2], [3, 7.4], [4, 8.0], [5, 10.4]], lx: [[0, -0.1], [1, -1.3], [2, -0.7], [3, 0.2], [4, 1.6], [5, 0.5]], ly: [[0, 2.5], [1, 3.0], [2, 2.5], [3, 2.7], [4, 2.7], [5, 2.5]] };

  function update(t, time) {
    const lang = ctx.lang(), k = segIdx({ SEG, ST }, t), u = clamp((t - ST[k]) / SEG[k].d, 0, 1);
    const d = i => SEG[i].d, tS = i => ST[i];
    // ---- 時間軸(單位:秒)
    const tCubeIn = tS(1) + 0.15, tCubeOut = tS(2), tBagOut = tS(1), tBagIn = tS(2) + 0.35;
    const tBall = tS(2) + d(2) * 0.2, tBallOff = tS(2) + d(2) * 0.55, tO2 = tS(2) + d(2) * 0.62;
    const tOpen = tS(3) + d(3) * 0.3, W = d(3) * 0.5, tFade = tS(4) + 0.3;
    // ---- 袋子的狀態:充氣程度 s(隨氣體跑出去而減少)、被球壓凹 dent、開口 op
    let frac = 1, nEsc = 0; for (const m of M) if (m.te >= 0) nEsc++;
    let sumRem = 0; for (const m of M) { if (m.kind !== 'N' || m.idx >= NB) continue; if (m.te < 0) { sumRem += 1; continue; } const te = tOpen + 0.15 + W * m.te; sumRem += 1 - sstep(te - 0.55, te, t); }
    frac = sumRem / NB; const sNow = 0.3 + 0.7 * frac;
    const op = t < tOpen - d(3) * 0.1 ? 0 : mj(seg01(t, tOpen - d(3) * 0.1, tOpen + d(3) * 0.12));
    const R0 = 0.3, tcFall = 0.42, y0 = BENCH + 3.0;
    let dent = 0; const tb = t - tBall;
    if (tb > tcFall) { const x = tb - tcFall; dent = 0.1 * (1 - Math.exp(-7 * x) * Math.cos(15 * x)); }
    dent *= 1 - ease(seg01(t, tBallOff, tBallOff + 0.5));
    setBag(sNow, dent, op);
    const ballSc = tb < 0 ? 0 : t > tBallOff ? Math.max(0, 1 - ease(seg01(t, tBallOff, tBallOff + 0.35))) : popS(Math.min(tb, 1));
    const topC = (BENCH + botH(1) + thick(0, 0, 1, 1, 1, dent, 0)), yRest = topC + R0 * 0.95 + 0.02, yFree = y0 - 0.5 * G * Math.max(0, tb) * Math.max(0, tb);
    ball.visible = ballSc > 0.01; ball.scale.setScalar(Math.max(ballSc, 0.001)); ball.position.set(CX, Math.max(yRest, yFree), CZ);

    // ---- 立方體與袋子的出場(影片效果)
    const cubeSc = t < tCubeIn ? 0 : popS(t - tCubeIn) * (1 - ease(seg01(t, tCubeOut, tCubeOut + 0.4)));
    cubeG.visible = cubeSc > 0.01; cubeG.scale.setScalar(Math.max(cubeSc, 0.001));
    const bagSc = t < 0.3 ? 0 : t < tBagOut ? popS(t - 0.3) : t < tBagOut + 0.35 ? 1 - ease((t - tBagOut) / 0.35) : t < tBagIn ? 0 : popS(t - tBagIn);
    rimLine.material.opacity = k === 2 || k === 3 || k === 4 ? 0.85 : 0; bagG.visible = bagSc > 0.01; bagG.scale.setScalar(Math.max(bagSc, 0.001)); shadow.visible = bagG.visible; shadow.material.opacity = Math.min(1, bagSc);
    foil.opacity = k < 2 ? 1 : k === 2 ? lerp(1, 0.12, ease(seg01(t, tS(2) + 0.4, tS(2) + 1.6))) : k < 5 ? 0.12 : lerp(0.12, 0.96, ease(seg01(t, tS(5), tS(5) + 1.0)));
    // 封口:右端(開口)上層隨 op 掀起,下層不動;左端封死
    const lift = op * 0.3 * 0.82, th = op * 0.62, pivY = botH(0) + 0.004 + lift;
    finLo.position.set(BA, botH(0) + 0.002, 0); finUp.position.set(BA, pivY, 0); finUp.rotation.z = th; finLo.rotation.z = 0;

    // ---- 分子
    const hiN = k === 1 ? seg01(u, 0.2, 0.42) : 0, hiO = k === 1 ? seg01(u, 0.42, 0.62) : 0, hiA = k === 1 ? seg01(u, 0.62, 0.84) : 0;
    const pulse = (a, b) => (t >= tS(1) && k === 1 && u > a && u < b) ? 1 + 0.45 * Math.sin(Math.PI * (u - a) / (b - a)) : 1;
    let arPos = null;
    for (let i = 0; i < NM; i++) {
      const m = M[i]; let sc = 0, dim = 1, glow = 1;
      if (t < tCubeOut + 0.45) {
        sc = t < tCubeIn ? 0 : popS(t - tCubeIn - 0.004 * i) * (1 - ease(seg01(t, tCubeOut, tCubeOut + 0.4)));
        cubePos(m, t, tmpP);
        if (k === 1) { const onN = m.kind === 'N' ? u > 0.2 && u < 0.42 : m.kind === 'O' ? u > 0.42 && u < 0.62 : u > 0.62 && u < 0.84; if (u > 0.2 && u < 0.84) dim = onN ? 1.15 : 0.4; glow = m.kind === 'N' ? pulse(0.2, 0.42) : m.kind === 'O' ? pulse(0.42, 0.62) : 1.2 * pulse(0.62, 0.84); }
        if (m.kind === 'A') arPos = tmpP.clone();
      } else if (m.kind === 'N' && m.idx < NB) {
        const te = m.te >= 0 ? tOpen + 0.15 + W * m.te : 1e9, born = popS(t - tBagIn - 0.004 * m.idx);
        sc = born * (1 - ease(seg01(t, tFade + 0.012 * m.idx, tFade + 1.5 + 0.012 * m.idx)));
        if (t < te) { bagPos(m, t, sNow, dent, tmpP); if (t > te - 0.55) { tmpL.set(MOUTH.x, MOUTH.y + 0.02, MOUTH.z + m.mz); tmpP.lerp(tmpL, ease((t - (te - 0.55)) / 0.55)); } } else jetPos(m, t - te, tmpP);
      } else if (m.kind === 'O' && m.idx < 8) {
        sc = (t < tO2 ? 0 : popS(t - tO2 - 0.05 * m.idx)) * (t >= tS(3) ? 1 - ease(seg01(t, tS(3), tS(3) + 0.5)) : 1); outPos(m, t, tmpP);
      }
      if (sc <= 0.0005) tmpP.set(0, -5, 0);
      putMol(m, i, tmpP, sc, t, dim, glow);
    }
    [meshN, meshO, meshA].forEach(me => { me.instanceMatrix.needsUpdate = true; me.instanceColor.needsUpdate = true; });
    // 氬原子的圓圈(只有數到氬的時候)
    ring.visible = !!arPos && k === 1 && u > 0.62 && u < 0.9 && cubeSc > 0.5; if (ring.visible) { ring.position.copy(arPos); ring.lookAt(cam.position); const p = 1 + 0.15 * Math.sin(time * 8); ring.scale.setScalar(p); }

    // ---- 標籤
    const setL = (l, vis, x, y, z, s) => { l.visible = vis; if (vis) { l.position.set(x, y, z); l.material.map = lang === 'en' ? l.userData.en : l.userData.zh; l.scale.set(l.scale.x, l.scale.y, 1); const f = s == null ? 1 : s; l.material.opacity = f; } };
    const vis1 = k === 1 && cubeSc > 0.9;
    setL(lN, vis1 && u > 0.2, -3.7, BENCH + 1.75, 0.6, 1); setL(lO, vis1 && u > 0.42, -3.7, BENCH + 1.15, 0.6, 1); setL(lA, vis1 && u > 0.62, -3.7, BENCH + 0.55, 0.6, 1);
    setL(lX, k === 2 && u > 0.1 && u < 0.5, CX - 1.5, BENCH + 2.0, 0.8, Math.min(1, ease(seg01(u, 0.1, 0.18)) * (1 - ease(seg01(u, 0.42, 0.5)))));
    setL(lBag, k === 2 && u > 0.5 && u < 0.97, CX - 1.5, BENCH + 2.0, 0.8, 1 - ease(seg01(u, 0.9, 0.97)));
    setL(lOut, k === 2 && u > 0.66 && u < 0.97, CX - 1.5, BENCH + 1.4, 0.8, 1 - ease(seg01(u, 0.9, 0.97)));
    const hissT = t - tOpen, hv = Math.min(1.1, popS(hissT)); setL(lHiss, k === 3 && hissT > 0 && hissT < 1.8, MOUTH.x + 0.35 + Math.min(hissT, 1) * 0.3, MOUTH.y + 1.2, 0.9, 1 - ease(seg01(hissT, 1.0, 1.8)));
    if (lHiss.visible) lHiss.scale.set(1.6 * hv + 1e-3, 0.4 * hv + 1e-3, 1);
    const qOn = k === 4; lQ.visible = qOn; if (qOn) { const q = popS(t - tS(4) - 0.3); lQ.position.set(kHead.x - 0.2, 3.35 + 0.07 * Math.sin(time * 3), kHead.z + 0.3); lQ.scale.setScalar(1.0 * Math.min(1.1, q) + 1e-3); lQ.material.opacity = 1; lQ.material.map = lQ.userData.zh; }

    // ---- 大人
    A.root.position.set(0.75, 0, -0.8); A.root.rotation.y = 0;
    const tipX = CX + BA + FIN, loTip = tA.set(CX + BA + FIN * 0.72, BENCH + botH(0) + 0.05, CZ - 0.14), upTip = tB.set(CX + BA + FIN * 0.72 * Math.cos(th) + 0.02, BENCH + pivY + FIN * 0.72 * Math.sin(th) + 0.06, CZ + 0.14);
    const wL = k === 3 ? ramp3(u, 0.04, 0.2, 0.88, 0.98) : 0, wR = k === 3 ? ramp3(u, 0.06, 0.22, 0.86, 0.97) : 0;
    A.solve(() => {
      A.base(time, 0); A.root.updateMatrixWorld(true);
      if (k === 0 || k === 5) A.wave(1, time);
      if (k === 3) { A.reach(-1, loTip, wL); A.reach(1, upTip, wR); }
    });
    A.look(k === 0 || k === 5 ? cam.position : k === 4 ? kHead : k === 3 ? tC.set(MOUTH.x, MOUTH.y + 0.3, CZ) : tC.set(CX, BENCH + 0.9, CZ), 0.9);
    A.mouth(k === 3 && hissT > 0 && hissT < 2.2 ? 'oh' : 'smile');
    // ---- 小朋友:看著;想一想時歪著頭、一隻手摸下巴
    K.root.position.set(3.0, 0, -0.75); K.root.rotation.y = -0.45;
    const hs = k === 5 ? ctx.hopState(time, 0.26) : { crouch: 0, lift: 0, foot: 0 }, thinkW = k === 4 ? ramp3(u, 0.06, 0.25, 0.9, 1.0) : 0;
    K.solve(() => {
      K.base(time, 1.1); K.root.updateMatrixWorld(true);
      if (k === 0) K.wave(1, time); if (k === 5) { K.cheer(1, time); K.cheer(-1, time); }
      if (k === 4) { tC.set(2.68, 2.0, -0.3); K.reach(-1, tC, thinkW); }
    }, { crouch: hs.crouch, lift: hs.lift, footL: hs.foot, footR: hs.foot });
    K.look(k === 0 || k === 5 ? cam.position : tC.set(CX + 0.6, BENCH + 0.9, CZ), 0.95);
    if (k === 4) K.neck.rotateZ(0.32 * thinkW);                                        // 歪頭(頸的側彎,在活動範圍 ±35° 內)
    K.mouth(k === 4 ? 'oh' : 'smile');

    // ---- 鏡頭、燈光
    cam.position.set(kf(t, camK.x.map(a => [tS(a[0]), a[1]])) + Math.sin(t * 0.25) * 0.3, kf(t, camK.y.map(a => [tS(a[0]), a[1]])), kf(t, camK.z.map(a => [tS(a[0]), a[1]])));
    cam.lookAt(kf(t, camK.lx.map(a => [tS(a[0]), a[1]])), kf(t, camK.ly.map(a => [tS(a[0]), a[1]])), 0.25);
    ctx.hemi.intensity = 0.9 * LI; ctx.key.intensity = 2.1 * LI;
  }
  function ramp3(u, a, b, c, d) { return mj(seg01(u, a, b)) * (1 - mj(seg01(u, c, d))); }
  return { grp, SEG, ST, update, title: E.titleZh, leg: E.legZh, room: true, people: true };
}
