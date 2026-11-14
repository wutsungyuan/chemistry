// 場景:廚房找鐵與不鏽鋼(iron)。寫法與契約見 .claude/skills/chem-story-to-animation/references/scene-authoring.md
// 科學事實表:.claude/skills/chem-story-to-animation/references/science/iron.md
// 步驟:0 開頭 / 1 廚房有什麼 / 2 磁鐵吸鐵鍋 / 3 磁鐵吸不住不鏽鋼湯匙 / 4 為什麼不鏽鋼不容易生鏽(放大示意) / 5 結尾
export function build(ctx, E0) {
  const E = (ctx.EXP && ctx.EXP.iron) || E0;   // 保險:直接讀 iron 的腳本(不依賴引擎傳進來的是哪一份)
  const { T, scene, cam, hemi, key, LI, BENCH } = ctx;
  const { clamp, lerp, ease, mj, seg01, kf, ramp, pop, popS, lerp3, V, canvasTex } = ctx.h;
  const lathe = ctx.props.lathe, ENV = ctx.env();
  const grp = new T.Group(); scene.add(grp);
  const SEG = E.steps.map(s => ({ n: s.nZh, d: s.d0, io: s.io, cap: s.capZh }));
  const ST = []; SEG.reduce((a, s) => { ST.push(a); return a + s.d; }, 0);
  const iIntro = 0, iKit = 1, iPan = 2, iSpoon = 3, iWhy = 4, iEnd = 5;
  const UP = V(0, 1, 0);

  // ---------------------------------------------------------------- 材質
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // 固定亂數:每次畫出一樣的鐵鏽斑
  const ironTex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#3b3b42'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { const v = 40 + Math.floor(rnd() * 40); g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 6) + ',0.5)'; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    for (let i = 0; i < 9; i++) { const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 9, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(160,78,30,0.8)'); gr.addColorStop(1, 'rgba(160,78,30,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }   // 一點點鏽斑
  }, true);
  const ironMat = new T.MeshStandardMaterial({ map: ironTex, color: 0xffffff, metalness: 0.5, roughness: 0.55, envMap: ENV, envMapIntensity: 0.5, side: T.DoubleSide });
  const steelMat = new T.MeshStandardMaterial({ color: 0xe2e7ee, metalness: 1, roughness: 0.2, envMap: ENV, envMapIntensity: 1.25, side: T.DoubleSide });
  const darkMat = new T.MeshStandardMaterial({ color: 0x23262e, roughness: 0.5 });
  const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---------------------------------------------------------------- 廚房背景:瓷磚牆(流理台用現成的桌子)
  const tileTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#d8cfba'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 7 === 3 ? '#cfe8e6' : '#f6f0e2'; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); }
  }, true); tileTex.wrapS = tileTex.wrapT = T.RepeatWrapping; tileTex.repeat.set(1.8, 0.6);
  const wall = new T.Mesh(new T.PlaneGeometry(15, 3.4), new T.MeshStandardMaterial({ map: tileTex, roughness: 0.4 })); wall.position.set(0.2, BENCH + 1.7, -1.7); wall.receiveShadow = true; grp.add(wall);

  // ---------------------------------------------------------------- 鐵鍋(鑄鐵平底鍋,深灰、有一點鏽斑)
  const PAN = { x: 0.15, z: 0.2, rim: 0.4, r: 0.635 };
  const pan = new T.Group(); pan.position.set(PAN.x, BENCH, PAN.z); grp.add(pan);
  pan.add(shadowed(new T.Mesh(lathe([[0, 0], [0.42, 0], [0.5, 0.03], [0.58, 0.2], [0.63, 0.36], [0.65, 0.4], [0.62, 0.405], [0.57, 0.33], [0.46, 0.1], [0.4, 0.07], [0, 0.07]], 64), ironMat)));
  const hd = V(-0.75, 0, 0.66).normalize();
  const handle = shadowed(new T.Mesh(new T.CylinderGeometry(0.04, 0.07, 0.95, 16), ironMat)); handle.position.set(hd.x * 1.1, 0.33, hd.z * 1.1); handle.quaternion.setFromUnitVectors(UP, hd); pan.add(handle);
  const hEnd = shadowed(new T.Mesh(new T.SphereGeometry(0.05, 12, 8), ironMat)); hEnd.position.set(hd.x * 1.575, 0.33, hd.z * 1.575); pan.add(hEnd);
  const hRoot = shadowed(new T.Mesh(new T.SphereGeometry(0.085, 12, 8), ironMat)); hRoot.position.set(hd.x * 0.64, 0.33, hd.z * 0.64); pan.add(hRoot);
  const ear = shadowed(new T.Mesh(new T.SphereGeometry(0.06, 12, 8), ironMat)); ear.scale.set(1.4, 0.7, 1); ear.position.set(0.65, 0.33, 0); pan.add(ear);   // 對面的小耳朵把手

  // ---------------------------------------------------------------- 不鏽鋼鍋(亮面金屬)+ 鍋蓋
  const POT = { x: -1.5, z: 0.1 };
  const pot = new T.Group(); pot.position.set(POT.x, BENCH, POT.z); grp.add(pot);
  pot.add(shadowed(new T.Mesh(lathe([[0, 0], [0.52, 0], [0.58, 0.04], [0.6, 0.12], [0.6, 0.78], [0.62, 0.8], [0.63, 0.83], [0.6, 0.835], [0.58, 0.8], [0.56, 0.78], [0.56, 0.1], [0.5, 0.06], [0, 0.06]], 64), steelMat)));
  pot.add(shadowed(new T.Mesh(lathe([[0, 1.0], [0.05, 0.995], [0.07, 0.95], [0.2, 0.93], [0.45, 0.89], [0.6, 0.85], [0.64, 0.83], [0.64, 0.82], [0, 0.82]], 64), steelMat)));
  const knob = shadowed(new T.Mesh(new T.SphereGeometry(0.075, 16, 12), darkMat)); knob.position.y = 1.04; pot.add(knob);
  [1, -1].forEach(s => { const h2 = shadowed(new T.Mesh(new T.TorusGeometry(0.1, 0.03, 8, 20, Math.PI), steelMat)); h2.position.set(s * 0.64, 0.62, 0); h2.rotation.z = -s * Math.PI / 2; pot.add(h2); });

  // ---------------------------------------------------------------- 不鏽鋼湯匙(躺在流理台上,握把朝向小朋友)
  const SP = { x: 2.65, z: -0.2 };
  const spoon = new T.Group(); spoon.position.set(SP.x, BENCH, SP.z); spoon.rotation.y = Math.PI / 2;   // 握把朝左(朝小朋友那一側),磁鐵的 U 形正面對著鏡頭
   grp.add(spoon);
  const bowl = shadowed(new T.Mesh(lathe([[0, 0], [0.06, 0.005], [0.12, 0.03], [0.17, 0.075], [0.195, 0.125], [0.188, 0.13], [0.17, 0.09], [0.12, 0.045], [0.06, 0.02], [0, 0.015]], 48), steelMat)); bowl.scale.set(0.85, 1, 1.25); spoon.add(bowl);
  const shaft = shadowed(new T.Mesh(new T.CapsuleGeometry(0.045, 0.52, 6, 14), steelMat)); shaft.rotation.x = Math.PI / 2; shaft.scale.set(1.25, 1, 0.3); shaft.position.set(0, 0.035, -0.56); spoon.add(shaft);

  // ---------------------------------------------------------------- 磁鐵(馬蹄形,圓滑):一半紅、一半銀;原點在兩個磁極端面的中點
  const MR = 0.15, ML = 0.16, MT = 0.06, MS = 1.7, GRIP = (ML + MR + 0.03) * MS;   // MS:磁鐵放大倍率(玩具磁鐵,畫面上才看得清楚)
  const redMat = new T.MeshStandardMaterial({ color: 0xd8302a, roughness: 0.35, metalness: 0.25, envMap: ENV, envMapIntensity: 0.5 });
  const silMat = new T.MeshStandardMaterial({ color: 0xd9dee6, roughness: 0.25, metalness: 0.9, envMap: ENV, envMapIntensity: 1 });
  const tipMat = new T.MeshStandardMaterial({ color: 0x9aa2b0, roughness: 0.3, metalness: 0.9, envMap: ENV, envMapIntensity: 0.9 });
  const mag = new T.Group(); grp.add(mag);
  const arcS = new T.Mesh(new T.TorusGeometry(MR, MT, 14, 20, Math.PI / 2), silMat); arcS.position.y = ML; mag.add(arcS);
  const arcR = new T.Mesh(new T.TorusGeometry(MR, MT, 14, 20, Math.PI / 2), redMat); arcR.position.y = ML; arcR.rotation.z = Math.PI / 2; mag.add(arcR);
  [[MR, silMat], [-MR, redMat]].forEach(([x, m]) => {
    const leg = new T.Mesh(new T.CylinderGeometry(MT, MT, ML - 0.05, 14), m); leg.position.set(x, 0.05 + (ML - 0.05) / 2, 0); mag.add(leg);
    const tip = new T.Mesh(new T.CylinderGeometry(MT * 1.02, MT * 1.02, 0.05, 14), tipMat); tip.position.set(x, 0.025, 0); mag.add(tip);
  });
  mag.scale.setScalar(MS);
  mag.traverse(o => { if (o.isMesh) o.castShadow = true; });

  // ---------------------------------------------------------------- 放大圖(示意):不鏽鋼裡的原子 + 表面保護膜
  const CR_TOP = [2, 6, 12, 18, 22], CR_BOT = [0, 8, 14, 20, 24], NI_TOP = [4, 16], NI_BOT = [6, 18];
  const bub = new T.Group(); bub.position.set(2.7, 3.8, 0.2); grp.add(bub);
  bub.add(new T.Mesh(new T.SphereGeometry(1.0, 32, 20), ctx.props.glassMat(0.16)));
  const lat = new T.Group(); bub.add(lat);
  const atoms = new T.InstancedMesh(new T.SphereGeometry(0.1, 16, 12), new T.MeshStandardMaterial({ roughness: 0.35, metalness: 0.3, envMap: ENV, envMapIntensity: 0.6 }), 50);
  const cFe = new T.Color('#9aa3b5'), cCr = new T.Color('#1fb58f'), cNi = new T.Color('#e0a93b'), m4 = new T.Matrix4();
  for (let L = 0; L < 2; L++) for (let i = 0; i < 25; i++) {
    const id = L * 25 + i, x = (i % 5 - 2) * 0.22, z = (Math.floor(i / 5) - 2) * 0.22;
    m4.makeTranslation(x, L ? -0.11 : 0.11, z); atoms.setMatrixAt(id, m4);
    atoms.setColorAt(id, (L ? CR_BOT : CR_TOP).includes(i) ? cCr : (L ? NI_BOT : NI_TOP).includes(i) ? cNi : cFe);
  }
  lat.add(atoms);
  const FILM_Y = 0.255;
  const filmMat = new T.MeshPhysicalMaterial({ color: 0x8fe9d8, roughness: 0.1, transparent: true, opacity: 0, envMap: ENV, envMapIntensity: 1, depthWrite: false, clearcoat: 1 });
  const film = new T.Mesh(new T.CylinderGeometry(0.64, 0.64, 0.035, 40), filmMat); film.position.y = FILM_Y; film.renderOrder = 3; lat.add(film);
  const O2 = [0, 1, 2, 3].map(j => {   // 4 個氧分子(兩顆紅球,和蠟燭那支一致)
    const g = new T.Group(); [-0.07, 0.07].forEach(dx => { const s = new T.Mesh(new T.SphereGeometry(0.07, 14, 10), new T.MeshStandardMaterial({ color: 0xb81414, roughness: 0.35, envMap: ENV, envMapIntensity: 0.6 })); s.position.x = dx; g.add(s); });
    const i = CR_TOP[j]; g.userData = { x: (i % 5 - 2) * 0.22, z: (Math.floor(i / 5) - 2) * 0.22, rot: j * 1.3 }; g.visible = false; lat.add(g); return g;
  });
  const cone = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 1, 8), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
  { const a = V(2.65, BENCH + 0.2, SP.z), b = V(2.7, 2.85, 0.2), d = b.clone().sub(a); cone.position.copy(a).addScaledVector(d, 0.5); cone.scale.y = d.length(); cone.quaternion.setFromUnitVectors(UP, d.normalize()); cone.visible = false; grp.add(cone); }

  // ---------------------------------------------------------------- 標籤(中英兩張貼圖)
  function labelTex(txt, col) { return canvasTex(384, 96, (g, w, h) => { g.fillStyle = 'rgba(14,20,50,0.82)'; const rr = 22; g.beginPath(); g.moveTo(rr, 4); g.arcTo(w - 4, 4, w - 4, h - 4, rr); g.arcTo(w - 4, h - 4, 4, h - 4, rr); g.arcTo(4, h - 4, 4, 4, rr); g.arcTo(4, 4, w - 4, 4, rr); g.fill(); g.lineWidth = 5; g.strokeStyle = col; g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 36px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 2); }, true); }
  function label(zh, en, col, w) { const tz = labelTex(zh, col), te = labelTex(en, col), s = new T.Sprite(new T.SpriteMaterial({ map: tz, transparent: true, depthWrite: false, toneMapped: false })); s.userData = { zh: tz, en: te, w: w || 1.4 }; s.visible = false; grp.add(s); return s; }
  function showLabel(s, a, x, y, z) { s.visible = a > 0.01; if (!s.visible) return; const w = s.userData.w; s.material.map = s.userData[ctx.lang()]; s.material.opacity = clamp(a, 0, 1); s.scale.set(w * a + 0.01, w / 4 * a + 0.01, 1); s.position.set(x, y, z); }
  const nameLab = [label('不鏽鋼鍋', 'Stainless pot', '#9fd0ff'), label('鐵鍋', 'Iron pan', '#ffb37a'), label('不鏽鋼湯匙', 'Stainless spoon', '#9fd0ff')];
  const verdPan = label('吸住了!', 'It sticks!', '#43d17a', 1.5), verdSpoon = label('吸不住', "Doesn't stick", '#ff9f43', 1.6), clack = label('啪!', 'Clack!', '#ffe14d', 1.0);
  function legendTex(rows) { return canvasTex(512, 200, (g, w, h) => { g.fillStyle = 'rgba(14,20,50,0.82)'; g.fillRect(4, 4, w - 8, h - 8); g.font = 'bold 28px "Noto Sans TC",sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left'; rows.forEach((r, i) => { g.fillStyle = r[0]; g.beginPath(); g.arc(40, 30 + i * 46, 13, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillText(r[1], 68, 32 + i * 46); }); }, true); }
  const legendTx = {
    zh: legendTex([['#9aa3b5', '鐵(Fe)'], ['#1fb58f', '鉻(Cr)'], ['#e0a93b', '鎳(Ni)'], ['#8fe9d8', '保護膜(示意)']]),
    en: legendTex([['#9aa3b5', 'Iron (Fe)'], ['#1fb58f', 'Chromium (Cr)'], ['#e0a93b', 'Nickel (Ni)'], ['#8fe9d8', 'Protective film (sketch)']])
  };
  const legend = new T.Sprite(new T.SpriteMaterial({ map: legendTx.zh, transparent: true, depthWrite: false, toneMapped: false })); legend.visible = false; grp.add(legend);

  // ---------------------------------------------------------------- 閃光(磁鐵貼上去的瞬間)
  const flash = new T.Sprite(new T.SpriteMaterial({ map: canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.4, 'rgba(255,225,120,0.45)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, true), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })); flash.visible = false; grp.add(flash);

  // ---------------------------------------------------------------- 磁鐵的路徑(小朋友的手拿著它;全部是 t 的函式)
  const M0 = V(0.5, 2.25, -0.3), TT = V(0.9, 2.25, -0.38), E2 = V(1.45, 2.25, -0.4);
  const C1 = V(PAN.x, BENCH + PAN.rim, PAN.z - Math.sqrt(PAN.r * PAN.r - MR * MR * MS * MS));   // 鐵鍋近側鍋緣的最高點(兩個磁極都貼在鍋緣上)
  const B1 = C1.clone().add(V(0, 0.36, 0)), A1 = C1.clone().add(V(0.12, 0.44, -0.1));
  const C2 = V(1.85, BENCH + 0.07, SP.z), A2 = C2.clone().add(V(0, 0.35, -0.1));       // 湯匙握把上
  const UC = 0.62;                                                                      // 步驟 2 裡磁鐵貼上鍋緣的時間(比例)
  const tmp = V(0, 0, 0), grip = V(0, 0, 0), tgt = V(0, 0, 0);
  const S = { p: V(0, 0, 0), yaw: 0, wL: 1, wR: 0 };
  function magnetState(k, u) {
    S.wL = 1; S.wR = 0; S.yaw = 0; const p = S.p;
    if (k <= iKit) p.copy(M0);
    else if (k === iPan) {
      if (u < 0.22) lerp3(p, M0, A1, mj(u / 0.22));
      else if (u < 0.5) { lerp3(p, A1, B1, ease((u - 0.22) / 0.28)); p.x += 0.008 * Math.sin(u * 150) * seg01(u, 0.34, 0.5); }   // 靠近時手被輕輕拉住
      else if (u < UC) { const s = (u - 0.5) / (UC - 0.5); lerp3(p, B1, C1, s * s * s); }                                         // 越近吸力越大:加速撞上去
      else { p.copy(C1); const b = seg01(u, UC, UC + 0.16); p.y += 0.07 * Math.pow(1 - b, 2) * Math.abs(Math.sin(b * Math.PI * 2)); }   // 貼上去有一點點回彈
    } else if (k === iSpoon) {
      const up = C1.clone().add(V(0, 0.3, 0));
      S.wL = 1 - mj(seg01(u, 0.4, 0.5)); S.wR = mj(seg01(u, 0.3, 0.4)); 
      if (u < 0.16) { const s = seg01(u, 0, 0.16); lerp3(p, C1, up, s * s * (3 - 2 * s)); p.x += 0.006 * Math.sin(u * 300) * (1 - s); }      // 把磁鐵從鐵鍋上拔下來(吸得緊,一開始拔不動)
      else if (u < 0.4) { const s = mj((u - 0.16) / 0.24); lerp3(p, up, TT, s); p.y += 0.12 * Math.sin(Math.PI * s); }                    // 移到中間,換手
      else if (u < 0.58) lerp3(p, TT, A2, mj((u - 0.4) / 0.18));
      else if (u < 0.72) lerp3(p, A2, C2, mj((u - 0.58) / 0.14));
      else if (u < 0.86) { p.copy(C2); p.x += 0.035 * Math.sin((u - 0.72) * 150) * Math.sin(Math.PI * seg01(u, 0.72, 0.86)); }          // 在握把上磨蹭,什麼也沒發生
      else lerp3(p, C2, A2, mj((u - 0.86) / 0.14));
    } else if (k === iWhy) { S.wL = 0; S.wR = 1; lerp3(p, A2, E2, mj(seg01(u, 0, 0.25)));  }
    else { S.wL = 0; S.wR = 1; p.copy(E2); }
    return S;
  }
  const gripOf = (p, out) => out.set(p.x, p.y + GRIP, p.z);

  // ---------------------------------------------------------------- 更新
  function update(t, time) {
    const k = ctx.h.segIdx({ SEG, ST }, t), u = clamp((t - ST[k]) / SEG[k].d, 0, 1), A = ctx.adult, K = ctx.kid;
    const ms = magnetState(k, u);
    // ---- 物品出場(影片轉場效果,出場後都放在流理台上不動)
    pop(pot, t - (ST[iKit] + 0.15)); pop(pan, t - (ST[iKit] + 0.55)); pop(spoon, t - (ST[iKit] + 0.95)); spoon.scale.multiplyScalar(1.4);
    // ---- 小朋友(站在小板凳上;板凳被流理台擋住,看不到):左手 / 右手輪流拿磁鐵
    K.root.position.set(0.9, 0.7, -0.85); K.root.rotation.y = 0;
    K.solve(() => {
      K.base(time, 1.1); K.root.updateMatrixWorld(true);
      if (k === iIntro) K.wave(1, time); else if (k !== iEnd) K.chest(1);
      K.chest(-1);
      if (k === iEnd) K.cheer(-1, time);
      if (k === iKit) { tgt.set(1.85, 2.3, -0.2); K.reach(1, tgt, ramp(u, 0.62, 0.76, 0.9, 0.98)); }                       // 指著湯匙
      gripOf(ms.p, grip); K.reach(-1, grip, ms.wL); K.reach(1, grip, ms.wR);
    });
    K.root.updateMatrixWorld(true);
    tmp.set(ms.p.x, ms.p.y + 0.2, ms.p.z);
    K.look(k === iIntro || k === iEnd ? cam.position : (k === iWhy ? bub.position : tmp), 0.9);
    const snap = k === iPan && u >= UC && u < 0.85, oh = snap && u < UC + 0.2;
    K.mouth(oh ? 'oh' : 'smile');
    // ---- 磁鐵:跟著手(原點在磁極端面的中點);步驟 2 結束時貼在鍋緣上
    mag.position.copy(ms.p); mag.rotation.y = ms.yaw;
    // ---- 大人:看著、指著
    A.root.position.set(-2.1, 0, -0.85); A.root.rotation.y = 0.25;
    A.solve(() => {
      A.base(time, 0); A.root.updateMatrixWorld(true);
      if (k === iIntro) { A.chest(1); A.wave(-1, time); } else if (k === iEnd) { A.chest(1); A.wave(-1, time); } else { A.chest(-1); A.chest(1); }
      if (k === iKit) { const pot0 = V(POT.x, BENCH + 1.2, POT.z), pan0 = V(-0.45, BENCH + 0.8, 0.0); lerp3(tgt, pot0, pan0, mj(seg01(u, 0.4, 0.55))); A.reach(1, tgt, ramp(u, 0.1, 0.25, 0.85, 0.97)); }
    });
    A.root.updateMatrixWorld(true);
    if (k === iIntro || k === iEnd) A.look(cam.position, 0.9); else if (k === iKit) A.look(tgt, 0.8); else if (k === iWhy) A.look(bub.position, 0.8); else A.look(tmp, 0.9);
    // ---- 閃光與「啪!」
    const fu = k === iPan ? seg01(u, UC, UC + 0.12) : (k > iPan ? 1 : 0); flash.visible = fu > 0 && fu < 1;
    if (flash.visible) { flash.position.set(C1.x, C1.y + 0.05, C1.z + 0.05); flash.scale.setScalar(0.3 + fu * 1.0); flash.material.opacity = 1 - fu; }
    const tc = ST[iPan] + UC * SEG[iPan].d;
    showLabel(clack, ease(clamp((t - tc) / 0.2, 0, 1)) * (1 - ease(clamp((t - tc - 1.2) / 0.4, 0, 1))), C1.x + 0.05, C1.y + 0.95, C1.z + 0.5);
    // ---- 標籤
    const vOut = 1 - ease(seg01(t, ST[iWhy], ST[iWhy] + 0.4));
    [[POT.x, 0.15], [PAN.x, 0.55], [SP.x, 0.95]].forEach(([x, d], i) => showLabel(nameLab[i], ease(clamp((t - ST[iKit] - d - 0.4) / 0.4, 0, 1)), x, BENCH + 0.28, 1.2));
    showLabel(verdPan, ease(clamp((t - tc - 0.3) / 0.4, 0, 1)) * vOut, -0.6, BENCH + 1.35, 0.5);
    const ts = ST[iSpoon] + 0.74 * SEG[iSpoon].d;
    showLabel(verdSpoon, ease(clamp((t - ts) / 0.4, 0, 1)) * vOut, 3.0, BENCH + 1.0, 0.6);
    // ---- 放大圖:不鏽鋼裡有鐵、鉻、鎳;鉻碰到空氣中的氧,在表面長出一層薄薄的保護膜(時間大幅壓縮)
    const bs = popS(t - (ST[iWhy] + 0.3)) * (1 - ease(seg01(t, ST[iEnd], ST[iEnd] + 0.5)));
    bub.visible = bs > 0.002; bub.scale.setScalar(Math.max(bs, 0.0001)); cone.visible = bub.visible;
    lat.rotation.set(0.5, t * 0.3, 0);
    const uw = k === iWhy ? u : (k > iWhy ? 1 : 0), fm = ease(seg01(uw, 0.62, 0.85)); filmMat.opacity = 0.6 * fm; film.visible = fm > 0.01;
    O2.forEach((g, j) => {
      const d = g.userData, a = seg01(uw, 0.28 + 0.07 * j, 0.5 + 0.07 * j), gone = 1 - seg01(uw, 0.5 + 0.07 * j, 0.62 + 0.07 * j);
      g.visible = k === iWhy && a > 0 && gone > 0.01; g.position.set(d.x, lerp(0.95, FILM_Y + 0.08, a * a), d.z); g.rotation.set(0.6, d.rot + t * 1.5, 0.4); g.scale.setScalar(gone);   // 氧分子自由落下,碰到鉻就用掉了
    });
    legend.visible = bub.visible && bs > 0.5; if (legend.visible) { legend.material.map = legendTx[ctx.lang()]; legend.position.set(3.3, 2.35, 0.5); legend.scale.set(2.3, 0.9, 1); legend.material.opacity = clamp((bs - 0.5) * 2, 0, 1); }
    // ---- 鏡頭
    const sway = Math.sin(t * 0.25) * 0.15, s2 = ST[iPan] + 0.8, s3 = ST[iSpoon] + 0.6, s4 = ST[iWhy] + 0.6, s5 = ST[iEnd] + 0.8;
    cam.position.set(kf(t, [[ST[iKit], -0.3], [s2, 0.8], [s3, 1.5], [s4, 1.9], [s5, -0.2]]) + sway, kf(t, [[ST[iKit], 6.3], [s2, 5.3], [s4, 5.6], [s5, 6.3]]), kf(t, [[ST[iKit], 11.2], [s2, 8.0], [s4, 8.8], [s5, 11.2]]));
    cam.lookAt(kf(t, [[ST[iKit], -0.5], [s2, 0.6], [s3, 1.1], [s4, 1.9], [s5, -0.5]]), kf(t, [[ST[iKit], 2.6], [s2, 2.6], [s4, 3.0], [s5, 2.6]]), 0.1);
    hemi.intensity = 0.85 * LI; key.intensity = 2.0 * LI;
  }
  return { grp, SEG, ST, update, title: E.titleZh, leg: E.legZh, room: true, people: true };
}
