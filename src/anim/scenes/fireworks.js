// 場景:煙火為什麼有那麼多顏色?(焰色反應)寫法與契約見 .claude/skills/chem-story-to-animation/references/scene-authoring.md
// 夜空 + 遠處的煙火(只出現在遠方,不畫任何人操作)。人物背對鏡頭,在安全線後面看。
// 物理(遠景的比例:1 單位 ≈ 10 公尺,時間加快 1.5 倍,所以重力 GF = 9.8 / 10 × 1.5² ≈ 2.2 單位/s²):
//   升空:y = y0 + v0·τ − ½·GF·τ²,到最高點速度為 0 才爆開(v0 = GF·T)。
//   爆開的「星」:球形向外、有空氣阻力(速度 ∝ e^(−kτ)),再被重力往下拉(往終端速度 GF/k 靠近),亮度慢慢變暗。
//   位置的閉式解:p(a) = P0 + d·v·(1 − e^(−ka))/k − (GF/k)·(a − (1 − e^(−ka))/k)·ŷ,所以任何時間 t 都畫得出來(可拖進度)。
export function build(ctx, E0) {
  // 注意:目前 engine.js 的 key0 只認得 candle/cabbage,傳進來的 E0 可能是蠟燭的腳本;所以直接從 ctx.EXP 取自己的腳本。
  const E = (ctx.EXP && ctx.EXP.fireworks) || E0;
  const { T, scene, cam, hemi, key, rim, LI, h } = ctx;
  const { clamp, lerp, ease, mj, seg01, ramp, popS, canvasTex, segIdx } = h;
  const grp = new T.Group(); scene.add(grp);
  ctx.room(false);
  scene.fog = null;
  const SEG = E.steps.map(s => ({ n: s.nZh, d: s.d0, io: s.io, cap: s.capZh }));
  const ST = []; SEG.reduce((a, s) => { ST.push(a); return a + s.d; }, 0);
  const iIntro = 0, iLaunch = 1, iNa = 2, iSr = 3, iBa = 4, iCu = 5, iMix = 6, iGuess = 7, iEnd = 8;

  // ---------------------------------------------------------------- 小工具
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t2 = a; t2 = Math.imul(t2 ^ (t2 >>> 15), t2 | 1); t2 ^= t2 + Math.imul(t2 ^ (t2 >>> 7), t2 | 61); return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296; }; }
  const dotTex = canvasTex(64, 64, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); }, true);
  const glowT = canvasTex(128, 128, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.4)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); }, true);
  function pointsMat(size, op) { return new T.PointsMaterial({ size, map: dotTex, vertexColors: true, transparent: true, opacity: op || 1, blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false, fog: false }); }

  // ---------------------------------------------------------------- 夜空、星星、月亮、地面、遠處剪影
  const sky = new T.Mesh(new T.SphereGeometry(55, 32, 20), new T.MeshBasicMaterial({
    side: T.BackSide, fog: false, toneMapped: false,
    map: canvasTex(4, 256, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#04061a'); gr.addColorStop(0.35, '#0a1030'); gr.addColorStop(0.46, '#18205a'); gr.addColorStop(0.5, '#3b2f6a'); gr.addColorStop(0.54, '#1a1e46'); gr.addColorStop(1, '#0a0d24'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); }, true)
  })); sky.renderOrder = -10; grp.add(sky);
  { // 星星(固定,輕微閃爍)
    const N = 300, r = rng(7), pos = new Float32Array(N * 3), col = new Float32Array(N * 3), c = new T.Color();
    for (let i = 0; i < N; i++) { const az = (r() - 0.5) * 2.0, el = 0.06 + r() * 0.75, R = 50; pos[i * 3] = Math.sin(az) * Math.cos(el) * R; pos[i * 3 + 1] = Math.sin(el) * R; pos[i * 3 + 2] = -Math.cos(az) * Math.cos(el) * R; const b = 0.25 + r() * 0.75; c.setRGB(b * (0.85 + 0.15 * r()), b * 0.92, b); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    var starPts = new T.Points(geo, pointsMat(0.9, 0.9)); starPts.renderOrder = -9; grp.add(starPts);
  }
  const moon = new T.Sprite(new T.SpriteMaterial({ map: canvasTex(128, 128, (g, w, hh) => { const gl = g.createRadialGradient(64, 64, 10, 64, 64, 64); gl.addColorStop(0, 'rgba(255,245,200,0.35)'); gl.addColorStop(1, 'rgba(255,245,200,0)'); g.fillStyle = gl; g.fillRect(0, 0, w, hh); g.fillStyle = '#fff4cf'; g.beginPath(); g.arc(64, 64, 26, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(76, 58, 24, 0, Math.PI * 2); g.fill(); }, true), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  moon.position.set(-20, 17, -46); moon.scale.set(7, 7, 1); grp.add(moon);

  const ground = new T.Mesh(new T.CircleGeometry(60, 48), new T.MeshStandardMaterial({ color: 0x1b2a3c, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; grp.add(ground);
  function ridge(z, color, base, amp, f1, f2, phase, x0, x1) {                      // 低矮的山丘剪影(平面)
    const sh = new T.Shape(); sh.moveTo(x0, -1); const n = 80;
    for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); sh.lineTo(x, base + amp * (0.5 + 0.5 * Math.sin(x * f1 + phase)) * (0.7 + 0.3 * Math.sin(x * f2 + phase * 2))); }
    sh.lineTo(x1, -1); sh.closePath(); const m = new T.Mesh(new T.ShapeGeometry(sh), new T.MeshBasicMaterial({ color, fog: false, toneMapped: false })); m.position.z = z; grp.add(m); return m;
  }
  ridge(-38, 0x1a2250, 0.3, 4.5, 0.11, 0.37, 1.0, -60, 60);                           // 遠山(較亮)
  ridge(-30, 0x101640, 0.2, 2.6, 0.17, 0.53, 3.0, -60, 60);
  ridge(-11.5, 0x0a0f28, 0.1, 1.2, 0.23, 0.71, 5.0, -50, 50);                         // 近處的矮丘(擋住發射點,畫面中看不到任何人或設備)
  { // 遠處小房子與亮著的窗(一組 Points)
    const r = rng(21), pos = [], col = []; const wc = new T.Color(0xffd27a);
    for (let i = 0; i < 26; i++) { pos.push(-34 + r() * 68, 0.8 + r() * 1.6, -29.8); col.push(wc.r * 0.8, wc.g * 0.8, wc.b * 0.8); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); grp.add(new T.Points(geo, pointsMat(0.4, 0.8)));
    const sh = new T.Shape(); let x = -36; sh.moveTo(x, -1);
    while (x < 36) { const w = 1.0 + r() * 1.4, hh = 0.8 + r() * 1.1; if (r() < 0.55) { sh.lineTo(x, 0.3); sh.lineTo(x, 0.3 + hh); sh.lineTo(x + w / 2, 0.3 + hh + 0.6); sh.lineTo(x + w, 0.3 + hh); sh.lineTo(x + w, 0.3); x += w; } else { sh.lineTo(x, 0.3); x += w * 0.8; } x += 0.7 + r() * 3; }
    sh.lineTo(x, -1); sh.closePath(); const m = new T.Mesh(new T.ShapeGeometry(sh), new T.MeshBasicMaterial({ color: 0x0b1032, fog: false, toneMapped: false })); m.position.z = -29.6; grp.add(m);
  }
  { // 安全線:人和煙火之間的柵欄(柱子 + 兩條繩子)
    const postM = new T.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.5 }), ropeM = new T.MeshStandardMaterial({ color: 0xff6a3d, roughness: 0.6 });
    for (let x = -14; x <= 14; x += 3.5) { const p = new T.Mesh(new T.CylinderGeometry(0.07, 0.08, 1.25, 12), postM); p.position.set(x, 0.62, -3.2); p.castShadow = true; grp.add(p); const cap = new T.Mesh(new T.SphereGeometry(0.1, 12, 8), postM); cap.position.set(x, 1.27, -3.2); grp.add(cap); }
    [0.95, 0.55].forEach(y => { const rp = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 28, 8), ropeM); rp.rotation.z = Math.PI / 2; rp.position.set(0, y, -3.2); grp.add(rp); });
  }

  // ---------------------------------------------------------------- 煙火(火箭 + 星)
  const GF = 2.2, KD = 1.5, V0 = 7.0, LIFE = 3.4, APEX = 8.0, TR = Math.sqrt(2 * APEX / GF), LAUNCH_Y = 0.4;   // TR:升空時間(約 2.7 秒)
  const NS = 300;                                                              // 每朵的星數
  const COL = { na: 0xffc400, sr: 0xff1000, ba: 0x20f020, cu: 0x00bfd0, mix: 0x9a30ff, gold: 0xffb347 };
  const SHOW = [                                                               // 四朵主角 + 五朵合奏(x, 最高點 y)
    { id: 'na', x: -2.0, y: 7.6, col: COL.na, v: 1.0, tb: () => ST[iNa] + 0.25 },
    { id: 'sr', x: 0.9, y: 8.2, col: COL.sr, v: 1.0, tb: () => ST[iSr] + 0.25 },
    { id: 'ba', x: 3.7, y: 7.5, col: COL.ba, v: 1.0, tb: () => ST[iBa] + 0.25 },
    { id: 'cu', x: 6.5, y: 8.1, col: COL.cu, v: 1.0, tb: () => ST[iCu] + 0.25 },
    { id: 'm1', x: 0.5, y: 8.6, col: COL.sr, v: 1.05, tb: () => ST[iMix] + 0.25 },
    { id: 'm2', x: 5.5, y: 7.4, col: COL.cu, v: 0.9, tb: () => ST[iMix] + 0.9 },
    { id: 'm3', x: -2.6, y: 7.2, col: COL.na, v: 0.9, tb: () => ST[iMix] + 1.5 },
    { id: 'm4', x: 3.0, y: 8.8, col: COL.mix, v: 1.05, tb: () => ST[iMix] + 2.0 },
    { id: 'm5', x: 7.2, y: 7.0, col: COL.ba, v: 0.85, tb: () => ST[iMix] + 2.6 }
  ];
  const c0 = new T.Color(), cw = new T.Color(1, 0.97, 0.88);
  const FZ = -14;                                                              // 煙火離人很遠(z = -14,人在 z ≈ 0)
  SHOW.forEach((b, bi) => {
    const r = rng(100 + bi * 17); b.color = new T.Color(b.col); b.z = FZ - 1.5 * (bi % 3) * 0.4; b.lx = b.x + (r() < 0.5 ? -0.9 : 0.9);
    b.dir = new Float32Array(NS * 3); b.spd = new Float32Array(NS); b.ph = new Float32Array(NS);
    const rot = new T.Euler(r() * 6, r() * 6, r() * 6), q = new T.Quaternion().setFromEuler(rot), d = new T.Vector3();
    for (let i = 0; i < NS; i++) {                                              // 費波那契球面:星均勻分布在球殼上
      const yy = 1 - 2 * (i + 0.5) / NS, rr = Math.sqrt(1 - yy * yy), th = i * 2.399963; d.set(Math.cos(th) * rr, yy, Math.sin(th) * rr).applyQuaternion(q);
      b.dir[i * 3] = d.x; b.dir[i * 3 + 1] = d.y; b.dir[i * 3 + 2] = d.z; b.spd[i] = V0 * b.v * (0.9 + 0.1 * r()); b.ph[i] = r() * 6.28;
    }
    b.pos = new Float32Array(NS * 3 * 3); b.col = new Float32Array(NS * 3 * 3);
    b.geo = new T.BufferGeometry(); b.geo.setAttribute('position', new T.BufferAttribute(b.pos, 3)); b.geo.setAttribute('color', new T.BufferAttribute(b.col, 3)); b.geo.boundingSphere = new T.Sphere(new T.Vector3(b.x, b.y, b.z), 60);
    b.pts = new T.Points(b.geo, pointsMat(0.5)); b.pts.frustumCulled = false; b.pts.visible = false; grp.add(b.pts);
    // 火箭尾跡(拋物線上升時噴出的火花)
    const M = 26; b.M = M; b.tpos = new Float32Array(M * 3); b.tcol = new Float32Array(M * 3); b.tr = new Float32Array(M * 3); for (let i = 0; i < M * 3; i++) b.tr[i] = r() - 0.5;
    b.tgeo = new T.BufferGeometry(); b.tgeo.setAttribute('position', new T.BufferAttribute(b.tpos, 3)); b.tgeo.setAttribute('color', new T.BufferAttribute(b.tcol, 3)); b.tgeo.boundingSphere = new T.Sphere(new T.Vector3(b.x, b.y, b.z), 60);
    b.tpts = new T.Points(b.tgeo, pointsMat(0.32)); b.tpts.frustumCulled = false; b.tpts.visible = false; grp.add(b.tpts);
    b.head = new T.Sprite(new T.SpriteMaterial({ map: glowT, color: 0xffd9a0, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, fog: false })); b.head.visible = false; grp.add(b.head);
    b.flash = new T.Sprite(new T.SpriteMaterial({ map: glowT, color: b.col, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, fog: false })); b.flash.visible = false; grp.add(b.flash);
    b.halo = new T.Sprite(new T.SpriteMaterial({ map: glowT, color: b.col, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, fog: false })); b.halo.visible = false; grp.add(b.halo);
  });
  function rocketPos(b, tau, out) {                                            // 火箭:拋物線(速度 v0 = GF·TR,重力把它減速到最高點速度 0)
    const s = clamp(tau, 0, TR), x0 = b.lx, y0 = LAUNCH_Y, v0 = GF * TR;
    const hh = y0 + v0 * s - 0.5 * GF * s * s; out.set(lerp(x0, b.x, s / TR), lerp(y0, b.y - 0.0, (hh - y0) / APEX), b.z); return out;
  }
  const tmp = new T.Vector3();
  function updateFirework(b, t) {
    const tb = b.tb(), tl = tb - TR, tau = t - tl, age = t - tb;
    // ---- 升空
    const rising = tau >= 0 && tau < TR + 0.12;
    b.tpts.visible = rising; b.head.visible = tau >= 0 && tau < TR;
    if (rising) {
      rocketPos(b, tau, tmp); b.head.position.copy(tmp); const hs = 0.55 + 0.1 * Math.sin(t * 60); b.head.scale.set(hs, hs, 1);
      for (let j = 0; j < b.M; j++) {
        const a = j * 0.05, tt = tau - a, o = j * 3; if (tt < 0) { b.tcol[o] = b.tcol[o + 1] = b.tcol[o + 2] = 0; continue; }
        rocketPos(b, tt, tmp); const fall = 0.5 * GF * 0.5 * a * a;                        // 火花被拋在後面,再受重力往下掉
        b.tpos[o] = tmp.x + b.tr[o] * 0.12 * a * 4; b.tpos[o + 1] = tmp.y - fall + b.tr[o + 1] * 0.05; b.tpos[o + 2] = tmp.z + b.tr[o + 2] * 0.1;
        const f = Math.pow(1 - j / b.M, 1.6) * (tau > TR ? clamp(1 - (tau - TR) / 0.12, 0, 1) : 1); b.tcol[o] = 1.0 * f; b.tcol[o + 1] = 0.62 * f; b.tcol[o + 2] = 0.25 * f;
      }
      b.tgeo.attributes.position.needsUpdate = true; b.tgeo.attributes.color.needsUpdate = true;
    }
    // ---- 爆開
    const on = age >= 0 && age < LIFE; b.pts.visible = on; b.flash.visible = age >= 0 && age < 0.7; b.halo.visible = on;
    b.env = on ? Math.pow(1 - age / LIFE, 1.3) : 0;
    if (age >= 0 && age < 0.7) { const f = Math.exp(-age * 7); b.flash.position.set(b.x, b.y, b.z); const s = 1.2 + age * 11; b.flash.scale.set(s, s, 1); b.flash.material.opacity = 0.75 * f; }
    if (on) {
      const cx = b.x, cy = b.y, cz = b.z;
      b.halo.position.set(cx, cy - (GF / KD) * (age - (1 - Math.exp(-KD * age)) / KD) * 0.6, cz); const hs = 2 * (V0 * b.v / KD) * (1 - Math.exp(-KD * age)) * 0.95 + 1; b.halo.scale.set(hs, hs, 1); b.halo.material.opacity = 0.16 * b.env;
      const heat = Math.exp(-age / 0.4);
      for (let i = 0; i < NS; i++) {
        const dx = b.dir[i * 3], dy = b.dir[i * 3 + 1], dz = b.dir[i * 3 + 2], v = b.spd[i];
        for (let m = 0; m < 3; m++) {                                                    // 第 0 個是星本身,第 1、2 個是它剛剛走過的位置(拖出尾巴)
          const a = Math.max(0, age - m * 0.075), e = (1 - Math.exp(-KD * a)) / KD, fall = (GF / KD) * (a - e), o = (i * 3 + m) * 3;
          b.pos[o] = cx + dx * v * e; b.pos[o + 1] = cy + dy * v * e - fall; b.pos[o + 2] = cz + dz * v * e;
          let f = 1.25 * Math.pow(1 - a / LIFE, 1.35) * (m === 0 ? 1 : (m === 1 ? 0.5 : 0.22));
          if (a / LIFE > 0.6) f *= 0.45 + 0.55 * Math.abs(Math.sin(age * 22 + b.ph[i]));                 // 快燒完時一閃一閃
          const w = 0.6 * heat; c0.copy(b.color).lerp(cw, w); b.col[o] = c0.r * f; b.col[o + 1] = c0.g * f; b.col[o + 2] = c0.b * f;
        }
      }
      b.geo.attributes.position.needsUpdate = true; b.geo.attributes.color.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- 3D 標籤(中英兩張貼圖)
  function labelTex(l1, l2, col) {
    return canvasTex(512, 192, (g, w, hh) => {
      g.fillStyle = 'rgba(8,12,38,0.86)'; const rr = 34; g.beginPath(); g.moveTo(rr, 5); g.arcTo(w - 5, 5, w - 5, hh - 5, rr); g.arcTo(w - 5, hh - 5, 5, hh - 5, rr); g.arcTo(5, hh - 5, 5, 5, rr); g.arcTo(5, 5, w - 5, 5, rr); g.fill(); g.lineWidth = 7; g.strokeStyle = col; g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.font = 'bold 70px "Noto Sans TC","Segoe UI",sans-serif'; g.fillText(l1, w / 2, 74);
      g.fillStyle = col; g.font = 'bold 56px "Noto Sans TC","Segoe UI",sans-serif'; g.fillText(l2, w / 2, 146);
    }, true);
  }
  function label(zh1, zh2, en1, en2, col) { const tz = labelTex(zh1, zh2, col), te = labelTex(en1, en2, col), s = new T.Sprite(new T.SpriteMaterial({ map: tz, transparent: true, depthWrite: false, toneMapped: false, fog: false })); s.userData = { zh: tz, en: te }; s.visible = false; grp.add(s); return s; }
  const LW = 7.2, LH = 2.7;
  const labs = [
    label('鈉  Na', '→ 黃色', 'Sodium  Na', '→ yellow', '#ffd21e'),
    label('鍶  Sr', '→ 紅色', 'Strontium  Sr', '→ red', '#ff5a48'),
    label('鋇  Ba', '→ 綠色', 'Barium  Ba', '→ green', '#5df25a'),
    label('銅  Cu', '→ 藍綠色', 'Copper  Cu', '→ blue-green', '#2fe0e6')
  ];
  // ---------------------------------------------------------------- 問號
  const qMark = new T.Sprite(new T.SpriteMaterial({ map: canvasTex(128, 128, (g, w, hh) => { g.font = 'bold 110px "Noto Sans TC","Segoe UI",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = '#3a2a00'; g.strokeText('?', w / 2, hh / 2 + 6); g.fillStyle = '#ffd84a'; g.fillText('?', w / 2, hh / 2 + 6); }, true), transparent: true, depthWrite: false, toneMapped: false, fog: false })); qMark.visible = false; grp.add(qMark);
  const qMark2 = qMark.clone(); qMark2.material = qMark.material; grp.add(qMark2);

  // ---------------------------------------------------------------- 光(月光 + 煙火照亮地面)
  const fwLight = new T.PointLight(0xffffff, 0, 70, 1.0); fwLight.position.set(0, 8, FZ); grp.add(fwLight);
  const lc = new T.Color();

  // ---------------------------------------------------------------- 人物位置
  const A = ctx.adult, K = ctx.kid, AX = -3.9, KX = -2.3, PZ = -0.6;
  const lookT = new T.Vector3(), vS = new T.Vector3(), tA = new T.Vector3(), look = new T.Vector3(), dirV = new T.Vector3();
  const faceA = 0.45, faceK = 0.3, awayA = Math.PI - 0.5, awayK = Math.PI - 0.4;

  function update(t, time) {
    const k = segIdx({ SEG, ST }, t);
    // ---- 煙火
    SHOW.forEach(b => updateFirework(b, t));
    // ---- 標籤:跟著它的那一朵,出現在上方;下一朵爆開後淡出
    labs.forEach((s, i) => {
      const b = SHOW[i], age = t - b.tb(), nextT = (i < 3 ? SHOW[i + 1].tb() : ST[iMix]) + 0.2;
      const pp = popS(age - 0.55), fo = clamp(1 - (t - nextT) / 0.5, 0, 1);
      s.visible = age > 0.55 && pp > 0.002 && fo > 0.01; if (!s.visible) return;
      s.material.map = ctx.lang() === 'en' ? s.userData.en : s.userData.zh; s.material.opacity = fo;
      s.position.set(b.x + 0.2, b.y + 5.2 + 0.1 * Math.sin(time * 2 + i), b.z + 0.5); s.scale.set(LW * pp, LH * pp, 1);
    });
    // ---- 光
    let wsum = 0; lc.setRGB(0, 0, 0); let lx = 0, ly = 0;
    SHOW.forEach(b => { if (b.env > 0) { const w = b.env * (1 + 2.5 * Math.exp(-(t - b.tb()) * 6)); wsum += w; lc.r += b.color.r * w; lc.g += b.color.g * w; lc.b += b.color.b * w; lx += b.x * w; ly += b.y * w; } });
    if (wsum > 0) { fwLight.color.setRGB(lc.r / wsum, lc.g / wsum, lc.b / wsum); fwLight.position.set(lx / wsum, ly / wsum - 1, FZ + 4); }
    fwLight.intensity = Math.min(wsum, 2.5) * 22;
    hemi.intensity = 0.55 * LI; hemi.color.setHex(0x6f80c8); hemi.groundColor.setHex(0x1c2342); key.intensity = 0.55 * LI; key.color.setHex(0x9db2ff); rim.intensity = 0.35 * LI;
    starPts.material.opacity = 0.8 + 0.15 * Math.sin(time * 1.7);

    // ---- 人物:開頭面向鏡頭打招呼 → 轉身望向夜空(背對鏡頭,在安全線後面)→ 結尾轉回來揮手
    const turnAway = mj(seg01(t, ST[iLaunch] - 1.0, ST[iLaunch] + 0.3)), turnBack = mj(seg01(t, ST[iEnd] + 0.0, ST[iEnd] + 1.1)), wAway = turnAway - turnBack;
    A.root.position.set(AX, 0, PZ); A.root.rotation.y = lerp(faceA, awayA, wAway);
    K.root.position.set(KX, 0, PZ + 0.1); K.root.rotation.y = lerp(faceK, awayK, wAway);
    // 看的目標:升空時看火箭;爆開時看那一朵;開頭與結尾看鏡頭
    let fb = SHOW[0], fi = 0; for (let i = 0; i < 4; i++) { if (t >= SHOW[i].tb() - TR) { fb = SHOW[i]; fi = i; } }
    if (k >= iMix) fb = SHOW[2 + (k >= iGuess ? 0 : 0)];
    const ft = fb.tb() - TR;
    if (k === iLaunch || (k >= iNa && k <= iCu && t < fb.tb())) { rocketPos(fb, t - ft, look); } else look.set(fb.x, fb.y, fb.z);
    if (k === iGuess || k === iMix) look.set(2.5, 8, FZ);
    const faceCam = wAway < 0.4, lk = lookT.copy(cam.position).lerp(look, ease(seg01(wAway, 0.2, 0.8)));   // 轉身時視線從鏡頭慢慢移到天空(頸的扭轉才不會超限)
    const burstAge = t - SHOW[clamp(k - iNa, 0, 3)].tb();
    A.solve(() => {
      A.base(time, 0); A.root.updateMatrixWorld(true);
      if (k === iIntro && wAway < 0.3) A.wave(-1, time);
      if (k === iEnd && t > ST[iEnd] + 1.1) A.wave(-1, time);
      if (k === iSr || k === iBa) {                                                    // 大人(用靠近中央那一側的手)指向煙火:目標在手臂長度(1.55)之內
        const s = -1; A.shoulder(s, vS); dirV.set(fb.x, fb.y, fb.z).sub(vS).normalize(); tA.copy(vS).addScaledVector(dirV, 1.3);
        A.reach(s, tA, ramp(t, ST[k] + 0.3, ST[k] + 0.9, ST[k] + SEG[k].d - 0.8, ST[k] + SEG[k].d - 0.2));
      }
    });
    A.look(lk, 0.95); A.mouth(burstAge > 0 && burstAge < 0.8 && wAway > 0.8 ? 'oh' : 'smile');
    const hs = k === iMix ? ctx.hopState(time, 0.2) : { crouch: 0, lift: 0, foot: 0 };
    K.solve(() => {
      K.base(time, 1.1); K.root.updateMatrixWorld(true);
      if (k === iIntro && wAway < 0.3) K.wave(1, time);
      if (k === iEnd && t > ST[iEnd] + 1.1) K.cheer(1, time);
      if (k === iMix) { K.cheer(1, time); K.cheer(-1, time); }
      if (k === iGuess) { K.chest(1); }
    }, { crouch: hs.crouch, lift: hs.lift, footL: hs.foot, footR: hs.foot });
    K.look(lk, 0.95); K.mouth(k === iGuess ? 'smile' : (burstAge > 0 && burstAge < 0.8 ? 'oh' : 'smile'));
    // ---- 問號:最後一個「猜猜看」從小朋友頭上冒出來
    const qa = k === iGuess ? t - (ST[iGuess] + 0.6) : (k > iGuess ? 9 : -1), qs = popS(qa) * (k === iEnd ? 1 - ease(seg01(t, ST[iEnd], ST[iEnd] + 0.4)) : 1);
    qMark.visible = qs > 0.002; qMark2.visible = qMark.visible;
    if (qMark.visible) { const bob = 0.08 * Math.sin(time * 3); qMark.position.set(KX + 0.15, 3.05 + bob, PZ + 0.1); qMark.scale.set(1.2 * qs, 1.2 * qs, 1); qMark2.position.set(KX - 0.75, 2.55 + bob * 0.7, PZ + 0.1); qMark2.scale.set(0.6 * qs, 0.6 * qs, 1); }

    // ---- 鏡頭:低、遠,看向天空(慢慢推近,最後拉回)
    const zk = kf2(t);
    cam.position.set(-1.0 + Math.sin(t * 0.2) * 0.25, 2.0, 15.5 - 1.0 * zk); cam.lookAt(1.6, 6.9 - 0.2 * zk, -14);
  }
  function kf2(t) { return h.kf(t, [[0, 0], [ST[iNa], 0.5], [ST[iMix], 1], [ST[iEnd], 0.2]]); }
  const out = { grp, SEG, ST, update, title: E.titleZh, leg: E.legZh, room: false, people: true };
  const EN = { title: E.titleEn, leg: E.legEn, n: E.steps.map(s => s.nEn), cap: E.steps.map(s => s.capEn) };
  Object.defineProperty(out, 'EN', { get: () => EN, set: () => {}, enumerable: true });   // 引擎會用 EXP[key0] 覆寫 EN;這裡固定成自己的英文字幕
  return out;
}
